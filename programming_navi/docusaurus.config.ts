import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'プログラミングナビ',
  tagline: 'プログラミングに関する情報まとめサイト',
  favicon: 'img/programming_navi_logo.png',

  // ホストするURL
  url: 'https://your-docusaurus-site.example.com',
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

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // SNSのリンクでのロゴ
    image: 'img/programming_navi_logo.png',
    navbar: {
      title: 'Home',
      logo: {
        alt: 'Programming Navi Logo',
        src: 'img/programming_navi_logo.png',
      },
      // メニューバー
      items: [
        { to: '/docs/intro', label: '基礎', position: 'left', },
        { to: '/docs/data-structure', label: 'データ構造', position: 'left', },
        { to: '/docs/advanced', label: 'アルゴリズム', position: 'left', },
        { to: '/docs/advanced', label: '環境構築', position: 'left', },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © 2023-${new Date().getFullYear()} プログラミングナビ All Right Reserved.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
