import AffiliateBanner from '@site/src/components/AffiliateBanner';

# アジャイル・スクラムの実践

## アジャイルとは

> アジャイルとは、短いイテレーション（スプリント）で価値を継続的にデリバリーし、変化する要件に適応しながらソフトウェアを開発するための思想・手法の総称であり、スクラムはその最も広く採用されているフレームワークである。

アジャイルマニフェスト（2001）の4つの価値観：「プロセスやツールよりも**個人と相互作用**を」「包括的なドキュメントよりも**動くソフトウェア**を」「契約交渉よりも**顧客との協調**を」「計画に従うことよりも**変化への対応**を」。これらは従来のウォーターフォール開発の問題（長い開発期間・要件変更への硬直性・デリバリーの遅さ）への反省から生まれた。

**スクラム**は Product Owner（PO）・Scrum Master（SM）・開発チームの3役割と、Sprint（1〜4週間の開発単位）・Sprint Planning・Daily Scrum・Sprint Review・Sprint Retrospective の5つのイベント、Product Backlog・Sprint Backlog・Increment の3アーティファクトで構成される。

**スプリントの流れ**：PO が Product Backlog を優先順位付け → Sprint Planning でスプリントゴールとタスクを決定 → Daily Scrum（15分の立ち会い）で進捗確認・障壁除去 → Sprint Review でステークホルダーに成果をデモ → Sprint Retrospective でプロセス改善を議論。

## スクラムのイベントと目的

| イベント | 参加者 | 時間ボックス | 目的 |
|---------|--------|------------|------|
| Sprint Planning | 全員 | 4h/2週Sprint | スプリントゴールと Sprint Backlog を決定 |
| Daily Scrum | 開発チーム | 15分/日 | 進捗共有・障壁の早期発見 |
| Sprint Review | 全員 + ステークホルダー | 2h/2週Sprint | 完成した Increment のデモとフィードバック収集 |
| Sprint Retrospective | スクラムチーム | 1.5h/2週Sprint | プロセス改善アクションの決定 |
| Backlog Refinement | PO + 開発チーム | 随時 | バックログの詳細化・ストーリーポイント見積もり |

```python
# スクラムのバックログ管理をコードで表現するデモ

from dataclasses import dataclass, field
from enum import Enum
from datetime import date, timedelta
from typing import Optional
import random

class Priority(Enum):
    MUST_HAVE = 1
    SHOULD_HAVE = 2
    COULD_HAVE = 3
    WONT_HAVE = 4  # MoSCoW 優先度

class Status(Enum):
    TODO = "Todo"
    IN_PROGRESS = "In Progress"
    DONE = "Done"
    BLOCKED = "Blocked"

@dataclass
class UserStory:
    """
    ユーザーストーリー: As a [ユーザー], I want [機能], so that [価値]
    """
    id: str
    title: str
    as_a: str           # ユーザーロール
    i_want: str         # 機能
    so_that: str        # 価値
    story_points: int   # 見積もり（フィボナッチ数: 1,2,3,5,8,13）
    priority: Priority
    status: Status = Status.TODO
    acceptance_criteria: list[str] = field(default_factory=list)

    def __str__(self) -> str:
        return (
            f"[{self.id}] {self.title} ({self.story_points}pt, {self.priority.name})\n"
            f"  As a {self.as_a}, I want {self.i_want}, so that {self.so_that}"
        )

@dataclass
class Sprint:
    number: int
    start_date: date
    end_date: date
    goal: str
    stories: list[UserStory] = field(default_factory=list)

    @property
    def velocity(self) -> int:
        """完了したストーリーポイントの合計（ベロシティ）"""
        return sum(s.story_points for s in self.stories if s.status == Status.DONE)

    @property
    def total_points(self) -> int:
        return sum(s.story_points for s in self.stories)

    def burndown(self) -> list[tuple[str, int]]:
        """スプリントバーンダウンチャートのデータ（簡略版）"""
        days = (self.end_date - self.start_date).days + 1
        remaining = self.total_points
        chart = []
        ideal_per_day = remaining / days

        for i in range(days):
            day = self.start_date + timedelta(days=i)
            # 実績（ランダムにシミュレート）
            done_today = random.randint(0, 5)
            remaining = max(0, remaining - done_today)
            ideal = max(0, self.total_points - ideal_per_day * (i + 1))
            chart.append((day.strftime("%m/%d"), remaining))
        return chart

class ProductBacklog:
    def __init__(self):
        self.stories: list[UserStory] = []
        self.sprints: list[Sprint] = []

    def add_story(self, story: UserStory) -> None:
        self.stories.append(story)
        # 優先度順にソート
        self.stories.sort(key=lambda s: s.priority.value)

    def plan_sprint(self, sprint_number: int, capacity: int, goal: str) -> Sprint:
        """スプリントプランニング: capacity ポイントまでトップ優先度のストーリーを選択"""
        start = date.today()
        end = start + timedelta(weeks=2)
        sprint = Sprint(sprint_number, start, end, goal)

        remaining_capacity = capacity
        for story in self.stories:
            if story.status == Status.TODO and story.story_points <= remaining_capacity:
                sprint.stories.append(story)
                story.status = Status.IN_PROGRESS
                remaining_capacity -= story.story_points

        self.sprints.append(sprint)
        return sprint

    def average_velocity(self) -> float:
        if not self.sprints:
            return 0.0
        return sum(s.velocity for s in self.sprints) / len(self.sprints)


# ===== デモ =====
backlog = ProductBacklog()

backlog.add_story(UserStory(
    "US-001", "ユーザーログイン",
    as_a="サイト訪問者", i_want="メールとパスワードでログイン",
    so_that="個人設定にアクセスできる",
    story_points=5, priority=Priority.MUST_HAVE,
    acceptance_criteria=[
        "正しい認証情報でログインできる",
        "誤った認証情報でエラーが表示される",
        "3回失敗でアカウントロックされる",
    ]
))
backlog.add_story(UserStory(
    "US-002", "パスワードリセット",
    as_a="ログインできないユーザー", i_want="メールでパスワードをリセット",
    so_that="アカウントに再アクセスできる",
    story_points=3, priority=Priority.MUST_HAVE,
))
backlog.add_story(UserStory(
    "US-003", "ダークモード",
    as_a="長時間利用するユーザー", i_want="ダークモードに切り替え",
    so_that="目の疲れを軽減できる",
    story_points=2, priority=Priority.COULD_HAVE,
))

sprint = backlog.plan_sprint(1, capacity=8, goal="基本的な認証機能の提供")
print(f"=== Sprint {sprint.number}: {sprint.goal} ===")
for story in sprint.stories:
    print(f"  {story}")
print(f"  Sprint ポイント合計: {sprint.total_points}")
```

## 使用場面

- 要件が変化しやすいプロダクト開発（スタートアップ・新規事業）
- ステークホルダーからの継続的なフィードバックが重要なプロジェクト
- 複数のチームが並行してプロダクト開発するスケールドアジャイル（SAFe・LeSS）
- DevOps 文化の醸成とデプロイ頻度の向上を目指す組織

## 参考文献

- Beck, K. et al. (2001). *Manifesto for Agile Software Development*. agilemanifesto.org.
- Schwaber, K. & Sutherland, J. (2020). *The Scrum Guide*.
- Cohn, M. (2004). *User Stories Applied*. Addison-Wesley.

<AffiliateBanner site="software_navi" />
