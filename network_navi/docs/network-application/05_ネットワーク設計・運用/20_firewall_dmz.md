import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ファイアウォールと DMZ

## ファイアウォールと DMZ とは

> ファイアウォールとはネットワークトラフィックをルールに基づいてフィルタリングして不正アクセスを防ぐセキュリティ機器であり、DMZ（非武装地帯）とはインターネットと内部ネットワークの間に設けた中間セキュリティゾーンで Web サーバ等の公開サービスを配置する設計手法である。

ファイアウォールはパケットに含まれるヘッダ情報（送受信 IP・ポート・プロトコル）を基にフィルタリングするパケットフィルタリング型と、TCP セッション状態を追跡するステートフルインスペクション型があります。さらに HTTP アプリケーション層まで解析する WAF（Web Application Firewall）も広く使われます。

ファイアウォールルールは「デフォルト拒否（Default Deny）」を原則とし、許可するトラフィックのみを明示的に記述します。ルールは上から順に評価され、最初にマッチしたルールが適用されます（ファーストマッチ）。

DMZ ネットワーク設計は 3 つのゾーンで構成されます。インターネット（信頼度 0）、DMZ（信頼度 1：Web サーバ・メールリレー・DNS を配置）、内部ネットワーク（信頼度 2：データベース・社内システム）。DMZ のサーバが侵害されても、内部ネットワークへの侵入を防ぐ多層防御（Defense in Depth）を実現します。

現代のクラウド環境では Security Group（AWS）や Network Security Group（Azure）が仮想ファイアウォールとして機能します。ゼロトラストアーキテクチャでは「内部ネットワークも信頼しない」という考え方で、すべてのリクエストを認証・認可します。

## ファイアウォールの種類

| 種類 | 動作レイヤ | 特徴 | 用途 |
|------|----------|------|------|
| パケットフィルタ | L3/L4 | IP・ポートで判断 | ルータのACL |
| ステートフルインスペクション | L4 | セッション状態を追跡 | 企業FW |
| アプリケーションゲートウェイ | L7 | プロキシとして動作 | HTTP FW |
| WAF | L7（HTTP） | SQLi・XSSなど検知 | Webサービス |
| NGFW（次世代FW） | L7 | DPI・IPS統合 | エンタープライズ |

```python
from dataclasses import dataclass
from enum import Enum
from ipaddress import IPv4Network, IPv4Address

class Action(Enum):
    ALLOW = "ALLOW"
    DENY  = "DENY"
    LOG   = "LOG"

class Protocol(Enum):
    TCP  = "TCP"
    UDP  = "UDP"
    ICMP = "ICMP"
    ANY  = "ANY"

@dataclass
class FirewallRule:
    """ファイアウォールルール"""
    priority:    int
    action:      Action
    src_net:     str       # CIDR または "any"
    dst_net:     str
    protocol:    Protocol
    dst_port:    int | str # ポート番号または "any"
    description: str = ""

    def matches(self, src_ip: str, dst_ip: str, proto: Protocol, dst_port: int) -> bool:
        """パケットがこのルールにマッチするか判定"""
        # 送信元 IP チェック
        if self.src_net != "any":
            if IPv4Address(src_ip) not in IPv4Network(self.src_net):
                return False

        # 宛先 IP チェック
        if self.dst_net != "any":
            if IPv4Address(dst_ip) not in IPv4Network(self.dst_net):
                return False

        # プロトコルチェック
        if self.protocol != Protocol.ANY and self.protocol != proto:
            return False

        # ポートチェック
        if self.dst_port != "any" and self.dst_port != dst_port:
            return False

        return True


class StatefulFirewall:
    """
    ステートフルファイアウォールのシミュレーション
    - ルールによるフィルタリング
    - セッション状態の追跡
    """

    def __init__(self, name: str):
        self.name = name
        self.rules: list[FirewallRule] = []
        # セッションテーブル: (src_ip, dst_ip, dst_port) → state
        self._session_table: dict[tuple, str] = {}

    def add_rule(self, rule: FirewallRule) -> None:
        self.rules.append(rule)
        self.rules.sort(key=lambda r: r.priority)

    def check_packet(
        self,
        src_ip: str,
        dst_ip: str,
        proto: Protocol,
        dst_port: int,
        direction: str = "inbound",
    ) -> tuple[Action, str]:
        """
        パケットの通過可否を判定
        Returns: (Action, マッチしたルールの説明)
        """
        # 既存セッションのレスポンスは許可（ステートフル）
        session_key = (dst_ip, src_ip, dst_port)
        if session_key in self._session_table:
            return Action.ALLOW, "Established session"

        # ルールを順番にチェック（ファーストマッチ）
        for rule in self.rules:
            if rule.matches(src_ip, dst_ip, proto, dst_port):
                if rule.action == Action.ALLOW:
                    # セッションテーブルに登録
                    self._session_table[(src_ip, dst_ip, dst_port)] = "ESTABLISHED"
                return rule.action, rule.description

        # デフォルト拒否
        return Action.DENY, "Default deny"


# ===========================
# DMZ ネットワーク構成のシミュレーション
# ===========================

def setup_dmz_firewall() -> tuple[StatefulFirewall, StatefulFirewall]:
    """
    DMZ 構成のファイアウォールルール設定
    Internet → [External FW] → DMZ (10.0.1.0/24)
               [Internal FW] → Internal (10.0.2.0/24)
    """

    # 外部 FW: Internet ↔ DMZ
    ext_fw = StatefulFirewall("External-FW (Internet↔DMZ)")

    ext_fw.add_rule(FirewallRule(
        priority=10, action=Action.ALLOW,
        src_net="any", dst_net="10.0.1.10/32",
        protocol=Protocol.TCP, dst_port=443,
        description="HTTPS → Web サーバ(DMZ)を許可"
    ))
    ext_fw.add_rule(FirewallRule(
        priority=20, action=Action.ALLOW,
        src_net="any", dst_net="10.0.1.10/32",
        protocol=Protocol.TCP, dst_port=80,
        description="HTTP → Web サーバ(DMZ)を許可（HTTPSリダイレクト用）"
    ))
    ext_fw.add_rule(FirewallRule(
        priority=30, action=Action.ALLOW,
        src_net="any", dst_net="10.0.1.20/32",
        protocol=Protocol.TCP, dst_port=25,
        description="SMTP → メールリレー(DMZ)を許可"
    ))
    ext_fw.add_rule(FirewallRule(
        priority=900, action=Action.DENY,
        src_net="any", dst_net="any",
        protocol=Protocol.ANY, dst_port="any",
        description="その他全て拒否（デフォルト拒否）"
    ))

    # 内部 FW: DMZ ↔ Internal
    int_fw = StatefulFirewall("Internal-FW (DMZ↔Internal)")

    int_fw.add_rule(FirewallRule(
        priority=10, action=Action.ALLOW,
        src_net="10.0.1.10/32", dst_net="10.0.2.10/32",
        protocol=Protocol.TCP, dst_port=5432,
        description="Web サーバ → DB サーバ(PostgreSQL)を許可"
    ))
    int_fw.add_rule(FirewallRule(
        priority=20, action=Action.ALLOW,
        src_net="10.0.2.0/24", dst_net="any",
        protocol=Protocol.TCP, dst_port=443,
        description="内部 → Internet HTTPS を許可"
    ))
    int_fw.add_rule(FirewallRule(
        priority=30, action=Action.DENY,
        src_net="10.0.1.0/24", dst_net="10.0.2.0/24",
        protocol=Protocol.ANY, dst_port="any",
        description="DMZ → 内部ネットワーク 直接アクセス拒否"
    ))
    int_fw.add_rule(FirewallRule(
        priority=900, action=Action.DENY,
        src_net="any", dst_net="any",
        protocol=Protocol.ANY, dst_port="any",
        description="その他全て拒否"
    ))

    return ext_fw, int_fw


print("=== ファイアウォール・DMZ デモ ===\n")

ext_fw, int_fw = setup_dmz_firewall()

test_packets = [
    # (説明, fw, src, dst, proto, port)
    ("Internet → Web(HTTPS)",      ext_fw, "1.2.3.4",   "10.0.1.10", Protocol.TCP, 443),
    ("Internet → Web(SSH)",        ext_fw, "1.2.3.4",   "10.0.1.10", Protocol.TCP, 22),
    ("Internet → メールリレー",     ext_fw, "5.6.7.8",   "10.0.1.20", Protocol.TCP, 25),
    ("Internet → 内部DB直接",       ext_fw, "1.2.3.4",   "10.0.2.10", Protocol.TCP, 5432),
    ("Web(DMZ) → 内部DB",          int_fw, "10.0.1.10", "10.0.2.10", Protocol.TCP, 5432),
    ("DMZ → 内部ネットワーク(SSH)", int_fw, "10.0.1.10", "10.0.2.5",  Protocol.TCP, 22),
    ("内部 → Internet(HTTPS)",     int_fw, "10.0.2.50", "8.8.8.8",   Protocol.TCP, 443),
]

for desc, fw, src, dst, proto, port in test_packets:
    action, rule = fw.check_packet(src, dst, proto, port)
    icon = "OK" if action == Action.ALLOW else "NG"
    print(f"  [{icon}] {desc}")
    print(f"       {src} → {dst}:{port} = {action.value} ({rule})")
```

## 使用場面

- 公開 Web サービスを DMZ に配置し、インターネットと内部システム（DB・認証サーバ）を隔離する設計をする場面
- クラウドの Security Group や Network ACL でファイアウォールルールを定義して最小権限アクセスを実現する場面
- セキュリティインシデント発生時にファイアウォールログを解析して侵害経路を特定する場面

## 参考文献

- NIST SP 800-41 "Guidelines on Firewalls and Firewall Policy"
- Cheswick, W. R. et al. "Firewalls and Internet Security" (Addison-Wesley)
- [AWS – セキュリティグループを使用して AWS リソースへのトラフィックをコントロールする](https://docs.aws.amazon.com/ja_jp/vpc/latest/userguide/vpc-security-groups.html)

<AffiliateBanner site="network_navi" />
