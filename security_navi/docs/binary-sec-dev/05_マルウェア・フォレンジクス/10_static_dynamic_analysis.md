import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 静的解析と動的解析

## マルウェア解析の2つのアプローチ

> マルウェア解析には、実行せずにコードを読む「静的解析」と、実際に動作させて挙動を観察する「動的解析」の2つのアプローチがあり、難読化・パッキング・環境検知などに応じてこれらを組み合わせることで正確な脅威評価が可能になる。

マルウェア解析は組織のインシデントレスポンス・脅威インテリジェンス収集・EDR シグネチャ作成の基盤となる。正確な解析なしには「何が盗まれたか」「どこまで感染が広がったか」「C2 サーバはどこか」を把握できない。

**静的解析の特徴：**
サンプルを実行せずに解析するため安全。ただし、パッカー（UPX など）やオブファスケーションで難読化されている場合は限界がある。ファイルハッシュ・文字列・インポート関数・ネットワーク指標（IP・ドメイン）が収集できる。

**動的解析の特徴：**
実行して挙動を観察する。サンドボックス（隔離環境）内で実行し、ファイル操作・レジストリ変更・ネットワーク通信・プロセス生成などを記録する。難読化されたコードでも実際の動作が観察できる。ただし、仮想環境を検知して動作を変えるマルウェアも存在する（アンチサンドボックス）。

## 静的解析 vs 動的解析の比較

| 項目 | 静的解析 | 動的解析 |
|------|---------|---------|
| 実行の要否 | 不要（安全） | 必要（隔離環境で実施） |
| 対象 | ファイル構造・文字列・コード | 実行時挙動・通信・ファイル変更 |
| 有効な場面 | 初期トリアージ・シグネチャ生成 | 難読化サンプル・挙動の確認 |
| 限界 | パッカー・難読化に弱い | アンチサンドボックスに弱い |
| 主要ツール | YARA・Ghidra・IDA Pro・strings | Cuckoo・REMnux・Process Monitor |

```python
# マルウェア静的解析の基本的な調査項目を収集するスクリプト（防御目的）
import hashlib
import os
import re
import subprocess
import shutil
from pathlib import Path

def compute_hashes(file_path: str) -> dict[str, str]:
    """ファイルの各種ハッシュを計算する（IOC 登録に使用）"""
    hashes = {}
    algorithms = {"md5": hashlib.md5(), "sha1": hashlib.sha1(), "sha256": hashlib.sha256()}
    try:
        with open(file_path, "rb") as f:
            data = f.read()
        for name, h in algorithms.items():
            h.update(data)
            hashes[name] = h.hexdigest()
    except (FileNotFoundError, PermissionError) as e:
        hashes["error"] = str(e)
    return hashes


def extract_strings(file_path: str, min_length: int = 6) -> list[str]:
    """
    バイナリから印刷可能な文字列を抽出する。
    URL・IP アドレス・レジストリキー・ファイルパスなどが含まれる場合がある。
    """
    if not shutil.which("strings"):
        return []
    result = subprocess.run(
        ["strings", "-n", str(min_length), file_path],
        capture_output=True, text=True, errors="replace"
    )
    return result.stdout.splitlines()


def find_ioc_in_strings(strings: list[str]) -> dict[str, list[str]]:
    """
    抽出した文字列から IOC（侵害指標）の候補を検出する。
    """
    ioc_patterns = {
        "URL":       r"https?://[^\s\"'<>]{5,}",
        "IP アドレス": r"\b(?:\d{1,3}\.){3}\d{1,3}\b",
        "ドメイン":   r"\b(?:[a-z0-9-]+\.){2,}[a-z]{2,}\b",
        "レジストリキー": r"HKEY_[A-Z_]+\\[^\s]{5,}",
        "ファイルパス": r"[A-Z]:\\[^\s\"]{5,}",
        "Base64":    r"[A-Za-z0-9+/]{20,}={0,2}",
    }
    found: dict[str, list[str]] = {key: [] for key in ioc_patterns}
    for s in strings:
        for category, pattern in ioc_patterns.items():
            matches = re.findall(pattern, s, re.IGNORECASE)
            found[category].extend(matches)
    # 重複除去
    return {k: list(set(v))[:10] for k, v in found.items() if v}


def basic_static_analysis(file_path: str) -> None:
    """基本的な静的解析レポートを生成する"""
    print(f"\n=== 静的解析レポート: {Path(file_path).name} ===\n")

    # ファイル情報
    stat = os.stat(file_path)
    print(f"ファイルサイズ: {stat.st_size:,} バイト")

    # ハッシュ値
    hashes = compute_hashes(file_path)
    for algo, value in hashes.items():
        if algo != "error":
            print(f"{algo.upper():8s}: {value}")

    # 文字列からの IOC 抽出
    strings = extract_strings(file_path)
    print(f"\n抽出文字列数: {len(strings)} 件")

    iocs = find_ioc_in_strings(strings)
    if iocs:
        print("\nIOC 候補:")
        for category, values in iocs.items():
            print(f"  [{category}]")
            for v in values[:5]:
                print(f"    {v}")


# YARA ルールの例（マルウェアシグネチャ作成）
yara_rule_example = """
// YARA ルールの例: ランサムウェアの典型的な文字列パターン（教育目的）
// 実際の運用では VirusTotal・ANY.RUN から収集したサンプルを分析して作成する

rule Ransomware_Generic_Strings {
    meta:
        description = "汎用ランサムウェアの文字列パターン（教育目的）"
        severity = "high"
    strings:
        $ransom1 = "Your files have been encrypted" nocase
        $ransom2 = "send bitcoin" nocase
        $ransom3 = "decrypt your files" nocase
        $ext1 = ".locked" nocase
        $ext2 = ".encrypted" nocase
    condition:
        2 of ($ransom*) or 1 of ($ext*)
}
"""
print("\n=== YARA ルールの例 ===")
print(yara_rule_example)
```

## 使用場面

- インシデント対応時のマルウェアサンプルの初期トリアージ
- SOC での未知のファイルのハッシュを VirusTotal・MISP で照合
- YARA ルール作成によるカスタムシグネチャの開発
- Cuckoo Sandbox への自動投入パイプラインの構築
- CTF の Forensics・Rev 問題でサンプルを解析する（学習目的）

## 参考文献

- [YARA - The Pattern Matching Swiss Knife](https://virustotal.github.io/yara/)
- [REMnux - Linux Distro for Malware Analysis](https://remnux.org/)
- [ANY.RUN - Interactive Malware Sandbox](https://any.run/)
- [Practical Malware Analysis (No Starch Press)](https://nostarch.com/malware)

<AffiliateBanner site="security_navi" />
