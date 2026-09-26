import AffiliateBanner from '@site/src/components/AffiliateBanner';

# モック・スタブ・フェイクの使い分け

## テストダブルとは

> テストダブルとは、テスト対象が依存するコンポーネントを本物の代わりに使用する代替物の総称。Gerard Meszaros が定義したモック・スタブ・フェイク・スパイ・ダミーの5種類がある。

「モック」という言葉は日常的に「テスト用の偽物」全般を指しますが、Gerard Meszaros の定義では異なる種類に分類されます。適切な使い分けによりテストの意図が明確になり、過剰モックによる「テストが実装の詳細に依存する問題」を回避できます。

スタブは「決まった値を返す偽物」です。DBクエリが常に特定のユーザーを返すよう固定する場合が典型です。フェイクは「本物より単純だが動く実装」です。インメモリDBがその代表例です。モックは「期待通りの呼び出しが行われたかを検証する偽物」です。メール送信サービスが実際には呼ばれていないことを確認するなどに使います。スパイは「実際の実装を呼びつつ、呼び出しを記録する偽物」です。

## テストダブルの種類

| 種類 | 目的 | 検証対象 | 実装 |
|------|------|---------|------|
| Dummy | 引数の穴埋め。実際には使われない | なし | null・空オブジェクト |
| Stub | 固定値・定義済み応答を返す | なし | ハードコードされた戻り値 |
| Fake | 動くが本番非対応の軽量実装 | なし | インメモリDB・FileSystem |
| Spy | 実装を呼びつつ呼び出しを記録 | 呼び出し回数・引数 | 実実装 + 記録 |
| Mock | 期待通りの呼び出しを事前定義し検証 | 呼び出し順・引数 | 期待値の事前定義 |

```python title="テストダブルの実装例（Python / unittest.mock）"
from unittest.mock import Mock, MagicMock, patch
import pytest

# ===== プロダクションコード =====
class EmailService:
    def send(self, to: str, subject: str, body: str) -> bool: ...

class NotificationService:
    def __init__(self, email_svc: EmailService):
        self._email = email_svc

    def notify_user(self, email: str, message: str) -> bool:
        return self._email.send(email, subject="通知", body=message)


# ===== Stub: 固定値を返す =====
def test_notify_returns_true_when_email_succeeds():
    stub_email = Mock(spec=EmailService)
    stub_email.send.return_value = True  # 常にTrueを返す

    svc = NotificationService(stub_email)
    assert svc.notify_user("user@example.com", "hello") is True


# ===== Mock: 呼び出しを検証する =====
def test_notify_calls_email_with_correct_args():
    mock_email = Mock(spec=EmailService)
    mock_email.send.return_value = True

    svc = NotificationService(mock_email)
    svc.notify_user("user@example.com", "hello")

    mock_email.send.assert_called_once_with(
        "user@example.com", subject="通知", body="hello"
    )


# ===== Fake: 動くが本番非対応の実装 =====
class FakeEmailService(EmailService):
    def __init__(self):
        self.sent: list[dict] = []

    def send(self, to: str, subject: str, body: str) -> bool:
        self.sent.append({"to": to, "subject": subject, "body": body})
        return True

def test_notify_with_fake_email():
    fake = FakeEmailService()
    svc  = NotificationService(fake)
    svc.notify_user("a@example.com", "msg1")
    svc.notify_user("b@example.com", "msg2")

    assert len(fake.sent) == 2
    assert fake.sent[0]["to"] == "a@example.com"
```

```typescript title="テストダブル — Jest のモック（TypeScript）"
interface PaymentGateway {
  charge(amount: number, token: string): Promise<boolean>;
}

class OrderPaymentService {
  constructor(private gateway: PaymentGateway) {}

  async pay(amount: number, token: string): Promise<string> {
    const ok = await this.gateway.charge(amount, token);
    return ok ? "SUCCESS" : "FAILED";
  }
}

// Mock: Jest の自動モック
test("pay returns SUCCESS when gateway succeeds", async () => {
  const mockGateway: jest.Mocked<PaymentGateway> = {
    charge: jest.fn().mockResolvedValue(true),
  };
  const svc = new OrderPaymentService(mockGateway);
  expect(await svc.pay(1000, "tok_test")).toBe("SUCCESS");
  expect(mockGateway.charge).toHaveBeenCalledWith(1000, "tok_test");
});
```

## 使用場面

- 外部APIやDBに依存するコードのユニットテストでStub/Mockを使う
- メール送信・決済など副作用を持つ処理の呼び出し確認にMockを使う
- テスト全体でインメモリリポジトリ（Fake）を使ってDB依存をなくす

## 参考文献

- Gerard Meszaros, *xUnit Test Patterns*, Addison-Wesley, 2007
- Martin Fowler, *Mocks Aren't Stubs*, https://martinfowler.com/articles/mocksArentStubs.html

<AffiliateBanner site="software_navi" />
