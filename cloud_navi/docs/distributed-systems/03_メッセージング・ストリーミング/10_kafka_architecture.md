import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Apache Kafka のアーキテクチャ

## Apache Kafka とは

> Apache Kafka は、LinkedInが2011年にオープンソース化した分散ストリーミングプラットフォームであり、高スループット・耐障害性・永続化を特徴とする分散ログシステムとして設計され、リアルタイムデータパイプラインとストリーム処理の基盤として広く採用されている。

Kafkaの核心は**分散コミットログ**という概念だ。メッセージはキューではなく、追記専用の永続化されたログとして保存される。ConsumerはログをどこからでもReplayできる。これが従来のメッセージキュー（RabbitMQなど）との最大の違いだ。

**Broker（ブローカー）** がKafkaの中核コンポーネントだ。実際にメッセージを保存・配信するサーバーで、クラスタは複数のBrokerで構成される。各Brokerは複数のTopicのPartitionのリーダーまたはフォロワーとして機能する。

**Topic（トピック）** はメッセージのカテゴリーだ。「注文イベント」「ユーザー行動ログ」などのトピックを作る。Topicは複数の**Partition（パーティション）** に分割され、パーティションがKafkaのスケーラビリティの鍵だ。

**ZooKeeper / KRaft** はクラスタのメタデータ管理を担う。旧来はZooKeeperが必須だったが、Kafka 3.3からはKRaft（Kafka Raft）という内蔵コンセンサスメカニズムでZooKeeperを不要にした。

**Producer** はトピックにメッセージを書き込む。**Consumer** はトピックからメッセージを読み取る。**Consumer Group** は複数のConsumerをグループ化し、各Partitionを1つのConsumerが担当する形で並列処理を実現する。

## Kafka のコアコンポーネント

| コンポーネント | 役割 | 詳細 |
|--------------|------|------|
| Broker | メッセージの保存・配信サーバー | クラスタは複数Brokerで構成 |
| Topic | メッセージカテゴリー | 複数Partitionに分割 |
| Partition | データの分散単位 | 各Partitionは1つのBrokerがリーダー |
| Producer | メッセージ書き込み | パーティション選択戦略を設定可能 |
| Consumer Group | 並列消費単位 | 各Partitionを1 Consumerが担当 |
| Offset | 読み取り位置 | ConsumerGroupごとに管理 |
| Replication Factor | レプリカ数 | 耐障害性のためにN-1台まで故障許容 |

```yaml
# docker-compose で Kafka クラスタを起動する設定例

version: '3.8'

services:
  # KRaft モード（ZooKeeper 不要）の Kafka クラスタ
  kafka1:
    image: confluentinc/cp-kafka:7.5.0
    hostname: kafka1
    container_name: kafka1
    ports:
      - "9092:9092"
    environment:
      # KRaft 設定
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: 'broker,controller'
      KAFKA_CONTROLLER_QUORUM_VOTERS: '1@kafka1:9093,2@kafka2:9093,3@kafka3:9093'
      # リスナー設定
      KAFKA_LISTENERS: 'PLAINTEXT://kafka1:29092,CONTROLLER://kafka1:9093,EXTERNAL://0.0.0.0:9092'
      KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://kafka1:29092,EXTERNAL://localhost:9092'
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: 'CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,EXTERNAL:PLAINTEXT'
      KAFKA_CONTROLLER_LISTENER_NAMES: 'CONTROLLER'
      KAFKA_INTER_BROKER_LISTENER_NAME: 'PLAINTEXT'
      # レプリケーション設定
      KAFKA_DEFAULT_REPLICATION_FACTOR: 3
      KAFKA_NUM_PARTITIONS: 6
      KAFKA_MIN_INSYNC_REPLICAS: 2
      # ログ保持設定
      KAFKA_LOG_RETENTION_HOURS: 168        # 7日間保持
      KAFKA_LOG_RETENTION_BYTES: 1073741824 # 1GB でローテーション
      KAFKA_LOG_SEGMENT_BYTES: 1073741824
      CLUSTER_ID: 'MkU3OEVBNTcwNTJENDM2Qk'

  kafka2:
    image: confluentinc/cp-kafka:7.5.0
    hostname: kafka2
    environment:
      KAFKA_NODE_ID: 2
      KAFKA_PROCESS_ROLES: 'broker,controller'
      KAFKA_CONTROLLER_QUORUM_VOTERS: '1@kafka1:9093,2@kafka2:9093,3@kafka3:9093'
      KAFKA_LISTENERS: 'PLAINTEXT://kafka2:29092,CONTROLLER://kafka2:9093,EXTERNAL://0.0.0.0:9094'
      KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://kafka2:29092,EXTERNAL://localhost:9094'
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: 'CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,EXTERNAL:PLAINTEXT'
      KAFKA_CONTROLLER_LISTENER_NAMES: 'CONTROLLER'
      KAFKA_INTER_BROKER_LISTENER_NAME: 'PLAINTEXT'
      KAFKA_DEFAULT_REPLICATION_FACTOR: 3
      KAFKA_MIN_INSYNC_REPLICAS: 2
      CLUSTER_ID: 'MkU3OEVBNTcwNTJENDM2Qk'
    ports:
      - "9094:9094"

  kafka3:
    image: confluentinc/cp-kafka:7.5.0
    hostname: kafka3
    environment:
      KAFKA_NODE_ID: 3
      KAFKA_PROCESS_ROLES: 'broker,controller'
      KAFKA_CONTROLLER_QUORUM_VOTERS: '1@kafka1:9093,2@kafka2:9093,3@kafka3:9093'
      KAFKA_LISTENERS: 'PLAINTEXT://kafka3:29092,CONTROLLER://kafka3:9093,EXTERNAL://0.0.0.0:9095'
      KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://kafka3:29092,EXTERNAL://localhost:9095'
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: 'CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,EXTERNAL:PLAINTEXT'
      KAFKA_CONTROLLER_LISTENER_NAMES: 'CONTROLLER'
      KAFKA_INTER_BROKER_LISTENER_NAME: 'PLAINTEXT'
      KAFKA_DEFAULT_REPLICATION_FACTOR: 3
      KAFKA_MIN_INSYNC_REPLICAS: 2
      CLUSTER_ID: 'MkU3OEVBNTcwNTJENDM2Qk'
    ports:
      - "9095:9095"

  # Schema Registry: メッセージスキーマの管理
  schema-registry:
    image: confluentinc/cp-schema-registry:7.5.0
    ports:
      - "8081:8081"
    environment:
      SCHEMA_REGISTRY_HOST_NAME: schema-registry
      SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: 'kafka1:29092,kafka2:29092,kafka3:29092'
```

## 使用場面

- マイクロサービス間のイベント伝播バスとして、注文・在庫・通知サービスをKafkaトピックで疎結合につなぐ場合
- クリックストリームやアプリログをリアルタイムでKafkaに集約し、Flink/Spark Streamingで分析する場合
- Change Data Capture（CDC）でDBの変更をKafkaに流してダウンストリームに伝播させる場合
- IoTデバイスから大量のセンサーデータをKafkaで受け取り時系列DBに保存する場合

## 参考文献

- [Apache Kafka ドキュメント](https://kafka.apache.org/documentation/)
- [Kafka: The Definitive Guide — Neha Narkhede ほか](https://www.oreilly.com/library/view/kafka-the-definitive/9781491936153/)
- [Confluent — Kafka アーキテクチャ解説](https://developer.confluent.io/learn-kafka/apache-kafka/get-started/)

<AffiliateBanner site="cloud_navi" />
