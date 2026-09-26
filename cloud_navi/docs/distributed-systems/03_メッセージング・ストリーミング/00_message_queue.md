import AffiliateBanner from '@site/src/components/AffiliateBanner';

# メッセージキューの概念（非同期・デカップリング）

## メッセージキューとは

> メッセージキュー（Message Queue）とは、送信側（Producer）と受信側（Consumer）の間にキューを挟み、メッセージを非同期に受け渡しする仕組みであり、サービス間のデカップリング・負荷分散・信頼性向上を実現するための分散システムの基本パターンである。

モノリシックなシステムでは関数呼び出しで直接処理を依頼する。しかしマイクロサービスや分散システムでは「注文サービスが在庫サービスを直接呼び出す」と、在庫サービスがダウンしたときに注文も失敗してしまう。メッセージキューはこの問題を解決する。

**非同期処理**がメッセージキューの核心だ。注文サービスはメッセージをキューに入れたら即座に処理を継続できる。在庫サービスは自分のペースでメッセージを取り出して処理する。注文サービスと在庫サービスは時間的にデカップリングされる。

**デカップリング**により、Consumer側の障害・デプロイ・スケールアウトがProducerに影響しない。Consumer側を新しいバージョンにリリースしても、キューにメッセージが溜まるだけでProducerは正常に動き続ける。新しいConsumerを追加するだけで機能拡張もできる。

**バックプレッシャー**の制御も重要な役割だ。大量のリクエストが来たときにConsumerが処理しきれない場合、キューがバッファとして機能し、Consumerは自分のペースで処理できる。

メッセージキューの主な配信モデルは2種類ある。**Point-to-Point（キューモデル）**: 1メッセージを1つのConsumerが処理する（RabbitMQ・SQS）。**Publish-Subscribe（トピックモデル）**: 1メッセージを複数のConsumerが受け取る（Kafka・SNS）。

## メッセージキューの主な比較

| 特性 | 同期 HTTP 呼び出し | メッセージキュー |
|------|-------------------|----------------|
| 依存性 | 受信側が稼働している必要あり | 受信側が停止していても送信可能 |
| 処理速度 | 受信側の処理速度に依存 | 受信側は自分のペースで処理 |
| スケーリング | 直接影響 | Consumer を独立してスケール可能 |
| 障害伝播 | 受信側障害が送信側に波及 | キューがバッファとなり障害を隔離 |
| レイテンシ | 低（直接通信） | 中〜高（キューのオーバーヘッド） |

```python
# AWS SQS を使ったメッセージキューの基本操作

import boto3
import json
from typing import Optional
import time

# SQS クライアントの初期化
sqs = boto3.client('sqs', region_name='ap-northeast-1')

QUEUE_URL = 'https://sqs.ap-northeast-1.amazonaws.com/123456789/order-queue'

# ===== Producer: メッセージを送信 =====

def send_order(order_id: str, product_id: str, quantity: int) -> str:
    """
    注文をキューに送信する
    呼び出し元は在庫サービスの稼働状況を意識しない（デカップリング）
    """
    message = {
        "order_id": order_id,
        "product_id": product_id,
        "quantity": quantity,
        "timestamp": time.time()
    }
    response = sqs.send_message(
        QueueUrl=QUEUE_URL,
        MessageBody=json.dumps(message),
        # メッセージグループID（FIFOキューの場合）
        # MessageGroupId=order_id,
        # 冪等性キー: 重複送信を防ぐ
        MessageDeduplicationId=order_id,
    )
    message_id = response['MessageId']
    print(f"注文を送信: order_id={order_id}, message_id={message_id}")
    return message_id


# ===== Consumer: メッセージを受信して処理 =====

def process_orders(max_messages: int = 10, wait_seconds: int = 20) -> None:
    """
    キューからメッセージをポーリングして処理する
    ロングポーリング（wait_seconds=20）でコストを削減
    """
    while True:
        response = sqs.receive_message(
            QueueUrl=QUEUE_URL,
            MaxNumberOfMessages=max_messages,
            WaitTimeSeconds=wait_seconds,  # ロングポーリング
            # 処理中に他のConsumerが取得しないよう一時的に隠す（可視性タイムアウト）
            VisibilityTimeout=30,
        )
        messages = response.get('Messages', [])
        if not messages:
            print("メッセージなし、待機中...")
            continue

        for msg in messages:
            try:
                body = json.loads(msg['Body'])
                print(f"注文処理中: order_id={body['order_id']}")

                # 在庫を引き当てる（実際の業務ロジック）
                reserve_inventory(body['product_id'], body['quantity'])

                # 正常処理後にキューから削除
                sqs.delete_message(
                    QueueUrl=QUEUE_URL,
                    ReceiptHandle=msg['ReceiptHandle']
                )
                print(f"注文完了: order_id={body['order_id']}")

            except Exception as e:
                print(f"処理失敗: {e}（VisibilityTimeout後に再試行）")
                # 削除しないことで可視性タイムアウト後に再配信される
                # 一定回数失敗するとDead Letter Queueに移動


def reserve_inventory(product_id: str, quantity: int) -> None:
    """在庫引き当て処理（ダミー実装）"""
    print(f"在庫引き当て: product_id={product_id}, quantity={quantity}")
```

## 使用場面

- Eコマースで注文サービスと在庫・決済・配送サービスを非同期に連携させる場合
- 画像アップロード後の圧縮・リサイズ・サムネイル生成を非同期バックグラウンド処理で行う場合
- マイクロサービス間でイベントを伝播させるイベント駆動アーキテクチャを構築する場合
- バッチ処理のジョブキューとしてワーカーに作業を分散させる場合

## 参考文献

- [AWS SQS ドキュメント](https://docs.aws.amazon.com/sqs/index.html)
- [Enterprise Integration Patterns — Gregor Hohpe](https://www.enterpriseintegrationpatterns.com/)
- [Designing Data-Intensive Applications — Martin Kleppmann](https://dataintensive.net/)

<AffiliateBanner site="cloud_navi" />
