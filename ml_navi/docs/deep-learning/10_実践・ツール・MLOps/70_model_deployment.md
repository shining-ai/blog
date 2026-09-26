import AffiliateBanner from '@site/src/components/AffiliateBanner';

# モデルのデプロイ

## モデルのデプロイとは

> モデルのデプロイとは、学習済み機械学習モデルを本番環境で推論可能な状態にすることである。REST API サーバー・ONNX 変換・コンテナ化・クラウドサービスへの配置など複数の方式があり、推論速度・スケーラビリティ・保守性のトレードオフを考慮して選択する。

## デプロイ方式の比較

| 方式 | ツール | 特徴 | 適用場面 |
|-----|--------|------|---------|
| REST API | FastAPI + uvicorn | 汎用・実装容易 | Webサービスとの統合 |
| ONNX 変換 | `torch.onnx` + ONNX Runtime | フレームワーク非依存・高速 | エッジ・クロスプラットフォーム |
| TorchServe | TorchServe | PyTorch 専用・スケーラブル | 大規模推論サービス |
| コンテナ | Docker + Kubernetes | 環境再現性・スケーリング | マイクロサービス |
| クラウド ML | SageMaker / Vertex AI | フルマネージド | 大規模本番環境 |

## 推論最適化手法

| 手法 | 削減対象 | 精度への影響 |
|-----|---------|------------|
| 量子化（INT8/FP16） | モデルサイズ・推論速度 | 微小（許容範囲内が多い）|
| プルーニング | モデルサイズ・速度 | 要チューニング |
| 知識蒸留 | モデルサイズ | 要チューニング |
| TorchScript / JIT | デプロイの柔軟性 | なし |
| バッチ推論 | スループット向上 | なし |

## Python実装

```python
import torch
import torch.nn as nn
import numpy as np
from pathlib import Path

# ==============================
# 1. サンプルモデルの定義
# ==============================
class TextClassifier(nn.Module):
    def __init__(self, input_dim: int = 768, n_classes: int = 5):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 256), nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(256, 64),        nn.ReLU(),
            nn.Linear(64, n_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)

model = TextClassifier()
model.eval()

# ==============================
# 2. ONNX エクスポート
# ==============================
def export_to_onnx(model: nn.Module, path: str = "/tmp/model.onnx"):
    dummy_input = torch.randn(1, 768)
    torch.onnx.export(
        model, dummy_input, path,
        input_names=["input"],
        output_names=["logits"],
        dynamic_axes={
            "input":  {0: "batch_size"},
            "logits": {0: "batch_size"},
        },
        opset_version=17,
        do_constant_folding=True,  # 定数畳み込みで最適化
    )
    print(f"ONNX モデルを保存: {path}")
    return path


def run_onnx_inference(onnx_path: str, input_data: np.ndarray):
    """ONNX Runtime での推論"""
    try:
        import onnxruntime as ort
        sess_options = ort.SessionOptions()
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        session = ort.InferenceSession(
            onnx_path,
            sess_options=sess_options,
            providers=["CPUExecutionProvider"],
        )
        outputs = session.run(None, {"input": input_data.astype(np.float32)})
        return outputs[0]
    except ImportError:
        print("onnxruntime が必要: pip install onnxruntime")
        return None


onnx_path = export_to_onnx(model)
test_input = np.random.randn(4, 768).astype(np.float32)
onnx_output = run_onnx_inference(onnx_path, test_input)

# TorchScript との出力比較
with torch.no_grad():
    pytorch_output = model(torch.FloatTensor(test_input)).numpy()

if onnx_output is not None:
    diff = np.max(np.abs(onnx_output - pytorch_output))
    print(f"ONNX vs PyTorch 最大差: {diff:.6f}")

# ==============================
# 3. TorchScript による JIT コンパイル
# ==============================
def export_torchscript(model: nn.Module, path: str = "/tmp/model_scripted.pt"):
    model.eval()
    scripted = torch.jit.script(model)
    scripted.save(path)
    print(f"TorchScript モデルを保存: {path}")
    return scripted


scripted_model = export_torchscript(model)

# ==============================
# 4. 量子化（動的量子化）
# ==============================
def quantize_dynamic(model: nn.Module) -> nn.Module:
    """動的量子化（推論時に FP32 → INT8）"""
    quantized = torch.quantization.quantize_dynamic(
        model, {nn.Linear}, dtype=torch.qint8
    )
    return quantized


quantized_model = quantize_dynamic(model)
model_size_orig = sum(p.numel() * p.element_size() for p in model.parameters())
model_size_quant = sum(p.numel() * p.element_size() for p in quantized_model.parameters())
print(f"元モデルサイズ: {model_size_orig / 1e3:.1f} KB")
print(f"量子化後サイズ: {model_size_quant / 1e3:.1f} KB")

# ==============================
# 5. FastAPI による推論 API サーバー
# ==============================
FASTAPI_CODE = '''
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
import numpy as np
from typing import List

app = FastAPI(title="ML Model API", version="1.0.0")

# モデルのロード（起動時に一度だけ）
model = torch.jit.load("/tmp/model_scripted.pt")
model.eval()

class PredictRequest(BaseModel):
    features: List[List[float]]  # バッチ入力

class PredictResponse(BaseModel):
    predictions: List[int]
    probabilities: List[List[float]]

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    try:
        X = torch.FloatTensor(request.features)
        if X.shape[1] != 768:
            raise HTTPException(status_code=422, detail="入力次元数が不正")

        with torch.no_grad():
            logits = model(X)
            probs = torch.softmax(logits, dim=-1)
            preds = probs.argmax(dim=-1)

        return PredictResponse(
            predictions=preds.tolist(),
            probabilities=probs.tolist(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 起動: uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
'''

print("FastAPI コード（main.py の内容）:")
print(FASTAPI_CODE[:500] + "...")

# ==============================
# 6. Dockerfile の例
# ==============================
DOCKERFILE = """
FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir \\
    fastapi uvicorn[standard] \\
    torch --index-url https://download.pytorch.org/whl/cpu \\
    onnxruntime numpy

COPY model_scripted.pt /app/
COPY main.py /app/

EXPOSE 8000
HEALTHCHECK CMD curl -f http://localhost:8000/health || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
"""

print("\nDockerfile の内容:")
print(DOCKERFILE)
```

## 使用場面

- **FastAPI**: プロトタイプから中規模 API まで幅広く対応
- **ONNX**: エッジデバイス・複数フレームワーク間の互換性が必要な場合
- **TorchScript**: Python ランタイム不要な高速推論環境
- **量子化**: モバイル・組み込みデバイスなどリソース制約がある場合

## 参考文献

- FastAPI 公式ドキュメント: https://fastapi.tiangolo.com/
- ONNX Runtime: https://onnxruntime.ai/
- PyTorch デプロイガイド: https://pytorch.org/tutorials/recipes/deployment_with_flask.html
- TorchServe: https://pytorch.org/serve/

<AffiliateBanner site="ml_intro" />
