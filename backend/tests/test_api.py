"""
Integration tests for Hybrid Quantum Machine Learning Platform API.

Includes tests for quantum-classical inference routing, PCA biomarker extraction,
Agentic RAG clinical summary generation, and Ollama fail-safe fallback handling.
"""

import io
from pathlib import Path
import sys
from unittest.mock import AsyncMock, patch

# Ensure backend root and site-packages are in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

for site_pkg in list(BASE_DIR.glob(".venv/lib/python*/site-packages")) + list((Path.home() / "venv").glob("lib/python*/site-packages")):
    if str(site_pkg) not in sys.path:
        sys.path.insert(0, str(site_pkg))

from fastapi.testclient import TestClient
import httpx
import numpy as np
from PIL import Image
import pytest

from main import app

client = TestClient(app)


# Sample Mock Response from Ollama for CI/test environments
MOCK_OLLAMA_RESPONSE = httpx.Response(
    200,
    json={
        "response": (
            '{\n'
            '  "key_findings": [\n'
            '    "Pronounced overexpression across squamous differentiation markers.",\n'
            '    "Quantum circuit entanglement captures multi-gene dependency across PCA components."\n'
            '  ],\n'
            '  "keywords": [\n'
            '    "Squamous Cell Carcinoma",\n'
            '    "TP53 Dysregulation",\n'
            '    "14-Qubit Entanglement"\n'
            '  ]\n'
            '}'
        )
    },
    request=httpx.Request("POST", "http://localhost:11434/api/generate"),
)

MOCK_OLLAMA_MRI_RESPONSE = httpx.Response(
    200,
    json={
        "response": (
            '{\n'
            '  "key_findings": [\n'
            '    "Deep spatial feature extraction indicates healthy structural morphology with no significant mass effect or architectural distortion.",\n'
            '    "The 14-qubit quantum measurement strongly isolated the notumor state vector, demonstrating a 99% baseline recall for healthy tissue."\n'
            '  ],\n'
            '  "keywords": [\n'
            '    "Normal Baseline",\n'
            '    "No Mass Effect",\n'
            '    "14-Qubit Multi-Observable",\n'
            '    "ResNet-50 Extractor"\n'
            '  ]\n'
            '}'
        )
    },
    request=httpx.Request("POST", "http://localhost:11434/api/generate"),
)


def _generate_dummy_image_bytes(fmt: str = "JPEG", size=(224, 224)) -> bytes:
    img = Image.fromarray(np.uint8(np.random.rand(size[0], size[1], 3) * 255))
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()



def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "documentation" in data


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_list_models():
    response = client.get("/api/models")
    assert response.status_code == 200
    models = response.json()
    assert isinstance(models, list)
    assert "tcga-lung-cell" in models
    assert "brain-tumor" in models
    assert any("breast-cancer" in m for m in models)


def test_predict_tcga_lung_cell_with_explainability_and_rag():
    """Test TCGA lung cell pipeline end-to-end including PCA explainability and mocked RAG summary."""
    header = "gene_id\tsample_patient_01\tsample_patient_02\ncomment\tmeta1\tmeta2\n"
    # Genes starting with prominent oncogenes
    genes = ["TP53", "CDKN2A", "SOX2", "EGFR"] + [f"GENE_{i}" for i in range(56903)]
    gene_rows = "\n".join(f"{g}\t0.42\t1.15" for g in genes) + "\n"
    sample_tsv = (header + gene_rows).encode("utf-8")

    files = {"file": ("patient_tcga.tsv", io.BytesIO(sample_tsv), "text/tab-separated-values")}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=MOCK_OLLAMA_RESPONSE):
        response = client.post("/api/predict/tcga-lung-cell", files=files)

    assert response.status_code == 200
    data = response.json()

    # 1. Base status and metadata
    assert data["status"] == "success"
    assert data["dataset_analyzed"] == "tcga-lung-cell-squamous-gene-exp-dataset"
    assert "timestamp" in data

    # 2. Quantum Telemetry
    assert "primary_quantum_diagnosis" in data
    q_diag = data["primary_quantum_diagnosis"]
    assert q_diag["model_id"] == "vqc_14q"
    assert q_diag["prediction"] in ["Tumor", "Normal"]
    assert q_diag["binary_class"] in [0, 1]
    assert 0.0 <= q_diag["confidence_percentage"] <= 100.0
    assert q_diag["qubits_used"] == 14
    assert q_diag["circuit_depth"] == 4
    assert q_diag["latency_ms"] > 0

    # 3. Classical baselines
    assert "classical_models" in data
    assert len(data["classical_models"]) == 3

    # 4. Explainability SHAP (PCA Biomarker Mapping)
    assert "explainability_shap" in data
    exp_shap = data["explainability_shap"]
    assert exp_shap["explainer_type"] == "PCA-Biomarker-Mapping"
    assert "top_biomarkers" in exp_shap
    assert len(exp_shap["top_biomarkers"]) > 0

    b0 = exp_shap["top_biomarkers"][0]
    assert "gene_name" in b0
    assert "pca_component" in b0
    assert "loading_weight" in b0
    assert b0["impact"] in ["increases_risk", "decreases_risk"]

    # 5. Clinical Summary (RAG)
    assert "clinical_summary" in data
    summary = data["clinical_summary"]
    assert "key_findings" in summary
    assert len(summary["key_findings"]) == 2
    assert "keywords" in summary
    assert len(summary["keywords"]) >= 3
    assert "llm_engine" in summary


def test_predict_tcga_lung_cell_ollama_fallback_on_timeout():
    """Verify that if Ollama times out, the API gracefully returns deterministic fallback without 500."""
    header = "gene_id\tsample_01\ncomment\tmeta\n"
    gene_rows = "\n".join(f"gene_{i}\t0.5" for i in range(56907)) + "\n"
    sample_tsv = (header + gene_rows).encode("utf-8")

    files = {"file": ("patient_timeout.tsv", io.BytesIO(sample_tsv), "text/tab-separated-values")}

    # Simulate Ollama request timeout
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, side_effect=httpx.TimeoutException("Ollama timed out")):
        response = client.post("/api/predict/tcga-lung-cell", files=files)

    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "success"
    assert "clinical_summary" in data
    summary = data["clinical_summary"]
    assert len(summary["key_findings"]) == 2
    assert len(summary["keywords"]) >= 3
    # Fallback should reference the configured model
    assert "via Ollama" in summary["llm_engine"]


def test_predict_tcga_lung_cell_ollama_fallback_on_connection_error():
    """Verify fallback when Ollama is offline or port is closed."""
    header = "gene_id\tsample_01\ncomment\tmeta\n"
    gene_rows = "\n".join(f"gene_{i}\t0.5" for i in range(56907)) + "\n"
    sample_tsv = (header + gene_rows).encode("utf-8")

    files = {"file": ("patient_offline.tsv", io.BytesIO(sample_tsv), "text/tab-separated-values")}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, side_effect=httpx.ConnectError("Connection refused")):
        response = client.post("/api/predict/tcga-lung-cell", files=files)

    assert response.status_code == 200
    data = response.json()
    assert "clinical_summary" in data
    assert len(data["clinical_summary"]["key_findings"]) == 2


def test_predict_tcga_lung_cell_with_patient_idx():
    """Test querying a specific patient column via query parameter."""
    header = "gene_id\tpt1\tpt2\ncomment\t-\t-\n"
    gene_rows = "\n".join(f"gene_{i}\t0.1\t0.9" for i in range(56907)) + "\n"
    sample_tsv = (header + gene_rows).encode("utf-8")

    files = {"file": ("patients.tsv", io.BytesIO(sample_tsv), "text/tab-separated-values")}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=MOCK_OLLAMA_RESPONSE):
        response = client.post("/api/predict/tcga-lung-cell?patient_idx=2", files=files)

    assert response.status_code == 200
    data = response.json()
    assert "primary_quantum_diagnosis" in data
    assert "explainability_shap" in data


def test_predict_tcga_lung_cell_feature_mismatch_400():
    """Providing wrong feature dimension should return 400 Bad Request with an informative error."""
    sample_tsv = b"sample_id\tgene_1\ncomment\tmeta\ngene_a\t1.0\n"
    files = {"file": ("short.tsv", io.BytesIO(sample_tsv), "text/tab-separated-values")}

    response = client.post("/api/predict/tcga-lung-cell", files=files)
    assert response.status_code == 400
    assert "processing error" in response.json()["detail"].lower() or "features" in response.json()["detail"].lower()


def test_predict_breast_cancer_success():
    sample_tsv = b"sample_id\tmarker_ER\tmarker_PR\tmarker_HER2\nBC_101\t8.2\t7.1\t1.2\n"
    files = {"file": ("breast_patient.tsv", io.BytesIO(sample_tsv), "text/tab-separated-values")}

    response = client.post("/api/predict/breast-cancer-dataset", files=files)
    assert response.status_code == 200

    data = response.json()
    assert data["dataset_id"] == "breast-cancer-dataset"
    assert data["status"] == "success"
    assert "prediction" in data


def test_predict_unknown_dataset_404():
    sample_tsv = b"dummy\tvalues\n1\t2\n"
    files = {"file": ("data.tsv", io.BytesIO(sample_tsv), "text/tab-separated-values")}

    response = client.post("/api/predict/non-existent-disease", files=files)
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_predict_empty_file_400():
    files = {"file": ("empty.tsv", io.BytesIO(b""), "text/tab-separated-values")}

    response = client.post("/api/predict/tcga-lung-cell", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Brain MRI Image Pipeline Integration Tests
# ---------------------------------------------------------------------------

def test_predict_mri_jpeg_success():
    """Verify end-to-end Brain MRI inference for valid JPEG upload with mocked RAG summary."""
    jpeg_bytes = _generate_dummy_image_bytes(fmt="JPEG")
    files = {"file": ("patient_scan.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=MOCK_OLLAMA_MRI_RESPONSE):
        response = client.post("/api/predict/mri", files=files)

    assert response.status_code == 200
    data = response.json()

    # 1. Base status & dataset identifier
    assert data["status"] == "success"
    assert data["dataset_analyzed"] == "brain-tumor-mri-dataset"
    assert "timestamp" in data

    # 2. 14-Qubit Multi-Observable Quantum Telemetry
    assert "primary_quantum_diagnosis" in data
    q_diag = data["primary_quantum_diagnosis"]
    assert q_diag["model_id"] == "hybrid_resnet_vqc_14q"
    assert q_diag["prediction"] in ["glioma", "meningioma", "notumor", "pituitary"]
    assert q_diag["binary_class"] in [0, 1, 2, 3]
    assert 0.0 <= q_diag["confidence_percentage"] <= 100.0
    assert "quantum_expectation_values" in q_diag
    assert len(q_diag["quantum_expectation_values"]) == 4
    assert q_diag["qubits_used"] == 14
    assert q_diag["circuit_depth"] == 4
    assert q_diag["latency_ms"] > 0

    # Quantum benchmark validation
    q_bm = q_diag["test_benchmark"]
    assert q_bm["accuracy"] == 0.72
    assert q_bm["macro_recall"] == 0.72
    assert q_bm["macro_specificity"] == 0.9071
    assert q_bm["f1_score"] == 0.71

    # 3. Classical Baselines (RF, SVM, MLP)
    assert "classical_models" in data
    assert len(data["classical_models"]) == 3
    rf = next(m for m in data["classical_models"] if m["id"] == "rf")
    assert rf["name"] == "Random Forest"
    assert rf["status"] == "Ready"
    assert rf["test_benchmark"]["accuracy"] == 0.85
    assert rf["test_benchmark"]["macro_specificity"] == 0.9512

    svm = next(m for m in data["classical_models"] if m["id"] == "svm")
    assert svm["name"] == "Support Vector Machine"
    assert svm["test_benchmark"]["accuracy"] == 0.84

    mlp = next(m for m in data["classical_models"] if m["id"] == "mlp")
    assert mlp["name"] == "Multi-Layer Perceptron"
    assert mlp["test_benchmark"]["accuracy"] == 0.83

    # 4. Latent PCA Explainability
    assert "explainability_shap" in data
    exp_shap = data["explainability_shap"]
    assert exp_shap["explainer_type"] == "ResNet-PCA-Latent-Mapping"
    assert "top_components" in exp_shap
    assert len(exp_shap["top_components"]) == 3
    c0 = exp_shap["top_components"][0]
    assert c0["component_id"].startswith("PCA_")
    assert 0.0 <= c0["loading_magnitude"] <= 1.0
    assert "normalized_value" in c0
    assert "impact" in c0

    # 5. Agentic RAG Clinical Summary
    assert "clinical_summary" in data
    summary = data["clinical_summary"]
    assert len(summary["key_findings"]) == 2
    assert len(summary["keywords"]) >= 3
    assert "llm_engine" in summary


def test_predict_mri_png_success():
    """Verify inference execution for PNG format uploads."""
    png_bytes = _generate_dummy_image_bytes(fmt="PNG")
    files = {"file": ("patient_scan.png", io.BytesIO(png_bytes), "image/png")}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=MOCK_OLLAMA_MRI_RESPONSE):
        response = client.post("/api/predict/mri", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "primary_quantum_diagnosis" in data
    assert len(data["primary_quantum_diagnosis"]["quantum_expectation_values"]) == 4


def test_predict_mri_ollama_fallback_on_timeout():
    """Verify deterministic clinical summary fallback for Brain MRI when Ollama times out."""
    jpeg_bytes = _generate_dummy_image_bytes(fmt="JPEG")
    files = {"file": ("patient_timeout.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, side_effect=httpx.TimeoutException("Ollama timeout")):
        response = client.post("/api/predict/mri", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "clinical_summary" in data
    summary = data["clinical_summary"]
    assert len(summary["key_findings"]) == 2
    assert len(summary["keywords"]) >= 3
    assert "via Ollama" in summary["llm_engine"]


def test_predict_mri_gatekeeper_anomaly_detection_high():
    """Verify PCA Gatekeeper anomaly detection triggers when feature mapping exceeds upper bound (> pi + 0.5)."""
    jpeg_bytes = _generate_dummy_image_bytes(fmt="JPEG")
    files = {"file": ("patient_ood.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")}

    # Ensure module is loaded
    from controllers.inference_controller import get_inference_engine
    get_inference_engine("brain-tumor")
    mri_mod = sys.modules["models.brain_tumor.inference"]

    with patch.object(mri_mod.minmax, "transform", return_value=np.full((1, 14), 10.0)):
        response = client.post("/api/predict/mri", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "error"
    assert data["message"] == "Out-of-Distribution Error: The uploaded image does not appear to be a valid Brain MRI scan."
    assert "clinical_summary" not in data


def test_predict_mri_gatekeeper_anomaly_detection_low():
    """Verify PCA Gatekeeper anomaly detection triggers when feature mapping falls below lower bound (< -0.5)."""
    jpeg_bytes = _generate_dummy_image_bytes(fmt="JPEG")
    files = {"file": ("patient_ood_low.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")}

    from controllers.inference_controller import get_inference_engine
    get_inference_engine("brain-tumor")
    mri_mod = sys.modules["models.brain_tumor.inference"]

    with patch.object(mri_mod.minmax, "transform", return_value=np.full((1, 14), -1.0)):
        response = client.post("/api/predict/mri", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "error"
    assert data["message"] == "Out-of-Distribution Error: The uploaded image does not appear to be a valid Brain MRI scan."


def test_predict_mri_invalid_mime_400():
    """Uploading a non-image file (e.g. text/tsv) should return 400 Bad Request."""
    files = {"file": ("document.tsv", io.BytesIO(b"invalid\tdata"), "text/tab-separated-values")}
    response = client.post("/api/predict/mri", files=files)

    assert response.status_code == 400
    assert "only jpeg and png" in response.json()["detail"].lower()


def test_predict_mri_empty_file_400():
    """Uploading an empty image file should return 400 Bad Request."""
    files = {"file": ("empty.jpg", io.BytesIO(b""), "image/jpeg")}
    response = client.post("/api/predict/mri", files=files)

    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_predict_mri_corrupted_image_error():
    """Uploading corrupt image bytes with image/jpeg header should return error status."""
    corrupted_bytes = b"\xff\xd8\xff\xe0" + b"\x00" * 20  # Incomplete/corrupt JPEG header
    files = {"file": ("corrupt.jpg", io.BytesIO(corrupted_bytes), "image/jpeg")}
    response = client.post("/api/predict/mri", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "error"
    assert "corrupted or invalid image" in data["message"].lower()


def test_predict_mri_via_dataset_id_route():
    """Verify that POST /api/predict/brain-tumor and alias brain-mri-dataset process MRI images correctly."""
    jpeg_bytes = _generate_dummy_image_bytes(fmt="JPEG")
    files = {"file": ("scan.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")}

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=MOCK_OLLAMA_MRI_RESPONSE):
        response = client.post("/api/predict/brain-tumor", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["dataset_analyzed"] == "brain-tumor-mri-dataset"
    assert "primary_quantum_diagnosis" in data

    # Test alias route /api/predict/brain-mri-dataset
    files_alias = {"file": ("scan.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")}
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=MOCK_OLLAMA_MRI_RESPONSE):
        response_alias = client.post("/api/predict/brain-mri-dataset", files=files_alias)
    assert response_alias.status_code == 200
    assert response_alias.json()["status"] == "success"


def test_rag_chat_success_fallback():
    """Verify conversational Agentic RAG chat endpoint returns valid clinical replies."""
    payload = {
        "message": "Can you explain the significance of the TP53 biomarker in this case?",
        "history": [],
        "patient_context": {
            "headline": "Squamous Cell Malignancy Detected",
            "quantumDiagnosis": {
                "prediction": "Tumor",
                "confidence_percentage": 94.5,
                "circuit_depth": 4,
                "quantum_expectation_values": [-0.3, 0.7, -0.2, 0.1]
            },
            "explainability": {
                "top_biomarkers": [
                    {"gene_name": "TP53", "loading_weight": 0.45}
                ]
            }
        },
        "dataset": "tcga-lung-cell"
    }

    response = client.post("/api/rag/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "reply" in data
    assert "TP53" in data["reply"]
    assert "model" in data


def test_rag_chat_empty_message_400():
    """Verify validation error when message is empty."""
    response = client.post("/api/rag/chat", json={"message": "   "})
    assert response.status_code == 400
    assert "Message cannot be empty" in response.json()["detail"]


