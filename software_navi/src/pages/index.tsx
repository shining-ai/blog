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
    title: '古典的機械学習',
    path: '/docs/classical-ml/intro',
    description: 'イントロ・数学基礎・データ前処理・モデル評価・教師あり学習・教師なし学習を体系的に解説',
    categories: ['イントロダクション', '数学的基礎', 'データ前処理', 'モデル評価', '教師あり学習', '教師なし学習'],
  },
  {
    title: '深層学習・応用',
    path: '/docs/deep-learning/intro',
    description: 'ニューラルネット・CNN・Transformer・NLP・強化学習・MLOpsまで深層学習と実践を解説',
    categories: ['ニューラルネット基礎', 'CNN・画像', 'Transformer・NLP', '強化学習', 'MLOps'],
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
    url: '#',
  },
  {
    title: 'システム',
    subtitle: 'System Navi',
    description: 'コンピュータアーキテクチャからOSまで低レイヤを体系的に学べるサイト',
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
      description="数学基礎から深層学習・MLOpsまで機械学習をコード例と図解で学ぶ">
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
