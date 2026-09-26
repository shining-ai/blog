import AffiliateBanner from '@site/src/components/AffiliateBanner';

# デジタルフォレンジクスの基礎

## デジタルフォレンジクスとは

> デジタルフォレンジクスとは、コンピュータ・ネットワーク・ストレージデバイスから証拠を科学的に収集・保全・分析・報告する学問分野であり、インシデント対応・法的手続き・事後調査において攻撃の全容を明らかにするために用いられる。

フォレンジクスの最も重要な原則は **証拠の完全性（インテグリティ）の保全** である。証拠を取り扱う過程で改ざんが生じると、法的証拠能力が失われる。そのため、オリジナルデータには直接触れず、ビット単位の完全なコピー（フォレンジックイメージ）を取得してから解析する。

**フォレンジクスの4ステップ：**
1. **収集（Collection）**：証拠の特定・フォレンジックイメージの取得
2. **保全（Preservation）**：ハッシュによる整合性確認・証拠の隔離
3. **分析（Examination / Analysis）**：データの詳細な解析
4. **報告（Reporting）**：再現可能な形式での文書化

**デジタルフォレンジクスの対象：**
- ディスクフォレンジクス（HDD・SSD・USB）
- メモリフォレンジクス（RAM の揮発性証拠）
- ネットワークフォレンジクス（PCAP・フロー）
- ログフォレンジクス（OS ログ・アプリログ・SIEM）
- モバイルフォレンジクス（スマートフォン）

## フォレンジクスの手順と主要ツール

| フェーズ | 主要ツール | 説明 |
|---------|-----------|------|
| イメージ取得 | `dd`・`dcfldd`・FTK Imager | ビット単位の完全コピーを取得 |
| 整合性確認 | `md5sum`・`sha256sum` | ハッシュで改ざんがないことを確認 |
| ファイルシステム解析 | Autopsy・The Sleuth Kit | 削除ファイルの復元・タイムライン作成 |
| ログ解析 | `plaso`（log2timeline）・ELK Stack | タイムラインの構築 |
| ネットワーク解析 | Wireshark・NetworkMiner | PCAP の解析・通信の復元 |
| レポート作成 | Autopsy・Markdown / PDF | 法的証拠として提出可能な形式で文書化 |

```python
# デジタルフォレンジクスの基本操作（証拠保全と分析）
import hashlib
import os
import json
from datetime import datetime, timezone
from pathlib import Path


def compute_file_hash(file_path: str, algorithm: str = "sha256") -> str:
    """
    ファイルのハッシュ値を計算する。
    証拠保全では取得前後のハッシュ一致を確認することで完全性を証明する。
    """
    h = hashlib.new(algorithm)
    try:
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                h.update(chunk)
        return h.hexdigest()
    except (FileNotFoundError, PermissionError):
        return ""


def create_evidence_manifest(evidence_dir: str) -> dict:
    """
    証拠ディレクトリ内のすべてのファイルのハッシュと
    メタデータ（サイズ・更新日時）を記録した証拠台帳を作成する。
    法的手続きでの証拠完全性の証明に使用する。
    """
    manifest = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "evidence_dir": evidence_dir,
        "files": [],
    }

    base_path = Path(evidence_dir)
    if not base_path.exists():
        manifest["error"] = "ディレクトリが見つかりません"
        return manifest

    for file_path in sorted(base_path.rglob("*")):
        if file_path.is_file():
            stat = file_path.stat()
            entry = {
                "path": str(file_path.relative_to(base_path)),
                "size": stat.st_size,
                "mtime": datetime.fromtimestamp(
                    stat.st_mtime, tz=timezone.utc
                ).isoformat(),
                "sha256": compute_file_hash(str(file_path)),
            }
            manifest["files"].append(entry)

    manifest["total_files"] = len(manifest["files"])
    return manifest


def analyze_timestamps(file_path: str) -> dict:
    """
    ファイルのタイムスタンプを取得する。
    MAC タイム（Modified・Accessed・Changed）は
    攻撃者の活動時刻の推定に使用する。
    注意: タイムスタンプは改ざん可能なため単独では証拠として弱い。
    """
    try:
        stat = os.stat(file_path)
        return {
            "modified":  datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
            "accessed":  datetime.fromtimestamp(stat.st_atime, tz=timezone.utc).isoformat(),
            "changed":   datetime.fromtimestamp(stat.st_ctime, tz=timezone.utc).isoformat(),
        }
    except FileNotFoundError:
        return {"error": "ファイルが見つかりません"}


# フォレンジクス調査のチェックリスト
print("=== デジタルフォレンジクス 初動対応チェックリスト ===\n")

checklist = {
    "事前準備": [
        "調査用のクリーンな USB / 外部ディスクを準備する",
        "対象システムの法的管轄と調査権限を確認する",
        "調査の開始日時・担当者・目的を記録する",
    ],
    "揮発性データの取得（先に実施）": [
        "実行中プロセスのリスト: ps aux / tasklist",
        "ネットワーク接続状態: netstat -anp / ss -anp",
        "ログインユーザー: who / w / last",
        "メモリダンプの取得: LiME（Linux）/ WinPmem（Windows）",
    ],
    "不揮発性データの取得": [
        "ディスクイメージの取得: dd if=/dev/sda of=/mnt/evidence/disk.img",
        "取得前後でハッシュを計算して完全性を確認",
        "バックアップからシャドウコピーを保護する",
    ],
    "解析": [
        "Autopsy でファイルシステムのタイムラインを作成",
        "削除ファイルの復元を試みる",
        "イベントログ・システムログの調査",
        "ネットワーク PCAP の取得・Wireshark で解析",
    ],
}

for phase, items in checklist.items():
    print(f"[{phase}]")
    for item in items:
        print(f"  - {item}")
    print()

# 使用例: 証拠台帳の作成
evidence = create_evidence_manifest("/tmp")
print(f"\n証拠台帳サンプル（/tmp の最初の3件）:")
for entry in evidence.get("files", [])[:3]:
    print(f"  {entry['path']:40s}  {entry['sha256'][:16]}...")
```

## 使用場面

- インシデント発生後のシステムからの証拠収集と保全
- ランサムウェア感染後の侵入経路・感染拡大経路の調査
- 不正アクセスが疑われる場合の社内調査と法的手続きの準備
- ログ・イベントビューア・シェル履歴から攻撃者の行動タイムラインを再構成
- CTF の Forensics 問題でディスクイメージ・PCAP を解析する（学習目的）

## 参考文献

- [NIST SP 800-86 - Guide to Integrating Forensic Techniques into Incident Response](https://csrc.nist.gov/publications/detail/sp/800-86/final)
- [Autopsy Digital Forensics Platform](https://www.sleuthkit.org/autopsy/)
- [The Sleuth Kit (TSK)](https://www.sleuthkit.org/sleuthkit/)
- [SANS - Digital Forensics and Incident Response](https://www.sans.org/digital-forensics-incident-response/)

<AffiliateBanner site="security_navi" />
