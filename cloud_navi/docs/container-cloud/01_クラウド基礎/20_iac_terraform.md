import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Infrastructure as Code（Terraform 入門）

## IaC とは

> Infrastructure as Code（IaC）とは、インフラの構成をコードとして記述・管理する手法であり、手動操作の代わりにバージョン管理・テスト・自動化を適用してインフラを一貫して再現可能にする。

従来のインフラ管理はGUI操作やSSH越しの手作業で行われ、「誰がいつ何を変更したかわからない」「本番と検証で設定が微妙に違う」という問題が頻発していた。IaCはこれらの問題をコード化によって解消する。

**Terraform**はHashiCorpが開発したIaCツールの標準的な選択肢だ。HCL（HashiCorp Configuration Language）という宣言的な構文でインフラを定義し、AWS・GCP・Azure・Kubernetes・Cloudflareなど300以上のプロバイダーを統一した方法で管理できる。

Terraformのコアな概念は**宣言的アプローチ**だ。「サーバを3台起動するコマンドを書く」のではなく、「サーバが3台存在する状態を宣言する」。Terraformは現在の状態と宣言した状態の差分を計算し、必要な変更だけを実行する。

**状態管理（State）**はTerraformの重要な概念で、実際のインフラと定義の対応関係を`terraform.tfstate`ファイルに保存する。チームで作業する場合はS3やTerraform Cloudなどのリモートバックエンドで状態を共有する。

## Terraform の主要コマンド

| コマンド | 用途 |
|---------|------|
| `terraform init` | プロバイダーのダウンロードと初期化 |
| `terraform plan` | 変更内容のプレビュー |
| `terraform apply` | インフラへの変更適用 |
| `terraform destroy` | リソースの削除 |
| `terraform fmt` | コードのフォーマット |
| `terraform validate` | 構文チェック |
| `terraform state list` | 管理中リソースの一覧 |

```hcl
# main.tf — AWS で VPC + EC2 + RDS を構築する例

terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  # リモートバックエンドで状態を共有（チーム開発必須）
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "ap-northeast-1"
    encrypt        = true
    dynamodb_table = "terraform-lock"
  }
}

provider "aws" {
  region = var.region
}

# 変数の定義
variable "region" {
  description = "AWS リージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "environment" {
  description = "環境名"
  type        = string
}

variable "instance_type" {
  description = "EC2 インスタンスタイプ"
  type        = string
  default     = "t3.micro"
}

# VPC の作成
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "${var.environment}-vpc"
    Environment = var.environment
  }
}

# パブリックサブネット
resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${var.environment}-public-${count.index + 1}"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

# EC2 インスタンス
resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = var.instance_type
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name        = "${var.environment}-app-server"
    Environment = var.environment
  }
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

# 出力値
output "vpc_id" {
  description = "VPC の ID"
  value       = aws_vpc.main.id
}

output "app_public_ip" {
  description = "アプリサーバのパブリックIP"
  value       = aws_instance.app.public_ip
}
```

## 使用場面

- 本番・ステージング・開発環境を同一のコードから再現可能に構築する場合
- インフラ変更をGitのPull Requestでレビューし、planで影響を確認してからapplyする場合
- 災害復旧時に別リージョンへ同一インフラを素早く再現する場合
- インフラの変更履歴をバージョン管理して監査ログとして活用する場合

## 参考文献

- [Terraform 公式ドキュメント](https://developer.hashicorp.com/terraform/docs)
- [Terraform AWS プロバイダー](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Terraform ベストプラクティス](https://developer.hashicorp.com/terraform/language/style)

<AffiliateBanner site="cloud_navi" />
