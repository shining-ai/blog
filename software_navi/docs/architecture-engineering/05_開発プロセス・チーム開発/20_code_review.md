import AffiliateBanner from '@site/src/components/AffiliateBanner';

# コードレビューの進め方

## コードレビューとは

> コードレビューとは、作者以外の開発者がコードの変更内容を確認し、バグ・設計上の問題・可読性・セキュリティなどを指摘する品質保証プロセスであり、チームの知識共有とコードベースの一貫性維持にも貢献する。

コードレビューの目的は単なるバグ発見にとどまらない。**品質向上**（バグ・セキュリティホール・パフォーマンス問題の早期発見）・**知識共有**（ベストプラクティスやコードベースの知識をチーム全体に広げる）・**一貫性維持**（スタイルガイド・設計方針の統一）・**相互学習**（レビュアーも実装者も学ぶ）が主な価値である。

効果的なレビューのためには**PR サイズを小さく保つ**（300行以下が理想）ことが最重要である。大きな PR はレビュアーの集中力を下げ、見落としを増やす。**レビューコメントのトーン**も重要で、コードに対するフィードバック（「この実装は〜の問題があります」）と人格への批判を分離し、提案形式（「〜にしてはいかがでしょうか」）で書くことが心理的安全性を守る。

Google の **Code Review Developer Guide** では、コメントを重要度別に分類することを推奨している：`blocker`（マージ前に必ず修正）・`nit`（軽微な改善提案・任意）・`suggestion`（提案）。

## レビューチェックリスト

| カテゴリ | 確認項目 |
|---------|---------|
| 正確性 | 仕様通りに動作するか、エッジケースの考慮はあるか |
| テスト | 適切なテストが書かれているか、カバレッジは十分か |
| 設計 | 単一責任の原則を守っているか、適切な抽象化か |
| セキュリティ | インジェクション・認証・認可の問題はないか |
| パフォーマンス | N+1 クエリ・不必要なループ・メモリリークはないか |
| 可読性 | 変数名・コメント・関数名は意図を伝えているか |
| 互換性 | 後方互換性は保たれているか |

```python
# コードレビューのよくある指摘と改善例

# ===== Before: レビュー指摘が入りやすいコード =====
from typing import Optional
import hashlib

def process_users(data):  # 型アノテーションがない
    result = []
    for i in range(len(data)):  # range(len()) より enumerate を使う
        user = data[i]
        if user['age'] >= 18:  # マジックナンバー
            # パスワードをそのままハッシュ（ソルトなし: セキュリティ問題）
            pw_hash = hashlib.md5(user['password'].encode()).hexdigest()  # MD5 は弱い
            result.append({
                'name': user['name'],
                'pw': pw_hash,
                'is_adult': True
            })
    return result


# ===== After: レビューを反映したコード =====
import secrets
import hashlib
from dataclasses import dataclass
from typing import TypedDict

ADULT_AGE_THRESHOLD = 18  # マジックナンバーを定数化

class UserInput(TypedDict):
    name: str
    age: int
    password: str

@dataclass(frozen=True)
class ProcessedUser:
    name: str
    password_hash: str
    salt: str
    is_adult: bool

def hash_password(password: str) -> tuple[str, str]:
    """PBKDF2 でパスワードをハッシュ化（ソルト付き）"""
    salt = secrets.token_hex(32)
    pw_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        iterations=100_000,
    ).hex()
    return pw_hash, salt

def process_users(users: list[UserInput]) -> list[ProcessedUser]:
    """
    ユーザーデータを処理してセキュアな形式に変換する。

    Args:
        users: 入力ユーザーリスト（名前・年齢・パスワードを含む）

    Returns:
        処理済みユーザーのリスト
    """
    processed = []
    for user in users:  # enumerate 不要な場合はシンプルに
        pw_hash, salt = hash_password(user["password"])
        processed.append(ProcessedUser(
            name=user["name"],
            password_hash=pw_hash,
            salt=salt,
            is_adult=user["age"] >= ADULT_AGE_THRESHOLD,
        ))
    return processed


# ===== レビューコメントの例（GitHub PR コメントの書き方） =====
REVIEW_COMMENT_EXAMPLES = """
# 良いレビューコメントの例

## [blocker] セキュリティ上の問題
MD5 はパスワードハッシュには脆弱です。PBKDF2・bcrypt・Argon2 の使用を推奨します。
また、ソルトなしのハッシュはレインボーテーブル攻撃に脆弱です。

→ 修正案:
    salt = secrets.token_hex(32)
    pw_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100_000)

## [nit] range(len()) → enumerate
for i in range(len(data)) より for user in data の方が Pythonic です。
インデックスが必要な場合は enumerate(data) を使用してください。

## [suggestion] 型アノテーションの追加
関数シグネチャに型アノテーションを追加すると IDE の補完と静的解析が改善されます。

## 良いコメントを書くためのポイント
- 何が問題か（What）+ なぜ問題か（Why）を説明する
- 具体的な改善案を提示する（可能な場合）
- 重要度を明示する（[blocker] / [nit] / [suggestion]）
- 個人への批判ではなくコードへのフィードバックとして書く
"""

print(REVIEW_COMMENT_EXAMPLES)
```

## 使用場面

- PR（Pull Request / Merge Request）ベースの開発フローでのコード品質管理
- ペアプログラミングの代替として非同期でのコード改善
- セキュリティ要件が高いプロダクトでの必須ゲート
- チームへの新規参加者のオンボーディング促進

## 参考文献

- [Google Engineering Practices: Code Review](https://google.github.io/eng-practices/review/)
- Wiegers, K. (2001). Peer Reviews in Software. Addison-Wesley.
- [Conventional Comments](https://conventionalcomments.org/)

<AffiliateBanner site="software_navi" />
