import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import styles from './index.module.css';

// ─── データ定義 ───────────────────────────────────────────────

type Section = {
  title: string;
  path: string;
  description: string;
  categories: string[];
};

const SECTIONS: Section[] = [
  {
    title: 'コンピュータアーキテクチャ',
    path: '/docs/computer-architecture/intro',
    description: 'データ表現・論理回路・プロセッサ・メモリ階層・GPU・圧縮まで低レイヤを体系的に解説',
    categories: ['データ表現', '論理回路', 'プロセッサアーキテクチャ', 'メモリ階層', 'GPU・並列計算', 'データ形式・圧縮'],
  },
  {
    title: 'オペレーティングシステム',
    path: '/docs/operating-system/intro',
    description: 'OS・プロセス・スレッド・システムプログラミングをCとPythonで実践的に解説',
    categories: ['OSの概要', 'プロセス・スレッド', 'Cのメモリモデル', 'ポインタ'],
  },
];

type SisterSite = {
  title: string;
  subtitle: string;
  description: string;
  url: string;
};

const SISTER_SITES: SisterSite[] = [
  {
    title: 'アルゴリズム',
    subtitle: 'Algorithm Navi',
    description: 'アルゴリズムとデータ構造を体系的に学べるサイト',
    url: 'http://localhost:3003',
  },
  {
    title: '機械学習',
    subtitle: 'Machine Learning',
    description: '機械学習・深層学習のアルゴリズムと実装を解説',
    url: '#',
  },
];

// ─── コンポーネント ───────────────────────────────────────────

function SectionCard({title, path, description, categories}: Section) {
  return (
    <Link to={path} className={styles.sectionCard}>
      <p className={styles.sectionTitle}>{title}</p>
      <p className={styles.sectionDesc}>{description}</p>
      <div className={styles.tagList}>
        {categories.map(cat => (
          <span key={cat} className={styles.tag}>{cat}</span>
        ))}
      </div>
      <span className={styles.sectionCta}>詳細を見る →</span>
    </Link>
  );
}

// ─── ページ ───────────────────────────────────────────────────

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();

  return (
    <Layout
      title={siteConfig.title}
      description="コンピュータアーキテクチャ・OS・システムプログラミングをコード例と図解で学ぶ">
      <main>

        {/* ── ページヘッダー ── */}
        <div className={styles.pageHeader}>
          <div className="container">
            <p className={styles.siteTitle}>{siteConfig.title}</p>
            <p className={styles.siteSubtitle}>{siteConfig.tagline}</p>
          </div>
        </div>

        {/* ── セクションカード ── */}
        <section className={styles.sectionsArea}>
          <div className="container">
            <div className={styles.sectionGrid}>
              {SECTIONS.map(s => (
                <SectionCard key={s.title} {...s} />
              ))}
            </div>
          </div>
        </section>

        {/* ── 姉妹サイト ── */}
        <section className={styles.sisterArea}>
          <div className="container">
            <p className={styles.sisterHeading}>関連サイト</p>
            <div className={styles.sisterGrid}>
              {SISTER_SITES.map(s => (
                <a key={s.title} href={s.url} className={styles.sisterCard}>
                  <span className={styles.sisterTitle}>{s.title}</span>
                  <span className={styles.sisterSubtitle}>{s.subtitle}</span>
                  <span className={styles.sisterDesc}>{s.description}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

      </main>
    </Layout>
  );
}
