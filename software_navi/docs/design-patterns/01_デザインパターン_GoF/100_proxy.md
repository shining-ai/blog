import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Proxy パターン

## Proxy とは

> あるオブジェクトへのアクセスを制御するため、そのオブジェクトの代理または代役となるオブジェクトを提供する。

Proxy パターンは GoF の構造パターンのひとつです。実際のオブジェクト（Real Subject）と同じインタフェースを持つ代理オブジェクト（Proxy）を介してアクセスすることで、アクセス制御・遅延初期化・キャッシュ・ロギングなどの横断的関心事を追加できます。

Proxy の種類は主に4つあります。**仮想プロキシ（Virtual Proxy）**は重いオブジェクトを必要になるまで初期化しない遅延初期化を提供します。**保護プロキシ（Protection Proxy）**はアクセス権限をチェックします。**リモートプロキシ（Remote Proxy）**は別のプロセスやネットワーク越しのオブジェクトへの透過的アクセスを提供します（RPC・gRPCのスタブ等）。**キャッシングプロキシ**は結果をキャッシュして繰り返しの計算を省きます。

## Proxy の種類

| 種類 | 用途 |
|------|------|
| 仮想プロキシ | 重いオブジェクトの遅延初期化 |
| 保護プロキシ | アクセス制御・認可 |
| リモートプロキシ | 別プロセス・ネットワーク越しのアクセス透過化 |
| キャッシングプロキシ | 結果のキャッシュ・メモ化 |

```python title="Proxy パターン — 仮想プロキシ（Python）"
from abc import ABC, abstractmethod

class Image(ABC):
    @abstractmethod
    def display(self) -> None: ...

class RealImage(Image):
    def __init__(self, filename: str):
        self._filename = filename
        self._load()  # コンストラクタで重いロード処理

    def _load(self) -> None:
        print(f"[RealImage] Loading {self._filename} from disk...")

    def display(self) -> None:
        print(f"[RealImage] Displaying {self._filename}")

class ImageProxy(Image):
    """遅延初期化: display() が呼ばれるまで RealImage を生成しない"""
    def __init__(self, filename: str):
        self._filename = filename
        self._real_image: RealImage | None = None

    def display(self) -> None:
        if self._real_image is None:
            self._real_image = RealImage(self._filename)
        self._real_image.display()

# Proxy を使う側は RealImage か Proxy かを意識しない
images: list[Image] = [
    ImageProxy("photo1.jpg"),
    ImageProxy("photo2.jpg"),
]

print("-- Displaying image 1 --")
images[0].display()  # ここで初めてロード
print("-- Displaying image 1 again --")
images[0].display()  # 2回目はキャッシュ済み
```

```python title="Proxy パターン — 保護プロキシ（Python）"
class DatabaseService:
    def delete_record(self, record_id: int) -> None:
        print(f"Deleting record {record_id}")

class SecureDatabaseProxy:
    def __init__(self, service: DatabaseService, user_role: str):
        self._service = service
        self._role = user_role

    def delete_record(self, record_id: int) -> None:
        if self._role != "admin":
            raise PermissionError("Only admin can delete records")
        self._service.delete_record(record_id)

proxy = SecureDatabaseProxy(DatabaseService(), "guest")
try:
    proxy.delete_record(1)
except PermissionError as e:
    print(e)  # Only admin can delete records
```

## 使用場面

- 重い画像・動画のレイジーロード（仮想プロキシ）
- API のアクセス制御・認可チェック（保護プロキシ）
- gRPC・REST クライアントのスタブ生成（リモートプロキシ）

## 参考文献

- Erich Gamma, et al., *Design Patterns: Elements of Reusable Object-Oriented Software*, Addison-Wesley, 1994

<AffiliateBanner site="software_navi" />
