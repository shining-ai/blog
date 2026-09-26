---
title: DNS の仕組み（再帰的解決・権威サーバ）
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# DNS の仕組み（再帰的解決・権威サーバ）

## DNS とは

> ドメイン名システム（Domain Name System）：人間が読めるドメイン名（example.com）をコンピュータが使う IP アドレスに変換する分散型名前解決システム

DNS（RFC 1034/1035）はインターネットの「電話帳」とも呼ばれ、ドメイン名と IP アドレスの対応を管理する分散データベースです。階層的な木構造で管理されており、世界中に分散したサーバが協調して名前解決を行います。

DNS の名前解決には「再帰的解決」と「反復的解決」の 2 種類があります。通常のクライアントは「フルサービスリゾルバ（再帰リゾルバ）」に問い合わせます。リゾルバはクライアントの代わりに、ルートサーバ → TLD サーバ → 権威サーバと順番に問い合わせを行い（反復的）、最終的な答えをクライアントに返します（再帰的）。

DNS レコードには複数の種類があります。A レコードはドメイン→ IPv4 アドレス、AAAA は IPv6、MX はメールサーバ、CNAME は別名、NS は権威サーバを示します。各レコードには TTL（生存時間）が設定されており、キャッシュの有効期間を制御します。

## DNS の名前解決フロー

| ステップ | 問い合わせ先 | 質問 | 回答 |
|----------|-------------|------|------|
| 1 | ルートサーバ（13 組） | . の NS は？ | .com の TLD サーバ |
| 2 | .com TLD サーバ | example.com の NS は？ | ns1.example.com |
| 3 | 権威サーバ | www.example.com の A は？ | 93.184.216.34 |

## 主な DNS レコードタイプ

| タイプ | 内容 | 例 |
|--------|------|-----|
| A | IPv4 アドレス | example.com → 93.184.216.34 |
| AAAA | IPv6 アドレス | example.com → 2606:2800:220:1:... |
| CNAME | 正規名へのエイリアス | www → example.com |
| MX | メールサーバ（優先度付き） | 10 mail.example.com |
| NS | 権威ネームサーバ | ns1.example.com |
| TXT | テキスト情報（SPF/DKIM） | "v=spf1 include:..." |
| SOA | ゾーン情報（シリアル番号等） | 管理情報 |
| PTR | 逆引き（IP → ドメイン） | 34.216.184.93.in-addr.arpa |

```python
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class DNSRecord:
    name: str
    rtype: str   # A, AAAA, CNAME, MX, NS, TXT
    value: str
    ttl: int = 300

    def __str__(self):
        return f"{self.name:<30} {self.ttl:<6} IN {self.rtype:<6} {self.value}"

class DNSZone:
    """権威 DNS ゾーンのシミュレーション"""

    def __init__(self, zone: str):
        self.zone = zone
        self.records: list[DNSRecord] = []

    def add(self, name: str, rtype: str, value: str, ttl: int = 300):
        self.records.append(DNSRecord(name=name, rtype=rtype, value=value, ttl=ttl))

    def query(self, name: str, rtype: str) -> list[DNSRecord]:
        return [r for r in self.records if r.name == name and r.rtype == rtype]

class RecursiveResolver:
    """再帰リゾルバのシミュレーション"""

    def __init__(self):
        self.cache: dict[tuple, list[DNSRecord]] = {}
        self.query_count = 0

    def resolve(self, name: str, rtype: str, zone: DNSZone) -> Optional[list[DNSRecord]]:
        cache_key = (name, rtype)
        if cache_key in self.cache:
            print(f"  [キャッシュヒット] {name} {rtype}")
            return self.cache[cache_key]

        # CNAME チェーンの解決
        records = zone.query(name, rtype)
        if not records:
            cname_records = zone.query(name, "CNAME")
            if cname_records:
                print(f"  [CNAME] {name} → {cname_records[0].value}")
                records = zone.query(cname_records[0].value, rtype)

        self.query_count += 1
        print(f"  [権威サーバ問い合わせ #{self.query_count}] {name} {rtype} → "
              f"{len(records)} レコード")

        if records:
            self.cache[cache_key] = records  # キャッシュに保存
        return records or None

# デモ
print("=== DNS ゾーンとレコード ===\n")
zone = DNSZone("example.com")
zone.add("example.com",     "A",    "93.184.216.34", ttl=3600)
zone.add("example.com",     "AAAA", "2606:2800:220:1:248:1893:25c8:1946", ttl=3600)
zone.add("www.example.com", "CNAME","example.com",   ttl=300)
zone.add("mail.example.com","A",    "93.184.216.35", ttl=3600)
zone.add("example.com",     "MX",   "10 mail.example.com", ttl=3600)
zone.add("example.com",     "NS",   "ns1.example.com", ttl=86400)
zone.add("example.com",     "TXT",  "v=spf1 include:_spf.example.com ~all", ttl=300)

print("--- ゾーンレコード一覧 ---")
for r in zone.records:
    print(f"  {r}")

print("\n--- 名前解決シミュレーション ---")
resolver = RecursiveResolver()
for query in [("example.com", "A"), ("www.example.com", "A"), ("example.com", "MX")]:
    name, rtype = query
    result = resolver.resolve(name, rtype, zone)
    if result:
        for r in result:
            print(f"    回答: {r.value} (TTL={r.ttl})")

print("\n--- キャッシュによる 2 回目の高速解決 ---")
resolver.resolve("example.com", "A", zone)
```

## 使用場面

- Web サービスのドメイン設定（A レコード・CNAME）を Route 53 や Cloudflare DNS で管理する際に
- メール配信のためにMX・SPF（TXT）・DKIM レコードを設定し、スパム判定を回避する際に
- DNS ベースの負荷分散やフェイルオーバーを TTL と複数 A レコードで実現する際に

## 参考文献

- [RFC 1034 – Domain Names: Concepts and Facilities](https://www.rfc-editor.org/rfc/rfc1034)
- [RFC 1035 – Domain Names: Implementation and Specification](https://www.rfc-editor.org/rfc/rfc1035)
- [Cloudflare – DNS の仕組み](https://www.cloudflare.com/learning/dns/what-is-dns/)

<AffiliateBanner site="network_navi" />
