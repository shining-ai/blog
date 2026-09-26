import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'システムナビ',
  tagline: 'コンピュータアーキテクチャからOSまで低レイヤを体系的に学べるサイト',
  favicon: 'img/computer_navi_logo.png',

  url: 'https://your-docusaurus-site.example.com',
  baseUrl: '/',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

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
    image: 'img/computer_navi_logo.png',
    navbar: {
      title: 'Home',
      logo: {
        alt: 'System Navi Logo',
        src: 'img/computer_navi_logo.png',
      },
      items: [
        { type: 'docSidebar', sidebarId: 'computerArchitectureSidebar', label: 'コンピュータアーキテクチャ', position: 'left' },
        { type: 'docSidebar', sidebarId: 'operatingSystemSidebar', label: 'オペレーティングシステム', position: 'left' },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © 2025-${new Date().getFullYear()} システムナビ All Right Reserved.`,
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
  } satisfies Preset.ThemeConfig,
};

export default config;
