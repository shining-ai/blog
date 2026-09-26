import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Raft によるコンセンサス

## Raft とは

> Raft は、Diego OngaroとJohn Ousterhoutが2014年に発表した分散コンセンサスアルゴリズムであり、「理解しやすさ」を設計目標に掲げてPaxosの複雑さを克服し、etcd・CockroachDB・TiKVなど多くの実用的な分散システムの基盤となっている。

Paxosは正確だが理解が難しい。Raftはその反省から生まれ、論文タイトルも「In Search of an Understandable Consensus Algorithm（理解できるコンセンサスアルゴリズムを求めて）」だ。

**リーダー選出**がRaftの核心だ。クラスタ内のノードは常に次の3状態のいずれかにある。**Leader（リーダー）**: すべての書き込みリクエストを受け取り、Followerに複製する。**Follower（フォロワー）**: リーダーからのログエントリを受け取り適用する。**Candidate（候補者）**: リーダー選出中の状態。

リーダーはFollowerへ定期的にハートビートを送る。ハートビートが途絶えると、Followerはタイムアウト後にCandidateになり、自分への投票をリクエストする。過半数の票を得るとリーダーになる。この仕組みは **Term（任期）** という単調増加する番号で管理される。

**ログ複製**では、クライアントのリクエストをリーダーがログに追記し、過半数のFollowerに複製されたことを確認してからコミットする。Followerは定期的にリーダーのログと同期する。

RaftとPaxosの最大の違いは「強リーダー」モデルだ。Raftではリーダーが全ての決定権を持つため、実装がシンプルになる。一方でリーダーへの負荷集中とリーダー故障時のダウンタイム（通常数百ミリ秒）という特性がある。

## Raft のコアメカニズム

| コンポーネント | 説明 | 詳細 |
|--------------|------|------|
| リーダー選出 | タイムアウトで候補者が投票要求 | 過半数の票で当選、Termで正当性管理 |
| ログ複製 | リーダーが全ノードにログを伝播 | 過半数コミットで安全性保証 |
| 安全性保証 | 各TermでリーダーはGreatest Committed Log以降のみを持つ | 古いリーダーの失効を防止 |
| メンバー変更 | JointConsensus でノード追加・削除 | 2つの設定が同時に有効な移行期間を設ける |

```yaml
# etcd の Raft クラスタ設定例 (docker-compose)

version: '3.8'

services:
  etcd1:
    image: quay.io/coreos/etcd:v3.5.0
    command:
      - etcd
      - --name=etcd1
      - --initial-advertise-peer-urls=http://etcd1:2380
      - --listen-peer-urls=http://0.0.0.0:2380
      - --listen-client-urls=http://0.0.0.0:2379
      - --advertise-client-urls=http://etcd1:2379
      # クラスタメンバー全員を列挙
      - --initial-cluster=etcd1=http://etcd1:2380,etcd2=http://etcd2:2380,etcd3=http://etcd3:2380
      - --initial-cluster-state=new
      # ハートビート間隔 (ms): フォロワーへの生存確認頻度
      - --heartbeat-interval=100
      # 選出タイムアウト (ms): この時間内にハートビートがなければ選出開始
      # heartbeat-interval の 10 倍が推奨値
      - --election-timeout=1000
    ports:
      - "2379:2379"

  etcd2:
    image: quay.io/coreos/etcd:v3.5.0
    command:
      - etcd
      - --name=etcd2
      - --initial-advertise-peer-urls=http://etcd2:2380
      - --listen-peer-urls=http://0.0.0.0:2380
      - --listen-client-urls=http://0.0.0.0:2379
      - --advertise-client-urls=http://etcd2:2379
      - --initial-cluster=etcd1=http://etcd1:2380,etcd2=http://etcd2:2380,etcd3=http://etcd3:2380
      - --initial-cluster-state=new
      - --heartbeat-interval=100
      - --election-timeout=1000

  etcd3:
    image: quay.io/coreos/etcd:v3.5.0
    command:
      - etcd
      - --name=etcd3
      - --initial-advertise-peer-urls=http://etcd3:2380
      - --listen-peer-urls=http://0.0.0.0:2380
      - --listen-client-urls=http://0.0.0.0:2379
      - --advertise-client-urls=http://etcd3:2379
      - --initial-cluster=etcd1=http://etcd1:2380,etcd2=http://etcd2:2380,etcd3=http://etcd3:2380
      - --initial-cluster-state=new
      - --heartbeat-interval=100
      - --election-timeout=1000
```

```python
# etcd Python クライアントでのリーダー確認とキーバリュー操作
import etcd3

# クラスタに接続（いずれかのノードに接続すればよい）
client = etcd3.client(host='localhost', port=2379)

# キーと値を書き込む（リーダーが処理して過半数に複製）
client.put('/service/leader', 'node-1')

# 読み取り（デフォルトはリーダーから読むため線形化可能性が保証される）
value, metadata = client.get('/service/leader')
print(f"リーダー: {value.decode()}")

# ウォッチ: 値の変更をリアルタイムで監視
events_iterator, cancel = client.watch('/service/leader')
for event in events_iterator:
    print(f"変更検知: {event}")
    cancel()
    break

# リース（TTL付きキー）: リーダーハートビートに利用
lease = client.lease(ttl=5)  # 5秒のTTL
client.put('/locks/leader', 'node-1', lease=lease)
# TTL更新
lease.refresh()
```

## 使用場面

- KubernetesクラスタのetcdノードをRaftクラスタとして設定・運用する場合
- CockroachDBやTiDBなど分散SQLデータベースのコンセンサス層を理解してチューニングする場合
- Consulを使ったサービスディスカバリでリーダー選出の挙動を把握する場合
- 自社の分散システムで分散ロックやリーダー選出を実装する際にetcdをバックエンドとして使う場合

## 参考文献

- [Ongaro, D., & Ousterhout, J. (2014). In Search of an Understandable Consensus Algorithm. USENIX ATC.](https://raft.github.io/raft.pdf)
- [The Raft Consensus Algorithm — raft.github.io](https://raft.github.io/)
- [etcd ドキュメント](https://etcd.io/docs/)

<AffiliateBanner site="cloud_navi" />
