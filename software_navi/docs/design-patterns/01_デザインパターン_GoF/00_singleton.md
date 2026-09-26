import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Singleton パターン

## Singleton とは

> クラスのインスタンスが必ず1つしか生成されないことを保証し、そのインスタンスへのグローバルなアクセスポイントを提供する。

Singleton パターンは GoF（Gang of Four）の生成パターンのひとつです。設定オブジェクト・ロガー・コネクションプールなど、アプリケーション全体で「唯一の存在」として扱うべきオブジェクトに適用します。

インスタンスの生成を制御することで、共有リソースの競合や複数初期化による不整合を防ぎます。ただし、グローバル状態を持つため テストしにくく、依存性が隠蔽されるという欠点があります。モダンな設計では DI（依存性注入）で管理する方が望ましい場合も多くあります。

マルチスレッド環境では、インスタンス生成のタイミングで競合が発生しないよう二重チェックロックや言語の機能を活用する必要があります。

## パターンの構造

| 要素 | 役割 |
|------|------|
| Singleton クラス | インスタンス生成ロジックを持ち、唯一のインスタンスを返す |
| `_instance` | 唯一のインスタンスへの参照を保持するクラス変数 |
| `get_instance()` | インスタンスが存在しなければ生成し返すメソッド |

```python title="Singleton パターン（Python）"
import threading

class Singleton:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:  # スレッドセーフな二重チェック
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        # __new__ で制御するため __init__ は何度呼ばれても安全にする
        pass

# 使用例
a = Singleton()
b = Singleton()
print(a is b)  # True — 同一インスタンス
```

```typescript title="Singleton パターン（TypeScript）"
class DatabaseConnection {
  private static instance: DatabaseConnection;
  private connection: string;

  private constructor() {
    this.connection = "connected to DB";
  }

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  query(sql: string): string {
    return `[${this.connection}] ${sql}`;
  }
}

const db1 = DatabaseConnection.getInstance();
const db2 = DatabaseConnection.getInstance();
console.log(db1 === db2); // true
```

## 使用場面

- アプリケーション設定（Config）オブジェクトの管理
- ロギングライブラリのグローバルインスタンス
- データベースコネクションプールの管理

## 参考文献

- Erich Gamma, et al., *Design Patterns: Elements of Reusable Object-Oriented Software*, Addison-Wesley, 1994

<AffiliateBanner site="software_navi" />
