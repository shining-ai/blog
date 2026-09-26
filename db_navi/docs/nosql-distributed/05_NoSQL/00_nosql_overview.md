import AffiliateBanner from '@site/src/components/AffiliateBanner';

# NoSQLの分類と使い分け

## NoSQLとは

> NoSQL（Not Only SQL）とは、関係モデルとSQLに依存しないデータベースの総称であり、スケールアウト・柔軟なスキーマ・特定のアクセスパターンへの特化を目的として設計された複数のデータモデルを持つデータベース群である。

NoSQLが注目されるようになった背景には、2000年代後半のWebサービスの爆発的なデータ量増加があります。RDBMS の垂直スケール（サーバースペックアップ）には限界があり、水平スケール（サーバー台数増加）との相性が悪く、固定スキーマではユーザー行動データのような多様な構造に対応しにくいという課題がありました。

NoSQLは「リレーショナルDBの代替」ではなく「特定のユースケースへの特化」として理解するのが適切です。KVSはセッション管理・キャッシュ、ドキュメントDBは柔軟なスキーマのコンテンツ管理・カタログ、ワイドカラムは時系列データ・ログ、グラフDBはSNSの関係性・推薦エンジン、時系列DBはメトリクス・IoTデータに向いています。

多くの本格的なシステムでは、RDBMSとNoSQLを用途に応じて組み合わせて使います（ポリグロット・パーシステンス）。

## NoSQLデータベースの分類

| 種類 | 代表製品 | データモデル | 得意なこと | CAP |
|------|---------|-------------|-----------|-----|
| キーバリューストア | Redis, DynamoDB | key → value | 高速読み書き・キャッシュ | AP |
| ドキュメントDB | MongoDB, Firestore | JSON/BSON形式のドキュメント | 柔軟なスキーマ・ネスト構造 | CP / AP |
| ワイドカラムストア | Cassandra, HBase | テーブル・行・列ファミリー | 大量書き込み・時系列 | AP |
| グラフDB | Neo4j, Amazon Neptune | ノードとエッジ | 関係性の探索・推薦 | CP |
| 時系列DB | InfluxDB, TimescaleDB | タイムスタンプ付きメトリクス | 時系列データの集計 | CP / AP |
| 全文検索エンジン | Elasticsearch, OpenSearch | 転置インデックス | テキスト検索・ログ分析 | CP |

```python
# ====================================
# 各NoSQLへの接続サンプル（ライブラリ確認用）
# ====================================

# Redis（キーバリューストア）
import redis
r = redis.Redis(host="localhost", port=6379, db=0)
r.set("session:abc123", '{"user_id": 1, "expires": "2024-12-31"}', ex=3600)
session = r.get("session:abc123")
print(f"Redis: {session}")

# MongoDB（ドキュメントDB）
from pymongo import MongoClient
client = MongoClient("mongodb://localhost:27017/")
db = client["myapp"]
db.users.insert_one({"name": "Alice", "email": "alice@example.com", "age": 30})
user = db.users.find_one({"name": "Alice"})
print(f"MongoDB: {user}")

# Elasticsearch（全文検索）
from elasticsearch import Elasticsearch
es = Elasticsearch("http://localhost:9200")
es.index(index="articles", body={"title": "NoSQL Overview", "body": "..."})
result = es.search(index="articles", query={"match": {"title": "NoSQL"}})
print(f"Elasticsearch: {result['hits']['hits']}")
```

```sql
-- ====================================
-- RDBMSとNoSQLの使い分けの判断基準
-- ====================================
-- RDBMSが適するケース
-- 1. 複数テーブルをJOINして整合性が必要
-- 2. 複雑なトランザクション（送金・在庫など）
-- 3. スキーマが安定している
-- 4. アドホッククエリが多い

-- NoSQLが適するケース
-- 1. スキーマが頻繁に変わる（ドキュメントDB）
-- 2. 1秒に数万件の書き込み（Cassandra）
-- 3. グラフ構造の探索（グラフDB）
-- 4. セッション・キャッシュ（KVS）
-- 5. 時系列メトリクス（時系列DB）
-- 6. テキスト全文検索（Elasticsearch）

-- ポリグロット・パーシステンスの例：
-- ユーザーデータ・注文           → PostgreSQL（ACID・JOIN）
-- セッション・レートリミット      → Redis（高速KVS）
-- 商品カタログ・ブログ記事        → MongoDB（柔軟スキーマ）
-- アクセスログ・メトリクス        → InfluxDB（時系列）
-- 商品検索・全文検索              → Elasticsearch

-- NoSQLの主なデメリット
-- - JOIN・複雑なクエリが苦手
-- - ACIDトランザクションが弱い（分散の場合）
-- - 標準化されたクエリ言語がない
-- - 運用・学習コストが各製品ごとに異なる
```

## 使用場面

- セッションやキャッシュに低レイテンシが必要な場合にRedisを採用する場合
- JSONのネスト構造を持つ可変スキーマのデータをMongoDBに格納する場合
- 1秒あたり数万件の時系列メトリクスを記録する場合にInfluxDB / TimescaleDBを使う場合
- SNS・推薦システムのグラフ構造をNeo4jで管理する場合

## 参考文献

- [AWS - Types of Databases](https://aws.amazon.com/products/databases/)
- Martin Kleppmann, "Designing Data-Intensive Applications", Chapter 2
- [MongoDB - NoSQL Explained](https://www.mongodb.com/nosql-explained)

<AffiliateBanner site="db_navi" />
