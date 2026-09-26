import AffiliateBanner from '@site/src/components/AffiliateBanner';

# オブジェクトストレージ（S3 の仕組み）

## オブジェクトストレージとは

> オブジェクトストレージとは、データをフラットな名前空間にオブジェクト（データ本体＋メタデータ＋一意キー）として保存するストレージアーキテクチャであり、スケーラビリティと耐久性に優れ、HTTPベースのAPIでアクセスする。

従来のファイルシステム（NFS・SMB）がディレクトリ階層でファイルを管理するのに対し、オブジェクトストレージはバケットの中にフラットにオブジェクトを保存する。階層はキー名（`images/2024/01/photo.jpg`）で表現するだけで、実態はフラットだ。

**Amazon S3（Simple Storage Service）**はオブジェクトストレージの代名詞的な存在だ。複数のAZにデータを自動レプリケーションすることで99.999999999%（イレブンナイン）の耐久性を実現している。バケット単位でデータを管理し、オブジェクトには任意のメタデータを付与できる。

S3の重要な機能として**バージョニング**（オブジェクトの変更履歴を保持）、**ライフサイクルポリシー**（古いオブジェクトを自動的に安いストレージクラスへ移動・削除）、**署名付きURL**（一時的なアクセス許可の発行）、**イベント通知**（アップロード時にLambdaを起動）などがある。

**ストレージクラス**を使い分けることでコストを最適化できる。アクセス頻度が高いデータにはStandard、低頻度アクセスにはIA（Infrequent Access）、アーカイブにはGlacierを選択する。

## S3 のストレージクラス比較

| ストレージクラス | 取り出し時間 | 用途 |
|--------------|-----------|------|
| S3 Standard | 即座 | 頻繁にアクセスするデータ |
| S3 Standard-IA | 即座 | 低頻度アクセス（月1回程度） |
| S3 One Zone-IA | 即座 | 再作成可能な低頻度アクセスデータ |
| S3 Glacier Instant | 即座 | アーカイブ（即座の取り出し必要） |
| S3 Glacier Flexible | 数分〜数時間 | 長期アーカイブ |
| S3 Glacier Deep Archive | 12時間以内 | 7〜10年保管の規制対応 |

```python
# boto3 を使った S3 の基本操作

import boto3
from botocore.exceptions import ClientError
import json

s3 = boto3.client('s3', region_name='ap-northeast-1')

# バケットの作成
def create_bucket(bucket_name: str, region: str = 'ap-northeast-1'):
    s3.create_bucket(
        Bucket=bucket_name,
        CreateBucketConfiguration={'LocationConstraint': region}
    )
    # バージョニングを有効化
    s3.put_bucket_versioning(
        Bucket=bucket_name,
        VersioningConfiguration={'Status': 'Enabled'}
    )

# オブジェクトのアップロード
def upload_file(bucket: str, local_path: str, s3_key: str):
    s3.upload_file(
        local_path,
        bucket,
        s3_key,
        ExtraArgs={
            'ContentType': 'application/octet-stream',
            'ServerSideEncryption': 'AES256',
            'Metadata': {
                'uploaded-by': 'myapp',
                'version': '1.0',
            }
        }
    )

# 署名付きURLの発行（15分間有効な一時ダウンロードURL）
def generate_presigned_url(bucket: str, key: str, expiry: int = 900) -> str:
    url = s3.generate_presigned_url(
        'get_object',
        Params={'Bucket': bucket, 'Key': key},
        ExpiresIn=expiry
    )
    return url

# ライフサイクルポリシーの設定
def set_lifecycle_policy(bucket: str):
    lifecycle_config = {
        'Rules': [
            {
                'ID': 'archive-old-logs',
                'Status': 'Enabled',
                'Filter': {'Prefix': 'logs/'},
                'Transitions': [
                    {
                        'Days': 30,
                        'StorageClass': 'STANDARD_IA'
                    },
                    {
                        'Days': 90,
                        'StorageClass': 'GLACIER'
                    }
                ],
                'Expiration': {'Days': 365}
            }
        ]
    }
    s3.put_bucket_lifecycle_configuration(
        Bucket=bucket,
        LifecycleConfiguration=lifecycle_config
    )

# オブジェクト一覧の取得（ページネーション対応）
def list_objects(bucket: str, prefix: str = ''):
    paginator = s3.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get('Contents', []):
            print(f"{obj['Key']} ({obj['Size']} bytes, {obj['LastModified']})")
```

## 使用場面

- 画像・動画・ドキュメントなどの静的ファイルの配信（CloudFrontと組み合わせ）
- アプリケーションのログやバックアップの長期保管
- Terraformの状態ファイルやCI/CDアーティファクトの保存
- データレイクの構築（大量の非構造化データの格納・分析）

## 参考文献

- [Amazon S3 公式ドキュメント](https://docs.aws.amazon.com/s3/index.html)
- [S3 ストレージクラス](https://aws.amazon.com/jp/s3/storage-classes/)
- [S3 セキュリティのベストプラクティス](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)

<AffiliateBanner site="cloud_navi" />
