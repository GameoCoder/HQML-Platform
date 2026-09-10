"""
Brain MRI Dataset Inference Engine.

Performs frozen PyTorch ResNet-50 feature extraction, PCA anomaly gatekeeping,
and multi-observable 14-qubit Hybrid VQC classification alongside classical benchmarks.
"""

from datetime import datetime, timezone
import io
from pathlib import Path
import time
from typing import Any, Dict

import joblib
import numpy as np
import pennylane as qml
from PIL import Image
import torch
import torch.nn as nn
from torchvision import models, transforms

# 1. Base Paths & Weights Discovery
BASE_DIR = Path(__file__).resolve().parent
WEIGHTS_DIR = BASE_DIR / "weights"

# 2. Static Holdout Benchmark Metrics (1,600-image holdout set)
QUANTUM_BENCHMARK = {
    "accuracy": 0.72,
    "macro_recall": 0.72,
    "macro_specificity": 0.9071,
    "f1_score": 0.71,
}

RF_BENCHMARK = {
    "accuracy": 0.85,
    "macro_recall": 0.85,
    "macro_specificity": 0.9512,
    "f1_score": 0.85,
}

SVM_BENCHMARK = {
    "accuracy": 0.84,
    "macro_recall": 0.84,
    "macro_specificity": 0.9454,
    "f1_score": 0.83,
}

MLP_BENCHMARK = {
    "accuracy": 0.83,
    "macro_recall": 0.83,
    "macro_specificity": 0.9423,
    "f1_score": 0.82,
}

CLASS_MAPPING = {0: "glioma", 1: "meningioma", 2: "notumor", 3: "pituitary"}

# 3. Quantum Architecture Definition
n_qubits = 14
n_layers = 4
try:
    dev = qml.device("lightning.gpu", wires=n_qubits)
except Exception:
    dev = qml.device("default.qubit", wires=n_qubits)


@qml.qnode(dev, interface="torch")
def quantum_circuit(inputs, weights):
    qml.AngleEmbedding(inputs, wires=range(n_qubits), rotation="Y")
    qml.StronglyEntanglingLayers(weights, wires=range(n_qubits))
    return [qml.expval(qml.PauliZ(i)) for i in range(4)]


class MultiObservableHybridVQC(nn.Module):
    def __init__(self):
        super(MultiObservableHybridVQC, self).__init__()
        weight_shapes = {"weights": (n_layers, n_qubits, 3)}
        self.qlayer = qml.qnn.TorchLayer(quantum_circuit, weight_shapes)
        self.classifier = nn.Linear(4, 4)

    def forward(self, x):
        q_out = self.qlayer(x)
        logits = self.classifier(q_out)
        return logits, q_out


# 4. Warm Startup: Preload ResNet-50, Scalers, Classical & Quantum Models into RAM/VRAM
print("[Brain MRI Engine] Loading ResNet-50 Feature Extractor...")
resnet50 = models.resnet50(weights=models.ResNet50_Weights.DEFAULT)
resnet50.fc = nn.Identity()
resnet50.eval()

img_transforms = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

print("[Brain MRI Engine] Loading PCA & MinMax Scaler...")
pca = joblib.load(WEIGHTS_DIR / "pca_14.joblib")
minmax = joblib.load(WEIGHTS_DIR / "minmax_scaler.joblib")

if (WEIGHTS_DIR / "class_mapping.joblib").exists():
    try:
        loaded_map = joblib.load(WEIGHTS_DIR / "class_mapping.joblib")
        if isinstance(loaded_map, dict):
            CLASS_MAPPING.update(loaded_map)
    except Exception:
        pass

print("[Brain MRI Engine] Loading Classical Models...")
rf_model = joblib.load(WEIGHTS_DIR / "rf_model.joblib")
svm_model = joblib.load(WEIGHTS_DIR / "svm_model.joblib")
mlp_model = joblib.load(WEIGHTS_DIR / "mlp_model.joblib")

print("[Brain MRI Engine] Initializing 14-Qubit Multi-Observable VQC...")
vqc_model = MultiObservableHybridVQC()
vqc_model.load_state_dict(torch.load(WEIGHTS_DIR / "hybrid_resnet_vqc_14q.pt", map_location="cpu"))
vqc_model.eval()
print("[Brain MRI Engine] Ready for live MRI inference.")


# 5. Inference Execution Function
def run_inference(file_bytes: bytes, **kwargs) -> Dict[str, Any]:
    """
    Executes end-to-end brain MRI inference:
    1. ResNet-50 2048D spatial feature extraction
    2. PCA Anomaly Gatekeeper validation
    3. Multi-observable 14-qubit Hybrid VQC classification
    4. Classical baseline inferences (RF, SVM, MLP)
    5. Latent PCA explainability mapping
    """
    start_time = time.perf_counter()

    # Decode and validate image
    try:
        pil_image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    except Exception as exc:
        return {
            "status": "error",
            "message": f"Corrupted or invalid image file: {exc!s}",
        }

    # Feature extraction with frozen ResNet-50
    input_tensor = img_transforms(pil_image).unsqueeze(0)
    with torch.no_grad():
        features_2048 = resnet50(input_tensor).numpy().astype(np.float32)

    # PCA Projection and Scaling
    x_pca = pca.transform(features_2048)
    x_final = minmax.transform(x_pca)

    # --- PCA Gatekeeper Anomaly Detection ---
    # Valid medical images must scale between 0 and np.pi (~3.1416)
    if np.any(x_final < -0.5) or np.any(x_final > (np.pi + 0.5)):
        return {
            "status": "error",
            "message": "Out-of-Distribution Error: The uploaded image does not appear to be a valid Brain MRI scan.",
        }

    # --- Quantum 14-Qubit Multi-Observable VQC Inference ---
    x_tensor = torch.tensor(x_final, dtype=torch.float32)
    q_start = time.perf_counter()
    with torch.no_grad():
        logits, q_out = vqc_model(x_tensor)
        probs = torch.softmax(logits, dim=-1)[0]
    q_latency_ms = round((time.perf_counter() - q_start) * 1000, 1)

    vqc_pred_idx = int(torch.argmax(probs).item())
    vqc_prediction = CLASS_MAPPING.get(vqc_pred_idx, "notumor")
    vqc_confidence = round(float(probs[vqc_pred_idx].item()) * 100.0, 2)
    expectation_values = [round(float(v.item()), 3) for v in q_out[0]]

    # --- Classical Baseline Inferences ---
    classical_specs = [
        ("rf", rf_model, "Random Forest", "Classical Ensemble", RF_BENCHMARK),
        ("svm", svm_model, "Support Vector Machine", "Classical Kernel", SVM_BENCHMARK),
        ("mlp", mlp_model, "Multi-Layer Perceptron", "Classical Neural Network", MLP_BENCHMARK),
    ]

    classical_results = []
    for model_id, model, name, model_type, benchmark in classical_specs:
        c_start = time.perf_counter()
        c_probs = model.predict_proba(x_final)[0]
        c_latency_ms = round((time.perf_counter() - c_start) * 1000, 2)

        c_pred_idx = int(np.argmax(c_probs))
        c_pred_class = CLASS_MAPPING.get(c_pred_idx, "notumor")
        c_conf = round(float(c_probs[c_pred_idx]) * 100.0, 2)

        classical_results.append({
            "id": model_id,
            "name": name,
            "type": model_type,
            "prediction": c_pred_class,
            "confidence_percentage": c_conf,
            "latency_ms": c_latency_ms,
            "status": "Ready",
            "test_benchmark": benchmark,
        })

    # --- Latent PCA Explainability Mapping ---
    top_comp_indices = np.argsort(np.abs(x_pca[0]))[::-1][:3]
    total_abs_magnitude = float(np.sum(np.abs(x_pca[0])) + 1e-6)

    top_components = []
    for comp_idx in top_comp_indices:
        comp_magnitude = round(float(np.abs(x_pca[0, comp_idx]) / total_abs_magnitude), 2)
        norm_val = round(float(x_final[0, comp_idx]), 4)
        top_components.append({
            "component_id": f"PCA_{comp_idx}",
            "loading_magnitude": comp_magnitude,
            "normalized_value": norm_val,
            "impact": f"drives_{vqc_prediction}_classification",
        })

    explainability_shap = {
        "explainer_type": "ResNet-PCA-Latent-Mapping",
        "top_components": top_components,
    }

    # Construct and return unified response
    return {
        "status": "success",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "dataset_analyzed": "brain-tumor-mri-dataset",
        "primary_quantum_diagnosis": {
            "model_id": "hybrid_resnet_vqc_14q",
            "model_name": "ResNet-50 + Variational Quantum Classifier",
            "prediction": vqc_prediction,
            "binary_class": vqc_pred_idx,
            "confidence_percentage": vqc_confidence,
            "quantum_expectation_values": expectation_values,
            "latency_ms": q_latency_ms,
            "qubits_used": n_qubits,
            "circuit_depth": n_layers,
            "execution_metadata": {
                "backend": "lightning.gpu" if dev.name == "lightning.gpu" else "default.qubit",
                "framework": "PennyLane + PyTorch",
                "qubits_used": n_qubits,
                "circuit_depth": n_layers,
                "entanglement_strategy": "StronglyEntanglingLayers",
                "scaling": "MinMax [0, π]",
            },
            "test_benchmark": QUANTUM_BENCHMARK,
        },
        "classical_models": classical_results,
        "explainability_shap": explainability_shap,
    }
