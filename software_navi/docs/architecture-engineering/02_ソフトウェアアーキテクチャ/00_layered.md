import AffiliateBanner from '@site/src/components/AffiliateBanner';

# レイヤードアーキテクチャ

## レイヤードアーキテクチャとは

> ソフトウェアを関心事ごとに水平な層（レイヤー）に分割し、各レイヤーは隣接するレイヤーとのみ依存する構造。

レイヤードアーキテクチャ（Layered Architecture）は最も古典的かつ広く普及したアーキテクチャパターンです。「プレゼンテーション層」「アプリケーション層」「ドメイン層」「インフラ層」のように関心事を水平に分割し、上位レイヤーが下位レイヤーを呼び出す一方向の依存関係を持たせます。

この構造により、各レイヤーの責務が明確になり、テスト・保守・チーム分業がしやすくなります。たとえばデータベースをMySQLからPostgreSQLに変更する場合、インフラ層だけを修正すれば済みます。

一方で「ループ依存」や「レイヤースキップ」といったアンチパターンが生じやすく、単純なCRUD処理でもすべてのレイヤーを通過することによるオーバーエンジニアリングに注意が必要です。

## 各レイヤーの役割

| レイヤー | 別名 | 責務 |
|----------|------|------|
| Presentation | UI / Controller | ユーザー入力の受付・レスポンスの返却 |
| Application | Use Case / Service | ユースケースのオーケストレーション |
| Domain | Business Logic | ビジネスルール・エンティティ |
| Infrastructure | Data Access | DB・外部API・ファイルI/O |

```python title="レイヤードアーキテクチャ — ユーザー登録（Python）"
# --- Domain Layer ---
from dataclasses import dataclass

@dataclass
class User:
    id: int
    name: str
    email: str

    def validate(self) -> None:
        if "@" not in self.email:
            raise ValueError("Invalid email")


# --- Infrastructure Layer ---
class UserRepository:
    def __init__(self):
        self._store: dict[int, User] = {}

    def save(self, user: User) -> None:
        self._store[user.id] = user

    def find_by_id(self, user_id: int) -> User | None:
        return self._store.get(user_id)


# --- Application Layer ---
class UserService:
    def __init__(self, repo: UserRepository):
        self._repo = repo

    def register(self, user_id: int, name: str, email: str) -> User:
        user = User(id=user_id, name=name, email=email)
        user.validate()
        self._repo.save(user)
        return user


# --- Presentation Layer ---
class UserController:
    def __init__(self, service: UserService):
        self._service = service

    def handle_register(self, payload: dict) -> dict:
        try:
            user = self._service.register(**payload)
            return {"status": 201, "user": {"id": user.id, "name": user.name}}
        except ValueError as e:
            return {"status": 400, "error": str(e)}


repo       = UserRepository()
service    = UserService(repo)
controller = UserController(service)

print(controller.handle_register({"user_id": 1, "name": "Alice", "email": "alice@example.com"}))
# {'status': 201, 'user': {'id': 1, 'name': 'Alice'}}
```

## 使用場面

- 中規模以上のWebアプリケーション全般
- チームを機能横断的ではなくレイヤーごとに分業するとき
- 最初のアーキテクチャ選択として、後から他のパターンに移行するベースライン

## 参考文献

- Martin Fowler, *Patterns of Enterprise Application Architecture*, Addison-Wesley, 2002

<AffiliateBanner site="software_navi" />
