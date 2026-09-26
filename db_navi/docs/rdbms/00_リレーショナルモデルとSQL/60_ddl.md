import AffiliateBanner from '@site/src/components/AffiliateBanner';

# DDL（CREATE・ALTER・DROP）

## DDL とは

> DDL（Data Definition Language）とは、データベースのスキーマ（テーブル・インデックス・制約・シーケンスなど）の構造を定義・変更・削除するためのSQLサブセットであり、`CREATE`・`ALTER`・`DROP`・`TRUNCATE` などの命令で構成される。

DDLはデータベースの「設計図」を操作する言語です。アプリケーションのデータ構造の定義から、本番環境へのスキーマ変更まで、DDLはデータベース管理の基盤となります。DDLは通常、実行と同時に自動コミットされるため（一部のDBMSを除く）、実行前に十分な検討が必要です。

`CREATE TABLE` でテーブルを作成する際、列の型・制約（PRIMARY KEY・NOT NULL・UNIQUE・CHECK・DEFAULT）を定義します。`ALTER TABLE` は既存テーブルへの列追加・変更・削除・制約の追加・削除を行います。`DROP TABLE` はテーブルとそのデータを完全に削除し、`TRUNCATE TABLE` はテーブル定義を保持したまま全行を高速に削除します。

PostgreSQLはDDLをトランザクション内で実行できるため、失敗時にロールバックが可能です。MySQLなど一部のDBMSはDDLが自動コミットされます。

## DDL コマンドの比較

| コマンド | 対象 | 説明 |
|---------|------|------|
| `CREATE TABLE` | テーブル | テーブルの新規作成 |
| `CREATE INDEX` | インデックス | インデックスの作成 |
| `ALTER TABLE ADD COLUMN` | 列 | 列の追加 |
| `ALTER TABLE ALTER COLUMN` | 列 | 列の型・デフォルト変更 |
| `ALTER TABLE DROP COLUMN` | 列 | 列の削除 |
| `ALTER TABLE ADD CONSTRAINT` | 制約 | 制約の追加 |
| `DROP TABLE` | テーブル | テーブルの完全削除 |
| `TRUNCATE TABLE` | データ | テーブルの全行削除（構造は保持） |
| `RENAME TABLE` | テーブル | テーブル名の変更 |

```sql
-- テーブルの作成（各種制約付き）
CREATE TABLE users (
    id         SERIAL       PRIMARY KEY,            -- 自動採番の主キー
    username   VARCHAR(50)  NOT NULL UNIQUE,         -- NULL禁止 + 一意制約
    email      VARCHAR(255) NOT NULL UNIQUE,
    age        INT          CHECK (age >= 0 AND age <= 150),  -- CHECK制約
    status     VARCHAR(20)  NOT NULL DEFAULT 'active',        -- デフォルト値
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 外部キー制約付きテーブル
CREATE TABLE user_profiles (
    user_id    INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio        TEXT,
    avatar_url VARCHAR(500)
);

-- インデックスの作成
CREATE INDEX idx_users_email   ON users(email);
CREATE INDEX idx_users_status  ON users(status);
CREATE INDEX idx_users_created ON users(created_at DESC);

-- ユニークインデックス
CREATE UNIQUE INDEX idx_users_username ON users(username);

-- 部分インデックス（条件付き）
CREATE INDEX idx_active_users ON users(created_at)
WHERE status = 'active';

-- テーブル定義の確認（PostgreSQL）
\d users

-- 列の追加
ALTER TABLE users ADD COLUMN last_login TIMESTAMPTZ;

-- NOT NULL 制約付きの列追加（DEFAULT必須）
ALTER TABLE users ADD COLUMN plan VARCHAR(20) NOT NULL DEFAULT 'free';

-- 列の型変更（PostgreSQL）
ALTER TABLE users ALTER COLUMN bio TYPE TEXT;  -- user_profiles の bio

-- デフォルト値の変更
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'pending';

-- NOT NULL 制約の追加
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- 制約の追加
ALTER TABLE users ADD CONSTRAINT chk_username_length
    CHECK (LENGTH(username) >= 3);

-- 外部キー制約の追加
ALTER TABLE user_profiles
    ADD CONSTRAINT fk_user_profiles_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 制約の削除
ALTER TABLE users DROP CONSTRAINT chk_username_length;

-- 列の削除
ALTER TABLE users DROP COLUMN IF EXISTS last_login;

-- テーブル名の変更
ALTER TABLE users RENAME TO app_users;
ALTER TABLE app_users RENAME TO users;  -- 元に戻す

-- TRUNCATE: 全行削除（高速、AUTOINCREMENTリセット）
TRUNCATE TABLE users RESTART IDENTITY CASCADE;

-- DROP TABLE（存在する場合のみ削除）
DROP TABLE IF EXISTS user_profiles;
DROP TABLE IF EXISTS users;

-- CREATE TABLE IF NOT EXISTS（冪等な作成）
CREATE TABLE IF NOT EXISTS audit_logs (
    id         BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(100),
    operation  VARCHAR(10),
    old_data   JSONB,
    new_data   JSONB,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

```python
import psycopg2

conn = psycopg2.connect(
    host="localhost", dbname="mydb", user="user", password="pass"
)
conn.autocommit = False  # トランザクション制御
cur = conn.cursor()

try:
    # DDLをトランザクション内で実行（PostgreSQL）
    cur.execute("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS phone VARCHAR(20)
    """)
    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)
        WHERE phone IS NOT NULL
    """)
    conn.commit()
    print("Schema migration completed.")
except Exception as e:
    conn.rollback()
    print(f"Migration failed, rolled back: {e}")
finally:
    cur.close()
    conn.close()
```

## 使用場面

- アプリケーション初回デプロイ時のデータベーススキーマ初期化
- マイグレーションツール（Flyway・Liquibase・Alembic）によるスキーマの変更管理
- 不要になったカラムや一時テーブルの削除によるスキーマの整理
- テスト環境でのテーブル再作成・データリセット

## 参考文献

- [PostgreSQL Documentation - CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)
- [PostgreSQL Documentation - ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [MySQL Documentation - Data Definition Statements](https://dev.mysql.com/doc/refman/8.0/en/sql-data-definition-statements.html)

<AffiliateBanner site="db_navi" />
