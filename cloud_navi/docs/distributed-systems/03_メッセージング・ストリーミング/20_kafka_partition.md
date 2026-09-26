import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Kafka のパーティション・オフセット・コンシューマグループ

## パーティションとオフセットとは

> Kafka のパーティション（Partition）はトピックの物理的な分割単位であり、各パーティション内のメッセージは単調増加する整数インデックスであるオフセット（Offset）で識別される。コンシューマグループ（Consumer Group）はパーティションを複数のコンシューマで分担して並列処理するための抽象化機構である。

**パーティション**はKafkaのスケーラビリティとスループットを支える核心的な仕組みだ。1つのTopicを複数のパーティションに分割すると、各パーティションが異なるBrokerに分散されるため、並列読み書きが可能になる。パーティション数を増やすほどスループットが向上するが、ファイルハンドルの消費も増える。重要なのは**パーティション内でのみメッセージの順序が保証**される点だ。トピック全体での順序は保証されない。

**オフセット**はパーティション内の各メッセージに付与される0から始まる連番だ。Consumerはオフセットを使って「どこまで読んだか」を管理する。このオフセット管理がKafkaの強力な特徴だ。Consumer側でオフセットを任意にリセットすれば過去のメッセージをReplayできる。バグ修正後に特定時点からReplayするといった運用が可能だ。

**コンシューマグループ**は複数のConsumerをグループ化し、同じGroupIDを持つConsumerがパーティションを分担する。1パーティションは1つのConsumerが担当するため、最大並列度はパーティション数に等しい。異なるグループIDを持つConsumerは独立してオフセットを管理するため、同じデータを複数のマイクロサービスが独立して処理できる。

**レプリケーション**により耐障害性を確保する。各パーティションには1つのリーダーと複数のフォロワーがある。Producerはリーダーにのみ書き込む。`acks=all`設定では全ISR（In-Sync Replicas）への複製完了を確認してからProducerに応答する。

## パーティション・オフセット・コンシューマグループの関係

| 概念 | スコープ | 役割 |
|------|---------|------|
| パーティション | トピック内 | 水平分割・並列処理単位 |
| オフセット | パーティション内 | メッセージの位置識別子 |
| コンシューマグループ | トピック全体 | パーティションの分担と独立処理 |
| リーダーパーティション | パーティション | 読み書きを担当するレプリカ |
| ISR | パーティション | リーダーに追従しているレプリカのセット |

```python
# Kafka Producer・Consumer の基本実装 (confluent-kafka-python)

from confluent_kafka import Producer, Consumer, KafkaError
from confluent_kafka.admin import AdminClient, NewTopic
import json
import time

BOOTSTRAP_SERVERS = 'localhost:9092'
TOPIC = 'orders'

# ===== トピック作成 =====

def create_topic(topic_name: str, num_partitions: int = 6, replication_factor: int = 3):
    admin = AdminClient({'bootstrap.servers': BOOTSTRAP_SERVERS})
    new_topic = NewTopic(
        topic=topic_name,
        num_partitions=num_partitions,       # 並列度 = Consumer数の上限
        replication_factor=replication_factor  # 耐障害性
    )
    fs = admin.create_topics([new_topic])
    for topic, f in fs.items():
        try:
            f.result()
            print(f"トピック作成: {topic} ({num_partitions} partitions)")
        except Exception as e:
            print(f"トピック作成失敗: {e}")


# ===== Producer =====

class OrderProducer:
    def __init__(self):
        self.producer = Producer({
            'bootstrap.servers': BOOTSTRAP_SERVERS,
            # acks=all: 全ISRへの複製確認後に応答（最高の耐久性）
            'acks': 'all',
            # 冪等性: 重複なし・順序保証（enable.idempotence=True）
            'enable.idempotence': True,
            # バッチ設定: レイテンシとスループットのトレードオフ
            'linger.ms': 5,          # 最大5msまとめてバッチ送信
            'batch.size': 65536,     # バッチサイズ64KB
        })

    def send_order(self, order_id: str, data: dict):
        """
        パーティションキーにorder_idを使う
        同じorder_idは常に同じパーティションに送られる（順序保証）
        """
        self.producer.produce(
            topic=TOPIC,
            key=order_id.encode('utf-8'),      # パーティションキー
            value=json.dumps(data).encode('utf-8'),
            on_delivery=self._delivery_callback
        )
        self.producer.poll(0)  # コールバック処理

    def _delivery_callback(self, err, msg):
        if err:
            print(f"配信失敗: {err}")
        else:
            print(f"配信成功: topic={msg.topic()}, "
                  f"partition={msg.partition()}, offset={msg.offset()}")

    def flush(self):
        self.producer.flush()


# ===== Consumer =====

class OrderConsumer:
    def __init__(self, group_id: str):
        self.consumer = Consumer({
            'bootstrap.servers': BOOTSTRAP_SERVERS,
            # グループIDが同じConsumerはパーティションを分担
            'group.id': group_id,
            # auto.offset.reset: 新規グループの開始位置
            # 'earliest': 最古から読む, 'latest': 最新から読む
            'auto.offset.reset': 'earliest',
            # 手動コミット推奨: 処理完了後にオフセットをコミット
            'enable.auto.commit': False,
        })

    def consume(self, topics: list):
        self.consumer.subscribe(topics)
        try:
            while True:
                # タイムアウト1秒でポーリング
                msg = self.consumer.poll(timeout=1.0)
                if msg is None:
                    continue
                if msg.error():
                    if msg.error().code() == KafkaError._PARTITION_EOF:
                        print(f"パーティション末尾: {msg.topic()}[{msg.partition()}]")
                    else:
                        print(f"エラー: {msg.error()}")
                    continue

                # メッセージ処理
                order = json.loads(msg.value().decode('utf-8'))
                print(f"処理中: order_id={msg.key().decode()}, "
                      f"partition={msg.partition()}, offset={msg.offset()}")
                self._process_order(order)

                # 処理成功後に手動コミット（exactly-once 的な制御）
                self.consumer.commit(message=msg, asynchronous=False)

        except KeyboardInterrupt:
            pass
        finally:
            self.consumer.close()

    def _process_order(self, order: dict):
        print(f"注文処理: {order}")


# 使用例
# create_topic(TOPIC, num_partitions=6, replication_factor=3)
#
# producer = OrderProducer()
# for i in range(10):
#     producer.send_order(f"order-{i}", {"product": "A", "qty": i+1})
# producer.flush()
#
# # 異なるグループIDで独立して消費可能
# consumer_inventory = OrderConsumer(group_id="inventory-service")
# consumer_notify    = OrderConsumer(group_id="notification-service")
```

## 使用場面

- 同じKafkaトピックを在庫サービスと通知サービスが独立して消費する（異なるConsumer Group）場合
- 注文IDをパーティションキーにして同一注文のイベント順序を保証する場合
- 本番障害後にバグ修正済みのConsumerでオフセットをリセットして過去ログをReplayする場合
- Consumer数をパーティション数に合わせてスケールし並列処理性能を上げる場合

## 参考文献

- [Apache Kafka — パーティションドキュメント](https://kafka.apache.org/documentation/#intro_concepts_and_terms)
- [Confluent — Consumer Groups and Offset Management](https://developer.confluent.io/learn-kafka/apache-kafka/consumers/)
- [Kafka: The Definitive Guide — Neha Narkhede ほか](https://www.oreilly.com/library/view/kafka-the-definitive/9781491936153/)

<AffiliateBanner site="cloud_navi" />
