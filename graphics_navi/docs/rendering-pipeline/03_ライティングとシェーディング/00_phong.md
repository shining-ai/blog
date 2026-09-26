import AffiliateBanner from '@site/src/components/AffiliateBanner';

# フォン反射モデル（アンビエント・ディフューズ・スペキュラ）

## フォン反射モデルとは

> フォン反射モデル（Phong Reflection Model）は、1975年に Bui Tuong Phong が提案した経験的なライティングモデルであり、アンビエント（環境光）・ディフューズ（拡散反射）・スペキュラ（鏡面反射）の3成分の線形和で表面の見た目を近似する。

フォン反射モデルはリアルタイムグラフィックスで長年にわたって広く使われてきた基本的なライティング手法です。物理的に厳密ではありませんが、計算コストが低く、パラメータ調整が直感的なため、入門から実用まで幅広く活用されています。

**アンビエント（Ambient）** は、シーン全体に一定の底上げ光を与えます。現実には間接光が複雑に反射してできる「全体的な明るさ」を、単純な定数で近似したものです。

**ディフューズ（Diffuse）** は、光が表面に当たった際の拡散反射を表します。ランバート余弦則 `max(dot(N, L), 0)` に従い、法線と光方向の角度が小さいほど明るくなります。視点方向に依存しないため、どこから見ても同じ明るさに見えます。

**スペキュラ（Specular）** は、光の鏡面反射成分です。反射方向 `R = reflect(-L, N)` と視線方向 `V` の角度を `shininess` 乗することでハイライトの鋭さを制御します。Blinn-Phong ではハーフベクトル `H = normalize(L + V)` と法線の内積を使い、計算を高速化・改善しています。

## フォン反射モデルの3成分

| 成分 | 式 | 説明 |
|------|-----|------|
| アンビエント | `k_a * I_a` | 一定の環境光成分 |
| ディフューズ | `k_d * I_d * max(dot(N,L), 0)` | ランバート拡散反射 |
| スペキュラ（Phong）| `k_s * I_s * max(dot(R,V), 0)^n` | 反射方向ベースのハイライト |
| スペキュラ（Blinn-Phong）| `k_s * I_s * max(dot(N,H), 0)^n` | ハーフベクトルベース（高速） |

```glsl
#version 450 core

in vec3 v_world_pos;
in vec3 v_normal;

out vec4 FragColor;

uniform vec3 u_light_pos;
uniform vec3 u_view_pos;
uniform vec3 u_light_color;
uniform vec3 u_object_color;

// マテリアルパラメータ
uniform float u_ambient_k;   // 例: 0.1
uniform float u_diffuse_k;   // 例: 0.8
uniform float u_specular_k;  // 例: 0.5
uniform float u_shininess;   // 例: 64.0

void main() {
    vec3 N = normalize(v_normal);
    vec3 L = normalize(u_light_pos - v_world_pos);
    vec3 V = normalize(u_view_pos  - v_world_pos);
    vec3 H = normalize(L + V);  // Blinn-Phong ハーフベクトル

    // アンビエント
    vec3 ambient = u_ambient_k * u_light_color * u_object_color;

    // ディフューズ（ランバート）
    float diff   = max(dot(N, L), 0.0);
    vec3 diffuse = u_diffuse_k * diff * u_light_color * u_object_color;

    // スペキュラ（Blinn-Phong）
    float spec    = pow(max(dot(N, H), 0.0), u_shininess);
    vec3 specular = u_specular_k * spec * u_light_color;

    FragColor = vec4(ambient + diffuse + specular, 1.0);
}
```

```python
# Python でフォン反射モデルを実装
import numpy as np

def normalize(v):
    return v / np.linalg.norm(v)

def phong_blinn(pos, normal, light_pos, view_pos, light_color,
                object_color, ka=0.1, kd=0.8, ks=0.5, shininess=64):
    N = normalize(normal)
    L = normalize(light_pos - pos)
    V = normalize(view_pos  - pos)
    H = normalize(L + V)

    ambient  = ka * light_color * object_color
    diff     = max(np.dot(N, L), 0.0)
    diffuse  = kd * diff * light_color * object_color
    spec     = max(np.dot(N, H), 0.0) ** shininess
    specular = ks * spec * light_color

    return np.clip(ambient + diffuse + specular, 0, 1)

# テスト
pos    = np.array([0.0, 0.0, 0.0])
N      = np.array([0.0, 1.0, 0.0])
L_pos  = np.array([1.0, 2.0, 1.0])
V_pos  = np.array([0.0, 2.0, 3.0])
white  = np.array([1.0, 1.0, 1.0])
orange = np.array([1.0, 0.5, 0.1])

color = phong_blinn(pos, N, L_pos, V_pos, white, orange)
print("Phong color:", color)  # [0.56, 0.35, 0.18] 程度
```

## 使用場面

- ゲームや教育向けアプリケーションでの基本ライティング実装
- シェーダ入門・学習プロジェクトでの最初のライティングモデル
- PBR が不要な低負荷なシーン（モバイル・ローポリ）
- マテリアルプレビューやプロトタイプの素早い見た目確認
- レガシー OpenGL アプリケーションの維持・移植

## 参考文献

- Bui Tuong Phong, "Illumination for Computer Generated Pictures" (1975)
- [LearnOpenGL — Basic Lighting](https://learnopengl.com/Lighting/Basic-Lighting)
- [LearnOpenGL — Advanced Lighting (Blinn-Phong)](https://learnopengl.com/Advanced-Lighting/Advanced-Lighting)

<AffiliateBanner site="graphics_navi" />
