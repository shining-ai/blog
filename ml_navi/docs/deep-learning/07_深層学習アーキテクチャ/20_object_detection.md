import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 物体検出

## 物体検出とは

> 物体検出（Object Detection）とは、画像や動画の中に存在する複数の物体を**位置（Bounding Box）とクラス**の両方を同時に予測するタスクである。画像分類が「画像全体のラベルを予測する」のに対し、物体検出は「どこに何が何個あるか」を答える。

物体検出は自動運転、監視カメラ、医療画像診断など、実世界の多くのシステムで基盤となる技術である。

---

## 主要アーキテクチャの比較

| モデル | 方式 | 特徴 | 速度 | 精度 |
|---|---|---|---|---|
| Faster R-CNN | 2-stage | RPN + RoI Pooling | 遅い | 高い |
| SSD | 1-stage | Multi-scale Feature Map | 速い | 中程度 |
| YOLO v1〜v5 | 1-stage | Grid-based Prediction | 最速 | 高い（v5以降） |
| RetinaNet | 1-stage | Focal Loss | 速い | 高い |
| DETR | Transformer | End-to-End | 遅い | 高い |

---

## 主要概念

### Bounding Box と Anchor Boxes

Bounding Box は物体の位置を `(x_center, y_center, width, height)` の形式で表す。

**Anchor Boxes** は事前に定義された様々なアスペクト比・サイズを持つ矩形テンプレートである。モデルはこれらのアンカーに対するオフセット（ΔxΔyΔwΔh）を予測することで、多様なサイズ・比率の物体を効率よく検出できる。

```
アンカーボックスの種類（例）:
- 1:1 (正方形)
- 1:2 (縦長)
- 2:1 (横長)
各スケールで複数種類を用意することで多様な物体形状に対応する
```

### IoU（Intersection over Union）

IoU は予測 Bounding Box と正解 Bounding Box の重なり度合いを示す指標である。

```
IoU = 積集合の面積 / 和集合の面積
    = |A ∩ B| / |A ∪ B|

一般的な閾値:
- IoU >= 0.5: True Positive とみなす（PASCAL VOC基準）
- IoU >= 0.75: より厳しい基準
- IoU >= 0.5:0.95: COCO評価基準（複数閾値の平均）
```

### NMS（Non-Maximum Suppression）

同一物体に対して複数の Bounding Box が生成される問題を解決するアルゴリズムである。

**処理手順:**
1. 信頼度スコアでBoxをソート
2. 最も高いスコアのBoxを選択
3. 残りのBoxと IoU を計算し、閾値以上のBoxを削除
4. 残ったBoxに対して繰り返す

---

## 評価指標（mAP）

### Precision と Recall

| 指標 | 定義 |
|---|---|
| Precision | TP / (TP + FP)：検出した中で正しいものの割合 |
| Recall | TP / (TP + FN)：正解の中でどれだけ検出できたかの割合 |
| AP | PR曲線の下の面積（Average Precision） |
| mAP | 全クラスの AP の平均（mean Average Precision） |

### mAP の計算手順

1. 各クラスごとに Precision-Recall 曲線を描く
2. 曲線下の面積（AP）を計算する
3. 全クラスの AP を平均して mAP を得る

---

## Faster R-CNN の仕組み

### 処理フロー

```
入力画像
  ↓
Feature Extraction（Backbone: VGG / ResNet など）
  ↓
RPN（Region Proposal Network）← Anchor Boxes を使用
  ↓
RoI Pooling（Region of Interest）
  ↓
Classification Head + Regression Head
  ↓
NMS
  ↓
検出結果（クラス + Bounding Box）
```

### RPN（Region Proposal Network）

RPN は Feature Map 上の各位置で Anchor Box を基準として「物体らしい領域」を提案する。各アンカーに対してObjectness スコアとBBoxオフセットを予測する。

---

## YOLO（You Only Look Once）

YOLO は画像を S×S のグリッドに分割し、各セルが直接 Bounding Box とクラス確率を予測する 1-stage 検出器である。

### YOLO の予測構造

```
各グリッドセルが予測する情報:
- B個のBounding Box: (x, y, w, h, confidence) × B
- C個のクラス確率: P(class | object) × C

出力テンソルサイズ: S × S × (B × 5 + C)
例: S=7, B=2, C=20(PASCAL VOC) → 7×7×30
```

---

## SSD（Single Shot MultiBox Detector）

SSD は複数スケールの Feature Map から予測を行い、大小さまざまな物体を検出する。

```
入力画像（300×300）
  ↓
VGG-16 Backbone
  ↓ ↓ ↓ ↓ ↓ ↓
38×38  19×19  10×10  5×5  3×3  1×1（Feature Maps）
  ↓ ↓ ↓ ↓ ↓ ↓
各スケールで独立に BBox 予測
  ↓
NMS
```

---

## PyTorch による物体検出コード例

### torchvision の Faster R-CNN を使用した推論

```python
import torch
import torchvision
from torchvision.models.detection import fasterrcnn_resnet50_fpn
from torchvision.transforms import functional as F
from PIL import Image

# 事前学習済みモデルの読み込み
model = fasterrcnn_resnet50_fpn(weights="DEFAULT")
model.eval()

# 画像の前処理
image = Image.open("image.jpg").convert("RGB")
image_tensor = F.to_tensor(image)  # [C, H, W], 0-1に正規化

# 推論
with torch.no_grad():
    predictions = model([image_tensor])

# 結果の取り出し
boxes = predictions[0]["boxes"]      # [N, 4] (x1, y1, x2, y2)
labels = predictions[0]["labels"]    # [N]
scores = predictions[0]["scores"]    # [N]

# 信頼度スコアでフィルタリング
threshold = 0.5
keep = scores > threshold
boxes = boxes[keep]
labels = labels[keep]
scores = scores[keep]

print(f"検出数: {keep.sum().item()}")
for i in range(len(boxes)):
    print(f"  クラス: {labels[i].item()}, スコア: {scores[i]:.3f}, Box: {boxes[i].tolist()}")
```

### IoU の計算実装

```python
import torch

def compute_iou(box1: torch.Tensor, box2: torch.Tensor) -> torch.Tensor:
    """
    IoU を計算する
    Args:
        box1: [N, 4] (x1, y1, x2, y2)
        box2: [M, 4] (x1, y1, x2, y2)
    Returns:
        iou: [N, M]
    """
    # 積集合の計算
    inter_x1 = torch.max(box1[:, None, 0], box2[None, :, 0])
    inter_y1 = torch.max(box1[:, None, 1], box2[None, :, 1])
    inter_x2 = torch.min(box1[:, None, 2], box2[None, :, 2])
    inter_y2 = torch.min(box1[:, None, 3], box2[None, :, 3])

    inter_w = (inter_x2 - inter_x1).clamp(min=0)
    inter_h = (inter_y2 - inter_y1).clamp(min=0)
    inter_area = inter_w * inter_h

    # 各Boxの面積
    area1 = (box1[:, 2] - box1[:, 0]) * (box1[:, 3] - box1[:, 1])
    area2 = (box2[:, 2] - box2[:, 0]) * (box2[:, 3] - box2[:, 1])

    # 和集合の面積
    union_area = area1[:, None] + area2[None, :] - inter_area

    return inter_area / union_area.clamp(min=1e-6)

# 使用例
box1 = torch.tensor([[10.0, 10.0, 50.0, 50.0]])
box2 = torch.tensor([[20.0, 20.0, 60.0, 60.0]])
iou = compute_iou(box1, box2)
print(f"IoU: {iou.item():.4f}")
```

### NMS の実装

```python
def nms(boxes: torch.Tensor, scores: torch.Tensor, iou_threshold: float = 0.5):
    """
    Non-Maximum Suppression
    Args:
        boxes: [N, 4]
        scores: [N]
        iou_threshold: float
    Returns:
        keep: 残すインデックスのリスト
    """
    # torchvision の NMS を利用（実用上はこちらを推奨）
    from torchvision.ops import nms as torchvision_nms
    return torchvision_nms(boxes, scores, iou_threshold)

# 独自実装の場合
def nms_custom(boxes, scores, iou_threshold=0.5):
    order = scores.argsort(descending=True)
    keep = []

    while order.numel() > 0:
        i = order[0].item()
        keep.append(i)

        if order.numel() == 1:
            break

        ious = compute_iou(boxes[i:i+1], boxes[order[1:]])[0]
        order = order[1:][ious < iou_threshold]

    return keep
```

### YOLOv5 のファインチューニング（概要）

```python
# YOLOv5 は ultralytics ライブラリで簡単にファインチューニング可能
# pip install ultralytics

from ultralytics import YOLO

# 事前学習済みモデルの読み込み
model = YOLO("yolov5s.pt")

# カスタムデータセットでの学習
# dataset.yaml にデータパスとクラス名を記述
results = model.train(
    data="dataset.yaml",
    epochs=50,
    imgsz=640,
    batch=16,
    lr0=0.01,
)

# 推論
results = model.predict("test_image.jpg", conf=0.5)
```

---

## 使用場面

- **自動運転**: 歩行者・車・信号機の検出
- **医療画像**: 病変領域の特定・検出
- **製造業**: 不良品検出・品質管理
- **小売**: 棚の商品管理・在庫確認
- **セキュリティ**: 監視カメラでの侵入検知

---

## 参考文献

- Girshick et al., "Faster R-CNN: Towards Real-Time Object Detection with Region Proposal Networks" (2015)
- Redmon et al., "You Only Look Once: Unified, Real-Time Object Detection" (2016)
- Liu et al., "SSD: Single Shot MultiBox Detector" (2016)
- Lin et al., "Focal Loss for Dense Object Detection" (2017)

<AffiliateBanner site="ml_intro" />
