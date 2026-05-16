import type {ReactNode} from 'react';
import {useEffect} from 'react';
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
    title: 'データ構造',
    path: '/docs/data-structure/intro',
    description: 'データの格納・操作・検索を効率化するための構造を体系的に解説',
    categories: ['線形データ構造', 'ハッシュ構造', 'ツリー構造', 'グラフ構造', 'その他'],
  },
  {
    title: 'アルゴリズム',
    path: '/docs/algorithm/intro',
    description: '問題を効率的に解くための手順・手法を計算量とともに解説',
    categories: ['ソート', '探索', '文字列', 'グラフ', '数値', '計算幾何', '最適化', '並列'],
  },
  {
    title: 'アルゴリズム戦略',
    path: '/docs/algorithm-strategy/intro',
    description: '多様な問題に横断的に適用できる汎用的な設計パラダイムを解説',
    categories: ['分割統治法', '貪欲法', '動的計画法', 'バックトラッキング', '乱択', '近似', 'オンライン'],
  },
  {
    title: '書籍',
    path: '/docs/books/intro',
    description: 'アルゴリズム・データ構造の学習におすすめの参考書を紹介',
    categories: ['競技プログラミングの鉄則', '蟻本', '螺旋本', 'アルゴリズム図鑑', 'アルゴリズムイントロダクション'],
  },
];

type SisterSite = {
  title: string;
  subtitle: string;
  description: string;
  url: string;
};

// 姉妹サイトの URL は適宜変更してください
const SISTER_SITES: SisterSite[] = [
  {
    title: 'OS',
    subtitle: 'Operating System',
    description: 'オペレーティングシステムの仕組みを解説',
    url: '#',
  },
  {
    title: '機械学習',
    subtitle: 'Machine Learning',
    description: '機械学習・深層学習のアルゴリズムと実装を解説',
    url: '#',
  },
  {
    title: 'コンピュータシステム',
    subtitle: 'Computer Systems',
    description: 'コンピュータの構成・アーキテクチャを基礎から解説',
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

  useEffect(() => {
    if ((window as any).netlifyIdentity) {
      (window as any).netlifyIdentity.on('init', (user: unknown) => {
        if (!user) {
          (window as any).netlifyIdentity.on('login', () => {
            document.location.href = '/admin/';
          });
        }
      });
    }
  }, []);

  return (
    <Layout
      title={siteConfig.title}
      description="データ構造・アルゴリズム・アルゴリズム戦略をコード例と図解で学ぶ">
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
