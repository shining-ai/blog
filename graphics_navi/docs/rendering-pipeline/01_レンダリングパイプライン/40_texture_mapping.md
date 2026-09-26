import AffiliateBanner from '@site/src/components/AffiliateBanner';

# テクスチャマッピングとサンプリング

## テクスチャマッピングとは

> テクスチャマッピングは、2Dの画像（テクスチャ）を3Dポリゴンの表面に貼り付ける技術であり、UV座標を媒介としてフラグメントシェーダ内でテクセル（テクスチャピクセル）の色を参照する。

テクスチャマッピングはリアルタイムレンダリングにおける最も基本的かつ重要なテクニックの一つです。頂点に割り当てられた **UV座標**（$[0,1]^2$ の範囲の2D座標）を使って、テクスチャ画像のどの位置を参照するかを決定します。

テクスチャサンプリングでは2種類のフィルタリングが重要です。**マグニフィケーションフィルタ（拡大フィルタ）**はテクスチャが画面より大きく表示される場合のフィルタリングで、`NEAREST`（ニアレストネイバー：ピクセルアートに使用）と `LINEAR`（バイリニアフィルタ：滑らかな補間）があります。**ミニフィケーションフィルタ（縮小フィルタ）**はテクスチャが小さく表示される場合に使い、エイリアシングを防ぐために**ミップマップ**（事前生成した縮小版テクスチャの連鎖）と組み合わせた `LINEAR_MIPMAP_LINEAR`（トリリニアフィルタ）がよく使われます。

**テクスチャラッピング**は UV 座標が $[0,1]$ 範囲外に出た場合の処理方法で、`REPEAT`（タイリング）・`CLAMP_TO_EDGE`（端の色を引き延ばす）・`MIRRORED_REPEAT`（鏡面タイリング）などがあります。

## テクスチャフィルタリングの比較

| フィルタ | 品質 | 速度 | 用途 |
|---------|------|------|------|
| NEAREST | 低（モザイク） | 最速 | ピクセルアート・UI |
| LINEAR（バイリニア） | 中 | 速い | 一般的な2Dテクスチャ |
| LINEAR_MIPMAP_LINEAR（トリリニア） | 高 | やや遅い | 3Dテクスチャ全般 |
| 異方性フィルタリング（16x） | 最高 | 遅い | 床・壁などの斜め面 |

```glsl
// フラグメントシェーダ: 複数テクスチャの合成
#version 450 core

uniform sampler2D u_diffuseMap;   // アルベド(拡散色)テクスチャ
uniform sampler2D u_normalMap;    // 法線マップ
uniform sampler2D u_roughnessMap; // ラフネスマップ

in vec2 v_uv;
in mat3 v_TBN;  // 接線空間→ワールド空間変換行列

out vec4 FragColor;

void main() {
    // アルベドテクスチャのサンプリング
    vec4 albedo = texture(u_diffuseMap, v_uv);

    // アルファカットアウト
    if (albedo.a < 0.1) discard;

    // 法線マップから接線空間の法線を取得
    vec3 normalTS = texture(u_normalMap, v_uv).xyz * 2.0 - 1.0;
    vec3 worldNormal = normalize(v_TBN * normalTS);

    // ラフネス値
    float roughness = texture(u_roughnessMap, v_uv).r;

    // ... ライティング計算へ続く
    FragColor = vec4(albedo.rgb, 1.0);
}
```

```python
import numpy as np

def bilinear_sample(texture, u, v):
    """バイリニアフィルタリングの実装"""
    h, w = texture.shape[:2]

    # UV座標をテクスチャ座標に変換
    x = u * w - 0.5
    y = v * h - 0.5

    # 整数部と小数部
    x0, y0 = int(np.floor(x)), int(np.floor(y))
    x1, y1 = x0 + 1, y0 + 1
    fx, fy = x - x0, y - y0

    # 境界クランプ
    x0 = np.clip(x0, 0, w-1)
    x1 = np.clip(x1, 0, w-1)
    y0 = np.clip(y0, 0, h-1)
    y1 = np.clip(y1, 0, h-1)

    # バイリニア補間
    c00 = texture[y0, x0].astype(float)
    c10 = texture[y0, x1].astype(float)
    c01 = texture[y1, x0].astype(float)
    c11 = texture[y1, x1].astype(float)

    return (c00*(1-fx)*(1-fy) + c10*fx*(1-fy) +
            c01*(1-fx)*fy     + c11*fx*fy)

# テスト用の小さなテクスチャ（4x4, RGBの値）
texture = np.array([
    [[255,0,0],[0,255,0],[0,0,255],[255,255,0]],
    [[255,0,255],[128,128,128],[0,255,255],[255,128,0]],
    [[100,200,50],[200,100,50],[50,100,200],[150,150,150]],
    [[0,0,0],[255,255,255],[128,0,128],[0,128,128]],
], dtype=np.uint8)

# UV(0.5, 0.5) のサンプリング
color = bilinear_sample(texture, 0.5, 0.5)
print(f"UV(0.5,0.5) のバイリニアサンプル: {color.round(1)}")
```

## 使用場面

- アルベドマップ・ノーマルマップ・ラフネスマップなどのPBRテクスチャ
- ミップマップによる LOD（Level of Detail）制御
- キューブマップを使った環境マッピング・スカイボックス
- アトラステクスチャ（複数テクスチャを1枚にまとめたスプライトシート）
- デカールの投影やライトマップの焼き込み

## 参考文献

- [LearnOpenGL — Textures](https://learnopengl.com/Getting-started/Textures)
- [Khronos OpenGL Wiki — Texture](https://www.khronos.org/opengl/wiki/Texture)
- [Understanding Mipmaps — GPU Gems](https://developer.nvidia.com/gpugems/gpugems/part-iv-image-processing/chapter-24-using-lookup-tables-accelerate-color)

<AffiliateBanner site="graphics_navi" />
