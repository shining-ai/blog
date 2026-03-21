import type {ReactNode} from 'react';
import {useEffect} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

const sections = [
  {
    title: 'データ構造',
    description: '配列・スタック・キュー・連結リストなど、プログラミングの基盤となるデータ構造を体系的に解説します。',
    link: '/docs/data-structure/intro',
    icon: '🗂',
  },
  {
    title: 'アルゴリズム',
    description: 'ソート・探索・動的計画法など、競技プログラミングや実務で使われるアルゴリズムを解説します。',
    link: '/docs/algorithm/intro',
    icon: '⚡',
  },
  {
    title: '書籍',
    description: 'プログラミング・競技プログラミングの学習に役立つ厳選書籍を紹介します。',
    link: '/docs/books/intro',
    icon: '📚',
  },
];

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();

  useEffect(() => {
    if (window.netlifyIdentity) {
      window.netlifyIdentity.on('init', user => {
        if (!user) {
          window.netlifyIdentity.on('login', () => {
            document.location.href = '/admin/';
          });
        }
      });
    }
  }, []);

  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.heroEyebrow}>Programming Navi</p>
          <h1 className={styles.heroTitle}>{siteConfig.title}</h1>
          <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.sectionGrid}>
          {sections.map(({title, description, link, icon}) => (
            <Link key={title} to={link} className={styles.card}>
              <div className={styles.cardIcon}>{icon}</div>
              <h2 className={styles.cardTitle}>{title}</h2>
              <p className={styles.cardDesc}>{description}</p>
              <span className={styles.cardArrow}>記事を読む →</span>
            </Link>
          ))}
        </div>
      </main>
    </Layout>
  );
}
