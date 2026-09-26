import AffiliateBanner from '@site/src/components/AffiliateBanner';

# イベントループ（Node.js の仕組み）

## イベントループとは

> イベントループとは、シングルスレッドで非同期 I/O を効率的に処理するためのプログラム実行モデルであり、I/O 完了・タイマー・ユーザーイベントなどの「イベント」が発生するたびに対応するコールバックをキューから取り出して実行するループ処理である。

Node.js のイベントループは **libuv** ライブラリが実装しており、OS の非同期 I/O 機能（Linux の epoll・macOS の kqueue・Windows の IOCP）をラップしている。Node.js はシングルスレッドで動作するが、I/O 待ちの間はスレッドをブロックせずにイベントループに制御を返すため、多数の並行接続を効率的に捌ける。

イベントループには複数のフェーズがある。1. **timers**：`setTimeout`・`setInterval` のコールバックを実行。2. **I/O callbacks**：前のループで延期された I/O コールバックを実行。3. **idle/prepare**：内部処理。4. **poll**：新しい I/O イベントを取得・実行（ここで I/O を待機）。5. **check**：`setImmediate` のコールバックを実行。6. **close callbacks**：`close` イベントのコールバックを実行。

`process.nextTick` と `Promise.then`（マイクロタスク）は各フェーズの合間に最優先で実行される。CPU を占有するブロッキング処理（重い計算）をメインスレッドで実行するとイベントループがブロックされ、他のリクエストが詰まるため注意が必要である。

## イベントループのフェーズ

| フェーズ | 実行内容 | 代表 API |
|---------|---------|---------|
| timers | タイマーコールバック | setTimeout・setInterval |
| poll | I/O イベント待機・処理 | fs.readFile・http.request |
| check | setImmediate コールバック | setImmediate |
| close | クローズコールバック | socket.on('close') |
| マイクロタスク | 各フェーズ間で実行 | Promise.then・process.nextTick |

```javascript
// Node.js イベントループの動作確認デモ

// ===== 実行順序の確認 =====
console.log("1: 同期コード開始");

setTimeout(() => console.log("5: setTimeout(0) - timers フェーズ"), 0);

Promise.resolve()
  .then(() => console.log("3: Promise.then - マイクロタスク"))
  .then(() => console.log("4: Promise.then (2nd) - マイクロタスク"));

process.nextTick(() => console.log("2: process.nextTick - 最優先マイクロタスク"));

setImmediate(() => console.log("6: setImmediate - check フェーズ"));

console.log("1: 同期コード終了");

// 出力順序:
// 1: 同期コード開始
// 1: 同期コード終了
// 2: process.nextTick - 最優先マイクロタスク
// 3: Promise.then - マイクロタスク
// 4: Promise.then (2nd) - マイクロタスク
// 5: setTimeout(0) - timers フェーズ
// 6: setImmediate - check フェーズ


// ===== ブロッキング vs ノンブロッキング =====
const { performance } = require("perf_hooks");

// NG: CPU ヘビーな処理でイベントループをブロック
function blockingCompute(n) {
  let result = 0;
  for (let i = 0; i < n; i++) result += i;
  return result;
}

// OK: setImmediate で分割実行（イベントループを解放しながら処理）
function nonBlockingCompute(n, callback) {
  let result = 0;
  let i = 0;
  const CHUNK = 100_000;

  function processChunk() {
    const end = Math.min(i + CHUNK, n);
    while (i < end) {
      result += i++;
    }
    if (i < n) {
      setImmediate(processChunk); // 次のチャンクは次のイベントループで
    } else {
      callback(result);
    }
  }
  setImmediate(processChunk);
}

// ===== 非同期 I/O のデモ =====
const http = require("http");

// シンプルな HTTP サーバー（イベントループで並行リクエスト処理）
const server = http.createServer(async (req, res) => {
  if (req.url === "/fast") {
    // 軽い処理: 即座に応答
    res.writeHead(200);
    res.end("fast response");
  } else if (req.url === "/slow") {
    // 非同期 I/O 待ち: イベントループをブロックしない
    await new Promise((resolve) => setTimeout(resolve, 100));
    res.writeHead(200);
    res.end("slow response");
  } else if (req.url === "/blocking") {
    // NG: ブロッキング計算（他のリクエストを詰まらせる）
    const result = blockingCompute(10_000_000);
    res.writeHead(200);
    res.end(`blocking result: ${result}`);
  }
});

// server.listen(3000, () => console.log("Server running on port 3000"));
// 注: このサンプルは実行環境で listen を有効にして試してください


// ===== Worker Threads で CPU バウンドを別スレッドに移譲 =====
// const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");
//
// if (isMainThread) {
//   const worker = new Worker(__filename, { workerData: { n: 10_000_000 } });
//   worker.on("message", (result) => console.log(`Worker result: ${result}`));
// } else {
//   const result = blockingCompute(workerData.n);
//   parentPort.postMessage(result);
// }

console.log("イベントループデモ完了");
```

## 使用場面

- Node.js による高並行 Web API サーバー（REST・GraphQL・WebSocket）
- リアルタイムチャットや通知サービスでの大量コネクション維持
- ストリーミング処理（動画・ログのリアルタイム転送）
- CPU バウンドな処理を Worker Threads に分離してスケールさせるアーキテクチャ

## 参考文献

- [Node.js イベントループ公式ドキュメント](https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick)
- [libuv ドキュメント](https://libuv.org/)
- Simpson, K. (2015). *You Don't Know JS: Async & Performance*. O'Reilly.

<AffiliateBanner site="language_navi" />
