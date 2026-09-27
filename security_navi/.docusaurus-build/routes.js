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
    component: ComponentCreator('/docs', 'aa0'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', '2cf'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', 'bc6'),
            routes: [
              {
                path: '/docs/binary-sec-dev/CTF/crypto_ctf',
                component: ComponentCreator('/docs/binary-sec-dev/CTF/crypto_ctf', '0b9'),
                exact: true,
                sidebar: "binarySecDevSidebar"
              },
              {
                path: '/docs/binary-sec-dev/CTF/ctf_categories',
                component: ComponentCreator('/docs/binary-sec-dev/CTF/ctf_categories', '574'),
                exact: true,
                sidebar: "binarySecDevSidebar"
              },
              {
                path: '/docs/binary-sec-dev/CTF/pwn_basics',
                component: ComponentCreator('/docs/binary-sec-dev/CTF/pwn_basics', '85a'),
                exact: true,
                sidebar: "binarySecDevSidebar"
              },
              {
                path: '/docs/binary-sec-dev/CTF/web_ctf',
                component: ComponentCreator('/docs/binary-sec-dev/CTF/web_ctf', '9dc'),
                exact: true,
                sidebar: "binarySecDevSidebar"
              },
              {
                path: '/docs/binary-sec-dev/intro',
                component: ComponentCreator('/docs/binary-sec-dev/intro', '21d'),
                exact: true,
                sidebar: "binarySecDevSidebar"
              },
              {
                path: '/docs/binary-sec-dev/セキュアな開発/dependency_vuln',
                component: ComponentCreator('/docs/binary-sec-dev/セキュアな開発/dependency_vuln', '718'),
                exact: true,
                sidebar: "binarySecDevSidebar"
              },
              {
                path: '/docs/binary-sec-dev/セキュアな開発/pentest_flow',
                component: ComponentCreator('/docs/binary-sec-dev/セキュアな開発/pentest_flow', 'be1'),
                exact: true,
                sidebar: "binarySecDevSidebar"
              },
              {
                path: '/docs/binary-sec-dev/セキュアな開発/sast_dast_sca',
                component: ComponentCreator('/docs/binary-sec-dev/セキュアな開発/sast_dast_sca', '529'),
                exact: true,
                sidebar: "binarySecDevSidebar"
              },
              {
                path: '/docs/binary-sec-dev/セキュアな開発/secure_sdlc',
                component: ComponentCreator('/docs/binary-sec-dev/セキュアな開発/secure_sdlc', '00d'),
                exact: true,
                sidebar: "binarySecDevSidebar"
              },
              {
                path: '/docs/binary-sec-dev/セキュアな開発/threat_modeling',
                component: ComponentCreator('/docs/binary-sec-dev/セキュアな開発/threat_modeling', '873'),
                exact: true,
                sidebar: "binarySecDevSidebar"
              },
              {
                path: '/docs/binary-sec-dev/バイナリ・低レイヤセキュリティ/dynamic_analysis',
                component: ComponentCreator('/docs/binary-sec-dev/バイナリ・低レイヤセキュリティ/dynamic_analysis', 'dc8'),
                exact: true,
                sidebar: "binarySecDevSidebar"
              },
              {
                path: '/docs/binary-sec-dev/バイナリ・低レイヤセキュリティ/format_string',
                component: ComponentCreator('/docs/binary-sec-dev/バイナリ・低レイヤセキュリティ/format_string', 'd01'),
                exact: true,
                sidebar: "binarySecDevSidebar"
              },
              {
                path: '/docs/binary-sec-dev/バイナリ・低レイヤセキュリティ/heap_bof',
                component: ComponentCreator('/docs/binary-sec-dev/バイナリ・低レイヤセキュリティ/heap_bof', '543'),
                exact: true,
                sidebar: "binarySecDevSidebar"
              },
              {
                path: '/docs/binary-sec-dev/バイナリ・低レイヤセキュリティ/mitigations',
                component: ComponentCreator('/docs/binary-sec-dev/バイナリ・低レイヤセキュリティ/mitigations', 'f47'),
                exact: true,
                sidebar: "binarySecDevSidebar"
              },
              {
                path: '/docs/binary-sec-dev/バイナリ・低レイヤセキュリティ/reverse_engineering',
                component: ComponentCreator('/docs/binary-sec-dev/バイナリ・低レイヤセキュリティ/reverse_engineering', '4be'),
                exact: true,
                sidebar: "binarySecDevSidebar"
              },
              {
                path: '/docs/binary-sec-dev/バイナリ・低レイヤセキュリティ/rop',
                component: ComponentCreator('/docs/binary-sec-dev/バイナリ・低レイヤセキュリティ/rop', 'ba0'),
                exact: true,
                sidebar: "binarySecDevSidebar"
              },
              {
                path: '/docs/binary-sec-dev/バイナリ・低レイヤセキュリティ/stack_bof',
                component: ComponentCreator('/docs/binary-sec-dev/バイナリ・低レイヤセキュリティ/stack_bof', '1f0'),
                exact: true,
                sidebar: "binarySecDevSidebar"
              },
              {
                path: '/docs/binary-sec-dev/マルウェア・フォレンジクス/digital_forensics',
                component: ComponentCreator('/docs/binary-sec-dev/マルウェア・フォレンジクス/digital_forensics', 'bb7'),
                exact: true,
                sidebar: "binarySecDevSidebar"
              },
              {
                path: '/docs/binary-sec-dev/マルウェア・フォレンジクス/malware_types',
                component: ComponentCreator('/docs/binary-sec-dev/マルウェア・フォレンジクス/malware_types', '5de'),
                exact: true,
                sidebar: "binarySecDevSidebar"
              },
              {
                path: '/docs/binary-sec-dev/マルウェア・フォレンジクス/memory_forensics',
                component: ComponentCreator('/docs/binary-sec-dev/マルウェア・フォレンジクス/memory_forensics', '976'),
                exact: true,
                sidebar: "binarySecDevSidebar"
              },
              {
                path: '/docs/binary-sec-dev/マルウェア・フォレンジクス/sandbox',
                component: ComponentCreator('/docs/binary-sec-dev/マルウェア・フォレンジクス/sandbox', '699'),
                exact: true,
                sidebar: "binarySecDevSidebar"
              },
              {
                path: '/docs/binary-sec-dev/マルウェア・フォレンジクス/static_dynamic_analysis',
                component: ComponentCreator('/docs/binary-sec-dev/マルウェア・フォレンジクス/static_dynamic_analysis', '725'),
                exact: true,
                sidebar: "binarySecDevSidebar"
              },
              {
                path: '/docs/crypto-web-security/intro',
                component: ComponentCreator('/docs/crypto-web-security/intro', '3c5'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/PKI・TLS・認証/cert_chain',
                component: ComponentCreator('/docs/crypto-web-security/PKI・TLS・認証/cert_chain', '002'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/PKI・TLS・認証/https_hsts',
                component: ComponentCreator('/docs/crypto-web-security/PKI・TLS・認証/https_hsts', '6e3'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/PKI・TLS・認証/jwt',
                component: ComponentCreator('/docs/crypto-web-security/PKI・TLS・認証/jwt', '641'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/PKI・TLS・認証/mfa',
                component: ComponentCreator('/docs/crypto-web-security/PKI・TLS・認証/mfa', '41c'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/PKI・TLS・認証/oauth2_oidc',
                component: ComponentCreator('/docs/crypto-web-security/PKI・TLS・認証/oauth2_oidc', '6d3'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/PKI・TLS・認証/password_storage',
                component: ComponentCreator('/docs/crypto-web-security/PKI・TLS・認証/password_storage', 'c02'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/PKI・TLS・認証/sso',
                component: ComponentCreator('/docs/crypto-web-security/PKI・TLS・認証/sso', '18b'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/PKI・TLS・認証/tls13',
                component: ComponentCreator('/docs/crypto-web-security/PKI・TLS・認証/tls13', '0d2'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/PKI・TLS・認証/x509_pki',
                component: ComponentCreator('/docs/crypto-web-security/PKI・TLS・認証/x509_pki', '18e'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/Webセキュリティ/command_injection',
                component: ComponentCreator('/docs/crypto-web-security/Webセキュリティ/command_injection', '7fb'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/Webセキュリティ/csrf',
                component: ComponentCreator('/docs/crypto-web-security/Webセキュリティ/csrf', '2fb'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/Webセキュリティ/insecure_deserialization',
                component: ComponentCreator('/docs/crypto-web-security/Webセキュリティ/insecure_deserialization', '0cf'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/Webセキュリティ/owasp_top10',
                component: ComponentCreator('/docs/crypto-web-security/Webセキュリティ/owasp_top10', '128'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/Webセキュリティ/path_traversal',
                component: ComponentCreator('/docs/crypto-web-security/Webセキュリティ/path_traversal', '039'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/Webセキュリティ/security_headers',
                component: ComponentCreator('/docs/crypto-web-security/Webセキュリティ/security_headers', '67f'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/Webセキュリティ/sqli',
                component: ComponentCreator('/docs/crypto-web-security/Webセキュリティ/sqli', 'daf'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/Webセキュリティ/ssrf',
                component: ComponentCreator('/docs/crypto-web-security/Webセキュリティ/ssrf', '005'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/Webセキュリティ/xss',
                component: ComponentCreator('/docs/crypto-web-security/Webセキュリティ/xss', '113'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/Webセキュリティ/xxe',
                component: ComponentCreator('/docs/crypto-web-security/Webセキュリティ/xxe', 'c67'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/ネットワークセキュリティ/ddos_types',
                component: ComponentCreator('/docs/crypto-web-security/ネットワークセキュリティ/ddos_types', 'efb'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/ネットワークセキュリティ/dns_hijacking',
                component: ComponentCreator('/docs/crypto-web-security/ネットワークセキュリティ/dns_hijacking', '7bf'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/ネットワークセキュリティ/firewall_ids',
                component: ComponentCreator('/docs/crypto-web-security/ネットワークセキュリティ/firewall_ids', '320'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/ネットワークセキュリティ/packet_sniffing',
                component: ComponentCreator('/docs/crypto-web-security/ネットワークセキュリティ/packet_sniffing', '4be'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/ネットワークセキュリティ/port_scan_nmap',
                component: ComponentCreator('/docs/crypto-web-security/ネットワークセキュリティ/port_scan_nmap', 'cfc'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/暗号理論/aes',
                component: ComponentCreator('/docs/crypto-web-security/暗号理論/aes', '021'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/暗号理論/block_cipher_modes',
                component: ComponentCreator('/docs/crypto-web-security/暗号理論/block_cipher_modes', '337'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/暗号理論/crypto_basics',
                component: ComponentCreator('/docs/crypto-web-security/暗号理論/crypto_basics', '27f'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/暗号理論/dh_key_exchange',
                component: ComponentCreator('/docs/crypto-web-security/暗号理論/dh_key_exchange', '46e'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/暗号理論/digital_signature',
                component: ComponentCreator('/docs/crypto-web-security/暗号理論/digital_signature', '1f2'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/暗号理論/ecc',
                component: ComponentCreator('/docs/crypto-web-security/暗号理論/ecc', 'afc'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/暗号理論/hash_functions',
                component: ComponentCreator('/docs/crypto-web-security/暗号理論/hash_functions', 'c3f'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/暗号理論/hmac',
                component: ComponentCreator('/docs/crypto-web-security/暗号理論/hmac', 'ca2'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/暗号理論/post_quantum',
                component: ComponentCreator('/docs/crypto-web-security/暗号理論/post_quantum', '219'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
              },
              {
                path: '/docs/crypto-web-security/暗号理論/rsa',
                component: ComponentCreator('/docs/crypto-web-security/暗号理論/rsa', '406'),
                exact: true,
                sidebar: "cryptoWebSecSidebar"
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
