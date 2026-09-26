import AffiliateBanner from '@site/src/components/AffiliateBanner';

# パストラバーサル

## パストラバーサルとは

> パストラバーサル（Path Traversal / Directory Traversal）は、ユーザーが指定したファイル名やパスに `../` などのディレクトリ移動シーケンスを含めることで、アプリケーションが想定するディレクトリ外のファイルにアクセスできてしまう脆弱性である。

Web サーバやアプリケーションがユーザー入力をファイルパスに使用する際、`../`（親ディレクトリへの移動）を適切に処理しないと、本来アクセスを許可していないシステムファイルや設定ファイルを読み取られてしまう。

**典型的な攻撃シナリオ：**
- `https://example.com/download?file=../../etc/passwd`
- `https://example.com/view?page=../../../../windows/win.ini`
- アップロードされたファイル名に `../` を含め、意図しない場所に保存させる

**エンコーディングによる迂回：**
単純な `../` のフィルタリングは以下のように迂回されることが多い。
- URL エンコード：`%2e%2e%2f` = `../`
- ダブルエンコード：`%252e%252e%252f`
- Unicode / UTF-8 のバリエーション：`..%c0%af`、`..%u2215`
- バックスラッシュ（Windows）：`..\`

**防御の第一原則：正規化後にベースディレクトリとの照合**
入力パスを正規化（realpath / resolve）してからベースディレクトリで始まるかを確認する。文字列レベルのフィルタリングでは迂回される可能性が高い。

## パストラバーサル対策の比較

| 対策 | 内容 | 効果 |
|------|------|------|
| realpath で正規化して検証 | シンボリックリンク展開後のパスを確認 | 最も高い |
| ファイル名のみ許可（パス区切りを禁止）| `/` や `\` を含む入力を拒否 | 高い |
| 許可リストによる制限 | 特定のファイル名のみ許可 | 高い |
| chroot / コンテナ | アプリのルートを隔離 | 高い（多層防御） |
| `../` の文字列フィルタ | `../` を削除・拒否 | 低い（迂回されやすい）|

```python
import os
import re
from pathlib import Path

BASE_DIR = Path("/var/www/html/uploads").resolve()

# === 脆弱なコード例（絶対に使わない）===
def vulnerable_file_read(filename: str) -> bytes:
    """【悪い例】入力をそのままパスに使用"""
    path = f"/var/www/html/uploads/{filename}"
    with open(path, "rb") as f:
        return f.read()
    # 攻撃例: filename = "../../etc/passwd" → /etc/passwd が読み取られる

# === 防御策1: realpath による厳格な検証（推奨）===
def safe_file_read(filename: str) -> bytes:
    """
    【良い例】正規化後にベースディレクトリとの前方一致を確認
    Path.resolve() はシンボリックリンクを展開し、.. を解決する
    """
    # ファイル名にパス区切り文字が含まれないよう事前チェック
    if "/" in filename or "\\" in filename:
        raise ValueError("ファイル名にパス区切り文字は使用できません")

    # フルパスを構築して正規化
    requested_path = (BASE_DIR / filename).resolve()

    # 正規化後のパスがベースディレクトリ内にあることを確認
    try:
        requested_path.relative_to(BASE_DIR)
    except ValueError:
        raise PermissionError(f"アクセス禁止: ベースディレクトリ外のパス: {requested_path}")

    if not requested_path.exists():
        raise FileNotFoundError(f"ファイルが存在しません: {filename}")

    with open(requested_path, "rb") as f:
        return f.read()

# === 防御策2: 許可リストによるファイル名の検証 ===
def validate_filename(filename: str) -> bool:
    """
    英数字・ハイフン・アンダースコア・ドットのみ許可
    パス区切り文字・制御文字・エンコードされた文字を拒否
    """
    # 拡張子を含む安全なファイル名のパターン
    return bool(re.match(r'^[a-zA-Z0-9_\-]+\.[a-zA-Z0-9]{1,10}$', filename))

# テスト
test_inputs = [
    "report.pdf",           # 正常
    "../../etc/passwd",     # パストラバーサル
    "%2e%2e%2fetc%2fpasswd", # URLエンコード（検証でブロック）
    "file\x00.txt",         # NULL バイトインジェクション
    "../secret.txt",        # 親ディレクトリ
]

for inp in test_inputs:
    valid = validate_filename(inp)
    status = "OK" if valid else "NG"
    print(f"[{status}] ファイル名検証: {repr(inp)}")

print("""
アップロード処理での追加対策:
1. ファイル名は乱数で生成し直す（例: UUID + 元の拡張子）
2. アップロード先は Web ルート外のディレクトリに設定する
3. 実行権限のないディレクトリにアップロードする
4. ファイルの MIME タイプと内容を検証する
""")
```

## 使用場面

- ファイルダウンロード・プレビュー機能の実装時
- ファイルアップロード先のパス構築とファイル名のサニタイズ
- テンプレートエンジンのテンプレートファイル選択機能の実装
- インクルードファイルや設定ファイルをパラメータで指定できる機能のセキュリティレビュー

## 参考文献

- [OWASP - Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
- [OWASP - File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [PortSwigger - Directory Traversal](https://portswigger.net/web-security/file-path-traversal)
- [CWE-22: Improper Limitation of a Pathname to a Restricted Directory](https://cwe.mitre.org/data/definitions/22.html)

<AffiliateBanner site="security_navi" />
