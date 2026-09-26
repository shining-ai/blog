import AffiliateBanner from '@site/src/components/AffiliateBanner';

# DRY・KISS・YAGNI

## DRY・KISS・YAGNIとは

> DRY: すべての知識はシステム内で単一・明確・信頼できる表現を持たなければならない。（Every piece of knowledge must have a single, unambiguous, authoritative representation within a system.）

DRY（Don't Repeat Yourself）・KISS（Keep It Simple, Stupid）・YAGNI（You Ain't Gonna Need It）は、コードの品質を維持するための基本的な設計原則です。これら三つは互いに補完的な関係にあり、まとめて「良いコードの三原則」と呼ばれることもあります。

**DRY** は重複したコードや知識を排除することを求めます。コピペコードが存在すると、仕様変更時に複数箇所を修正する必要があり、修正漏れがバグにつながります。ただし「コードの見た目が似ている」だけで機械的に共通化することは誤りです。同じ「知識」を持つコードのみ統合すべきです。

**KISS** は設計をできる限りシンプルに保つことを求めます。余計な抽象化・過剰な設計・難解な実装はメンテナンスコストを高めます。問題を解くために必要な最小限の複雑さだけを受け入れます。

**YAGNI** は「今必要でない機能は実装しない」という原則です。将来の拡張を見越して先回りした汎用化は、往々にして使われず技術的負債になります。

## 三原則の比較

| 原則 | 焦点 | アンチパターン |
|------|------|----------------|
| DRY | 知識の重複排除 | コピペコード・同じロジックの散在 |
| KISS | 複雑さの最小化 | 過度な抽象化・難読な実装 |
| YAGNI | 不要な実装の排除 | 使われない汎用機能・早すぎる最適化 |

```python title="DRY 違反例"
def get_user_discount(user):
    if user.type == "premium":
        return user.total * 0.9
    return user.total

def get_order_discount(order):
    if order.user.type == "premium":
        return order.total * 0.9  # 同じ割引ロジックが重複
    return order.total
```

```python title="DRY 適用例"
PREMIUM_DISCOUNT_RATE = 0.9

def apply_premium_discount(total: float, user_type: str) -> float:
    if user_type == "premium":
        return total * PREMIUM_DISCOUNT_RATE
    return total

def get_user_discount(user):
    return apply_premium_discount(user.total, user.type)

def get_order_discount(order):
    return apply_premium_discount(order.total, order.user.type)
```

```python title="YAGNI 違反例（使われない汎用化）"
class DataExporter:
    def export(self, data, format: str, compress: bool = False,
               encrypt: bool = False, version: int = 1):
        # 現時点ではJSONのみ使うのに過剰な汎用化
        ...
```

```python title="YAGNI 適用例"
class DataExporter:
    def export_as_json(self, data) -> str:
        import json
        return json.dumps(data)
    # 他の形式は必要になったときに追加する
```

## 使用場面

- コードレビューで重複を発見したとき（DRY）
- シンプルな実装で問題を解けるのに複雑な設計を提案されたとき（KISS）
- スプリント計画で「将来使うかも」という理由で工数が膨らんでいるとき（YAGNI）

## 参考文献

- Andrew Hunt, David Thomas, *The Pragmatic Programmer*, Addison-Wesley, 1999
- Martin Fowler, *Refactoring: Improving the Design of Existing Code*, Addison-Wesley, 2018

<AffiliateBanner site="software_navi" />
