import AffiliateBanner from '@site/src/components/AffiliateBanner';

# DNS ハイジャッキングと DNSSEC

## DNS ハイジャッキングとは

> DNS ハイジャッキングとは、DNS クエリの応答を改ざんし、正規のドメイン名を偽サイトの IP アドレスに誘導する攻撃であり、ユーザーが気づかないまま偽サイトでの認証情報入力やマルウェアダウンロードに誘導される。

DNS（Domain Name System）はドメイン名を IP アドレスに変換するインターネットの「電話帳」である。この仕組みは設計当初にセキュリティが考慮されておらず、応答の真正性を検証する機能を持たなかった。そのため、さまざまな DNS 攻撃が可能になっている。

**主な DNS 攻撃の種類：**
- **DNS キャッシュポイズニング**：リゾルバのキャッシュに偽のレコードを注入し、多数のユーザーを誤誘導する
- **ルータの DNS 設定改ざん**：マルウェアや脆弱なルータを通じて DNS サーバ設定を変更する
- **権威 DNS サーバへの不正アクセス**：ドメインの登録情報を直接書き換える
- **DNS キャッシュポイズニング（Kaminsky 攻撃）**：UDP の推測可能なトランザクション ID を悪用

**DNSSEC（DNS Security Extensions）** は DNS 応答にデジタル署名を付加することで、応答の真正性と完全性を検証できるようにした拡張仕様である。署名の検証に成功すれば、応答が改ざんされていないことが保証される。ただし DNSSEC は通信の暗号化は行わない（DoT / DoH が暗号化担当）。

## DNS 攻撃の種類と防御策

| 攻撃種別 | 仕組み | 影響 | 防御策 |
|---------|--------|------|--------|
| キャッシュポイズニング | 偽の DNS 応答を注入 | 多数ユーザーの誤誘導 | DNSSEC・ランダムポート・0x20エンコード |
| ルータ DNS 改ざん | デフォルトパスワードのルータを改ざん | 家庭・企業内ユーザーの誤誘導 | ルータ強固な認証・定期的なファームウェア更新 |
| DNS ハイジャック（ISP） | ISP が強制的にリダイレクト | プライバシー侵害・広告挿入 | DoH（DNS over HTTPS）・DoT（DNS over TLS）の利用 |
| 権威 DNS 侵害 | ドメイン登録情報の書き換え | ドメイン乗っ取り | Registry Lock・2FA・DNSSEC |
| DNS トンネリング | DNS クエリにデータを隠す | データ持ち出し・C2 通信 | DNS クエリ異常検知・長い FQDN のブロック |

```python
# DNS 応答の検証と DNSSEC レコードの確認（防御・診断目的）
import dns.resolver
import dns.dnssec
import dns.name
import dns.message
import dns.query
import dns.rdatatype

def check_dnssec(domain: str) -> dict:
    """
    指定ドメインの DNSSEC 有効化状態を確認する。
    DNSSEC が有効なドメインには DNSKEY・RRSIG・DS レコードが存在する。
    """
    results = {
        "domain": domain,
        "has_dnskey": False,
        "has_rrsig": False,
        "has_ds": False,
        "dnssec_enabled": False,
    }

    resolver = dns.resolver.Resolver()
    resolver.use_dnssec = True

    # DNSKEY レコードの確認
    try:
        answer = resolver.resolve(domain, "DNSKEY")
        results["has_dnskey"] = len(answer) > 0
        print(f"  DNSKEY: {len(answer)} 件のキーが見つかりました")
    except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.exception.DNSException):
        print(f"  DNSKEY: 見つかりませんでした（DNSSEC 未対応の可能性）")

    # RRSIG レコードの確認（A レコードへの署名）
    try:
        answer = resolver.resolve(domain, "RRSIG")
        results["has_rrsig"] = len(answer) > 0
    except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.exception.DNSException):
        pass

    results["dnssec_enabled"] = results["has_dnskey"]
    return results


def check_caa_record(domain: str) -> list[str]:
    """
    CAA（Certification Authority Authorization）レコードの確認。
    どの CA がそのドメインの証明書を発行してよいかを制限する DNS レコード。
    DNS ハイジャック後の不正証明書発行を防ぐ防御層となる。
    """
    try:
        resolver = dns.resolver.Resolver()
        answer = resolver.resolve(domain, "CAA")
        return [str(rdata) for rdata in answer]
    except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.exception.DNSException):
        return []


def check_dns_security(domain: str) -> None:
    """ドメインの DNS セキュリティ設定を総合的に確認する"""
    print(f"\n=== DNS セキュリティ確認: {domain} ===")

    # A レコードと TTL の確認
    try:
        resolver = dns.resolver.Resolver()
        answer = resolver.resolve(domain, "A")
        for rdata in answer:
            print(f"  A レコード: {rdata.address}  (TTL: {answer.ttl}s)")
    except dns.exception.DNSException as e:
        print(f"  A レコード取得エラー: {e}")

    # DNSSEC の確認
    dnssec_result = check_dnssec(domain)
    status = "有効" if dnssec_result["dnssec_enabled"] else "無効（要検討）"
    print(f"  DNSSEC: {status}")

    # CAA の確認
    caa_records = check_caa_record(domain)
    if caa_records:
        print(f"  CAA レコード: {caa_records}")
    else:
        print("  CAA レコード: 未設定（任意の CA が証明書発行可能）")

    print("\n推奨設定:")
    if not dnssec_result["dnssec_enabled"]:
        print("  - DNSSEC を有効化してください（DNS レジストラで設定）")
    if not caa_records:
        print('  - CAA レコードを設定して証明書発行 CA を制限してください')
        print('    例: 0 issue "letsencrypt.org"')
    print("  - DoH または DoT を使用して DNS 通信を暗号化してください")
    print("  - Registry Lock でドメイン登録情報の変更に追加認証を要求してください")


# 使用例
check_dns_security("cloudflare.com")
```

## 使用場面

- 自社ドメインの DNSSEC 有効化とレジストラでの DS レコード登録
- CAA レコードの設定による不正 TLS 証明書発行の防止
- DoH（Cloudflare 1.1.1.1・Google 8.8.8.8）への移行による DNS 盗聴対策
- 企業内 DNS の監視・異常なキャッシュエントリの検出
- フィッシングサイトへの誘導インシデント発生後の DNS 設定確認

## 参考文献

- [RFC 4033 / 4034 / 4035 - DNS Security Introduction and Requirements (DNSSEC)](https://www.rfc-editor.org/rfc/rfc4033)
- [ICANN - DNSSEC: What Is It and Why Is It Important?](https://www.icann.org/resources/pages/dnssec-what-is-it-why-important-2019-03-05-en)
- [RFC 8484 - DNS Queries over HTTPS (DoH)](https://www.rfc-editor.org/rfc/rfc8484)
- [OWASP - DNS Security](https://owasp.org/www-community/controls/Blocking_by_DNS_Lookup)

<AffiliateBanner site="security_navi" />
