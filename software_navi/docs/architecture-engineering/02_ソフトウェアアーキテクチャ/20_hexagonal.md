import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ヘキサゴナルアーキテクチャ（ポート＆アダプタ）

## ヘキサゴナルアーキテクチャとは

> アプリケーションのコアロジックを外部世界から隔離し、ポート（インタフェース）とアダプタ（実装）を通じてのみ外部と通信させるアーキテクチャ。

ヘキサゴナルアーキテクチャ（Hexagonal Architecture）は Alistair Cockburn が 2005 年に提唱しました。別名「ポート＆アダプタ（Ports and Adapters）」とも呼ばれます。アプリケーションを六角形の内側（コアドメイン）と外側（外部）に分け、境界を「ポート」と「アダプタ」で接続します。

ポート はドメインが定義するインタフェースです。「どんなデータが必要か」「どんな操作をするか」だけを宣言します。アダプタ はポートの具体的な実装で、DB・HTTP・メッセージキューなど外部技術ごとに用意します。

クリーンアーキテクチャと目的・効果は非常に近く、現代のプロジェクトでは両者は混同されることもあります。違いは「外側をどう分類するか」という表現方法の差が主です。

## ポートとアダプタの種類

| 種類 | 方向 | 例 |
|------|------|-----|
| Driving Port（Primary）| 外 → 内 | REST API、CLI、テストコード |
| Driven Port（Secondary）| 内 → 外 | リポジトリIF、メール送信IF、メッセージIF |
| Driving Adapter | 外 → 内 | HTTPコントローラ、CLIパーサ |
| Driven Adapter | 内 → 外 | JPA実装、SendGrid実装、RabbitMQ実装 |

```python title="ヘキサゴナルアーキテクチャ — 在庫確認（Python）"
from abc import ABC, abstractmethod
from dataclasses import dataclass

# ===== Core Domain =====
@dataclass
class Product:
    product_id: str
    name: str
    stock: int


# Driven Port（Secondary Port）
class ProductRepository(ABC):
    @abstractmethod
    def find_by_id(self, product_id: str) -> Product | None: ...


# Application Service（Use Case）
class CheckStockUseCase:
    def __init__(self, repo: ProductRepository):
        self._repo = repo

    def check(self, product_id: str) -> dict:
        product = self._repo.find_by_id(product_id)
        if not product:
            return {"available": False, "reason": "not found"}
        return {"available": product.stock > 0, "stock": product.stock}


# ===== Driven Adapter（Infrastructure）=====
class InMemoryProductRepository(ProductRepository):
    def __init__(self):
        self._data = {
            "P001": Product("P001", "Widget", 42),
            "P002": Product("P002", "Gadget", 0),
        }

    def find_by_id(self, product_id: str) -> Product | None:
        return self._data.get(product_id)


# ===== Driving Adapter（HTTP Controller）=====
class ProductController:
    def __init__(self, use_case: CheckStockUseCase):
        self._use_case = use_case

    def get_stock(self, product_id: str) -> dict:
        return self._use_case.check(product_id)


# Composition Root
repo       = InMemoryProductRepository()
use_case   = CheckStockUseCase(repo)
controller = ProductController(use_case)

print(controller.get_stock("P001"))  # {'available': True, 'stock': 42}
print(controller.get_stock("P002"))  # {'available': False, 'stock': 0}


# ===== テスト用アダプタ（Driving Port）=====
def test_check_stock():
    repo = InMemoryProductRepository()
    result = CheckStockUseCase(repo).check("P001")
    assert result["available"] is True
    assert result["stock"] == 42
```

## 使用場面

- 外部サービス（DB・API）をテスト時にモックに差し替えたいとき
- 将来的にDBや通信プロトコルを変える可能性があるシステム
- 複数の入力チャネル（REST・CLI・キュー）を同じドメインロジックで処理したいとき

## 参考文献

- Alistair Cockburn, *Hexagonal Architecture*, 2005, https://alistair.cockburn.us/hexagonal-architecture/

<AffiliateBanner site="software_navi" />
