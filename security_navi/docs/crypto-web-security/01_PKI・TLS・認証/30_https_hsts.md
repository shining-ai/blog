import AffiliateBanner from '@site/src/components/AffiliateBanner';

# HTTPS の仕組みと HSTS

## HTTPS の仕組みと HSTS とは

> HTTPS（HTTP over TLS）は HTTP 通信を TLS で暗号化するプロトコルであり、HSTS（HTTP Strict Transport Security）はブラウザに HTTPS 接続のみを強制するセキュリティポリシーである。

HTTP は通信内容が平文で流れるため、盗聴・改ざん・なりすましに対して無防備である。HTTPS は TLS ハンドシェイクにより**機密性**（暗号化）・**完全性**（改ざん検知）・**認証**（証明書による身元確認）の三つを同時に実現する。

**TLS ハンドシェイクの流れ（TLS 1.3）：**
1. **ClientHello**：クライアントが対応暗号スイートと乱数を送信
2. **ServerHello + 証明書**：サーバが暗号スイートを選択し、X.509 証明書を送信
3. **鍵導出**：ECDHE により双方が共有秘密を計算し、セッション鍵を導出
4. **Finished**：双方が MAC で完了メッセージを検証し、暗号通信開始

**HSTS の役割：**
ブラウザが一度 HTTPS で接続すると、サーバは `Strict-Transport-Security` ヘッダを送信する。以降ブラウザは指定期間内の HTTP アクセスを自動的に HTTPS にリダイレクトし、**SSL ストリッピング攻撃**（中間者が HTTPS を HTTP に降格させる攻撃）を防ぐ。

`includeSubDomains` でサブドメインにも適用でき、`preload` ディレクティブと HSTS Preload リストへの登録により、初回アクセス前から強制 HTTPS を適用できる。

混合コンテンツ（HTTPS ページ内の HTTP リソース）は現代ブラウザでブロックされるため、すべてのリソースを HTTPS で配信する必要がある。

## HSTS ヘッダのパラメータ

| パラメータ | 説明 | 推奨値 |
|-----------|------|--------|
| max-age | HSTS ポリシーの有効期間（秒） | 31536000（1年）|
| includeSubDomains | サブドメインにも適用 | 推奨 |
| preload | Preload リストへの登録申請 | 可能なら設定 |

```python
import ssl
import socket
import http.client

def check_https_hsts(hostname: str) -> dict:
    """HTTPS 接続と HSTS ヘッダの確認"""
    result = {
        "hostname": hostname,
        "tls_version": None,
        "cipher": None,
        "hsts_header": None,
        "hsts_max_age": None,
        "hsts_include_subdomains": False,
        "hsts_preload": False,
    }

    # TLS 接続情報の取得
    context = ssl.create_default_context()
    with socket.create_connection((hostname, 443), timeout=10) as sock:
        with context.wrap_socket(sock, server_hostname=hostname) as tls_sock:
            result["tls_version"] = tls_sock.version()
            result["cipher"] = tls_sock.cipher()

    # HTTP レスポンスヘッダの確認
    conn = http.client.HTTPSConnection(hostname, timeout=10)
    conn.request("HEAD", "/")
    response = conn.getresponse()
    hsts = response.getheader("Strict-Transport-Security")
    result["hsts_header"] = hsts

    if hsts:
        directives = [d.strip().lower() for d in hsts.split(";")]
        for d in directives:
            if d.startswith("max-age="):
                result["hsts_max_age"] = int(d.split("=")[1])
            elif d == "includesubdomains":
                result["hsts_include_subdomains"] = True
            elif d == "preload":
                result["hsts_preload"] = True

    conn.close()
    return result

# 使用例（実際のホストに対して実行）
# result = check_https_hsts("example.com")
# print(f"TLS バージョン: {result['tls_version']}")
# print(f"暗号スイート: {result['cipher'][0]}")
# print(f"HSTS max-age: {result['hsts_max_age']} 秒")
# print(f"includeSubDomains: {result['hsts_include_subdomains']}")

# Nginx での HSTS 設定例（コメント）
nginx_config = """
server {
    listen 443 ssl http2;
    server_name example.com;

    # HSTS ヘッダの設定
    add_header Strict-Transport-Security
        "max-age=31536000; includeSubDomains; preload" always;

    # HTTP → HTTPS リダイレクト設定は別の server ブロックで
}

server {
    listen 80;
    server_name example.com;
    # 全 HTTP リクエストを HTTPS へリダイレクト
    return 301 https://$host$request_uri;
}
"""
print("Nginx HSTS 設定例を確認してください")
```

## 使用場面

- Web アプリケーションのすべてのページで HTTPS を強制する際の基本設定
- 中間者攻撃（SSL ストリッピング）を防ぐためのサーバヘッダ設定
- ブラウザの HSTS Preload リストへの登録による初回接続からの HTTPS 強制
- 混合コンテンツ問題の診断と修正作業

## 参考文献

- [RFC 6797 - HTTP Strict Transport Security (HSTS)](https://www.rfc-editor.org/rfc/rfc6797)
- [HSTS Preload List](https://hstspreload.org/)
- [MDN - Strict-Transport-Security](https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/Strict-Transport-Security)
- [Google - HTTPS の重要性](https://developers.google.com/search/docs/crawling-indexing/https)

<AffiliateBanner site="security_navi" />
