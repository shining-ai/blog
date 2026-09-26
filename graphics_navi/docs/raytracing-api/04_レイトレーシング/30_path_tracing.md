import AffiliateBanner from '@site/src/components/AffiliateBanner';

# パストレーシングとモンテカルロ法

## パストレーシングとは

> パストレーシング（Path Tracing）は、モンテカルロ積分を使ってレンダリング方程式を数値的に解くアルゴリズムであり、ランダムなレイをサンプリングすることで間接照明・ソフトシャドウ・グローバルイルミネーションを統一的に計算できる。

Kajiya（1986）によって提案されたパストレーシングは、現代の映画 VFX（Pixar・ILM）や高品質リアルタイムレンダリングの基礎です。カメラから飛ばしたレイがシーン内でランダムに反射・散乱を繰り返し、最終的に光源に到達するパスの寄与を集計することで画像を生成します。

**レンダリング方程式** は `L_o(x, ω_o) = L_e(x, ω_o) + ∫ f_r(x, ω_i, ω_o) L_i(x, ω_i) (ω_i·n) dω_i` で表されます。この積分を解析的に求めるのは困難なため、モンテカルロ法でランダムサンプリングにより近似します。

収束を速めるため **重点サンプリング（Importance Sampling）** が重要です。BRDF の分布に沿ったサンプリング（コサイン重み付き半球サンプリングなど）によって分散を削減します。また、シャドウレイで光源を直接サンプリングする **次直接光サンプリング（Next Event Estimation）** も収束の改善に効果的です。

パストレーシングの弱点はノイズです。ピクセルあたりのサンプル数（SPP）が少ないと白いホットスポット（ファイアフライ）が目立ちます。ノイズ削減には **デノイザー**（OIDN・DLSS Ray Reconstruction など AI ベースのデノイズ）が現代では不可欠です。

## パストレーシングの実装要素

| 要素 | 説明 |
|------|------|
| BRDF サンプリング | 半球上のランダム方向サンプリング |
| 重点サンプリング | BRDF 分布に沿ったサンプリングで分散削減 |
| Russian Roulette | 低寄与パスを確率的に打ち切り（エネルギー保存） |
| Next Event Estimation | 光源を直接サンプリングして収束を高速化 |
| Multiple Importance Sampling | BRDF・光源両方のサンプリングを最適統合 |

```python
import numpy as np

def normalize(v):
    n = np.linalg.norm(v)
    return v / n if n > 1e-8 else v

def random_cosine_direction(rng):
    """コサイン重み付き半球サンプリング（Lambert 拡散用）"""
    r1 = rng.random()
    r2 = rng.random()
    phi = 2 * np.pi * r1
    x = np.cos(phi) * np.sqrt(r2)
    y = np.sin(phi) * np.sqrt(r2)
    z = np.sqrt(1 - r2)
    return np.array([x, y, z])

def build_onb(n):
    """法線 n を基底とする正規直交基底（ONB）を構築"""
    n = normalize(n)
    if abs(n[0]) > 0.9:
        a = np.array([0.0, 1.0, 0.0])
    else:
        a = np.array([1.0, 0.0, 0.0])
    v = normalize(np.cross(n, a))
    u = np.cross(n, v)
    return u, v, n

def sample_diffuse(hit_normal, rng):
    """拡散反射の次のレイ方向をサンプリング"""
    u, v, w = build_onb(hit_normal)
    local_dir = random_cosine_direction(rng)
    # ローカル座標からワールド座標へ
    return normalize(local_dir[0]*u + local_dir[1]*v + local_dir[2]*w)


class Material:
    def __init__(self, albedo, mat_type='diffuse', roughness=0.1, ior=1.5):
        self.albedo     = np.array(albedo)
        self.mat_type   = mat_type  # 'diffuse', 'metal', 'glass', 'emissive'
        self.roughness  = roughness
        self.ior        = ior

    def scatter(self, ray_in, hit_normal, rng):
        """
        散乱処理: (scattered_dir, attenuation, is_emissive) を返す
        """
        if self.mat_type == 'emissive':
            return None, self.albedo, True

        if self.mat_type == 'diffuse':
            scattered = sample_diffuse(hit_normal, rng)
            attenuation = self.albedo
            return scattered, attenuation, False

        if self.mat_type == 'metal':
            reflected = ray_in - 2 * np.dot(ray_in, hit_normal) * hit_normal
            fuzz = self.roughness * rng.random(3) * 2 - 1
            scattered = normalize(reflected + fuzz)
            attenuation = self.albedo
            return scattered, attenuation, False

        return None, np.zeros(3), False


def path_trace(ray_origin, ray_dir, scene_fn, rng, max_depth=10):
    """
    1本のレイのパストレーシング
    scene_fn: (origin, dir) -> (hit_t, hit_normal, material) または None
    """
    color      = np.zeros(3)
    throughput = np.ones(3)
    origin     = ray_origin
    direction  = ray_dir

    for depth in range(max_depth):
        hit = scene_fn(origin, direction)
        if hit is None:
            # 背景光（環境光）
            t_val = 0.5 * (direction[1] + 1.0)
            sky = (1 - t_val) * np.array([1.0, 1.0, 1.0]) + t_val * np.array([0.5, 0.7, 1.0])
            color += throughput * sky * 0.3
            break

        hit_t, hit_normal, material = hit
        hit_pos = origin + hit_t * direction

        scattered, attenuation, is_emissive = material.scatter(
            normalize(direction), hit_normal, rng)

        if is_emissive:
            color += throughput * attenuation
            break

        if scattered is None:
            break

        throughput *= attenuation

        # Russian Roulette で打ち切り（深度 3 以降）
        if depth >= 3:
            p = np.max(throughput)
            if rng.random() > p:
                break
            throughput /= p  # 期待値を保存

        origin    = hit_pos + hit_normal * 1e-4  # セルフ交差防止
        direction = scattered

    return color


# 簡単なシーンでの SPP（Samples Per Pixel）収束デモ
rng = np.random.default_rng(42)
spp_list = [1, 4, 16, 64, 256]

def dummy_scene(origin, direction):
    # 球との交差（y=0 に置いた発光球）
    center = np.array([0.0, 0.0, -2.0])
    oc = origin - center
    a = np.dot(direction, direction)
    b = 2.0 * np.dot(oc, direction)
    c = np.dot(oc, oc) - 0.25
    disc = b*b - 4*a*c
    if disc < 0:
        return None
    t = (-b - np.sqrt(disc)) / (2*a)
    if t < 1e-4:
        return None
    normal = normalize((origin + t * direction) - center)
    mat = Material([2.0, 1.5, 0.8], mat_type='emissive')
    return t, normal, mat

for spp in spp_list:
    samples = [path_trace(np.array([0.0, 0.0, 0.0]),
                          normalize(np.array([0.0, 0.0, -1.0])),
                          dummy_scene, rng) for _ in range(spp)]
    avg = np.mean(samples, axis=0)
    print(f"SPP={spp:4d}: color={avg}")
```

## 使用場面

- 映画・アニメーション VFX での完全なグローバルイルミネーション
- RTX GPU を使ったリアルタイムパストレーシング（DLSS + デノイザー）
- プロダクトビジュアライゼーション（車・製品の高品質レンダリング）
- ライトマップのオフラインベイク（ゲームエンジン用）
- 建築・インテリアの昼間・夜間照明シミュレーション

## 参考文献

- James Kajiya, "The Rendering Equation" (SIGGRAPH 1986)
- Peter Shirley, *Ray Tracing in One Weekend* / *The Rest of Your Life*
- [PBRT-v4 — Light Transport I: Surface Reflection](https://pbr-book.org/4ed/Light_Transport_I_Surface_Reflection)

<AffiliateBanner site="graphics_navi" />
