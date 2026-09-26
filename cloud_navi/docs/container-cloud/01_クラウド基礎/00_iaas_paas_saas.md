import AffiliateBanner from '@site/src/components/AffiliateBanner';

# IaaS・PaaS・SaaS の違い

## クラウドサービスモデルとは

> IaaS・PaaS・SaaS とは、クラウドコンピューティングのサービス提供モデルであり、ユーザーが管理・責任を持つ範囲（物理ハードウェアからアプリケーションまで）によって分類される。

クラウドサービスはどこまでをクラウド事業者が管理し、どこからをユーザーが管理するかによって3つのモデルに分類される。この違いを理解することは、アーキテクチャ設計とコスト最適化の基本だ。

**IaaS（Infrastructure as a Service）**は仮想マシン・ストレージ・ネットワークなどの基盤インフラを提供するモデルだ。OSからミドルウェア・アプリケーションまではユーザーが管理する。AWS EC2・GCE・Azure VMが代表例。柔軟性は高いが運用負荷も高い。

**PaaS（Platform as a Service）**はアプリケーションの実行環境（OS・ランタイム・ミドルウェア）もクラウド側が管理するモデルだ。開発者はアプリケーションコードとデータだけを管理すればよい。AWS Elastic Beanstalk・Google App Engine・Herokuが代表例。インフラ管理から解放される分、カスタマイズの自由度は下がる。

**SaaS（Software as a Service）**は完成したソフトウェアをインターネット経由で提供するモデルだ。ユーザーはアプリケーションを利用するだけで、インフラからアプリケーションの管理まですべてクラウド事業者が行う。Gmail・Salesforce・Slackが代表例。

近年はこの3つに加えて、**FaaS（Function as a Service）**や**CaaS（Container as a Service）**といったより細かいモデルも登場している。

## クラウドモデルの管理範囲比較

| 管理レイヤー | オンプレミス | IaaS | PaaS | SaaS |
|------------|------------|------|------|------|
| アプリケーション | ユーザー | ユーザー | ユーザー | クラウド |
| データ | ユーザー | ユーザー | ユーザー | クラウド |
| ランタイム | ユーザー | ユーザー | クラウド | クラウド |
| OS | ユーザー | ユーザー | クラウド | クラウド |
| 仮想化 | ユーザー | クラウド | クラウド | クラウド |
| 物理ハードウェア | ユーザー | クラウド | クラウド | クラウド |

```python
# AWS SDK を使ったIaaS（EC2）・PaaS（RDS）・SaaS的なサービスの利用例

import boto3

# IaaS: EC2 インスタンスの起動（インフラを直接制御）
ec2 = boto3.client('ec2', region_name='ap-northeast-1')

response = ec2.run_instances(
    ImageId='ami-0123456789abcdef0',
    InstanceType='t3.micro',
    MinCount=1,
    MaxCount=1,
    KeyName='my-key-pair',
    SecurityGroupIds=['sg-0123456789abcdef0'],
    SubnetId='subnet-0123456789abcdef0',
    TagSpecifications=[{
        'ResourceType': 'instance',
        'Tags': [{'Key': 'Name', 'Value': 'my-app-server'}]
    }]
)
print(f"EC2 instance ID: {response['Instances'][0]['InstanceId']}")

# PaaS: RDS でマネージドデータベースを作成
# （OSのパッチ適用・バックアップ・フェイルオーバーはAWSが管理）
rds = boto3.client('rds', region_name='ap-northeast-1')

rds.create_db_instance(
    DBInstanceIdentifier='my-database',
    DBInstanceClass='db.t3.micro',
    Engine='postgres',
    EngineVersion='16.1',
    MasterUsername='admin',
    MasterUserPassword='SecurePassword123!',
    AllocatedStorage=20,
    MultiAZ=True,
    StorageEncrypted=True,
    BackupRetentionPeriod=7,
)
print("RDS instance creation initiated")

# SaaS: S3 をオブジェクトストレージとして利用
# （インフラ・プラットフォームの管理は不要）
s3 = boto3.client('s3', region_name='ap-northeast-1')
s3.upload_file('local_file.csv', 'my-bucket', 'data/local_file.csv')
print("File uploaded to S3 (SaaS-like usage)")
```

## 使用場面

- 細かいインフラカスタマイズが必要な場合やレガシーアプリの移行にはIaaSが適する
- Webアプリケーションの迅速な開発・デプロイにはPaaSが効率的
- メールやコラボレーション・CRMなど汎用ツールの導入にはSaaSが最適
- スタートアップで少人数でインフラ管理したくない場合はPaaS・SaaS活用を検討する

## 参考文献

- [NIST — クラウドコンピューティングの定義](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-145.pdf)
- [AWS — クラウドコンピューティングの種類](https://aws.amazon.com/jp/types-of-cloud-computing/)
- [Google Cloud — クラウドサービスモデル](https://cloud.google.com/learn/paas-vs-iaas-vs-saas)

<AffiliateBanner site="cloud_navi" />
