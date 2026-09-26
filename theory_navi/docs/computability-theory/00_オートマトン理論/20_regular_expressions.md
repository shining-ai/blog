import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 正規表現と正規言語

## 正規表現と正規言語とは

> 正規表現（Regular Expression）とは、有限オートマトンが認識できる言語クラス「正規言語」を代数的・簡潔に記述するための表記法であり、基本記号・結合・和集合・クリーネ閉包の3つの演算で帰納的に定義される。

正規言語（Regular Language）は形式言語の階層（チョムスキー階層）の中で最も制限の強いクラスです。正規表現は以下の規則で帰納的に定義されます。基底ケースとして、空文字列 ε、空言語 ∅、アルファベットの各記号 a ∈ Σ は正規表現です。帰納ステップとして、r と s が正規表現なら、(r)(s)（連接）、(r)|(s)（和集合・選択）、(r)*（クリーネ閉包、0回以上の繰り返し）も正規表現です。

クリーニの定理により、正規表現・DFA・NFA はすべて同じ言語クラス（正規言語）を定義します。正規言語は有限言語の和・連接・クリーネ閉包の組み合わせで表現できます。

正規言語の重要な閉包性として、正規言語の和集合・積集合・補集合・連接・クリーネ閉包・逆転はすべて正規言語となります。プログラミング言語で使われる正規表現（+, ?, [a-z], \d など）は理論的な正規表現を拡張したものですが、認識できる言語クラスは同じです。

## 正規表現の演算

| 演算 | 記法 | 意味 | 例 |
|------|------|------|-----|
| 連接 | rs | r の後に s | ab → "ab" |
| 和集合 | r\|s | r または s | a\|b → "a" or "b" |
| クリーネ閉包 | r* | r の 0 回以上の繰り返し | a* → "", "a", "aa", ... |
| プラス閉包 | r+ | r の 1 回以上の繰り返し | a+ → "a", "aa", ... |
| オプション | r? | r の 0 回または 1 回 | ab? → "a" or "ab" |

```python
import re

# 正規表現の基本演算を Python で実証
examples = [
    # (パターン, テスト文字列のリスト, 説明)
    (r'^(a|b)*$',      ['', 'a', 'ab', 'ba', 'aabb', 'abc'], "a か b のみ"),
    (r'^a*b+$',        ['b', 'ab', 'aab', '', 'ba', 'bb'],   "a* の後に b+"),
    (r'^\d{3}-\d{4}$', ['123-4567', '12-345', 'abc-defg'],   "電話番号形式"),
]

for pattern, tests, desc in examples:
    print(f"\n正規表現: {pattern}  ({desc})")
    for s in tests:
        matched = bool(re.fullmatch(pattern, s))
        print(f"  '{s}' -> {'受理' if matched else '拒否'}")

# Thompson の構成法: 正規表現 (a|b)*abb の NFA を手動シミュレート
# これは "abb" で終わるすべての文字列を認識する

def match_ends_with_abb(s):
    """(a|b)*abb にマッチするか"""
    return bool(re.search(r'abb$', s))

test_strings = ['abb', 'aabb', 'babb', 'ab', 'bb', 'abba']
print("\n(a|b)*abb のマッチング:")
for s in test_strings:
    print(f"  '{s}' -> {'受理' if match_ends_with_abb(s) else '拒否'}")
```

## 使用場面

- **テキスト検索・置換**: エディタや grep で正規表現パターンを使いファイル内の文字列を検索する
- **入力バリデーション**: メールアドレス・電話番号・郵便番号などのフォーマット検証に使用する
- **字句解析**: コンパイラのレキサーでキーワード・識別子・リテラルを正規表現で定義する
- **ログ解析**: サーバーログからエラーパターンや特定イベントを抽出する

## 参考文献

- Sipser, M. "Introduction to the Theory of Computation" (Cengage Learning)
- Thompson, K. "Regular Expression Search Algorithm" (CACM, 1968)
- 富田悦次・横森貴「オートマトン・言語理論」(森北出版)

<AffiliateBanner site="theory_navi" />
