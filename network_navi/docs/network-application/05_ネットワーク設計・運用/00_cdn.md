import AffiliateBanner from '@site/src/components/AffiliateBanner';

# CDN の仕組みと活用

## CDN とは

> CDN（Content Delivery Network）とは世界中に分散配置したエッジサーバにコンテンツをキャッシュし、ユーザの近くのサーバから配信することで遅延を削減・可用性を向上させるネットワーク基盤である。

Web サービスのサーバが一か所にしかない場合、地理的に遠いユーザは RTT（ラウンドトリップ時間）が大きくなり、ページロードが遅くなります。CDN はこの問題を解決するため、世界中の主要都市にエッジサーバ（PoP: Point of Presence）を設置し、静的コンテンツ（HTML・CSS・JavaScript・画像・動画）をユーザの最寄りのサーバからキャッシュ配信します。

CDN のコンテンツ配信の流れは次の通りです。ユーザが URL にアクセスすると DNS が最寄りの CDN エッジサーバの IP を返します（エニーキャスト DNS やジオ DNS を使用）。エッジサーバにコンテンツがキャッシュされていれば（キャッシュヒット）直接返します。キャッシュがなければ（キャッシュミス）オリジンサーバにリクエストし、レスポンスをキャッシュしてユーザに返します。

CDN は静的コンテンツ配信だけでなく、動的コンテンツの高速化（TCP 接続プーリング・TLS セッション再利用）、DDoS 防御（トラフィック吸収）、WAF（Web Application Firewall）機能、画像の動的変換・WebP 変換なども提供します。

主要な CDN サービスとして Cloudflare・AWS CloudFront・Fastly・Akamai があります。

## CDN の主要機能と設定

| 機能 | 説明 | 設定例 |
|------|------|--------|
| キャッシュ制御 | TTL で鮮度管理 | Cache-Control: max-age=86400 |
| パージ（キャッシュ無効化） | 即時反映のため指定 URL を削除 | CDN API で対象パスを指定 |
| エッジ SSL/TLS | エッジでの TLS 終端 | Full SSL（エッジ↔オリジン間も TLS） |
| ジオブロッキング | 特定国からのアクセス制限 | CDN のルールで国コードを指定 |
| HTTP/2・HTTP/3 | エッジでプロトコル変換 | 設定で有効化 |

```python
import hashlib
import time
from collections import OrderedDict

# ===========================
# CDN キャッシュのシミュレーション
# ===========================

class CacheEntry:
    def __init__(self, content: bytes, ttl: int, etag: str):
        self.content = content
        self.ttl = ttl
        self.created_at = time.time()
        self.etag = etag
        self.hit_count = 0

    def is_fresh(self) -> bool:
        return time.time() - self.created_at < self.ttl

    def age(self) -> int:
        return int(time.time() - self.created_at)


class EdgeServer:
    """CDN エッジサーバのシミュレーション"""

    def __init__(self, location: str, capacity: int = 100):
        self.location = location
        self.cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self.capacity = capacity
        self.hits = 0
        self.misses = 0

    def _make_etag(self, content: bytes) -> str:
        return hashlib.md5(content).hexdigest()[:8]

    def get(self, url: str, if_none_match: str = "") -> tuple[int, dict, bytes]:
        """
        コンテンツ取得
        Returns: (status_code, headers, body)
        """
        if url in self.cache:
            entry = self.cache[url]
            if entry.is_fresh():
                self.hits += 1
                entry.hit_count += 1
                if if_none_match and if_none_match == entry.etag:
                    return 304, {"ETag": entry.etag, "Age": entry.age()}, b""
                return 200, {
                    "X-Cache": "HIT",
                    "X-Cache-Hits": str(entry.hit_count),
                    "Age": entry.age(),
                    "ETag": entry.etag,
                    "X-Edge-Location": self.location,
                }, entry.content
            else:
                del self.cache[url]  # 期限切れを削除

        self.misses += 1
        return 0, {}, b""  # キャッシュミス（オリジンへフォールバック）

    def store(self, url: str, content: bytes, ttl: int) -> None:
        """コンテンツをキャッシュに保存（LRU 削除）"""
        if len(self.cache) >= self.capacity:
            self.cache.popitem(last=False)  # LRU 削除
        etag = self._make_etag(content)
        self.cache[url] = CacheEntry(content, ttl, etag)

    def purge(self, url_pattern: str) -> int:
        """指定パターンに一致するキャッシュを削除（パージ）"""
        to_delete = [url for url in self.cache if url.startswith(url_pattern)]
        for url in to_delete:
            del self.cache[url]
        return len(to_delete)

    def stats(self) -> dict:
        total = self.hits + self.misses
        return {
            "location": self.location,
            "hit_rate": f"{self.hits / total * 100:.1f}%" if total else "N/A",
            "hits": self.hits,
            "misses": self.misses,
            "cached_items": len(self.cache),
        }


class OriginServer:
    """オリジンサーバのシミュレーション"""

    def __init__(self):
        self.request_count = 0
        self._content = {
            "/index.html": (b"<html><body>Hello CDN World!</body></html>", 3600),
            "/style.css":  (b"body { color: #333; }", 86400),
            "/logo.png":   (b"\x89PNG\r\n\x1a\nFAKE_PNG_DATA", 604800),
        }

    def fetch(self, url: str) -> tuple[bytes, int]:
        """コンテンツを取得して TTL を返す"""
        self.request_count += 1
        content, ttl = self._content.get(url, (b"404 Not Found", 0))
        return content, ttl


def cdn_demo():
    origin = OriginServer()
    edges = {
        "Tokyo":   EdgeServer("ap-northeast-1"),
        "London":  EdgeServer("eu-west-2"),
    }

    print("=== CDN シミュレーションデモ ===\n")

    urls_to_fetch = [
        "/index.html",
        "/style.css",
        "/index.html",  # キャッシュヒット
        "/logo.png",
        "/index.html",  # キャッシュヒット
        "/style.css",   # キャッシュヒット
    ]

    print("[Tokyo エッジサーバのキャッシュ動作]")
    edge = edges["Tokyo"]

    for url in urls_to_fetch:
        status, headers, body = edge.get(url)
        if status == 200:
            print(f"  GET {url} → {status} {headers.get('X-Cache')} (hits={headers.get('X-Cache-Hits')})")
        else:
            # キャッシュミス: オリジンから取得してキャッシュ
            content, ttl = origin.fetch(url)
            edge.store(url, content, ttl)
            print(f"  GET {url} → MISS → オリジン取得 (TTL={ttl}s, {len(content)}bytes)")

    stats = edge.stats()
    print(f"\n  キャッシュ統計: {stats}")
    print(f"  オリジンへのリクエスト数: {origin.request_count}")

    print("\n[パージ（キャッシュ無効化）]")
    purged = edge.purge("/index")
    print(f"  /index 以下のキャッシュを削除: {purged} 件")


cdn_demo()
```

## 使用場面

- 画像・動画・JavaScript などの静的アセットを世界中のユーザに高速配信する場面
- トラフィックの急増（キャンペーン・セール）に対してオリジンサーバへの負荷を分散する場面
- DDoS 攻撃のトラフィックを CDN エッジで吸収してオリジンを保護する場面

## 参考文献

- Nygren, E., Sitaraman, R. K., and Sun, J. "The Akamai Network: A Platform for High-Performance Internet Applications" (2010)
- [Cloudflare – How does a CDN work?](https://www.cloudflare.com/learning/cdn/what-is-a-cdn/)
- [AWS – Amazon CloudFront とは](https://docs.aws.amazon.com/ja_jp/AmazonCloudFront/latest/DeveloperGuide/Introduction.html)

<AffiliateBanner site="network_navi" />
