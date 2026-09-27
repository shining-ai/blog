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
    title: '暗号・Web・NWセキュリティ',
    path: '/docs/crypto-web-security/intro',
    description: '暗号理論・PKI・TLS・認証・Webセキュリティ・ネットワークセキュリティを体系的に解説',
    categories: ['暗号理論', 'PKI・TLS・認証', 'Webセキュリティ', 'ネットワークセキュリティ'],
  },
  {
    title: 'バイナリ・開発・CTF',
    path: '/docs/binary-sec-dev/intro',
    description: 'バイナリ・低レイヤセキュリティ・マルウェア・フォレンジクス・セキュアな開発・CTFを体系的に解説',
    categories: ['バイナリ・低レイヤセキュリティ', 'マルウェア・フォレンジクス', 'セキュアな開発', 'CTF'],
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
