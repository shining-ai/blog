import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 安全でない逆シリアル化

## 安全でない逆シリアル化とは

> 安全でない逆シリアル化（Insecure Deserialization）は、信頼できないソースから受け取ったシリアル化データを適切な検証なしに逆シリアル化することで、攻撃者が任意のオブジェクトを生成・注入し、リモートコード実行・権限昇格・オブジェクトインジェクションを引き起こす脆弱性である。

シリアル化はオブジェクトをバイト列や文字列に変換する処理であり、逆シリアル化はその逆である。問題は、逆シリアル化の過程でクラスのコンストラクタや `__reduce__`・`readObject` などの特殊メソッドが実行されることがあり、攻撃者が「ガジェットチェーン」（既存クラスのメソッドを連鎖的に利用した攻撃コード）を組み込んだペイロードを送り込むことで任意コードを実行できる場合があることである。

**影響の大きさ：**
- Java の Apache Commons Collections や Spring Framework における RCE
- Python の `pickle` モジュールによる任意コード実行
- PHP の `unserialize()` を使ったオブジェクトインジェクション
- Ruby on Rails での逆シリアル化を通じた RCE

**発生しやすい場所：**
- セッションデータ（Cookie にシリアル化オブジェクトを保存）
- キャッシュシステム（Redis・Memcached）から読み込んだデータ
- メッセージキュー（RabbitMQ・Kafka）経由のメッセージ
- ファイルアップロードや API リクエストのボディ

## 逆シリアル化の危険なAPIと安全な代替

| 言語 | 危険なAPI | 安全な代替 |
|------|---------|-----------|
| Python | `pickle.loads()` | `json.loads()`, `msgpack` |
| Java | `ObjectInputStream.readObject()` | Jackson（JSON）, Protobuf |
| PHP | `unserialize()` | `json_decode()` |
| Ruby | `Marshal.load()` | `JSON.parse()`, `MessagePack` |
| .NET | `BinaryFormatter` | `System.Text.Json`, Protobuf |

```python
import json
import hmac
import hashlib
import base64
import secrets

# === 危険な実装（絶対に使わない）===
import pickle  # noqa: S403

def vulnerable_load_session(session_data: bytes) -> dict:
    """【悪い例】pickle は任意コードを実行できる"""
    # 攻撃者が細工した pickle バイト列を渡すと任意コードが実行される
    return pickle.loads(session_data)  # noqa: S301

# === 防御策1: JSON など安全なフォーマットを使用 ===
def safe_serialize(data: dict) -> str:
    """JSON はコードを含まないデータ形式のため安全"""
    return json.dumps(data, ensure_ascii=False)

def safe_deserialize(json_str: str, expected_keys: list[str]) -> dict:
    """JSON の逆シリアル化後にスキーマを検証する"""
    data = json.loads(json_str)
    if not isinstance(data, dict):
        raise ValueError("オブジェクト形式でなければなりません")
    # 期待するキーのみを取り出す（余分なキーを無視）
    return {k: data[k] for k in expected_keys if k in data}

# === 防御策2: HMAC 署名付きセッション（Flask style）===
SECRET_KEY = secrets.token_bytes(32)

def create_signed_session(data: dict) -> str:
    """
    セッションデータを JSON + HMAC 署名で保護
    改ざんを検知できるため、クライアント側に保存する場合に有効
    """
    payload = base64.urlsafe_b64encode(
        json.dumps(data).encode()
    ).decode()

    mac = hmac.new(SECRET_KEY, payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{mac}"

def verify_signed_session(token: str) -> dict:
    """署名を検証してからデータを取り出す"""
    parts = token.rsplit(".", 1)
    if len(parts) != 2:
        raise ValueError("不正なトークン形式")

    payload, provided_mac = parts
    expected_mac = hmac.new(SECRET_KEY, payload.encode(), hashlib.sha256).hexdigest()

    # タイミング攻撃対策
    if not hmac.compare_digest(provided_mac, expected_mac):
        raise ValueError("署名検証失敗: データが改ざんされている可能性があります")

    data = json.loads(base64.urlsafe_b64decode(payload.encode()).decode())
    return data

# 使用例
user_data = {"user_id": 42, "role": "user", "username": "alice"}

token = create_signed_session(user_data)
print(f"署名付きセッション（抜粋）: {token[:60]}...")

restored = verify_signed_session(token)
print(f"復元されたデータ: {restored}")

# 改ざん検知のテスト
tampered_token = token[:-5] + "XXXXX"
try:
    verify_signed_session(tampered_token)
except ValueError as e:
    print(f"改ざん検知: {e}")

print("""
追加の防御策:
1. pickle を使わなければならない場合は cryptography で暗号化 + 署名を行う
2. Java: SerialKiller などのホワイトリストフィルターを使用する
3. デシリアライズ処理は権限を制限したサンドボックスで実行する
4. 依存ライブラリの既知の逆シリアル化脆弱性を定期的にチェックする
""")
```

## 使用場面

- セッション管理のバックエンド（Cookie やキャッシュに保存するオブジェクトの形式選定）
- マイクロサービス間のメッセージフォーマットの設計
- レガシーシステムのシリアル化コードの安全な移行
- SAST ツールによる `pickle.loads`・`unserialize` の使用箇所の検出と修正

## 参考文献

- [OWASP - Deserialization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html)
- [Python ドキュメント - pickle のセキュリティ警告](https://docs.python.org/ja/3/library/pickle.html#pickle-security)
- [PortSwigger - Insecure deserialization](https://portswigger.net/web-security/deserialization)
- [CWE-502: Deserialization of Untrusted Data](https://cwe.mitre.org/data/definitions/502.html)

<AffiliateBanner site="security_navi" />
