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
    component: ComponentCreator('/docs', '61d'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', 'e0b'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', '2dd'),
            routes: [
              {
                path: '/docs/architecture-engineering/API設計/api_versioning',
                component: ComponentCreator('/docs/architecture-engineering/API設計/api_versioning', '1e8'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/API設計/backward_compatibility',
                component: ComponentCreator('/docs/architecture-engineering/API設計/backward_compatibility', 'f41'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/API設計/graphql',
                component: ComponentCreator('/docs/architecture-engineering/API設計/graphql', 'da0'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/API設計/grpc',
                component: ComponentCreator('/docs/architecture-engineering/API設計/grpc', 'bc9'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/API設計/openapi',
                component: ComponentCreator('/docs/architecture-engineering/API設計/openapi', '287'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/API設計/restful',
                component: ComponentCreator('/docs/architecture-engineering/API設計/restful', 'c7d'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/intro',
                component: ComponentCreator('/docs/architecture-engineering/intro', '22e'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/ソフトウェアアーキテクチャ/clean_architecture',
                component: ComponentCreator('/docs/architecture-engineering/ソフトウェアアーキテクチャ/clean_architecture', '79f'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/ソフトウェアアーキテクチャ/cqrs_es',
                component: ComponentCreator('/docs/architecture-engineering/ソフトウェアアーキテクチャ/cqrs_es', '8e7'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/ソフトウェアアーキテクチャ/ddd',
                component: ComponentCreator('/docs/architecture-engineering/ソフトウェアアーキテクチャ/ddd', 'c07'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/ソフトウェアアーキテクチャ/hexagonal',
                component: ComponentCreator('/docs/architecture-engineering/ソフトウェアアーキテクチャ/hexagonal', 'da9'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/ソフトウェアアーキテクチャ/layered',
                component: ComponentCreator('/docs/architecture-engineering/ソフトウェアアーキテクチャ/layered', '57b'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/ソフトウェアアーキテクチャ/monolith_vs_microservices',
                component: ComponentCreator('/docs/architecture-engineering/ソフトウェアアーキテクチャ/monolith_vs_microservices', '6e4'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/テスト/bdd',
                component: ComponentCreator('/docs/architecture-engineering/テスト/bdd', 'b72'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/テスト/coverage',
                component: ComponentCreator('/docs/architecture-engineering/テスト/coverage', 'eda'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/テスト/mocks',
                component: ComponentCreator('/docs/architecture-engineering/テスト/mocks', '335'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/テスト/performance_testing',
                component: ComponentCreator('/docs/architecture-engineering/テスト/performance_testing', 'a00'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/テスト/property_testing',
                component: ComponentCreator('/docs/architecture-engineering/テスト/property_testing', 'baf'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/テスト/tdd',
                component: ComponentCreator('/docs/architecture-engineering/テスト/tdd', '76b'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/テスト/test_types',
                component: ComponentCreator('/docs/architecture-engineering/テスト/test_types', 'fc2'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/開発プロセス・チーム開発/adr',
                component: ComponentCreator('/docs/architecture-engineering/開発プロセス・チーム開発/adr', 'fd8'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/開発プロセス・チーム開発/agile_scrum',
                component: ComponentCreator('/docs/architecture-engineering/開発プロセス・チーム開発/agile_scrum', '8ef'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/開発プロセス・チーム開発/branch_strategy',
                component: ComponentCreator('/docs/architecture-engineering/開発プロセス・チーム開発/branch_strategy', '5dd'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/開発プロセス・チーム開発/cicd',
                component: ComponentCreator('/docs/architecture-engineering/開発プロセス・チーム開発/cicd', '6ec'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/開発プロセス・チーム開発/code_review',
                component: ComponentCreator('/docs/architecture-engineering/開発プロセス・チーム開発/code_review', '7a8'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/開発プロセス・チーム開発/git_internals',
                component: ComponentCreator('/docs/architecture-engineering/開発プロセス・チーム開発/git_internals', '8fd'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/architecture-engineering/開発プロセス・チーム開発/refactoring',
                component: ComponentCreator('/docs/architecture-engineering/開発プロセス・チーム開発/refactoring', '4c9'),
                exact: true,
                sidebar: "architectureEngineeringSidebar"
              },
              {
                path: '/docs/design-patterns/intro',
                component: ComponentCreator('/docs/design-patterns/intro', 'e9a'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/デザインパターン_GoF/abstract_factory',
                component: ComponentCreator('/docs/design-patterns/デザインパターン_GoF/abstract_factory', 'dce'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/デザインパターン_GoF/adapter',
                component: ComponentCreator('/docs/design-patterns/デザインパターン_GoF/adapter', '050'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/デザインパターン_GoF/bridge',
                component: ComponentCreator('/docs/design-patterns/デザインパターン_GoF/bridge', '3eb'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/デザインパターン_GoF/builder',
                component: ComponentCreator('/docs/design-patterns/デザインパターン_GoF/builder', 'e4a'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/デザインパターン_GoF/chain_of_responsibility',
                component: ComponentCreator('/docs/design-patterns/デザインパターン_GoF/chain_of_responsibility', 'd61'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/デザインパターン_GoF/command',
                component: ComponentCreator('/docs/design-patterns/デザインパターン_GoF/command', '5c2'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/デザインパターン_GoF/composite',
                component: ComponentCreator('/docs/design-patterns/デザインパターン_GoF/composite', '9ca'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/デザインパターン_GoF/decorator',
                component: ComponentCreator('/docs/design-patterns/デザインパターン_GoF/decorator', '9e9'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/デザインパターン_GoF/facade',
                component: ComponentCreator('/docs/design-patterns/デザインパターン_GoF/facade', 'f2e'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/デザインパターン_GoF/factory_method',
                component: ComponentCreator('/docs/design-patterns/デザインパターン_GoF/factory_method', '97f'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/デザインパターン_GoF/iterator',
                component: ComponentCreator('/docs/design-patterns/デザインパターン_GoF/iterator', '601'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/デザインパターン_GoF/observer',
                component: ComponentCreator('/docs/design-patterns/デザインパターン_GoF/observer', '309'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/デザインパターン_GoF/prototype',
                component: ComponentCreator('/docs/design-patterns/デザインパターン_GoF/prototype', '997'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/デザインパターン_GoF/proxy',
                component: ComponentCreator('/docs/design-patterns/デザインパターン_GoF/proxy', '9ed'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/デザインパターン_GoF/singleton',
                component: ComponentCreator('/docs/design-patterns/デザインパターン_GoF/singleton', '6bf'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/デザインパターン_GoF/state',
                component: ComponentCreator('/docs/design-patterns/デザインパターン_GoF/state', '32e'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/デザインパターン_GoF/strategy',
                component: ComponentCreator('/docs/design-patterns/デザインパターン_GoF/strategy', '293'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/デザインパターン_GoF/template_method',
                component: ComponentCreator('/docs/design-patterns/デザインパターン_GoF/template_method', '2a3'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/設計原則/clean_code',
                component: ComponentCreator('/docs/design-patterns/設計原則/clean_code', '70e'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/設計原則/cohesion_coupling',
                component: ComponentCreator('/docs/design-patterns/設計原則/cohesion_coupling', '70b'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/設計原則/dip',
                component: ComponentCreator('/docs/design-patterns/設計原則/dip', 'b57'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/設計原則/dry_kiss_yagni',
                component: ComponentCreator('/docs/design-patterns/設計原則/dry_kiss_yagni', '1b5'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/設計原則/isp',
                component: ComponentCreator('/docs/design-patterns/設計原則/isp', '0bb'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/設計原則/lsp',
                component: ComponentCreator('/docs/design-patterns/設計原則/lsp', '98f'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/設計原則/ocp',
                component: ComponentCreator('/docs/design-patterns/設計原則/ocp', '306'),
                exact: true,
                sidebar: "designPatternsSidebar"
              },
              {
                path: '/docs/design-patterns/設計原則/srp',
                component: ComponentCreator('/docs/design-patterns/設計原則/srp', '822'),
                exact: true,
                sidebar: "designPatternsSidebar"
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
