import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 凝集度と結合度

## 凝集度と結合度とは

> 良い設計は高凝集・疎結合（High Cohesion, Low Coupling）を目指す。

凝集度（Cohesion）はモジュール内部の要素がどれだけ関連しているかを示す尺度であり、結合度（Coupling）はモジュール間の依存の強さを示します。優れた設計は「凝集度が高く、結合度が低い」状態を目指します。

**凝集度**が低いモジュールは、関係のない機能が寄せ集められており、変更時に影響範囲が読みにくくなります。凝集度を高めるには、関連する責務をまとめ、無関係な処理を分離します。

**結合度**が高いモジュールは互いに密接に絡み合い、一方を変更すると他方も変更が必要になります。結合度を下げるにはインタフェースや抽象クラスを介して依存し、直接参照を減らします。

これらは単体では意味をなさず、トレードオフを意識しながらバランスを取ることが重要です。

## 凝集度の種類（低い順）

| 種類 | 説明 | 評価 |
|------|------|------|
| 偶発的凝集 | 無関係な処理の寄せ集め | 最悪 |
| 論理的凝集 | 似た処理をまとめただけ | 悪い |
| 時間的凝集 | 同時に実行する処理をまとめた | やや悪い |
| 手続き的凝集 | 手順上連続する処理をまとめた | 普通 |
| 通信的凝集 | 同じデータを扱う処理をまとめた | 良い |
| 順次的凝集 | 出力が次の入力になる処理をまとめた | 良い |
| 機能的凝集 | ひとつの機能を実現する処理のみ | 最良 |

## 結合度の種類（強い順）

| 種類 | 説明 | 評価 |
|------|------|------|
| 内容結合 | 他モジュールの内部を直接変更 | 最悪 |
| 共通結合 | グローバル変数を共有 | 悪い |
| 外部結合 | 外部の形式・プロトコルを共有 | やや悪い |
| 制御結合 | フラグで相手の処理を制御 | 普通 |
| スタンプ結合 | 構造体・オブジェクト全体を渡す | やや良い |
| データ結合 | 必要なデータのみ引数で渡す | 良い |
| メッセージ結合 | パラメータなしのメッセージのみ | 最良 |

```python title="低凝集・強結合の例"
# グローバル変数（共通結合）
user_data = {}

class Utils:
    # 無関係な機能の寄せ集め（偶発的凝集）
    def send_email(self, to, msg):
        ...
    def parse_csv(self, path):
        ...
    def calculate_tax(self, amount):
        ...
    def resize_image(self, img):
        ...
```

```python title="高凝集・疎結合の例"
class EmailService:
    """メール送信に関連する処理のみを担当（機能的凝集）"""
    def send(self, to: str, subject: str, body: str) -> None:
        ...

class TaxCalculator:
    """税額計算のみを担当（機能的凝集）"""
    TAX_RATE = 0.1

    def calculate(self, amount: float) -> float:
        return amount * self.TAX_RATE

class OrderService:
    """EmailService の内部実装を知らず、抽象に依存（データ結合）"""
    def __init__(self, email: EmailService, tax: TaxCalculator):
        self._email = email
        self._tax = tax

    def place_order(self, user_email: str, amount: float) -> None:
        tax = self._tax.calculate(amount)
        self._email.send(user_email, "注文確認", f"税込 {amount + tax} 円")
```

## 使用場面

- クラス・モジュールの設計レビューでの評価軸として
- リファクタリングの優先順位付け（低凝集・強結合の箇所を優先）
- マイクロサービスの分割基準を検討するとき

## 参考文献

- W. Stevens, G. Myers, L. Constantine, "Structured Design", IBM Systems Journal, 1974
- Martin Fowler, *Refactoring: Improving the Design of Existing Code*, Addison-Wesley, 2018

<AffiliateBanner site="software_navi" />
