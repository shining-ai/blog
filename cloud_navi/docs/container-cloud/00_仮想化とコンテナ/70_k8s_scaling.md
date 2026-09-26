import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Kubernetes のスケーリングと自己修復

## スケーリングと自己修復とは

> Kubernetes のスケーリングとは、負荷に応じてPodやノードの数を自動的に増減させる機能であり、自己修復とはPodやノードの障害を検知して自動的に復旧させる仕組みである。

Kubernetesが他のコンテナ管理手法に対して優れている点の一つが、スケーリングと自己修復の自動化だ。

**HPA（Horizontal Pod Autoscaler）**はPodの水平スケーリングを担う。CPU使用率・メモリ使用率・カスタムメトリクス（HTTPリクエスト数など）に基づいてレプリカ数を自動調整する。たとえばCPU使用率が70%を超えるとレプリカを追加し、負荷が下がれば削減する。

**VPA（Vertical Pod Autoscaler）**はPodのリソースリクエスト・リミットを自動調整する。アプリケーションの実際のリソース消費パターンを学習し、適切な値を設定し直す。

**Cluster Autoscaler**はノードレベルのスケーリングを担い、Podがスケジューリングできないほどリソースが不足したらノードを追加し、余剰リソースが続けばノードを削除する。

**自己修復**はKubernetesのコアな価値の一つだ。kubeletはPodの`livenessProbe`を定期的にチェックし、失敗したPodを自動的に再起動する。`readinessProbe`に失敗したPodはServiceのエンドポイントから外され、トラフィックを受け取らない。ノード自体が落ちた場合は、そのノード上のPodを別のノードに再スケジュールする。

## スケーリング関連のリソース

| リソース | スケール対象 | トリガー |
|---------|------------|---------|
| HPA | Podのレプリカ数 | CPU・メモリ・カスタムメトリクス |
| VPA | PodのCPU/メモリ割り当て | 実際のリソース使用量 |
| Cluster Autoscaler | ノード数 | Pending Podの有無 |
| KEDA | Pod（イベント駆動） | Kafka・SQS・HTTP など |

```yaml
# HPA の設定例（CPU・カスタムメトリクス）
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 4
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 2
          periodSeconds: 60
```

```bash
# 手動スケーリング
kubectl scale deployment myapp --replicas=5 -n production

# HPA の状態確認
kubectl get hpa -n production
kubectl describe hpa myapp-hpa -n production

# Pod の再起動（自己修復の確認）
kubectl rollout restart deployment/myapp -n production

# ノードの状態確認
kubectl get nodes
kubectl describe node <node-name>

# Pending Pod の原因確認
kubectl describe pod <pod-name> -n production
```

## 使用場面

- トラフィックの波がある Webサービスでコスト最適化しながら可用性を維持する場合
- バッチ処理やキュー消費のワークロードをイベント数に応じてスケールする場合
- ノード障害が起きても自動的にワークロードを別ノードへ移動させる場合
- カナリアリリースで問題が起きたときに自動ロールバックを実現する場合

## 参考文献

- [Kubernetes — HPA 公式ドキュメント](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Kubernetes — VPA](https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler)
- [Cluster Autoscaler](https://github.com/kubernetes/autoscaler/tree/master/cluster-autoscaler)

<AffiliateBanner site="cloud_navi" />
