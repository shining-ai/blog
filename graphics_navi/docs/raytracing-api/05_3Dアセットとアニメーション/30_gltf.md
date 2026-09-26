import AffiliateBanner from '@site/src/components/AffiliateBanner';

# glTF フォーマット

## glTF とは

> glTF（GL Transmission Format）は Khronos Group が策定した3Dアセットの標準フォーマットであり、「3Dの JPEG」とも称される軽量で伝送効率の高いフォーマットで、メッシュ・マテリアル・テクスチャ・スキニング・アニメーションを1つのファイルに統合して表現できる。

3Dモデルのフォーマットはかつて FBX（Autodesk 独自）・OBJ（古いテキスト形式）・Collada（XML で冗長）など乱立していた。glTF 2.0（2017年）はこれらの問題を解決するオープンスタンダードとして登場し、今日では Web・ゲームエンジン・AR/VR・AI（3D生成）で事実上の標準となっている。

**glTF の特徴：**
- **軽量かつ高速読み込み**：バイナリ（GLB）は単一ファイルで完結
- **PBR マテリアル**：Metallic-Roughness ワークフローを標準サポート
- **スキニング・アニメーション**：ボーンアニメーション・モーフターゲットを内包
- **拡張機能（Extensions）**：ドラフォブと KHR_materials_unlit・KHR_draco_mesh_compression 等で機能追加
- **ブラウザネイティブ対応**：Three.js・Babylon.js・A-Frame が標準サポート

## glTF のファイル構成

| 構成要素 | 説明 |
|---------|------|
| **scenes / nodes** | シーングラフ（オブジェクトの親子階層） |
| **meshes** | ポリゴンデータ（頂点・インデックス・属性） |
| **materials** | PBR マテリアル（baseColor・metallic・roughness） |
| **textures / images** | テクスチャ画像（PNG・JPEG・KTX2） |
| **accessors / bufferViews / buffers** | バイナリデータへのアクセス定義 |
| **skins** | スケルトンとインバースバインド行列 |
| **animations** | キーフレームアニメーションの定義 |

```python
import json
import struct
import base64
import numpy as np
from pathlib import Path

def read_gltf(file_path: str) -> dict:
    """
    glTF 2.0 の JSON を読み込んでメタ情報を表示する。
    GLB（バイナリ glTF）には非対応（簡略版）。
    """
    with open(file_path) as f:
        gltf = json.load(f)

    print(f"=== glTF ファイル解析: {Path(file_path).name} ===\n")

    # アセット情報
    asset = gltf.get("asset", {})
    print(f"glTF バージョン: {asset.get('version', '不明')}")
    print(f"生成ツール: {asset.get('generator', '不明')}")

    # シーン情報
    scenes = gltf.get("scenes", [])
    print(f"\nシーン数: {len(scenes)}")

    # メッシュ情報
    meshes = gltf.get("meshes", [])
    print(f"メッシュ数: {len(meshes)}")
    for i, mesh in enumerate(meshes[:3]):  # 最初の3つのみ表示
        primitives = mesh.get("primitives", [])
        print(f"  メッシュ {i}: '{mesh.get('name', 'unnamed')}' - プリミティブ数: {len(primitives)}")

    # マテリアル情報
    materials = gltf.get("materials", [])
    print(f"\nマテリアル数: {len(materials)}")
    for i, mat in enumerate(materials[:3]):
        pbr = mat.get("pbrMetallicRoughness", {})
        base_color = pbr.get("baseColorFactor", [1, 1, 1, 1])
        metallic = pbr.get("metallicFactor", 1.0)
        roughness = pbr.get("roughnessFactor", 1.0)
        print(f"  マテリアル {i}: '{mat.get('name', 'unnamed')}'")
        print(f"    baseColor: {[round(c, 3) for c in base_color]}")
        print(f"    metallic: {metallic}  roughness: {roughness}")

    # アニメーション情報
    animations = gltf.get("animations", [])
    print(f"\nアニメーション数: {len(animations)}")
    for anim in animations[:3]:
        channels = anim.get("channels", [])
        print(f"  '{anim.get('name', 'unnamed')}' - チャンネル数: {len(channels)}")

    return gltf


def create_minimal_gltf(vertices: np.ndarray, indices: np.ndarray) -> dict:
    """
    最小構成の glTF 2.0 JSON を生成する（教育目的）。
    頂点データをBase64エンコードしてインラインに埋め込む。
    """
    vertices_f32 = vertices.astype(np.float32)
    indices_u16 = indices.astype(np.uint16).flatten()

    # バイナリデータをBase64エンコード
    vertex_bytes = vertices_f32.tobytes()
    index_bytes = indices_u16.tobytes()
    combined = vertex_bytes + index_bytes

    data_uri = "data:application/octet-stream;base64," + base64.b64encode(combined).decode()

    # 頂点の AABB を計算（accessor の min/max に必要）
    v_min = vertices_f32.min(axis=0).tolist()
    v_max = vertices_f32.max(axis=0).tolist()

    gltf = {
        "asset": {"version": "2.0", "generator": "minimal-gltf-generator"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0}],
        "meshes": [{
            "primitives": [{
                "attributes": {"POSITION": 0},
                "indices": 1,
            }]
        }],
        "accessors": [
            {
                "bufferView": 0, "componentType": 5126,  # FLOAT
                "count": len(vertices_f32), "type": "VEC3",
                "min": v_min, "max": v_max,
            },
            {
                "bufferView": 1, "componentType": 5123,  # UNSIGNED_SHORT
                "count": len(indices_u16), "type": "SCALAR",
            },
        ],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0,              "byteLength": len(vertex_bytes)},
            {"buffer": 0, "byteOffset": len(vertex_bytes), "byteLength": len(index_bytes)},
        ],
        "buffers": [{"uri": data_uri, "byteLength": len(combined)}],
    }
    return gltf


# 三角形の glTF を生成してみる
vertices = np.array([
    [0.0,  0.5, 0.0],
    [-0.5, -0.5, 0.0],
    [0.5, -0.5, 0.0],
], dtype=np.float32)
indices = np.array([[0, 1, 2]], dtype=np.uint16)

gltf_data = create_minimal_gltf(vertices, indices)
gltf_json = json.dumps(gltf_data, indent=2)
print("=== 最小 glTF JSON（三角形）===")
print(gltf_json[:500] + "...(省略)")

# glTF 拡張機能の主要一覧
print("\n=== 主要な glTF 拡張機能（KHR Extensions）===")
extensions = {
    "KHR_draco_mesh_compression": "Draco でメッシュを圧縮（ファイルサイズを大幅削減）",
    "KHR_materials_unlit":        "ライティングなしマテリアル（UI・2Dスプライト用途）",
    "KHR_texture_basisu":         "KTX2 / Basis Universal テクスチャ（GPU 圧縮対応）",
    "KHR_animation_pointer":      "任意プロパティのアニメーション",
    "KHR_lights_punctual":        "ポイントライト・スポットライトの定義",
    "EXT_mesh_gpu_instancing":    "GPU インスタンシング対応（大量の同一メッシュ）",
}
for ext, desc in extensions.items():
    print(f"  {ext:35s}  {desc}")
```

## 使用場面

- Three.js の `GLTFLoader` で Web ブラウザ上に3Dモデルを表示する
- Blender からキャラクターを glTF 2.0（GLB）エクスポートしてゲームエンジンに持ち込む
- WebXR・AR/VR アプリでの3Dアセット配信（軽量かつ標準的なフォーマット）
- AI 生成3Dモデル（Gaussian Splat 等）を glTF に変換して配信する
- Draco 圧縮で Web での転送サイズを最小化する

## 参考文献

- [glTF 2.0 Specification - Khronos](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html)
- [Khronos - glTF Overview](https://www.khronos.org/gltf/)
- [Three.js - GLTFLoader](https://threejs.org/docs/?q=gltf#examples/en/loaders/GLTFLoader)
- [glTF Viewer - Online glTF Viewer](https://gltf.report/)

<AffiliateBanner site="graphics_navi" />
