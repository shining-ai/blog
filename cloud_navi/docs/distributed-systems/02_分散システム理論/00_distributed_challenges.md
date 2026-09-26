import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 分散システムの困難さ（部分故障・ネットワーク分断）

## 分散システムとは

> 分散システムとは、ネットワークで接続された複数のコンピュータが協調して単一のまとまったシステムとして動作するアーキテクチャであり、高可用性・スケーラビリティを得る代わりに、単一マシンには存在しない固有の困難さを伴う。

Lamportの有名な格言「あなたが聞いたことのないコンピュータの故障があなたのコンピュータを動作不能にすることで、分散システムを認識できる」が示すように、分散システムの根本的な困難さはネットワークを介して通信する複数ノードの協調にある。

**部分故障（Partial Failure）**は分散システム固有の問題だ。単一マシンではプロセスがクラッシュすればすぐにわかるが、分散システムではあるノードは正常でも別のノードが落ちている状態（部分故障）が発生する。さらに困難なのは、ノードが「故障しているのか、単に遅いのか」を区別できない点だ。

**ネットワーク分断（Network Partition）**はノード間の通信が遮断される状態だ。分断が起きると、ノードは相手が故障したのか通信不能なだけなのか判断できない。CAP定理が示すように、分断時の一貫性と可用性のどちらを優先するかがシステム設計の核心となる。

**クロックのずれ**も分散システムの難問だ。分散ノード間では完全に同期したクロックを持てないため、「どのイベントが先か」を判断するためにLamport論理時計やベクタクロックが必要になる。

## 分散システムの主要な問題

| 問題 | 説明 | 対策 |
|------|------|------|
| 部分故障 | 一部のノードが落ちても他は動作継続 | タイムアウト・リトライ・サーキットブレーカー |
| ネットワーク分断 | ノード間通信が遮断される | CAP定理に従った設計・結果整合性 |
| クロックのずれ | ノード間の時刻が一致しない | 論理時計・NTP・GPS時計 |
| 拜占庭障害 | ノードが誤った情報を送る | BFTコンセンサス（ブロックチェーン等） |
| メッセージの重複・順序不同 | ネットワークの不安定さ | 冪等性・シーケンス番号・べき等プロセッサ |

```python
# 分散システムの困難さを示す例: タイムアウトとリトライの実装

import time
import random
import logging
from functools import wraps
from typing import Callable, Any

logger = logging.getLogger(__name__)

class NetworkPartitionError(Exception):
    """ネットワーク分断のシミュレーション"""
    pass

class PartialFailureError(Exception):
    """部分故障のシミュレーション"""
    pass

def retry_with_backoff(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    exceptions: tuple = (Exception,)
) -> Callable:
    """
    指数バックオフ付きリトライデコレータ
    分散システムでの一時的な障害に対処するための基本パターン
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            delay = base_delay
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_retries:
                        logger.error(f"All {max_retries} retries exhausted: {e}")
                        raise

                    # ジッターを加えてサンダリングハードを防ぐ
                    jitter = random.uniform(0, delay * 0.1)
                    sleep_time = min(delay + jitter, max_delay)
                    logger.warning(
                        f"Attempt {attempt + 1} failed: {e}. "
                        f"Retrying in {sleep_time:.2f}s"
                    )
                    time.sleep(sleep_time)
                    delay = min(delay * 2, max_delay)  # 指数バックオフ
        return wrapper
    return decorator

@retry_with_backoff(max_retries=3, base_delay=0.5)
def call_remote_service(service_url: str, payload: dict) -> dict:
    """
    リモートサービスを呼び出す（部分故障・ネットワーク遅延を想定）
    """
    # 実際にはHTTPクライアントを使うが、ここではシミュレーション
    if random.random() < 0.3:  # 30%の確率で失敗
        raise NetworkPartitionError(f"Cannot reach {service_url}")

    return {"status": "ok", "data": payload}

# 冪等性の実装例（重複リクエスト対策）
processed_requests = set()  # 実際はRedisやDBで管理

def idempotent_process(request_id: str, payload: dict) -> dict:
    """
    冪等なリクエスト処理
    同じ request_id で複数回呼ばれても同じ結果を返す
    """
    if request_id in processed_requests:
        logger.info(f"Duplicate request detected: {request_id}")
        return {"status": "already_processed", "request_id": request_id}

    # 処理を実行
    result = {"status": "processed", "request_id": request_id, "data": payload}
    processed_requests.add(request_id)
    return result
```

## 使用場面

- マイクロサービスのサービス間通信でタイムアウトとリトライを設計する場合
- データベースのフェイルオーバー設計で部分故障への対処を考える場合
- 分散トランザクションの設計でネットワーク分断時の整合性を検討する場合
- Kafkaやメッセージキューで重複配信への冪等な処理を実装する場合

## 参考文献

- [Designing Data-Intensive Applications — Martin Kleppmann](https://dataintensive.net/)
- [Fallacies of Distributed Computing](https://en.wikipedia.org/wiki/Fallacies_of_distributed_computing)
- [AWS — 分散システムにおける障害モード](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)

<AffiliateBanner site="cloud_navi" />
