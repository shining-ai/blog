import AffiliateBanner from '@site/src/components/AffiliateBanner';

# CSP とチャンネル（Go）

## CSP とは

> CSP（Communicating Sequential Processes）とは、Tony Hoare が1978年に提唱した並行プログラミングの形式モデルであり、独立したプロセスが「チャンネル」と呼ばれる通信路を介して同期的または非同期的にデータをやり取りすることで並行処理を実現する。

CSP の核心的な考え方は **"Do not communicate by sharing memory; instead, share memory by communicating"**（Go の格言）である。共有変数へのロックアクセスではなく、チャンネルへのデータ送受信を通じて状態を受け渡す。これにより競合状態の多くを構造的に防止できる。

Go は CSP を言語仕様に組み込んだ代表的な言語である。`goroutine`（超軽量なグリーンスレッド・数KB のスタック）と `channel`（型付きの通信路）が基本プリミティブで、`go func()` で goroutine を起動し、`ch <- value` で送信・`value := <-ch` で受信する。`select` 文は複数チャンネルを同時に待機し、最初に準備できたものを処理する。

**バッファなしチャンネル**は送受信が同期するランデブー点として機能し、**バッファありチャンネル**はメールボックス的に使える。チャンネルを `close()` することで受信側に完了を通知でき、`range ch` で全受信値を反復処理できる。

## Go のチャンネル操作まとめ

| 操作 | 構文 | 動作 |
|------|------|------|
| 送信（ブロッキング） | `ch <- v` | 受信者が準備できるまでブロック |
| 受信（ブロッキング） | `v := <-ch` | 送信者が準備できるまでブロック |
| バッファ付き送信 | `ch <- v` (ch が非満杯) | 即座に完了 |
| クローズ | `close(ch)` | 以降の受信はゼロ値 + false |
| 範囲受信 | `for v := range ch` | close まで受信し続ける |
| 多重待機 | `select { case ... }` | 準備できたケースを選択 |

```go
package main

import (
	"fmt"
	"sync"
	"time"
)

// ===== パイプラインパターン =====
// 複数の goroutine をチャンネルでつなぐパイプライン

// generator: 整数を生成して channel に送信
func generate(nums ...int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for _, n := range nums {
			out <- n
		}
	}()
	return out
}

// square: 受け取った値を二乗して channel に送信
func square(in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for n := range in {
			out <- n * n
		}
	}()
	return out
}

// ===== ファンアウト / ファンイン =====
// 1つの channel から複数の goroutine に処理を分散し、結果を集約

func fanOut(in <-chan int, numWorkers int) []<-chan int {
	channels := make([]<-chan int, numWorkers)
	for i := 0; i < numWorkers; i++ {
		channels[i] = square(in) // 実際はワーカーごとに異なるロジック
	}
	return channels
}

func merge(channels ...<-chan int) <-chan int {
	var wg sync.WaitGroup
	merged := make(chan int, 10)

	output := func(c <-chan int) {
		defer wg.Done()
		for v := range c {
			merged <- v
		}
	}

	wg.Add(len(channels))
	for _, c := range channels {
		go output(c)
	}

	go func() {
		wg.Wait()
		close(merged)
	}()
	return merged
}

// ===== select によるタイムアウト =====
func fetchWithTimeout(ch <-chan string, timeout time.Duration) (string, bool) {
	select {
	case result := <-ch:
		return result, true
	case <-time.After(timeout):
		return "", false // タイムアウト
	}
}

func main() {
	// パイプライン: 1→4, 2→4, 3→9, 4→16, 5→25
	fmt.Println("=== パイプライン ===")
	nums := generate(1, 2, 3, 4, 5)
	squares := square(nums)
	for v := range squares {
		fmt.Printf("  %d\n", v)
	}

	// select によるタイムアウト
	fmt.Println("\n=== タイムアウト処理 ===")
	slowCh := make(chan string, 1)
	go func() {
		time.Sleep(200 * time.Millisecond)
		slowCh <- "応答データ"
	}()

	if result, ok := fetchWithTimeout(slowCh, 100*time.Millisecond); ok {
		fmt.Printf("  受信: %s\n", result)
	} else {
		fmt.Println("  タイムアウト")
	}

	// done チャンネルによるキャンセル
	fmt.Println("\n=== done チャンネルによるキャンセル ===")
	done := make(chan struct{})
	results := make(chan int, 5)

	go func() {
		for i := 0; ; i++ {
			select {
			case <-done:
				fmt.Println("  goroutine キャンセル")
				return
			case results <- i:
				time.Sleep(10 * time.Millisecond)
			}
		}
	}()

	time.Sleep(35 * time.Millisecond)
	close(done) // キャンセルシグナル
	time.Sleep(20 * time.Millisecond)

	close(results)
	var collected []int
	for v := range results {
		collected = append(collected, v)
	}
	fmt.Printf("  収集結果: %v\n", collected)
}
```

## 使用場面

- Go のバックエンドサービスでのリクエスト並行処理（goroutine + channel）
- データパイプライン処理でのステージ分割（パイプラインパターン）
- ワーカープールパターンによるタスクの並列実行
- `context.Context` を用いたキャンセル・タイムアウト制御

## 参考文献

- Hoare, C. A. R. (1978). Communicating sequential processes. *CACM*, 21(8).
- [The Go Memory Model](https://go.dev/ref/mem)
- [Go Concurrency Patterns](https://go.dev/blog/pipelines)

<AffiliateBanner site="language_navi" />
