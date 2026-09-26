import AffiliateBanner from '@site/src/components/AffiliateBanner';

# async/await と非同期ランタイム

## async/await とは

> async/await とは、非同期処理をコールバックや Promise チェーンを使わずに、同期コードと同じような直線的な記述スタイルで書くための言語構文であり、コンパイラやランタイムが内部でコルーチン・ステートマシンに変換して実行する。

非同期処理の必要性は I/O 待ち（ネットワーク・ファイル・DB）の間に CPU を有効活用することにある。従来のコールバックスタイルは**コールバック地獄**と呼ばれるネスト構造を生み、Promise（JavaScript）・Future（Scala）・Task（C#）が改善策として登場した。`async/await` はその糖衣構文であり、非同期処理を同期コードとほぼ同じ見た目で記述できる。

コンパイラは `async` 関数を**ステートマシン**に変換する。`await` の位置が状態遷移点になり、`await` に達すると関数の実行を中断して非同期ランタイム（イベントループ・Tokio・asyncio など）に制御を返す。I/O が完了したら再び中断した点から再開する。この「中断と再開」を担う仕組みが**コルーチン**（Python・Kotlin）・**フューチャー/タスク**（Rust Tokio）である。

**Rust の async/await** は特にゼロコストの設計が際立ち、`async` 関数はコンパイル時にステートマシン構造体に変換されヒープ割り当てなしで実行できる（ただし実行には Tokio などのランタイムが必要）。

## async/await の言語別比較

| 言語 | ランタイム | 実行モデル | 特徴 |
|------|-----------|-----------|------|
| JavaScript | V8 + イベントループ | シングルスレッド | Promise ベース |
| Python | asyncio | シングルスレッド + GIL | コルーチン |
| Rust | Tokio / async-std | マルチスレッド | ゼロコスト抽象 |
| C# | CLR + TaskScheduler | マルチスレッド | 最初期の実装（2012） |
| Kotlin | コルーチンライブラリ | マルチスレッド | 構造化並行性 |

```python
# Python asyncio を用いた async/await の実装デモ

import asyncio
import time
from typing import Coroutine

# ===== 基本的な async/await =====
async def fetch_data(url: str, delay: float) -> dict:
    """I/O 待ちを模擬する非同期関数"""
    print(f"  [{url}] フェッチ開始")
    await asyncio.sleep(delay)  # ← ここで制御をイベントループに返す
    print(f"  [{url}] フェッチ完了（{delay}s）")
    return {"url": url, "data": f"data from {url}"}


async def sequential_fetch() -> None:
    """逐次実行：合計時間 = 各リクエストの合計"""
    start = time.perf_counter()
    r1 = await fetch_data("https://api1.example.com", 0.1)
    r2 = await fetch_data("https://api2.example.com", 0.15)
    r3 = await fetch_data("https://api3.example.com", 0.08)
    elapsed = time.perf_counter() - start
    print(f"  逐次実行: {elapsed:.3f}s")


async def concurrent_fetch() -> None:
    """並行実行：合計時間 ≈ 最も遅いリクエストの時間"""
    start = time.perf_counter()
    results = await asyncio.gather(
        fetch_data("https://api1.example.com", 0.1),
        fetch_data("https://api2.example.com", 0.15),
        fetch_data("https://api3.example.com", 0.08),
    )
    elapsed = time.perf_counter() - start
    print(f"  並行実行: {elapsed:.3f}s, 結果数: {len(results)}")


# ===== エラーハンドリング =====
async def fetch_with_timeout(url: str, timeout: float) -> dict | None:
    try:
        return await asyncio.wait_for(
            fetch_data(url, 0.5),  # 0.5s かかるリクエスト
            timeout=timeout
        )
    except asyncio.TimeoutError:
        print(f"  [{url}] タイムアウト（{timeout}s）")
        return None


# ===== 構造化並行性（Python 3.11+ のTaskGroup） =====
async def structured_concurrency() -> None:
    results = []
    async with asyncio.TaskGroup() as tg:
        task1 = tg.create_task(fetch_data("api1", 0.05))
        task2 = tg.create_task(fetch_data("api2", 0.08))
        task3 = tg.create_task(fetch_data("api3", 0.03))
    # TaskGroup 終了時に全タスクの完了を保証
    results = [task1.result(), task2.result(), task3.result()]
    print(f"  TaskGroup 結果: {len(results)} 件")


async def main() -> None:
    print("=== 逐次 fetch ===")
    await sequential_fetch()

    print("\n=== 並行 fetch（asyncio.gather）===")
    await concurrent_fetch()

    print("\n=== タイムアウト付き fetch ===")
    await fetch_with_timeout("api", timeout=0.2)   # タイムアウトしない
    await fetch_with_timeout("api", timeout=0.3)   # タイムアウトする

    print("\n=== 構造化並行性（TaskGroup）===")
    await structured_concurrency()


asyncio.run(main())
```

## 使用場面

- Web サーバーで多数のクライアントリクエストを並行処理するとき
- 複数の外部 API や DB クエリを並行実行してレイテンシを削減するとき
- Rust の Tokio で高スループットな非同期 I/O サーバーを構築するとき
- Python の FastAPI・aiohttp による非同期 Web アプリケーション開発

## 参考文献

- [Python asyncio ドキュメント](https://docs.python.org/3/library/asyncio.html)
- [Rust async book](https://rust-lang.github.io/async-book/)
- Klabnik, S. & Nichols, C. (2022). *The Rust Programming Language*, Chapter 17.

<AffiliateBanner site="language_navi" />
