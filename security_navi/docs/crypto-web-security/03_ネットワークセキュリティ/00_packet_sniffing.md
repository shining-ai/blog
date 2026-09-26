import AffiliateBanner from '@site/src/components/AffiliateBanner';

# パケットスニッフィングと ARP スプーフィング（防御方法中心）

## パケットスニッフィングとは

> パケットスニッフィングとは、ネットワーク上を流れるパケットを盗聴・キャプチャする行為であり、暗号化されていない通信では認証情報や機密データが平文で漏洩するリスクがある。

ネットワーク上のデータはパケット単位で送受信される。NIC（ネットワークインターフェースカード）をプロミスキャスモードに設定すると、自分宛て以外のパケットも受信できるようになり、同一ネットワークセグメント内のトラフィックを傍受できてしまう。

パケットスニッフィング自体は Wireshark などのツールを使った正当なネットワーク診断でも利用されるが、悪意ある第三者が実施した場合、HTTP の平文ログイン情報・FTP のパスワード・SMTP のメール本文などが丸ごと取得される。

**ARP スプーフィング（ARP ポイズニング）** は、スニッフィングを中間者攻撃（MITM）に発展させる手法である。ARP（Address Resolution Protocol）は IP アドレスと MAC アドレスを対応付けるプロトコルで、認証機能を持たない。攻撃者は偽の ARP 応答を送りつけてターゲットの ARP キャッシュを汚染し、通信を自分経由に迂回させることでパケットを傍受・改ざんできる。

**影響：**
- 平文プロトコル（HTTP・FTP・Telnet・SMTP）での認証情報窃取
- セッションハイジャック（Cookie の盗用）
- 通信内容の改ざん（コード挿入など）
- ネットワーク上の機密文書・データの流出

## スニッフィング・ARP スプーフィングの比較

| 項目 | パケットスニッフィング | ARP スプーフィング |
|------|----------------------|--------------------|
| 対象 | 同一セグメントの全パケット | 特定ホスト間の通信 |
| 必要条件 | プロミスキャスモード / ハブ環境 | 同一 L2 ネットワーク |
| 影響範囲 | パッシブ（盗聴のみ） | アクティブ（改ざんも可能） |
| 検出難易度 | 難しい（パッシブのため） | ARP テーブル監視で検出可能 |
| 主な防御策 | TLS 暗号化・スイッチ使用 | Dynamic ARP Inspection・静的 ARP |

```python
# 防御策の実装例：ARP テーブルの異常検出スクリプト（監視目的）
import subprocess
import re
from collections import defaultdict

def get_arp_table() -> dict[str, list[str]]:
    """
    現在の ARP テーブルを取得し、{IP: [MACアドレス, ...]} の形式で返す。
    同一 IP に複数 MAC が対応している場合はスプーフィングの疑いがある。
    """
    result = subprocess.run(["arp", "-n"], capture_output=True, text=True)
    ip_to_macs: dict[str, list[str]] = defaultdict(list)

    for line in result.stdout.splitlines():
        # 例: 192.168.1.1   ether  aa:bb:cc:dd:ee:ff  C  eth0
        match = re.match(
            r"(\d+\.\d+\.\d+\.\d+)\s+\w+\s+([0-9a-f:]{17})", line
        )
        if match:
            ip, mac = match.group(1), match.group(2)
            ip_to_macs[ip].append(mac)

    return dict(ip_to_macs)


def detect_arp_spoofing(arp_table: dict[str, list[str]]) -> list[str]:
    """
    同一 IP アドレスに対して複数の MAC アドレスが存在する場合を検出する。
    これは ARP スプーフィングの典型的な兆候。
    """
    suspicious: list[str] = []
    for ip, macs in arp_table.items():
        unique_macs = list(set(macs))
        if len(unique_macs) > 1:
            suspicious.append(
                f"[警告] IP {ip} に複数の MAC アドレスが対応: {unique_macs}"
            )
    return suspicious


# === 防御設定の例（コメント形式）===
defense_measures = """
【スイッチでの ARP 対策】
# Cisco IOS: Dynamic ARP Inspection (DAI) の有効化
  ip arp inspection vlan 10
  interface GigabitEthernet0/1
    ip arp inspection trust   # 信頼できるポート（アップリンク）のみ trust

【ホストでの静的 ARP エントリ設定（Linux）】
  sudo arp -s 192.168.1.1 aa:bb:cc:dd:ee:ff

【暗号化による根本的防御】
  - HTTP → HTTPS（TLS 1.2 以上）に移行
  - FTP → SFTP / FTPS に移行
  - Telnet → SSH に移行
  - SMTP → SMTPS / STARTTLS に移行
  - HSTS（HTTP Strict Transport Security）を設定してダウングレード攻撃を防ぐ

【ネットワーク分離】
  - VLAN でセグメントを分離し、スニッフィングの影響範囲を限定する
  - 802.1X 認証でネットワーク接続を認可制にする
"""

arp_table = get_arp_table()
alerts = detect_arp_spoofing(arp_table)

if alerts:
    for alert in alerts:
        print(alert)
else:
    print("ARP テーブルに異常は検出されませんでした。")

print(defense_measures)
```

## 使用場面

- 社内ネットワークのセキュリティ診断時の ARP テーブル監視
- TLS 化が未完了のレガシープロトコル（FTP・Telnet）廃止計画の根拠説明
- ネットワーク機器（スイッチ）での Dynamic ARP Inspection 設定
- セキュリティ教育での「なぜ暗号化が必要か」の説明材料

## 参考文献

- [RFC 826 - An Ethernet Address Resolution Protocol](https://www.rfc-editor.org/rfc/rfc826)
- [OWASP - Transport Layer Protection Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html)
- [Cisco - Dynamic ARP Inspection](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst6500/ios/12-2SX/configuration/guide/book/snooarp.html)
- [NIST SP 800-115 - Technical Guide to Information Security Testing](https://csrc.nist.gov/publications/detail/sp/800-115/final)

<AffiliateBanner site="security_navi" />
