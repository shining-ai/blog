import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 反射・屈折・影の計算

## 反射・屈折・影とは

> レイトレーシングにおける反射・屈折・影は、交差点から新たなレイを飛ばす再帰的処理によって実現される。反射レイは鏡面、屈折レイはガラス・水などの透明素材、シャドウレイは光源への可視判定に使用される。

Whitted スタイルのレイトレーシング（1980）が提案した核心は、一次レイ（カメラ→シーン）が交差した点から **二次レイ** を再帰的に生成することです。この再帰が現代のレイトレーシングパイプライン全体の基礎となっています。

**反射レイ** は `R = D - 2 * dot(D, N) * N`（GLSL の `reflect()` と同等）で計算します。D は入射方向、N は法線です。完全鏡面でなければ Fresnel 係数で反射の寄与を重み付けします。

**屈折レイ** は Snell の法則 `n1 * sin(θ1) = n2 * sin(θ2)` から計算します。媒質の屈折率（空気=1.0、水=1.33、ガラス=1.5）の比で方向を求めます。全反射条件（`n1/n2 * sin(θ1) > 1`）を超えると屈折レイは生成できず、反射のみになります。Schlick 近似で Fresnel 反射率を計算し、反射と屈折の割合を決定します。

**シャドウレイ** は交差点から光源へ向けてレイを飛ばし、途中に遮蔽物があればその点は影になります。光源が面光源の場合はモンテカルロサンプリングでソフトシャドウを実現します。シャドウレイは自身の表面と交差しないよう原点を法線方向に少しオフセットします。

## 各レイの計算式

| レイの種類 | 計算式 | 備考 |
|-----------|--------|------|
| 反射レイ | `R = D - 2*dot(D,N)*N` | GLSL `reflect(D, N)` |
| 屈折レイ | Snell の法則で方向を計算 | GLSL `refract(D, N, n1/n2)` |
| シャドウレイ | `origin + N*ε → light_pos` | ε: セルフ交差防止オフセット |
| Fresnel（Schlick）| `F0 + (1-F0)*(1-cosθ)^5` | F0 = ((n1-n2)/(n1+n2))^2 |

```python
import numpy as np

def normalize(v):
    n = np.linalg.norm(v)
    return v / n if n > 1e-8 else v

def reflect(d, n):
    """反射ベクトル（GLSL reflect と同等）"""
    return d - 2.0 * np.dot(d, n) * n

def refract(d, n, ni_over_nt):
    """
    屈折ベクトル（Snell の法則）
    d: 正規化入射方向
    n: 法線（入射側に向く）
    ni_over_nt: n1/n2 の比
    返値: (refracted_ray, True) または (None, False) 全反射の場合
    """
    uv   = normalize(d)
    dt   = np.dot(uv, n)
    disc = 1.0 - ni_over_nt * ni_over_nt * (1.0 - dt * dt)
    if disc < 0:
        return None, False  # 全反射
    refracted = ni_over_nt * (uv - n * dt) - n * np.sqrt(disc)
    return normalize(refracted), True

def schlick(cosine, ref_idx):
    """Schlick 近似によるフレネル反射率"""
    r0 = ((1 - ref_idx) / (1 + ref_idx)) ** 2
    return r0 + (1 - r0) * (1 - cosine) ** 5

def trace_glass(ray_dir, hit_normal, ref_idx=1.5, depth=0, max_depth=8):
    """
    ガラス素材のレイ追跡（反射 + 屈折）
    """
    if depth >= max_depth:
        return np.zeros(3)

    # 法線が入射方向と同じ向きか確認
    outward_normal = hit_normal
    if np.dot(ray_dir, hit_normal) > 0:
        # 内側からの入射（ガラス→空気）
        outward_normal = -hit_normal
        ni_over_nt = ref_idx
        cosine = ref_idx * np.dot(ray_dir, hit_normal) / np.linalg.norm(ray_dir)
    else:
        # 外側からの入射（空気→ガラス）
        ni_over_nt = 1.0 / ref_idx
        cosine = -np.dot(ray_dir, hit_normal) / np.linalg.norm(ray_dir)

    refracted, can_refract = refract(ray_dir, outward_normal, ni_over_nt)
    reflect_prob = schlick(cosine, ref_idx) if can_refract else 1.0

    print(f"Depth {depth}: Fresnel reflect probability = {reflect_prob:.3f}")

    # 確率的に反射か屈折を選択（モンテカルロ）
    if np.random.random() < reflect_prob:
        return reflect(ray_dir, outward_normal)
    else:
        return refracted

# テスト: 空気→ガラス境界への入射
ray_dir    = normalize(np.array([0.5, -1.0, 0.0]))
hit_normal = np.array([0.0, 1.0, 0.0])
result = trace_glass(ray_dir, hit_normal, ref_idx=1.5, depth=0)
print("Result direction:", result)
```

```glsl
// GLSL でのガラス素材（反射+屈折）フラグメントシェーダ例
#version 450 core

in vec3 v_world_pos;
in vec3 v_normal;
in vec3 v_view_dir;

out vec4 FragColor;

uniform samplerCube u_env_map;
uniform float u_ior;  // 屈折率（例: 1.5）

float schlick(float cosine, float ior) {
    float r0 = pow((1.0 - ior) / (1.0 + ior), 2.0);
    return r0 + (1.0 - r0) * pow(1.0 - cosine, 5.0);
}

void main() {
    vec3 N  = normalize(v_normal);
    vec3 V  = normalize(v_view_dir);

    // 反射レイ
    vec3 R  = reflect(-V, N);
    vec3 refl_color = texture(u_env_map, R).rgb;

    // 屈折レイ（空気→ガラス）
    vec3 T  = refract(-V, N, 1.0 / u_ior);
    vec3 refr_color = texture(u_env_map, T).rgb;

    // Fresnel でブレンド
    float cosTheta = dot(V, N);
    float fr       = schlick(cosTheta, u_ior);

    FragColor = vec4(mix(refr_color, refl_color, fr), 1.0);
}
```

## 使用場面

- ガラス・水・宝石など透明素材のフォトリアリスティックなレンダリング
- 鏡面仕上げ金属・磨かれた床の反射表現
- レイトレーシングパイプラインでのシャドウレイによる影生成
- アーキテクチャビジュアライゼーションでのガラス窓・水面
- パストレーシングでのライトトランスポートシミュレーション

## 参考文献

- Peter Shirley, *Ray Tracing in One Weekend* — Chapter 9-10
- [Scratchapixel — Reflection, Refraction and Fresnel](https://www.scratchapixel.com/lessons/3d-basic-rendering/introduction-to-shading/reflection-refraction-fresnel.html)
- Christophe Schlick, "An Inexpensive BRDF Model for Physically-based Rendering" (1994)

<AffiliateBanner site="graphics_navi" />
