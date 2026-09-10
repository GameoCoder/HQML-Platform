"""
Inference Controller for the Hybrid Quantum Machine Learning Platform.

Provides dynamic factory routing to disease-specific quantum-classical
inference engines based on dataset_id, with module caching and schema validation.
"""

from __future__ import annotations

import importlib
import importlib.util
import inspect
import sys
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from fastapi import HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from starlette.concurrency import run_in_threadpool

# Base directory for backend project and models directory
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"

# Ensure BASE_DIR is present in sys.path for absolute imports
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))


# ---------------------------------------------------------------------------
# Pydantic Schemas for Unified Response
# ---------------------------------------------------------------------------

class BenchmarkMetrics(BaseModel):
    """Benchmark performance metrics (accuracy, sensitivity, specificity, auc_roc, macro_recall, macro_specificity, f1_score)."""
    accuracy: Optional[float] = Field(default=None, description="Test benchmark accuracy")
    sensitivity: Optional[float] = Field(default=None, description="True Positive Rate (sensitivity)")
    specificity: Optional[float] = Field(default=None, description="True Negative Rate (specificity)")
    macro_recall: Optional[float] = Field(default=None, description="Macro recall")
    macro_specificity: Optional[float] = Field(default=None, description="Macro specificity")
    f1_score: Optional[float] = Field(default=None, description="F1 score")
    auc_roc: Optional[float] = Field(default=None, description="Area Under the ROC Curve")

    model_config = ConfigDict(extra="allow")


class QuantumExecutionMetadata(BaseModel):
    """Execution metadata for the quantum circuit."""
    backend: Optional[str] = Field(default=None, description="Simulation or QPU backend (e.g. lightning.gpu)")
    framework: Optional[str] = Field(default=None, description="Quantum computing framework")
    qubits_used: Optional[int] = Field(default=None, description="Number of qubits in circuit")
    circuit_depth: Optional[int] = Field(default=None, description="Circuit ansatz depth / layers")
    entanglement_strategy: Optional[str] = Field(default=None, description="Entangling gate layer strategy")
    scaling: Optional[str] = Field(default=None, description="Feature map rotation angle scaling range")

    model_config = ConfigDict(extra="allow")


class PrimaryQuantumDiagnosis(BaseModel):
    """Execution output from the primary quantum circuit (VQC/QNN)."""
    model_id: str = Field(..., description="Quantum model/circuit identifier")
    model_name: Optional[str] = Field(default=None, description="Human-readable model name")
    prediction: str = Field(..., description="Quantum predicted class (e.g. 'Tumor', 'Normal', 'notumor')")
    binary_class: int = Field(..., description="Classification index (0, 1, 2, 3)")
    confidence_percentage: float = Field(..., description="Confidence percentage (0-100%)")
    quantum_expectation_value: Optional[float] = Field(default=None, description="PauliZ expectation value from single-observable quantum circuit")
    quantum_expectation_values: Optional[List[float]] = Field(default=None, description="PauliZ expectation values for multi-observable circuits")
    latency_ms: float = Field(..., description="Circuit execution latency in ms")
    qubits_used: Optional[int] = Field(default=None, description="Number of qubits in circuit")
    circuit_depth: Optional[int] = Field(default=None, description="Ansatz layers / circuit depth")
    execution_metadata: Optional[QuantumExecutionMetadata] = Field(default=None, description="Execution hardware and circuit details")
    test_benchmark: Optional[BenchmarkMetrics] = Field(default=None, description="Static model benchmark metrics")

    model_config = ConfigDict(extra="allow")


class ClassicalModelDiagnosis(BaseModel):
    """Execution output from a classical ML/DL baseline model."""
    id: str = Field(..., description="Short model identifier (e.g. 'rf', 'svm', 'mlp')")
    name: str = Field(..., description="Human-readable model name")
    type: str = Field(..., description="Architecture/algorithm family")
    prediction: str = Field(..., description="Predicted class")
    confidence_percentage: float = Field(..., description="Confidence percentage (0-100%)")
    latency_ms: float = Field(..., description="Model latency in ms")
    status: str = Field(default="Ready", description="Operational status")
    test_benchmark: Optional[BenchmarkMetrics] = Field(default=None, description="Static benchmark metrics")

    model_config = ConfigDict(extra="allow")


class QuantumModelOutput(BaseModel):
    """Execution output from a quantum inference branch (mock/fallback format)."""
    model_name: Optional[str] = None
    prediction: Optional[str] = None
    confidence: Optional[float] = None
    latency_ms: Optional[float] = None
    circuit_details: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(extra="allow")


class ClassicalModelOutput(BaseModel):
    """Execution output from classical baseline (mock/fallback format)."""
    model_name: Optional[str] = None
    prediction: Optional[str] = None
    confidence: Optional[float] = None
    latency_ms: Optional[float] = None
    architecture: Optional[str] = None

    model_config = ConfigDict(extra="allow")


class BiomarkerItem(BaseModel):
    """Genomic biomarker mapped from active PCA components."""
    gene_name: str = Field(..., description="Gene or biomarker identifier")
    pca_component: int = Field(..., description="Active PCA component index")
    loading_weight: float = Field(..., description="PCA loading weight magnitude")
    normalized_component_value: Optional[float] = Field(default=None, description="Patient's normalized component activation value")
    impact: str = Field(..., description="Directional risk impact: 'increases_risk' or 'decreases_risk'")

    model_config = ConfigDict(extra="allow")


class LatentComponentItem(BaseModel):
    """Latent PCA component item for image-based models."""
    component_id: str = Field(..., description="PCA component identifier (e.g. 'PCA_0')")
    loading_magnitude: float = Field(..., description="Relative magnitude/weight of component")
    normalized_value: float = Field(..., description="Patient's normalized component activation value")
    impact: str = Field(..., description="Directional risk/classification impact")

    model_config = ConfigDict(extra="allow")


class ExplainabilityShap(BaseModel):
    """Explainability payload containing top genomic biomarkers or latent PCA components."""
    explainer_type: str = Field(default="PCA-Biomarker-Mapping", description="Explainability method")
    top_biomarkers: Optional[List[BiomarkerItem]] = Field(default=None, description="Top active genomic biomarkers")
    top_components: Optional[List[LatentComponentItem]] = Field(default=None, description="Top active latent PCA components")

    model_config = ConfigDict(extra="allow")


class ClinicalSummary(BaseModel):
    """Agentic RAG generated clinical summary and keywords."""
    key_findings: List[str] = Field(..., description="Concise clinical findings and quantum correlation sentences")
    keywords: List[str] = Field(..., description="3 to 4 clinical/genomic keywords")
    llm_engine: str = Field(..., description="LLM identifier used for generation")

    model_config = ConfigDict(extra="allow")


class UnifiedInferenceResponse(BaseModel):
    """
    Unified telemetry response supporting disease-specific
    full-scale diagnostic pipelines, explainability, and Agentic RAG summaries.
    """
    # Status and base telemetry
    status: Optional[str] = Field(default="success", description="Status of the inference execution")
    message: Optional[str] = Field(default=None, description="Status or error message (e.g. out-of-distribution)")
    timestamp: Optional[str] = Field(default=None, description="UTC execution timestamp (ISO 8601)")
    dataset_analyzed: Optional[str] = Field(default=None, description="Dataset identifier/tag analyzed")

    # Quantum and classical diagnoses
    primary_quantum_diagnosis: Optional[PrimaryQuantumDiagnosis] = Field(
        default=None, description="Quantum engine diagnosis metrics"
    )
    classical_models: Optional[List[ClassicalModelDiagnosis]] = Field(
        default=None, description="Classical baselines evaluations"
    )

    # Explainability & Agentic RAG
    explainability_shap: Optional[ExplainabilityShap] = Field(
        default=None, description="PCA-based biomarker attribution and genomic risk mapping"
    )
    clinical_summary: Optional[ClinicalSummary] = Field(
        default=None, description="LLM-generated oncologist clinical summary"
    )

    # General / Mock fallback fields (for backward compatibility)
    dataset_id: Optional[str] = Field(default=None, description="Identifier of the target disease dataset")
    prediction: Optional[str] = Field(default=None, description="Consensus/merged prediction")
    confidence: Optional[float] = Field(default=None, description="Merged confidence score")
    total_latency_ms: Optional[float] = Field(default=None, description="Combined pipeline latency in ms")
    quantum_model: Optional[QuantumModelOutput] = Field(default=None, description="Quantum engine metrics")
    classical_model: Optional[ClassicalModelOutput] = Field(default=None, description="Classical engine metrics")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional context and input stats")

    model_config = ConfigDict(
        extra="allow",
        json_schema_extra={
            "example": {
                "timestamp": "2026-09-06T13:15:02Z",
                "dataset_analyzed": "tcga-lung-cell-squamous-gene-exp-dataset",
                "primary_quantum_diagnosis": {
                    "model_id": "vqc_14q",
                    "prediction": "Tumor",
                    "binary_class": 1,
                    "confidence_percentage": 74.33,
                    "quantum_expectation_value": 0.003,
                    "latency_ms": 186.5,
                    "qubits_used": 14,
                    "circuit_depth": 4,
                },
                "classical_models": [
                    {
                        "id": "rf",
                        "name": "Random Forest",
                        "type": "Classical Ensemble",
                        "prediction": "Tumor",
                        "confidence_percentage": 88.0,
                        "latency_ms": 4.29,
                        "status": "Ready",
                    },
                    {
                        "id": "svm",
                        "name": "Support Vector Machine",
                        "type": "Classical Kernel",
                        "prediction": "Tumor",
                        "confidence_percentage": 98.03,
                        "latency_ms": 0.25,
                        "status": "Ready",
                    },
                    {
                        "id": "mlp",
                        "name": "Multi-Layer Perceptron",
                        "type": "Classical Neural Network",
                        "prediction": "Tumor",
                        "confidence_percentage": 100.0,
                        "latency_ms": 0.19,
                        "status": "Ready",
                    },
                ],
            }
        },
    )


# ---------------------------------------------------------------------------
# Module Registry & Dynamic Loader Factory
# ---------------------------------------------------------------------------

# Global cache: maps dataset_id to loaded run_inference callable
_LOADED_ENGINES: Dict[str, Callable[[bytes], Dict[str, Any]]] = {}


def get_available_datasets() -> List[str]:
    """
    Scans the `models/` directory for valid inference engine packages.

    Returns:
        Sorted list of dataset IDs with an inference.py module.
    """
    if not MODELS_DIR.is_dir():
        return []

    available = []
    for entry in MODELS_DIR.iterdir():
        if entry.is_dir() and (entry / "inference.py").is_file():
            available.append(entry.name)
    return sorted(available)


def _resolve_model_file(dataset_id: str) -> Optional[Path]:
    """
    Finds the file path to `inference.py` for a dataset_id.
    Accepts hyphenated names ('tcga-lung-cell') as well as
    snake_cased identifiers ('tcga_lung_cell'), with or without '-dataset',
    and known aliases ('mri', 'brain-mri', 'brain-tumor').
    """
    clean_id = dataset_id.strip().lower()

    aliases = {
        "mri": "brain-tumor",
        "brain-mri": "brain-tumor",
        "brain_mri": "brain-tumor",
        "brain-mri-dataset": "brain-tumor",
        "brain_mri_dataset": "brain-tumor",
        "brain-tumor": "brain-tumor",
        "brain_tumor": "brain-tumor",
        "brain-tumor-dataset": "brain-tumor",
        "lung": "tcga-lung-cell",
        "lung-cell": "tcga-lung-cell",
        "tcga": "tcga-lung-cell",
    }
    target_id = aliases.get(clean_id, clean_id)
    base_id = target_id.removesuffix("-dataset").removesuffix("_dataset")

    candidates = [
        MODELS_DIR / target_id / "inference.py",
        MODELS_DIR / target_id.replace("-", "_") / "inference.py",
        MODELS_DIR / target_id.replace("_", "-") / "inference.py",
        MODELS_DIR / base_id / "inference.py",
        MODELS_DIR / f"{base_id}-dataset" / "inference.py",
        MODELS_DIR / f"{base_id}_dataset" / "inference.py",
        MODELS_DIR / base_id.replace("-", "_") / "inference.py",
        MODELS_DIR / base_id.replace("_", "-") / "inference.py",
    ]
    for path in candidates:
        if path.is_file():
            return path
    return None


def get_inference_engine(dataset_id: str) -> Callable[[bytes], Dict[str, Any]]:
    """
    Factory function that dynamically imports and returns the `run_inference`
    function for the requested disease dataset.

    Args:
        dataset_id: Disease dataset identifier (e.g. 'tcga-lung-cell', 'breast-cancer-dataset').

    Raises:
        HTTPException(404): If dataset_id is not found or unsupported.
        HTTPException(500): If the model module fails to import or lacks `run_inference`.

    Returns:
        Callable[[bytes], Dict[str, Any]]: The loaded run_inference function.
    """
    # 1. Return cached callable if already loaded
    if dataset_id in _LOADED_ENGINES:
        return _LOADED_ENGINES[dataset_id]

    # 2. Locate model file on filesystem
    model_file = _resolve_model_file(dataset_id)
    if not model_file:
        available = get_available_datasets()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Inference engine for dataset '{dataset_id}' not found. "
                f"Available engines: {available}"
            ),
        )

    # 3. Canonical and alias module names
    canonical_id = model_file.parent.name
    canonical_module_name = f"models.{canonical_id.replace('-', '_')}.inference"
    normalized_id = dataset_id.replace("-", "_")

    module_names_to_try = [
        canonical_module_name,
        f"models.{canonical_id}.inference",
        f"models.{normalized_id}.inference",
        f"models.{dataset_id}.inference",
    ]

    # Check if already in sys.modules
    for mod_name in module_names_to_try:
        if mod_name in sys.modules:
            mod = sys.modules[mod_name]
            if hasattr(mod, "run_inference") and callable(getattr(mod, "run_inference")):
                runner = getattr(mod, "run_inference")
                _LOADED_ENGINES[dataset_id] = runner
                _LOADED_ENGINES[canonical_id] = runner
                return runner

    # 4. Dynamically load the module using importlib.util.spec_from_file_location
    try:
        spec = importlib.util.spec_from_file_location(canonical_module_name, model_file)
        if spec is None or spec.loader is None:
            raise ImportError(f"Could not initialize spec for {canonical_module_name} from {model_file}")

        module = importlib.util.module_from_spec(spec)
        # Register in sys.modules for all name variants
        for name in module_names_to_try:
            sys.modules[name] = module

        # Execute module code
        spec.loader.exec_module(module)

        # 5. Extract and validate run_inference function
        if not hasattr(module, "run_inference") or not callable(getattr(module, "run_inference")):
            raise AttributeError(
                f"Module '{canonical_module_name}' at {model_file} does not define a callable 'run_inference'."
            )

        runner: Callable[[bytes], Dict[str, Any]] = getattr(module, "run_inference")

        # Cache runner for future requests
        _LOADED_ENGINES[dataset_id] = runner
        _LOADED_ENGINES[canonical_id] = runner
        return runner

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to dynamically import inference engine for '{dataset_id}': {str(exc)}",
        ) from exc


async def inference_controller(
    dataset_id: str,
    patient_data_bytes: bytes,
    patient_idx: int = 1,
    **kwargs: Any,
) -> Dict[str, Any]:
    """
    Main controller entrypoint for inference execution.

    Takes the dataset_id, retrieves the appropriate inference engine via
    the factory, executes it on the uploaded patient data bytes, and
    returns the unified result dictionary.

    Args:
        dataset_id: Target dataset identifier.
        patient_data_bytes: Raw TSV patient file content.
        patient_idx: Optional column index for target patient data (default: 1).
        **kwargs: Optional additional parameters forwarded to the engine runner.

    Returns:
        Unified dictionary with prediction, confidence, and latency breakdown.
    """
    engine_runner = get_inference_engine(dataset_id)

    # Inspect runner signature to determine supported parameters
    sig = inspect.signature(engine_runner)
    call_kwargs: Dict[str, Any] = {}
    if "patient_idx" in sig.parameters:
        call_kwargs["patient_idx"] = patient_idx
    for k, v in kwargs.items():
        if k in sig.parameters:
            call_kwargs[k] = v

    try:
        # If the inference engine is an async coroutine, await it directly;
        # otherwise run in Starlette's threadpool to prevent blocking the event loop.
        if inspect.iscoroutinefunction(engine_runner):
            result = await engine_runner(patient_data_bytes, **call_kwargs)
        else:
            result = await run_in_threadpool(engine_runner, patient_data_bytes, **call_kwargs)

        # Immediate return if engine returned an error (e.g. Gatekeeper out-of-distribution anomaly)
        if isinstance(result, dict) and result.get("status") == "error":
            return result

        # Agentic RAG: Generate clinical summary if explainability biomarkers/components exist or for supported datasets
        if "explainability_shap" in result or dataset_id in [
            "tcga-lung-cell",
            "tcga_lung_cell",
            "brain-tumor",
            "brain_tumor",
            "brain-mri-dataset",
            "brain_mri_dataset",
            "mri",
        ]:
            from services.rag_service import generate_clinical_summary

            q_diag = result.get("primary_quantum_diagnosis", {})
            exp_shap = result.get("explainability_shap", {})
            dataset_name = result.get("dataset_analyzed") or dataset_id
            clinical_summary = await generate_clinical_summary(
                quantum_diagnosis=q_diag,
                explainability_shap=exp_shap,
                dataset_analyzed=dataset_name,
            )
            result["clinical_summary"] = clinical_summary

        if "status" not in result:
            result["status"] = "success"

        return result

    except HTTPException:
        raise
    except (ValueError, IndexError, KeyError) as data_exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Patient data processing error for '{dataset_id}': {str(data_exc)}",
        ) from data_exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference execution error for '{dataset_id}': {str(exc)}",
        ) from exc


# Convenient alias for controller function
execute_inference = inference_controller
