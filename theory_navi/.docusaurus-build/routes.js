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
    component: ComponentCreator('/docs', 'c1c'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', '946'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', 'b2e'),
            routes: [
              {
                path: '/docs/computability-theory/intro',
                component: ComponentCreator('/docs/computability-theory/intro', '98a'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/オートマトン理論/cfg',
                component: ComponentCreator('/docs/computability-theory/オートマトン理論/cfg', 'fe1'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/オートマトン理論/cyk',
                component: ComponentCreator('/docs/computability-theory/オートマトン理論/cyk', 'dfc'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/オートマトン理論/dfa',
                component: ComponentCreator('/docs/computability-theory/オートマトン理論/dfa', '833'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/オートマトン理論/dfa_minimization',
                component: ComponentCreator('/docs/computability-theory/オートマトン理論/dfa_minimization', '4c2'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/オートマトン理論/nfa',
                component: ComponentCreator('/docs/computability-theory/オートマトン理論/nfa', 'f2c'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/オートマトン理論/nfa_to_dfa',
                component: ComponentCreator('/docs/computability-theory/オートマトン理論/nfa_to_dfa', 'f0e'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/オートマトン理論/pda',
                component: ComponentCreator('/docs/computability-theory/オートマトン理論/pda', '267'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/オートマトン理論/pumping_lemma_cfl',
                component: ComponentCreator('/docs/computability-theory/オートマトン理論/pumping_lemma_cfl', '05f'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/オートマトン理論/pumping_lemma_regular',
                component: ComponentCreator('/docs/computability-theory/オートマトン理論/pumping_lemma_regular', '033'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/オートマトン理論/regular_expressions',
                component: ComponentCreator('/docs/computability-theory/オートマトン理論/regular_expressions', '526'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/チューリング機械と計算可能性/decidable_problems',
                component: ComponentCreator('/docs/computability-theory/チューリング機械と計算可能性/decidable_problems', '009'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/チューリング機械と計算可能性/halting_problem',
                component: ComponentCreator('/docs/computability-theory/チューリング機械と計算可能性/halting_problem', '915'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/チューリング機械と計算可能性/lambda_calculus',
                component: ComponentCreator('/docs/computability-theory/チューリング機械と計算可能性/lambda_calculus', '4d6'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/チューリング機械と計算可能性/multitape_ndtm',
                component: ComponentCreator('/docs/computability-theory/チューリング機械と計算可能性/multitape_ndtm', '732'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/チューリング機械と計算可能性/reduction',
                component: ComponentCreator('/docs/computability-theory/チューリング機械と計算可能性/reduction', 'af5'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/チューリング機械と計算可能性/rice_theorem',
                component: ComponentCreator('/docs/computability-theory/チューリング機械と計算可能性/rice_theorem', 'ef9'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/チューリング機械と計算可能性/turing_machine',
                component: ComponentCreator('/docs/computability-theory/チューリング機械と計算可能性/turing_machine', '86a'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/チューリング機械と計算可能性/universal_tm',
                component: ComponentCreator('/docs/computability-theory/チューリング機械と計算可能性/universal_tm', 'e84'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/計算量理論/approximation',
                component: ComponentCreator('/docs/computability-theory/計算量理論/approximation', 'c58'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/計算量理論/class_np',
                component: ComponentCreator('/docs/computability-theory/計算量理論/class_np', '04a'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/計算量理論/class_p',
                component: ComponentCreator('/docs/computability-theory/計算量理論/class_p', '256'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/計算量理論/complexity_basics',
                component: ComponentCreator('/docs/computability-theory/計算量理論/complexity_basics', '369'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/計算量理論/cook_levin',
                component: ComponentCreator('/docs/computability-theory/計算量理論/cook_levin', '26e'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/計算量理論/np_complete_problems',
                component: ComponentCreator('/docs/computability-theory/計算量理論/np_complete_problems', 'e1c'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/計算量理論/np_hard_complete',
                component: ComponentCreator('/docs/computability-theory/計算量理論/np_hard_complete', '027'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/計算量理論/p_np_problem',
                component: ComponentCreator('/docs/computability-theory/計算量理論/p_np_problem', '95b'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/計算量理論/pspace_exp',
                component: ComponentCreator('/docs/computability-theory/計算量理論/pspace_exp', 'bc0'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/computability-theory/計算量理論/randomized',
                component: ComponentCreator('/docs/computability-theory/計算量理論/randomized', 'e35'),
                exact: true,
                sidebar: "computabilityTheorySidebar"
              },
              {
                path: '/docs/discrete-math/intro',
                component: ComponentCreator('/docs/discrete-math/intro', '13e'),
                exact: true,
                sidebar: "discreteMathSidebar"
              },
              {
                path: '/docs/discrete-math/情報理論と符号理論/arithmetic_coding',
                component: ComponentCreator('/docs/discrete-math/情報理論と符号理論/arithmetic_coding', '069'),
                exact: true,
                sidebar: "discreteMathSidebar"
              },
              {
                path: '/docs/discrete-math/情報理論と符号理論/channel_coding',
                component: ComponentCreator('/docs/discrete-math/情報理論と符号理論/channel_coding', '650'),
                exact: true,
                sidebar: "discreteMathSidebar"
              },
              {
                path: '/docs/discrete-math/情報理論と符号理論/hamming_code',
                component: ComponentCreator('/docs/discrete-math/情報理論と符号理論/hamming_code', '8c8'),
                exact: true,
                sidebar: "discreteMathSidebar"
              },
              {
                path: '/docs/discrete-math/情報理論と符号理論/huffman_coding',
                component: ComponentCreator('/docs/discrete-math/情報理論と符号理論/huffman_coding', '569'),
                exact: true,
                sidebar: "discreteMathSidebar"
              },
              {
                path: '/docs/discrete-math/情報理論と符号理論/mutual_information',
                component: ComponentCreator('/docs/discrete-math/情報理論と符号理論/mutual_information', '519'),
                exact: true,
                sidebar: "discreteMathSidebar"
              },
              {
                path: '/docs/discrete-math/情報理論と符号理論/shannon_entropy',
                component: ComponentCreator('/docs/discrete-math/情報理論と符号理論/shannon_entropy', '6f0'),
                exact: true,
                sidebar: "discreteMathSidebar"
              },
              {
                path: '/docs/discrete-math/情報理論と符号理論/source_coding',
                component: ComponentCreator('/docs/discrete-math/情報理論と符号理論/source_coding', '57b'),
                exact: true,
                sidebar: "discreteMathSidebar"
              },
              {
                path: '/docs/discrete-math/離散数学/combinatorics',
                component: ComponentCreator('/docs/discrete-math/離散数学/combinatorics', '6b4'),
                exact: true,
                sidebar: "discreteMathSidebar"
              },
              {
                path: '/docs/discrete-math/離散数学/generating_functions',
                component: ComponentCreator('/docs/discrete-math/離散数学/generating_functions', '1a1'),
                exact: true,
                sidebar: "discreteMathSidebar"
              },
              {
                path: '/docs/discrete-math/離散数学/graph_theory_basics',
                component: ComponentCreator('/docs/discrete-math/離散数学/graph_theory_basics', 'df9'),
                exact: true,
                sidebar: "discreteMathSidebar"
              },
              {
                path: '/docs/discrete-math/離散数学/induction_recursion',
                component: ComponentCreator('/docs/discrete-math/離散数学/induction_recursion', 'c4e'),
                exact: true,
                sidebar: "discreteMathSidebar"
              },
              {
                path: '/docs/discrete-math/離散数学/number_theory',
                component: ComponentCreator('/docs/discrete-math/離散数学/number_theory', '5f0'),
                exact: true,
                sidebar: "discreteMathSidebar"
              },
              {
                path: '/docs/discrete-math/離散数学/planar_graph_coloring',
                component: ComponentCreator('/docs/discrete-math/離散数学/planar_graph_coloring', '89f'),
                exact: true,
                sidebar: "discreteMathSidebar"
              },
              {
                path: '/docs/discrete-math/離散数学/probability_basics',
                component: ComponentCreator('/docs/discrete-math/離散数学/probability_basics', '316'),
                exact: true,
                sidebar: "discreteMathSidebar"
              },
              {
                path: '/docs/discrete-math/離散数学/propositional_logic',
                component: ComponentCreator('/docs/discrete-math/離散数学/propositional_logic', '740'),
                exact: true,
                sidebar: "discreteMathSidebar"
              },
              {
                path: '/docs/discrete-math/離散数学/relations_functions',
                component: ComponentCreator('/docs/discrete-math/離散数学/relations_functions', 'a53'),
                exact: true,
                sidebar: "discreteMathSidebar"
              },
              {
                path: '/docs/discrete-math/離散数学/set_theory',
                component: ComponentCreator('/docs/discrete-math/離散数学/set_theory', '918'),
                exact: true,
                sidebar: "discreteMathSidebar"
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
