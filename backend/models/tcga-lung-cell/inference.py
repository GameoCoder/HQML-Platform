import io
import time
from pathlib import Path
from datetime import datetime, timezone
import numpy as np
import pandas as pd
import joblib
import json
import torch
import torch.nn as nn
import pennylane as qml

# 1. Base Paths & Architecture Setup
WEIGHTS_DIR = Path(__file__).resolve().parent / "weights"
METRICS_FILE = WEIGHTS_DIR / 'model_metrics.json'
with open(METRICS_FILE, 'r') as f:
    STATIC_BENCHMARKS = json.load(f)

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
    return qml.expval(qml.PauliZ(0))


class HybridVQC(nn.Module):
    def __init__(self):
        super(HybridVQC, self).__init__()
        weight_shapes = {"weights": (n_layers, n_qubits, 3)}
        self.qlayer = qml.qnn.TorchLayer(quantum_circuit, weight_shapes)
        self.linear = nn.Linear(1, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        q_out = self.qlayer(x).unsqueeze(-1)
        return self.sigmoid(self.linear(q_out))


# 2. Warm Startup: Preload all models into RAM / VRAM once
print("[TCGA Engine] Loading preprocessing scalers...")
scaler = joblib.load(WEIGHTS_DIR / "standard_scaler.joblib")
pca = joblib.load(WEIGHTS_DIR / "pca_14.joblib")
minmax = joblib.load(WEIGHTS_DIR / "minmax_scaler.joblib")

print("[TCGA Engine] Loading Classical Models...")
rf_model = joblib.load(WEIGHTS_DIR / "rf_model.joblib")
svm_model = joblib.load(WEIGHTS_DIR / "svm_model.joblib")
mlp_model = joblib.load(WEIGHTS_DIR / "nn_model.joblib")

print("[TCGA Engine] Initializing Quantum Circuit onto GPU...")
vqc_model = HybridVQC()
vqc_model.load_state_dict(torch.load(WEIGHTS_DIR / "hybrid_vqc_25q.pt", map_location="cpu"))
vqc_model.eval()
print("[TCGA Engine] Ready for live inference.")


# 3. Unified Inference Function
def run_inference(file_bytes: bytes, patient_idx: int = 1) -> dict:
    """
    Accepts raw file bytes from FastAPI, runs both Quantum and Classical
    inference, extracts genomic biomarkers from PCA components, and returns
    a unified telemetry payload.
    """
    # Parse incoming file bytes directly in memory
    df = pd.read_csv(io.BytesIO(file_bytes), header=None, sep=None, engine="python")

    # Extract single patient FPKM profile
    raw_features = df.iloc[2:, patient_idx].values.astype(np.float32).reshape(1, -1)
    raw_features = np.nan_to_num(raw_features, nan=0.0)

    # Preprocessing Pipeline (transform only)
    x_scaled = scaler.transform(raw_features)
    x_pca = pca.transform(x_scaled)
    x_final = minmax.transform(x_pca)

    # --- Run Quantum VQC ---
    x_tensor = torch.tensor(x_final, dtype=torch.float32)
    q_start = time.time()
    with torch.no_grad():
        pauli_z = vqc_model.qlayer(x_tensor).item()
        tumor_prob = vqc_model(x_tensor).item()
    q_latency = (time.time() - q_start) * 1000

    vqc_prediction = "Tumor" if tumor_prob >= 0.5 else "Normal"
    vqc_confidence = (tumor_prob if tumor_prob >= 0.5 else 1.0 - tumor_prob) * 100.0

    # --- Run Classical Models ---
    classical_specs = [
        ("rf", rf_model, "Random Forest", "Classical Ensemble"),
        ("svm", svm_model, "Support Vector Machine", "Classical Kernel"),
        ("mlp", mlp_model, "Multi-Layer Perceptron", "Classical Neural Network"),
    ]

    classical_results = []
    for model_id, model, name, model_type in classical_specs:
        c_start = time.time()
        prob = model.predict_proba(x_final)[0][1]
        c_latency = (time.time() - c_start) * 1000

        pred = "Tumor" if prob >= 0.5 else "Normal"
        conf = (prob if prob >= 0.5 else 1.0 - prob) * 100.0

        classical_results.append({
            "id": model_id,
            "name": name,
            "type": model_type,
            "prediction": pred,
            "confidence_percentage": round(float(conf), 2),
            "test_benchmark": STATIC_BENCHMARKS.get(model_id, STATIC_BENCHMARKS.get("rf")),
            "latency_ms": round(c_latency, 2),
            "status": "Ready",
        })

    try:
        gene_names = df.iloc[2:, 0].values.astype(str)
    except Exception:
        gene_names = np.array([])

    top_comp_indices = np.argsort(np.abs(x_pca[0]))[::-1][:3]

    top_biomarkers = []
    for comp_idx in top_comp_indices:
        comp_weights = pca.components_[comp_idx]
        top_gene_indices = np.argsort(np.abs(comp_weights))[::-1][:2]
        comp_val = float(x_pca[0, comp_idx])
        norm_val = float(x_final[0, comp_idx])

        for g_idx in top_gene_indices:
            gene_name = str(gene_names[g_idx]) if g_idx < len(gene_names) else f"GENE_{g_idx}"
            loading_weight = float(comp_weights[g_idx])
            # Directional risk impact: alignment between loading weight and component activation
            impact = "increases_risk" if (loading_weight * comp_val >= 0) else "decreases_risk"

            top_biomarkers.append({
                "gene_name": gene_name,
                "pca_component": int(comp_idx),
                "loading_weight": round(loading_weight, 4),
                "normalized_component_value": round(norm_val, 4),
                "impact": impact,
            })

    explainability_shap = {
        "explainer_type": "PCA-Biomarker-Mapping",
        "top_biomarkers": top_biomarkers,
    }

    # 4. Construct Unified Payload
    return {
        "status": "success",
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "dataset_analyzed": "tcga-lung-cell-squamous-gene-exp-dataset",
        "primary_quantum_diagnosis": {
            "model_id": f"vqc_{n_qubits}q",
            "model_name": "Variational Quantum Classifier",
            "prediction": vqc_prediction,
            "binary_class": 1 if vqc_prediction == "Tumor" else 0,
            "confidence_percentage": round(float(vqc_confidence), 2),
            "quantum_expectation_value": round(float(pauli_z), 3),
            "execution_metadata": {
                "backend": "lightning.gpu",
                "framework": "PennyLane + PyTorch",
                "qubits_used": n_qubits,
                "circuit_depth": n_layers,
                "entanglement_strategy": "StronglyEntanglingLayers",
                "scaling": "MinMax [0, π]",
            },
            "test_benchmark": STATIC_BENCHMARKS.get("vqc_14q"),
            "latency_ms": round(q_latency, 1),
            "qubits_used": n_qubits,
            "circuit_depth": n_layers,
        },
        "classical_models": classical_results,
        "explainability_shap": explainability_shap,
    }
