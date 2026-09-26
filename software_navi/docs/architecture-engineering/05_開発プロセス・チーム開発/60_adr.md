import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ドキュメント駆動開発（ADR）

## ADR とは

> ADR（Architecture Decision Record）とは、アーキテクチャ上の重要な意思決定を「なぜその決断をしたか」という理由・背景・代替案とともに記録する軽量なドキュメント形式であり、将来のチームメンバーが過去の決定を理解・再評価できるようにする知識管理手法である。

開発チームはデータベースの選択・フレームワークの採用・API 設計方針・認証方式など多くのアーキテクチャ上の決断を行う。こうした決断の理由は口頭や Slack でのやり取りに残るだけで、後から「なぜこうなっているのか」が分からなくなることが多い。ADR はこの問題を解決する。

ADR の各レコードは短く（1〜2ページ）、以下の構成を持つ：**ステータス**（提案中 / 承認済み / 廃止済み / 置換済み）・**コンテキスト**（決断が必要になった背景・問題）・**決断**（選択した解決策）・**理由**（その選択の根拠）・**代替案**（検討したが選ばなかった案と理由）・**結果**（この決断のトレードオフ・影響）。

ADR はコードと同じリポジトリの `docs/adr/` または `docs/decisions/` ディレクトリに Markdown で管理し、PR レビューの対象にすることでチーム全体の合意形成に使える。`adr-tools` や `Log4brains` などのツールが ADR の作成・管理を支援する。

## ADR の構成要素

| 項目 | 内容 |
|------|------|
| タイトル | 短く具体的な決断の概要（例: 「データベースに PostgreSQL を採用」） |
| ステータス | 提案中 / 承認済み / 廃止済み / 置換済み（ADR番号を参照） |
| コンテキスト | 決断が必要になった背景・制約・問題 |
| 決断 | 選択した解決策（能動態で明確に） |
| 理由 | 選択の根拠（なぜ他の案でなくこれか） |
| 代替案 | 検討したが採用しなかった案と却下理由 |
| 結果 | 正の影響・負のトレードオフ・フォローアップ事項 |

```markdown
# ADR-0003: 非同期処理キューに Redis + Celery を採用

## ステータス

承認済み（2026-03-15）

## コンテキスト

ユーザー登録後のウェルカムメール送信・画像リサイズ・レポート生成など、
HTTP リクエストの応答時間内に完了させたくない非同期バックグラウンド処理が増えている。

現在はアプリサーバー内でスレッドを使っているが、以下の問題がある:
- デプロイ時に処理中のジョブが失われる
- ジョブの可視性・モニタリングができない
- ワーカーを独立してスケールできない

## 決断

非同期タスクキューとして **Redis をブローカー、Celery をワーカーフレームワーク**として採用する。

## 理由

- チームは Python（Django）で開発しており、Celery は Python エコシステムで
  最も成熟したタスクキューフレームワーク
- Redis はすでにセッションキャッシュで運用中のため追加インフラが不要
- Flower（Celery モニタリング UI）でジョブの可視性が確保できる
- ジョブの再試行・デッドレター・スケジューリングが標準サポート

## 代替案

**RabbitMQ + Celery**:
- AMQP プロトコルでより高度なルーティングが可能
- ただし、運用コストが Redis より高く、現在の要件には Over-Engineering
- Redis Streams で十分なスループットを確保できる見込み

**AWS SQS + Lambda**:
- サーバーレスでスケーリングが容易
- ただし、ベンダーロックインとローカル開発の複雑さが増す
- 現時点でのコストと開発速度の観点から見送り

**Django Q**:
- 軽量だが、大規模スケール時の実績が Celery より少ない

## 結果

### 正の影響
- バックグラウンド処理がデプロイ安全になる（graceful shutdown）
- ワーカーを独立してスケールできる
- Flower によるジョブ監視が可能

### 負のトレードオフ
- Redis・Celery ワーカーの運用管理が必要になる
- 分散トランザクションが複雑になる（ジョブとDBの整合性管理が必要）
- デバッグがローカル環境でやや複雑（Redis + Celery の起動が必要）

### フォローアップ
- [x] Celery の設定を Docker Compose に追加
- [ ] 本番環境の Redis Cluster 設定
- [ ] ジョブ失敗時のアラート設定
```

```python
# ADR 管理の自動化: ADR の一覧・ステータス確認スクリプト

import re
from pathlib import Path
from dataclasses import dataclass
from typing import Optional

@dataclass
class AdrSummary:
    number: int
    title: str
    status: str
    file_path: Path

def parse_adr(file_path: Path) -> Optional[AdrSummary]:
    """ADR ファイルを解析してサマリーを返す"""
    try:
        content = file_path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return None

    # タイトルの抽出（最初の # 見出し）
    title_match = re.search(r'^# (.+)$', content, re.MULTILINE)
    title = title_match.group(1) if title_match else "Unknown"

    # ステータスの抽出
    status_match = re.search(
        r'## ステータス\s*\n+([^\n]+)',
        content
    )
    status = status_match.group(1).strip() if status_match else "Unknown"

    # ファイル名から番号を抽出（例: 0003_redis_celery.md → 3）
    num_match = re.search(r'(\d+)', file_path.stem)
    number = int(num_match.group(1)) if num_match else 0

    return AdrSummary(number, title, status, file_path)


def list_adrs(adr_dir: Path) -> list[AdrSummary]:
    """ADR ディレクトリ内の全 ADR を一覧表示"""
    adrs = []
    for md_file in sorted(adr_dir.glob("*.md")):
        if md_file.name.startswith("0"):  # 番号付きファイルのみ
            summary = parse_adr(md_file)
            if summary:
                adrs.append(summary)
    return sorted(adrs, key=lambda a: a.number)


def generate_adr_index(adrs: list[AdrSummary]) -> str:
    """ADR の Markdown インデックスを生成"""
    lines = ["# Architecture Decision Records\n"]
    lines.append("| # | タイトル | ステータス |")
    lines.append("|---|---------|-----------|")
    for adr in adrs:
        link = f"[{adr.title}](./{adr.file_path.name})"
        status_icon = {
            "承認済み": "✅",
            "提案中": "🔄",
            "廃止済み": "❌",
            "置換済み": "🔀",
        }.get(adr.status.split("（")[0], "❓")
        lines.append(f"| {adr.number:04d} | {link} | {status_icon} {adr.status} |")
    return "\n".join(lines)


# デモ（実際の ADR ディレクトリがある場合）
# adr_dir = Path("docs/adr")
# adrs = list_adrs(adr_dir)
# print(generate_adr_index(adrs))

# サンプル出力の表示
sample_adrs = [
    AdrSummary(1, "TypeScript を主要言語として採用", "承認済み（2025-01-10）", Path("0001_typescript.md")),
    AdrSummary(2, "状態管理に Zustand を採用", "承認済み（2025-02-05）", Path("0002_zustand.md")),
    AdrSummary(3, "非同期処理キューに Redis + Celery を採用", "承認済み（2026-03-15）", Path("0003_celery.md")),
    AdrSummary(4, "GraphQL の採用", "廃止済み（ADR-0005 に置換）", Path("0004_graphql.md")),
]
print(generate_adr_index(sample_adrs))
```

## 使用場面

- 技術選定・アーキテクチャ変更・フレームワーク移行の意思決定を記録するとき
- 新しいチームメンバーのオンボーディングで「なぜこの設計か」を伝えるとき
- 過去の決定を再評価・更新するとき（ADR を廃止・置換）
- チーム間でアーキテクチャ方針を合意形成するとき（PR でのレビュー）

## 参考文献

- Nygard, M. (2011). Documenting Architecture Decisions. [thinkrelevance.com](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [adr-tools（ADR 管理 CLI）](https://github.com/npryce/adr-tools)
- [Log4brains（ADR を Web サイトに公開）](https://github.com/thomvaill/log4brains)

<AffiliateBanner site="software_navi" />
