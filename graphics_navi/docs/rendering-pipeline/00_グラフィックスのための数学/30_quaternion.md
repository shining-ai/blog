import AffiliateBanner from '@site/src/components/AffiliateBanner';

# クォータニオンと回転の補間

## クォータニオンとは

> クォータニオン（Quaternion、四元数）は $q = w + xi + yj + zk$ という4つの成分で回転を表現する数学的構造であり、ジンバルロックを回避しながら滑らかな回転補間を可能にする。

3Dグラフィックスで回転を扱う方法には「オイラー角」「回転行列」「クォータニオン」の3種類がありますが、クォータニオンが最も多く使われます。理由は主に2点です。

1つ目は**ジンバルロック（Gimbal Lock）の回避**です。オイラー角（X・Y・Z軸の回転角度の組み合わせ）では、3つの回転軸が重なってしまい自由度が1つ失われる「ジンバルロック」が発生します。クォータニオンはこの問題が起きません。

2つ目は**滑らかな回転補間（Slerp）**です。2つのクォータニオン間を球面線形補間（Spherical Linear Interpolation）することで、アニメーションで自然な回転を実現できます。線形補間（Lerp）では角速度が一定にならないため、Slerpが使われます。

クォータニオンは単位クォータニオン（$\|q\| = 1$）として使い、回転軸 $\hat{n}$ と角度 $\theta$ から $q = \cos(\theta/2) + \sin(\theta/2)(n_x i + n_y j + n_z k)$ で構成します。

## クォータニオンと他の回転表現の比較

| 方式 | ジンバルロック | Slerp | メモリ | 合成速度 |
|------|--------------|-------|-------|---------|
| オイラー角 | あり | 不可 | 3要素 | 速い |
| 回転行列 | なし | 可（重い） | 9要素 | 速い |
| クォータニオン | なし | 高品質 | 4要素 | やや遅い |

```python
import numpy as np

class Quaternion:
    def __init__(self, w, x, y, z):
        self.w, self.x, self.y, self.z = w, x, y, z

    @classmethod
    def from_axis_angle(cls, axis, angle_rad):
        """回転軸と角度からクォータニオンを生成"""
        axis = np.array(axis, dtype=float)
        axis /= np.linalg.norm(axis)
        half = angle_rad / 2
        s = np.sin(half)
        return cls(np.cos(half), axis[0]*s, axis[1]*s, axis[2]*s)

    def normalize(self):
        n = np.sqrt(self.w**2 + self.x**2 + self.y**2 + self.z**2)
        return Quaternion(self.w/n, self.x/n, self.y/n, self.z/n)

    def multiply(self, other):
        """クォータニオンの積（回転の合成）"""
        w = self.w*other.w - self.x*other.x - self.y*other.y - self.z*other.z
        x = self.w*other.x + self.x*other.w + self.y*other.z - self.z*other.y
        y = self.w*other.y - self.x*other.z + self.y*other.w + self.z*other.x
        z = self.w*other.z + self.x*other.y - self.y*other.x + self.z*other.w
        return Quaternion(w, x, y, z)

    def to_rotation_matrix(self):
        """回転行列に変換"""
        w, x, y, z = self.w, self.x, self.y, self.z
        return np.array([
            [1-2*(y*y+z*z),  2*(x*y-w*z),  2*(x*z+w*y)],
            [  2*(x*y+w*z),1-2*(x*x+z*z),  2*(y*z-w*x)],
            [  2*(x*z-w*y),  2*(y*z+w*x),1-2*(x*x+y*y)]
        ])

def slerp(q1, q2, t):
    """球面線形補間（Slerp）"""
    v1 = np.array([q1.w, q1.x, q1.y, q1.z])
    v2 = np.array([q2.w, q2.x, q2.y, q2.z])
    dot = np.dot(v1, v2)
    if dot < 0:  # 最短経路を選ぶ
        v2, dot = -v2, -dot
    dot = np.clip(dot, -1, 1)
    theta = np.arccos(dot) * t
    v_perp = (v2 - v1 * dot)
    norm = np.linalg.norm(v_perp)
    if norm < 1e-6:
        return q1
    v_perp /= norm
    result = v1 * np.cos(theta) + v_perp * np.sin(theta)
    return Quaternion(*result)

# Y軸まわり 90度回転
q = Quaternion.from_axis_angle([0, 1, 0], np.radians(90))
print("回転行列:")
print(np.round(q.to_rotation_matrix(), 3))

# Slerp で 0% → 100% を 50% 補間
q1 = Quaternion.from_axis_angle([0, 1, 0], np.radians(0))
q2 = Quaternion.from_axis_angle([0, 1, 0], np.radians(90))
q_mid = slerp(q1, q2, 0.5)
print(f"\nSlerp(0%, 50%): w={q_mid.w:.3f}, y={q_mid.y:.3f}")
```

## 使用場面

- スケルタルアニメーションでのボーン回転の補間（Slerp）
- カメラの視点移動・回転のスムーズな補間
- キャラクターの向き変更（その場旋回のアニメーション）
- IK（逆運動学）ソルバでの関節角度の計算
- フライトシミュレータなど6自由度の回転を扱う場面

## 参考文献

- Shoemake, K., *Animating Rotation with Quaternion Curves*, SIGGRAPH 1985
- [Quaternions and spatial rotation — Wikipedia](https://en.wikipedia.org/wiki/Quaternions_and_spatial_rotation)
- [Understanding Quaternions — 3D Game Engine Programming](https://www.3dgep.com/understanding-quaternions/)

<AffiliateBanner site="graphics_navi" />
