import AffiliateBanner from '@site/src/components/AffiliateBanner';

# RabbitMQ と Kafka の使い分け

## RabbitMQ・Kafka とは

> RabbitMQ は AMQP プロトコルを実装した従来型メッセージブローカーであり、柔軟なルーティングと確実なメッセージ配信を強みとする。一方 Kafka は分散ログとして設計され、高スループット・永続化・Replay を強みとする。用途の違いを正しく理解して選択することが重要だ。

**RabbitMQ** は「メッセージを届けること」に特化している。Exchangeとキューのルーティングが柔軟で、Priority Queue・Dead Letter Exchange・TTL・リクエスト・リプライパターンなど豊富な機能を持つ。メッセージはConsumerが消費すると削除される。ワークキューとして「タスクを1つのワーカーに確実に届ける」ユースケースに最適だ。ACKとNACKによる確実な配信保証も強みだ。

**Kafka** は「イベントログを保持すること」に特化している。メッセージはConsumerが消費しても削除されず、設定した保持期間（デフォルト7日）は残り続ける。これによりReplay・複数Consumer Group・ストリーム処理が可能になる。毎秒数百万件のメッセージを処理できる高スループット設計が特徴だ。

選択の判断軸は「メッセージを消費後に削除してよいか」「複数サービスが同じメッセージを独立して受け取るか」「過去メッセージのReplayが必要か」「スループットが毎秒何万件を超えるか」だ。タスクキュー・RPCには RabbitMQ、イベントストリーム・ログ集約・マイクロサービス間イベントバスには Kafka が適する。

クラウドマネージドサービスでは、RabbitMQの代替としてAWS SQS・Google Cloud Pub/Sub、KafkaのマネージドとしてAmazon MSK・Confluent Cloud・Aiven for Kafkaが利用できる。

## RabbitMQ vs Kafka 比較表

| 特性 | RabbitMQ | Kafka |
|------|---------|-------|
| モデル | キュー（消費後削除） | ログ（保持・Replay可能） |
| スループット | 数万msg/s | 数十万〜数百万msg/s |
| メッセージ保持 | 消費後削除（オプション） | 設定期間保持（デフォルト7日）|
| 複数Consumer | 競合（分散）かFanout | Consumer Groupで独立消費 |
| ルーティング | Exchange/Binding で柔軟 | パーティションキーのみ |
| 順序保証 | キュー単位 | パーティション単位 |
| ユースケース | タスクキュー・RPC・確実配信 | イベントストリーム・ログ・CDC |
| マネージドサービス | Amazon MQ・CloudAMQP | Amazon MSK・Confluent Cloud |

```python
# RabbitMQ と Kafka のコードスタイル比較

# ===== RabbitMQ: タスクキューパターン =====
# pip install pika

import pika
import json

# --- Producer ---
def rabbitmq_send_task(task_id: str, payload: dict):
    """
    RabbitMQ でタスクを送信
    1つのワーカーが確実に処理する（競合消費）
    """
    connection = pika.BlockingConnection(
        pika.ConnectionParameters('localhost')
    )
    channel = connection.channel()

    # 耐久性のあるキューを宣言（Broker再起動後も存在する）
    channel.queue_declare(queue='task_queue', durable=True)

    channel.basic_publish(
        exchange='',
        routing_key='task_queue',
        body=json.dumps({"task_id": task_id, **payload}),
        properties=pika.BasicProperties(
            delivery_mode=pika.DeliveryMode.Persistent  # メッセージも永続化
        )
    )
    print(f"[RabbitMQ] タスク送信: {task_id}")
    connection.close()


# --- Consumer ---
def rabbitmq_worker():
    """
    RabbitMQ ワーカー
    ACK後にメッセージ削除 → 確実に1回処理
    """
    connection = pika.BlockingConnection(
        pika.ConnectionParameters('localhost')
    )
    channel = connection.channel()
    channel.queue_declare(queue='task_queue', durable=True)

    # 一度に1タスクだけ受け取る（公平な分散）
    channel.basic_qos(prefetch_count=1)

    def callback(ch, method, properties, body):
        task = json.loads(body)
        print(f"[RabbitMQ Worker] 処理中: {task['task_id']}")
        # ... 処理 ...
        ch.basic_ack(delivery_tag=method.delivery_tag)  # 処理完了を通知
        print(f"[RabbitMQ Worker] 完了: {task['task_id']}")

    channel.basic_consume(queue='task_queue', on_message_callback=callback)
    channel.start_consuming()


# ===== Kafka: イベントストリームパターン =====
# pip install confluent-kafka

from confluent_kafka import Producer, Consumer
import time

KAFKA_BOOTSTRAP = 'localhost:9092'

# --- Producer ---
def kafka_publish_event(event_type: str, payload: dict):
    """
    Kafka にイベントを発行
    複数のConsumer Groupが独立して消費できる
    """
    producer = Producer({'bootstrap.servers': KAFKA_BOOTSTRAP})

    event = {
        "event_type": event_type,
        "timestamp": time.time(),
        **payload
    }
    producer.produce(
        topic='domain-events',
        key=payload.get('id', '').encode(),
        value=json.dumps(event).encode()
    )
    producer.flush()
    print(f"[Kafka] イベント発行: {event_type}")


# --- Consumer ---
def kafka_consume(group_id: str, service_name: str):
    """
    Kafka Consumer
    同じトピックを異なるgroup_idで独立して消費可能
    """
    consumer = Consumer({
        'bootstrap.servers': KAFKA_BOOTSTRAP,
        'group.id': group_id,  # サービスごとに異なるgroup_id
        'auto.offset.reset': 'earliest'
    })
    consumer.subscribe(['domain-events'])

    while True:
        msg = consumer.poll(timeout=1.0)
        if msg is None:
            continue
        if msg.error():
            print(f"エラー: {msg.error()}")
            continue

        event = json.loads(msg.value().decode())
        print(f"[{service_name}] 受信: {event['event_type']} "
              f"@ partition={msg.partition()}, offset={msg.offset()}")
        consumer.commit(message=msg, asynchronous=False)


# 使用例:
# kafka_publish_event("order.created", {"id": "order-001", "user": "user-123"})
# # 在庫サービスと通知サービスが独立して同じイベントを受信
# kafka_consume(group_id="inventory-service", service_name="在庫")
# kafka_consume(group_id="notification-service", service_name="通知")
```

## 使用場面

- 画像変換・レポート生成・バッチジョブのタスクを複数ワーカーで分散処理する場合は RabbitMQ
- マイクロサービス間のイベントバスとして注文・在庫・通知が同じイベントを独立して処理する場合は Kafka
- ユーザー行動ログ・センサーデータなど毎秒数万件以上の高スループット処理が必要な場合は Kafka
- Priority Queue・TTL付きメッセージ・リクエスト・リプライパターンが必要な場合は RabbitMQ

## 参考文献

- [RabbitMQ ドキュメント](https://www.rabbitmq.com/documentation.html)
- [Apache Kafka ドキュメント](https://kafka.apache.org/documentation/)
- [Kafka vs. RabbitMQ — Confluent](https://www.confluent.io/blog/kafka-vs-rabbitmq/)

<AffiliateBanner site="cloud_navi" />
