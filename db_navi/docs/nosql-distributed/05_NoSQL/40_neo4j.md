import AffiliateBanner from '@site/src/components/AffiliateBanner';

# グラフDB（Neo4j）

## Neo4j とは

> Neo4j とはノード・リレーションシップ・プロパティで構成されるプロパティグラフモデルを採用したグラフデータベースであり、クエリ言語 Cypher によって複雑な多段グラフ探索を直感的かつ高速に実行できる。

リレーショナルデータベースでは多対多の関係や多段 JOIN はパフォーマンスが低下しやすく、SQL が複雑になります。グラフデータベースはエンティティ（ノード）と関係（リレーションシップ）を第一級の概念として格納することで、グラフ探索を O(log n) 以下の効率で実行できます。

Neo4j のデータモデルは 3 要素で構成されます。ノード（Node）はエンティティを表し、ラベル（User・Product 等）と任意のプロパティを持ちます。リレーションシップ（Relationship）は有向で型（FOLLOWS・PURCHASED 等）とプロパティを持ちます。プロパティ（Property）はキーと値のペアで、文字列・数値・リスト型が使えます。

Cypher はグラフパターンをビジュアルに表現するクエリ言語です。`(alice)-[:FOLLOWS]->(bob)` のような矢印記法でパターンを記述します。MATCH・WHERE・RETURN・CREATE・MERGE など SQL に似た構文で、グラフアルゴリズム（最短経路・中心性）も組み込まれています。

主な用途は、ソーシャルネットワーク分析（友人推薦）、不正検知（異常なトランザクションパターン）、知識グラフ・レコメンデーションエンジン、ID グラフ・依存関係分析です。

## RDB とグラフ DB の比較

| 観点 | RDB（多段 JOIN） | グラフ DB（Neo4j） |
|------|---------------|-------------------|
| 多段関係の探索 | JOIN が指数的に増加 | リレーション走査で効率的 |
| スキーマ | 正規化・外部キー | 柔軟（ノード/エッジにプロパティ） |
| 最短経路 | 再帰 CTE（複雑） | 組み込み関数（dijkstra等） |
| クエリ言語 | SQL | Cypher |
| 用途 | 汎用 OLTP | グラフ構造のデータ |

```python
from dataclasses import dataclass, field
from collections import defaultdict, deque
from typing import Optional

# ===========================
# Neo4j のプロパティグラフモデルを Python で実装
# ===========================

@dataclass
class Node:
    id: int
    labels: list[str]
    properties: dict = field(default_factory=dict)

    def __repr__(self):
        label_str = ":".join(self.labels)
        prop_str = ", ".join(f"{k}: {v!r}" for k, v in self.properties.items())
        return f"(:{label_str} {{{prop_str}}})"


@dataclass
class Relationship:
    id: int
    type_: str
    start_node: int
    end_node: int
    properties: dict = field(default_factory=dict)

    def __repr__(self):
        prop_str = ", ".join(f"{k}: {v!r}" for k, v in self.properties.items())
        return f"-[:{self.type_} {{{prop_str}}}]->"


class GraphDB:
    """Neo4j ライクなグラフデータベースのシミュレーション"""

    def __init__(self):
        self._nodes: dict[int, Node] = {}
        self._relationships: dict[int, Relationship] = {}
        self._node_counter = 0
        self._rel_counter = 0
        # アジャセンシーリスト（ノードIDごとのリレーション）
        self._outgoing: dict[int, list[int]] = defaultdict(list)
        self._incoming: dict[int, list[int]] = defaultdict(list)

    def create_node(self, labels: list[str], properties: dict) -> Node:
        node_id = self._node_counter
        self._node_counter += 1
        node = Node(id=node_id, labels=labels, properties=properties)
        self._nodes[node_id] = node
        return node

    def create_relationship(
        self,
        start: Node,
        type_: str,
        end: Node,
        properties: dict = {},
    ) -> Relationship:
        rel_id = self._rel_counter
        self._rel_counter += 1
        rel = Relationship(rel_id, type_, start.id, end.id, properties)
        self._relationships[rel_id] = rel
        self._outgoing[start.id].append(rel_id)
        self._incoming[end.id].append(rel_id)
        return rel

    def match_nodes(self, label: str, **props) -> list[Node]:
        """ラベルとプロパティでノードをマッチ"""
        result = []
        for node in self._nodes.values():
            if label in node.labels:
                if all(node.properties.get(k) == v for k, v in props.items()):
                    result.append(node)
        return result

    def match_pattern(
        self,
        start_label: str,
        rel_type: str,
        end_label: str,
        **start_props,
    ) -> list[tuple[Node, Relationship, Node]]:
        """(start)-[:rel_type]->(end) パターンをマッチ"""
        results = []
        for start_node in self.match_nodes(start_label, **start_props):
            for rel_id in self._outgoing[start_node.id]:
                rel = self._relationships[rel_id]
                if rel.type_ == rel_type:
                    end_node = self._nodes[rel.end_node]
                    if end_label in end_node.labels:
                        results.append((start_node, rel, end_node))
        return results

    def shortest_path(self, start_id: int, end_id: int, rel_type: str = "") -> list[int] | None:
        """BFS による最短経路"""
        if start_id == end_id:
            return [start_id]
        visited = {start_id}
        queue = deque([[start_id]])

        while queue:
            path = queue.popleft()
            current = path[-1]
            for rel_id in self._outgoing[current]:
                rel = self._relationships[rel_id]
                if rel_type and rel.type_ != rel_type:
                    continue
                neighbor = rel.end_node
                if neighbor == end_id:
                    return path + [neighbor]
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(path + [neighbor])
        return None  # 経路なし

    def friends_of_friends(self, user_id: int, depth: int = 2) -> set[int]:
        """N ホップ以内のノードを BFS で取得"""
        visited = {user_id}
        frontier = {user_id}
        for _ in range(depth):
            next_frontier = set()
            for node_id in frontier:
                for rel_id in self._outgoing[node_id]:
                    rel = self._relationships[rel_id]
                    if rel.type_ == "FOLLOWS" and rel.end_node not in visited:
                        next_frontier.add(rel.end_node)
                        visited.add(rel.end_node)
            frontier = next_frontier
        visited.discard(user_id)
        return visited


print("=== Neo4j グラフ DB デモ ===\n")

db = GraphDB()

# ソーシャルネットワークデータ作成
alice  = db.create_node(["User"], {"name": "Alice",  "age": 30, "city": "Tokyo"})
bob    = db.create_node(["User"], {"name": "Bob",    "age": 25, "city": "Osaka"})
carol  = db.create_node(["User"], {"name": "Carol",  "age": 28, "city": "Tokyo"})
dave   = db.create_node(["User"], {"name": "Dave",   "age": 35, "city": "Kyoto"})
python = db.create_node(["Topic"], {"name": "Python", "category": "Programming"})
ml     = db.create_node(["Topic"], {"name": "ML",     "category": "AI"})

# リレーションシップ作成
db.create_relationship(alice, "FOLLOWS",   bob,    {"since": "2024-01"})
db.create_relationship(alice, "FOLLOWS",   carol,  {"since": "2023-06"})
db.create_relationship(bob,   "FOLLOWS",   dave,   {"since": "2024-03"})
db.create_relationship(carol, "FOLLOWS",   dave,   {"since": "2024-02"})
db.create_relationship(alice, "INTERESTED_IN", python)
db.create_relationship(bob,   "INTERESTED_IN", python)
db.create_relationship(carol, "INTERESTED_IN", ml)
db.create_relationship(dave,  "INTERESTED_IN", ml)

# MATCH クエリ: Alice がフォローしているユーザ
print("[MATCH (alice:User {name:'Alice'})-[:FOLLOWS]->(following:User)]")
for start, rel, end in db.match_pattern("User", "FOLLOWS", "User", name="Alice"):
    print(f"  Alice → {end.properties['name']} (since {rel.properties.get('since', '?')})")

# 友人の友人（推薦）
print("\n[Alice の 2 ホップ以内のユーザ（推薦候補）]")
fof = db.friends_of_friends(alice.id, depth=2)
for uid in fof:
    node = db._nodes[uid]
    print(f"  推薦: {node.properties['name']}")

# 最短経路
print("\n[Alice から Dave への最短経路]")
path_ids = db.shortest_path(alice.id, dave.id, "FOLLOWS")
if path_ids:
    path_names = [db._nodes[nid].properties["name"] for nid in path_ids]
    print(f"  {' → '.join(path_names)} ({len(path_ids)-1} ホップ)")

print("\n[Cypher クエリの例]")
cypher_examples = [
    ("友人推薦",
     "MATCH (a:User {name:'Alice'})-[:FOLLOWS]->(friend)-[:FOLLOWS]->(fof)\n"
     "WHERE NOT (a)-[:FOLLOWS]->(fof) AND a <> fof\n"
     "RETURN DISTINCT fof.name AS recommended"),
    ("最短経路",
     "MATCH p = shortestPath((a:User {name:'Alice'})-[:FOLLOWS*]->(d:User {name:'Dave'}))\n"
     "RETURN [node IN nodes(p) | node.name] AS path"),
    ("共通の興味",
     "MATCH (a:User {name:'Alice'})-[:INTERESTED_IN]->(t:Topic)<-[:INTERESTED_IN]-(other:User)\n"
     "RETURN other.name, collect(t.name) AS shared_interests"),
]
for title, cypher in cypher_examples:
    print(f"  [{title}]")
    for line in cypher.split("\n"):
        print(f"    {line}")
    print()
```

## 使用場面

- ソーシャルグラフ分析（共通の友人・フォロワー推薦・影響力分析）を多段 JOIN なしで高速に実行する場面
- 不正検知において取引関係の異常なパターン（循環取引・マネーロンダリング）をグラフで探索する場面
- 知識グラフ・エンタープライズサーチで複雑な関係性を持つデータを構造化してクエリする場面

## 参考文献

- [Neo4j Documentation](https://neo4j.com/docs/)
- Robinson, I., Webber, J., and Eifrem, E. "Graph Databases" (O'Reilly Media)
- [Cypher Query Language Reference](https://neo4j.com/docs/cypher-manual/current/)

<AffiliateBanner site="db_navi" />
