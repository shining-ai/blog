import AffiliateBanner from '@site/src/components/AffiliateBanner';

# UV マッピングとテクスチャアトラス

## UV マッピングとは

> UV マッピングとは、3Dメッシュの表面を2Dテクスチャ画像に対応付けるプロセスであり、頂点ごとに割り当てられるUV座標（0〜1の正規化座標）がテクスチャ上のどのピクセルを参照するかを定義する。

3Dオブジェクトにテクスチャを貼るためには、「3Dサーフェスのどの点が2Dテクスチャのどのピクセルに対応するか」を定義する必要がある。これがUV展開（UV Unwrapping）であり、球体を地図に展開するのと同じ考え方である。

**UV座標の命名：**
X軸に相当する水平方向を「U」、Y軸に相当する垂直方向を「V」と呼ぶ（XYZ が3D空間に使われているため）。

**UV展開の難しさ：**
3Dサーフェスを2Dに展開すると必ず歪みが生じる。Blenderなどのモデリングツールでは、シームライン（Seam）を設けて展開し、歪みを最小化するアルゴリズムが使われる。

**テクスチャアトラス（Texture Atlas）：**
複数のオブジェクトのテクスチャを1枚の大きなテクスチャ画像にまとめる手法。描画コール（Draw Call）の削減とGPUメモリの効率化に直結し、ゲームのパフォーマンス最適化に欠かせない。

## UV マッピングの種類と特性

| 手法 | 特徴 | 適した用途 |
|------|------|-----------|
| **平面展開** | 1方向から投影 | 平らな面・地面 |
| **箱展開（Box）** | 6方向から投影して合成 | 建物・箱状オブジェクト |
| **円柱展開** | 円柱状に展開 | 木・柱・キャラクター胴体 |
| **球面展開** | 球面に投影 | 天球・惑星 |
| **スマートUV（自動）** | アルゴリズムで最適化 | 複雑な形状の自動処理 |
| **手動展開（カスタム）** | シームを手動設定 | キャラクター・高品質アセット |

```python
import numpy as np

def apply_planar_uv(vertices: np.ndarray, axis: str = "y") -> np.ndarray:
    """
    平面 UV 展開: 指定した軸方向から投影して UV を計算する。
    例: axis="y" なら XZ 平面に投影（地面・天井のテクスチャに適する）
    """
    if axis == "y":
        uv_coords = vertices[:, [0, 2]]  # X, Z を U, V に使用
    elif axis == "z":
        uv_coords = vertices[:, [0, 1]]  # X, Y を U, V に使用
    elif axis == "x":
        uv_coords = vertices[:, [2, 1]]  # Z, Y を U, V に使用
    else:
        raise ValueError(f"無効な軸: {axis}")

    # 0〜1 の範囲に正規化
    min_val = uv_coords.min(axis=0)
    max_val = uv_coords.max(axis=0)
    range_val = max_val - min_val
    range_val[range_val == 0] = 1.0  # ゼロ除算を防ぐ
    return (uv_coords - min_val) / range_val


def apply_cylindrical_uv(vertices: np.ndarray) -> np.ndarray:
    """
    円柱 UV 展開: Y 軸を中心として円柱状に展開する。
    木・柱・キャラクターの胴体などに使用する。
    U = 経度（角度 → 0〜1）
    V = 高さ（Y 座標 → 0〜1）
    """
    x, y, z = vertices[:, 0], vertices[:, 1], vertices[:, 2]

    # 角度を 0〜1 に変換
    angle = np.arctan2(z, x)  # -π 〜 π
    u = (angle + np.pi) / (2 * np.pi)  # 0 〜 1

    # Y 方向を正規化
    v = (y - y.min()) / (y.max() - y.min() + 1e-10)

    return np.stack([u, v], axis=1).astype(np.float32)


class TextureAtlas:
    """
    テクスチャアトラスの管理クラス。
    複数のサブテクスチャ領域を1枚の大きなテクスチャにパッキングする。
    UV 座標をアトラス空間に変換する機能を持つ。
    """

    def __init__(self, atlas_width: int = 2048, atlas_height: int = 2048):
        self.atlas_width = atlas_width
        self.atlas_height = atlas_height
        self.regions: dict[str, tuple[int, int, int, int]] = {}  # name → (x, y, w, h)
        self._cursor_x = 0
        self._cursor_y = 0
        self._row_height = 0

    def pack(self, name: str, width: int, height: int) -> tuple[float, float, float, float]:
        """
        指定サイズのテクスチャ領域をアトラスにパッキングする（簡易行詰め方式）。
        戻り値: (u_min, v_min, u_max, v_max) — アトラス空間の UV 範囲
        """
        # 行をはみ出す場合は次の行へ
        if self._cursor_x + width > self.atlas_width:
            self._cursor_x = 0
            self._cursor_y += self._row_height + 1
            self._row_height = 0

        if self._cursor_y + height > self.atlas_height:
            raise RuntimeError("テクスチャアトラスの容量が不足しています")

        x, y = self._cursor_x, self._cursor_y
        self.regions[name] = (x, y, width, height)

        self._cursor_x += width + 1
        self._row_height = max(self._row_height, height)

        # UV 座標に変換（0〜1 に正規化）
        return (
            x / self.atlas_width,
            y / self.atlas_height,
            (x + width) / self.atlas_width,
            (y + height) / self.atlas_height,
        )

    def remap_uv(self, name: str, uvs: np.ndarray) -> np.ndarray:
        """
        ローカル UV（0〜1）をアトラス UV に変換する。
        メッシュの UV を結合前に変換して使用する。
        """
        if name not in self.regions:
            raise KeyError(f"領域 '{name}' が登録されていません")
        x, y, w, h = self.regions[name]
        u_offset = x / self.atlas_width
        v_offset = y / self.atlas_height
        u_scale  = w / self.atlas_width
        v_scale  = h / self.atlas_height
        return uvs * np.array([u_scale, v_scale]) + np.array([u_offset, v_offset])


# 使用例
atlas = TextureAtlas(1024, 1024)
grass_uv  = atlas.pack("grass",  256, 256)
stone_uv  = atlas.pack("stone",  256, 256)
wood_uv   = atlas.pack("wood",   128, 128)
metal_uv  = atlas.pack("metal",  512, 256)

print("=== テクスチャアトラス パッキング結果 ===")
for name, region in atlas.regions.items():
    x, y, w, h = region
    u0, v0, u1, v1 = x/1024, y/1024, (x+w)/1024, (y+h)/1024
    print(f"  {name:8s}: ({x:4d},{y:4d}) {w}x{h}px  UV:[{u0:.3f},{v0:.3f}]-[{u1:.3f},{v1:.3f}]")
```

## 使用場面

- ゲームアセットの最適化（テクスチャアトラス化でドローコールを削減）
- Blender での UV 展開と Substance Painter でのテクスチャペイント
- WebGL / Three.js での BufferGeometry に UV 属性を設定
- ライトマップのベイク（静的ライティングを UV2 チャンネルに焼き付け）
- テクスチャ座標のアニメーション（水面・スクロールテクスチャ）

## 参考文献

- [Learn OpenGL - Textures](https://learnopengl.com/Getting-started/Textures)
- [Blender Manual - UV Unwrapping](https://docs.blender.org/manual/en/latest/modeling/meshes/editing/uv.html)
- [GPU Gems - Texture Atlas](https://developer.nvidia.com/gpugems/gpugems/part-iv-image-processing/chapter-22-color-temperature)

<AffiliateBanner site="graphics_navi" />
