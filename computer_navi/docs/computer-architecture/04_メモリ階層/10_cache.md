---
sidebar_position: 1
displayed_sidebar: computerArchitectureSidebar
---

# キャッシュの仕組み（直接マッピング・セットアソシアティブ）

## 概要

キャッシュとは、

> DRAM より高速な SRAM を用いて、主記憶の頻繁にアクセスされるデータのコピーを保持するバッファ

です。

キャッシュのマッピング方式によって、ヒット率・実装コスト・スラッシングのリスクが変わります。

## マッピング方式の比較

| 方式 | 特徴 | メリット | デメリット |
|---|---|---|---|
| ダイレクトマップ | アドレス→1ライン固定 | 実装簡単・高速 | スラッシング発生 |
| フルアソシアティブ | 任意のラインに配置 | ヒット率最高 | 比較回路が大規模 |
| n ウェイセットアソシアティブ | セット内の n ライン | バランス良好 | 現代 CPU の標準 |

## ダイレクトマップの仕組み

```
物理アドレス（32ビット）の分解:
  [タグ(20b)][インデックス(8b)][オフセット(4b)]
         ↓
  インデックスでキャッシュラインを特定
  タグが一致すればヒット、不一致でミス→追い出し
```

## キャッシュラインと置換ポリシー

| ポリシー | 説明 |
|---|---|
| LRU（Least Recently Used） | 最も長く未使用のラインを置換 |
| LFU（Least Frequently Used） | 使用頻度が低いラインを置換 |
| FIFO | 最初に入ったラインを置換 |
| Random | ランダムに置換（実装が簡単） |

## 書き込みポリシー

| ポリシー | 動作 | 特徴 |
|---|---|---|
| Write-through | キャッシュと主記憶を同時更新 | 整合性高い・帯域消費大 |
| Write-back | キャッシュのみ更新、後でまとめて書き戻し | 高速・ダーティビット管理が必要 |

## MESI プロトコル（マルチコアの一貫性）

```
M（Modified）: キャッシュに存在し変更済み（他コアにない）
E（Exclusive）: キャッシュに存在し未変更（他コアにない）
S（Shared）: 複数コアが保持・変更なし
I（Invalid）: 無効（次アクセスでフェッチ必要）
```

## 実装：キャッシュシミュレータ

```python title="ダイレクトマップキャッシュ"
class DirectMappedCache:
    def __init__(self, lines: int, line_size: int = 64):
        self.lines = lines
        self.line_size = line_size
        self.cache = [None] * lines
        self.hits = self.misses = 0

    def access(self, address: int) -> bool:
        offset = address % self.line_size
        index  = (address // self.line_size) % self.lines
        tag    = address // (self.line_size * self.lines)

        if self.cache[index] == tag:
            self.hits += 1
            return True
        else:
            self.cache[index] = tag
            self.misses += 1
            return False

cache = DirectMappedCache(lines=4, line_size=4)
addrs = [0, 1, 2, 3, 4, 0, 4, 0]  # 4と0はスラッシング
for a in addrs:
    hit = cache.access(a)
    print(f"addr={a}: {'HIT' if hit else 'MISS'}")
print(f"hit rate: {cache.hits/(cache.hits+cache.misses):.1%}")
```

## 使用場面

- **コンパイラ最適化**: キャッシュ効率を意識したコード生成
- **行列演算**: ブロッキングで L1/L2 に収まるサイズで計算
- **データベース**: バッファプールのページ置換ポリシー
