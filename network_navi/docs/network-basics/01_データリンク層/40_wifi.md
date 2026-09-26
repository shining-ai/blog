---
title: Wi-Fi（IEEE 802.11）の仕組み
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Wi-Fi（IEEE 802.11）の仕組み

## Wi-Fi とは

> IEEE 802.11 規格に基づく無線 LAN 技術で、電波を使ってケーブルなしにネットワーク接続を実現する

Wi-Fi は Wi-Fi Alliance が認定した IEEE 802.11 準拠の無線 LAN 製品の総称です。2.4GHz 帯と 5GHz 帯（802.11ax 以降は 6GHz 帯も）の電波を利用し、CSMA/CA によりアクセス制御を行います。

有線イーサネットと異なり、無線は共有媒体で全員が同じ電波を受信できるため、衝突回避と認証・暗号化が特に重要です。現在は Wi-Fi 7（IEEE 802.11be）が最新規格です。

## Wi-Fi 世代比較

| 世代名 | 規格 | 周波数 | 最大速度 | 主な技術 |
|--------|------|--------|---------|---------|
| Wi-Fi 4 | 802.11n | 2.4/5 GHz | 600 Mbps | MIMO |
| Wi-Fi 5 | 802.11ac | 5 GHz | 6.9 Gbps | MU-MIMO, 256-QAM |
| Wi-Fi 6 | 802.11ax | 2.4/5 GHz | 9.6 Gbps | OFDMA, BSS Coloring |
| Wi-Fi 6E | 802.11ax | 2.4/5/6 GHz | 9.6 Gbps | 6GHz 帯追加 |
| Wi-Fi 7 | 802.11be | 2.4/5/6 GHz | 46 Gbps | MLO, 4096-QAM |

## Wi-Fi セキュリティ

| プロトコル | 暗号化 | 現状 |
|-----------|--------|------|
| WEP | RC4 | 危殆化・使用禁止 |
| WPA | TKIP | 脆弱・非推奨 |
| WPA2 | AES/CCMP | 現在も広く使用 |
| WPA3 | SAE（CCMP） | 最新・推奨 |

## 2.4GHz vs 5GHz の違い

```
2.4GHz 帯                    5GHz 帯
─────────────────            ─────────────────
・到達距離: 長い              ・到達距離: 短い
・壁の透過: しやすい          ・壁の透過: しにくい
・非重複 ch: 3本              ・非重複 ch: 最大 19 本
・干渉: 受けやすい            ・干渉: 少ない
（電子レンジ・Bluetooth）     （気象レーダ注意）
・速度: 低め                 ・速度: 高い
```

```python
import subprocess
import re
import socket

def scan_wifi_networks() -> list[dict]:
    """利用可能な Wi-Fi ネットワークをスキャンする（Linux: nmcli）"""
    networks = []
    try:
        result = subprocess.run(
            ["nmcli", "-t", "-f", "SSID,SIGNAL,FREQ,SECURITY", "dev", "wifi", "list"],
            capture_output=True, text=True, timeout=10
        )
        for line in result.stdout.strip().split("\n"):
            parts = line.split(":")
            if len(parts) >= 4 and parts[0]:
                freq_mhz = int(parts[2]) if parts[2].isdigit() else 0
                networks.append({
                    "ssid":     parts[0],
                    "signal":   int(parts[1]) if parts[1].isdigit() else 0,
                    "band":     "5GHz" if freq_mhz >= 5000 else "2.4GHz",
                    "security": parts[3],
                })
    except (FileNotFoundError, subprocess.TimeoutExpired):
        print("nmcli が利用できません（Linux 環境が必要）")
    return sorted(networks, key=lambda x: x["signal"], reverse=True)

def get_current_wifi_info() -> dict:
    """現在接続中の Wi-Fi 情報を取得する"""
    try:
        result = subprocess.run(
            ["nmcli", "-t", "-f", "ACTIVE,SSID,SIGNAL,FREQ", "dev", "wifi"],
            capture_output=True, text=True, timeout=5
        )
        for line in result.stdout.strip().split("\n"):
            if line.startswith("yes:"):
                parts = line.split(":")
                return {
                    "ssid":   parts[1] if len(parts) > 1 else "Unknown",
                    "signal": parts[2] if len(parts) > 2 else "Unknown",
                    "freq":   parts[3] if len(parts) > 3 else "Unknown",
                }
    except FileNotFoundError:
        pass
    return {}

print("=== Wi-Fi ネットワーク一覧 ===")
for nw in scan_wifi_networks()[:5]:
    bar = "=" * (nw["signal"] // 10)
    print(f"  {nw['ssid']:<20} [{bar:<10}] {nw['signal']}% {nw['band']} {nw['security']}")

info = get_current_wifi_info()
if info:
    print(f"\n現在接続中: SSID={info['ssid']}, 信号強度={info['signal']}%")
```

## 使用場面

- 無線 AP の設置場所や周波数帯の選定（2.4GHz vs 5GHz）をする際に
- Wi-Fi セキュリティポリシー策定（WPA3 への移行）を検討する際に
- チャネル干渉のトラブルシューティングでチャネル分析を行う際に

## 参考文献

- [IEEE 802.11-2020 Standard](https://standards.ieee.org/ieee/802.11/7028/)
- [Wi-Fi Alliance – Security](https://www.wi-fi.org/discover-wi-fi/security)
- Andrew S. Tanenbaum, "Computer Networks", 5th Edition, Chapter 4.4

<AffiliateBanner site="network_navi" />
