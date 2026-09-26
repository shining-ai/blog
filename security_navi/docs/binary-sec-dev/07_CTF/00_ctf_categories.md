import AffiliateBanner from '@site/src/components/AffiliateBanner';

# CTF のカテゴリ紹介（Pwn・Web・Crypto・Forensics・Rev）

## CTF とは

> CTF（Capture The Flag）とは、セキュリティの知識・技術を競うコンテストであり、各問題に隠された「フラグ（flag\{...} 形式の文字列）」を取得する形式で競われる。実際の攻撃・防御技術を教育目的で安全に学べる場として世界中のセキュリティエンジニアに活用されている。

CTF はセキュリティ入門者から上級者まで楽しめる形式になっており、チーム戦（Jeopardy 形式）と実際のサービスを守る攻防戦（Attack-Defense 形式）がある。CTF で培った技術は実際の脆弱性診断・インシデントレスポンス・セキュアコーディングに直結する。

**有名な CTF イベント：**
- **DEF CON CTF**（米国・世界最高峰）
- **picoCTF**（初心者向け・Carnegie Mellon 大学）
- **CTFtime.org**（CTF イベントのカレンダー・スコアボード）
- **pwn.college**（Pwn カテゴリの学習に特化）

## CTF の主要カテゴリ

| カテゴリ | 概要 | 主に学べる技術 | 入門難易度 |
|---------|------|-------------|----------|
| **Pwn（バイナリ）** | バイナリの脆弱性を突いてシェルを取得する | BOF・ROP・ヒープ・フォーマット文字列 | 難 |
| **Web** | Web アプリの脆弱性（SQL インジェクション・XSS 等）を悪用 | OWASP Top 10・認証バイパス | 易〜中 |
| **Crypto（暗号）** | 暗号実装の弱点を解析・解読する | RSA・AES・XOR・数論 | 中〜難 |
| **Forensics（法科学）** | ファイル・メモリ・ネットワークから証拠を発見する | ファイル解析・ステガノグラフィ・PCAP | 易〜中 |
| **Rev（リバース）** | バイナリを逆アセンブル・逆コンパイルして解析 | Ghidra・アセンブリ・アルゴリズム解析 | 中〜難 |
| **Misc（その他）** | 上記に分類されない多様な問題 | 暗号文・パズル・OSINT・ステガノグラフィ | 易〜中 |

```python
# CTF 入門のためのカテゴリ別学習ロードマップ
from dataclasses import dataclass

@dataclass
class CTFCategory:
    name: str
    description: str
    skills_needed: list[str]
    starter_tools: list[str]
    learning_resources: list[str]
    beginner_tips: list[str]


categories = [
    CTFCategory(
        name="Web",
        description="Web アプリの脆弱性を発見・悪用する。CTF の中で最も入門しやすいカテゴリ。",
        skills_needed=["HTTP の仕組み（リクエスト・レスポンス・Cookie）", "HTML / JavaScript の基礎",
                       "SQL の基礎", "Python や curl の使い方"],
        starter_tools=["Burp Suite（プロキシツール）", "curl", "Firefox DevTools", "OWASP ZAP"],
        learning_resources=["OWASP WebGoat（脆弱な Web アプリで学習）",
                             "PortSwigger Web Security Academy（無料・超高品質）",
                             "picoCTF の Web 問題"],
        beginner_tips=["まず Burp Suite の使い方を覚える",
                       "ソースコードのコメントにヒントが隠れていることが多い",
                       "Cookie・ヘッダ・URL パラメータを Burp で確認する"],
    ),
    CTFCategory(
        name="Forensics",
        description="ファイル・メモリダンプ・PCAP などから証拠やフラグを発見する。",
        skills_needed=["ファイルフォーマットの基礎知識（PNG・ZIP・PDF）",
                       "Linux コマンド（file・strings・xxd・binwalk）",
                       "Wireshark の基本操作"],
        starter_tools=["file・strings・xxd（標準コマンド）", "binwalk（ファイル内のデータ抽出）",
                       "Wireshark", "Volatility（メモリ解析）", "steghide（ステガノグラフィ）"],
        learning_resources=["picoCTF の Forensics 問題", "CTF Field Guide - Forensics",
                             "forensicscontests.com"],
        beginner_tips=["まず `file` コマンドで本当のファイル形式を確認する",
                       "画像ファイルはステガノグラフィ（隠しデータ）の可能性を疑う",
                       "strings コマンドでフラグが直接見つかることも多い"],
    ),
    CTFCategory(
        name="Crypto",
        description="暗号実装の弱点を数学的に分析して暗号文を解読する。",
        skills_needed=["XOR 演算の性質", "RSA 暗号の基礎（公開鍵・秘密鍵・素因数分解）",
                       "Python での数値計算（pycryptodome・gmpy2）", "数論の基礎"],
        starter_tools=["Python + pycryptodome", "SageMath（数学計算）",
                       "CyberChef（ブラウザで各種変換）", "Dcode.fr（古典暗号）"],
        learning_resources=["CryptoHack（インタラクティブな Crypto 学習プラットフォーム）",
                             "picoCTF の Crypto 問題", "CTF Field Guide - Cryptography"],
        beginner_tips=["まず古典暗号（Caesar・Vigenere・XOR）から始める",
                       "CTF の RSA 問題は小さすぎる素数・共通係数が多い",
                       "CyberChef でエンコード（Base64・Hex）を試す"],
    ),
    CTFCategory(
        name="Pwn",
        description="バイナリの脆弱性（BOF・フォーマット文字列等）を悪用してシェルを取得する。",
        skills_needed=["C言語の基礎とメモリ管理", "x86-64 アセンブリの基礎",
                       "Linux プロセスとシステムコール", "GDB の操作"],
        starter_tools=["pwndbg（GDB プラグイン）", "pwntools（Python ライブラリ）",
                       "checksec", "ROPgadget"],
        learning_resources=["pwn.college（段階的な Pwn 学習）",
                             "picoCTF の Binary Exploitation 問題",
                             "LiveOverflow の YouTube チャンネル"],
        beginner_tips=["まずスタック BOF から始める",
                       "checksec で保護機構を確認してから解法を考える",
                       "pwntools の process() で手動テストを繰り返す"],
    ),
]

for cat in categories:
    print(f"\n=== {cat.name} ===")
    print(f"概要: {cat.description}")
    print("必要スキル:")
    for s in cat.skills_needed:
        print(f"  - {s}")
    print("入門ツール:")
    for t in cat.starter_tools:
        print(f"  - {t}")
    print("入門のコツ:")
    for tip in cat.beginner_tips:
        print(f"  - {tip}")
```

## 使用場面

- セキュリティエンジニアとしての技術力向上と実践的な学習
- 新人セキュリティエンジニアへの技術教育（社内 CTF の開催）
- CTFtime.org でのチーム登録と定期的なイベント参加
- 就職・転職活動でのスキル実証（CTF のスコアと実績のアピール）
- セキュリティ研究者としての基礎技術の習得

## 参考文献

- [CTFtime.org - CTF Events Calendar](https://ctftime.org/)
- [picoCTF - Carnegie Mellon Beginner CTF](https://picoctf.org/)
- [pwn.college - Binary Exploitation Learning](https://pwn.college/)
- [CTF Field Guide - Trail of Bits](https://trailofbits.github.io/ctf/)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security)

<AffiliateBanner site="security_navi" />
