import AffiliateBanner from '@site/src/components/AffiliateBanner';

# XML External Entity（XXE）インジェクション

## XXE インジェクションとは

> XXE（XML External Entity）インジェクションは、XML パーサーの外部エンティティ参照機能が有効になっている場合に、攻撃者が細工した XML を送り込むことで、ローカルファイルの読み取り・SSRF・DoS などを引き起こす脆弱性である。

XML には DTD（Document Type Definition）を使って「エンティティ」を定義する仕組みがある。`SYSTEM` キーワードを使うと外部リソース（ファイルやURL）の内容をエンティティとして参照できる。この機能をデフォルトで有効にしている XML パーサーに悪意のある XML を送り込むと、本来アクセスできないはずのリソースにアクセスされてしまう。

**典型的な攻撃シナリオ：**
1. ファイル読み取り：`SYSTEM "file:///etc/passwd"` で OS のファイルを読み取り
2. SSRF：`SYSTEM "http://169.254.169.254/"` で内部サービスにリクエスト
3. Billion Laughs（XML Bomb）：指数的に展開するエンティティで DoS を引き起こす

**XXE が発生しやすい場所：**
- XML ファイルのアップロード・インポート機能
- SOAP Web サービス（SOAP は XML ベース）
- SVG・DOCX・XLSX などのアップロード（内部構造が XML）
- RSS/Atom フィードのパース

**防御の第一原則：外部エンティティを無効化する**
ほぼすべての XML パーサーは設定で外部エンティティ参照を無効化できる。デフォルトで無効化しているパーサーも増えているが、設定を明示的に確認することが重要である。

## XXE のペイロード例と防御手段

| 攻撃種別 | DTD の内容 | 目的 |
|---------|-----------|------|
| ファイル読み取り | `SYSTEM "file:///etc/passwd"` | ローカルファイルの窃取 |
| SSRF | `SYSTEM "http://internal-server/"` | 内部ネットワーク調査 |
| Blind XXE | 外部 DTD を参照させて帯域外で情報取得 | フィルタリング迂回 |
| XML Bomb | `&lol9;` が指数展開 | サービス拒否（DoS）|

```python
# pip install lxml defusedxml
import defusedxml.ElementTree as safe_et
import xml.etree.ElementTree as unsafe_et
from lxml import etree

# === 脆弱なコード例（絶対に使わない）===
def vulnerable_parse(xml_string: str):
    """【悪い例】デフォルト設定の lxml は外部エンティティを解決する場合がある"""
    # lxml のデフォルトパーサーは resolve_entities=True
    # 以下は外部エンティティが処理される可能性がある
    # tree = etree.fromstring(xml_string)  # 危険
    pass

# === 防御策1: defusedxml を使用（Python の推奨手法）===
def safe_parse_with_defusedxml(xml_string: str):
    """
    【良い例】defusedxml は XXE・Billion Laughs などの XML 攻撃をすべてブロックする
    Python で XML をパースする場合は defusedxml を使うのが最もシンプルで確実
    """
    try:
        # defusedxml は外部エンティティ・DTD・Billion Laughs を自動的にブロックする
        root = safe_et.fromstring(xml_string)
        return root
    except defusedxml.DTDForbidden:
        raise ValueError("DTD は禁止されています")
    except defusedxml.EntitiesForbidden:
        raise ValueError("外部エンティティは禁止されています")

# === 防御策2: lxml で明示的に外部エンティティを無効化 ===
def safe_parse_with_lxml(xml_string: str):
    """【良い例】lxml でセキュアなパーサーを作成する"""
    parser = etree.XMLParser(
        resolve_entities=False,   # 外部エンティティの解決を無効化
        no_network=True,          # ネットワークアクセスを禁止
        load_dtd=False,           # DTD のロードを禁止
    )
    return etree.fromstring(xml_string.encode(), parser=parser)

# 攻撃ペイロードの例（教育目的）
xxe_payload = """<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<root><data>&xxe;</data></root>"""

# 安全なパースのテスト
try:
    result = safe_parse_with_defusedxml(xxe_payload)
    print(f"パース結果: {result}")
except Exception as e:
    print(f"XXE ブロック成功: {type(e).__name__}: {e}")

# lxml によるセキュアなパース
try:
    result = safe_parse_with_lxml(xxe_payload)
    print(f"lxml パース結果: {result}")
except Exception as e:
    print(f"lxml XXE ブロック: {type(e).__name__}: {e}")

print("""
防御チェックリスト:
1. Python: defusedxml を使用する
2. Java: XMLInputFactory の IS_SUPPORTING_EXTERNAL_ENTITIES を false に設定
3. PHP: libxml_disable_entity_loader(true) を呼び出す
4. .NET: XmlReaderSettings で DtdProcessing = Prohibit に設定
5. XML が不要であれば JSON など代替フォーマットへ移行を検討する
""")
```

## 使用場面

- XML を受け付けるすべての API・ファイルアップロード機能のセキュリティ設定確認
- SOAP ベースのレガシー Web サービスのセキュリティ強化
- SVG・Office ファイル（DOCX・XLSX）のアップロード機能の実装
- 依存ライブラリの XML パーサーの設定確認（サプライチェーンの観点）

## 参考文献

- [OWASP - XXE Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html)
- [defusedxml - Python ライブラリ](https://pypi.org/project/defusedxml/)
- [PortSwigger - XXE インジェクション](https://portswigger.net/web-security/xxe)
- [CWE-611: Improper Restriction of XML External Entity Reference](https://cwe.mitre.org/data/definitions/611.html)

<AffiliateBanner site="security_navi" />
