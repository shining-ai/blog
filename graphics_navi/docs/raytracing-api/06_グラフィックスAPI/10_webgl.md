import AffiliateBanner from '@site/src/components/AffiliateBanner';

# WebGL によるブラウザレンダリング

## WebGL とは

> WebGL（Web Graphics Library）は OpenGL ES 2.0/3.0 を JavaScript から利用するための Web 標準 API であり、プラグインなしでブラウザ上に高性能な2D/3Dグラフィックスをレンダリングできる。HTML5 の `<canvas>` 要素と組み合わせて使用する。

WebGL 1.0（2011年）は OpenGL ES 2.0 をベースにしており、すべてのモダンブラウザが対応している。WebGL 2.0（2017年）は OpenGL ES 3.0 ベースで、インスタンシング・SSBO・多数の新機能が追加された。

現在は WebGL の上位に位置する **WebGPU**（2023年）が Chrome 113 以降で利用可能になりており、Vulkan/Metal/D3D12 に対応したより低レベルかつ高パフォーマンスな API として注目されている。

**WebGL と Three.js の関係：**
WebGL は非常に低レベルな API であり、シェーダの記述・バッファ管理・描画コールの管理をすべて手動で行う必要がある。**Three.js** はこれらを抽象化した JavaScript ライブラリであり、実際のプロダクション開発では Three.js・Babylon.js・PlayCanvas などのフレームワークが広く使われている。

## WebGL 1.0 vs 2.0 vs WebGPU

| 機能 | WebGL 1.0 | WebGL 2.0 | WebGPU |
|------|----------|----------|--------|
| ベース | OpenGL ES 2.0 | OpenGL ES 3.0 | Vulkan/Metal/D3D12 |
| ブラウザ対応 | 全モダンブラウザ | Chrome/Firefox/Safari | Chrome 113+ / Firefox 実験的 |
| インスタンシング | 拡張（EXT_draw_instanced）| 標準 | 標準 |
| コンピュートシェーダ | 非対応 | 非対応 | 対応 |
| SSBO | 非対応 | 対応 | 対応 |
| 最大テクスチャサイズ | 2048px（一般） | 4096px+ | 8192px+ |
| シェーダ言語 | GLSL ES 1.0 | GLSL ES 3.0 | WGSL |

```javascript
// WebGL 2.0 での三角形描画（最小実装）
// HTML: <canvas id="glCanvas" width="800" height="600"></canvas>

const vertexShaderSource = `#version 300 es
// WebGL 2.0 は GLSL ES 3.0（300 es）を使用
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_color;
out vec3 v_color;

void main() {
    v_color = a_color;
    gl_Position = vec4(a_position, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;
in vec3 v_color;
out vec4 fragColor;

void main() {
    fragColor = vec4(v_color, 1.0);
}
`;

function compileShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
}

function createProgram(gl, vertSrc, fragSrc) {
    const vs = compileShader(gl, vertSrc, gl.VERTEX_SHADER);
    const fs = compileShader(gl, fragSrc, gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program));
    }
    return program;
}

function main() {
    const canvas = document.getElementById('glCanvas');
    // WebGL 2.0 コンテキストを取得
    const gl = canvas.getContext('webgl2');
    if (!gl) {
        console.error('WebGL 2.0 が利用できません。webgl にフォールバックしてください。');
        return;
    }

    // 頂点データ（位置 xyz + 色 rgb）をインターリーブ
    const vertices = new Float32Array([
         0.0,  0.5, 0.0,   1.0, 0.0, 0.0,  // 上: 赤
        -0.5, -0.5, 0.0,   0.0, 1.0, 0.0,  // 左下: 緑
         0.5, -0.5, 0.0,   0.0, 0.0, 1.0,  // 右下: 青
    ]);

    // VAO + VBO の作成
    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const FLOAT_SIZE = 4;
    const STRIDE = 6 * FLOAT_SIZE;

    // 位置属性 (location = 0)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE, 0);
    gl.enableVertexAttribArray(0);

    // 色属性 (location = 1)
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, STRIDE, 3 * FLOAT_SIZE);
    gl.enableVertexAttribArray(1);

    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    // レンダーループ
    function render() {
        gl.clearColor(0.1, 0.1, 0.1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(program);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        requestAnimationFrame(render);
    }
    render();
}

main();
```

```python
# Python で WebGL の概念を説明（Three.js との関係）
print("=== WebGL のエコシステム ===\n")

webgl_ecosystem = {
    "低レベル（Raw WebGL）": {
        "説明": "シェーダ・バッファ・状態管理をすべて手動で扱う",
        "メリット": "最高の制御性・パフォーマンス",
        "デメリット": "コード量が多い・デバッグが難しい",
        "適した用途": "カスタムレンダリング効果・高パフォーマンスが必要な場合",
    },
    "Three.js": {
        "説明": "WebGL の最も人気な抽象化ライブラリ",
        "メリット": "簡単・ドキュメント豊富・コミュニティ大",
        "デメリット": "柔軟性に制限（非常にカスタムな実装は困難）",
        "適した用途": "Web3D 全般・プロダクション",
    },
    "Babylon.js": {
        "説明": "ゲームエンジン寄りの機能を持つフレームワーク",
        "メリット": "物理エンジン・WebXR・PBR が充実",
        "デメリット": "Three.js より重い",
        "適した用途": "Web ゲーム・AR/VR",
    },
    "WebGPU": {
        "説明": "次世代のWeb グラフィックス API（Vulkan/Metal 抽象化）",
        "メリット": "コンピュートシェーダ対応・低オーバーヘッド",
        "デメリット": "まだ一部ブラウザのみ対応",
        "適した用途": "AI 推論・高パフォーマンスレンダリング",
    },
}

for name, info in webgl_ecosystem.items():
    print(f"[{name}]")
    for key, val in info.items():
        print(f"  {key}: {val}")
    print()
```

## 使用場面

- Three.js を使ったインタラクティブな3D Web サイト・データビジュアライゼーション
- Shadertoy のようなフラグメントシェーダアート・プロシージャルグラフィックス
- WebXR での AR/VR アプリケーション開発（Babylon.js・A-Frame）
- 科学データの3Dビジュアライゼーション（WebGL + D3.js）
- WebGPU への移行準備（WebGL の概念は共通する部分が多い）

## 参考文献

- [WebGL Fundamentals](https://webglfundamentals.org/) — WebGL から学ぶ最良の入門サイト
- [Three.js Documentation](https://threejs.org/docs/)
- [WebGPU Fundamentals](https://webgpufundamentals.org/)
- [MDN - WebGL API](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API)

<AffiliateBanner site="graphics_navi" />
