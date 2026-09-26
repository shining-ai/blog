import AffiliateBanner from '@site/src/components/AffiliateBanner';

# メールプロトコル（SMTP・IMAP）

## メールプロトコルとは

> メールプロトコルとは電子メールの送信・受信・管理を行うアプリケーション層プロトコルの総称であり、送信に SMTP（Simple Mail Transfer Protocol）、受信・管理に IMAP（Internet Message Access Protocol）または POP3 が用いられる。

電子メールの送受信は複数のプロトコルが役割分担して行います。メールクライアント（MUA: Mail User Agent）がメールを書き、SMTP でメールサーバ（MTA: Mail Transfer Agent）に送信します。MTA は宛先ドメインの MX レコードを DNS で解決し、宛先の MTA に SMTP で転送します。受信したメールは MDA（Mail Delivery Agent）がメールボックスに保存し、ユーザは IMAP または POP3 でメールクライアントに読み込みます。

SMTP（RFC 5321）はメール送信と MTA 間転送のプロトコルです。TCP ポート 25（MTA 間）、587（送信 SMTP）、465（SMTPS）を使用します。コマンドは EHLO、MAIL FROM、RCPT TO、DATA、QUIT などテキストベースです。

IMAP（RFC 9051）はメールをサーバに残したまま管理するプロトコルで、複数デバイスからの同期に適しています。フォルダ（INBOX・Sent など）の管理、フラグ付け（既読・重要）、サーバ側検索をサポートします。TCP ポート 143（平文）、993（IMAPS/TLS）を使用します。

POP3 はメールをダウンロードして削除するシンプルなプロトコルで、オフライン環境向きです。現代のマルチデバイス環境では IMAP が主流です。

## SMTP・IMAP・POP3 の比較

| 項目 | SMTP | IMAP | POP3 |
|------|------|------|------|
| 役割 | 送信・転送 | 受信・管理（サーバ保持） | 受信（ダウンロード） |
| ポート | 25, 587, 465 | 143, 993 | 110, 995 |
| メール保存場所 | サーバ | サーバ | クライアント |
| 複数デバイス同期 | — | 対応 | 困難 |
| フォルダ管理 | — | サーバ側で管理 | クライアント側のみ |

```python
import smtplib
import imaplib
import email
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import decode_header
from datetime import datetime, timezone

# ===========================
# SMTP コマンドシーケンスの概念デモ
# ===========================

class SMTPSession:
    """SMTP セッションの概念的シミュレーション"""

    def __init__(self, host: str, port: int):
        self.host = host
        self.port = port
        self.log: list[tuple[str, str]] = []

    def _exchange(self, direction: str, command: str, response: str) -> None:
        self.log.append((direction, command, response))
        arrow = "C→S" if direction == "client" else "S→C"
        print(f"  {arrow}: {command.rstrip()}")
        if response:
            print(f"  S→C: {response.rstrip()}")

    def simulate_send(
        self,
        sender: str,
        recipient: str,
        subject: str,
        body: str,
    ) -> None:
        """SMTP での送信コマンドシーケンスをシミュレート"""
        print(f"[SMTP セッション: {self.host}:{self.port}]")
        print()

        # 接続
        self._exchange("server", "", f"220 {self.host} ESMTP ready")

        # EHLO
        self._exchange("client", f"EHLO mail.example.com", "")
        print(f"  S→C: 250-{self.host} Hello")
        print(f"  S→C: 250-AUTH PLAIN LOGIN")
        print(f"  S→C: 250-STARTTLS")
        print(f"  S→C: 250 SIZE 52428800")
        print()

        # STARTTLS
        self._exchange("client", "STARTTLS", "220 Ready to start TLS")
        print(f"  [TLS ハンドシェイク完了]")

        # 認証
        self._exchange("client", "AUTH LOGIN", "334 username:")
        self._exchange("client", "<base64(username)>", "334 password:")
        self._exchange("client", "<base64(password)>", "235 Authentication successful")

        # メール送信
        self._exchange("client", f"MAIL FROM:<{sender}>", f"250 OK")
        self._exchange("client", f"RCPT TO:<{recipient}>", f"250 OK")
        self._exchange("client", "DATA", "354 Start mail input; end with <CRLF>.<CRLF>")

        # ヘッダとボディ
        date_str = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")
        print(f"  C→S: From: {sender}")
        print(f"  C→S: To: {recipient}")
        print(f"  C→S: Subject: {subject}")
        print(f"  C→S: Date: {date_str}")
        print(f"  C→S: MIME-Version: 1.0")
        print(f"  C→S: Content-Type: text/plain; charset=utf-8")
        print(f"  C→S: ")
        print(f"  C→S: {body}")
        print(f"  C→S: .")

        print(f"  S→C: 250 Message queued as abc123")
        self._exchange("client", "QUIT", "221 Bye")


# ===========================
# IMAP コマンドシーケンスのデモ
# ===========================

class IMAPSession:
    """IMAP セッションの概念的シミュレーション"""

    def __init__(self, host: str):
        self.host = host
        self.tag = 0

    def _cmd(self, command: str, response: str) -> str:
        self.tag += 1
        tag = f"A{self.tag:04d}"
        print(f"  C→S: {tag} {command}")
        for line in response.strip().split("\n"):
            print(f"  S→C: {line.strip()}")
        return tag

    def simulate_fetch(self) -> None:
        """IMAP でのメール取得コマンドシーケンスをシミュレート"""
        print(f"[IMAP セッション: {self.host}:993 (TLS)]")
        print(f"  S→C: * OK {self.host} IMAP4rev2 Service Ready")
        print()

        # ログイン
        self._cmd(
            "LOGIN user@example.com password",
            "* CAPABILITY IMAP4rev2 SORT THREAD=REFERENCES\n"
            "A0001 OK LOGIN completed"
        )
        print()

        # INBOX 選択
        self._cmd(
            "SELECT INBOX",
            "* 42 EXISTS\n"
            "* 3 RECENT\n"
            "* OK [UNSEEN 40] Message 40 is first unseen\n"
            "* FLAGS (\\Answered \\Flagged \\Deleted \\Seen \\Draft)\n"
            "A0002 OK [READ-WRITE] SELECT completed"
        )
        print()

        # 未読メール検索
        self._cmd(
            "SEARCH UNSEEN",
            "* SEARCH 40 41 42\n"
            "A0003 OK SEARCH completed"
        )
        print()

        # メール取得（エンベロープ + ボディ）
        self._cmd(
            "FETCH 42 (FLAGS ENVELOPE BODY[TEXT])",
            '* 42 FETCH (FLAGS (\\Recent) ENVELOPE ("Wed, 11 Jun 2026 10:00:00 +0000"'
            ' "IMAP テスト" (("Alice" NIL "alice" "example.com")) NIL NIL'
            ' (("Bob" NIL "bob" "example.com")) NIL NIL NIL "<msgid@example.com>")'
            ' BODY[TEXT] {28}\r\nこれはテスト本文です。\r\n)\n'
            "A0004 OK FETCH completed"
        )
        print()

        # メールを既読にマーク
        self._cmd(
            "STORE 42 +FLAGS (\\Seen)",
            "* 42 FETCH (FLAGS (\\Recent \\Seen))\n"
            "A0005 OK STORE completed"
        )
        print()

        # ログアウト
        self._cmd("LOGOUT", "* BYE IMAP4rev2 Server logging out\nA0006 OK LOGOUT completed")


# ===========================
# MIMEメール構造の例
# ===========================

def create_mime_email(sender: str, recipient: str, subject: str, body_html: str, body_text: str) -> str:
    """MIME マルチパートメールを作成"""
    msg = MIMEMultipart("alternative")
    msg["From"] = sender
    msg["To"] = recipient
    msg["Subject"] = subject

    part_text = MIMEText(body_text, "plain", "utf-8")
    part_html = MIMEText(body_html, "html", "utf-8")

    msg.attach(part_text)
    msg.attach(part_html)
    return msg.as_string()


print("=== メールプロトコルデモ ===\n")

smtp = SMTPSession("smtp.example.com", 587)
smtp.simulate_send(
    sender="alice@example.com",
    recipient="bob@example.com",
    subject="Hello from Python",
    body="こんにちは、Bob！WebSocket の記事を書きました。",
)

print("\n" + "="*60 + "\n")

imap = IMAPSession("imap.example.com")
imap.simulate_fetch()

print("\n[SPF・DKIM・DMARC: メール認証の 3 本柱]")
auth_info = [
    ("SPF",  "送信元 IP が DNS の TXT レコードに登録されているか検証"),
    ("DKIM", "秘密鍵で署名し、公開鍵（DNS）で検証。改ざん検知"),
    ("DMARC","SPF/DKIM の結果を元にポリシーを定義（reject/quarantine/none）"),
]
for name, desc in auth_info:
    print(f"  {name}: {desc}")
```

## 使用場面

- アプリケーションからトランザクションメール（注文確認・パスワードリセット）を SMTP で送信する場面
- メールクライアントで複数デバイスから同じ受信ボックスを IMAP で同期管理する場面
- スパムフィルタリングや迷惑メール対策のために SPF・DKIM・DMARC を設定する場面

## 参考文献

- [RFC 5321 – Simple Mail Transfer Protocol](https://www.rfc-editor.org/rfc/rfc5321)
- [RFC 9051 – Internet Message Access Protocol (IMAP) Version 4rev2](https://www.rfc-editor.org/rfc/rfc9051)
- [RFC 7208 – Sender Policy Framework (SPF)](https://www.rfc-editor.org/rfc/rfc7208)

<AffiliateBanner site="network_navi" />
