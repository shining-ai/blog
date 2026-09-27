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
    component: ComponentCreator('/docs', '2bc'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', 'e22'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', 'ef1'),
            routes: [
              {
                path: '/docs/compiler-runtime/intro',
                component: ComponentCreator('/docs/compiler-runtime/intro', '79f'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/コンパイラ_バックエンド/code_generation',
                component: ComponentCreator('/docs/compiler-runtime/コンパイラ_バックエンド/code_generation', 'd42'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/コンパイラ_バックエンド/dataflow',
                component: ComponentCreator('/docs/compiler-runtime/コンパイラ_バックエンド/dataflow', 'c4c'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/コンパイラ_バックエンド/ir',
                component: ComponentCreator('/docs/compiler-runtime/コンパイラ_バックエンド/ir', '761'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/コンパイラ_バックエンド/llvm',
                component: ComponentCreator('/docs/compiler-runtime/コンパイラ_バックエンド/llvm', '8ea'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/コンパイラ_バックエンド/optimization',
                component: ComponentCreator('/docs/compiler-runtime/コンパイラ_バックエンド/optimization', 'f07'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/コンパイラ_バックエンド/register_allocation',
                component: ComponentCreator('/docs/compiler-runtime/コンパイラ_バックエンド/register_allocation', 'e7f'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/コンパイラ_フロントエンド/ast',
                component: ComponentCreator('/docs/compiler-runtime/コンパイラ_フロントエンド/ast', '1cf'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/コンパイラ_フロントエンド/compiler_overview',
                component: ComponentCreator('/docs/compiler-runtime/コンパイラ_フロントエンド/compiler_overview', '175'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/コンパイラ_フロントエンド/lexer',
                component: ComponentCreator('/docs/compiler-runtime/コンパイラ_フロントエンド/lexer', 'e96'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/コンパイラ_フロントエンド/lr_parsing',
                component: ComponentCreator('/docs/compiler-runtime/コンパイラ_フロントエンド/lr_parsing', '588'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/コンパイラ_フロントエンド/parser_overview',
                component: ComponentCreator('/docs/compiler-runtime/コンパイラ_フロントエンド/parser_overview', '170'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/コンパイラ_フロントエンド/recursive_descent',
                component: ComponentCreator('/docs/compiler-runtime/コンパイラ_フロントエンド/recursive_descent', '9d6'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/コンパイラ_フロントエンド/scope_resolution',
                component: ComponentCreator('/docs/compiler-runtime/コンパイラ_フロントエンド/scope_resolution', '620'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/コンパイラ_フロントエンド/semantic_analysis',
                component: ComponentCreator('/docs/compiler-runtime/コンパイラ_フロントエンド/semantic_analysis', '710'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/ランタイムとメモリ管理/closures',
                component: ComponentCreator('/docs/compiler-runtime/ランタイムとメモリ管理/closures', '145'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/ランタイムとメモリ管理/copying_gc',
                component: ComponentCreator('/docs/compiler-runtime/ランタイムとメモリ管理/copying_gc', '5e8'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/ランタイムとメモリ管理/jit',
                component: ComponentCreator('/docs/compiler-runtime/ランタイムとメモリ管理/jit', '610'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/ランタイムとメモリ管理/mark_sweep_gc',
                component: ComponentCreator('/docs/compiler-runtime/ランタイムとメモリ管理/mark_sweep_gc', '264'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/ランタイムとメモリ管理/ref_counting_gc',
                component: ComponentCreator('/docs/compiler-runtime/ランタイムとメモリ管理/ref_counting_gc', 'd61'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/ランタイムとメモリ管理/stack_frame',
                component: ComponentCreator('/docs/compiler-runtime/ランタイムとメモリ管理/stack_frame', '90a'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/ランタイムとメモリ管理/vms',
                component: ComponentCreator('/docs/compiler-runtime/ランタイムとメモリ管理/vms', '034'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/並行性・非同期モデル/actor_model',
                component: ComponentCreator('/docs/compiler-runtime/並行性・非同期モデル/actor_model', 'a0f'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/並行性・非同期モデル/async_await',
                component: ComponentCreator('/docs/compiler-runtime/並行性・非同期モデル/async_await', '1c3'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/並行性・非同期モデル/csp',
                component: ComponentCreator('/docs/compiler-runtime/並行性・非同期モデル/csp', 'ae8'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/並行性・非同期モデル/event_loop',
                component: ComponentCreator('/docs/compiler-runtime/並行性・非同期モデル/event_loop', '955'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/並行性・非同期モデル/stm',
                component: ComponentCreator('/docs/compiler-runtime/並行性・非同期モデル/stm', '7be'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/compiler-runtime/並行性・非同期モデル/thread_model',
                component: ComponentCreator('/docs/compiler-runtime/並行性・非同期モデル/thread_model', '05d'),
                exact: true,
                sidebar: "compilerRuntimeSidebar"
              },
              {
                path: '/docs/lang-paradigm/intro',
                component: ComponentCreator('/docs/lang-paradigm/intro', 'c2a'),
                exact: true,
                sidebar: "langParadigmSidebar"
              },
              {
                path: '/docs/lang-paradigm/プログラミングパラダイム/functional_core',
                component: ComponentCreator('/docs/lang-paradigm/プログラミングパラダイム/functional_core', '8d2'),
                exact: true,
                sidebar: "langParadigmSidebar"
              },
              {
                path: '/docs/lang-paradigm/プログラミングパラダイム/higher_order',
                component: ComponentCreator('/docs/lang-paradigm/プログラミングパラダイム/higher_order', '19c'),
                exact: true,
                sidebar: "langParadigmSidebar"
              },
              {
                path: '/docs/lang-paradigm/プログラミングパラダイム/imperative',
                component: ComponentCreator('/docs/lang-paradigm/プログラミングパラダイム/imperative', '14d'),
                exact: true,
                sidebar: "langParadigmSidebar"
              },
              {
                path: '/docs/lang-paradigm/プログラミングパラダイム/logic_programming',
                component: ComponentCreator('/docs/lang-paradigm/プログラミングパラダイム/logic_programming', '6b2'),
                exact: true,
                sidebar: "langParadigmSidebar"
              },
              {
                path: '/docs/lang-paradigm/プログラミングパラダイム/monad',
                component: ComponentCreator('/docs/lang-paradigm/プログラミングパラダイム/monad', 'fd3'),
                exact: true,
                sidebar: "langParadigmSidebar"
              },
              {
                path: '/docs/lang-paradigm/プログラミングパラダイム/multiparadigm',
                component: ComponentCreator('/docs/lang-paradigm/プログラミングパラダイム/multiparadigm', 'e9a'),
                exact: true,
                sidebar: "langParadigmSidebar"
              },
              {
                path: '/docs/lang-paradigm/プログラミングパラダイム/oop',
                component: ComponentCreator('/docs/lang-paradigm/プログラミングパラダイム/oop', '01a'),
                exact: true,
                sidebar: "langParadigmSidebar"
              },
              {
                path: '/docs/lang-paradigm/型システム/adt',
                component: ComponentCreator('/docs/lang-paradigm/型システム/adt', 'f45'),
                exact: true,
                sidebar: "langParadigmSidebar"
              },
              {
                path: '/docs/lang-paradigm/型システム/dependent_types',
                component: ComponentCreator('/docs/lang-paradigm/型システム/dependent_types', 'c7e'),
                exact: true,
                sidebar: "langParadigmSidebar"
              },
              {
                path: '/docs/lang-paradigm/型システム/generics',
                component: ComponentCreator('/docs/lang-paradigm/型システム/generics', 'ccc'),
                exact: true,
                sidebar: "langParadigmSidebar"
              },
              {
                path: '/docs/lang-paradigm/型システム/null_safety',
                component: ComponentCreator('/docs/lang-paradigm/型システム/null_safety', 'c19'),
                exact: true,
                sidebar: "langParadigmSidebar"
              },
              {
                path: '/docs/lang-paradigm/型システム/static_dynamic',
                component: ComponentCreator('/docs/lang-paradigm/型システム/static_dynamic', 'f1f'),
                exact: true,
                sidebar: "langParadigmSidebar"
              },
              {
                path: '/docs/lang-paradigm/型システム/subtyping',
                component: ComponentCreator('/docs/lang-paradigm/型システム/subtyping', 'ce3'),
                exact: true,
                sidebar: "langParadigmSidebar"
              },
              {
                path: '/docs/lang-paradigm/型システム/type_inference',
                component: ComponentCreator('/docs/lang-paradigm/型システム/type_inference', '619'),
                exact: true,
                sidebar: "langParadigmSidebar"
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
