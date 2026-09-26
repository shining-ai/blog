import AffiliateBanner from '@site/src/components/AffiliateBanner';

# プロパティベーステスト

## プロパティベーステストとは

> 特定の入力例ではなく「すべての入力に成り立つべき性質（プロパティ）」を定義し、フレームワークがランダムな入力を大量生成して検証するテスト手法。

プロパティベーステスト（Property-Based Testing, PBT）は 1999 年に Haskell の QuickCheck として登場しました。従来の「例ベーステスト」では開発者が思いつかない境界値・エッジケースを見落とすことがあります。PBT では「どんな入力に対してもこの性質が成り立つ」というプロパティを宣言すると、ツールが数百〜数千件のランダム入力を自動生成して検証します。

テストに失敗すると、ツールは「最小反例（shrinking）」を探します。失敗する最も単純な入力を自動的に絞り込んでくれるため、バグの原因特定が容易です。

例ベーステストとPBTは競合するものではなく、補完し合います。重要なビジネスロジックは両方で検証するのがベストプラクティスです。

## 例ベーステスト vs プロパティベーステスト

| 観点 | 例ベーステスト | プロパティベーステスト |
|------|-------------|-------------------|
| 入力 | 開発者が手動で用意 | フレームワークが自動生成 |
| エッジケース発見 | 思いついた場合のみ | ランダムに大量探索 |
| テスト数 | 少ない（数件〜数十件） | 多い（数百〜数千件） |
| 仕様の記述 | 具体例 | 普遍的な性質 |
| デバッグ | 失敗原因が直接わかる | Shrinkingで最小例を特定 |

```python title="プロパティベーステスト — Hypothesis（Python）"
from hypothesis import given, strategies as st, assume
import hypothesis.strategies as st

# ===== テスト対象 =====
def encode(text: str) -> bytes:
    return text.encode("utf-8")

def decode(data: bytes) -> str:
    return data.decode("utf-8")

def sort_and_unique(lst: list[int]) -> list[int]:
    return sorted(set(lst))


# ===== プロパティ定義 =====
@given(st.text())
def test_encode_decode_roundtrip(text: str):
    """エンコードしてデコードすると元の文字列に戻る"""
    assert decode(encode(text)) == text


@given(st.lists(st.integers()))
def test_sort_unique_is_sorted(lst: list[int]):
    """結果は常にソート済みである"""
    result = sort_and_unique(lst)
    assert result == sorted(result)

@given(st.lists(st.integers()))
def test_sort_unique_has_no_duplicates(lst: list[int]):
    """結果に重複はない"""
    result = sort_and_unique(lst)
    assert len(result) == len(set(result))

@given(st.lists(st.integers()))
def test_sort_unique_preserves_elements(lst: list[int]):
    """元のリストのすべての要素が結果に含まれる"""
    result = sort_and_unique(lst)
    assert set(lst) == set(result)


# ===== 数値演算のプロパティ =====
@given(st.floats(min_value=0, max_value=1e6), st.floats(min_value=0, max_value=1e6))
def test_addition_is_commutative(a: float, b: float):
    """加算は交換法則を満たす"""
    assert abs((a + b) - (b + a)) < 1e-9


# ===== ビジネスロジックのプロパティ =====
@given(
    st.integers(min_value=1, max_value=1_000_000),
    st.floats(min_value=0.0, max_value=0.5),
)
def test_discount_never_exceeds_original(price: int, rate: float):
    """割引後の価格は元の価格を超えない"""
    discounted = price * (1 - rate)
    assert discounted <= price
```

```typescript title="プロパティベーステスト — fast-check（TypeScript）"
import * as fc from "fast-check";

// エンコード・デコードの往復性
test("JSON stringify/parse roundtrip for objects", () => {
  fc.assert(
    fc.property(
      fc.record({
        id: fc.integer(),
        name: fc.string(),
        active: fc.boolean(),
      }),
      (obj) => {
        expect(JSON.parse(JSON.stringify(obj))).toEqual(obj);
      },
    ),
  );
});

// リスト操作のプロパティ
test("reverse twice returns original array", () => {
  fc.assert(
    fc.property(fc.array(fc.integer()), (arr) => {
      expect([...arr].reverse().reverse()).toEqual(arr);
    }),
  );
});
```

## 使用場面

- エンコード・デコードや圧縮・解凍など「往復性（roundtrip）」を持つ処理の検証
- ソート・フィルタ・集計などアルゴリズムの数学的性質の検証
- 大量のランダム入力でクラッシュやパニックを発見したいとき

## 参考文献

- Koen Claessen & John Hughes, *QuickCheck: A Lightweight Tool for Random Testing of Haskell Programs*, ICFP, 2000
- Hypothesis 公式ドキュメント, https://hypothesis.readthedocs.io/
- fast-check 公式ドキュメント, https://fast-check.dev/

<AffiliateBanner site="software_navi" />
