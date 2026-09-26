import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Kubernetes アーキテクチャ概要

## Kubernetes とは

> Kubernetes（K8s）とは、コンテナ化されたアプリケーションのデプロイ・スケーリング・管理を自動化するオープンソースのコンテナオーケストレーションシステムである。

Dockerでコンテナを動かせるようになっても、本番環境では数十〜数百のコンテナを安定して運用しなければならない。コンテナのスケジューリング・障害時の自動再起動・ローリングアップデート・サービスディスカバリなどを手動で管理するのは現実的ではない。Kubernetesはこれらを自動化するプラットフォームだ。

Kubernetesは**コントロールプレーン**と**ワーカーノード**から構成される。

**コントロールプレーン**はクラスタ全体を管理する頭脳的な役割を担う。
- `kube-apiserver`: すべての操作のエントリーポイント。RESTful APIを提供する
- `etcd`: クラスタの全状態を保存する分散KVストア
- `kube-scheduler`: どのノードにPodを配置するかを決定する
- `kube-controller-manager`: 期待状態と実際の状態を一致させるコントローラー群

**ワーカーノード**は実際にコンテナを動作させるサーバだ。
- `kubelet`: ノード上でPodの状態を管理するエージェント
- `kube-proxy`: ネットワーキングルールを管理してServiceを実現する
- **コンテナランタイム**: containerd・CRI-Oなど実際にコンテナを起動する

## Kubernetes の主要コンポーネント

| コンポーネント | 種別 | 役割 |
|--------------|------|------|
| kube-apiserver | コントロールプレーン | APIエンドポイント |
| etcd | コントロールプレーン | クラスタ状態の保存 |
| kube-scheduler | コントロールプレーン | Podのスケジューリング |
| kube-controller-manager | コントロールプレーン | 状態の維持 |
| kubelet | ワーカーノード | Podの管理エージェント |
| kube-proxy | ワーカーノード | ネットワークルール管理 |

```bash
# kubectl のバージョン確認
kubectl version --client

# クラスタ情報の確認
kubectl cluster-info

# ノード一覧の確認
kubectl get nodes -o wide

# コントロールプレーンのコンポーネント確認
kubectl get pods -n kube-system

# クラスタのリソース使用状況
kubectl top nodes
kubectl top pods -A

# コンテキストの一覧と切り替え
kubectl config get-contexts
kubectl config use-context my-cluster

# ネームスペース一覧
kubectl get namespaces

# イベントの確認（トラブルシューティング）
kubectl get events --sort-by='.lastTimestamp' -A
```

## 使用場面

- 大規模なマイクロサービスアプリケーションのオーケストレーション
- 自動スケーリング・自己修復が求められる本番環境
- マルチクラウド・ハイブリッドクラウドでの統一された実行基盤
- CI/CDパイプラインと連携した継続的デプロイの実現

## 参考文献

- [Kubernetes 公式ドキュメント — アーキテクチャ](https://kubernetes.io/docs/concepts/architecture/)
- [Kubernetes コンポーネント](https://kubernetes.io/docs/concepts/overview/components/)
- [CNCF — Kubernetes 入門](https://www.cncf.io/blog/2019/08/19/how-kubernetes-works/)

<AffiliateBanner site="cloud_navi" />
