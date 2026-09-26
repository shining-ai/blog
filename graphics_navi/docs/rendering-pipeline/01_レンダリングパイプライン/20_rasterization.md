import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ラスタライゼーション

## ラスタライゼーションとは

> ラスタライゼーション（Rasterization）は、クリップ空間の三角形プリミティブをピクセルグリッド上のフラグメントの集合に変換する固定機能ステージであり、バリセントリック座標を用いて頂点属性をフラグメントに補間する。

「ラスタライズ」とは「連続的な幾何形状をピクセルのグリッドに変換する」操作です。ディスプレイはピクセルの集合体なので、どの三角形がどのピクセルに対応するかを判定する必要があります。GPUはこれを固定機能ハードウェアで超高速に実行します。

処理の流れは次の通りです。①クリッピング：ビュー錐台の外側にある三角形部分を除去します。②透視除算：クリップ座標を $w$ で割って NDC に変換します。③ビューポート変換：NDC のピクセル座標系への変換です。④三角形内判定：各ピクセルが三角形の内側かどうかを**エッジ関数**（半空間テスト）で判定します。⑤**バリセントリック補間**：三角形内のフラグメントに対し、3頂点の属性（UV・法線・色など）を重心座標を使って補間します。

この補間が **パースペクティブコレクト補間**である点も重要です。透視投影では画面上での等距離が3D空間での等距離に対応しないため、単純な線形補間では歪みが生じます。GPUは $1/w$ で重み付けした補間を自動的に行います。

## ラスタライゼーションのパラメータ

| 設定項目 | 選択肢 | 説明 |
|---------|--------|------|
| 塗りつぶしモード | FILL / LINE / POINT | ポリゴン塗り方 |
| カリングモード | NONE / BACK / FRONT | 裏面除去 |
| フロントフェース | CW / CCW | 表面の頂点順序 |
| マルチサンプリング | 1x / 4x / 8x / 16x | MSAA のサンプル数 |
| ラインの太さ | 1px〜N px | ワイヤーフレーム用 |

```python
import numpy as np

def edge_function(a, b, c):
    """エッジ関数（三角形内外判定）
    正なら c は (a→b) の左側（三角形内側）
    """
    return (c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])

def rasterize_triangle(v0, v1, v2, width, height):
    """ソフトウェアラスタライザ（教育用）"""
    # バウンディングボックス
    min_x = max(0, int(min(v0[0], v1[0], v2[0])))
    max_x = min(width-1, int(max(v0[0], v1[0], v2[0])))
    min_y = max(0, int(min(v0[1], v1[1], v2[1])))
    max_y = min(height-1, int(max(v0[1], v1[1], v2[1])))

    area = edge_function(v0, v1, v2)
    if abs(area) < 1e-6:
        return []

    fragments = []
    for y in range(min_y, max_y + 1):
        for x in range(min_x, max_x + 1):
            p = np.array([x + 0.5, y + 0.5])  # ピクセル中心
            w0 = edge_function(v1, v2, p)
            w1 = edge_function(v2, v0, p)
            w2 = edge_function(v0, v1, p)
            # 三角形の内側かどうか
            if w0 >= 0 and w1 >= 0 and w2 >= 0:
                # バリセントリック座標
                bary = np.array([w0, w1, w2]) / area
                fragments.append((x, y, bary))
    return fragments

# 画面座標の三角形
v0 = np.array([100.0, 50.0])
v1 = np.array([200.0, 200.0])
v2 = np.array([50.0, 200.0])

frags = rasterize_triangle(v0, v1, v2, 320, 240)
print(f"生成されたフラグメント数: {len(frags)}")
print(f"最初のフラグメント: pixel=({frags[0][0]},{frags[0][1]}), bary={frags[0][2].round(3)}")
```

## 使用場面

- リアルタイムレンダリングの中心処理（現代の GPU は全てラスタライザを内蔵）
- ワイヤーフレームレンダリング（LINE モード）でのデバッグ可視化
- MSAA（マルチサンプルアンチエイリアシング）によるジャギー低減
- シャドウマップの生成（デプスのみをラスタライズ）
- 2D UIレンダリング（テクスチャ貼りの四角形をラスタライズ）

## 参考文献

- [Scratchapixel — Rasterization: a Practical Implementation](https://www.scratchapixel.com/lessons/3d-basic-rendering/rasterization-practical-implementation)
- [Tiny Renderer — GitHub](https://github.com/ssloy/tinyrenderer)
- Akenine-Möller et al., *Real-Time Rendering*, 4th ed., Chapter 23

<AffiliateBanner site="graphics_navi" />
