import AffiliateBanner from '@site/src/components/AffiliateBanner';

# Matplotlib / Seaborn

## Matplotlib / Seaborn とは

> Matplotlib は Python の低レベルグラフ描画ライブラリであり、折れ線・棒・散布図など幅広いグラフを高度にカスタマイズして作成できる。Seaborn は Matplotlib 上に構築された統計可視化ライブラリで、美しいデフォルトスタイルと統計的なプロット機能を提供する。

## 主要グラフの種類

| グラフ | Matplotlib | Seaborn | 用途 |
|-------|-----------|---------|------|
| 折れ線 | `ax.plot()` | `sns.lineplot()` | 時系列・学習曲線 |
| 棒グラフ | `ax.bar()` | `sns.barplot()` | カテゴリ比較 |
| 散布図 | `ax.scatter()` | `sns.scatterplot()` | 2変数の関係 |
| ヒストグラム | `ax.hist()` | `sns.histplot()` | 分布の確認 |
| ヒートマップ | `ax.imshow()` | `sns.heatmap()` | 行列・相関係数 |
| ボックスプロット | `ax.boxplot()` | `sns.boxplot()` | 外れ値・分布 |
| ペアプロット | - | `sns.pairplot()` | 多変数の関係 |

## Python実装

```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import seaborn as sns

# Seaborn スタイルとフォント設定
sns.set_theme(style="whitegrid", palette="muted", font_scale=1.2)
plt.rcParams["figure.dpi"] = 100

# サンプルデータ生成
np.random.seed(42)
n = 200
df = pd.DataFrame({
    "x": np.random.randn(n),
    "y": 2 * np.random.randn(n) + 1,
    "z": np.random.exponential(1, n),
    "category": np.random.choice(["A", "B", "C"], n),
    "size": np.random.randint(10, 200, n),
})
df["y_noise"] = 0.8 * df["x"] + 0.5 * np.random.randn(n)

# ==============================
# 1. 折れ線グラフ（学習曲線の例）
# ==============================
epochs = np.arange(1, 51)
train_loss = 1.5 * np.exp(-0.08 * epochs) + 0.1 + 0.02 * np.random.randn(50)
val_loss = 1.5 * np.exp(-0.06 * epochs) + 0.2 + 0.02 * np.random.randn(50)

fig, ax = plt.subplots(figsize=(8, 4))
ax.plot(epochs, train_loss, label="Train Loss", color="steelblue", linewidth=2)
ax.plot(epochs, val_loss, label="Val Loss", color="coral", linewidth=2, linestyle="--")
ax.fill_between(epochs, train_loss - 0.05, train_loss + 0.05, alpha=0.2, color="steelblue")
ax.set_xlabel("Epoch")
ax.set_ylabel("Loss")
ax.set_title("学習曲線")
ax.legend()
plt.tight_layout()
# plt.savefig("learning_curve.png", dpi=150, bbox_inches="tight")
plt.close()

# ==============================
# 2. 棒グラフ（カテゴリ比較）
# ==============================
fig, axes = plt.subplots(1, 2, figsize=(12, 4))

# 左: Matplotlib
category_means = df.groupby("category")["y"].mean()
axes[0].bar(category_means.index, category_means.values, color=["#4C72B0", "#DD8452", "#55A868"])
axes[0].set_title("カテゴリ別平均 (Matplotlib)")
axes[0].set_xlabel("Category")
axes[0].set_ylabel("Mean y")

# 右: Seaborn（信頼区間付き）
sns.barplot(data=df, x="category", y="y", ax=axes[1], capsize=0.1, errwidth=2)
axes[1].set_title("カテゴリ別平均 (Seaborn, 95% CI)")
plt.tight_layout()
plt.close()

# ==============================
# 3. 散布図
# ==============================
fig, axes = plt.subplots(1, 2, figsize=(12, 5))

# 左: 基本散布図（サイズ・色エンコーディング）
scatter = axes[0].scatter(
    df["x"], df["y_noise"],
    c=df["size"], cmap="viridis",
    s=df["size"] * 0.3, alpha=0.6
)
plt.colorbar(scatter, ax=axes[0], label="size")
axes[0].set_title("散布図（色とサイズでエンコード）")

# 右: Seaborn regplot（回帰直線付き）
sns.regplot(data=df, x="x", y="y_noise", ax=axes[1],
            scatter_kws={"alpha": 0.4, "s": 30},
            line_kws={"color": "red", "linewidth": 2})
axes[1].set_title("散布図 + 回帰直線")
plt.tight_layout()
plt.close()

# ==============================
# 4. ヒストグラム + KDE
# ==============================
fig, axes = plt.subplots(1, 2, figsize=(12, 4))

axes[0].hist(df["z"], bins=30, color="steelblue", edgecolor="white", alpha=0.7)
axes[0].set_title("ヒストグラム")
axes[0].set_xlabel("z")

sns.histplot(data=df, x="z", hue="category", kde=True, ax=axes[1],
             multiple="layer", alpha=0.5)
axes[1].set_title("グループ別ヒストグラム + KDE")
plt.tight_layout()
plt.close()

# ==============================
# 5. ヒートマップ（相関行列）
# ==============================
numeric_cols = ["x", "y", "z", "size", "y_noise"]
corr = df[numeric_cols].corr()

fig, ax = plt.subplots(figsize=(7, 6))
mask = np.triu(np.ones_like(corr, dtype=bool), k=1)  # 上三角をマスク
sns.heatmap(
    corr, annot=True, fmt=".2f", cmap="RdBu_r",
    vmin=-1, vmax=1, square=True, ax=ax,
    linewidths=0.5, linecolor="white",
)
ax.set_title("相関行列ヒートマップ")
plt.tight_layout()
plt.close()

# ==============================
# 6. ペアプロット
# ==============================
pair_df = df[["x", "y", "z", "category"]].sample(100)
g = sns.pairplot(
    pair_df, hue="category", diag_kind="kde",
    plot_kws={"alpha": 0.5, "s": 20}
)
g.figure.suptitle("ペアプロット", y=1.02)
plt.close()

# ==============================
# 7. サブプロット（GridSpec による複雑なレイアウト）
# ==============================
fig = plt.figure(figsize=(14, 8))
gs = gridspec.GridSpec(2, 3, figure=fig)

ax_main = fig.add_subplot(gs[0, :2])   # 上左2/3
ax_top  = fig.add_subplot(gs[0, 2])    # 上右1/3
ax_bl   = fig.add_subplot(gs[1, 0])    # 下左
ax_bm   = fig.add_subplot(gs[1, 1])    # 下中
ax_br   = fig.add_subplot(gs[1, 2])    # 下右

ax_main.plot(epochs, train_loss, label="Train")
ax_main.plot(epochs, val_loss, label="Validation")
ax_main.set_title("学習曲線")
ax_main.legend()

sns.boxplot(data=df, x="category", y="y", ax=ax_top)
ax_top.set_title("Box Plot")

ax_bl.hist(df["x"], bins=20, color="steelblue")
ax_bl.set_title("x の分布")

sns.scatterplot(data=df, x="x", y="y_noise", hue="category", ax=ax_bm, s=20, alpha=0.5)
ax_bm.set_title("散布図")

sns.violinplot(data=df, x="category", y="z", ax=ax_br)
ax_br.set_title("Violin Plot")

fig.suptitle("複合ダッシュボード", fontsize=16, y=1.01)
plt.tight_layout()
# plt.savefig("dashboard.png", dpi=150, bbox_inches="tight")
plt.close()

print("グラフの作成が完了しました")
```

## 使用場面

- モデルの学習曲線・損失の可視化
- 特徴量の分布確認・外れ値検出
- 相関行列ヒートマップによる特徴量選択
- 混同行列・PR曲線・ROC曲線の描画
- 実験結果の論文・レポート用図表作成

## 参考文献

- Matplotlib 公式ドキュメント: https://matplotlib.org/stable/
- Seaborn 公式ドキュメント: https://seaborn.pydata.org/
- Waskom, M. (2021). seaborn: statistical data visualization. *JOSS*, 6(60), 3021.

<AffiliateBanner site="ml_intro" />
