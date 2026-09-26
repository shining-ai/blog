import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ドキュメントDB（MongoDB）

## MongoDBとは

> MongoDBとは、JSONに似たBSON（Binary JSON）形式のドキュメントをコレクションに格納するドキュメント指向データベースであり、柔軟なスキーマ・ネスト構造・水平スケールアウトを特徴とする。

MongoDBのドキュメントはJSONライクなキーバリューのペアで構成され、配列やネストされたオブジェクトも1つのドキュメントに格納できます。RDBMSのように正規化してJOINする代わりに、関連データを1つのドキュメントに埋め込む（エンベッドパターン）アプローチが基本です。これにより、1回のクエリで全データを取得でき、N+1問題が発生しません。

スキーマはコレクションレベルで強制されません（スキーマバリデーションは任意で設定可能）。そのため開発初期の仕様変更や、ユーザーごとに異なる属性を持つデータ（商品の仕様・ユーザープロファイル）などに対応しやすいです。

MongoDBはバージョン4.0以降でマルチドキュメントACIDトランザクションをサポートしました。インデックスはB+木ベースで、複合インデックス・テキストインデックス・地理空間インデックスもサポートします。レプリカセットによる高可用性と、シャーディングによる水平スケールを標準でサポートしています。

## MongoDBのデータモデル設計方針

| パターン | 説明 | 向いているケース |
|---------|------|---------------|
| エンベッドパターン | 関連データを1ドキュメントに埋め込む | 1対1・1対少数の関係、一緒に読む |
| 参照パターン | ObjectIDで別コレクションを参照 | 1対多・多対多、独立して更新する |
| バケットパターン | 時系列データをバケットにまとめる | IoTセンサーデータ |
| 外側参照パターン | 親から子のIDリストを持つ | ツリー構造 |

```python
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.operations import UpdateOne
from datetime import datetime, timezone
from bson import ObjectId

client = MongoClient("mongodb://localhost:27017/")
db = client["myapp"]

# ====================================
# ドキュメントの挿入（エンベッドパターン）
# ====================================
# ユーザーと住所を1ドキュメントに埋め込む
users = db.users

user_id = users.insert_one({
    "name": "Alice",
    "email": "alice@example.com",
    "age": 30,
    "address": {                   # ネストされたオブジェクト
        "city": "Tokyo",
        "zip": "100-0001"
    },
    "tags": ["premium", "early_adopter"],   # 配列
    "created_at": datetime.now(timezone.utc)
}).inserted_id
print(f"挿入ID: {user_id}")

# ====================================
# クエリ
# ====================================
# 基本的なfind
alice = users.find_one({"name": "Alice"})
print(f"取得: {alice['name']}, {alice['email']}")

# ネストされたフィールドへのクエリ（ドット記法）
tokyo_users = list(users.find(
    {"address.city": "Tokyo"},
    {"name": 1, "email": 1, "_id": 0}   # projection: 取得するフィールドを指定
))
print(f"東京在住ユーザー: {len(tokyo_users)}件")

# 配列要素のマッチ
premium_users = list(users.find({"tags": "premium"}))
print(f"プレミアムユーザー: {len(premium_users)}件")

# ====================================
# 更新
# ====================================
# 特定フィールドのみ更新（$set）
users.update_one(
    {"_id": user_id},
    {
        "$set": {"age": 31, "address.city": "Osaka"},
        "$push": {"tags": "updated"},            # 配列に追加
        "$currentDate": {"updated_at": True}     # 現在時刻を設定
    }
)

# ====================================
# アグリゲーション（集計）
# ====================================
pipeline = [
    {"$match": {"age": {"$gte": 18}}},                     # フィルタ
    {"$group": {
        "_id": "$address.city",                             # グループキー
        "count": {"$sum": 1},
        "avg_age": {"$avg": "$age"}
    }},
    {"$sort": {"count": DESCENDING}},                       # ソート
    {"$limit": 5}
]
results = list(users.aggregate(pipeline))
print("都市別ユーザー数:")
for r in results:
    print(f"  {r['_id']}: {r['count']}人, 平均年齢: {r['avg_age']:.1f}")

# ====================================
# インデックス
# ====================================
# emailに一意インデックスを作成
users.create_index([("email", ASCENDING)], unique=True)

# 複合インデックス
users.create_index([("address.city", ASCENDING), ("age", DESCENDING)])

# テキストインデックス（全文検索）
db.articles.create_index([("title", "text"), ("body", "text")])
results = db.articles.find({"$text": {"$search": "NoSQL database"}})

# インデックス一覧
print("\nインデックス一覧:")
for idx in users.index_information().values():
    print(f"  {idx.get('name')}: {idx.get('key')}")

client.close()
```

## 使用場面

- 商品カタログなど属性が商品カテゴリごとに異なるデータを柔軟なスキーマで管理する場合
- ブログ記事や設定データなどJSONライクな構造を持つドキュメントを格納する場合
- 1回のクエリで親子関係のデータを取得するためエンベッドパターンを採用する場合
- シャーディングでデータを水平分散して大規模なデータを扱う場合

## 参考文献

- [MongoDB Documentation](https://www.mongodb.com/docs/)
- [MongoDB Data Modeling](https://www.mongodb.com/docs/manual/data-modeling/)
- Martin Kleppmann, "Designing Data-Intensive Applications", Chapter 2

<AffiliateBanner site="db_navi" />
