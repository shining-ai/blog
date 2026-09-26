import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Command パターン

## Command とは

> リクエストをオブジェクトとしてカプセル化することで、異なるリクエスト・キュー・ログリクエストでクライアントをパラメタライズし、取り消し可能な操作をサポートする。

Command パターンは GoF の振る舞いパターンのひとつです。「何かをしてほしい」というリクエストそのものをオブジェクトに変換します。これにより、操作の実行・取り消し・再実行・キューイング・ロギングといった処理を統一的に扱えるようになります。

通常、操作を直接メソッド呼び出しで行うと、呼び出し元と実行ロジックが密結合になります。Command パターンでは Invoker（呼び出し側）、Command（操作の抽象）、Receiver（実際の処理実行者）に分離します。

テキストエディタのアンドゥ・リドゥやトランザクション管理が典型的なユースケースです。実行した Command を履歴リストに積んでいくことで、逆順に undo() を呼ぶだけで操作を取り消せます。

## パターンの構造

| 要素 | 役割 |
|------|------|
| Command | execute()/undo() を定義するインタフェース |
| ConcreteCommand | 具体的な操作を実装し、Receiver への参照を持つ |
| Receiver | 実際の処理を行うオブジェクト |
| Invoker | Command を保持し execute() を呼ぶ |
| Client | ConcreteCommand を生成し Invoker に渡す |

```python title="Command パターン — テキストエディタのアンドゥ（Python）"
from abc import ABC, abstractmethod

class Command(ABC):
    @abstractmethod
    def execute(self) -> None: ...

    @abstractmethod
    def undo(self) -> None: ...


class TextEditor:
    """Receiver: 実際のテキスト操作を担う"""
    def __init__(self):
        self.text = ""

    def insert(self, text: str) -> None:
        self.text += text

    def delete(self, length: int) -> None:
        self.text = self.text[:-length]


class InsertCommand(Command):
    def __init__(self, editor: TextEditor, text: str):
        self._editor = editor
        self._text = text

    def execute(self) -> None:
        self._editor.insert(self._text)

    def undo(self) -> None:
        self._editor.delete(len(self._text))


class CommandHistory:
    """Invoker: コマンドを実行し履歴を管理する"""
    def __init__(self):
        self._history: list[Command] = []

    def execute(self, cmd: Command) -> None:
        cmd.execute()
        self._history.append(cmd)

    def undo(self) -> None:
        if self._history:
            self._history.pop().undo()


editor = TextEditor()
history = CommandHistory()

history.execute(InsertCommand(editor, "Hello"))
history.execute(InsertCommand(editor, ", World"))
print(editor.text)   # Hello, World

history.undo()
print(editor.text)   # Hello
```

```typescript title="Command パターン — ボタン操作（TypeScript）"
interface Command {
  execute(): void;
  undo(): void;
}

class Light {
  private on = false;
  turnOn(): void  { this.on = true;  console.log("Light ON");  }
  turnOff(): void { this.on = false; console.log("Light OFF"); }
}

class TurnOnCommand implements Command {
  constructor(private light: Light) {}
  execute(): void { this.light.turnOn(); }
  undo(): void    { this.light.turnOff(); }
}

class RemoteControl {
  private history: Command[] = [];

  press(cmd: Command): void {
    cmd.execute();
    this.history.push(cmd);
  }

  undo(): void {
    this.history.pop()?.undo();
  }
}

const remote = new RemoteControl();
const light = new Light();
remote.press(new TurnOnCommand(light)); // Light ON
remote.undo();                          // Light OFF
```

## 使用場面

- テキストエディタやグラフィックツールのアンドゥ・リドゥ機能
- ジョブキュー・バッチ処理で操作をキューに積んで順次実行するとき
- トランザクションログを残し、障害後に操作を再実行（リプレイ）したいとき
- GUI のボタンやメニュー項目に操作を動的に割り当てたいとき

## 参考文献

- Erich Gamma, et al., *Design Patterns: Elements of Reusable Object-Oriented Software*, Addison-Wesley, 1994

<AffiliateBanner site="software_navi" />
