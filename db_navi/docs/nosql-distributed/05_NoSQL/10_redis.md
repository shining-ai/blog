import AffiliateBanner from '@site/src/components/AffiliateBanner';

# キーバリューストア（Redis）

## Redisとは

> Redisとは、メモリ上でデータを管理するインメモリ型のキーバリューストアであり、文字列・リスト・セット・ハッシュ・ソート済みセットなどの多様なデータ構造をサポートし、マイクロ秒オーダーの高速な読み書きを実現するデータベースである。

Redisはデータをメモリに保持することで、ディスクベースのDBでは数ms〜数十msかかる操作をマイクロ秒で完了できます。シングルスレッドモデルにより原子性が保証されており、競合を気にせずカウンタ操作やアトミックな操作が行えます。

主なユースケースはキャッシュ（TTL付きのデータ保存）・セッション管理・レートリミット・ジョブキュー・Pub/Sub・リアルタイムランキングです。TTL（Time To Live）を設定することで自動的にデータが期限切れになり、キャッシュとして使いやすい設計になっています。

永続化にはRDB（定期的なスナップショット）とAOF（Append Only File：全書き込みをログに記録）の2方式があります。AOFの方が耐障害性が高く、両方を組み合わせることが多いです。Redis ClusterやRedis Sentinelによる高可用性・水平スケールも対応しています。

## Redisのデータ型

| データ型 | コマンド | 主な用途 |
|---------|---------|---------|
| String | GET/SET/INCR/EXPIRE | キャッシュ・カウンタ・セッション |
| Hash | HGET/HSET/HMGET | オブジェクトの属性管理 |
| List | LPUSH/RPOP/LRANGE | キュー・最新N件の保持 |
| Set | SADD/SMEMBERS/SINTER | タグ・ユニークユーザー集合 |
| Sorted Set | ZADD/ZRANGE/ZRANK | ランキング・スコア付きキュー |
| Stream | XADD/XREAD | イベントストリーム・メッセージキュー |

```python
import redis
import json
import time

r = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

# ====================================
# String: キャッシュとTTL
# ====================================
# JSONをシリアライズしてキャッシュ（60秒TTL）
def get_user_cached(user_id: int) -> dict:
    key = f"user:{user_id}"
    cached = r.get(key)
    if cached:
        print(f"キャッシュヒット: {key}")
        return json.loads(cached)

    # DBから取得（ここではモック）
    user = {"id": user_id, "name": "Alice", "email": "alice@example.com"}
    r.setex(key, 60, json.dumps(user))  # 60秒TTL
    print(f"DBから取得してキャッシュ: {key}")
    return user

user = get_user_cached(1)
print(user)

# ====================================
# Hash: オブジェクトの属性管理
# ====================================
r.hset("session:token_abc123", mapping={
    "user_id": "1",
    "role": "admin",
    "ip": "192.168.1.1",
    "created_at": str(int(time.time()))
})
r.expire("session:token_abc123", 3600)   # 1時間TTL

session = r.hgetall("session:token_abc123")
print(f"セッション: {session}")

# ====================================
# Sorted Set: リアルタイムランキング
# ====================================
# スコアを追加・更新
r.zadd("ranking:game1", {"player:alice": 9800, "player:bob": 8500, "player:carol": 9200})
r.zincrby("ranking:game1", 200, "player:bob")   # ボブのスコアを200加算

# 上位3件取得（スコア降順）
top3 = r.zrange("ranking:game1", 0, 2, withscores=True, rev=True)
print("ランキング TOP3:")
for i, (player, score) in enumerate(top3, 1):
    print(f"  {i}位: {player} = {int(score)}点")

# 特定プレイヤーの順位
rank = r.zrevrank("ranking:game1", "player:alice")
print(f"alice の順位: {rank + 1}位")

# ====================================
# List: ジョブキュー
# ====================================
# 右から積んで（RPUSH）左から取る（BLPOP）→ FIFOキュー
r.rpush("job_queue", json.dumps({"task": "send_email", "to": "alice@example.com"}))
r.rpush("job_queue", json.dumps({"task": "generate_report", "id": 42}))

# ブロッキングポップ（ジョブがなければ5秒待機）
item = r.blpop("job_queue", timeout=5)
if item:
    queue_name, job_json = item
    job = json.loads(job_json)
    print(f"ジョブ取得: {job}")

# ====================================
# レートリミット（スライディングウィンドウ）
# ====================================
def check_rate_limit(user_id: int, limit: int = 10, window_sec: int = 60) -> bool:
    """1分間に limit 回までのアクセスを許可する"""
    key = f"rate:{user_id}:{int(time.time()) // window_sec}"
    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, window_sec * 2)
    count, _ = pipe.execute()
    return int(count) <= limit

for i in range(12):
    allowed = check_rate_limit(user_id=1, limit=10)
    print(f"リクエスト {i+1}: {'許可' if allowed else '制限（429）'}")
```

## 使用場面

- DBクエリの結果をTTL付きでキャッシュしてDBへの負荷を削減する場合
- セッション情報をHash型で管理してWebサーバー間でセッションを共有する場合
- Sorted Setでリアルタイムランキング・スコアボードを実装する場合
- Listをジョブキューとして使いシンプルな非同期タスク処理を実現する場合

## 参考文献

- [Redis Documentation](https://redis.io/docs/)
- [Redis Data Types](https://redis.io/docs/data-types/)
- Martin Kleppmann, "Designing Data-Intensive Applications", Chapter 2

<AffiliateBanner site="db_navi" />
