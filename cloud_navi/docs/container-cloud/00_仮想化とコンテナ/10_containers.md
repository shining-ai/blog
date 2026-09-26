import AffiliateBanner from '@site/src/components/AffiliateBanner';

# コンテナの仕組み（名前空間・cgroups）

## コンテナとは

> コンテナとは、Linuxカーネルの名前空間（Namespace）とコントロールグループ（cgroups）を利用して、プロセスを隔離・制限する軽量な実行環境である。

仮想マシンがハードウェアを仮想化するのに対し、コンテナはOSカーネルを共有しながらプロセスレベルで隔離を行う。この違いにより、コンテナは仮想マシンに比べて起動が高速で、オーバーヘッドも小さい。

**名前空間（Namespace）**はLinuxカーネルが提供する機能で、プロセスから見えるシステムリソースのスコープを制限する。PID名前空間ではコンテナ内のプロセスは自分のPID空間しか見えず、Network名前空間ではコンテナごとに独立したネットワークスタックを持つ。Mount名前空間はファイルシステムの隔離を、UTS名前空間はホスト名の隔離を担う。

**cgroups（Control Groups）**はCPU・メモリ・ディスクI/O・ネットワーク帯域幅などのリソースをプロセスグループ単位で制限・計測する仕組みだ。これによってコンテナがホストのリソースを使い尽くさないよう保護できる。

コンテナランタイムはこれらの仕組みを組み合わせてコンテナを管理する。低レベルランタイムの**runc**は実際にコンテナを起動するOCI準拠の実装であり、**containerd**や**CRI-O**はruncの上位に位置する高レベルランタイムだ。

## 仮想マシンとコンテナの比較

| 項目 | 仮想マシン | コンテナ |
|------|-----------|---------|
| 起動時間 | 数十秒〜数分 | 数秒以内 |
| サイズ | GBオーダー | MBオーダー |
| カーネル | ゲストOSに含む | ホストカーネルを共有 |
| 隔離レベル | 高い | 中程度 |
| オーバーヘッド | 比較的大きい | 小さい |

```bash
# 名前空間の確認
ls -la /proc/1/ns/

# 現在のプロセスが属する cgroup を確認
cat /proc/self/cgroup

# unshare コマンドで新しい名前空間を作成して bash を起動
sudo unshare --pid --fork --mount-proc bash

# cgroup v2 でメモリ上限を設定する例
mkdir /sys/fs/cgroup/myapp
echo "104857600" > /sys/fs/cgroup/myapp/memory.max   # 100MB
echo $$ > /sys/fs/cgroup/myapp/cgroup.procs

# nsenter で既存コンテナの名前空間に入る
sudo nsenter --target <PID> --mount --uts --ipc --net --pid
```

## 使用場面

- マイクロサービスアーキテクチャにおける各サービスの独立したデプロイ
- CI/CDパイプラインでの一貫したビルド・テスト環境の確保
- 複数バージョンの実行環境を同一ホストで共存させる場合
- リソース使用量を厳密に制御したいマルチテナント環境

## 参考文献

- [Linux man-pages — namespaces(7)](https://man7.org/linux/man-pages/man7/namespaces.7.html)
- [Linux man-pages — cgroups(7)](https://man7.org/linux/man-pages/man7/cgroups.7.html)
- [OCI Runtime Specification](https://github.com/opencontainers/runtime-spec)

<AffiliateBanner site="cloud_navi" />
