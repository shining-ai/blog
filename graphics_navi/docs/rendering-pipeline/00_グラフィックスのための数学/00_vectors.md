import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ベクトル演算（内積・外積）

## ベクトル演算とは

> ベクトルとは大きさと方向を持つ量であり、3Dグラフィックスにおける位置・方向・法線・速度などをすべてベクトルで表現する。

3Dグラフィックスの計算の根幹をなすのがベクトル演算です。頂点の位置や面の向き（法線）、光の方向、カメラの視線方向など、あらゆる幾何学的な量をベクトルで表します。

ベクトル演算の中でも特に重要なのが**内積（ドット積）**と**外積（クロス積）**です。内積は2つのベクトルがどの程度同じ方向を向いているかを表すスカラー値を返し、ライティング計算（拡散反射・鏡面反射）や角度の計算に多用されます。外積は2つのベクトルに垂直な新しいベクトルを生成し、面の法線の計算や座標系の構築（右手系・左手系）に使われます。

また、ベクトルの正規化（単位ベクトル化）は方向のみを扱う場面で欠かせない操作です。GLSLでは `normalize()`、`dot()`、`cross()` などの組み込み関数が用意されており、シェーダ内で効率よく演算できます。

## ベクトル演算の一覧

| 演算 | 数式 | 用途 |
|------|------|------|
| 加算 | $\vec{a} + \vec{b}$ | 位置の移動、合力 |
| スカラー倍 | $k\vec{a}$ | 方向の拡大縮小 |
| 内積 | $\vec{a} \cdot \vec{b} = \|\vec{a}\|\|\vec{b}\|\cos\theta$ | 角度計算、ライティング |
| 外積 | $\vec{a} \times \vec{b}$ | 法線生成、座標系構築 |
| 正規化 | $\hat{a} = \vec{a} / \|\vec{a}\|$ | 方向ベクトルの取得 |
| 長さ | $\|\vec{a}\| = \sqrt{x^2+y^2+z^2}$ | 距離計算 |

```glsl
// GLSL: ベクトル演算の例
vec3 a = vec3(1.0, 2.0, 3.0);
vec3 b = vec3(4.0, 5.0, 6.0);

// 内積
float d = dot(a, b); // 1*4 + 2*5 + 3*6 = 32.0

// 外積（a と b に垂直なベクトル）
vec3 n = cross(a, b); // vec3(-3.0, 6.0, -3.0)

// 正規化（単位ベクトル）
vec3 na = normalize(a);

// ランバート拡散反射（法線と光方向の内積）
vec3 N = normalize(normal);
vec3 L = normalize(lightDir);
float diffuse = max(dot(N, L), 0.0);
```

```python
import numpy as np

a = np.array([1.0, 2.0, 3.0])
b = np.array([4.0, 5.0, 6.0])

# 内積
dot = np.dot(a, b)
print(f"内積: {dot}")  # 32.0

# 外積
cross = np.cross(a, b)
print(f"外積: {cross}")  # [-3.  6. -3.]

# 正規化
norm_a = a / np.linalg.norm(a)
print(f"単位ベクトル: {norm_a}")

# 2ベクトル間の角度
cos_theta = np.dot(norm_a, b / np.linalg.norm(b))
angle_deg = np.degrees(np.arccos(np.clip(cos_theta, -1, 1)))
print(f"なす角: {angle_deg:.2f}度")
```

## 使用場面

- ランバート反射（`dot(N, L)`）やフォン反射でのライティング計算
- カメラの視線方向・上方向・右方向の構築（外積で座標軸を生成）
- 面の法線ベクトルの計算（三角形の2辺の外積）
- バックフェースカリング（法線と視線の内積の符号で判定）
- アニメーションでの移動方向・速度の合成

## 参考文献

- Akenine-Möller et al., *Real-Time Rendering*, 4th ed.
- [The Book of Shaders — Vectors](https://thebookofshaders.com/)
- [GLSL Built-in Functions — Khronos](https://www.khronos.org/opengl/wiki/Built-in_Variable_(GLSL))

<AffiliateBanner site="graphics_navi" />
