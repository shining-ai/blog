import AffiliateBanner from '@site/src/components/AffiliateBanner';

# BCNF・第 4 正規形

## BCNF・第 4 正規形とは

> BCNF（ボイス・コッド正規形）とは、すべての非自明な関数従属 X → Y において X が超キー（候補キーの上位集合）であることを要求する正規形であり、第4正規形（4NF）はさらに多値従属（MVD）の排除を要求する。

第3正規形（3NF）を満たしていてもBCNFを満たさないケースが存在します。それは複数の候補キーが存在し、それらが重複している（オーバーラップしている）場合です。BCNFは3NFより厳しい条件であり、「すべての決定子が候補キーでなければならない」と言い換えることもできます。

BCNFへの分解は常に無損失分解（元のリレーションが結合で復元できる）ですが、関数従属性の保存が保証されない場合があります。その場合、追加の整合性制約が必要になることがあります。

第4正規形（4NF）は多値従属（Multivalued Dependency）を扱います。多値従属 X →→ Y とは「X の値が決まると Y の値の集合が決まる」という関係で、Y が独立した複数の値を持てる場合に生じます。4NFはBCNFに加えて、すべての非自明な多値従属において決定子が超キーであることを要求します。

## BCNF と 3NF の違い

| 正規形 | 要件 | 保証 |
|--------|------|------|
| 3NF | 非キー属性 → 非キー属性 の推移的従属がない | 関数従属性の保存あり |
| BCNF | すべての決定子が超キー | 無損失分解。従属性保存は保証されない場合あり |
| 4NF | BCNF + 非自明な多値従属の決定子が超キー | BCNF より強い独立性 |

```sql
-- ====================================
-- BCNFが必要なケース
-- ====================================
-- テーブル: course_enrollment(student, course, teacher)
-- 関数従属:
--   (student, course) → teacher （候補キー1）
--   (student, teacher) → course （候補キー2）
--   teacher → course           ← teacher は候補キーではない → BCNF違反！

-- 3NFは満たすが BCNF は満たさないテーブル
CREATE TABLE course_enrollment_3nf (
    student VARCHAR(50),
    course  VARCHAR(50),
    teacher VARCHAR(50),
    PRIMARY KEY (student, course),
    -- (student, teacher) も候補キーだが制約定義が難しい
    UNIQUE (student, teacher)
);

-- 問題: あるコースを別の教師が担当する変更をすると
-- 全登録学生の行を更新しなければならない（更新異常）

-- BCNF への分解
CREATE TABLE teacher_courses (
    teacher VARCHAR(50) PRIMARY KEY,
    course  VARCHAR(50) NOT NULL
);

CREATE TABLE student_teachers (
    student VARCHAR(50),
    teacher VARCHAR(50),
    PRIMARY KEY (student, teacher),
    FOREIGN KEY (teacher) REFERENCES teacher_courses(teacher)
);

-- 注意: この分解では (student, course) → teacher の
-- 関数従属性が直接表現できなくなる（トレードオフ）

-- ====================================
-- 第4正規形が必要なケース
-- ====================================
-- テーブル: employee_info(employee, skill, language)
-- employee は複数のスキルと複数の言語を持つ
-- skill と language は独立（無関係）
-- 多値従属: employee →→ skill、employee →→ language

-- 4NF 違反のテーブル（直積の冗長性）
CREATE TABLE employee_info_bad (
    employee VARCHAR(50),
    skill    VARCHAR(50),
    language VARCHAR(50),
    PRIMARY KEY (employee, skill, language)
);

-- 例: Aliceが Java/Python を知り、English/Japaneseを話す場合
-- (Alice, Java, English), (Alice, Java, Japanese),
-- (Alice, Python, English), (Alice, Python, Japanese)
-- → 4行になり冗長。skillにlanguageを追加すると更新が複雑

-- 4NF への分解（多値従属を別テーブルに分離）
CREATE TABLE employee_skills (
    employee VARCHAR(50),
    skill    VARCHAR(50),
    PRIMARY KEY (employee, skill)
);

CREATE TABLE employee_languages (
    employee VARCHAR(50),
    language VARCHAR(50),
    PRIMARY KEY (employee, language)
);

-- データの整合性確認
-- BCNFの検証: すべての非自明な関数従属の決定子が超キーか確認
SELECT teacher, COUNT(DISTINCT course) AS course_count
FROM   course_enrollment_3nf
GROUP BY teacher
HAVING COUNT(DISTINCT course) > 1;
-- 結果が返れば teacher → course が成立していない可能性

-- 4NFの確認: 多値従属による冗長性の検出
SELECT employee,
       COUNT(DISTINCT skill)    AS skill_count,
       COUNT(DISTINCT language) AS lang_count,
       COUNT(*)                 AS row_count
FROM   employee_info_bad
GROUP BY employee
HAVING COUNT(*) > COUNT(DISTINCT skill) + COUNT(DISTINCT language) - 1;
-- 期待: COUNT(*) = skill_count × lang_count（完全直積の場合）
```

```python
from itertools import product as cartesian_product

# 多値従属による冗長性の確認
employees = {
    'Alice': {
        'skills': ['Java', 'Python'],
        'languages': ['English', 'Japanese']
    }
}

# 4NF違反（直積による冗長な表現）
bad_table = []
for emp, data in employees.items():
    for skill, lang in cartesian_product(data['skills'], data['languages']):
        bad_table.append((emp, skill, lang))

print("4NF違反テーブル（直積）:")
for row in bad_table:
    print(row)
# → 4行（冗長）

# 4NF準拠（別テーブルに分離）
emp_skills = [(emp, s) for emp, d in employees.items() for s in d['skills']]
emp_langs  = [(emp, l) for emp, d in employees.items() for l in d['languages']]

print("\n4NF準拠: employee_skills")
print(emp_skills)
print("\n4NF準拠: employee_languages")
print(emp_langs)
```

## 使用場面

- 複数の候補キーが存在するテーブルで3NFがBCNFを保証しないケースの解決
- 社員-スキル・社員-言語など独立した多値属性を別テーブルに分離する場合
- タグ付けシステムや権限管理テーブルの多対多関係の正規化
- データウェアハウスの次元設計で属性間の独立性を保証する場合

## 参考文献

- R.F. Boyce & E.F. Codd, "Relational Completeness of Data Base Sublanguages", 1974
- Fagin, "Multivalued Dependencies and a New Normal Form for Relational Databases", 1977
- [Wikipedia - Boyce-Codd Normal Form](https://en.wikipedia.org/wiki/Boyce%E2%80%93Codd_normal_form)

<AffiliateBanner site="db_navi" />
