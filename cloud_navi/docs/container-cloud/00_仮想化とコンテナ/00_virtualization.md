import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 仮想化の仕組み（ハイパーバイザー・KVM）

## 仮想化とは

> 仮想化とは、1台の物理マシン上で複数の独立した仮想マシン（VM）を動作させる技術であり、ハードウェアリソースを論理的に分割・抽象化することで実現する。

仮想化技術はデータセンターの効率化を大幅に向上させた。従来は1台のサーバに1つのOSと1つのアプリケーションを動かすのが一般的だったが、仮想化によって1台の物理サーバ上で複数の仮想マシンを稼働できるようになり、リソース利用率が劇的に改善された。

仮想化を実現するソフトウェアを**ハイパーバイザー**と呼ぶ。ハイパーバイザーはCPU・メモリ・ストレージ・ネットワークを仮想マシンに対して提供し、それぞれのVMが互いに干渉しないよう隔離する。

ハイパーバイザーには大きく2種類ある。**タイプ1（ベアメタル型）**はハードウェア上に直接インストールされ、VMwareのESXi・Microsoft Hyper-V・XenなどがこれにあたるKVMもLinuxカーネルに統合されたタイプ1ハイパーバイザーとして分類される。**タイプ2（ホスト型）**はホストOS上で動作するもので、VirtualBoxやVMware Workstationが代表例だ。

**KVM（Kernel-based Virtual Machine）**はLinuxカーネルに組み込まれた仮想化モジュールで、IntelのVT-xやAMDのAMD-Vといったハードウェア仮想化支援機能を活用する。QEMUと組み合わせることで完全仮想化を実現しており、クラウドプロバイダーの多くがKVMをベースにしている。

## ハイパーバイザーの種類比較

| 種別 | タイプ1（ベアメタル） | タイプ2（ホスト型） |
|------|----------------------|-------------------|
| 動作場所 | 物理ハードウェア上 | ホストOS上 |
| パフォーマンス | 高い | タイプ1より低い |
| 代表製品 | KVM・ESXi・Hyper-V | VirtualBox・VMware Workstation |
| 用途 | 本番サーバ・クラウド | 開発・検証 |

```bash
# KVM が利用可能か確認する
egrep -c '(vmx|svm)' /proc/cpuinfo

# KVM 関連パッケージのインストール（Ubuntu）
sudo apt install -y qemu-kvm libvirt-daemon-system libvirt-clients bridge-utils

# 仮想マシンの作成例（virt-install）
sudo virt-install \
  --name myvm \
  --ram 2048 \
  --vcpus 2 \
  --disk path=/var/lib/libvirt/images/myvm.qcow2,size=20 \
  --os-variant ubuntu22.04 \
  --network bridge=virbr0 \
  --cdrom /path/to/ubuntu-22.04.iso

# 仮想マシン一覧の確認
virsh list --all

# 仮想マシンの起動・停止
virsh start myvm
virsh shutdown myvm
```

## 使用場面

- クラウドプロバイダー（AWS EC2・GCE・Azure VM）のインフラ基盤として
- オンプレミスのサーバ統合によるハードウェアコスト削減
- 開発・テスト環境の素早いプロビジョニング
- レガシーアプリケーションを仮想マシン上で継続稼働させる場合

## 参考文献

- [Linux KVM 公式ドキュメント](https://www.linux-kvm.org/page/Main_Page)
- [Red Hat — 仮想化の概要](https://www.redhat.com/ja/topics/virtualization)
- [VMware — ハイパーバイザーとは](https://www.vmware.com/jp/topics/glossary/content/hypervisor.html)

<AffiliateBanner site="cloud_navi" />
