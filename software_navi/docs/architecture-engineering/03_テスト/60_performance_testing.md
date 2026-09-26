import AffiliateBanner from '@site/src/components/AffiliateBanner';

# パフォーマンステスト・負荷テスト

## パフォーマンステストとは

> システムが特定の負荷条件下でどのように振る舞うかを測定・検証するテスト。応答時間・スループット・リソース使用量などを定量的に評価する。

パフォーマンステストは機能テストと異なり「正しく動くか」ではなく「どれだけ速く・どれだけ多くを処理できるか」を測ります。本番運用前にボトルネックを発見し、SLAを満たせることを確認するために不可欠です。

主な種類として、負荷テスト（想定ユーザー数での応答時間確認）・ストレステスト（システムの限界点を探る）・スパイクテスト（急激なトラフィック増加への耐性確認）・耐久テスト（長時間負荷でのメモリリーク検出）があります。

測定すべき主要指標はレイテンシ（P50/P95/P99）・スループット（RPS）・エラー率・CPU/メモリ使用率です。「平均応答時間」はP99の外れ値を隠すため、パーセンタイル値を重視します。

## テスト種類と目的

| 種類 | 目的 | 負荷パターン |
|------|------|------------|
| 負荷テスト（Load Test） | 想定負荷での動作確認 | 通常〜ピーク負荷 |
| ストレステスト（Stress Test）| 限界点・障害点の発見 | 超過負荷 |
| スパイクテスト（Spike Test） | 急激な負荷増加への耐性 | 急峻なスパイク |
| 耐久テスト（Soak Test） | 長時間での劣化・リーク検出 | 長時間の中負荷 |
| ボリュームテスト | 大量データでの動作確認 | 大量レコード |

```python title="Locustによる負荷テスト（Python）"
# locustfile.py
from locust import HttpUser, task, between
from locust import events
import json

class ShopUser(HttpUser):
    """仮想ユーザーの行動シナリオを定義"""
    wait_time = between(1, 3)  # 1〜3秒のランダムな待機

    def on_start(self):
        """ユーザーセッション開始時: ログイン"""
        response = self.client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "password123",
        })
        self.token = response.json().get("token", "")

    @task(3)  # 重み3: 商品一覧閲覧は最も頻繁
    def browse_products(self):
        self.client.get(
            "/api/products?page=1&limit=20",
            headers={"Authorization": f"Bearer {self.token}"},
            name="/api/products",
        )

    @task(2)  # 重み2: 商品詳細閲覧
    def view_product(self):
        product_id = 1
        self.client.get(
            f"/api/products/{product_id}",
            headers={"Authorization": f"Bearer {self.token}"},
            name="/api/products/[id]",
        )

    @task(1)  # 重み1: 注文（最も少ない）
    def place_order(self):
        with self.client.post(
            "/api/orders",
            json={"product_id": 1, "quantity": 1},
            headers={"Authorization": f"Bearer {self.token}"},
            catch_response=True,
        ) as response:
            if response.status_code == 201:
                response.success()
            else:
                response.failure(f"Expected 201, got {response.status_code}")


# 実行コマンド:
# locust -f locustfile.py --headless -u 100 -r 10 --run-time 2m
# -u 100: 最大100仮想ユーザー
# -r 10:  毎秒10ユーザーずつ増加
# --run-time 2m: 2分間実行
```

```typescript title="k6による負荷テストスクリプト（TypeScript / JavaScript）"
// k6 load test script (k6.js)
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// カスタムメトリクス
const errorRate   = new Rate("errors");
const apiDuration = new Trend("api_duration");

export const options = {
  stages: [
    { duration: "30s", target: 20 },  // ランプアップ
    { duration: "1m",  target: 50 },  // 通常負荷
    { duration: "30s", target: 100 }, // ピーク負荷
    { duration: "30s", target: 0 },   // ランプダウン
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],  // P95 が 500ms 以内
    errors:            ["rate<0.01"],  // エラー率 1% 未満
  },
};

export default function (): void {
  const res = http.get("https://api.example.com/products");

  const ok = check(res, {
    "status is 200":       (r) => r.status === 200,
    "response time < 1s":  (r) => r.timings.duration < 1000,
  });

  errorRate.add(!ok);
  apiDuration.add(res.timings.duration);

  sleep(1);
}

// 実行: k6 run script.js
```

## 使用場面

- 新機能リリース前にSLA（例: P95 < 500ms）を満たすか確認する
- セール・キャンペーン前に想定ピーク負荷への耐性を検証する
- 長時間稼働後のメモリリークやコネクションプールの枯渇を検出する

## 参考文献

- Locust 公式ドキュメント, https://locust.io/
- k6 公式ドキュメント, https://k6.io/docs/
- Steve Souders, *High Performance Web Sites*, O'Reilly, 2007

<AffiliateBanner site="software_navi" />
