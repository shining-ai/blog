import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 全文検索エンジン（Elasticsearch）

## Elasticsearch とは

> Elasticsearch とは Apache Lucene を基盤とした分散型全文検索・分析エンジンであり、転置インデックスによる高速全文検索・RESTful API・スケーラブルな分散アーキテクチャを特徴として、ログ分析・全文検索・リアルタイム分析に広く使われる。

Elasticsearch は 2010 年に Shay Banon が開発し、現在は Elastic 社がメンテナンスしています。Kibana（可視化）・Logstash（データ収集・変換）・Beats（軽量エージェント）と合わせて「Elastic Stack」（旧 ELK スタック）として利用されます。

全文検索の核心は「転置インデックス（Inverted Index）」です。ドキュメントのテキストをトークン（単語）に分割し、各トークンがどのドキュメントに出現するかを記録します。これにより「特定の単語を含むドキュメント」を O(1) に近い速度で取得できます。

Elasticsearch は JSON ドキュメントをインデックスに格納します。インデックスは複数のシャード（Lucene インデックス）に分割されてノードに分散配置されます。各シャードにはレプリカシャードを設定でき、高可用性を確保します。

アナライザ（Analyzer）はテキストを転置インデックス用にトークン化する処理です。文字フィルタ（正規化）→ トークナイザ（分割）→ トークンフィルタ（小文字化・ステミング）のパイプラインで構成されます。日本語には kuromoji などの形態素解析プラグインを使います。

## Elasticsearch vs RDB の全文検索

| 機能 | Elasticsearch | RDBMS（LIKE/FTS） |
|------|--------------|-------------------|
| 転置インデックス | ネイティブ | 限定的 |
| 関連性スコアリング（BM25） | あり | なし |
| ファジー検索 | あり | 限定的 |
| 集計（Aggregation） | リアルタイム | GROUP BY（遅い） |
| スケール | 水平（シャーディング） | 主に垂直 |
| 非構造化データ | JSON ネイティブ | TEXT 型のみ |

```python
import re
import math
from collections import defaultdict
from dataclasses import dataclass, field

# ===========================
# 転置インデックスの実装
# ===========================

@dataclass
class Document:
    id: str
    source: dict

    def get(self, field: str, default=""):
        return self.source.get(field, default)


class Analyzer:
    """テキストアナライザ: トークン化と正規化"""

    def analyze(self, text: str) -> list[str]:
        # 小文字化
        text = text.lower()
        # 記号除去
        text = re.sub(r"[^\w\s]", " ", text)
        # スペース分割
        tokens = text.split()
        # ストップワード除去
        stop_words = {"the", "a", "an", "is", "in", "on", "at", "to", "and", "or", "of"}
        tokens = [t for t in tokens if t not in stop_words]
        return tokens


class InvertedIndex:
    """転置インデックス"""

    def __init__(self):
        # {term: {doc_id: 出現頻度}}
        self._index: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
        self._doc_lengths: dict[str, int] = {}  # ドキュメントのトークン数

    def add(self, doc_id: str, tokens: list[str]) -> None:
        self._doc_lengths[doc_id] = len(tokens)
        for token in tokens:
            self._index[token][doc_id] += 1

    def get_postings(self, term: str) -> dict[str, int]:
        return self._index.get(term, {})

    @property
    def num_docs(self) -> int:
        return len(self._doc_lengths)


class BM25Scorer:
    """BM25 関連性スコアリング（Elasticsearch のデフォルト）"""

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b

    def score(
        self,
        tf: int,        # 単語の文書内頻度
        df: int,        # 単語を含む文書数
        n_docs: int,    # 総文書数
        doc_len: int,   # 文書の長さ
        avg_len: float, # 平均文書長
    ) -> float:
        # IDF 計算
        idf = math.log((n_docs - df + 0.5) / (df + 0.5) + 1)
        # TF 正規化（文書長による正規化）
        tf_norm = (tf * (self.k1 + 1)) / (tf + self.k1 * (1 - self.b + self.b * doc_len / avg_len))
        return idf * tf_norm


class SimpleElasticsearch:
    """Elasticsearch のコア機能をシミュレーション"""

    def __init__(self):
        self._docs: dict[str, Document] = {}
        self._index: InvertedIndex = InvertedIndex()
        self._analyzer = Analyzer()
        self._scorer = BM25Scorer()
        self._indexed_fields: list[str] = ["title", "body"]

    def index(self, doc_id: str, source: dict) -> None:
        """ドキュメントをインデックス"""
        doc = Document(id=doc_id, source=source)
        self._docs[doc_id] = doc

        # 全フィールドのテキストを結合してトークン化
        all_text = " ".join(
            str(source.get(f, "")) for f in self._indexed_fields
        )
        tokens = self._analyzer.analyze(all_text)
        self._index.add(doc_id, tokens)

    def search(
        self,
        query: str,
        from_: int = 0,
        size: int = 10,
        fuzzy: bool = False,
    ) -> list[dict]:
        """全文検索（BM25 スコアリング）"""
        query_tokens = self._analyzer.analyze(query)
        n_docs = self._index.num_docs
        avg_len = (sum(self._index._doc_lengths.values()) / n_docs) if n_docs else 1

        # 各ドキュメントのスコアを計算
        scores: dict[str, float] = defaultdict(float)
        for term in query_tokens:
            postings = self._index.get_postings(term)
            df = len(postings)
            for doc_id, tf in postings.items():
                doc_len = self._index._doc_lengths.get(doc_id, 1)
                score = self._scorer.score(tf, df, n_docs, doc_len, avg_len)
                scores[doc_id] += score

        # スコアでソート
        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        hits = []
        for doc_id, score in ranked[from_: from_ + size]:
            doc = self._docs[doc_id]
            hits.append({
                "_id": doc_id,
                "_score": round(score, 4),
                "_source": doc.source,
            })
        return hits

    def aggregation_terms(self, field: str, size: int = 10) -> list[dict]:
        """用語集計（Elasticsearch Aggregation の簡易版）"""
        counter: dict = defaultdict(int)
        for doc in self._docs.values():
            val = doc.source.get(field)
            if val:
                counter[str(val)] += 1
        sorted_items = sorted(counter.items(), key=lambda x: x[1], reverse=True)
        return [{"key": k, "doc_count": v} for k, v in sorted_items[:size]]


print("=== Elasticsearch 全文検索デモ ===\n")

es = SimpleElasticsearch()

# ドキュメントのインデックス
articles = [
    ("1", "Introduction to Elasticsearch",
     "Elasticsearch is a distributed search and analytics engine built on Apache Lucene."),
    ("2", "Python Database Programming",
     "Python supports multiple database backends including PostgreSQL, MySQL, and MongoDB."),
    ("3", "NoSQL Database Comparison",
     "Comparing NoSQL databases: Redis, MongoDB, Cassandra, and Elasticsearch for search."),
    ("4", "Distributed Systems Design",
     "Distributed systems require careful design for consistency, availability, and partition tolerance."),
    ("5", "Full Text Search with Elasticsearch",
     "Elasticsearch provides powerful full text search with BM25 scoring and aggregations."),
]
for doc_id, title, body in articles:
    es.index(doc_id, {"title": title, "body": body, "category": "tech"})

# 検索
print("[全文検索: 'elasticsearch search']")
results = es.search("elasticsearch search")
for hit in results:
    print(f"  score={hit['_score']:.4f} | {hit['_source']['title']}")

print("\n[全文検索: 'distributed database']")
results = es.search("distributed database")
for hit in results:
    print(f"  score={hit['_score']:.4f} | {hit['_source']['title']}")

print("\n[集計: カテゴリ別ドキュメント数]")
agg = es.aggregation_terms("category")
for bucket in agg:
    print(f"  {bucket['key']}: {bucket['doc_count']} docs")

print("\n[Elasticsearch Query DSL の例]")
print("""  # bool クエリ（複合検索）
  GET /articles/_search
  {
    "query": {
      "bool": {
        "must": [
          {"match": {"body": "elasticsearch"}}
        ],
        "filter": [
          {"term": {"category": "tech"}}
        ],
        "should": [
          {"match": {"title": "search"}}
        ]
      }
    },
    "aggs": {
      "categories": {
        "terms": {"field": "category.keyword"}
      }
    },
    "highlight": {
      "fields": {"body": {}}
    }
  }""")
```

## 使用場面

- ECサイトの商品検索・ブログ記事の全文検索で関連性スコアリング（BM25）付きの高速検索を実現する場面
- Logstash や Fluentd でアプリケーションログを収集して Kibana でリアルタイム可視化する ELK スタックを構築する場面
- ユーザ行動ログをリアルタイム集計（Aggregation）してダッシュボードに表示するアナリティクス基盤を構築する場面

## 参考文献

- [Elasticsearch Documentation](https://www.elastic.co/guide/index.html)
- Gormley, C. and Tong, Z. "Elasticsearch: The Definitive Guide" (O'Reilly Media)
- Robertson, S. and Zaragoza, H. "The Probabilistic Relevance Framework: BM25 and Beyond" (2009)

<AffiliateBanner site="db_navi" />
