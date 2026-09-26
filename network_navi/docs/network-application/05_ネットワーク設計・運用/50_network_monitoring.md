import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ネットワーク監視（SNMP・NetFlow）

## ネットワーク監視とは

> ネットワーク監視とはルータ・スイッチ・サーバなどのネットワーク機器の状態・性能を継続的に収集・分析して障害の早期検知・容量計画・セキュリティ分析を行う管理手法であり、SNMP（デバイス状態収集）と NetFlow（トラフィックフロー分析）が代表的なプロトコルである。

SNMP（Simple Network Management Protocol）は RFC 1157 で規定された UDP ベースのプロトコルです。管理システム（NMS）がエージェント（機器に内蔵）に OID（Object Identifier）を指定して情報を取得（GET）したり、設定変更（SET）を行います。機器側から重要なイベントを非同期通知する TRAP も使えます。MIB（Management Information Base）はデータの定義体系です。SNMP v3 では認証・暗号化が追加され、セキュリティが大幅に向上しました。

NetFlow は Cisco が開発したフロー情報エクスポート技術（現在は IETF IPFIX として標準化）です。ルータ・スイッチが通過するパケットを「フロー（送受信 IP・ポート・プロトコルの 5 タプルが同じパケット群）」単位で集計し、コレクタ（NetFlow サーバ）に UDP で送信します。帯域幅の上位利用者特定、異常なトラフィックパターン（DDoS・マルウェア）の検知、ネットワーク容量計画に使われます。

代表的な監視ツールとして、SNMP ベースでは Zabbix・Nagios・MRTG があり、フロー分析では ntopng・Elastic Stack・Grafana + Prometheus があります。

## SNMP と NetFlow の比較

| 項目 | SNMP | NetFlow/IPFIX |
|------|------|---------------|
| 目的 | デバイス状態・統計収集 | トラフィックフロー分析 |
| 収集方式 | ポーリング（GET）・TRAP | エクスポート（フロー集計） |
| データ粒度 | インターフェース合計 | フロー単位（5タプル） |
| プロトコル | UDP 161/162 | UDP（可変ポート） |
| 用途 | 障害検知・設定管理 | 帯域分析・セキュリティ分析 |

```python
import time
import random
import collections
from dataclasses import dataclass, field
from datetime import datetime, timezone

# ===========================
# SNMP MIB オブジェクトの概念的実装
# ===========================

@dataclass
class MIBObject:
    oid: str
    name: str
    value: object
    type_: str  # INTEGER, COUNTER32, GAUGE32, STRING 等

    def __repr__(self):
        return f"{self.oid} ({self.name}) = {self.value} [{self.type_}]"


class SNMPAgent:
    """SNMP エージェントのシミュレーション"""

    def __init__(self, hostname: str):
        self.hostname = hostname
        self._mib: dict[str, MIBObject] = {}
        self._init_standard_mib()

    def _init_standard_mib(self) -> None:
        """標準的な MIB オブジェクトを初期化"""
        objects = [
            ("1.3.6.1.2.1.1.1.0",  "sysDescr",      f"Linux {self.hostname} 6.1.0", "STRING"),
            ("1.3.6.1.2.1.1.3.0",  "sysUpTime",      0,                              "TimeTicks"),
            ("1.3.6.1.2.1.1.5.0",  "sysName",        self.hostname,                  "STRING"),
            ("1.3.6.1.2.1.2.1.0",  "ifNumber",       4,                              "INTEGER"),
            # IF-MIB: インターフェース 1 (eth0)
            ("1.3.6.1.2.1.2.2.1.2.1",  "ifDescr.1",        "eth0",    "STRING"),
            ("1.3.6.1.2.1.2.2.1.5.1",  "ifSpeed.1",         1000000000, "Gauge32"),   # 1 Gbps
            ("1.3.6.1.2.1.2.2.1.8.1",  "ifOperStatus.1",    1,         "INTEGER"),    # up=1
            ("1.3.6.1.2.1.2.2.1.10.1", "ifInOctets.1",      0,         "Counter32"),
            ("1.3.6.1.2.1.2.2.1.16.1", "ifOutOctets.1",     0,         "Counter32"),
            ("1.3.6.1.2.1.2.2.1.14.1", "ifInErrors.1",      0,         "Counter32"),
        ]
        for oid, name, val, type_ in objects:
            self._mib[oid] = MIBObject(oid, name, val, type_)

    def get(self, oid: str) -> MIBObject | None:
        """SNMPGet: OID の値を返す"""
        return self._mib.get(oid)

    def get_bulk(self, prefix: str) -> list[MIBObject]:
        """SNMP GetBulk: プレフィックスに一致する全オブジェクトを返す"""
        return [obj for oid, obj in self._mib.items() if oid.startswith(prefix)]

    def trap(self, trap_type: str, varbinds: dict) -> dict:
        """SNMP Trap の送信（概念）"""
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "agent": self.hostname,
            "trap_type": trap_type,
            "varbinds": varbinds,
        }

    def simulate_traffic(self, in_bytes: int, out_bytes: int) -> None:
        """トラフィックをシミュレート（カウンタを増加）"""
        self._mib["1.3.6.1.2.1.2.2.1.10.1"].value += in_bytes
        self._mib["1.3.6.1.2.1.2.2.1.16.1"].value += out_bytes
        self._mib["1.3.6.1.2.1.1.3.0"].value += 100  # sysUpTime 増加


# ===========================
# NetFlow フロー集計のシミュレーション
# ===========================

@dataclass
class NetFlowRecord:
    """NetFlow v9 レコードの簡易表現"""
    src_ip:    str
    dst_ip:    str
    src_port:  int
    dst_port:  int
    protocol:  int    # 6=TCP, 17=UDP
    packets:   int
    bytes_:    int
    start_time: float
    end_time:   float

    @property
    def duration_ms(self) -> int:
        return int((self.end_time - self.start_time) * 1000)

    @property
    def five_tuple(self) -> tuple:
        return (self.src_ip, self.dst_ip, self.src_port, self.dst_port, self.protocol)


class NetFlowCollector:
    """NetFlow コレクタのシミュレーション"""

    def __init__(self):
        self.flows: list[NetFlowRecord] = []

    def receive(self, flow: NetFlowRecord) -> None:
        self.flows.append(flow)

    def top_talkers(self, n: int = 5) -> list[tuple[str, int]]:
        """送信元 IP 別の送信バイト数上位 N"""
        counter: dict[str, int] = collections.defaultdict(int)
        for f in self.flows:
            counter[f.src_ip] += f.bytes_
        return sorted(counter.items(), key=lambda x: x[1], reverse=True)[:n]

    def top_destinations(self, n: int = 5) -> list[tuple]:
        """宛先 IP:ポート 別のトラフィック"""
        counter: dict[tuple, int] = collections.defaultdict(int)
        for f in self.flows:
            counter[(f.dst_ip, f.dst_port)] += f.bytes_
        return sorted(counter.items(), key=lambda x: x[1], reverse=True)[:n]

    def detect_anomaly(self, threshold_bytes: int = 100_000_000) -> list[str]:
        """大量トラフィックを検知（DDoS/データ流出の兆候）"""
        counter: dict[str, int] = collections.defaultdict(int)
        for f in self.flows:
            counter[f.src_ip] += f.bytes_
        return [ip for ip, b in counter.items() if b > threshold_bytes]


print("=== ネットワーク監視デモ ===\n")

# SNMP デモ
agent = SNMPAgent("router01.example.com")
agent.simulate_traffic(in_bytes=1_500_000, out_bytes=800_000)

print("[SNMP GET デモ]")
for oid in ["1.3.6.1.2.1.1.5.0", "1.3.6.1.2.1.2.2.1.8.1",
            "1.3.6.1.2.1.2.2.1.10.1", "1.3.6.1.2.1.2.2.1.16.1"]:
    obj = agent.get(oid)
    if obj:
        print(f"  {obj}")

print("\n[SNMP インターフェース使用率計算]")
in_octets  = agent.get("1.3.6.1.2.1.2.2.1.10.1").value
out_octets = agent.get("1.3.6.1.2.1.2.2.1.16.1").value
speed_bps  = agent.get("1.3.6.1.2.1.2.2.1.5.1").value
interval_s = 300  # 5分間のポーリング間隔
in_bps  = (in_octets  * 8) / interval_s
out_bps = (out_octets * 8) / interval_s
print(f"  受信: {in_bps/1e6:.1f} Mbps ({in_bps/speed_bps*100:.1f}% 使用率)")
print(f"  送信: {out_bps/1e6:.1f} Mbps ({out_bps/speed_bps*100:.1f}% 使用率)")

print("\n[SNMP Trap の例]")
trap = agent.trap("linkDown", {
    "ifIndex": 1,
    "ifDescr": "eth0",
    "ifOperStatus": 2,  # down
})
print(f"  {trap}")

print("\n[NetFlow フロー分析]")
collector = NetFlowCollector()
now = time.time()
flows_data = [
    ("10.0.1.5",  "8.8.8.8",    54321, 443, 6, 100, 150_000_000),
    ("10.0.1.10", "1.2.3.4",    55000, 80,  6, 50,  30_000_000),
    ("10.0.1.5",  "8.8.4.4",    54322, 53,  17, 20, 5_000),
    ("10.0.2.1",  "192.168.1.1",60000, 443, 6, 200, 50_000_000),
    ("10.0.1.5",  "10.0.99.1",  54323, 9999, 17, 500, 200_000_000),  # 異常
]
for src, dst, sp, dp, proto, pkts, bts in flows_data:
    collector.receive(NetFlowRecord(src, dst, sp, dp, proto, pkts, bts, now, now+60))

print("  トップ送信元（Top Talkers）:")
for ip, b in collector.top_talkers():
    print(f"    {ip}: {b/1e6:.1f} MB")

print("  アノマリー検知（100 MB超）:")
anomalies = collector.detect_anomaly(threshold_bytes=100_000_000)
for ip in anomalies:
    print(f"    !! {ip} が大量トラフィックを検知（DDoS/データ流出の可能性）")
```

## 使用場面

- SNMP ポーリングで CPU 使用率・インターフェース帯域使用率を定期収集して監視ダッシュボードに表示する場面
- NetFlow でトップトーカー（帯域を大量消費しているホスト）を特定してネットワーク容量計画に活用する場面
- セキュリティ分析において NetFlow データから異常なトラフィックパターン（ポートスキャン・C&C 通信）を検知する場面

## 参考文献

- [RFC 1157 – SNMP](https://www.rfc-editor.org/rfc/rfc1157)
- [RFC 7011 – IPFIX Protocol Specification](https://www.rfc-editor.org/rfc/rfc7011)
- Stallings, W. "SNMP, SNMPv2, SNMPv3, and RMON 1 and 2" (Addison-Wesley)

<AffiliateBanner site="network_navi" />
