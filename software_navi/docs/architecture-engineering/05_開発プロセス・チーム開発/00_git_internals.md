import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Git の内部構造（オブジェクト・ツリー・コミット）

## Git の内部構造とは

> Git の内部は、すべてのデータを「オブジェクト」として `.git/objects/` ディレクトリに格納するコンテンツアドレス可能ストレージ（CAS）であり、blob・tree・commit・tag の4種類のオブジェクトとブランチ・タグなどの「参照」で構成される。

Git を理解するには「Git は差分ではなくスナップショットを保存する」という核心を押さえることが重要である。各コミットはその時点のファイルツリー全体のスナップショットへのポインタを持ち、ファイルの差分はコミット間の比較によって求められる。

**blob オブジェクト**はファイルの内容そのものを格納する。ファイル名やパーミッションは持たない。**tree オブジェクト**はディレクトリの内容（blob や他の tree への参照 + ファイル名 + モード）を格納する。**commit オブジェクト**は tree オブジェクトへのポインタ・親コミット・作者・コミットメッセージを格納する。すべてのオブジェクトは内容の SHA-1 ハッシュ値で識別されるため、内容が同じファイルは同一の blob として格納される（重複排除）。

**参照（refs）**は `.git/refs/` に格納され、ブランチ（`refs/heads/`）・タグ（`refs/tags/`）・リモート追跡ブランチ（`refs/remotes/`）がある。`HEAD` は現在チェックアウトしているブランチへのポインタである。

## Git オブジェクトの種類

| オブジェクト | 格納内容 | 対応するもの |
|------------|---------|------------|
| blob | ファイルの生データ | ファイル内容 |
| tree | blob/tree の一覧 + 名前 + モード | ディレクトリ |
| commit | tree + 親 + 著者 + メッセージ | コミット |
| tag | オブジェクト + タグ情報 | アノテーションタグ |

```bash
# Git の内部構造を実際に確認するコマンド集

# リポジトリを初期化してファイルを追加
git init /tmp/git-internals-demo
cd /tmp/git-internals-demo
echo "Hello, Git!" > hello.txt
git add hello.txt

# ===== blob オブジェクトの確認 =====
# git add 直後に blob が作成される
echo "=== blob オブジェクト ==="
git cat-file -t $(git hash-object hello.txt)    # "blob"
git cat-file -p $(git hash-object hello.txt)    # "Hello, Git!"

# ===== コミットを作成 =====
git config user.email "demo@example.com"
git config user.name "Demo User"
git commit -m "Initial commit"

# コミットハッシュを取得
COMMIT_HASH=$(git rev-parse HEAD)
echo "コミットハッシュ: $COMMIT_HASH"

# ===== commit オブジェクトの確認 =====
echo "=== commit オブジェクトの内容 ==="
git cat-file -p $COMMIT_HASH
# tree <hash>       ← tree オブジェクトへのポインタ
# author ...
# committer ...
# (空行)
# Initial commit

# ===== tree オブジェクトの確認 =====
TREE_HASH=$(git cat-file -p $COMMIT_HASH | grep "^tree" | awk '{print $2}')
echo "=== tree オブジェクトの内容 ==="
git cat-file -p $TREE_HASH
# 100644 blob <hash>  hello.txt

# ===== .git の構造確認 =====
echo "=== .git ディレクトリ構造 ==="
find /tmp/git-internals-demo/.git -type f | sort | head -30

# ===== reflog で参照履歴を確認 =====
echo "=== reflog ==="
git reflog --oneline | head -5

# ===== オブジェクトの圧縮（packfile）=====
# 多くのコミットがある場合、Git は loose objects を packfile に圧縮する
git gc --auto   # 必要に応じてパック化
ls /tmp/git-internals-demo/.git/objects/pack/ 2>/dev/null || echo "packfile なし（loose objects のまま）"
```

```python
# Python で Git の SHA-1 ハッシュ計算を再現する

import hashlib
import zlib
from pathlib import Path

def compute_git_blob_hash(content: str | bytes) -> str:
    """
    Git blob オブジェクトの SHA-1 ハッシュを計算する。
    Git は "blob <size>\0<content>" の形式でハッシュを計算する。
    """
    if isinstance(content, str):
        content = content.encode("utf-8")

    header = f"blob {len(content)}\0".encode("utf-8")
    full_content = header + content

    sha1 = hashlib.sha1(full_content).hexdigest()
    return sha1


def create_git_object_bytes(obj_type: str, content: bytes) -> bytes:
    """Git オブジェクトのバイト列を生成（zlib 圧縮前）"""
    header = f"{obj_type} {len(content)}\0".encode()
    return zlib.compress(header + content)


# デモ
content = "Hello, Git!\n"
sha1 = compute_git_blob_hash(content)
print(f"blob ハッシュ: {sha1}")
print(f"  オブジェクトパス: .git/objects/{sha1[:2]}/{sha1[2:]}")
# git hash-object hello.txt の出力と一致する

# コミットオブジェクトの構造を文字列で確認
tree_hash = "a" * 40  # 仮のツリーハッシュ
commit_content = (
    f"tree {tree_hash}\n"
    f"author Demo User <demo@example.com> 1700000000 +0900\n"
    f"committer Demo User <demo@example.com> 1700000000 +0900\n"
    f"\n"
    f"Initial commit\n"
)
commit_sha1 = compute_git_blob_hash(commit_content.encode())
print(f"\ncommit オブジェクトの構造:\n{commit_content}")
print(f"commit ハッシュ（仮）: {compute_git_blob_hash(commit_content)}")
```

## 使用場面

- `git reflog` で誤った `git reset --hard` からの復旧
- `git cat-file` でオブジェクトの内容を直接確認してデバッグ
- Git の内部理解をベースに高度な `rebase`・`cherry-pick`・`bisect` を使いこなす
- CI/CD でのコミットハッシュを用いたイミュータブルデプロイメント管理

## 参考文献

- Chacon, S. & Straub, B. (2022). *Pro Git* (2nd ed.). Apress. [無料公開](https://git-scm.com/book/ja/v2)
- [Git Internals - Plumbing and Porcelain](https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain)

<AffiliateBanner site="software_navi" />
