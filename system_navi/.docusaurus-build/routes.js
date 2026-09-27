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
    component: ComponentCreator('/docs', '486'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', 'd2e'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', '872'),
            routes: [
              {
                path: '/docs/computer-architecture/GPU・並列計算/cuda_memory',
                component: ComponentCreator('/docs/computer-architecture/GPU・並列計算/cuda_memory', 'da3'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/GPU・並列計算/cuda_optimization',
                component: ComponentCreator('/docs/computer-architecture/GPU・並列計算/cuda_optimization', 'db0'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/GPU・並列計算/cuda_programming',
                component: ComponentCreator('/docs/computer-architecture/GPU・並列計算/cuda_programming', '7a3'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/GPU・並列計算/gpgpu',
                component: ComponentCreator('/docs/computer-architecture/GPU・並列計算/gpgpu', '384'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/GPU・並列計算/gpu_architecture',
                component: ComponentCreator('/docs/computer-architecture/GPU・並列計算/gpu_architecture', 'f9e'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/intro',
                component: ComponentCreator('/docs/computer-architecture/intro', 'c16'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/データ形式・圧縮/jpeg',
                component: ComponentCreator('/docs/computer-architecture/データ形式・圧縮/jpeg', 'b1e'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/データ形式・圧縮/png',
                component: ComponentCreator('/docs/computer-architecture/データ形式・圧縮/png', 'e7b'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/データ形式・圧縮/run_length_lz',
                component: ComponentCreator('/docs/computer-architecture/データ形式・圧縮/run_length_lz', '459'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/データ形式・圧縮/video_codec',
                component: ComponentCreator('/docs/computer-architecture/データ形式・圧縮/video_codec', '63e'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/データ形式・圧縮/zlib',
                component: ComponentCreator('/docs/computer-architecture/データ形式・圧縮/zlib', '80a'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/データ表現/binary_numbers',
                component: ComponentCreator('/docs/computer-architecture/データ表現/binary_numbers', '563'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/データ表現/character_encoding',
                component: ComponentCreator('/docs/computer-architecture/データ表現/character_encoding', '8dc'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/データ表現/endianness',
                component: ComponentCreator('/docs/computer-architecture/データ表現/endianness', 'ad4'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/データ表現/floating_point',
                component: ComponentCreator('/docs/computer-architecture/データ表現/floating_point', '4f3'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/データ表現/twos_complement',
                component: ComponentCreator('/docs/computer-architecture/データ表現/twos_complement', '829'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/プロセッサアーキテクチャ/branch_prediction',
                component: ComponentCreator('/docs/computer-architecture/プロセッサアーキテクチャ/branch_prediction', 'a0c'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/プロセッサアーキテクチャ/cpu_structure',
                component: ComponentCreator('/docs/computer-architecture/プロセッサアーキテクチャ/cpu_structure', '9d5'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/プロセッサアーキテクチャ/instruction_cycle',
                component: ComponentCreator('/docs/computer-architecture/プロセッサアーキテクチャ/instruction_cycle', '863'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/プロセッサアーキテクチャ/isa_overview',
                component: ComponentCreator('/docs/computer-architecture/プロセッサアーキテクチャ/isa_overview', 'c48'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/プロセッサアーキテクチャ/pipeline',
                component: ComponentCreator('/docs/computer-architecture/プロセッサアーキテクチャ/pipeline', '793'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/プロセッサアーキテクチャ/riscv',
                component: ComponentCreator('/docs/computer-architecture/プロセッサアーキテクチャ/riscv', '29a'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/プロセッサアーキテクチャ/superscalar',
                component: ComponentCreator('/docs/computer-architecture/プロセッサアーキテクチャ/superscalar', '84a'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/プロセッサアーキテクチャ/x86_64',
                component: ComponentCreator('/docs/computer-architecture/プロセッサアーキテクチャ/x86_64', 'b0f'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/メモリ階層/cache',
                component: ComponentCreator('/docs/computer-architecture/メモリ階層/cache', '640'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/メモリ階層/dram',
                component: ComponentCreator('/docs/computer-architecture/メモリ階層/dram', '33f'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/メモリ階層/memory_hierarchy',
                component: ComponentCreator('/docs/computer-architecture/メモリ階層/memory_hierarchy', 'c75'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/メモリ階層/mesi',
                component: ComponentCreator('/docs/computer-architecture/メモリ階層/mesi', '7fb'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/メモリ階層/page_replacement',
                component: ComponentCreator('/docs/computer-architecture/メモリ階層/page_replacement', '1a9'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/メモリ階層/tlb',
                component: ComponentCreator('/docs/computer-architecture/メモリ階層/tlb', 'eef'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/メモリ階層/virtual_memory',
                component: ComponentCreator('/docs/computer-architecture/メモリ階層/virtual_memory', '0e9'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/論理回路/boolean_algebra',
                component: ComponentCreator('/docs/computer-architecture/論理回路/boolean_algebra', '3db'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/論理回路/combinational_circuits',
                component: ComponentCreator('/docs/computer-architecture/論理回路/combinational_circuits', 'a50'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/論理回路/fsm',
                component: ComponentCreator('/docs/computer-architecture/論理回路/fsm', '1a2'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/論理回路/hdl',
                component: ComponentCreator('/docs/computer-architecture/論理回路/hdl', 'ea6'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/論理回路/karnaugh_map',
                component: ComponentCreator('/docs/computer-architecture/論理回路/karnaugh_map', 'e7e'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/computer-architecture/論理回路/sequential_circuits',
                component: ComponentCreator('/docs/computer-architecture/論理回路/sequential_circuits', '367'),
                exact: true,
                sidebar: "computerArchitectureSidebar"
              },
              {
                path: '/docs/operating-system/intro',
                component: ComponentCreator('/docs/operating-system/intro', '789'),
                exact: true,
                sidebar: "operatingSystemSidebar"
              },
              {
                path: '/docs/operating-system/オペレーティングシステム/context_switch',
                component: ComponentCreator('/docs/operating-system/オペレーティングシステム/context_switch', '29e'),
                exact: true,
                sidebar: "operatingSystemSidebar"
              },
              {
                path: '/docs/operating-system/オペレーティングシステム/deadlock',
                component: ComponentCreator('/docs/operating-system/オペレーティングシステム/deadlock', '8b2'),
                exact: true,
                sidebar: "operatingSystemSidebar"
              },
              {
                path: '/docs/operating-system/オペレーティングシステム/filesystem',
                component: ComponentCreator('/docs/operating-system/オペレーティングシステム/filesystem', '29e'),
                exact: true,
                sidebar: "operatingSystemSidebar"
              },
              {
                path: '/docs/operating-system/オペレーティングシステム/io',
                component: ComponentCreator('/docs/operating-system/オペレーティングシステム/io', 'ab4'),
                exact: true,
                sidebar: "operatingSystemSidebar"
              },
              {
                path: '/docs/operating-system/オペレーティングシステム/ipc',
                component: ComponentCreator('/docs/operating-system/オペレーティングシステム/ipc', 'afb'),
                exact: true,
                sidebar: "operatingSystemSidebar"
              },
              {
                path: '/docs/operating-system/オペレーティングシステム/linux_kernel',
                component: ComponentCreator('/docs/operating-system/オペレーティングシステム/linux_kernel', '229'),
                exact: true,
                sidebar: "operatingSystemSidebar"
              },
              {
                path: '/docs/operating-system/オペレーティングシステム/memory_management',
                component: ComponentCreator('/docs/operating-system/オペレーティングシステム/memory_management', '6a6'),
                exact: true,
                sidebar: "operatingSystemSidebar"
              },
              {
                path: '/docs/operating-system/オペレーティングシステム/os_overview',
                component: ComponentCreator('/docs/operating-system/オペレーティングシステム/os_overview', 'd50'),
                exact: true,
                sidebar: "operatingSystemSidebar"
              },
              {
                path: '/docs/operating-system/オペレーティングシステム/process_scheduling',
                component: ComponentCreator('/docs/operating-system/オペレーティングシステム/process_scheduling', 'cd1'),
                exact: true,
                sidebar: "operatingSystemSidebar"
              },
              {
                path: '/docs/operating-system/オペレーティングシステム/process_thread',
                component: ComponentCreator('/docs/operating-system/オペレーティングシステム/process_thread', '8bb'),
                exact: true,
                sidebar: "operatingSystemSidebar"
              },
              {
                path: '/docs/operating-system/オペレーティングシステム/signal',
                component: ComponentCreator('/docs/operating-system/オペレーティングシステム/signal', 'fee'),
                exact: true,
                sidebar: "operatingSystemSidebar"
              },
              {
                path: '/docs/operating-system/オペレーティングシステム/synchronization',
                component: ComponentCreator('/docs/operating-system/オペレーティングシステム/synchronization', '7fe'),
                exact: true,
                sidebar: "operatingSystemSidebar"
              },
              {
                path: '/docs/operating-system/オペレーティングシステム/syscall',
                component: ComponentCreator('/docs/operating-system/オペレーティングシステム/syscall', '838'),
                exact: true,
                sidebar: "operatingSystemSidebar"
              },
              {
                path: '/docs/operating-system/システムプログラミング/c_memory_model',
                component: ComponentCreator('/docs/operating-system/システムプログラミング/c_memory_model', '797'),
                exact: true,
                sidebar: "operatingSystemSidebar"
              },
              {
                path: '/docs/operating-system/システムプログラミング/dynamic_memory',
                component: ComponentCreator('/docs/operating-system/システムプログラミング/dynamic_memory', 'f99'),
                exact: true,
                sidebar: "operatingSystemSidebar"
              },
              {
                path: '/docs/operating-system/システムプログラミング/pointers',
                component: ComponentCreator('/docs/operating-system/システムプログラミング/pointers', '42b'),
                exact: true,
                sidebar: "operatingSystemSidebar"
              },
              {
                path: '/docs/operating-system/システムプログラミング/posix_api',
                component: ComponentCreator('/docs/operating-system/システムプログラミング/posix_api', '6ee'),
                exact: true,
                sidebar: "operatingSystemSidebar"
              },
              {
                path: '/docs/operating-system/システムプログラミング/pthreads',
                component: ComponentCreator('/docs/operating-system/システムプログラミング/pthreads', '878'),
                exact: true,
                sidebar: "operatingSystemSidebar"
              },
              {
                path: '/docs/operating-system/システムプログラミング/stack_heap',
                component: ComponentCreator('/docs/operating-system/システムプログラミング/stack_heap', '7eb'),
                exact: true,
                sidebar: "operatingSystemSidebar"
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
