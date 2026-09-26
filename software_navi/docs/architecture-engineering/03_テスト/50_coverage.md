import AffiliateBanner from '@site/src/components/AffiliateBanner';

# テストカバレッジの考え方

## テストカバレッジとは

> テストによってソースコードのどれだけの割合が実行されたかを示す指標。ラインカバレッジ・ブランチカバレッジ・ミューテーションカバレッジなど複数の種類がある。

テストカバレッジは「テストの量」を測定する指標ですが、「テストの質」は測定しません。カバレッジ100%でも `assert True` のような意味のないアサーションを書けば達成できてしまいます。

カバレッジが有用なのは「テストされていない箇所を発見する」ためです。低いカバレッジは問題の兆候ですが、高いカバレッジが品質を保証するわけではありません。

現場でよく使われる目安は「ラインカバレッジ80%」ですが、重要なビジネスロジックは90〜100%を目指し、設定ファイルや生成コードは対象外にするという判断が現実的です。ミューテーションテストを使うとテストの「実効性」を評価できます。

## カバレッジの種類

| 種類 | 説明 | ツール |
|------|------|-------|
| Line Coverage | 実行された行数の割合 | coverage.py, Jest, Istanbul |
| Branch Coverage | 分岐（if/else）の全パスを網羅した割合 | coverage.py --branch, Jest |
| Function Coverage | 呼び出された関数の割合 | Jest |
| Statement Coverage | 実行されたステートメントの割合 | 多くのツール |
| Mutation Coverage | テストが変異コードを検出できる割合 | mutmut, Stryker |

```python title="カバレッジ測定とミューテーションテスト（Python）"
# === プロダクションコード: discount.py ===
def calculate_discount(price: float, tier: str) -> float:
    """顧客ティアに応じた割引後価格を返す"""
    if tier == "gold":
        return price * 0.8    # 20% OFF
    elif tier == "silver":
        return price * 0.9    # 10% OFF
    else:
        return price          # 割引なし


# === テストコード: test_discount.py ===
import pytest

# ラインカバレッジ100%だが、ブランチを網羅していない例
def test_gold_discount():
    assert calculate_discount(1000, "gold") == 800.0

def test_silver_discount():
    assert calculate_discount(1000, "silver") == 900.0

def test_no_discount():
    assert calculate_discount(1000, "standard") == 1000.0


# ブランチカバレッジを高めるための境界値テスト
def test_discount_with_zero_price():
    assert calculate_discount(0, "gold") == 0.0

def test_discount_with_large_price():
    assert calculate_discount(1_000_000, "gold") == 800_000.0


# カバレッジ測定コマンド:
# pytest --cov=discount --cov-report=html --cov-branch
# mutmut run --paths-to-mutate discount.py
# mutmut results
```

```typescript title="Jestのカバレッジ設定（TypeScript）"
// jest.config.ts
export default {
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches:  80,
      functions: 80,
      lines:     80,
      statements: 80,
    },
    // 重要なビジネスロジックは高い基準を設定
    "./src/domain/**/*.ts": {
      branches:  90,
      functions: 95,
      lines:     95,
      statements: 95,
    },
  },
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/generated/",  // 自動生成コードは除外
    "*.config.ts",
  ],
};

// カバレッジ率だけでなく、ミューテーションテストも実施
// npx stryker run
// stryker.config.json:
// { "mutationScore": 75 }  // 75% のミュータントを検出できれば合格
```

## カバレッジの適切な使い方

1. カバレッジは「テストの抜け漏れ発見ツール」として使う
2. 数値目標はチームで合意した上で設定する（一般的に80%ラインが多い）
3. 重要ロジックと生成コード・設定ファイルで基準を分ける
4. ミューテーションテストを組み合わせてテストの実効性を確認する

## 使用場面

- CIパイプラインでカバレッジ閾値を下回ったらビルドを失敗させる
- レビュー時に新規追加コードのカバレッジを確認する
- リファクタリング前にカバレッジを高めて安全網を作る

## 参考文献

- Martin Fowler, *TestCoverage*, https://martinfowler.com/bliki/TestCoverage.html
- Pieter Hintjens, *Mutation Testing*, https://stryker-mutator.io/docs/

<AffiliateBanner site="software_navi" />
