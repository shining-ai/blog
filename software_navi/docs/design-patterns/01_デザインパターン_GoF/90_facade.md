import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Facade パターン

## Facade とは

> サブシステムにある一連のインタフェースに対する統一インタフェースを定義する。Facade はサブシステムを使いやすくする高水準インタフェースを提供する。

Facade パターン（ファサードは「建物の正面」を意味するフランス語）は GoF の構造パターンのひとつです。複雑なサブシステムの前面にシンプルな窓口を置き、クライアントがサブシステムの詳細を知らなくても使えるようにします。

たとえばホームシアターを操作するには「アンプをオン」「プロジェクタをオン」「照明を暗くする」「DVDプレイヤーをオン」...と多くの手順が必要です。Facade はこれらを `watch_movie()` という単一の呼び出しに隠蔽します。

Facade は依存関係を減らし（サブシステムの知識がクライアントに漏れない）、サブシステムの実装変更がクライアントに波及しにくくなります。

## パターンの構造

| 要素 | 役割 |
|------|------|
| Facade | 簡略化されたインタフェースを提供。サブシステムを呼び出す |
| Subsystem クラス群 | 実際の処理を実装する複数のクラス |
| Client | Facade のみを通じてサブシステムを利用 |

```python title="Facade パターン（Python）"
# サブシステムのクラス群（複雑な内部実装）
class VideoDecoder:
    def decode(self, file: str) -> str:
        return f"decoded:{file}"

class AudioProcessor:
    def process(self, audio: str) -> str:
        return f"processed:{audio}"

class SubtitleLoader:
    def load(self, lang: str) -> str:
        return f"subtitles:{lang}"

class VideoPlayer:
    def play(self, video: str, audio: str, subtitle: str) -> None:
        print(f"Playing video={video}, audio={audio}, sub={subtitle}")

# Facade: 複雑な手順を隠蔽し、単純なインタフェースを提供
class MoviePlayerFacade:
    def __init__(self):
        self._decoder = VideoDecoder()
        self._audio = AudioProcessor()
        self._subtitle = SubtitleLoader()
        self._player = VideoPlayer()

    def play_movie(self, filepath: str, lang: str = "ja") -> None:
        video = self._decoder.decode(filepath)
        audio = self._audio.process(filepath)
        subtitle = self._subtitle.load(lang)
        self._player.play(video, audio, subtitle)

# クライアントはサブシステムを知らなくてよい
player = MoviePlayerFacade()
player.play_movie("movie.mp4", lang="en")
```

```typescript title="Facade パターン（TypeScript）"
class AuthService {
  authenticate(token: string): boolean {
    return token.startsWith("valid_");
  }
}

class CacheService {
  private store = new Map<string, unknown>();
  get(key: string) { return this.store.get(key); }
  set(key: string, value: unknown) { this.store.set(key, value); }
}

class DatabaseService {
  fetchUser(id: number) { return { id, name: `User${id}` }; }
}

// Facade
class UserFacade {
  private auth = new AuthService();
  private cache = new CacheService();
  private db = new DatabaseService();

  getUser(token: string, userId: number) {
    if (!this.auth.authenticate(token)) throw new Error("Unauthorized");
    const cached = this.cache.get(`user:${userId}`);
    if (cached) return cached;
    const user = this.db.fetchUser(userId);
    this.cache.set(`user:${userId}`, user);
    return user;
  }
}

const facade = new UserFacade();
console.log(facade.getUser("valid_token", 1));
```

## 使用場面

- 複雑なライブラリやフレームワークへの使いやすいエントリーポイントを提供するとき
- レイヤー間の依存を制限し、呼び出し口を統一したいとき
- 外部 API へのアクセスをラップして内部の詳細を隠蔽するとき

## 参考文献

- Erich Gamma, et al., *Design Patterns: Elements of Reusable Object-Oriented Software*, Addison-Wesley, 1994

<AffiliateBanner site="software_navi" />
