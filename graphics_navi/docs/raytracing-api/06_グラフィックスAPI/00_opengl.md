import AffiliateBanner from '@site/src/components/AffiliateBanner';

# OpenGL の概要と歴史

## OpenGL とは

> OpenGL（Open Graphics Library）は Silicon Graphics 社が1992年に公開したクロスプラットフォームの3Dグラフィックス API であり、Windows・macOS・Linux・組み込み系（OpenGL ES）で30年以上にわたって広く使われてきた業界標準の低レベルグラフィックス API である。

OpenGL は Khronos Group によって策定・管理されており、GPU の機能を抽象化した標準 API として PC・ワークステーション・スーパーコンピュータから組み込みデバイスまで幅広い環境をサポートしてきた。

**歴史的な進化：**
1. **GL 1.x（1992〜2002）**：固定機能パイプライン。ライティング・テクスチャ・変換が固定アルゴリズム。
2. **GL 2.0（2004）**：GLSL（OpenGL Shading Language）導入。プログラマブルシェーダが利用可能に。
3. **GL 3.x（2008〜2010）**：固定機能パイプラインを deprecated に。コアプロファイルとコンパティビリティプロファイルの分離。
4. **GL 4.x（2010〜2020）**：コンピュートシェーダ（4.3）・タイルベースレンダリング・Direct State Access（DSA）など追加。
5. **OpenGL ES 2.0/3.x（2007〜）**：モバイル向けサブセット。WebGL の基盤。
6. **現在の位置付け**：Windows では DirectX 12 / Vulkan に、macOS では Metal に移行が進む。モバイルでは Vulkan / Metal に置き換えられつつある。

**OpenGL が今でも使われる理由：**
学習リソースが豊富・既存コードベースが膨大・移植性が高い（Linux 環境での科学技術計算・CAD など）

## OpenGL のバージョン史

| バージョン | 年 | 主要な追加機能 |
|-----------|----|--------------|
| 1.0 | 1992 | 固定機能パイプライン・基本プリミティブ |
| 1.5 | 2003 | VBO（頂点バッファオブジェクト）・オクルージョンクエリ |
| 2.0 | 2004 | GLSL・プログラマブルシェーダ |
| 3.0 | 2008 | FBO・VAO・非推奨機能の廃止開始 |
| 3.3 | 2010 | Direct State Access の前身・インスタンシング |
| 4.3 | 2012 | コンピュートシェーダ・SSBO |
| 4.5 | 2014 | DSA（Direct State Access）・クリップコントロール |
| 4.6 | 2017 | SPIR-V シェーダのサポート（最新版） |

```python
# Python + PyOpenGL での最小限の OpenGL プログラム（学習目的）
# pip install PyOpenGL PyOpenGL_accelerate pygame

opengl_hello_triangle = """
# OpenGL 3.3 コアプロファイルで三角形を描画する最小プログラム

import pygame
from pygame.locals import *
from OpenGL.GL import *
import numpy as np
import ctypes

# 頂点シェーダ（GLSL 330 core）
VERTEX_SHADER = '''
#version 330 core
layout(location = 0) in vec3 position;
layout(location = 1) in vec3 color;
out vec3 v_color;
void main() {
    gl_Position = vec4(position, 1.0);
    v_color = color;
}
'''

# フラグメントシェーダ
FRAGMENT_SHADER = '''
#version 330 core
in vec3 v_color;
out vec4 FragColor;
void main() {
    FragColor = vec4(v_color, 1.0);
}
'''

def compile_shader(source, shader_type):
    shader = glCreateShader(shader_type)
    glShaderSource(shader, source)
    glCompileShader(shader)
    if not glGetShaderiv(shader, GL_COMPILE_STATUS):
        raise RuntimeError(glGetShaderInfoLog(shader).decode())
    return shader

def create_program(vert_src, frag_src):
    vs = compile_shader(vert_src, GL_VERTEX_SHADER)
    fs = compile_shader(frag_src, GL_FRAGMENT_SHADER)
    program = glCreateProgram()
    glAttachShader(program, vs)
    glAttachShader(program, fs)
    glLinkProgram(program)
    glDeleteShader(vs)
    glDeleteShader(fs)
    return program

def main():
    pygame.init()
    pygame.display.set_mode((800, 600), DOUBLEBUF | OPENGL)
    pygame.display.set_caption("OpenGL Hello Triangle")

    # バージョン確認
    print(f"OpenGL バージョン: {glGetString(GL_VERSION).decode()}")
    print(f"GLSL バージョン:   {glGetString(GL_SHADING_LANGUAGE_VERSION).decode()}")
    print(f"レンダラ:          {glGetString(GL_RENDERER).decode()}")

    # 頂点データ（位置 xyz + 色 rgb）
    vertices = np.array([
         0.0,  0.5, 0.0,  1.0, 0.0, 0.0,  # 上: 赤
        -0.5, -0.5, 0.0,  0.0, 1.0, 0.0,  # 左下: 緑
         0.5, -0.5, 0.0,  0.0, 0.0, 1.0,  # 右下: 青
    ], dtype=np.float32)

    # VAO と VBO の作成
    vao = glGenVertexArrays(1)
    vbo = glGenBuffers(1)

    glBindVertexArray(vao)
    glBindBuffer(GL_ARRAY_BUFFER, vbo)
    glBufferData(GL_ARRAY_BUFFER, vertices.nbytes, vertices, GL_STATIC_DRAW)

    stride = 6 * 4  # 6 floats × 4 bytes
    # 位置属性（location = 0）
    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, stride, ctypes.c_void_p(0))
    glEnableVertexAttribArray(0)
    # 色属性（location = 1）
    glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, stride, ctypes.c_void_p(3 * 4))
    glEnableVertexAttribArray(1)

    program = create_program(VERTEX_SHADER, FRAGMENT_SHADER)

    running = True
    while running:
        for event in pygame.event.get():
            if event.type == QUIT:
                running = False

        glClearColor(0.1, 0.1, 0.1, 1.0)
        glClear(GL_COLOR_BUFFER_BIT)

        glUseProgram(program)
        glBindVertexArray(vao)
        glDrawArrays(GL_TRIANGLES, 0, 3)

        pygame.display.flip()
        pygame.time.wait(16)

    pygame.quit()

if __name__ == "__main__":
    main()
"""

# OpenGL のオブジェクト管理の概念
print("=== OpenGL オブジェクトの概念 ===\n")

opengl_objects = {
    "VAO（Vertex Array Object）": "頂点属性の設定（どのバッファの何番目オフセットがどの属性か）を記録するオブジェクト",
    "VBO（Vertex Buffer Object）": "頂点データ（位置・法線・UV等）を保持するGPUバッファ",
    "EBO（Element Buffer Object）": "インデックスデータを保持するバッファ。頂点の再利用が可能",
    "FBO（Framebuffer Object）": "オフスクリーンレンダリング先のフレームバッファ",
    "Texture Object": "2D・3D・Cubemap などのテクスチャデータを保持",
    "Shader / Program": "GLSL シェーダのコンパイル・リンクされたプログラムオブジェクト",
    "SSBO（Shader Storage Buffer Object）": "シェーダから読み書き可能な大容量バッファ（GL 4.3+）",
    "UBO（Uniform Buffer Object）": "複数シェーダ間で共有できるユニフォームデータのバッファ",
}

for obj, desc in opengl_objects.items():
    print(f"  [{obj}]")
    print(f"    {desc}\n")

print(opengl_hello_triangle[:200] + "\n  ...(実際のコードは上記参照)")
```

## 使用場面

- Learn OpenGL チュートリアルで3Dグラフィックスの基礎を学ぶ（推奨入門ルート）
- Linux サーバでの科学技術可視化・CAD・シミュレーション結果の表示
- WebGL 開発の前段階として OpenGL の概念を理解する
- OpenGL ES をベースにした Android / iOS アプリのグラフィックス実装
- 既存の OpenGL コードベースのメンテナンスと Vulkan への移行計画

## 参考文献

- [Learn OpenGL - learnopengl.com](https://learnopengl.com/) — 最もよく整備された入門サイト
- [OpenGL Registry - Khronos](https://registry.khronos.org/OpenGL/)
- [OpenGL Programming Guide, 9th Edition (Addison-Wesley)](https://www.opengl-redbook.com/)
- [The OpenGL Superbible, 7th Edition](http://www.openglsuperbible.com/)

<AffiliateBanner site="graphics_navi" />
