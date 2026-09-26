import AffiliateBanner from '@site/src/components/AffiliateBanner';

# アンビエントオクルージョン（SSAO）

## SSAO とは

> SSAO（Screen-Space Ambient Occlusion）は、Gスクリーン空間の深度バッファと法線バッファを使って、各ピクセルの周辺ジオメトリによるアンビエント光の遮蔽具合を推定し、コーナーや隙間を暗くすることで立体感を増すポストプロセス手法である。

アンビエントオクルージョン（AO）は、コーナー・隙間・溝など周囲にジオメトリが密集している箇所には環境光が届きにくいという現象を表現します。オフラインレンダリングではレイキャスティングで正確に計算しますが、リアルタイムでは Crytek の Vladim Kajalin が 2007年に提案した SSAO が画期的な解決策となりました。

SSAO はスクリーン空間のみの情報（深度・法線）を使うため、ポリゴン数に依存せず一定のコストで計算できます。実装は以下のステップで行います。①Gバッファから法線・深度を再構築してビュー空間座標を得る、②各ピクセルの接線空間半球内にランダムサンプル点を配置する、③各サンプル点をビュー空間に変換してシーン深度と比較する、④遮蔽された割合を集計して AO 値とする、⑤ブラーで AO テクスチャをスムージングする。

サンプル点の分布を改善した **HBAO（Horizon Based AO）** や、タイルごとにキャッシュを利用する **GTAO（Ground Truth AO）** など、SSAO を発展させた手法が研究・実装されています。Unreal Engine や Unity HDRP では GTAO が標準で採用されています。

## SSAO の処理パイプライン

| ステップ | 入力 | 出力 |
|---------|------|------|
| Gバッファ描画 | ジオメトリ | 深度・法線テクスチャ |
| SSAO 計算 | 深度・法線・ランダムサンプル | AO テクスチャ（生） |
| ブラー（分離ガウスブラー） | 生 AO テクスチャ | スムーズ AO テクスチャ |
| ライティング適用 | カラー + AO | 最終カラー |

```glsl
// SSAO フラグメントシェーダ
#version 450 core

in vec2 v_uv;
out float FragAO;

uniform sampler2D u_position;  // ビュー空間位置
uniform sampler2D u_normal;    // ビュー空間法線
uniform sampler2D u_noise;     // 4x4 ランダム回転テクスチャ
uniform vec3 u_samples[64];    // 半球サンプルカーネル
uniform mat4 u_projection;

const vec2 NOISE_SCALE = vec2(1280.0 / 4.0, 720.0 / 4.0); // 解像度依存
const float RADIUS  = 0.5;  // サンプル半球の半径
const float BIAS    = 0.025; // セルフオクルージョン防止バイアス

void main() {
    // Gバッファからビュー空間の位置・法線を取得
    vec3 frag_pos = texture(u_position, v_uv).xyz;
    vec3 normal   = normalize(texture(u_normal, v_uv).rgb);

    // ランダムな回転ベクトル（タイル状ノイズテクスチャ）
    vec3 random_vec = normalize(texture(u_noise, v_uv * NOISE_SCALE).xyz);

    // TBN 行列（接線空間 -> ビュー空間）
    vec3 tangent   = normalize(random_vec - normal * dot(random_vec, normal));
    vec3 bitangent = cross(normal, tangent);
    mat3 TBN       = mat3(tangent, bitangent, normal);

    float occlusion = 0.0;

    for (int i = 0; i < 64; i++) {
        // サンプルをビュー空間へ変換
        vec3 sample_pos = TBN * u_samples[i];
        sample_pos = frag_pos + sample_pos * RADIUS;

        // サンプル点をスクリーン座標に投影
        vec4 offset = u_projection * vec4(sample_pos, 1.0);
        offset.xyz /= offset.w;
        offset.xyz  = offset.xyz * 0.5 + 0.5;  // NDC -> UV

        // シーンの深度と比較
        float sample_depth = texture(u_position, offset.xy).z;
        float range_check  = smoothstep(0.0, 1.0,
                               RADIUS / abs(frag_pos.z - sample_depth));
        occlusion += (sample_depth >= sample_pos.z + BIAS ? 1.0 : 0.0) * range_check;
    }

    // 遮蔽率を [0,1] に正規化（1 = 完全遮蔽）
    FragAO = 1.0 - (occlusion / 64.0);
}
```

```python
# SSAO のサンプルカーネル生成（CPU 側）
import numpy as np

def generate_ssao_kernel(n_samples=64, seed=42):
    """
    半球内の均一分布サンプル点を生成する。
    中心に近い点を増やすため加速補間を適用。
    """
    rng = np.random.default_rng(seed)
    kernel = []

    for i in range(n_samples):
        sample = np.array([
            rng.random() * 2.0 - 1.0,  # x: [-1, 1]
            rng.random() * 2.0 - 1.0,  # y: [-1, 1]
            rng.random()                # z: [0, 1]（半球）
        ])
        sample /= np.linalg.norm(sample)
        sample *= rng.random()  # 半径をランダムに

        # 中心に集中するよう加速補間
        scale = i / n_samples
        scale = 0.1 + scale * scale * 0.9  # lerp(0.1, 1.0, scale^2)
        sample *= scale
        kernel.append(sample)

    return np.array(kernel)

kernel = generate_ssao_kernel()
print(f"Generated {len(kernel)} SSAO samples")
print("Sample[0]:", kernel[0])
print("Sample max distance:", np.max(np.linalg.norm(kernel, axis=1)))
```

## 使用場面

- ゲームやリアルタイム VFX でのコーナー・隙間への影付け
- ディファードレンダリングパイプラインのポストプロセスとして
- 建築ビジュアライゼーションでの空間の深み表現
- PBR ライティングのアンビエント項の遮蔽に乗算
- プレベイク AO マップの代替（動的シーン対応）

## 参考文献

- [LearnOpenGL — SSAO](https://learnopengl.com/Advanced-Lighting/SSAO)
- Vladn Kajalin, "Screen-Space Ambient Occlusion" — ShaderX7, 2009
- [Jorge Jimenez — GTAO](https://www.iryoku.com/downloads/Practical-Realtime-Strategies-for-Accurate-Indirect-Occlusion.pdf)

<AffiliateBanner site="graphics_navi" />
