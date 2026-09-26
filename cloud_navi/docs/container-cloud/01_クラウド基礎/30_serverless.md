import AffiliateBanner from '@site/src/components/AffiliateBanner';

# サーバレス（AWS Lambda・Cloud Functions）

## サーバレスとは

> サーバレス（Serverless）とは、サーバの管理・プロビジョニングを意識せずにアプリケーションを実行できるクラウドのモデルであり、関数単位でコードをデプロイしてイベント駆動で実行する FaaS が代表例である。

「サーバレス」という名前だが実際にはサーバは存在する。ただしサーバの管理（OSのパッチ・スケーリング・可用性確保）をクラウド側が完全に担うため、開発者はビジネスロジックのコードだけに集中できる。

**AWS Lambda**はサーバレス関数の代表的なサービスだ。コードをアップロードするだけで、HTTP・S3イベント・DynamoDB Streams・SNS・SQSなど多様なトリガーから自動実行できる。実行していない間は費用が発生せず、**従量課金**がコスト効率の大きなメリットだ。

**コールドスタート**はサーバレスの代表的なデメリットだ。一定時間実行されなかった関数が次に呼び出される際、コンテナの起動に数百ms〜数秒かかる。プロビジョニングドコンカレンシーや定期的なウォームアップで緩和できる。

サーバレスはすべてのユースケースに適しているわけではない。長時間実行（Lambdaは最大15分）・大量のメモリ・低レイテンシが要求される処理・バッチ処理などはコンテナや通常のサーバが向いている場合もある。

## サーバレスのメリット・デメリット

| 観点 | メリット | デメリット |
|------|---------|----------|
| 運用 | サーバ管理不要 | デバッグが難しい |
| コスト | 実行時間分のみ課金 | 常時稼働には不利 |
| スケール | 自動でスケール | コールドスタートあり |
| デプロイ | コードだけでデプロイ | 実行時間・メモリ制限あり |
| 可用性 | クラウドが管理 | ベンダーロックインリスク |

```python
# AWS Lambda 関数の例（Python）
import json
import boto3
import logging
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

def handler(event, context):
    """
    S3 にアップロードされた CSV を解析して DynamoDB に保存する Lambda 関数
    """
    logger.info(f"Event: {json.dumps(event)}")

    # S3 イベントからバケット名とキーを取得
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']

        logger.info(f"Processing: s3://{bucket}/{key}")

        # S3 からファイルを読み込む
        response = s3.get_object(Bucket=bucket, Key=key)
        content = response['Body'].read().decode('utf-8')

        # CSV を解析（簡略化）
        lines = content.strip().split('\n')
        headers = lines[0].split(',')

        table = dynamodb.Table('ProcessedData')

        with table.batch_writer() as batch:
            for line in lines[1:]:
                values = line.split(',')
                item = dict(zip(headers, values))
                item['processed_at'] = datetime.utcnow().isoformat()
                batch.put_item(Item=item)

        logger.info(f"Processed {len(lines) - 1} records from {key}")

    return {
        'statusCode': 200,
        'body': json.dumps({'message': 'Processing completed'})
    }
```

```yaml
# AWS SAM (Serverless Application Model) テンプレート
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Runtime: python3.12
    Timeout: 30
    MemorySize: 256
    Environment:
      Variables:
        DYNAMODB_TABLE: !Ref DataTable
    Layers:
      - !Ref DependenciesLayer

Resources:
  # S3 → Lambda → DynamoDB パイプライン
  ProcessFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: app.handler
      CodeUri: ./src/
      Description: "S3 CSV ファイルを処理して DynamoDB に保存"
      Policies:
        - S3ReadPolicy:
            BucketName: !Ref DataBucket
        - DynamoDBWritePolicy:
            TableName: !Ref DataTable
      Events:
        S3Upload:
          Type: S3
          Properties:
            Bucket: !Ref DataBucket
            Events: s3:ObjectCreated:*
            Filter:
              S3Key:
                Rules:
                  - Name: suffix
                    Value: ".csv"

  # API Gateway + Lambda（REST API）
  ApiFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: api.handler
      CodeUri: ./src/
      Events:
        GetItems:
          Type: Api
          Properties:
            Path: /items
            Method: get
        PostItem:
          Type: Api
          Properties:
            Path: /items
            Method: post

  DataBucket:
    Type: AWS::S3::Bucket

  DataTable:
    Type: AWS::DynamoDB::Table
    Properties:
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
      KeySchema:
        - AttributeName: id
          KeyType: HASH
```

## 使用場面

- ファイルアップロード時のリサイズや変換など、イベントトリガーの軽量処理
- 定期的なバッチ処理（日次レポート生成・データクレンジング）
- APIのバックエンドで、アクセスが不定期なエンドポイント
- Webhookの受信・処理など外部サービスとの統合

## 参考文献

- [AWS Lambda 公式ドキュメント](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)
- [Google Cloud Functions](https://cloud.google.com/functions/docs)
- [AWS SAM（Serverless Application Model）](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)

<AffiliateBanner site="cloud_navi" />
