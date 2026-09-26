import AffiliateBanner from '@site/src/components/AffiliateBanner';

# リアルタイムレンダリングの概要

## リアルタイムレンダリングとは

> リアルタイムレンダリングとは、ゲームや対話型アプリケーションで毎秒30〜120フレーム以上の速度で3Dシーンを生成・表示する技術の総称であり、GPU による並列処理と固定パイプラインで高速化を実現する。

リアルタイムレンダリングは映画のオフラインレンダリングとは異なり、「インタラクティブ性」が最大の要件です。ユーザーの操作に応じて毎フレーム映像を再計算するため、1フレームあたり16.6ms（60fps）以内に処理を完了しなければなりません。

現代のリアルタイムレンダリングは**グラフィックスパイプライン**と呼ばれる処理の連鎖で構成されています。アプリケーションがCPU側で頂点データ・テクスチャ・シェーダをGPUに転送し、GPUが頂点処理・ラスタライゼーション・フラグメント処理の各ステージを並列実行します。

主要なグラフィックスAPIにはOpenGL・Vulkan・DirectX・Metalがあり、抽象度と制御粒度がそれぞれ異なります。シェーダプログラム（GLSL・HLSL）はGPU上で動くプログラムで、開発者がパイプラインの頂点処理とフラグメント処理をカスタマイズできます。

## リアルタイムレンダリングパイプラインのステージ

| ステージ | 処理内容 | プログラム可能 |
|---------|---------|-------------|
| 頂点処理 | MVP変換・法線変換 | 頂点シェーダ |
| テッセレーション | サブディビジョン | テッセレーションシェーダ |
| ジオメトリ | プリミティブ操作 | ジオメトリシェーダ |
| ラスタライゼーション | 三角形→フラグメント | 固定機能 |
| フラグメント処理 | カラー・ライティング計算 | フラグメントシェーダ |
| 出力マージ | デプステスト・ブレンディング | 部分的に設定可能 |

```glsl
// 最小構成のOpenGL シェーダペア

// 頂点シェーダ
#version 330 core
uniform mat4 u_mvp;
in vec3 a_position;
in vec2 a_uv;
out vec2 v_uv;

void main() {
    v_uv = a_uv;
    gl_Position = u_mvp * vec4(a_position, 1.0);
}

// フラグメントシェーダ
#version 330 core
uniform sampler2D u_texture;
in vec2 v_uv;
out vec4 FragColor;

void main() {
    FragColor = texture(u_texture, v_uv);
}
```

```python
# フレームレートと処理時間の目安
fps_targets = {
    "映画（オフライン）": "無制限（数時間/フレームも可）",
    "VR (90fps)": "11.1 ms/フレーム",
    "ゲーム (60fps)": "16.6 ms/フレーム",
    "最低限 (30fps)": "33.3 ms/フレーム",
}

for target, budget in fps_targets.items():
    print(f"{target}: {budget}")
```

## 使用場面

- ゲームエンジン（Unity・Unreal Engine）でのリアルタイムシーン描画
- VR/ARアプリケーションでの低レイテンシ・高フレームレート描画
- CAD・シミュレーションソフトウェアでのインタラクティブビューア
- ブラウザ上でのWebGL/WebGPUを使った3D可視化
- 自動車のHUD・産業用ビジュアライゼーション

## 参考文献

- Akenine-Möller et al., *Real-Time Rendering*, 4th ed. — 包括的なリファレンス
- [LearnOpenGL — Introduction](https://learnopengl.com/)
- [GPU Gems — NVIDIA Developer](https://developer.nvidia.com/gpugems/gpugems/foreword)

<AffiliateBanner site="graphics_navi" />
