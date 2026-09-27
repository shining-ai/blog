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
    component: ComponentCreator('/docs', '54d'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', 'aeb'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', '635'),
            routes: [
              {
                path: '/docs/container-cloud/intro',
                component: ComponentCreator('/docs/container-cloud/intro', '95b'),
                exact: true,
                sidebar: "containerCloudSidebar"
              },
              {
                path: '/docs/container-cloud/クラウド基礎/cloud_native',
                component: ComponentCreator('/docs/container-cloud/クラウド基礎/cloud_native', '8f3'),
                exact: true,
                sidebar: "containerCloudSidebar"
              },
              {
                path: '/docs/container-cloud/クラウド基礎/iaas_paas_saas',
                component: ComponentCreator('/docs/container-cloud/クラウド基礎/iaas_paas_saas', 'dbe'),
                exact: true,
                sidebar: "containerCloudSidebar"
              },
              {
                path: '/docs/container-cloud/クラウド基礎/iac_terraform',
                component: ComponentCreator('/docs/container-cloud/クラウド基礎/iac_terraform', '47b'),
                exact: true,
                sidebar: "containerCloudSidebar"
              },
              {
                path: '/docs/container-cloud/クラウド基礎/object_storage',
                component: ComponentCreator('/docs/container-cloud/クラウド基礎/object_storage', '968'),
                exact: true,
                sidebar: "containerCloudSidebar"
              },
              {
                path: '/docs/container-cloud/クラウド基礎/serverless',
                component: ComponentCreator('/docs/container-cloud/クラウド基礎/serverless', 'd3c'),
                exact: true,
                sidebar: "containerCloudSidebar"
              },
              {
                path: '/docs/container-cloud/仮想化とコンテナ/containers',
                component: ComponentCreator('/docs/container-cloud/仮想化とコンテナ/containers', 'ce9'),
                exact: true,
                sidebar: "containerCloudSidebar"
              },
              {
                path: '/docs/container-cloud/仮想化とコンテナ/docker_compose',
                component: ComponentCreator('/docs/container-cloud/仮想化とコンテナ/docker_compose', '69d'),
                exact: true,
                sidebar: "containerCloudSidebar"
              },
              {
                path: '/docs/container-cloud/仮想化とコンテナ/docker_intro',
                component: ComponentCreator('/docs/container-cloud/仮想化とコンテナ/docker_intro', 'b02'),
                exact: true,
                sidebar: "containerCloudSidebar"
              },
              {
                path: '/docs/container-cloud/仮想化とコンテナ/dockerfile',
                component: ComponentCreator('/docs/container-cloud/仮想化とコンテナ/dockerfile', '075'),
                exact: true,
                sidebar: "containerCloudSidebar"
              },
              {
                path: '/docs/container-cloud/仮想化とコンテナ/helm',
                component: ComponentCreator('/docs/container-cloud/仮想化とコンテナ/helm', '4e9'),
                exact: true,
                sidebar: "containerCloudSidebar"
              },
              {
                path: '/docs/container-cloud/仮想化とコンテナ/k8s_architecture',
                component: ComponentCreator('/docs/container-cloud/仮想化とコンテナ/k8s_architecture', 'b73'),
                exact: true,
                sidebar: "containerCloudSidebar"
              },
              {
                path: '/docs/container-cloud/仮想化とコンテナ/k8s_pod_deployment',
                component: ComponentCreator('/docs/container-cloud/仮想化とコンテナ/k8s_pod_deployment', '534'),
                exact: true,
                sidebar: "containerCloudSidebar"
              },
              {
                path: '/docs/container-cloud/仮想化とコンテナ/k8s_scaling',
                component: ComponentCreator('/docs/container-cloud/仮想化とコンテナ/k8s_scaling', 'a2e'),
                exact: true,
                sidebar: "containerCloudSidebar"
              },
              {
                path: '/docs/container-cloud/仮想化とコンテナ/virtualization',
                component: ComponentCreator('/docs/container-cloud/仮想化とコンテナ/virtualization', 'c44'),
                exact: true,
                sidebar: "containerCloudSidebar"
              },
              {
                path: '/docs/distributed-systems/intro',
                component: ComponentCreator('/docs/distributed-systems/intro', '207'),
                exact: true,
                sidebar: "distributedSystemsSidebar"
              },
              {
                path: '/docs/distributed-systems/マイクロサービスパターン/api_gateway',
                component: ComponentCreator('/docs/distributed-systems/マイクロサービスパターン/api_gateway', '16a'),
                exact: true,
                sidebar: "distributedSystemsSidebar"
              },
              {
                path: '/docs/distributed-systems/マイクロサービスパターン/circuit_breaker',
                component: ComponentCreator('/docs/distributed-systems/マイクロサービスパターン/circuit_breaker', 'e04'),
                exact: true,
                sidebar: "distributedSystemsSidebar"
              },
              {
                path: '/docs/distributed-systems/マイクロサービスパターン/saga_pattern',
                component: ComponentCreator('/docs/distributed-systems/マイクロサービスパターン/saga_pattern', 'b54'),
                exact: true,
                sidebar: "distributedSystemsSidebar"
              },
              {
                path: '/docs/distributed-systems/マイクロサービスパターン/service_decomposition',
                component: ComponentCreator('/docs/distributed-systems/マイクロサービスパターン/service_decomposition', 'b88'),
                exact: true,
                sidebar: "distributedSystemsSidebar"
              },
              {
                path: '/docs/distributed-systems/マイクロサービスパターン/service_discovery',
                component: ComponentCreator('/docs/distributed-systems/マイクロサービスパターン/service_discovery', '5e5'),
                exact: true,
                sidebar: "distributedSystemsSidebar"
              },
              {
                path: '/docs/distributed-systems/マイクロサービスパターン/service_mesh',
                component: ComponentCreator('/docs/distributed-systems/マイクロサービスパターン/service_mesh', '135'),
                exact: true,
                sidebar: "distributedSystemsSidebar"
              },
              {
                path: '/docs/distributed-systems/メッセージング・ストリーミング/event_driven',
                component: ComponentCreator('/docs/distributed-systems/メッセージング・ストリーミング/event_driven', '54f'),
                exact: true,
                sidebar: "distributedSystemsSidebar"
              },
              {
                path: '/docs/distributed-systems/メッセージング・ストリーミング/kafka_architecture',
                component: ComponentCreator('/docs/distributed-systems/メッセージング・ストリーミング/kafka_architecture', '9b6'),
                exact: true,
                sidebar: "distributedSystemsSidebar"
              },
              {
                path: '/docs/distributed-systems/メッセージング・ストリーミング/kafka_partition',
                component: ComponentCreator('/docs/distributed-systems/メッセージング・ストリーミング/kafka_partition', 'ca7'),
                exact: true,
                sidebar: "distributedSystemsSidebar"
              },
              {
                path: '/docs/distributed-systems/メッセージング・ストリーミング/message_queue',
                component: ComponentCreator('/docs/distributed-systems/メッセージング・ストリーミング/message_queue', 'eba'),
                exact: true,
                sidebar: "distributedSystemsSidebar"
              },
              {
                path: '/docs/distributed-systems/メッセージング・ストリーミング/rabbitmq_vs_kafka',
                component: ComponentCreator('/docs/distributed-systems/メッセージング・ストリーミング/rabbitmq_vs_kafka', 'dff'),
                exact: true,
                sidebar: "distributedSystemsSidebar"
              },
              {
                path: '/docs/distributed-systems/信頼性・運用/chaos_engineering',
                component: ComponentCreator('/docs/distributed-systems/信頼性・運用/chaos_engineering', '6cb'),
                exact: true,
                sidebar: "distributedSystemsSidebar"
              },
              {
                path: '/docs/distributed-systems/信頼性・運用/distributed_tracing',
                component: ComponentCreator('/docs/distributed-systems/信頼性・運用/distributed_tracing', 'fb4'),
                exact: true,
                sidebar: "distributedSystemsSidebar"
              },
              {
                path: '/docs/distributed-systems/信頼性・運用/incident_management',
                component: ComponentCreator('/docs/distributed-systems/信頼性・運用/incident_management', '1da'),
                exact: true,
                sidebar: "distributedSystemsSidebar"
              },
              {
                path: '/docs/distributed-systems/信頼性・運用/observability',
                component: ComponentCreator('/docs/distributed-systems/信頼性・運用/observability', '7a1'),
                exact: true,
                sidebar: "distributedSystemsSidebar"
              },
              {
                path: '/docs/distributed-systems/信頼性・運用/prometheus_grafana',
                component: ComponentCreator('/docs/distributed-systems/信頼性・運用/prometheus_grafana', '80d'),
                exact: true,
                sidebar: "distributedSystemsSidebar"
              },
              {
                path: '/docs/distributed-systems/信頼性・運用/sli_slo_sla',
                component: ComponentCreator('/docs/distributed-systems/信頼性・運用/sli_slo_sla', 'a9c'),
                exact: true,
                sidebar: "distributedSystemsSidebar"
              },
              {
                path: '/docs/distributed-systems/分散システム理論/cap_theorem',
                component: ComponentCreator('/docs/distributed-systems/分散システム理論/cap_theorem', '5a6'),
                exact: true,
                sidebar: "distributedSystemsSidebar"
              },
              {
                path: '/docs/distributed-systems/分散システム理論/chandy_lamport',
                component: ComponentCreator('/docs/distributed-systems/分散システム理論/chandy_lamport', '46c'),
                exact: true,
                sidebar: "distributedSystemsSidebar"
              },
              {
                path: '/docs/distributed-systems/分散システム理論/consistency_models',
                component: ComponentCreator('/docs/distributed-systems/分散システム理論/consistency_models', 'bff'),
                exact: true,
                sidebar: "distributedSystemsSidebar"
              },
              {
                path: '/docs/distributed-systems/分散システム理論/distributed_challenges',
                component: ComponentCreator('/docs/distributed-systems/分散システム理論/distributed_challenges', '52c'),
                exact: true,
                sidebar: "distributedSystemsSidebar"
              },
              {
                path: '/docs/distributed-systems/分散システム理論/logical_clocks',
                component: ComponentCreator('/docs/distributed-systems/分散システム理論/logical_clocks', '5e2'),
                exact: true,
                sidebar: "distributedSystemsSidebar"
              },
              {
                path: '/docs/distributed-systems/分散システム理論/paxos',
                component: ComponentCreator('/docs/distributed-systems/分散システム理論/paxos', '472'),
                exact: true,
                sidebar: "distributedSystemsSidebar"
              },
              {
                path: '/docs/distributed-systems/分散システム理論/raft',
                component: ComponentCreator('/docs/distributed-systems/分散システム理論/raft', '0df'),
                exact: true,
                sidebar: "distributedSystemsSidebar"
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
