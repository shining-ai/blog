import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Iterator パターン

## Iterator とは

> 集約オブジェクトの内部表現を公開することなく、その要素に順番にアクセスする方法を提供する。

Iterator パターンは GoF の振る舞いパターンのひとつです。コレクション（配列・リスト・ツリーなど）の走査ロジックをコレクション自身から切り離し、統一されたインタフェースで要素に順次アクセスできるようにします。

このパターンの最大の利点は「走査方法を変えてもクライアントコードを変えなくてよい」点です。前向き走査・逆順走査・深さ優先・幅優先など、複数の走査アルゴリズムを同じインタフェースで提供できます。

Python の `__iter__`/`__next__`、Java の `Iterator<T>`、JavaScript の `Symbol.iterator` は、このパターンが言語レベルに組み込まれた例です。for-of ループや拡張 for 文の背後では必ず Iterator が動いています。

## パターンの構造

| 要素 | 役割 |
|------|------|
| Iterator | hasNext()/next() を定義するインタフェース |
| ConcreteIterator | 具体的な走査ロジックを実装する |
| Aggregate | Iterator を生成するインタフェース |
| ConcreteAggregate | 要素を保持し、Iterator を返す |

```python title="Iterator パターン — カスタムレンジイテレータ（Python）"
class CountDown:
    """Aggregate: カウントダウンするコレクション"""
    def __init__(self, start: int):
        self._start = start

    def __iter__(self):
        return CountDownIterator(self._start)


class CountDownIterator:
    """ConcreteIterator: 逆順走査"""
    def __init__(self, current: int):
        self._current = current

    def __iter__(self):
        return self

    def __next__(self) -> int:
        if self._current < 0:
            raise StopIteration
        value = self._current
        self._current -= 1
        return value


for n in CountDown(5):
    print(n, end=" ")
# 5 4 3 2 1 0


# ジェネレータを使った簡潔な実装
def fibonacci(limit: int):
    a, b = 0, 1
    while a <= limit:
        yield a
        a, b = b, a + b

print(list(fibonacci(20)))  # [0, 1, 1, 2, 3, 5, 8, 13]
```

```typescript title="Iterator パターン — ツリー走査（TypeScript）"
interface Iterator<T> {
  hasNext(): boolean;
  next(): T;
}

class TreeNode {
  constructor(
    public value: number,
    public left?: TreeNode,
    public right?: TreeNode,
  ) {}
}

class InOrderIterator implements Iterator<number> {
  private stack: TreeNode[] = [];

  constructor(root?: TreeNode) {
    this.pushLeft(root);
  }

  private pushLeft(node?: TreeNode): void {
    while (node) {
      this.stack.push(node);
      node = node.left;
    }
  }

  hasNext(): boolean { return this.stack.length > 0; }

  next(): number {
    const node = this.stack.pop()!;
    this.pushLeft(node.right);
    return node.value;
  }
}

const root = new TreeNode(4,
  new TreeNode(2, new TreeNode(1), new TreeNode(3)),
  new TreeNode(6, new TreeNode(5), new TreeNode(7)),
);

const iter = new InOrderIterator(root);
while (iter.hasNext()) {
  process.stdout.write(iter.next() + " ");
}
// 1 2 3 4 5 6 7
```

## 使用場面

- 配列・リスト・ツリー・グラフなど異なるデータ構造を統一インタフェースで走査したいとき
- 走査方法（前向き・後ろ向き・深さ優先など）を複数提供したいとき
- コレクションの内部実装を隠蔽しつつ要素へのアクセスを提供したいとき

## 参考文献

- Erich Gamma, et al., *Design Patterns: Elements of Reusable Object-Oriented Software*, Addison-Wesley, 1994

<AffiliateBanner site="software_navi" />
