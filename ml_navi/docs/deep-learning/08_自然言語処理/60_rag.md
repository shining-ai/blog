import AffiliateBanner from '@site/src/components/AffiliateBanner';

# RAG（検索拡張生成）

## RAGとは

> RAG（Retrieval-Augmented Generation: 検索拡張生成）とは、大規模言語モデル（LLM）の生成能力と外部知識ベースの検索機能を組み合わせた手法です。LLMが学習時に持たない最新情報やドメイン固有の知識を、クエリに関連する文書を動的に検索して文脈に加えることで補完し、ハルシネーション（事実と異なる回答）を軽減します。

---

## RAGが解決する問題

| 問題 | 説明 | RAGによる解決 |
|---|---|---|
| ハルシネーション | LLMが事実と異なることを生成 | 検索した根拠文書を文脈に追加 |
| 知識の陳腐化 | 学習データのカットオフ日以降の情報がない | リアルタイムの外部DBを検索 |
| ドメイン知識不足 | 社内文書・専門知識をモデルが持たない | 専用知識ベースを構築 |
| コスト | 大規模なFTは高コスト | 検索のみでFT不要 |

---

## RAGパイプラインの全体像

```
[文書群]
   ↓ チャンキング
[テキストチャンク]
   ↓ 埋め込み
[ベクトルDB]
        ↑ 検索
[ユーザークエリ] → 埋め込み → 類似ベクトル検索 → [関連チャンク]
                                                       ↓
                                              [プロンプト構築]
                                                       ↓
                                              [LLM生成] → [回答]
```

---

## ドキュメントの取り込みとチャンキング

```python
from typing import List, Dict
import re

class DocumentChunker:
    """文書をチャンクに分割するクラス"""

    def __init__(
        self,
        chunk_size: int = 500,
        chunk_overlap: int = 50,
        separator: str = "\n\n",
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separator = separator

    def split_text(self, text: str) -> List[str]:
        """テキストをオーバーラップありでチャンク分割"""
        # まず段落で分割
        paragraphs = text.split(self.separator)
        
        chunks = []
        current_chunk = ""
        
        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            
            if len(current_chunk) + len(para) <= self.chunk_size:
                current_chunk += ("\n\n" if current_chunk else "") + para
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                    # オーバーラップ：前のチャンクの末尾を次に含める
                    overlap_text = current_chunk[-self.chunk_overlap:]
                    current_chunk = overlap_text + "\n\n" + para
                else:
                    # 1段落がchunk_sizeを超える場合は文で分割
                    sentences = re.split(r'[。！？.!?]', para)
                    for sent in sentences:
                        if len(current_chunk) + len(sent) <= self.chunk_size:
                            current_chunk += sent + "。"
                        else:
                            if current_chunk:
                                chunks.append(current_chunk)
                            current_chunk = sent + "。"
        
        if current_chunk:
            chunks.append(current_chunk)
        
        return chunks

    def split_documents(self, documents: List[Dict]) -> List[Dict]:
        """複数文書を分割してメタデータを保持"""
        all_chunks = []
        for doc in documents:
            chunks = self.split_text(doc["content"])
            for i, chunk in enumerate(chunks):
                all_chunks.append({
                    "content": chunk,
                    "metadata": {
                        **doc.get("metadata", {}),
                        "chunk_id": i,
                        "chunk_count": len(chunks),
                    }
                })
        return all_chunks

# 使用例
sample_docs = [
    {
        "content": """機械学習は人工知能の一分野です。
        
コンピュータが明示的にプログラムされることなく、データから学習する能力を与えます。
教師あり学習、教師なし学習、強化学習の3種類に大別されます。

教師あり学習では、ラベル付きデータを使ってモデルを訓練します。
分類や回帰タスクに使われます。

教師なし学習では、ラベルなしデータからパターンを発見します。
クラスタリングや次元削減に使われます。""",
        "metadata": {"source": "ml_intro.txt", "page": 1}
    },
]

chunker = DocumentChunker(chunk_size=200, chunk_overlap=30)
chunks = chunker.split_documents(sample_docs)

print(f"チャンク数: {len(chunks)}")
for i, chunk in enumerate(chunks):
    print(f"\nチャンク {i+1}:")
    print(f"  内容: {chunk['content'][:100]}...")
    print(f"  メタデータ: {chunk['metadata']}")
```

---

## 埋め込みモデルとベクトルDB

```python
import numpy as np
from typing import List, Tuple
from dataclasses import dataclass, field

@dataclass
class Document:
    content: str
    metadata: dict = field(default_factory=dict)
    embedding: np.ndarray = None

class SimpleVectorStore:
    """シンプルなインメモリベクトルDB（教育用）"""

    def __init__(self, embed_fn):
        self.documents: List[Document] = []
        self.embed_fn = embed_fn

    def add_documents(self, texts: List[str], metadatas: List[dict] = None):
        """文書をベクトル化して保存"""
        if metadatas is None:
            metadatas = [{} for _ in texts]

        embeddings = self.embed_fn(texts)

        for text, meta, emb in zip(texts, metadatas, embeddings):
            doc = Document(content=text, metadata=meta, embedding=emb)
            self.documents.append(doc)

        print(f"{len(texts)}件の文書を追加。合計: {len(self.documents)}件")

    def similarity_search(
        self,
        query: str,
        k: int = 4,
        threshold: float = 0.0,
    ) -> List[Tuple[Document, float]]:
        """コサイン類似度で上位k件を返す"""
        query_emb = self.embed_fn([query])[0]

        scores = []
        for doc in self.documents:
            score = self._cosine_similarity(query_emb, doc.embedding)
            if score >= threshold:
                scores.append((doc, score))

        # スコアで降順ソート
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:k]

    @staticmethod
    def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

# TF-IDFベースの簡易埋め込み（デモ用）
from sklearn.feature_extraction.text import TfidfVectorizer

class TFIDFEmbedder:
    """TF-IDFベースの簡易埋め込み（本番ではSentence-BERTを使用）"""

    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=1000)
        self.fitted = False

    def fit(self, texts: List[str]):
        self.vectorizer.fit(texts)
        self.fitted = True

    def __call__(self, texts: List[str]) -> np.ndarray:
        if not self.fitted:
            self.fit(texts)
        return self.vectorizer.transform(texts).toarray()

# 知識ベースの構築
knowledge_base = [
    "機械学習は、データからパターンを学習するAI技術です。教師あり・なし・強化学習があります。",
    "深層学習はニューラルネットワークを多層に積み重ねた機械学習の一手法です。",
    "BERTは2018年にGoogleが発表した双方向Transformerモデルです。NLPで高い性能を示します。",
    "GPT-4はOpenAIが開発した大規模言語モデルで、高度な推論とコード生成が可能です。",
    "RAGは検索と生成を組み合わせた手法で、ハルシネーションを軽減します。",
    "Pythonはデータサイエンスと機械学習で最も使われるプログラミング言語です。",
    "PyTorchはFacebookが開発した深層学習フレームワークで、動的計算グラフが特徴です。",
    "TensorFlowはGoogleが開発した機械学習フレームワークで、本番環境での展開に強みがあります。",
]

embedder = TFIDFEmbedder()
embedder.fit(knowledge_base)  # 事前にフィット

vector_store = SimpleVectorStore(embed_fn=embedder)
vector_store.add_documents(knowledge_base)

# 検索テスト
query = "Transformerを使った言語モデルを教えて"
results = vector_store.similarity_search(query, k=3)

print(f"\nクエリ: '{query}'")
print("\n検索結果（上位3件）:")
for doc, score in results:
    print(f"  スコア: {score:.4f}")
    print(f"  内容: {doc.content}")
    print()
```

---

## RAGパイプラインの実装

```python
from typing import List, Optional
import json

class RAGPipeline:
    """シンプルなRAGパイプライン"""

    def __init__(
        self,
        vector_store: SimpleVectorStore,
        llm_fn,  # LLMを呼び出す関数
        top_k: int = 3,
        similarity_threshold: float = 0.1,
    ):
        self.vector_store = vector_store
        self.llm_fn = llm_fn
        self.top_k = top_k
        self.similarity_threshold = similarity_threshold

    def retrieve(self, query: str) -> List[Tuple[Document, float]]:
        """関連文書を検索"""
        return self.vector_store.similarity_search(
            query,
            k=self.top_k,
            threshold=self.similarity_threshold,
        )

    def build_prompt(self, query: str, retrieved_docs: List[Tuple[Document, float]]) -> str:
        """検索結果を含むプロンプトを構築"""
        context_parts = []
        for i, (doc, score) in enumerate(retrieved_docs, 1):
            source = doc.metadata.get("source", f"文書{i}")
            context_parts.append(f"[{i}] (出典: {source}, 類似度: {score:.3f})\n{doc.content}")

        context = "\n\n".join(context_parts)

        prompt = f"""以下の参考情報を基に、質問に正確に答えてください。
参考情報に答えがない場合は「わかりません」と答えてください。

=== 参考情報 ===
{context}

=== 質問 ===
{query}

=== 回答 ==="""
        return prompt

    def generate(self, query: str) -> dict:
        """検索→プロンプト構築→生成のパイプライン"""
        # 1. 検索
        retrieved = self.retrieve(query)

        if not retrieved:
            return {
                "query": query,
                "answer": "関連する情報が見つかりませんでした。",
                "sources": [],
                "retrieved_docs": [],
            }

        # 2. プロンプト構築
        prompt = self.build_prompt(query, retrieved)

        # 3. LLMで生成（モックレスポンス）
        answer = self.llm_fn(prompt)

        return {
            "query": query,
            "answer": answer,
            "prompt": prompt,
            "sources": [doc.metadata.get("source", "unknown") for doc, _ in retrieved],
            "retrieved_docs": [(doc.content[:100], score) for doc, score in retrieved],
        }

# モックLLM関数
def mock_llm(prompt: str) -> str:
    """実際はOpenAI API等を呼び出す"""
    # プロンプトから参考情報を抽出して簡単な回答を生成
    if "BERT" in prompt or "Transformer" in prompt:
        return "BERTは2018年にGoogleが発表した双方向Transformerモデルです。GPT-4はOpenAIの大規模言語モデルです。どちらもTransformerアーキテクチャを基盤としています。"
    elif "Python" in prompt:
        return "PythonはデータサイエンスとAI分野で最も広く使われるプログラミング言語です。"
    return "提供された参考情報に基づいて回答します。詳細は参考情報をご覧ください。"

# パイプラインのテスト
rag = RAGPipeline(
    vector_store=vector_store,
    llm_fn=mock_llm,
    top_k=3,
)

test_queries = [
    "BERTとGPTの違いは何ですか？",
    "機械学習のフレームワークを教えてください",
    "量子コンピュータについて教えてください",  # 知識ベースにない質問
]

for query in test_queries:
    result = rag.generate(query)
    print(f"Q: {query}")
    print(f"A: {result['answer']}")
    print(f"検索した文書: {result['retrieved_docs'][:1]}")
    print()
```

---

## 実際のRAGシステム構築（LangChain + FAISS）

```python
# pip install langchain langchain-openai faiss-cpu

# 実際のRAGシステムの構築例（APIキーが必要）

RAG_SETUP_CODE = '''
from langchain_community.document_loaders import TextLoader, PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate

# 1. 文書の読み込み
loader = TextLoader("knowledge_base.txt", encoding="utf-8")
documents = loader.load()

# 2. チャンキング
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    separators=["\\n\\n", "\\n", "。", ".", " "],
)
chunks = text_splitter.split_documents(documents)
print(f"チャンク数: {len(chunks)}")

# 3. 埋め込みとベクトルDB構築
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vector_store = FAISS.from_documents(chunks, embeddings)

# 4. ベクトルDBの保存/ロード
vector_store.save_local("faiss_index")
# loaded_vs = FAISS.load_local("faiss_index", embeddings)

# 5. RAGチェーンの構築
retriever = vector_store.as_retriever(
    search_type="mmr",  # Maximum Marginal Relevance（多様性を確保）
    search_kwargs={"k": 4, "fetch_k": 10},
)

custom_prompt = PromptTemplate(
    template="""参考情報のみを使って質問に答えてください。
参考情報に答えがない場合は「わかりません」と答えてください。

参考情報:
{context}

質問: {question}

回答:""",
    input_variables=["context", "question"],
)

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",
    retriever=retriever,
    chain_type_kwargs={"prompt": custom_prompt},
    return_source_documents=True,
)

# 6. 質問応答
result = qa_chain.invoke({"query": "機械学習とは何ですか？"})
print("回答:", result["result"])
print("出典:", [doc.metadata for doc in result["source_documents"]])
'''

print("LangChain + FAISS を使ったRAGシステムの構築例:")
print(RAG_SETUP_CODE)
```

---

## RAGの改善テクニック

```python
# RAG改善のテクニック一覧
improvements = {
    "チャンキング戦略": {
        "説明": "文書の構造に合わせた分割",
        "手法": [
            "Recursive Character Splitting",
            "Semantic Chunking（意味的な区切りで分割）",
            "Document-aware Splitting（見出し・段落を考慮）",
        ]
    },
    "検索改善": {
        "説明": "より関連性の高い文書を取得",
        "手法": [
            "Hybrid Search（ベクトル + BM25のキーワード検索）",
            "MMR（Maximum Marginal Relevance）で多様性確保",
            "Re-ranking（Cross-encoderで精度向上）",
            "HyDE（仮説文書埋め込み）",
        ]
    },
    "クエリ変換": {
        "説明": "より良い検索クエリを生成",
        "手法": [
            "Query Expansion（クエリの拡張）",
            "Multi-query Retrieval（複数クエリで検索）",
            "Step-back Prompting（抽象化して検索）",
        ]
    },
    "後処理": {
        "説明": "検索後の改善",
        "手法": [
            "Context Compression（関連部分のみ抽出）",
            "Reranking（LLMで関連性を再評価）",
            "Citation（引用元の明示）",
        ]
    },
}

print("RAG改善テクニック:")
for category, info in improvements.items():
    print(f"\n【{category}】 - {info['説明']}")
    for technique in info["手法"]:
        print(f"  - {technique}")
```

---

## 使用場面

| ユースケース | 説明 |
|---|---|
| 企業内Q&Aシステム | 社内文書・マニュアルを知識ベース化 |
| カスタマーサポート | FAQ・製品ドキュメントからの回答 |
| 法務・コンプライアンス | 規制文書・判例の検索と回答 |
| 医療情報 | 医学文献・ガイドラインへのアクセス |
| コードアシスタント | コードベース・ドキュメントの検索 |

**RAG vs ファインチューニングの選択基準:**
- 知識が頻繁に更新される → RAG
- 特定のタスク形式に特化したい → ファインチューニング
- 低レイテンシが必要 → ファインチューニング（検索なし）
- 回答の根拠が必要 → RAG（出典を提示できる）

---

## 参考文献

- [Lewis et al., Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks (2020)](https://arxiv.org/abs/2005.11401)
- [LangChain Documentation](https://python.langchain.com/)
- [LlamaIndex Documentation](https://docs.llamaindex.ai/)
- [FAISS GitHub](https://github.com/facebookresearch/faiss)

<AffiliateBanner site="ml_intro" />
