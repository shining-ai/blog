import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/markdown-page',
    component: ComponentCreator('/markdown-page', '3d7'),
    exact: true
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', '1bc'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', '70f'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', 'b51'),
            routes: [
              {
                path: '/docs/raytracing-api/05_3Dアセットとアニメーション/gltf',
                component: ComponentCreator('/docs/raytracing-api/05_3Dアセットとアニメーション/gltf', '4c6'),
                exact: true,
                sidebar: "rayTracingApiSidebar"
              },
              {
                path: '/docs/raytracing-api/05_3Dアセットとアニメーション/polygon_mesh',
                component: ComponentCreator('/docs/raytracing-api/05_3Dアセットとアニメーション/polygon_mesh', 'c26'),
                exact: true,
                sidebar: "rayTracingApiSidebar"
              },
              {
                path: '/docs/raytracing-api/05_3Dアセットとアニメーション/skinning',
                component: ComponentCreator('/docs/raytracing-api/05_3Dアセットとアニメーション/skinning', '2b3'),
                exact: true,
                sidebar: "rayTracingApiSidebar"
              },
              {
                path: '/docs/raytracing-api/05_3Dアセットとアニメーション/uv_mapping',
                component: ComponentCreator('/docs/raytracing-api/05_3Dアセットとアニメーション/uv_mapping', '40a'),
                exact: true,
                sidebar: "rayTracingApiSidebar"
              },
              {
                path: '/docs/raytracing-api/intro',
                component: ComponentCreator('/docs/raytracing-api/intro', '68f'),
                exact: true,
                sidebar: "rayTracingApiSidebar"
              },
              {
                path: '/docs/raytracing-api/グラフィックスAPI/metal_dx12',
                component: ComponentCreator('/docs/raytracing-api/グラフィックスAPI/metal_dx12', 'fa6'),
                exact: true,
                sidebar: "rayTracingApiSidebar"
              },
              {
                path: '/docs/raytracing-api/グラフィックスAPI/opengl',
                component: ComponentCreator('/docs/raytracing-api/グラフィックスAPI/opengl', 'fcf'),
                exact: true,
                sidebar: "rayTracingApiSidebar"
              },
              {
                path: '/docs/raytracing-api/グラフィックスAPI/vulkan',
                component: ComponentCreator('/docs/raytracing-api/グラフィックスAPI/vulkan', 'ba3'),
                exact: true,
                sidebar: "rayTracingApiSidebar"
              },
              {
                path: '/docs/raytracing-api/グラフィックスAPI/webgl',
                component: ComponentCreator('/docs/raytracing-api/グラフィックスAPI/webgl', '9fd'),
                exact: true,
                sidebar: "rayTracingApiSidebar"
              },
              {
                path: '/docs/raytracing-api/レイトレーシング/bvh',
                component: ComponentCreator('/docs/raytracing-api/レイトレーシング/bvh', '8ff'),
                exact: true,
                sidebar: "rayTracingApiSidebar"
              },
              {
                path: '/docs/raytracing-api/レイトレーシング/gpu_raytracing',
                component: ComponentCreator('/docs/raytracing-api/レイトレーシング/gpu_raytracing', '20f'),
                exact: true,
                sidebar: "rayTracingApiSidebar"
              },
              {
                path: '/docs/raytracing-api/レイトレーシング/path_tracing',
                component: ComponentCreator('/docs/raytracing-api/レイトレーシング/path_tracing', '757'),
                exact: true,
                sidebar: "rayTracingApiSidebar"
              },
              {
                path: '/docs/raytracing-api/レイトレーシング/ray_casting',
                component: ComponentCreator('/docs/raytracing-api/レイトレーシング/ray_casting', 'a22'),
                exact: true,
                sidebar: "rayTracingApiSidebar"
              },
              {
                path: '/docs/raytracing-api/レイトレーシング/reflection_refraction',
                component: ComponentCreator('/docs/raytracing-api/レイトレーシング/reflection_refraction', '325'),
                exact: true,
                sidebar: "rayTracingApiSidebar"
              },
              {
                path: '/docs/rendering-pipeline/intro',
                component: ComponentCreator('/docs/rendering-pipeline/intro', '542'),
                exact: true,
                sidebar: "renderingPipelineSidebar"
              },
              {
                path: '/docs/rendering-pipeline/グラフィックスのための数学/coordinate_systems',
                component: ComponentCreator('/docs/rendering-pipeline/グラフィックスのための数学/coordinate_systems', 'edf'),
                exact: true,
                sidebar: "renderingPipelineSidebar"
              },
              {
                path: '/docs/rendering-pipeline/グラフィックスのための数学/homogeneous',
                component: ComponentCreator('/docs/rendering-pipeline/グラフィックスのための数学/homogeneous', 'b38'),
                exact: true,
                sidebar: "renderingPipelineSidebar"
              },
              {
                path: '/docs/rendering-pipeline/グラフィックスのための数学/matrix_transform',
                component: ComponentCreator('/docs/rendering-pipeline/グラフィックスのための数学/matrix_transform', 'a48'),
                exact: true,
                sidebar: "renderingPipelineSidebar"
              },
              {
                path: '/docs/rendering-pipeline/グラフィックスのための数学/quaternion',
                component: ComponentCreator('/docs/rendering-pipeline/グラフィックスのための数学/quaternion', '9f7'),
                exact: true,
                sidebar: "renderingPipelineSidebar"
              },
              {
                path: '/docs/rendering-pipeline/グラフィックスのための数学/vectors',
                component: ComponentCreator('/docs/rendering-pipeline/グラフィックスのための数学/vectors', '774'),
                exact: true,
                sidebar: "renderingPipelineSidebar"
              },
              {
                path: '/docs/rendering-pipeline/シェーダ/compute_shader',
                component: ComponentCreator('/docs/rendering-pipeline/シェーダ/compute_shader', '46e'),
                exact: true,
                sidebar: "renderingPipelineSidebar"
              },
              {
                path: '/docs/rendering-pipeline/シェーダ/fragment_shader',
                component: ComponentCreator('/docs/rendering-pipeline/シェーダ/fragment_shader', 'be2'),
                exact: true,
                sidebar: "renderingPipelineSidebar"
              },
              {
                path: '/docs/rendering-pipeline/シェーダ/post_effects',
                component: ComponentCreator('/docs/rendering-pipeline/シェーダ/post_effects', 'f6c'),
                exact: true,
                sidebar: "renderingPipelineSidebar"
              },
              {
                path: '/docs/rendering-pipeline/シェーダ/shader_intro',
                component: ComponentCreator('/docs/rendering-pipeline/シェーダ/shader_intro', '66b'),
                exact: true,
                sidebar: "renderingPipelineSidebar"
              },
              {
                path: '/docs/rendering-pipeline/シェーダ/vertex_shader',
                component: ComponentCreator('/docs/rendering-pipeline/シェーダ/vertex_shader', '699'),
                exact: true,
                sidebar: "renderingPipelineSidebar"
              },
              {
                path: '/docs/rendering-pipeline/ライティングとシェーディング/global_illumination',
                component: ComponentCreator('/docs/rendering-pipeline/ライティングとシェーディング/global_illumination', '0c9'),
                exact: true,
                sidebar: "renderingPipelineSidebar"
              },
              {
                path: '/docs/rendering-pipeline/ライティングとシェーディング/normal_mapping',
                component: ComponentCreator('/docs/rendering-pipeline/ライティングとシェーディング/normal_mapping', 'f58'),
                exact: true,
                sidebar: "renderingPipelineSidebar"
              },
              {
                path: '/docs/rendering-pipeline/ライティングとシェーディング/pbr',
                component: ComponentCreator('/docs/rendering-pipeline/ライティングとシェーディング/pbr', 'dd2'),
                exact: true,
                sidebar: "renderingPipelineSidebar"
              },
              {
                path: '/docs/rendering-pipeline/ライティングとシェーディング/phong',
                component: ComponentCreator('/docs/rendering-pipeline/ライティングとシェーディング/phong', 'd4d'),
                exact: true,
                sidebar: "renderingPipelineSidebar"
              },
              {
                path: '/docs/rendering-pipeline/ライティングとシェーディング/shadow_mapping',
                component: ComponentCreator('/docs/rendering-pipeline/ライティングとシェーディング/shadow_mapping', '309'),
                exact: true,
                sidebar: "renderingPipelineSidebar"
              },
              {
                path: '/docs/rendering-pipeline/ライティングとシェーディング/ssao',
                component: ComponentCreator('/docs/rendering-pipeline/ライティングとシェーディング/ssao', 'ee1'),
                exact: true,
                sidebar: "renderingPipelineSidebar"
              },
              {
                path: '/docs/rendering-pipeline/レンダリングパイプライン/antialiasing',
                component: ComponentCreator('/docs/rendering-pipeline/レンダリングパイプライン/antialiasing', '1ae'),
                exact: true,
                sidebar: "renderingPipelineSidebar"
              },
              {
                path: '/docs/rendering-pipeline/レンダリングパイプライン/fragment_processing',
                component: ComponentCreator('/docs/rendering-pipeline/レンダリングパイプライン/fragment_processing', '1c3'),
                exact: true,
                sidebar: "renderingPipelineSidebar"
              },
              {
                path: '/docs/rendering-pipeline/レンダリングパイプライン/rasterization',
                component: ComponentCreator('/docs/rendering-pipeline/レンダリングパイプライン/rasterization', '0a5'),
                exact: true,
                sidebar: "renderingPipelineSidebar"
              },
              {
                path: '/docs/rendering-pipeline/レンダリングパイプライン/realtime_rendering',
                component: ComponentCreator('/docs/rendering-pipeline/レンダリングパイプライン/realtime_rendering', 'a9c'),
                exact: true,
                sidebar: "renderingPipelineSidebar"
              },
              {
                path: '/docs/rendering-pipeline/レンダリングパイプライン/texture_mapping',
                component: ComponentCreator('/docs/rendering-pipeline/レンダリングパイプライン/texture_mapping', 'c72'),
                exact: true,
                sidebar: "renderingPipelineSidebar"
              },
              {
                path: '/docs/rendering-pipeline/レンダリングパイプライン/vertex_processing',
                component: ComponentCreator('/docs/rendering-pipeline/レンダリングパイプライン/vertex_processing', 'dd2'),
                exact: true,
                sidebar: "renderingPipelineSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/',
    component: ComponentCreator('/', 'e5f'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
