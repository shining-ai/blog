import AffiliateBanner from '@site/src/components/AffiliateBanner';

# フラグメント処理と深度テスト

## フラグメント処理とは

> フラグメント処理（Fragment Processing）はラスタライゼーション後の各フラグメントに対してカラー値を計算するステージであり、テクスチャサンプリング・ライティング・深度テストを経て最終的なピクセル色を決定する。

ラスタライゼーションで生成された各フラグメント（ピクセル候補）に対して、**フラグメントシェーダ**が1回ずつ呼び出されます。ここでテクスチャ参照・ライティング計算・カラー演算などが行われ、最終的なRGBA色が出力されます。

フラグメント処理と同時に行われる重要な固定機能テストが**深度テスト（Depth Test）**です。デプスバッファ（Zバッファ）には現在フレームバッファ上の各ピクセルの最前面の深度値が格納されており、新しいフラグメントの深度値がそれより手前の場合のみ書き込みを許可します（`gl_FragDepth` または自動計算）。これによってオブジェクトの前後関係が正しく描画されます。

出力マージステージでは深度テストの他に、**ステンシルテスト**（特定の形状にマスキング）や**ブレンディング**（αブレンド・加算合成など）も実行されます。描画順序の管理と半透明オブジェクトの正しい描画のためには、不透明オブジェクトを前から描き、半透明オブジェクトを後ろから前に描く（ソーテッドトランスパレンシー）必要があります。

## フラグメントテストの順序と種類

| テスト | 内容 | 失敗時 |
|--------|------|--------|
| シザーテスト | 指定矩形内のみ処理 | 破棄 |
| アルファテスト | α値による条件（GL4以降は廃止） | 破棄 |
| ステンシルテスト | ステンシルバッファ値との比較 | 破棄 |
| 深度テスト | デプスバッファとの比較 | 破棄 |
| ブレンディング | 既存色との合成 | — |

```glsl
// フラグメントシェーダ: Blinn-Phongライティング + テクスチャ
#version 450 core

uniform sampler2D u_diffuseMap;
uniform vec3 u_lightPos;
uniform vec3 u_viewPos;
uniform vec3 u_lightColor;

in vec3 v_worldPos;
in vec3 v_worldNormal;
in vec2 v_uv;

out vec4 FragColor;

void main() {
    // テクスチャから拡散色を取得
    vec3 albedo = texture(u_diffuseMap, v_uv).rgb;

    // ライティングベクトルの準備
    vec3 N = normalize(v_worldNormal);
    vec3 L = normalize(u_lightPos - v_worldPos);
    vec3 V = normalize(u_viewPos - v_worldPos);
    vec3 H = normalize(L + V);  // Blinn-Phong のハーフベクトル

    // アンビエント・ディフューズ・スペキュラ
    float ambient  = 0.1;
    float diffuse  = max(dot(N, L), 0.0);
    float specular = pow(max(dot(N, H), 0.0), 64.0);

    vec3 color = albedo * (ambient + diffuse) * u_lightColor
               + vec3(1.0) * specular;

    // ガンマ補正
    color = pow(color, vec3(1.0 / 2.2));

    FragColor = vec4(color, 1.0);
}
```

```python
# ソフトウェアデプステストのシミュレーション
import numpy as np

class DepthBuffer:
    def __init__(self, width, height):
        # 深度バッファを最大値（最遠）で初期化
        self.buffer = np.ones((height, width), dtype=np.float32)
        self.color_buffer = np.zeros((height, width, 4), dtype=np.float32)

    def test_and_write(self, x, y, depth, color):
        """深度テスト: 手前のフラグメントのみ書き込む"""
        if 0 <= x < self.buffer.shape[1] and 0 <= y < self.buffer.shape[0]:
            if depth < self.buffer[y, x]:  # より手前なら
                self.buffer[y, x] = depth
                self.color_buffer[y, x] = color
                return True
        return False

# シミュレーション
buf = DepthBuffer(320, 240)
written1 = buf.test_and_write(100, 100, 0.5, [1, 0, 0, 1])  # 赤(depth=0.5)
written2 = buf.test_and_write(100, 100, 0.3, [0, 1, 0, 1])  # 緑(depth=0.3, より手前)
written3 = buf.test_and_write(100, 100, 0.8, [0, 0, 1, 1])  # 青(depth=0.8, より奥)

print(f"赤フラグメント書き込み: {written1}")  # True
print(f"緑フラグメント書き込み: {written2}")  # True (より手前)
print(f"青フラグメント書き込み: {written3}")  # False (より奥)
print(f"最終色: {buf.color_buffer[100, 100]}")  # 緑
```

## 使用場面

- Phong/Blinn-Phong によるリアルタイムライティング
- PBR（物理ベースレンダリング）のBRDF計算
- 半透明オブジェクトのアルファブレンディング
- Early-Z 最適化（深度テスト先行実行による無駄な演算の回避）
- OIT（Order Independent Transparency）の実装

## 参考文献

- [LearnOpenGL — Depth Testing](https://learnopengl.com/Advanced-OpenGL/Depth-testing)
- [Khronos OpenGL Wiki — Fragment Shader](https://www.khronos.org/opengl/wiki/Fragment_Shader)
- Akenine-Möller et al., *Real-Time Rendering*, 4th ed.

<AffiliateBanner site="graphics_navi" />
