import AffiliateBanner from '@site/src/components/AffiliateBanner';

# ポートスキャンと Nmap（防御・検出方法）

## ポートスキャンとは

> ポートスキャンとは、対象ホストでどのポートが開放されており、どのサービスが稼働しているかを調査する技術であり、攻撃者による偵察フェーズで使われる一方、防御者によるセキュリティ診断にも広く利用される。

ネットワーク上のすべてのサービスは特定の TCP/UDP ポートで待ち受けている。ポートスキャンを実施することで「どのポートが開放されているか」「何のサービスが動いているか」「バージョンは何か」を把握できる。

**Nmap（Network Mapper）** はオープンソースのポートスキャナーで、業界標準のネットワーク調査ツールである。セキュリティエンジニアが自社システムの露出面（アタックサーフェス）を把握するために日常的に使用する。

**ポートスキャンが危険な理由：**
攻撃者はスキャン結果をもとに「古いバージョンのサービスに既知の脆弱性がないか」「不要なポートが開放されていないか」を確認し、次の攻撃ステップを計画する。脆弱なバージョンの SSH サーバ・公開されたままのデータベースポート（3306・5432）・管理画面（8080・8443）などが発見されると、標的になりやすい。

**防御側の活用：**
定期的に自分のシステムに対してポートスキャンを実施し、意図しないポートが開放されていないかを確認することが重要。「攻撃者と同じ目線で自システムを見る」ことが防御の第一歩である。

## Nmap のスキャン種別と用途

| スキャン種別 | Nmap オプション | 特徴 | 防御での用途 |
|------------|----------------|------|------------|
| TCP SYN スキャン | `-sS` | ステルス性が高い・高速 | 開放ポートの全体把握 |
| TCP Connect スキャン | `-sT` | 完全な TCP 接続・ログに残る | root 権限不要の診断 |
| UDP スキャン | `-sU` | UDP サービスの検出（低速） | DNS・SNMP の確認 |
| バージョン検出 | `-sV` | サービス名とバージョンを取得 | 脆弱なバージョンの発見 |
| OS 検出 | `-O` | OS の種別・バージョン推定 | 管理外デバイスの特定 |
| スクリプトスキャン | `-sC` | 既知の脆弱性チェック | 診断の自動化 |

```python
# Python での簡易ポートスキャン実装（防御・学習目的）
import socket
import concurrent.futures
from datetime import datetime

# ===================================================================
# 注意: このスクリプトは自分が管理するシステムに対してのみ使用すること
#       許可なく他者のシステムをスキャンすることは不正アクセス禁止法違反
# ===================================================================

COMMON_PORTS = {
    21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP",
    53: "DNS", 80: "HTTP", 110: "POP3", 143: "IMAP",
    443: "HTTPS", 445: "SMB", 3306: "MySQL",
    3389: "RDP", 5432: "PostgreSQL", 6379: "Redis",
    8080: "HTTP-Alt", 8443: "HTTPS-Alt", 27017: "MongoDB",
}

RISKY_PORTS = {23: "Telnet", 21: "FTP", 3306: "MySQL", 27017: "MongoDB"}


def scan_port(host: str, port: int, timeout: float = 1.0) -> bool:
    """指定したポートが開放されているかを確認する"""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False


def scan_host(host: str, ports: dict[int, str]) -> dict[int, str]:
    """
    指定ホストの指定ポートをスキャンし、開放されているポートを返す。
    並列スキャンでも意図的に並列数を制限してステルス性は考慮しない
    （自社診断目的のため検出されることを前提とする）。
    """
    open_ports: dict[int, str] = {}

    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = {
            executor.submit(scan_port, host, port): (port, service)
            for port, service in ports.items()
        }
        for future in concurrent.futures.as_completed(futures):
            port, service = futures[future]
            if future.result():
                open_ports[port] = service

    return dict(sorted(open_ports.items()))


def analyze_risk(open_ports: dict[int, str]) -> list[str]:
    """
    開放ポートのリスク分析：危険なポートが開放されている場合に警告を出す。
    """
    warnings: list[str] = []
    for port, service in open_ports.items():
        if port in RISKY_PORTS:
            warnings.append(
                f"[高リスク] ポート {port}/{service} が開放: "
                f"認証情報が平文で送信されるか、外部に公開すべきでないサービスです。"
            )
        if port in (3306, 5432, 27017, 6379) and port in open_ports:
            warnings.append(
                f"[高リスク] ポート {port}/{service}: "
                f"データベースポートが外部公開されています。ファイアウォールで遮断してください。"
            )
    return warnings


# 使用例（localhost のみをスキャン）
target = "127.0.0.1"
print(f"スキャン開始: {target}  {datetime.now().strftime('%H:%M:%S')}")
open_ports = scan_host(target, COMMON_PORTS)

print(f"\n開放ポート ({len(open_ports)} 件):")
for port, service in open_ports.items():
    print(f"  {port:5d}/tcp  {service}")

warnings = analyze_risk(open_ports)
if warnings:
    print("\nリスク警告:")
    for w in warnings:
        print(f"  {w}")
else:
    print("\n高リスクポートは検出されませんでした。")
```

## 使用場面

- 定期的な自社サーバの露出面（アタックサーフェス）確認
- ファイアウォールルールの意図しない穴の発見
- 新規サーバのデプロイ後の開放ポート確認（CI/CD パイプラインへの組み込み）
- インシデント発生後の不審なポートの調査
- ペネトレーションテストの偵察フェーズ（許可取得後）

## 参考文献

- [Nmap - Official Documentation](https://nmap.org/book/man.html)
- [OWASP - Network Scanning](https://owasp.org/www-community/vulnerabilities/Unrestricted_Network_Access)
- [NIST SP 800-115 - Technical Guide to Information Security Testing](https://csrc.nist.gov/publications/detail/sp/800-115/final)
- [CIS Benchmarks - Network Security](https://www.cisecurity.org/cis-benchmarks/)

<AffiliateBanner site="security_navi" />
