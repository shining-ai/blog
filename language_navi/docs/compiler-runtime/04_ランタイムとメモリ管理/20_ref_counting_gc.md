import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 参照カウント方式 GC

## 参照カウント GC とは

> 参照カウント（Reference Counting）とは、各オブジェクトに「そのオブジェクトを参照しているポインタの数（参照カウント）」を記録し、カウントが 0 になった時点でオブジェクトのメモリを即座に解放するガーベジコレクション（GC）の手法である。

参照カウントの最大の利点は「オブジェクトが不要になった瞬間に即座に解放される」点であり、GC の一時停止（STW: Stop-The-World）が発生しない。このため、リアルタイム性が重要なシステムや、メモリ使用量をリアルタイムに制御したいシステムに適している。C++ のスマートポインタ（`shared_ptr`）・Python・Swift・Rust の `Rc<T>` / `Arc<T>` が参照カウントを採用している。

最大の弱点は **循環参照（Circular Reference）** の処理である。AがBを参照し、BがAを参照するような循環があると、両者のカウントが 0 にならないためメモリが永遠に解放されない。Python はこの問題を解決するため、参照カウントに加えて循環参照を検出するマーク＆スイープ GC を補完的に実行している。Swift・Rust では弱参照（`weak_ptr`・`Weak<T>`）を使って循環を意図的に避ける設計が推奨される。

また、参照カウントはカウントの増減処理（インクリメント・デクリメント）のオーバーヘッドがあり、マルチスレッド環境ではアトミック操作が必要になるためさらに遅くなる（Python の GIL はこれを回避するための仕組みの一つ）。

## 参照カウント GC と他の GC 方式の比較

| 特性 | 参照カウント | マーク＆スイープ | コピー GC |
|------|------------|---------------|---------|
| 解放タイミング | 即座（カウント = 0 時） | GC 実行時 | GC 実行時 |
| STW 停止 | なし（基本） | あり | あり |
| 循環参照 | 処理できない（補完 GC 必要） | 処理できる | 処理できる |
| メモリオーバーヘッド | カウントフィールド | マークビット | 2倍のヒープ領域 |
| CPU オーバーヘッド | 参照操作ごとにカウント増減 | GC フェーズに集中 | GC フェーズに集中 |
| 採用言語 | Python, Swift, C++ shared_ptr | Go（補完）, Ruby | JVM（若い世代） |

```python
# 参照カウントのシミュレーション実装

from __future__ import annotations
from typing import Optional
import weakref

class RCObject:
    """参照カウントを持つオブジェクトのシミュレーション"""
    _all_objects: list['RCObject'] = []  # デバッグ用: 全オブジェクトのリスト

    def __init__(self, name: str, value: object = None):
        self.name = name
        self.value = value
        self.ref_count = 1       # 生成時は 1
        self.references: list['RCObject'] = []  # このオブジェクトが参照するオブジェクト
        RCObject._all_objects.append(self)
        print(f"  [生成] {self.name} (RC={self.ref_count})")

    def add_reference(self, other: 'RCObject') -> None:
        """other への参照を追加する (other の RC を +1)"""
        self.references.append(other)
        other.ref_count += 1
        print(f"  [参照追加] {self.name} → {other.name} (RC={other.ref_count})")

    def release_reference(self, other: 'RCObject') -> None:
        """other への参照を解放する (other の RC を -1)"""
        self.references.remove(other)
        other.ref_count -= 1
        print(f"  [参照解放] {self.name} → {other.name} (RC={other.ref_count})")
        if other.ref_count == 0:
            other._destroy()

    def retain(self) -> None:
        """このオブジェクトの参照を取得 (RC を +1)"""
        self.ref_count += 1
        print(f"  [retain] {self.name} (RC={self.ref_count})")

    def release(self) -> None:
        """このオブジェクトの参照を手放す (RC を -1)"""
        self.ref_count -= 1
        print(f"  [release] {self.name} (RC={self.ref_count})")
        if self.ref_count == 0:
            self._destroy()

    def _destroy(self) -> None:
        """RC が 0 になったので解放する"""
        print(f"  [解放!!] {self.name} をメモリから解放")
        # 自分が参照しているオブジェクトの RC も減らす
        for ref in list(self.references):
            self.release_reference(ref)
        RCObject._all_objects.remove(self)

    @classmethod
    def dump_heap(cls) -> None:
        print(f"\n  ヒープ状態: {len(cls._all_objects)} 個のオブジェクト")
        for obj in cls._all_objects:
            print(f"    {obj.name}: RC={obj.ref_count}")


print("=== 正常なケース ===")
a = RCObject("A", 100)
b = RCObject("B", 200)
a.add_reference(b)
RCObject.dump_heap()

print("\n--- a が b への参照を解放 ---")
a.release_reference(b)

print("\n--- b 自体を解放 ---")
b.release()
RCObject.dump_heap()


print("\n=== 循環参照の問題 ===")
x = RCObject("X")
y = RCObject("Y")
x.add_reference(y)
y.add_reference(x)   # 循環！
RCObject.dump_heap()

print("\n--- x と y のルート参照を解放しても循環があるため解放されない ---")
x.release()  # ルート参照を手放す
y.release()  # ルート参照を手放す
RCObject.dump_heap()
# X と Y の RC は 1 のまま → メモリリーク！
# → 補完 GC（マーク＆スイープ）が必要な理由


print("\n=== Python の sys.getrefcount で実際の RC を確認 ===")
import sys
data = [1, 2, 3]
print(f"data の参照カウント: {sys.getrefcount(data)}")  # 2 (data + getrefcount の引数)
alias = data
print(f"alias を作成後: {sys.getrefcount(data)}")      # 3
del alias
print(f"alias を削除後: {sys.getrefcount(data)}")      # 2
```

## 使用場面

- Python ランタイムのメモリ管理（メインの GC 機構として採用）
- C++ の `std::shared_ptr` / `std::weak_ptr` によるスマートポインタ管理
- Swift の ARC（Automatic Reference Counting）によるメモリ管理
- Rust の `Rc<T>` / `Arc<T>` による明示的な参照カウント型スマートポインタ

## 参考文献

- Wilson, P. R. (1992). Uniprocessor garbage collection techniques. *IWMM '92*.
- [Python — ガベージコレクションの仕組み](https://docs.python.org/ja/3/library/gc.html)
- [Rust — Rc と Arc の使い分け](https://doc.rust-lang.org/book/ch15-04-rc.html)

<AffiliateBanner site="language_navi" />
