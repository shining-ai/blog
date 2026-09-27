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
    component: ComponentCreator('/docs', '9f6'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', '62b'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', 'e2c'),
            routes: [
              {
                path: '/docs/network-application/intro',
                component: ComponentCreator('/docs/network-application/intro', 'da3'),
                exact: true,
                sidebar: "networkApplicationSidebar"
              },
              {
                path: '/docs/network-application/アプリケーション層/dns',
                component: ComponentCreator('/docs/network-application/アプリケーション層/dns', '6c4'),
                exact: true,
                sidebar: "networkApplicationSidebar"
              },
              {
                path: '/docs/network-application/アプリケーション層/email_protocols',
                component: ComponentCreator('/docs/network-application/アプリケーション層/email_protocols', '745'),
                exact: true,
                sidebar: "networkApplicationSidebar"
              },
              {
                path: '/docs/network-application/アプリケーション層/http11',
                component: ComponentCreator('/docs/network-application/アプリケーション層/http11', 'd3d'),
                exact: true,
                sidebar: "networkApplicationSidebar"
              },
              {
                path: '/docs/network-application/アプリケーション層/http2',
                component: ComponentCreator('/docs/network-application/アプリケーション層/http2', '841'),
                exact: true,
                sidebar: "networkApplicationSidebar"
              },
              {
                path: '/docs/network-application/アプリケーション層/http3',
                component: ComponentCreator('/docs/network-application/アプリケーション層/http3', '9d1'),
                exact: true,
                sidebar: "networkApplicationSidebar"
              },
              {
                path: '/docs/network-application/アプリケーション層/https_tls',
                component: ComponentCreator('/docs/network-application/アプリケーション層/https_tls', '7d3'),
                exact: true,
                sidebar: "networkApplicationSidebar"
              },
              {
                path: '/docs/network-application/アプリケーション層/rest_api',
                component: ComponentCreator('/docs/network-application/アプリケーション層/rest_api', '238'),
                exact: true,
                sidebar: "networkApplicationSidebar"
              },
              {
                path: '/docs/network-application/アプリケーション層/websocket',
                component: ComponentCreator('/docs/network-application/アプリケーション層/websocket', '46a'),
                exact: true,
                sidebar: "networkApplicationSidebar"
              },
              {
                path: '/docs/network-application/ネットワーク設計・運用/cdn',
                component: ComponentCreator('/docs/network-application/ネットワーク設計・運用/cdn', 'da5'),
                exact: true,
                sidebar: "networkApplicationSidebar"
              },
              {
                path: '/docs/network-application/ネットワーク設計・運用/ddos',
                component: ComponentCreator('/docs/network-application/ネットワーク設計・運用/ddos', 'b9f'),
                exact: true,
                sidebar: "networkApplicationSidebar"
              },
              {
                path: '/docs/network-application/ネットワーク設計・運用/firewall_dmz',
                component: ComponentCreator('/docs/network-application/ネットワーク設計・運用/firewall_dmz', '3e6'),
                exact: true,
                sidebar: "networkApplicationSidebar"
              },
              {
                path: '/docs/network-application/ネットワーク設計・運用/load_balancer',
                component: ComponentCreator('/docs/network-application/ネットワーク設計・運用/load_balancer', '35d'),
                exact: true,
                sidebar: "networkApplicationSidebar"
              },
              {
                path: '/docs/network-application/ネットワーク設計・運用/network_monitoring',
                component: ComponentCreator('/docs/network-application/ネットワーク設計・運用/network_monitoring', '576'),
                exact: true,
                sidebar: "networkApplicationSidebar"
              },
              {
                path: '/docs/network-application/ネットワーク設計・運用/vpn',
                component: ComponentCreator('/docs/network-application/ネットワーク設計・運用/vpn', 'b59'),
                exact: true,
                sidebar: "networkApplicationSidebar"
              },
              {
                path: '/docs/network-basics/intro',
                component: ComponentCreator('/docs/network-basics/intro', 'aef'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/データリンク層/csma',
                component: ComponentCreator('/docs/network-basics/データリンク層/csma', '8ad'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/データリンク層/ethernet',
                component: ComponentCreator('/docs/network-basics/データリンク層/ethernet', '95e'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/データリンク層/mac_arp',
                component: ComponentCreator('/docs/network-basics/データリンク層/mac_arp', '95b'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/データリンク層/switch_bridge',
                component: ComponentCreator('/docs/network-basics/データリンク層/switch_bridge', '95d'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/データリンク層/vlan',
                component: ComponentCreator('/docs/network-basics/データリンク層/vlan', '61e'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/データリンク層/wifi',
                component: ComponentCreator('/docs/network-basics/データリンク層/wifi', '062'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/トランスポート層/port_socket',
                component: ComponentCreator('/docs/network-basics/トランスポート層/port_socket', '961'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/トランスポート層/quic',
                component: ComponentCreator('/docs/network-basics/トランスポート層/quic', 'e9a'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/トランスポート層/tcp_congestion',
                component: ComponentCreator('/docs/network-basics/トランスポート層/tcp_congestion', '32b'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/トランスポート層/tcp_flow_control',
                component: ComponentCreator('/docs/network-basics/トランスポート層/tcp_flow_control', '652'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/トランスポート層/tcp_handshake',
                component: ComponentCreator('/docs/network-basics/トランスポート層/tcp_handshake', 'd3c'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/トランスポート層/tcp_sequence',
                component: ComponentCreator('/docs/network-basics/トランスポート層/tcp_sequence', '53e'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/トランスポート層/tcp_termination',
                component: ComponentCreator('/docs/network-basics/トランスポート層/tcp_termination', '85a'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/トランスポート層/udp',
                component: ComponentCreator('/docs/network-basics/トランスポート層/udp', '17d'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/ネットワーク基礎/bandwidth_latency',
                component: ComponentCreator('/docs/network-basics/ネットワーク基礎/bandwidth_latency', '8eb'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/ネットワーク基礎/osi_model',
                component: ComponentCreator('/docs/network-basics/ネットワーク基礎/osi_model', '129'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/ネットワーク基礎/packet_switching',
                component: ComponentCreator('/docs/network-basics/ネットワーク基礎/packet_switching', '2b2'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/ネットワーク基礎/tcp_ip_model',
                component: ComponentCreator('/docs/network-basics/ネットワーク基礎/tcp_ip_model', '713'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/ネットワーク基礎/what_is_network',
                component: ComponentCreator('/docs/network-basics/ネットワーク基礎/what_is_network', '234'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/ネットワーク層/bgp',
                component: ComponentCreator('/docs/network-basics/ネットワーク層/bgp', '69c'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/ネットワーク層/icmp',
                component: ComponentCreator('/docs/network-basics/ネットワーク層/icmp', '08d'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/ネットワーク層/ip_address',
                component: ComponentCreator('/docs/network-basics/ネットワーク層/ip_address', '69c'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/ネットワーク層/ipv4_header',
                component: ComponentCreator('/docs/network-basics/ネットワーク層/ipv4_header', '37f'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/ネットワーク層/ipv6',
                component: ComponentCreator('/docs/network-basics/ネットワーク層/ipv6', 'd64'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/ネットワーク層/nat',
                component: ComponentCreator('/docs/network-basics/ネットワーク層/nat', '242'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/ネットワーク層/ospf',
                component: ComponentCreator('/docs/network-basics/ネットワーク層/ospf', 'e7c'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/ネットワーク層/rip',
                component: ComponentCreator('/docs/network-basics/ネットワーク層/rip', '714'),
                exact: true,
                sidebar: "networkBasicsSidebar"
              },
              {
                path: '/docs/network-basics/ネットワーク層/routing_basics',
                component: ComponentCreator('/docs/network-basics/ネットワーク層/routing_basics', 'ddb'),
                exact: true,
                sidebar: "networkBasicsSidebar"
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
