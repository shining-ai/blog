import AffiliateBanner from '@site/src/components/AffiliateBanner';

# SQL インジェクション（防御方法中心）

## SQL インジェクションとは

> SQL インジェクションは、ユーザーが入力した文字列が SQL クエリとして解釈されることで、攻撃者が意図しないクエリを実行し、データの窃取・改ざん・削除やデータベースサーバの乗っ取りを引き起こす脆弱性である。

SQL インジェクションは OWASP Top 10 の常連であり、非常に広く知られているにもかかわらず、今日でも多数の Web アプリケーションで発見される。攻撃者は入力フォームや URL パラメータに SQL の制御文字（`'`・`--`・`;` など）を含めることで、クエリの構造を書き換える。

**攻撃の影響：**
- **認証バイパス**：ログイン処理でパスワードチェックを無効化
- **データ窃取**：UNION ベースや Blind SQL インジェクションで全テーブルを読み取る
- **データ改ざん・削除**：UPDATE / DELETE / DROP の実行
- **OS コマンド実行**：`xp_cmdshell`（SQL Server）などを通じた RCE

**根本原因：**
SQL の「データ」と「コード」を混在させてしまうことが根本原因である。文字列連結でクエリを組み立てると、入力値に SQL の構文要素が含まれた場合にコードとして解釈されてしまう。

**防御の第一原則：プリペアドステートメント**
パラメータ化クエリを使うと、SQL の構造がコンパイル済みになり、後から渡されるデータは絶対にコードとして解釈されない。

## SQL インジェクションの種類

| 種類 | 特徴 | 攻撃例 |
|------|------|--------|
| クラシック（エラーベース）| エラーメッセージで情報収集 | `' OR 1=1 --` |
| UNION ベース | UNION 句で他テーブルを読み取り | `' UNION SELECT user,password FROM users--` |
| Blind（Boolean）| 真偽で1ビットずつ情報を取得 | `' AND SUBSTRING(password,1,1)='a'--` |
| Time ベース | 応答時間の差で情報を取得 | `'; WAITFOR DELAY '0:0:5'--` |
| Out-of-Band | DNS・HTTP で外部にデータを送出 | `xp_dirtree` による SMB リクエスト |

```python
import sqlite3
import re

# === 脆弱なコード例（絶対に使わない）===
def vulnerable_login(username: str, password: str, conn: sqlite3.Connection):
    """【悪い例】文字列連結でクエリを組み立てる"""
    # 攻撃例: username = "' OR '1'='1" でパスワードチェックが無効化される
    query = f"SELECT * FROM users WHERE username='{username}' AND password='{password}'"
    cursor = conn.execute(query)
    return cursor.fetchone()

# === 防御策1: プリペアドステートメント（パラメータ化クエリ）===
def secure_login(username: str, password: str, conn: sqlite3.Connection):
    """【良い例】プリペアドステートメントを使う"""
    # ? プレースホルダを使うと、データは絶対にコードとして解釈されない
    query = "SELECT id, username FROM users WHERE username = ? AND password_hash = ?"
    cursor = conn.execute(query, (username, hash_password(password)))
    return cursor.fetchone()

# === 防御策2: ORM を使用した安全なクエリ（SQLAlchemy の例）===
sqlalchemy_example = """
from sqlalchemy.orm import Session
from models import User

# 【良い例】ORM はデフォルトでパラメータ化クエリを使用する
def get_user(session: Session, username: str):
    return session.query(User).filter(User.username == username).first()

# 【悪い例】ORM でも生 SQL を書く場合は text() を使い bind パラメータを使う
from sqlalchemy import text
def raw_query_safe(session: Session, user_id: int):
    return session.execute(
        text("SELECT * FROM users WHERE id = :user_id"),
        {"user_id": user_id}  # パラメータバインド
    ).fetchone()
"""

# === 防御策3: 入力値の型・形式の検証（補助的な対策）===
def validate_username(username: str) -> bool:
    """ユーザー名は英数字とアンダースコアのみ許可"""
    return bool(re.match(r'^[a-zA-Z0-9_]{3,50}$', username))

# === 防御策4: 最小権限の DB アカウント ===
db_permission_policy = """
# 最小権限の原則: アプリが使う DB アカウントは必要最小限の権限のみ付与
# CREATE USER 'webapp'@'localhost' IDENTIFIED BY '...';
# GRANT SELECT, INSERT, UPDATE ON mydb.* TO 'webapp'@'localhost';
# 管理者権限（DROP, CREATE, ALTER）は付与しない
"""

def hash_password(password: str) -> str:
    """実際は argon2/bcrypt を使用すること"""
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()

print("プリペアドステートメントの使用が SQL インジェクションの根本対策です")
print(f"ユーザー名検証: admin → {validate_username('admin')}")
print(f"ユーザー名検証: '; DROP TABLE users;-- → {validate_username(\"'; DROP TABLE users;--\")}")
```

## 使用場面

- ユーザー入力を含むすべての DB クエリの実装時
- ログイン・検索・フィルタリングなど動的クエリが発生する機能のセキュリティレビュー
- 既存コードの脆弱性診断（SAST ツールによる文字列連結クエリの検出）
- WAF（Web Application Firewall）のルール設計

## 参考文献

- [OWASP - SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [CWE-89: Improper Neutralization of Special Elements used in an SQL Command](https://cwe.mitre.org/data/definitions/89.html)
- [OWASP - Testing for SQL Injection](https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05-Testing_for_SQL_Injection)

<AffiliateBanner site="security_navi" />
