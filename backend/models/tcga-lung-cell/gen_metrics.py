import joblib
import torch
import torch.nn as nn
import pennylane as qml
import numpy as np
import json
from sklearn.metrics import accuracy_score, confusion_matrix, roc_auc_score

# Import your exact preprocessing function to get the exact X_test and y_test splits
from process import process_data

# 1. Define VQC Architecture (Matches your 14-qubit setup)
n_qubits = 14
n_layers = 4
dev = qml.device("lightning.gpu", wires=n_qubits)

@qml.qnode(dev, interface="torch")
def quantum_circuit(inputs, weights):
    qml.AngleEmbedding(inputs, wires=range(n_qubits), rotation='Y')
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

def calculate_metrics(y_true, y_probs, y_pred):
    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm.ravel() if len(cm.ravel()) == 4 else (0,0,0,0)
    
    accuracy = accuracy_score(y_true, y_pred)
    sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0.0 # True Positive Rate
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0 # True Negative Rate
    auc_roc = roc_auc_score(y_true, y_probs) if len(np.unique(y_true)) > 1 else 0.0
    
    return {
        "accuracy": round(accuracy, 3),
        "sensitivity": round(sensitivity, 3),
        "specificity": round(specificity, 3),
        "auc_roc": round(auc_roc, 3)
    }

def run_benchmarks():
    print("Loading test data...")
    csv_path = '../../../QML-Pipeline/1-datasets/tcga-lung-cell/tcga_dataset.csv'
    # We only need the test set to evaluate benchmark metrics
    _, _, (X_test, y_test) = process_data(csv_path)

    print("Loading Classical Models...")
    rf = joblib.load('weights/rf_model.joblib')
    svm = joblib.load('weights/svm_model.joblib')
    # Note: Using your saved MLP model
    
    print("Loading Quantum Model...")
    vqc = HybridVQC()
    vqc.load_state_dict(torch.load('weights/hybrid_vqc_25q.pt', map_location='cpu'))
    vqc.eval()

    print("Calculating Classical Metrics...")
    rf_probs = rf.predict_proba(X_test)[:, 1]
    rf_preds = (rf_probs >= 0.5).astype(int)
    rf_metrics = calculate_metrics(y_test, rf_probs, rf_preds)

    svm_probs = svm.predict_proba(X_test)[:, 1]
    svm_preds = (svm_probs >= 0.5).astype(int)
    svm_metrics = calculate_metrics(y_test, svm_probs, svm_preds)

    print("Calculating Quantum Metrics...")
    vqc_probs = []
    with torch.no_grad():
        for i in range(len(X_test)):
            x_tensor = torch.tensor(X_test[i], dtype=torch.float32).unsqueeze(0)
            vqc_probs.append(vqc(x_tensor).item())
    
    vqc_probs = np.array(vqc_probs)
    vqc_preds = (vqc_probs >= 0.5).astype(int)
    vqc_metrics = calculate_metrics(y_test, vqc_probs, vqc_preds)

    # Build the static JSON config
    static_metrics = {
        "vqc_14q": vqc_metrics,
        "rf": rf_metrics,
        "svm": svm_metrics
    }

    with open("weights/model_metrics.json", "w") as f:
        json.dump(static_metrics, f, indent=2)
    
    print("\nBenchmarks saved to weights/model_metrics.json!")
    print(json.dumps(static_metrics, indent=2))

if __name__ == "__main__":
    run_benchmarks()