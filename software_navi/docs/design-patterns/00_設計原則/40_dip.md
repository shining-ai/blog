import AffiliateBanner from '@site/src/components/AffiliateBanner';

# SOLID原則 D: 依存性逆転の原則（DIP）

## 依存性逆転の原則とは

> 上位モジュールは下位モジュールに依存してはならない。どちらも抽象に依存すべきである。抽象は詳細に依存してはならない。詳細が抽象に依存すべきである。

依存性逆転の原則（Dependency Inversion Principle, DIP）は、高レベルのビジネスロジックが低レベルの実装詳細（データベース、メール、ファイルシステム等）に直接依存しないよう設計する原則です。

従来の手続き型設計では上位層が下位層を直接呼び出します（ユースケース → MySQL → OS）。DIPはこの依存の向きを逆転させ、上位層と下位層の両方を抽象（インタフェース）に依存させます。具体的な実装は抽象に従って組み立てられ（依存性注入）、上位モジュールのテストも容易になります。

DIPとDI（Dependency Injection）は異なります。DIPは設計原則であり、DIはDIPを実現する手段のひとつです。DIコンテナ（Spring, FastAPI Depends等）を使わなくても、コンストラクタ引数で渡すだけでDIPを実現できます。

## 依存関係の比較

| 状態 | 依存の向き |
|------|------------|
| 違反 | `UserService` → `MySQLUserRepository`（具体クラスに依存） |
| 改善 | `UserService` → `IUserRepository` ← `MySQLUserRepository` |

```python title="DIP 違反例"
class MySQLUserRepository:
    def find_by_id(self, user_id: int):
        # MySQL固有の実装
        return db.query(f"SELECT * FROM users WHERE id={user_id}")

class UserService:
    def __init__(self):
        self.repo = MySQLUserRepository()  # 具体クラスに直接依存

    def get_user(self, user_id: int):
        return self.repo.find_by_id(user_id)
```

```python title="DIP 適用例"
from abc import ABC, abstractmethod

class IUserRepository(ABC):
    @abstractmethod
    def find_by_id(self, user_id: int): ...

class MySQLUserRepository(IUserRepository):
    def find_by_id(self, user_id: int):
        return db.query(f"SELECT * FROM users WHERE id={user_id}")

class InMemoryUserRepository(IUserRepository):  # テスト用
    def __init__(self):
        self._store = {}

    def find_by_id(self, user_id: int):
        return self._store.get(user_id)

class UserService:
    def __init__(self, repo: IUserRepository):  # 抽象に依存
        self.repo = repo

    def get_user(self, user_id: int):
        return self.repo.find_by_id(user_id)

# 本番
service = UserService(MySQLUserRepository())
# テスト
service = UserService(InMemoryUserRepository())
```

## 使用場面

- データベースや外部サービスをモックに差し替えてテストしたいとき
- 将来的にインフラ層を変更する可能性があるアプリケーション設計
- クリーンアーキテクチャやヘキサゴナルアーキテクチャの実装

## 参考文献

- Robert C. Martin, *Clean Architecture*, Prentice Hall, 2017
- Martin Fowler, "Inversion of Control Containers and the Dependency Injection pattern", martinfowler.com

<AffiliateBanner site="software_navi" />
