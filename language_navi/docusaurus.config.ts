import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'プログラミング言語ナビ',
  tagline: 'プログラミングパラダイム・型システム・コンパイラ・GCを体系的に学べるサイト',
  favicon: 'img/language_navi_logo.png',

  url: 'https://language.nisshingeppo.com',
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
    image: 'img/language_navi_logo.png',
    navbar: {
      title: 'Home',
      logo: {
        alt: 'Language Navi Logo',
        src: 'img/language_navi_logo.png',
      },
      items: [
        { type: 'docSidebar', sidebarId: 'langParadigmSidebar', label: 'パラダイム・型システム', position: 'left' },
        { type: 'docSidebar', sidebarId: 'compilerRuntimeSidebar', label: 'コンパイラ・ランタイム', position: 'left' },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © 2025-${new Date().getFullYear()} プログラミング言語ナビ All Right Reserved.`,
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
