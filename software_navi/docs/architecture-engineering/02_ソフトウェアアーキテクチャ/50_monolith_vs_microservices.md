import AffiliateBanner from '@site/src/components/AffiliateBanner';

# モノリス vs マイクロサービスの判断基準

## モノリス・マイクロサービスとは

> モノリスは単一のデプロイ単位にすべての機能を持つアーキテクチャ、マイクロサービスは機能ごとに独立したサービスに分割し個別にデプロイするアーキテクチャ。

モノリスとマイクロサービスはアーキテクチャの両極にあり、「どちらが良いか」ではなく「どの段階でどちらが適切か」を判断することが重要です。

モノリスは開発初期に有利です。単一コードベースでデプロイが容易、サービス間通信のオーバーヘッドがなく、デバッグも単純です。しかしスケールアウトの粒度が粗く、一部の変更でも全体の再デプロイが必要になります。

マイクロサービスは独立したスケール・デプロイ・技術選択が可能で、大規模チームの並列開発に適します。一方で分散システムの複雑性（ネットワーク遅延・整合性・サービスディスカバリ）が発生し、運用コストが上がります。

Sam Newman は「モノリスファースト」戦略、すなわちまずモノリスで始めてドメイン境界が見えてきたらマイクロサービスに分割することを推奨しています。

## 比較表

| 観点 | モノリス | マイクロサービス |
|------|---------|----------------|
| デプロイ | 全体を一度に | サービスごとに独立 |
| スケール | 全体をスケール | 必要なサービスのみ |
| 開発速度（初期） | 速い | 遅い（インフラ整備が必要） |
| 障害の影響範囲 | 全体に波及 | 該当サービスのみ |
| チーム規模 | 小〜中規模向き | 中〜大規模向き |
| 技術統一性 | 強制される | サービスごとに選択可能 |
| 分散トランザクション | 不要 | Sagaパターン等が必要 |

```python title="モノリスからマイクロサービスへの段階的分割（概念コード）"
# === モノリス: すべてが単一プロセス内 ===
class MonolithicApp:
    def place_order(self, user_id: str, product_id: str, qty: int) -> dict:
        # ユーザー確認・在庫確認・注文保存・通知が同一プロセス内
        user    = self._user_repo.find(user_id)
        product = self._product_repo.find(product_id)
        if product.stock < qty:
            raise RuntimeError("Out of stock")
        order = self._order_repo.save(user_id, product_id, qty)
        self._notifier.send(user.email, f"Order {order.id} placed!")
        return {"order_id": order.id}


# === マイクロサービス: HTTP / gRPC で通信 ===
import httpx

class OrderService:
    def __init__(self, user_svc_url: str, inventory_svc_url: str):
        self._user_svc      = user_svc_url
        self._inventory_svc = inventory_svc_url

    def place_order(self, user_id: str, product_id: str, qty: int) -> dict:
        # 各サービスをネットワーク越しに呼び出す
        user_resp = httpx.get(f"{self._user_svc}/users/{user_id}")
        user_resp.raise_for_status()

        inv_resp = httpx.post(
            f"{self._inventory_svc}/reserve",
            json={"product_id": product_id, "qty": qty},
        )
        inv_resp.raise_for_status()

        # ... 注文保存・通知サービスへの連携
        return {"order_id": "ORD-XYZ", "status": "created"}


# === モジュラーモノリス（中間案）===
# 単一デプロイだがモジュール境界を厳格に守る
class UserModule:
    def find_user(self, user_id: str): ...

class InventoryModule:
    def reserve(self, product_id: str, qty: int): ...

class OrderModule:
    def __init__(self, user_mod: UserModule, inv_mod: InventoryModule):
        self._user = user_mod
        self._inv  = inv_mod
```

## 判断フロー

1. チームが 2 ピザルール（〜8人）以下 → モノリスから開始
2. ドメイン境界が明確に見えてきた → モジュラーモノリスを検討
3. 特定機能のスケール要件が突出している → その機能だけを分離
4. チームが複数で独立デプロイが必要 → マイクロサービス化

## 使用場面

- スタートアップや新規プロジェクトの初期 → モノリスファースト
- 特定サービスに高負荷が集中 → 対象サービスのみ分割・スケール
- 組織が大きくチームごとに独立した開発・デプロイサイクルが必要 → マイクロサービス

## 参考文献

- Sam Newman, *Building Microservices*, O'Reilly, 2015
- Martin Fowler, *MonolithFirst*, https://martinfowler.com/bliki/MonolithFirst.html

<AffiliateBanner site="software_navi" />
