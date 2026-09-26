import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ブランチ戦略（Git Flow・GitHub Flow・Trunk Based）

## ブランチ戦略とは

> ブランチ戦略とは、チームがコードの開発・レビュー・リリースをどのようなブランチ構成で管理するかのルール体系であり、リリースサイクル・チーム規模・デプロイ頻度に応じて適切な戦略を選択することで並行開発の安全性と速度を両立させる。

**Git Flow**（Vincent Driessen, 2010）は `main`・`develop`・`feature/*`・`release/*`・`hotfix/*` の5種類のブランチを持つ厳格なモデルである。バージョニングが明確で大規模チームやパッケージリリース（ライブラリ・モバイルアプリ）に向くが、ブランチが多く複雑になりやすい。

**GitHub Flow**はシンプルで、`main` ブランチと短命な `feature` ブランチのみを使う。フィーチャーブランチから main にプルリクエストを出し、レビュー後すぐにマージ・デプロイする。継続的デリバリー（CD）と相性が良く、Web サービスに適している。

**Trunk Based Development（TBD）**は全員が共有の `main`（trunk）に直接コミットまたは1日以内の短命ブランチからマージする戦略である。フィーチャーフラグと組み合わせることで未完成の機能も main に入れられる。Google・Facebook などが採用し、真の CI/CD を実現するが、自動テストカバレッジが高くないと危険である。

## 3戦略の比較

| 観点 | Git Flow | GitHub Flow | Trunk Based |
|------|----------|-------------|------------|
| ブランチ数 | 多い（5種類） | 少ない（2種類） | 最少（基本1本） |
| リリース頻度 | 低い〜中（定期リリース） | 高い（随時デプロイ） | 非常に高い（数回/日） |
| 向いているプロダクト | ライブラリ・アプリ | Web サービス | 大規模 Web サービス |
| チームスキル要求 | 低め | 中程度 | 高い（テスト必須） |
| フィーチャーフラグ | 不要 | 場合により | ほぼ必須 |

```bash
# ===== GitHub Flow の実践 =====

# 1. main から feature ブランチを作成
git checkout main
git pull origin main
git checkout -b feature/add-user-profile

# 2. 機能を実装してコミット（小さく頻繁に）
git add src/user/profile.ts
git commit -m "feat: ユーザープロフィール画面を追加"

git add tests/user/profile.test.ts
git commit -m "test: ユーザープロフィールのテストを追加"

# 3. リモートにプッシュして PR を作成
git push -u origin feature/add-user-profile
# → GitHub/GitLab で PR を作成してレビューを依頼

# 4. レビューフィードバックを反映
git add src/user/profile.ts
git commit -m "fix: レビュー指摘のバリデーション修正"
git push

# 5. main にマージ後ブランチを削除
# (PR マージ後)
git checkout main
git pull origin main
git branch -d feature/add-user-profile


# ===== Git Flow のホットフィックス手順 =====

# 本番バグ発生時: main（またはタグ）から hotfix ブランチを作成
git checkout main
git checkout -b hotfix/fix-login-bug

git add src/auth/login.ts
git commit -m "fix: ログイン時のセッション固定化の脆弱性を修正"

# main と develop の両方にマージ
git checkout main
git merge --no-ff hotfix/fix-login-bug -m "Merge hotfix/fix-login-bug into main"
git tag -a v1.2.1 -m "Hotfix: login security fix"

git checkout develop
git merge --no-ff hotfix/fix-login-bug -m "Merge hotfix/fix-login-bug into develop"

git branch -d hotfix/fix-login-bug
```

```python
# フィーチャーフラグによる Trunk Based Development の実践

from enum import Enum
from typing import Callable, TypeVar, Any
import os

T = TypeVar("T")

class FeatureFlags:
    """
    フィーチャーフラグの管理クラス。
    環境変数・設定ファイル・サービスから読み込む。
    """

    _flags: dict[str, bool] = {
        "new_user_profile_v2": False,    # 開発中の機能: デフォルト OFF
        "dark_mode": True,               # リリース済み機能: ON
        "ai_recommendations": False,     # 実験的機能: OFF（一部ユーザーに展開中）
    }

    @classmethod
    def is_enabled(cls, flag_name: str, user_id: int | None = None) -> bool:
        # 環境変数でオーバーライド可能（ローカル開発・テストで有用）
        env_val = os.environ.get(f"FF_{flag_name.upper()}")
        if env_val is not None:
            return env_val.lower() in ("1", "true", "yes")

        # ユーザーID に基づく段階的ロールアウト（カナリアリリース）
        if user_id is not None and flag_name == "ai_recommendations":
            return user_id % 10 < 2  # 20% のユーザーに展開

        return cls._flags.get(flag_name, False)


def feature_flag(flag_name: str):
    """フィーチャーフラグデコレータ"""
    def decorator(func: Callable) -> Callable:
        def wrapper(*args, **kwargs):
            user_id = kwargs.get("user_id")
            if FeatureFlags.is_enabled(flag_name, user_id):
                return func(*args, **kwargs)
            else:
                print(f"  [FLAG OFF] {flag_name}: {func.__name__} はスキップ")
                return None
        return wrapper
    return decorator


# Trunk Based: 未完成機能も main に入れる（フラグで隠す）
class UserProfileService:
    def get_profile(self, user_id: int) -> dict:
        """既存の実装（常に有効）"""
        return {"user_id": user_id, "name": "Alice", "version": "v1"}

    @feature_flag("new_user_profile_v2")
    def get_profile_v2(self, user_id: int) -> dict | None:
        """開発中の新プロフィール（フラグで制御）"""
        return {
            "user_id": user_id,
            "name": "Alice",
            "avatar_url": "https://cdn.example.com/alice.jpg",
            "bio": "Software Engineer",
            "version": "v2",
        }


service = UserProfileService()
print("=== フィーチャーフラグのデモ ===")
print(service.get_profile(1))        # 常に表示
print(service.get_profile_v2(user_id=1))   # デフォルト OFF → None

# 環境変数で有効化
os.environ["FF_NEW_USER_PROFILE_V2"] = "true"
print(service.get_profile_v2(user_id=1))   # 有効化後 → v2 レスポンス
```

## 使用場面

- Git Flow: iOS/Android アプリ・ライブラリ・月次リリースサイクルのサービス
- GitHub Flow: スタートアップの Web サービス・SaaS プロダクト
- Trunk Based Development: Google・Facebook 規模の大規模チーム・高頻度デプロイ環境

## 参考文献

- Driessen, V. (2010). A successful Git branching model. nvie.com.
- Fowler, M. (2020). Trunk Based Development. martinfowler.com.
- [Trunk Based Development 公式サイト](https://trunkbaseddevelopment.com/)

<AffiliateBanner site="software_navi" />
