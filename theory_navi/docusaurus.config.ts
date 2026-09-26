import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: '計算理論ナビ',
  tagline: 'オートマトン・チューリング機械・計算量理論を体系的に学べるサイト',
  favicon: 'img/theory_navi_logo.png',

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
    image: 'img/theory_navi_logo.png',
    navbar: {
      title: 'Home',
      logo: {
        alt: 'Theory Navi Logo',
        src: 'img/theory_navi_logo.png',
      },
      items: [
        { type: 'docSidebar', sidebarId: 'discreteMathSidebar', label: '離散数学・情報理論', position: 'left' },
        { type: 'docSidebar', sidebarId: 'computabilityTheorySidebar', label: '形式言語・計算量', position: 'left' },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © 2025-${new Date().getFullYear()} 計算理論ナビ All Right Reserved.`,
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
