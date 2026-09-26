---
title: CSMA/CD と CSMA/CA
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# CSMA/CD と CSMA/CA

## CSMA/CD と CSMA/CA とは

> 共有媒体上で複数の機器がアクセスを調整するための衝突制御プロトコルで、有線イーサネットでは CSMA/CD、無線 LAN では CSMA/CA が使われる

CSMA（Carrier Sense Multiple Access）は、送信前に媒体（バスや電波）を監視して他の送信がないか確認してから送信する方式です。

- **CSMA/CD**（Collision Detection）: 有線イーサネットで使用。衝突を検出したら送信を停止し、ランダム時間待機後に再送する。現在の全二重スイッチ環境ではほぼ使われない。
- **CSMA/CA**（Collision Avoidance）: 無線 LAN で使用。無線は衝突検出が困難なため、送信前に意図的な待機（DIFS + ランダムバックオフ）で衝突を回避する。

## CSMA/CD の動作

```
1. 媒体を監視（キャリアセンス）
2. アイドルなら送信開始
3. 送信中に衝突を検出したら:
   a. ジャム信号を送信（他ノードに衝突を通知）
   b. 指数バックオフでランダム待機
   c. 最大 16 回まで再送試行
4. 衝突なく送信完了 → 成功
```

## CSMA/CA の動作（Wi-Fi）

```
1. 媒体を監視（キャリアセンス）
2. DIFS 時間以上アイドルなら:
   a. ランダムバックオフ（コンテンションウィンドウ）
   b. バックオフカウントダウン
3. カウントダウン完了後に送信
4. ACK 受信を確認（なければ再送）

DIFS: DCF Interframe Space（中距離フレーム間隔）
SIFS: Short Interframe Space（短フレーム間隔、ACK に使用）
```

## CSMA/CD vs CSMA/CA の比較

| 項目 | CSMA/CD | CSMA/CA |
|------|---------|---------|
| 主な用途 | 有線イーサネット | IEEE 802.11（Wi-Fi） |
| 衝突対処 | 検出後に停止・再送 | 事前に回避 |
| 効率 | 衝突がなければ高い | バックオフ分オーバーヘッドあり |
| 現在の利用 | 全二重化で実質不使用 | 現役 |
| 隠れ端末問題 | 該当なし | RTS/CTS で対処 |

```python
import random
import time
from dataclasses import dataclass
from typing import Optional

@dataclass
class Frame:
    node_id: int
    data: str

class SharedMedium:
    """共有媒体（バス/無線チャネル）のシミュレーション"""

    def __init__(self):
        self.busy = False
        self.current_sender: Optional[int] = None

    def sense(self) -> bool:
        """キャリアセンス: ビジーなら True"""
        return self.busy

class CSMACANode:
    """CSMA/CA ノードのシミュレーション"""

    def __init__(self, node_id: int, medium: SharedMedium):
        self.node_id = node_id
        self.medium = medium
        self.cw_min = 15   # 最小コンテンションウィンドウ
        self.cw_max = 1023
        self.cw = self.cw_min

    def send(self, data: str, difs_slots: int = 2) -> bool:
        """CSMA/CA でフレームを送信する"""
        print(f"\n[Node {self.node_id}] 送信開始: '{data}'")

        # DIFS 待機
        if self.medium.sense():
            print(f"[Node {self.node_id}] 媒体ビジー → DIFS 待機中...")
            time.sleep(difs_slots * 0.001)  # スロット時間をシミュレート
            if self.medium.sense():
                print(f"[Node {self.node_id}] まだビジー → バックオフ")

        # ランダムバックオフ
        backoff = random.randint(0, self.cw)
        print(f"[Node {self.node_id}] バックオフ = {backoff} スロット")
        time.sleep(backoff * 0.0001)

        # 送信
        if not self.medium.sense():
            self.medium.busy = True
            self.medium.current_sender = self.node_id
            print(f"[Node {self.node_id}] 送信中...")
            time.sleep(0.01)  # 送信時間
            self.medium.busy = False
            self.medium.current_sender = None
            self.cw = self.cw_min   # 成功時はウィンドウリセット
            print(f"[Node {self.node_id}] 送信成功")
            return True
        else:
            # 衝突（CSMA/CA では衝突後にウィンドウを拡大）
            self.cw = min(self.cw * 2 + 1, self.cw_max)
            print(f"[Node {self.node_id}] 衝突！CW を {self.cw} に拡大")
            return False

medium = SharedMedium()
node_a = CSMACANode(1, medium)
node_b = CSMACANode(2, medium)

node_a.send("Hello from A")
node_b.send("Hello from B")
```

## 使用場面

- Wi-Fi の接続品質が悪い際にチャネル干渉やアクセス集中を調査する際に
- 産業用イーサネットで確定的な遅延（TSN）が必要かを評価する際に
- レガシーなハブ環境から全二重スイッチへの移行を検討する際の基礎として

## 参考文献

- [IEEE 802.3 – CSMA/CD Access Method](https://standards.ieee.org/ieee/802.3/7028/)
- [IEEE 802.11 – DCF (Distributed Coordination Function)](https://standards.ieee.org/ieee/802.11/7028/)
- Andrew S. Tanenbaum, "Computer Networks", 5th Edition, Chapter 4.2

<AffiliateBanner site="network_navi" />
