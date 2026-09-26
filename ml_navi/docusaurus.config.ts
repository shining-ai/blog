import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: '機械学習ナビ',
  tagline: '数学基礎から深層学習・MLOpsまで機械学習を体系的に学べるサイト',
  favicon: 'img/ml_navi_logo.png',

  url: 'https://your-docusaurus-site.example.com',
  baseUrl: '/',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

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
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/ml_navi_logo.png',
    navbar: {
      title: 'Home',
      logo: {
        alt: 'ML Navi Logo',
        src: 'img/ml_navi_logo.png',
      },
      items: [
        { type: 'docSidebar', sidebarId: 'classicalMlSidebar', label: '古典的機械学習', position: 'left' },
        { type: 'docSidebar', sidebarId: 'deepLearningSidebar', label: '深層学習・応用', position: 'left' },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © 2025-${new Date().getFullYear()} 機械学習ナビ All Right Reserved.`,
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
