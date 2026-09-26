import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Chain of Responsibility パターン

## Chain of Responsibility とは

> 複数のオブジェクトにリクエストを処理する機会を与えることで、リクエストの送信者と受信者の結合を避ける。受信オブジェクトをチェーンにつなぎ、リクエストをチェーンに沿って、処理されるまで渡していく。

Chain of Responsibility（責任の連鎖）パターンは GoF の振る舞いパターンのひとつです。リクエストを処理できるか判断するハンドラをチェーン状につなぎ、先頭から順に渡します。処理できるハンドラが見つかれば処理して終了し、できなければ次のハンドラに委ねます。

送信者はチェーンの先頭にリクエストを送るだけでよく、どのハンドラが処理するかを知る必要がありません。ハンドラの追加・削除・順序変更もチェーンの構成を変えるだけで対応できます。

HTTP ミドルウェア・イベントバブリング・ロギングフィルタ・認可チェックなどがこのパターンの実例です。

## パターンの構造

| 要素 | 役割 |
|------|------|
| Handler | リクエストを処理するインタフェース。次のハンドラへの参照を持つ |
| ConcreteHandler | リクエストを処理するか、次のハンドラに渡すかを決定する |
| Client | チェーンの先頭にリクエストを送る |

```python title="Chain of Responsibility — ログレベルフィルタ（Python）"
from __future__ import annotations
from abc import ABC, abstractmethod
from enum import IntEnum

class Level(IntEnum):
    DEBUG = 10
    INFO  = 20
    WARN  = 30
    ERROR = 40

class LogHandler(ABC):
    def __init__(self, level: Level):
        self._level = level
        self._next: LogHandler | None = None

    def set_next(self, handler: LogHandler) -> LogHandler:
        self._next = handler
        return handler

    def handle(self, level: Level, message: str) -> None:
        if level >= self._level:
            self._write(level, message)
        if self._next:
            self._next.handle(level, message)

    @abstractmethod
    def _write(self, level: Level, message: str) -> None: ...


class ConsoleHandler(LogHandler):
    def _write(self, level: Level, message: str) -> None:
        print(f"[CONSOLE] {level.name}: {message}")

class FileHandler(LogHandler):
    def _write(self, level: Level, message: str) -> None:
        print(f"[FILE]    {level.name}: {message}")

class AlertHandler(LogHandler):
    def _write(self, level: Level, message: str) -> None:
        print(f"[ALERT]   {level.name}: {message}")


# チェーン構築
console = ConsoleHandler(Level.DEBUG)
file    = FileHandler(Level.WARN)
alert   = AlertHandler(Level.ERROR)
console.set_next(file).set_next(alert)

console.handle(Level.DEBUG, "start")   # CONSOLE のみ
console.handle(Level.WARN,  "disk low") # CONSOLE + FILE
console.handle(Level.ERROR, "crash")   # CONSOLE + FILE + ALERT
```

```typescript title="Chain of Responsibility — HTTPミドルウェア（TypeScript）"
type Request  = { user?: string; body: string };
type Response = { status: number; body: string };
type Next     = () => Response;

type Middleware = (req: Request, next: Next) => Response;

function compose(middlewares: Middleware[]): Middleware {
  return (req, finalHandler) => {
    const dispatch = (i: number): Response => {
      const fn = middlewares[i];
      if (!fn) return finalHandler();
      return fn(req, () => dispatch(i + 1));
    };
    return dispatch(0);
  };
}

const auth: Middleware = (req, next) => {
  if (!req.user) return { status: 401, body: "Unauthorized" };
  return next();
};

const logger: Middleware = (req, next) => {
  console.log(`[LOG] user=${req.user}`);
  return next();
};

const handler = compose([auth, logger]);
console.log(handler({ body: "hi" },      () => ({ status: 200, body: "ok" })));
console.log(handler({ user: "alice", body: "hi" }, () => ({ status: 200, body: "ok" })));
```

## 使用場面

- Web フレームワークのミドルウェアチェーン（認証・ロギング・レート制限）
- GUI のイベントバブリング（子要素から親要素へのイベント伝播）
- 承認ワークフロー（担当者 → マネージャ → 役員の順に処理権限を委譲）
- ログハンドラで出力先（コンソール・ファイル・外部サービス）を段階的にフィルタするとき

## 参考文献

- Erich Gamma, et al., *Design Patterns: Elements of Reusable Object-Oriented Software*, Addison-Wesley, 1994

<AffiliateBanner site="software_navi" />
