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
    component: ComponentCreator('/docs', 'a16'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', 'ae9'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', '0b8'),
            routes: [
              {
                path: '/docs/algorithm-strategy/intro',
                component: ComponentCreator('/docs/algorithm-strategy/intro', '9d5'),
                exact: true,
                sidebar: "algorithmStrategySidebar"
              },
              {
                path: '/docs/algorithm-strategy/アルゴリズム戦略/approximation',
                component: ComponentCreator('/docs/algorithm-strategy/アルゴリズム戦略/approximation', '26e'),
                exact: true,
                sidebar: "algorithmStrategySidebar"
              },
              {
                path: '/docs/algorithm-strategy/アルゴリズム戦略/backtracking',
                component: ComponentCreator('/docs/algorithm-strategy/アルゴリズム戦略/backtracking', 'a6c'),
                exact: true,
                sidebar: "algorithmStrategySidebar"
              },
              {
                path: '/docs/algorithm-strategy/アルゴリズム戦略/binary_search_advanced',
                component: ComponentCreator('/docs/algorithm-strategy/アルゴリズム戦略/binary_search_advanced', 'e6c'),
                exact: true,
                sidebar: "algorithmStrategySidebar"
              },
              {
                path: '/docs/algorithm-strategy/アルゴリズム戦略/digit_dp',
                component: ComponentCreator('/docs/algorithm-strategy/アルゴリズム戦略/digit_dp', 'a22'),
                exact: true,
                sidebar: "algorithmStrategySidebar"
              },
              {
                path: '/docs/algorithm-strategy/アルゴリズム戦略/divide_and_conquer',
                component: ComponentCreator('/docs/algorithm-strategy/アルゴリズム戦略/divide_and_conquer', '79d'),
                exact: true,
                sidebar: "algorithmStrategySidebar"
              },
              {
                path: '/docs/algorithm-strategy/アルゴリズム戦略/dynamic_programming',
                component: ComponentCreator('/docs/algorithm-strategy/アルゴリズム戦略/dynamic_programming', '8e9'),
                exact: true,
                sidebar: "algorithmStrategySidebar"
              },
              {
                path: '/docs/algorithm-strategy/アルゴリズム戦略/greedy',
                component: ComponentCreator('/docs/algorithm-strategy/アルゴリズム戦略/greedy', '474'),
                exact: true,
                sidebar: "algorithmStrategySidebar"
              },
              {
                path: '/docs/algorithm-strategy/アルゴリズム戦略/interval_dp',
                component: ComponentCreator('/docs/algorithm-strategy/アルゴリズム戦略/interval_dp', '437'),
                exact: true,
                sidebar: "algorithmStrategySidebar"
              },
              {
                path: '/docs/algorithm-strategy/アルゴリズム戦略/knapsack',
                component: ComponentCreator('/docs/algorithm-strategy/アルゴリズム戦略/knapsack', '25a'),
                exact: true,
                sidebar: "algorithmStrategySidebar"
              },
              {
                path: '/docs/algorithm-strategy/アルゴリズム戦略/lcs',
                component: ComponentCreator('/docs/algorithm-strategy/アルゴリズム戦略/lcs', '53d'),
                exact: true,
                sidebar: "algorithmStrategySidebar"
              },
              {
                path: '/docs/algorithm-strategy/アルゴリズム戦略/online',
                component: ComponentCreator('/docs/algorithm-strategy/アルゴリズム戦略/online', '104'),
                exact: true,
                sidebar: "algorithmStrategySidebar"
              },
              {
                path: '/docs/algorithm-strategy/アルゴリズム戦略/randomized',
                component: ComponentCreator('/docs/algorithm-strategy/アルゴリズム戦略/randomized', 'dca'),
                exact: true,
                sidebar: "algorithmStrategySidebar"
              },
              {
                path: '/docs/algorithm-strategy/アルゴリズム戦略/two_pointers',
                component: ComponentCreator('/docs/algorithm-strategy/アルゴリズム戦略/two_pointers', 'ab2'),
                exact: true,
                sidebar: "algorithmStrategySidebar"
              },
              {
                path: '/docs/algorithm/intro',
                component: ComponentCreator('/docs/algorithm/intro', '3b7'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/グラフアルゴリズム/a_star',
                component: ComponentCreator('/docs/algorithm/グラフアルゴリズム/a_star', '645'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/グラフアルゴリズム/bellman_ford',
                component: ComponentCreator('/docs/algorithm/グラフアルゴリズム/bellman_ford', '7b5'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/グラフアルゴリズム/bfs',
                component: ComponentCreator('/docs/algorithm/グラフアルゴリズム/bfs', '330'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/グラフアルゴリズム/bipartite_matching',
                component: ComponentCreator('/docs/algorithm/グラフアルゴリズム/bipartite_matching', 'c90'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/グラフアルゴリズム/dfs',
                component: ComponentCreator('/docs/algorithm/グラフアルゴリズム/dfs', '2f0'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/グラフアルゴリズム/dijkstra',
                component: ComponentCreator('/docs/algorithm/グラフアルゴリズム/dijkstra', 'ce5'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/グラフアルゴリズム/dinic',
                component: ComponentCreator('/docs/algorithm/グラフアルゴリズム/dinic', '143'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/グラフアルゴリズム/ford_fulkerson',
                component: ComponentCreator('/docs/algorithm/グラフアルゴリズム/ford_fulkerson', '241'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/グラフアルゴリズム/kruskal',
                component: ComponentCreator('/docs/algorithm/グラフアルゴリズム/kruskal', '3f7'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/グラフアルゴリズム/lca',
                component: ComponentCreator('/docs/algorithm/グラフアルゴリズム/lca', '53c'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/グラフアルゴリズム/prim',
                component: ComponentCreator('/docs/algorithm/グラフアルゴリズム/prim', 'c1e'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/グラフアルゴリズム/scc',
                component: ComponentCreator('/docs/algorithm/グラフアルゴリズム/scc', '213'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/グラフアルゴリズム/topological_sort',
                component: ComponentCreator('/docs/algorithm/グラフアルゴリズム/topological_sort', '6f2'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/グラフアルゴリズム/warshall_floyd',
                component: ComponentCreator('/docs/algorithm/グラフアルゴリズム/warshall_floyd', 'a8c'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/ソートアルゴリズム/bubble_sort',
                component: ComponentCreator('/docs/algorithm/ソートアルゴリズム/bubble_sort', '256'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/ソートアルゴリズム/counting_sort',
                component: ComponentCreator('/docs/algorithm/ソートアルゴリズム/counting_sort', 'e7a'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/ソートアルゴリズム/heap_sort',
                component: ComponentCreator('/docs/algorithm/ソートアルゴリズム/heap_sort', '795'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/ソートアルゴリズム/insertion_sort',
                component: ComponentCreator('/docs/algorithm/ソートアルゴリズム/insertion_sort', 'c63'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/ソートアルゴリズム/merge_sort',
                component: ComponentCreator('/docs/algorithm/ソートアルゴリズム/merge_sort', 'b4d'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/ソートアルゴリズム/quick_sort',
                component: ComponentCreator('/docs/algorithm/ソートアルゴリズム/quick_sort', '70f'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/ソートアルゴリズム/radix_sort',
                component: ComponentCreator('/docs/algorithm/ソートアルゴリズム/radix_sort', '5a9'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/ソートアルゴリズム/selection_sort',
                component: ComponentCreator('/docs/algorithm/ソートアルゴリズム/selection_sort', 'daf'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/並列アルゴリズム/mapreduce',
                component: ComponentCreator('/docs/algorithm/並列アルゴリズム/mapreduce', '22b'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/並列アルゴリズム/parallel_sort',
                component: ComponentCreator('/docs/algorithm/並列アルゴリズム/parallel_sort', 'af7'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/並列アルゴリズム/prefix_sum',
                component: ComponentCreator('/docs/algorithm/並列アルゴリズム/prefix_sum', '9f0'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/最適化/genetic_algorithm',
                component: ComponentCreator('/docs/algorithm/最適化/genetic_algorithm', '8a3'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/最適化/integer_programming',
                component: ComponentCreator('/docs/algorithm/最適化/integer_programming', '435'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/最適化/linear_programming',
                component: ComponentCreator('/docs/algorithm/最適化/linear_programming', 'cc9'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/最適化/local_search',
                component: ComponentCreator('/docs/algorithm/最適化/local_search', '171'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/最適化/simulated_annealing',
                component: ComponentCreator('/docs/algorithm/最適化/simulated_annealing', '727'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/探索アルゴリズム/binary_search',
                component: ComponentCreator('/docs/algorithm/探索アルゴリズム/binary_search', 'b2b'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/探索アルゴリズム/linear_search',
                component: ComponentCreator('/docs/algorithm/探索アルゴリズム/linear_search', 'dc6'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/探索アルゴリズム/ternary_search',
                component: ComponentCreator('/docs/algorithm/探索アルゴリズム/ternary_search', '897'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/数値アルゴリズム/fast_pow',
                component: ComponentCreator('/docs/algorithm/数値アルゴリズム/fast_pow', '512'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/数値アルゴリズム/fft',
                component: ComponentCreator('/docs/algorithm/数値アルゴリズム/fft', '35c'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/数値アルゴリズム/gcd',
                component: ComponentCreator('/docs/algorithm/数値アルゴリズム/gcd', '24a'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/数値アルゴリズム/matrix',
                component: ComponentCreator('/docs/algorithm/数値アルゴリズム/matrix', 'abf'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/数値アルゴリズム/mod',
                component: ComponentCreator('/docs/algorithm/数値アルゴリズム/mod', '9dc'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/数値アルゴリズム/primality_test',
                component: ComponentCreator('/docs/algorithm/数値アルゴリズム/primality_test', '02a'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/数値アルゴリズム/sieve',
                component: ComponentCreator('/docs/algorithm/数値アルゴリズム/sieve', '79c'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/文字列アルゴリズム/aho_corasick',
                component: ComponentCreator('/docs/algorithm/文字列アルゴリズム/aho_corasick', '72c'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/文字列アルゴリズム/boyer_moore',
                component: ComponentCreator('/docs/algorithm/文字列アルゴリズム/boyer_moore', '89d'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/文字列アルゴリズム/kmp',
                component: ComponentCreator('/docs/algorithm/文字列アルゴリズム/kmp', '841'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/文字列アルゴリズム/rabin_karp',
                component: ComponentCreator('/docs/algorithm/文字列アルゴリズム/rabin_karp', 'fe8'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/文字列アルゴリズム/suffix_array',
                component: ComponentCreator('/docs/algorithm/文字列アルゴリズム/suffix_array', '96b'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/文字列アルゴリズム/z_algorithm',
                component: ComponentCreator('/docs/algorithm/文字列アルゴリズム/z_algorithm', '9fb'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/計算幾何/closest_pair',
                component: ComponentCreator('/docs/algorithm/計算幾何/closest_pair', 'cdd'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/計算幾何/convex_hull',
                component: ComponentCreator('/docs/algorithm/計算幾何/convex_hull', 'ef2'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/計算幾何/segment_intersection',
                component: ComponentCreator('/docs/algorithm/計算幾何/segment_intersection', '8ac'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/algorithm/計算幾何/sweep_line',
                component: ComponentCreator('/docs/algorithm/計算幾何/sweep_line', '233'),
                exact: true,
                sidebar: "algorithmSidebar"
              },
              {
                path: '/docs/books/intro',
                component: ComponentCreator('/docs/books/intro', '0aa'),
                exact: true,
                sidebar: "booksmSidebar"
              },
              {
                path: '/docs/data-structure/intro',
                component: ComponentCreator('/docs/data-structure/intro', '678'),
                exact: true,
                sidebar: "datastructureSidebar"
              },
              {
                path: '/docs/data-structure/グラフ構造/directed_undirected',
                component: ComponentCreator('/docs/data-structure/グラフ構造/directed_undirected', '451'),
                exact: true,
                sidebar: "datastructureSidebar"
              },
              {
                path: '/docs/data-structure/グラフ構造/graph',
                component: ComponentCreator('/docs/data-structure/グラフ構造/graph', '145'),
                exact: true,
                sidebar: "datastructureSidebar"
              },
              {
                path: '/docs/data-structure/グラフ構造/weighted_graph',
                component: ComponentCreator('/docs/data-structure/グラフ構造/weighted_graph', '48f'),
                exact: true,
                sidebar: "datastructureSidebar"
              },
              {
                path: '/docs/data-structure/ツリー構造/b_tree',
                component: ComponentCreator('/docs/data-structure/ツリー構造/b_tree', 'ef8'),
                exact: true,
                sidebar: "datastructureSidebar"
              },
              {
                path: '/docs/data-structure/ツリー構造/balanced_bst',
                component: ComponentCreator('/docs/data-structure/ツリー構造/balanced_bst', '859'),
                exact: true,
                sidebar: "datastructureSidebar"
              },
              {
                path: '/docs/data-structure/ツリー構造/binary_search_tree',
                component: ComponentCreator('/docs/data-structure/ツリー構造/binary_search_tree', '19d'),
                exact: true,
                sidebar: "datastructureSidebar"
              },
              {
                path: '/docs/data-structure/ツリー構造/binary_tree',
                component: ComponentCreator('/docs/data-structure/ツリー構造/binary_tree', 'e06'),
                exact: true,
                sidebar: "datastructureSidebar"
              },
              {
                path: '/docs/data-structure/ツリー構造/bit',
                component: ComponentCreator('/docs/data-structure/ツリー構造/bit', '64a'),
                exact: true,
                sidebar: "datastructureSidebar"
              },
              {
                path: '/docs/data-structure/ツリー構造/heap',
                component: ComponentCreator('/docs/data-structure/ツリー構造/heap', '910'),
                exact: true,
                sidebar: "datastructureSidebar"
              },
              {
                path: '/docs/data-structure/ツリー構造/interval_tree',
                component: ComponentCreator('/docs/data-structure/ツリー構造/interval_tree', 'c5d'),
                exact: true,
                sidebar: "datastructureSidebar"
              },
              {
                path: '/docs/data-structure/ツリー構造/segment_tree',
                component: ComponentCreator('/docs/data-structure/ツリー構造/segment_tree', 'c5f'),
                exact: true,
                sidebar: "datastructureSidebar"
              },
              {
                path: '/docs/data-structure/ツリー構造/trie',
                component: ComponentCreator('/docs/data-structure/ツリー構造/trie', '1f2'),
                exact: true,
                sidebar: "datastructureSidebar"
              },
              {
                path: '/docs/data-structure/ハッシュ構造/hash_set',
                component: ComponentCreator('/docs/data-structure/ハッシュ構造/hash_set', '326'),
                exact: true,
                sidebar: "datastructureSidebar"
              },
              {
                path: '/docs/data-structure/ハッシュ構造/hash_table',
                component: ComponentCreator('/docs/data-structure/ハッシュ構造/hash_table', '305'),
                exact: true,
                sidebar: "datastructureSidebar"
              },
              {
                path: '/docs/data-structure/線形データ構造/array',
                component: ComponentCreator('/docs/data-structure/線形データ構造/array', 'ca1'),
                exact: true,
                sidebar: "datastructureSidebar"
              },
              {
                path: '/docs/data-structure/線形データ構造/deque',
                component: ComponentCreator('/docs/data-structure/線形データ構造/deque', 'e79'),
                exact: true,
                sidebar: "datastructureSidebar"
              },
              {
                path: '/docs/data-structure/線形データ構造/dynamic_array',
                component: ComponentCreator('/docs/data-structure/線形データ構造/dynamic_array', '4bc'),
                exact: true,
                sidebar: "datastructureSidebar"
              },
              {
                path: '/docs/data-structure/線形データ構造/linked_list',
                component: ComponentCreator('/docs/data-structure/線形データ構造/linked_list', '24e'),
                exact: true,
                sidebar: "datastructureSidebar"
              },
              {
                path: '/docs/data-structure/線形データ構造/queue',
                component: ComponentCreator('/docs/data-structure/線形データ構造/queue', '4d9'),
                exact: true,
                sidebar: "datastructureSidebar"
              },
              {
                path: '/docs/data-structure/線形データ構造/stack',
                component: ComponentCreator('/docs/data-structure/線形データ構造/stack', '11d'),
                exact: true,
                sidebar: "datastructureSidebar"
              },
              {
                path: '/docs/data-structure/集合管理構造/bitset',
                component: ComponentCreator('/docs/data-structure/集合管理構造/bitset', 'd94'),
                exact: true,
                sidebar: "datastructureSidebar"
              },
              {
                path: '/docs/data-structure/集合管理構造/union_find',
                component: ComponentCreator('/docs/data-structure/集合管理構造/union_find', 'cfb'),
                exact: true,
                sidebar: "datastructureSidebar"
              },
              {
                path: '/docs/data-structure/順序付き構造/skip_list',
                component: ComponentCreator('/docs/data-structure/順序付き構造/skip_list', 'f33'),
                exact: true,
                sidebar: "datastructureSidebar"
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
