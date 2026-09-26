import AffiliateBanner from '@site/src/components/AffiliateBanner';

# サンドボックス解析

## サンドボックス解析とは

> サンドボックス解析とは、マルウェアを本番環境から隔離された仮想環境（サンドボックス）内で自動的に実行し、ファイル操作・レジストリ変更・ネットワーク通信・プロセス生成などの挙動を記録・分析する動的解析手法である。

サンドボックスを使うことで、マルウェアを安全に実行してその動作を自動的にレポート化できる。SOC のアナリストが大量のサンプルを効率よく分類し、高優先度のものに人的リソースを集中させるためのトリアージに不可欠である。

**Cuckoo Sandbox** は最も広く使われているオープンソースのサンドボックスシステムである。Windows・Linux・Android の仮想マシンを管理し、マルウェアの実行後に詳細なレポートを生成する。商用サービスとして **ANY.RUN**（インタラクティブ）・**Joe Sandbox**・**Hybrid Analysis** なども広く利用される。

**サンドボックスを使った解析で収集できる情報：**
- 生成・変更・削除されたファイル
- 書き込み・削除されたレジストリキー
- 接続した IP アドレス・ドメイン・URL（C2 サーバ情報）
- 生成・終了したプロセス
- ネットワークパケット（PCAP）
- API 呼び出しシーケンス

## サンドボックスの種類と比較

| ツール | 種別 | 対象 OS | 特徴 | 費用 |
|--------|------|---------|------|------|
| **Cuckoo Sandbox** | OSS・自己ホスト | Windows・Linux・Android | 高いカスタマイズ性 | 無料 |
| **ANY.RUN** | クラウド・インタラクティブ | Windows・Linux | リアルタイム操作可能 | Free / Pro |
| **Hybrid Analysis** | クラウド | Windows | Falcon Sandbox ベース | Free（制限あり）|
| **Joe Sandbox** | クラウド / オンプレ | Windows・macOS・Linux | 詳細な API 解析 | 商用 |
| **VirusTotal** | クラウド | 全般 | 70+ エンジンでスキャン + 動的解析 | Free（制限あり）|

```python
# Cuckoo Sandbox API を使ったサンプル投入と結果取得の例（防御・自動化目的）
import requests
import time
import json
from pathlib import Path

CUCKOO_API_URL = "http://localhost:8090"  # Cuckoo REST API のエンドポイント


def submit_sample(file_path: str) -> int | None:
    """
    ファイルを Cuckoo Sandbox に投入してタスク ID を返す。
    Cuckoo が起動している環境でのみ動作する。
    """
    try:
        with open(file_path, "rb") as f:
            response = requests.post(
                f"{CUCKOO_API_URL}/tasks/create/file",
                files={"file": (Path(file_path).name, f)},
                data={
                    "options": "procmemdump=yes",    # プロセスメモリダンプ
                    "enforce_timeout": True,
                    "timeout": 120,                  # 120秒後に強制終了
                },
                timeout=30,
            )
        if response.status_code == 200:
            task_id = response.json().get("task_id")
            print(f"タスク ID: {task_id} で投入しました")
            return task_id
    except requests.exceptions.ConnectionError:
        print("Cuckoo Sandbox に接続できません（起動していない可能性）")
    return None


def get_task_status(task_id: int) -> str:
    """タスクの実行状態を確認する"""
    try:
        response = requests.get(f"{CUCKOO_API_URL}/tasks/view/{task_id}", timeout=10)
        if response.status_code == 200:
            return response.json().get("task", {}).get("status", "unknown")
    except requests.exceptions.ConnectionError:
        pass
    return "error"


def get_report(task_id: int) -> dict:
    """解析レポートを取得する"""
    try:
        response = requests.get(f"{CUCKOO_API_URL}/tasks/report/{task_id}", timeout=30)
        if response.status_code == 200:
            return response.json()
    except requests.exceptions.ConnectionError:
        pass
    return {}


def extract_ioc_from_report(report: dict) -> dict:
    """
    Cuckoo レポートから IOC（侵害指標）を抽出する。
    SIEM・EDR・ファイアウォールへの登録に活用できる。
    """
    ioc: dict = {
        "network": {
            "domains": [],
            "ips": [],
            "urls": [],
        },
        "files": {
            "created": [],
            "deleted": [],
        },
        "registry": {
            "set": [],
            "deleted": [],
        },
    }

    # ネットワーク情報
    network = report.get("network", {})
    ioc["network"]["domains"] = [h.get("domain") for h in network.get("dns", [])]
    ioc["network"]["ips"] = list(set(
        conn.get("dst") for conn in network.get("tcp", [])
    ))

    # ファイル操作
    behavior = report.get("behavior", {})
    for proc in behavior.get("processes", []):
        for call in proc.get("calls", []):
            api = call.get("api", "")
            if api in ("CreateFileW", "CreateFileA"):
                args = {a["name"]: a["value"] for a in call.get("arguments", [])}
                if "FileName" in args:
                    ioc["files"]["created"].append(args["FileName"])

    return ioc


# アンチサンドボックス技術の解説（防御側が知っておくべき回避手法）
print("=== マルウェアによるサンドボックス回避手法（防御のために理解する）===\n")

evasion_techniques = {
    "人間の操作確認": "マウス移動・クリック・スクロールなどのユーザー操作がないと動作しない",
    "スリープ": "解析時間（通常120秒）を超える長時間のスリープを挿入する",
    "仮想環境検知": "VMware/VirtualBox 特有のプロセス・レジストリ・ファイルを確認する",
    "デバッガ検知": "IsDebuggerPresent API やタイミング計測でデバッガを検出する",
    "環境確認": "ドメイン参加・インストールソフト数・画面解像度を確認して本番環境を判定",
    "サンドボックス回避対策": "インタラクティブモード（ANY.RUN）・複数回実行・長時間タイムアウトで対応",
}

for technique, description in evasion_techniques.items():
    print(f"  [{technique}]")
    print(f"    {description}\n")
```

## 使用場面

- 不審なメール添付ファイルを自動サンドボックスで検査するメールゲートウェイ
- インシデント対応時のマルウェアサンプルの迅速な行動分析
- SOC での未知ファイルの自動トリアージパイプライン（Cuckoo + MISP + SIEM 連携）
- C2 サーバの IP・ドメインの特定とファイアウォールへのブロックリスト登録
- CTF の Forensics 問題でサンドボックスレポートを読む（学習目的）

## 参考文献

- [Cuckoo Sandbox - Official Documentation](https://cuckoo.sh/docs/)
- [ANY.RUN - Interactive Online Malware Sandbox](https://any.run/)
- [Hybrid Analysis - Free Malware Analysis Service](https://www.hybrid-analysis.com/)
- [MITRE ATT&CK - Defense Evasion: Virtualization/Sandbox Evasion (T1497)](https://attack.mitre.org/techniques/T1497/)

<AffiliateBanner site="security_navi" />
