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
    component: ComponentCreator('/docs', 'c8f'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', 'c09'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', 'c90'),
            routes: [
              {
                path: '/docs/nosql-distributed/intro',
                component: ComponentCreator('/docs/nosql-distributed/intro', 'ae2'),
                exact: true,
                sidebar: "nosqlDistributedSidebar"
              },
              {
                path: '/docs/nosql-distributed/NoSQL/cassandra',
                component: ComponentCreator('/docs/nosql-distributed/NoSQL/cassandra', '132'),
                exact: true,
                sidebar: "nosqlDistributedSidebar"
              },
              {
                path: '/docs/nosql-distributed/NoSQL/elasticsearch',
                component: ComponentCreator('/docs/nosql-distributed/NoSQL/elasticsearch', '5ba'),
                exact: true,
                sidebar: "nosqlDistributedSidebar"
              },
              {
                path: '/docs/nosql-distributed/NoSQL/mongodb',
                component: ComponentCreator('/docs/nosql-distributed/NoSQL/mongodb', '017'),
                exact: true,
                sidebar: "nosqlDistributedSidebar"
              },
              {
                path: '/docs/nosql-distributed/NoSQL/neo4j',
                component: ComponentCreator('/docs/nosql-distributed/NoSQL/neo4j', '7c7'),
                exact: true,
                sidebar: "nosqlDistributedSidebar"
              },
              {
                path: '/docs/nosql-distributed/NoSQL/nosql_overview',
                component: ComponentCreator('/docs/nosql-distributed/NoSQL/nosql_overview', '1b4'),
                exact: true,
                sidebar: "nosqlDistributedSidebar"
              },
              {
                path: '/docs/nosql-distributed/NoSQL/redis',
                component: ComponentCreator('/docs/nosql-distributed/NoSQL/redis', 'dc8'),
                exact: true,
                sidebar: "nosqlDistributedSidebar"
              },
              {
                path: '/docs/nosql-distributed/NoSQL/timeseries_db',
                component: ComponentCreator('/docs/nosql-distributed/NoSQL/timeseries_db', '547'),
                exact: true,
                sidebar: "nosqlDistributedSidebar"
              },
              {
                path: '/docs/nosql-distributed/データウェアハウス・データ工学/columnar_storage',
                component: ComponentCreator('/docs/nosql-distributed/データウェアハウス・データ工学/columnar_storage', '23d'),
                exact: true,
                sidebar: "nosqlDistributedSidebar"
              },
              {
                path: '/docs/nosql-distributed/データウェアハウス・データ工学/data_lake',
                component: ComponentCreator('/docs/nosql-distributed/データウェアハウス・データ工学/data_lake', '810'),
                exact: true,
                sidebar: "nosqlDistributedSidebar"
              },
              {
                path: '/docs/nosql-distributed/データウェアハウス・データ工学/etl',
                component: ComponentCreator('/docs/nosql-distributed/データウェアハウス・データ工学/etl', '3c1'),
                exact: true,
                sidebar: "nosqlDistributedSidebar"
              },
              {
                path: '/docs/nosql-distributed/データウェアハウス・データ工学/oltp_olap',
                component: ComponentCreator('/docs/nosql-distributed/データウェアハウス・データ工学/oltp_olap', '352'),
                exact: true,
                sidebar: "nosqlDistributedSidebar"
              },
              {
                path: '/docs/nosql-distributed/データウェアハウス・データ工学/spark_intro',
                component: ComponentCreator('/docs/nosql-distributed/データウェアハウス・データ工学/spark_intro', 'acb'),
                exact: true,
                sidebar: "nosqlDistributedSidebar"
              },
              {
                path: '/docs/nosql-distributed/データウェアハウス・データ工学/star_schema',
                component: ComponentCreator('/docs/nosql-distributed/データウェアハウス・データ工学/star_schema', '030'),
                exact: true,
                sidebar: "nosqlDistributedSidebar"
              },
              {
                path: '/docs/nosql-distributed/分散データベース/cap_theorem',
                component: ComponentCreator('/docs/nosql-distributed/分散データベース/cap_theorem', '46b'),
                exact: true,
                sidebar: "nosqlDistributedSidebar"
              },
              {
                path: '/docs/nosql-distributed/分散データベース/distributed_tx',
                component: ComponentCreator('/docs/nosql-distributed/分散データベース/distributed_tx', '2be'),
                exact: true,
                sidebar: "nosqlDistributedSidebar"
              },
              {
                path: '/docs/nosql-distributed/分散データベース/eventual_consistency',
                component: ComponentCreator('/docs/nosql-distributed/分散データベース/eventual_consistency', 'fd3'),
                exact: true,
                sidebar: "nosqlDistributedSidebar"
              },
              {
                path: '/docs/nosql-distributed/分散データベース/newsql',
                component: ComponentCreator('/docs/nosql-distributed/分散データベース/newsql', 'd4b'),
                exact: true,
                sidebar: "nosqlDistributedSidebar"
              },
              {
                path: '/docs/nosql-distributed/分散データベース/replication',
                component: ComponentCreator('/docs/nosql-distributed/分散データベース/replication', '7a9'),
                exact: true,
                sidebar: "nosqlDistributedSidebar"
              },
              {
                path: '/docs/nosql-distributed/分散データベース/sharding',
                component: ComponentCreator('/docs/nosql-distributed/分散データベース/sharding', '9ec'),
                exact: true,
                sidebar: "nosqlDistributedSidebar"
              },
              {
                path: '/docs/rdbms/intro',
                component: ComponentCreator('/docs/rdbms/intro', '20f'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/クエリ最適化/explain',
                component: ComponentCreator('/docs/rdbms/クエリ最適化/explain', 'ed0'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/クエリ最適化/index_not_used',
                component: ComponentCreator('/docs/rdbms/クエリ最適化/index_not_used', 'd40'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/クエリ最適化/query_optimizer',
                component: ComponentCreator('/docs/rdbms/クエリ最適化/query_optimizer', '884'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/クエリ最適化/statistics',
                component: ComponentCreator('/docs/rdbms/クエリ最適化/statistics', 'f34'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/ストレージ・インデックス/btree_index',
                component: ComponentCreator('/docs/rdbms/ストレージ・インデックス/btree_index', 'c7e'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/ストレージ・インデックス/composite_index',
                component: ComponentCreator('/docs/rdbms/ストレージ・インデックス/composite_index', 'd33'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/ストレージ・インデックス/disk_io',
                component: ComponentCreator('/docs/rdbms/ストレージ・インデックス/disk_io', 'b3c'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/ストレージ・インデックス/fulltext_search',
                component: ComponentCreator('/docs/rdbms/ストレージ・インデックス/fulltext_search', '879'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/ストレージ・インデックス/hash_index',
                component: ComponentCreator('/docs/rdbms/ストレージ・インデックス/hash_index', '427'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/データベース設計/bcnf_4nf',
                component: ComponentCreator('/docs/rdbms/データベース設計/bcnf_4nf', 'c3d'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/データベース設計/denormalization',
                component: ComponentCreator('/docs/rdbms/データベース設計/denormalization', 'ffd'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/データベース設計/er_diagram',
                component: ComponentCreator('/docs/rdbms/データベース設計/er_diagram', 'd82'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/データベース設計/index_design',
                component: ComponentCreator('/docs/rdbms/データベース設計/index_design', '193'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/データベース設計/normalization_1to3',
                component: ComponentCreator('/docs/rdbms/データベース設計/normalization_1to3', 'f1c'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/トランザクション/acid',
                component: ComponentCreator('/docs/rdbms/トランザクション/acid', '612'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/トランザクション/isolation_levels',
                component: ComponentCreator('/docs/rdbms/トランザクション/isolation_levels', 'ff4'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/トランザクション/locking',
                component: ComponentCreator('/docs/rdbms/トランザクション/locking', '883'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/トランザクション/mvcc',
                component: ComponentCreator('/docs/rdbms/トランザクション/mvcc', '7f4'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/トランザクション/wal',
                component: ComponentCreator('/docs/rdbms/トランザクション/wal', 'b15'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/リレーショナルモデルとSQL/aggregation',
                component: ComponentCreator('/docs/rdbms/リレーショナルモデルとSQL/aggregation', '288'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/リレーショナルモデルとSQL/ddl',
                component: ComponentCreator('/docs/rdbms/リレーショナルモデルとSQL/ddl', '9c2'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/リレーショナルモデルとSQL/dml',
                component: ComponentCreator('/docs/rdbms/リレーショナルモデルとSQL/dml', 'ec4'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/リレーショナルモデルとSQL/joins',
                component: ComponentCreator('/docs/rdbms/リレーショナルモデルとSQL/joins', '72e'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/リレーショナルモデルとSQL/relational_algebra',
                component: ComponentCreator('/docs/rdbms/リレーショナルモデルとSQL/relational_algebra', 'ce0'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/リレーショナルモデルとSQL/relational_model',
                component: ComponentCreator('/docs/rdbms/リレーショナルモデルとSQL/relational_model', 'd86'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/リレーショナルモデルとSQL/sql_basics',
                component: ComponentCreator('/docs/rdbms/リレーショナルモデルとSQL/sql_basics', 'cf5'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/リレーショナルモデルとSQL/subquery_cte',
                component: ComponentCreator('/docs/rdbms/リレーショナルモデルとSQL/subquery_cte', '7c4'),
                exact: true,
                sidebar: "rdbmsSidebar"
              },
              {
                path: '/docs/rdbms/リレーショナルモデルとSQL/views',
                component: ComponentCreator('/docs/rdbms/リレーショナルモデルとSQL/views', '822'),
                exact: true,
                sidebar: "rdbmsSidebar"
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
