import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'セキュリティナビ',
  tagline: '暗号理論・Webセキュリティ・バイナリ解析・CTFをセキュリティの全領域を体系的に学べるサイト',
  favicon: 'img/security_navi_logo.png',

  url: 'https://your-docusaurus-site.example.com',
  baseUrl: '/',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  scripts: [
    {
      src: 'https://identity.netlify.com/v1/netlify-identity-widget.js',
      defer: true,
    },
  ],

  plugins: ['docusaurus-plugin-image-zoom'],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/security_navi_logo.png',
    navbar: {
      title: 'Home',
      logo: {
        alt: 'Security Navi Logo',
        src: 'img/security_navi_logo.png',
      },
      items: [
        { type: 'docSidebar', sidebarId: 'cryptoWebSecSidebar', label: '暗号・Web・NWセキュリティ', position: 'left' },
        { type: 'docSidebar', sidebarId: 'binarySecDevSidebar', label: 'バイナリ・開発・CTF', position: 'left' },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © 2025-${new Date().getFullYear()} セキュリティナビ All Right Reserved.`,
    },
    docs: {
      sidebar: {
        hideable: true,
      },
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
    zoom: {
      selector: '.markdown img',
      background: {
        light: 'rgba(0, 0, 0, 0.7)',
        dark: 'rgba(0, 0, 0, 0.85)',
      },
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
