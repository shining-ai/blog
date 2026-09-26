import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 全文検索インデックス

## 全文検索インデックスとは

> 全文検索インデックスとは、テキストを単語（トークン）に分割して転置インデックスを構築し、`LIKE '%keyword%'` では不可能な高速なキーワード検索・関連度スコアリングを実現するインデックス技術である。

`LIKE '%キーワード%'` による検索は先頭ワイルドカードのためインデックスを使えず、全行スキャンになります。全文検索インデックスはテキストを形態素解析・トークナイザで単語に分解し、「単語 → ドキュメントIDのリスト」という転置インデックス（Inverted Index）を構築します。これにより、大量のテキストからのキーワード検索をO(1)〜O(log n)で実行できます。

PostgreSQLは`tsvector`・`tsquery`型と`GIN`インデックスを使った全文検索をネイティブサポートします。日本語はデフォルトのトークナイザが対応していないため、`pgroonga`拡張や`pg_bigm`拡張が必要です。MySQLは`FULLTEXT`インデックスをサポートし、`MATCH() AGAINST()`構文で検索します。本格的な全文検索にはElasticsearchやOpenSearchなどの専用エンジンが使われることも多いです。

転置インデックスは各単語がどのドキュメントに含まれるかを記録するため、ドキュメントの追加・更新時にインデックスの再構築コストがかかります。

## 全文検索の比較

| 項目 | LIKE検索 | RDBMSの全文検索 | Elasticsearch |
|------|---------|----------------|---------------|
| インデックス | 使えない（前方一致のみ可） | GIN / FULLTEXT | 転置インデックス |
| 検索速度 | O(n) 全行スキャン | O(log n) | O(1)〜O(log n) |
| 日本語対応 | 可（遅い） | 拡張が必要 | プラグインで対応 |
| 関連度スコア | なし | 基本的なTF-IDF | BM25・カスタム可能 |
| ファジー検索 | 不可 | 一部対応 | 対応 |
| スケール | 単一DB | 単一DB | 分散クラスタ |
| 主な用途 | 小規模・シンプル | 中規模 | 大規模・本格検索 |

```sql
-- ====================================
-- PostgreSQL 全文検索の基本
-- ====================================
-- tsvector と tsquery の基本
SELECT to_tsvector('english', 'The quick brown fox jumps over the lazy dog');
-- 'brown':3 'dog':9 'fox':4 'jump':5 'lazi':8 'quick':2

SELECT to_tsquery('english', 'quick & fox');

-- テーブルへの全文検索インデックスの追加
ALTER TABLE articles ADD COLUMN fts_vector tsvector;

-- tsvector を title と body から生成（重み付き）
UPDATE articles
SET fts_vector = (
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(body, '')), 'B')
);

-- GIN インデックスを作成
CREATE INDEX idx_articles_fts ON articles USING GIN(fts_vector);

-- 全文検索クエリ（ANDで複数キーワード）
SELECT id, title,
       ts_rank(fts_vector, query) AS rank
FROM articles,
     to_tsquery('english', 'database & index') query
WHERE fts_vector @@ query
ORDER BY rank DESC
LIMIT 20;

-- ====================================
-- PostgreSQL：トリガーで自動更新
-- ====================================
-- 挿入・更新時に自動で fts_vector を更新するトリガー
CREATE OR REPLACE FUNCTION update_fts_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fts_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.body, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_articles_fts
BEFORE INSERT OR UPDATE ON articles
FOR EACH ROW EXECUTE FUNCTION update_fts_vector();

-- ====================================
-- MySQL の FULLTEXT インデックス
-- ====================================
-- FULLTEXT インデックスの作成
CREATE FULLTEXT INDEX idx_articles_fulltext ON articles(title, body)
    WITH PARSER ngram;  -- ngram パーサで日本語対応

-- 自然言語モード検索（デフォルト）
SELECT id, title,
       MATCH(title, body) AGAINST ('database index' IN NATURAL LANGUAGE MODE) AS score
FROM articles
WHERE MATCH(title, body) AGAINST ('database index')
ORDER BY score DESC
LIMIT 20;

-- ブールモード検索（AND/OR/NOT制御）
SELECT id, title
FROM articles
WHERE MATCH(title, body) AGAINST ('+database -NoSQL' IN BOOLEAN MODE);
```

```python
import psycopg2

conn = psycopg2.connect(
    host="localhost", dbname="mydb", user="user", password="pass"
)
cur = conn.cursor()

def fulltext_search(query_str: str, lang: str = "english", limit: int = 10):
    """PostgreSQL 全文検索を実行してスコア付き結果を返す"""
    cur.execute("""
        SELECT
            id,
            title,
            ts_rank(fts_vector, query)     AS rank,
            ts_headline(
                %s,
                body,
                query,
                'MaxWords=35, MinWords=15, ShortWord=3'
            ) AS snippet
        FROM articles,
             to_tsquery(%s, %s) query
        WHERE fts_vector @@ query
        ORDER BY rank DESC
        LIMIT %s
    """, (lang, lang, query_str, limit))

    results = cur.fetchall()
    return results

# 全文検索の実行
results = fulltext_search("database & performance")
print(f"検索結果: {len(results)} 件")
print()
for row in results:
    print(f"ID={row[0]} スコア={row[2]:.4f}")
    print(f"  タイトル: {row[1]}")
    print(f"  スニペット: {row[3][:100]}...")
    print()

# インデックスのサイズ確認
cur.execute("""
    SELECT
        indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) AS size
    FROM pg_stat_user_indexes
    WHERE relname = 'articles'
      AND indexname LIKE '%fts%'
""")
print("全文検索インデックスのサイズ:")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]}")

cur.close()
conn.close()
```

## 使用場面

- ブログ・ニュース・製品説明などのテキスト検索を `LIKE '%...%'` から置き換える場合
- 検索結果を関連度スコアで順位付けして表示する場合
- タイトルと本文に異なる重みを設定して検索精度を向上させる場合
- 小〜中規模の全文検索をElasticsearchなしにRDBMS単体で実装する場合

## 参考文献

- [PostgreSQL Documentation - Full Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [MySQL Documentation - Full-Text Search Functions](https://dev.mysql.com/doc/refman/8.0/en/fulltext-search.html)
- [pgroonga - PostgreSQL向け高速全文検索拡張](https://pgroonga.github.io/)

<AffiliateBanner site="db_navi" />
