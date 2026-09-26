import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ファイアウォールと IDS/IPS

## ファイアウォールと IDS/IPS とは

> ファイアウォールはネットワークトラフィックをルールに基づいてフィルタリングする境界防御装置であり、IDS（侵入検知システム）と IPS（侵入防止システム）は通信の内容を解析して不審な活動を検知・遮断する。

ネットワークセキュリティの基盤となるこれら3つの技術は、多層防御（Defense in Depth）の中心的な要素である。それぞれ役割が異なるため、組み合わせて使うことで多くの攻撃を防ぐことができる。

**ファイアウォール**は IP アドレス・ポート・プロトコルに基づいてトラフィックを許可または遮断する。世代によって機能が異なる。
- **パケットフィルタリング型**（第1世代）：ヘッダ情報のみで判断。高速だが状態を保持しない。
- **ステートフル型**（第2世代）：TCP セッション状態を追跡し、不正なパケットを検出できる。
- **次世代ファイアウォール（NGFW）**：アプリケーション識別・ユーザー識別・SSL 復号化・IPS 機能を統合。

**IDS（Intrusion Detection System）** は通信をミラーリングして解析し、シグネチャや異常ベースで侵入を**検知**してアラートを上げる。通信をブロックはしない。

**IPS（Intrusion Prevention System）** は IDS の機能に加えてインラインで動作し、不審なトラフィックを**自動的に遮断**できる。誤検知（False Positive）があるとサービス断になるリスクがある。

## ファイアウォール・IDS・IPS の比較

| 項目 | ファイアウォール | IDS | IPS |
|------|----------------|-----|-----|
| 配置 | インライン（ゲートウェイ） | 帯域外（ミラーポート） | インライン |
| 動作 | 許可・遮断 | 検知・アラート | 検知・遮断 |
| 判断基準 | IP / ポート / プロトコル | シグネチャ / 異常検知 | シグネチャ / 異常検知 |
| 誤検知リスク | 低（明確なルール） | 中（アラートのみ） | 高（遮断するため影響大） |
| 対応速度 | 高速 | 準リアルタイム | リアルタイム |
| 代表製品 | iptables・pfSense・Palo Alto | Snort・Suricata（検知専用） | Snort inline・Suricata IPS |

```python
# iptables ライクなファイアウォールルールの Python シミュレーション（教育目的）
from dataclasses import dataclass
from enum import Enum

class Action(Enum):
    ACCEPT = "ACCEPT"
    DROP = "DROP"
    REJECT = "REJECT"

@dataclass
class FirewallRule:
    """ファイアウォールルールの定義"""
    protocol: str        # tcp / udp / icmp / any
    src_ip: str          # ソース IP（"any" で全許可）
    dst_port: int | None # 宛先ポート（None で全ポート）
    action: Action
    comment: str

@dataclass
class Packet:
    """パケット情報"""
    protocol: str
    src_ip: str
    dst_port: int

class SimpleFirewall:
    """
    シンプルなステートレスファイアウォールの模擬実装。
    ルールは上から順に評価され、最初にマッチしたルールが適用される（first match wins）。
    """

    def __init__(self):
        self.rules: list[FirewallRule] = []
        self.default_policy = Action.DROP  # デフォルト拒否（最も安全）

    def add_rule(self, rule: FirewallRule) -> None:
        self.rules.append(rule)

    def evaluate(self, packet: Packet) -> tuple[Action, str]:
        """パケットをルールセットに照合して処置を決定する"""
        for rule in self.rules:
            proto_match = rule.protocol == "any" or rule.protocol == packet.protocol
            src_match = rule.src_ip == "any" or rule.src_ip == packet.src_ip
            port_match = rule.dst_port is None or rule.dst_port == packet.dst_port

            if proto_match and src_match and port_match:
                return rule.action, rule.comment

        return self.default_policy, "デフォルトポリシー（暗黙の拒否）"


# === 実際のセキュリティ設定例 ===
fw = SimpleFirewall()

# 許可ルール
fw.add_rule(FirewallRule("tcp", "any", 443, Action.ACCEPT, "HTTPS を全 IP から許可"))
fw.add_rule(FirewallRule("tcp", "any", 80,  Action.ACCEPT, "HTTP を全 IP から許可"))
fw.add_rule(FirewallRule("tcp", "10.0.0.0", 22, Action.ACCEPT, "SSH は管理ネットワークからのみ許可"))
fw.add_rule(FirewallRule("icmp", "any", None, Action.ACCEPT, "ping を許可"))

# 拒否ルール（データベースポートの外部公開を禁止）
fw.add_rule(FirewallRule("tcp", "any", 3306, Action.DROP, "MySQL への外部アクセス禁止"))
fw.add_rule(FirewallRule("tcp", "any", 5432, Action.DROP, "PostgreSQL への外部アクセス禁止"))

# テスト
test_packets = [
    Packet("tcp", "203.0.113.1", 443),   # 外部から HTTPS → 許可
    Packet("tcp", "203.0.113.1", 22),    # 外部から SSH → デフォルト拒否
    Packet("tcp", "10.0.0.0", 22),       # 管理 NW から SSH → 許可
    Packet("tcp", "203.0.113.1", 3306),  # 外部から MySQL → 拒否
]

print("ファイアウォールルール評価:")
for pkt in test_packets:
    action, comment = fw.evaluate(pkt)
    status = "OK" if action == Action.ACCEPT else "NG"
    print(f"  [{status}] {pkt.src_ip}:{pkt.dst_port}/{pkt.protocol} → {action.value} ({comment})")
```

## 使用場面

- クラウド環境（AWS Security Group・Azure NSG）でのインバウンド/アウトバウンドルール設計
- DMZ（非武装地帯）の構築と内部ネットワークの保護
- Snort / Suricata によるネットワーク上の異常トラフィック検知
- SIEM と IDS を連携させたセキュリティ監視センター（SOC）の構築
- ゼロトラストアーキテクチャにおけるマイクロセグメンテーション

## 参考文献

- [NIST SP 800-41 Rev.1 - Guidelines on Firewalls and Firewall Policy](https://csrc.nist.gov/publications/detail/sp/800-41/rev-1/final)
- [Snort - Open Source IDS/IPS](https://www.snort.org/)
- [Suricata - Open Source IDS/IPS/NSM](https://suricata.io/)
- [OWASP - Defense in Depth](https://owasp.org/www-community/Defense_in_depth)

<AffiliateBanner site="security_navi" />
