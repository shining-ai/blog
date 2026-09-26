---
title: OSI 参照モデルの 7 層
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# OSI 参照モデルの 7 層

## OSI 参照モデルとは

> 異なるベンダの機器やソフトウェアが相互通信できるよう、通信機能を 7 つの階層に分けて標準化したモデル

OSI（Open Systems Interconnection）参照モデルは ISO が策定した概念モデルで、通信に必要な機能を 7 層に分割します。各層は隣接する層とのみやり取りし、上位層は下位層の実装を意識しなくて済みます。現在の実装は TCP/IP モデルが主流ですが、OSI モデルはプロトコルや障害を「何層の問題か」と分析する際に広く使われます。

## 7 層の一覧

| 層番号 | 層名 | 代表的なプロトコル・技術 | PDU 名 |
|--------|------|--------------------------|--------|
| 7 | アプリケーション層 | HTTP, FTP, SMTP, DNS | データ |
| 6 | プレゼンテーション層 | TLS/SSL, MIME, JPEG | データ |
| 5 | セッション層 | NetBIOS, RPC, SIP | データ |
| 4 | トランスポート層 | TCP, UDP | セグメント |
| 3 | ネットワーク層 | IP, ICMP, OSPF | パケット |
| 2 | データリンク層 | Ethernet, Wi-Fi, PPP | フレーム |
| 1 | 物理層 | RS-232, 光ファイバ, UTP | ビット |

## カプセル化のイメージ

```
送信側（上から下へカプセル化）
┌─────────────────────┐
│  アプリケーションデータ  │  ← 層7
├──────┬──────────────┤
│TCP HDR│  アプリデータ   │  ← 層4 セグメント
├───┬──┴──────────────┤
│IP │ TCP HDR │ データ  │  ← 層3 パケット
├─┬─┴───────────────┬─┤
│Eth│ IP │ TCP │ Data │FCS│  ← 層2 フレーム
└─┴──────────────────┴─┘
         ↓ ビット列として送信（層1）
```

```python
# scapy を使ってパケットの各層を確認する例（概念デモ）
# pip install scapy が必要

from scapy.all import IP, TCP, Raw, Ether

# 各層を積み重ねてパケットを構築
packet = (
    Ether()                          # 層2: データリンク層
    / IP(dst="93.184.216.34")        # 層3: ネットワーク層
    / TCP(dport=80, flags="S")       # 層4: トランスポート層
    / Raw(b"GET / HTTP/1.1\r\n")     # 層7: アプリケーション層
)

print("=== 各層の情報 ===")
packet.show()

# 各層へのアクセス
print(f"送信先 IP: {packet[IP].dst}")
print(f"宛先ポート: {packet[TCP].dport}")
print(f"フレームサイズ: {len(packet)} bytes")
```

## 使用場面

- ネットワーク障害の切り分け（「Layer3 の問題か Layer2 か」）
- セキュリティ機器の仕様理解（L4 ファイアウォール vs L7 WAF）
- 新しいプロトコルを学ぶときの位置づけ確認

## 参考文献

- [ISO/IEC 7498-1 – OSI Basic Reference Model](https://www.iso.org/standard/20269.html)
- [RFC 1122 – Requirements for Internet Hosts](https://www.rfc-editor.org/rfc/rfc1122)
- Andrew S. Tanenbaum, "Computer Networks", 5th Edition, Chapter 1

<AffiliateBanner site="network_navi" />
