import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'アルゴリズムナビ',
  tagline: 'アルゴリズムとデータ構造を体系的に学べるサイト',
  favicon: 'img/algorithm_navi_logo.png',

  // ホストするURL
  url: 'https://algorithm.nisshingeppo.com',
  // TOPページのパス
  baseUrl: '/',

  // GitHub Pagesでホストする場合は、以下のように設定
  // organizationName: 'facebook', // Usually your GitHub org/user name.
  // projectName: 'docusaurus', // Usually your repo name.


  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: ['docusaurus-plugin-image-zoom'],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          // editUrl:
          //   'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // SNSのリンクでのロゴ
    image: 'img/algorithm_navi_logo.png',
    navbar: {
      title: 'Home',
      logo: {
        alt: 'Algorithm Navi Logo',
        src: 'img/algorithm_navi_logo.png',
      },
      // メニューバー
      items: [
        // { to: '/docs/intro', label: '基礎', position: 'left', },
        { type: 'docSidebar', sidebarId: 'datastructureSidebar', label: 'データ構造', position: 'left' },
        { type: 'docSidebar', sidebarId: 'algorithmSidebar', label: 'アルゴリズム', position: 'left' },
        { type: 'docSidebar', sidebarId: 'algorithmStrategySidebar', label: 'アルゴリズム戦略', position: 'left' },
        { type: 'docSidebar', sidebarId: 'booksmSidebar', label: '書籍', position: 'left' },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © 2023-${new Date().getFullYear()} アルゴリズムナビ All Right Reserved.`,
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
