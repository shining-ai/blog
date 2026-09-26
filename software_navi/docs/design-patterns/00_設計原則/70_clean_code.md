import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Clean Code の考え方

## Clean Code とは

> クリーンなコードは、書いた人が気を配ったことが伝わるコードである。（Clean code is code that has been taken care of.）— Michael Feathers

Clean Code とは、読みやすく・理解しやすく・変更しやすいコードのことです。Robert C. Martin（Uncle Bob）が著書 *Clean Code* で体系化しました。「動くコード」と「良いコード」は別物であり、後者は将来の自分や同僚がスムーズに読んで変更できるコードを指します。

コードは書く時間より読まれる時間の方がはるかに長いと言われます。コードを書く際に読み手への配慮を持つことが、長期的なメンテナンスコストを大きく下げます。

Clean Codeの主な要素は「意味のある命名」「小さな関数」「適切なコメント」「エラーハンドリング」「テスト」です。魔法のルールはなく、継続的なリファクタリングと学習が重要です。

## Clean Code の主要原則

| 項目 | 原則 |
|------|------|
| 命名 | 名前は意図を明確に表す。省略・略語を避ける |
| 関数 | 関数はひとつのことだけをする。20行以内が目安 |
| コメント | コード自体が説明できるようにし、補足のみコメント |
| フォーマット | チーム内で一貫したスタイルを維持する |
| エラー処理 | 例外でエラーを表現し、戻り値での null/エラーコードを避ける |
| テスト | F.I.R.S.T 原則（速い・独立・繰返可・自己検証・適時） |

```python title="Clean Code 違反例"
def proc(d, t):
    # リストを処理
    r = []
    for i in d:
        if i[2] == t and i[3] > 0:
            r.append(i[0] * i[3])
    return sum(r)
```

```python title="Clean Code 適用例"
from dataclasses import dataclass

@dataclass
class OrderItem:
    price: float
    quantity: int
    category: str
    is_in_stock: bool

def calculate_total_for_category(
    items: list[OrderItem],
    target_category: str
) -> float:
    """指定カテゴリの在庫あり商品の合計金額を返す"""
    in_stock_items = [
        item for item in items
        if item.category == target_category and item.is_in_stock
    ]
    return sum(item.price * item.quantity for item in in_stock_items)
```

```python title="エラー処理の改善例"
# 悪い例: エラーコードを返す
def find_user(user_id: int):
    user = db.get(user_id)
    if user is None:
        return -1  # エラーコードは呼び出し元を汚染する
    return user

# 良い例: 例外を使う
class UserNotFoundError(Exception):
    pass

def find_user(user_id: int):
    user = db.get(user_id)
    if user is None:
        raise UserNotFoundError(f"User {user_id} not found")
    return user
```

## 使用場面

- コードレビューの評価軸として
- 新規プロジェクト開始時のコーディングガイドライン策定
- レガシーコードのリファクタリング優先度の判断

## 参考文献

- Robert C. Martin, *Clean Code: A Handbook of Agile Software Craftsmanship*, Prentice Hall, 2008
- Martin Fowler, *Refactoring: Improving the Design of Existing Code*, Addison-Wesley, 2018

<AffiliateBanner site="software_navi" />
