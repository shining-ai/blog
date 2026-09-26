import AffiliateBanner from '@site/src/components/AffiliateBanner';

# テストの種類（ユニット・統合・E2E）

## テストの種類とは

> ソフトウェアテストはスコープ・速度・信頼性のトレードオフによって「ユニットテスト」「統合テスト」「E2Eテスト」に分類される。

テスト戦略の出発点は、どの種類のテストをどのような割合で持つかを決めることです。Mike Cohn が提唱した「テストピラミッド」では、底辺にユニットテスト、中段に統合テスト、頂点にE2Eテストを置き、底辺ほど数が多くあるべきとされています。

ユニットテストは最小単位（関数・クラス）を高速かつ大量に実行できます。統合テストはDB・外部APIなど実際の依存関係を交えて複数コンポーネントの協調を検証します。E2EテストはブラウザやAPIクライアントを使ってシステム全体を外部視点で検証しますが、実行が遅くメンテナンスコストが高くなりがちです。

理想の比率としてよく言われるのは「ユニット70%・統合20%・E2E10%」ですが、これはあくまで目安です。バックエンドAPIではE2Eの代わりに統合テストを厚くする戦略も有効です。

## テストの種類比較

| 種類 | スコープ | 速度 | 実行コスト | 主な検証内容 |
|------|---------|------|-----------|------------|
| ユニットテスト | 関数・クラス単体 | 高速（ms） | 低い | ロジック・アルゴリズム |
| 統合テスト | 複数コンポーネント | 中速（秒） | 中程度 | DB操作・サービス間連携 |
| E2Eテスト | システム全体 | 低速（分） | 高い | ユーザーシナリオ全体 |

```python title="ユニット・統合・E2Eテストの例（Python / pytest）"
import pytest

# ===== ユニットテスト: 関数単体の検証 =====
def calculate_discount(price: float, rate: float) -> float:
    if not 0 <= rate <= 1:
        raise ValueError("Rate must be between 0 and 1")
    return price * (1 - rate)

def test_calculate_discount_normal():
    assert calculate_discount(1000, 0.1) == pytest.approx(900.0)

def test_calculate_discount_zero():
    assert calculate_discount(1000, 0) == 1000.0

def test_calculate_discount_invalid_rate():
    with pytest.raises(ValueError):
        calculate_discount(1000, 1.5)


# ===== 統合テスト: DB操作を含む検証 =====
# pytest-fixtures で一時DBを用意し、リポジトリとDBの連携を確認
class InMemoryUserRepo:
    def __init__(self): self._store = {}
    def save(self, user_id, name): self._store[user_id] = name
    def find(self, user_id): return self._store.get(user_id)

def test_user_repository_save_and_find():
    repo = InMemoryUserRepo()
    repo.save("U1", "Alice")
    assert repo.find("U1") == "Alice"
    assert repo.find("U99") is None


# ===== E2Eテスト: APIエンドポイントを外部から検証 =====
# 実際には httpx や Playwright などを使用
def test_health_check_endpoint(test_client):
    response = test_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

```typescript title="テストピラミッドの構成例（TypeScript / Jest）"
// ユニットテスト: 純粋関数の検証
function formatCurrency(amount: number, currency = "JPY"): string {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency }).format(amount);
}

test("formatCurrency formats JPY correctly", () => {
  expect(formatCurrency(1500)).toBe("￥1,500");
});

// 統合テスト: サービスとリポジトリの連携
test("UserService.register saves user and returns it", async () => {
  const repo    = new InMemoryUserRepository();
  const service = new UserService(repo);
  const user    = await service.register({ name: "Bob", email: "bob@example.com" });
  expect(user.id).toBeDefined();
  expect(await repo.findById(user.id)).toEqual(user);
});
```

## 使用場面

- 新機能開発時は先にユニットテストを書いてロジックを固める
- DBスキーマ変更後は統合テストでクエリの正確性を確認する
- リリース前にE2Eテストでクリティカルなユーザーシナリオを自動検証する

## 参考文献

- Mike Cohn, *Succeeding with Agile*, Addison-Wesley, 2009
- Martin Fowler, *TestPyramid*, https://martinfowler.com/bliki/TestPyramid.html

<AffiliateBanner site="software_navi" />
