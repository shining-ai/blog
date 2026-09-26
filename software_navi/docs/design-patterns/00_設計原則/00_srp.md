import AffiliateBanner from '@site/src/components/AffiliateBanner';

# SOLID原則 S: 単一責任の原則（SRP）

## 単一責任の原則とは

> クラスを変更する理由は、たったひとつだけであるべきである。（A class should have only one reason to change.）

単一責任の原則（Single Responsibility Principle, SRP）は、SOLID原則の中で最初に挙げられる設計原則です。「責任」とは「変更する理由」のことであり、ひとつのクラスが複数の異なる関心事を担当していると、そのどれかが変わるたびにクラス全体に影響が波及します。

たとえば「ユーザーデータの保存」と「メール通知の送信」を同一クラスが担っていると、通知の仕様変更だけでストレージロジックを含むクラスを修正しなければなりません。SRPに従ってクラスを分割することで、変更の影響範囲を最小限に抑えられます。

SRPは単に「クラスを小さく保て」という指針ではなく、「誰のための変更なのか（アクター）」を意識することが本質です。ビジネスロジック・UI・インフラなど、変更を要求するアクターが異なる処理は別のクラスに分離します。

## 違反例と改善例

| 状態 | 説明 |
|------|------|
| 違反 | `UserService` がデータ保存・メール送信・ログ出力を全て担当 |
| 改善 | `UserRepository`・`EmailService`・`Logger` に分割 |

```python title="SRP 違反例"
class UserService:
    def save_user(self, user):
        # DBへの保存
        db.save(user)
        # メール送信
        smtp.send(user.email, "登録完了")
        # ログ記録
        log.write(f"User {user.id} saved")
```

```python title="SRP 適用例"
class UserRepository:
    def save(self, user):
        db.save(user)

class EmailService:
    def send_welcome(self, email: str):
        smtp.send(email, "登録完了")

class UserLogger:
    def log_saved(self, user_id: int):
        log.write(f"User {user_id} saved")

class UserService:
    def __init__(self, repo: UserRepository, email: EmailService, logger: UserLogger):
        self.repo = repo
        self.email = email
        self.logger = logger

    def register(self, user):
        self.repo.save(user)
        self.email.send_welcome(user.email)
        self.logger.log_saved(user.id)
```

## 使用場面

- 大きなクラスが複数の異なる理由で変更されている場合のリファクタリング
- チーム開発で担当領域を明確に分けたいとき
- テスタビリティを高め、単体テストを書きやすくしたいとき

## 参考文献

- Robert C. Martin, *Clean Architecture*, Prentice Hall, 2017
- Robert C. Martin, *Agile Software Development*, Prentice Hall, 2002

<AffiliateBanner site="software_navi" />
