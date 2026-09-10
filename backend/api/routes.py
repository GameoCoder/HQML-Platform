"""
API Route definitions for Hybrid Quantum Machine Learning inference.

Exposes endpoints for file uploads, routing patient data to disease-specific
quantum/classical models, inspecting available engines, and enforcing
Role-Based Access Control (RBAC) across Doctor, Researcher, and Admin tiers.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, File, Header, HTTPException, Path as FastAPIPath, Query, UploadFile, status
from pydantic import BaseModel

from controllers.inference_controller import (
    UnifiedInferenceResponse,
    get_available_datasets,
    inference_controller,
)
from services.auth_service import decode_access_token

router = APIRouter(tags=["Inference"])


# ---------------------------------------------------------------------------
# RBAC Clearance Enforcement
# ---------------------------------------------------------------------------

def check_user_dataset_permission(dataset_id: str, authorization: Optional[str] = None) -> None:
    """
    Enforces Role-Based Access Control (RBAC):
    - Doctor: Clearance restricted strictly to image-based diagnostic models.
    - Researcher: Clearance for both image-based and numerical/genomic models.
    - Admin: Full clearance across all diagnostic pipelines.
    """
    if not authorization:
        # Open access permitted when no token is present for backward compatibility
        return

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token. Please log in again.",
        )

    user_role = payload.get("role", "doctor")
    clean_id = dataset_id.strip().lower()
    is_image_model = any(k in clean_id for k in ("mri", "tumor", "brain", "image", "chest-xray"))

    if user_role == "doctor" and not is_image_model:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Access Restricted: Doctor clearance is restricted to image-based diagnostic models only. "
                f"Access to numerical/genomic dataset '{dataset_id}' requires Researcher or Admin clearance."
            ),
        )


# ---------------------------------------------------------------------------
# Available Models Endpoint
# ---------------------------------------------------------------------------

@router.get(
    "/api/models",
    response_model=list[str],
    summary="List available disease dataset engines",
    description="Returns a list of all installed disease-specific model engine identifiers.",
)
@router.get("/api/models/", response_model=list[str], include_in_schema=False)
async def list_models() -> list[str]:
    """Retrieve all available disease model dataset IDs."""
    return get_available_datasets()


# ---------------------------------------------------------------------------
# Brain MRI & Image Diagnostic Inference
# ---------------------------------------------------------------------------

@router.post(
    "/api/predict/mri",
    response_model=UnifiedInferenceResponse,
    response_model_exclude_none=True,
    summary="Execute Brain MRI Quantum-Classical Inference",
    description=(
        "Accepts a direct JPEG or PNG Brain MRI scan upload, validates image format, "
        "extracts 2048D spatial features with frozen ResNet-50, screens for out-of-distribution "
        "anomalies with PCA Gatekeeper, and executes 14-qubit Multi-Observable Hybrid VQC "
        "and classical ML benchmarks."
    ),
    status_code=status.HTTP_200_OK,
)
@router.post("/api/predict-image/", response_model=UnifiedInferenceResponse, response_model_exclude_none=True, include_in_schema=False)
@router.post("/api/predict-image", response_model=UnifiedInferenceResponse, response_model_exclude_none=True, include_in_schema=False)
async def predict_mri(
    file: Optional[UploadFile] = File(None, description="Brain MRI scan image (.jpg, .jpeg, or .png)"),
    image: Optional[UploadFile] = File(None, description="Alternative field name for image file"),
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    """
    POST /api/predict/mri

    Uploads a direct Brain MRI image file (JPEG/PNG) and executes the
    quantum-classical diagnostic pipeline in-memory.
    """
    check_user_dataset_permission("brain-tumor", authorization)

    upload = file or image
    if not upload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No image file provided. Please supply a valid JPEG or PNG Brain MRI scan.",
        )

    # 1. Validate MIME type & file extension
    allowed_content_types = {"image/jpeg", "image/png", "image/jpg"}
    content_type = (upload.content_type or "").lower()
    filename = (upload.filename or "").lower()
    allowed_extensions = (".jpg", ".jpeg", ".png")

    if content_type not in allowed_content_types and not any(filename.endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only JPEG and PNG images are supported.",
        )

    # 2. Read image bytes into memory without saving to disk
    try:
        image_bytes = await upload.read()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded image file: {exc!s}",
        ) from exc

    # 3. Validate non-empty payload
    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded image file is empty. Please supply a valid JPEG or PNG Brain MRI scan.",
        )

    # 4. Route to inference controller for brain-tumor
    result = await inference_controller(
        dataset_id="brain-tumor",
        patient_data_bytes=image_bytes,
    )

    return result


# ---------------------------------------------------------------------------
# Tabular / JSON Prediction Route (Frontend Compatibility)
# ---------------------------------------------------------------------------

class TabularPredictJsonRequest(BaseModel):
    dataset: Optional[str] = "breast-cancer"
    models: Optional[List[str]] = None
    data: Optional[List[float]] = None


@router.post(
    "/api/predict/",
    response_model=UnifiedInferenceResponse,
    response_model_exclude_none=True,
    summary="Execute Tabular / JSON Feature Inference",
    description="Accepts a numerical feature vector (e.g. 30 cytometric parameters) and routes to inference controller.",
)
@router.post("/api/predict", response_model=UnifiedInferenceResponse, response_model_exclude_none=True, include_in_schema=False)
async def predict_tabular_json(
    payload: Optional[TabularPredictJsonRequest] = Body(default=None),
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    """Handles JSON-based tabular predictions from the frontend."""
    target_dataset = payload.dataset if payload and payload.dataset else "breast-cancer"
    check_user_dataset_permission(target_dataset, authorization)

    if not payload or not payload.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No feature data vector provided in JSON request.",
        )

    # Convert feature vector into TSV bytes format
    features = payload.data
    tsv_content = "sample_id\t" + "\t".join(f"m_{i}" for i in range(len(features))) + "\n"
    tsv_content += "PATIENT_01\t" + "\t".join(str(v) for v in features) + "\n"
    tsv_bytes = tsv_content.encode("utf-8")

    result = await inference_controller(
        dataset_id=target_dataset,
        patient_data_bytes=tsv_bytes,
        patient_idx=1,
    )
    return result


# ---------------------------------------------------------------------------
# Parameterized Dataset Route (TSV / Raw File Uploads)
# ---------------------------------------------------------------------------

@router.post(
    "/api/predict/{dataset_id}",
    response_model=UnifiedInferenceResponse,
    response_model_exclude_none=True,
    summary="Execute Hybrid Quantum-Classical Inference",
    description=(
        "Accepts a raw TSV patient data file, routes to the matching disease engine "
        "(e.g. 'tcga-lung-cell'), and returns merged predictions with quantum/classical metrics."
    ),
    status_code=status.HTTP_200_OK,
)
async def predict(
    dataset_id: str = FastAPIPath(
        ...,
        description="Dataset identifier matching a model directory (e.g. 'tcga-lung-cell')",
        examples=["tcga-lung-cell"],
    ),
    file: UploadFile = File(
        ...,
        description="Single patient's raw TSV data file containing expression/clinical data",
    ),
    patient_idx: int = Query(
        default=1,
        ge=1,
        description="Column index of the target patient in the TSV file (default: 1)",
    ),
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    """
    POST /api/predict/{dataset_id}

    Uploads a raw patient TSV file and executes disease-specific quantum-classical
    inference through the inference controller factory.
    """
    # 1. Enforce Role-Based Access Control
    check_user_dataset_permission(dataset_id, authorization)

    # 2. Read file bytes asynchronously
    try:
        patient_data_bytes = await file.read()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {exc!s}",
        ) from exc

    # 3. Validate non-empty payload
    if not patient_data_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty. Please supply a valid raw TSV patient data file.",
        )

    # 4. Route to controller for dynamic engine resolution and inference execution
    result = await inference_controller(
        dataset_id=dataset_id,
        patient_data_bytes=patient_data_bytes,
        patient_idx=patient_idx,
    )

    return result


# ---------------------------------------------------------------------------
# Interactive Agentic RAG Chatbot Consultation
# ---------------------------------------------------------------------------

class RagChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = None
    patient_context: Optional[Dict[str, Any]] = None
    dataset: Optional[str] = "brain-tumor"


@router.post(
    "/api/rag/chat",
    summary="Interactive Agentic RAG Clinical Consultation",
    description="Allows clinicians and researchers to have interactive follow-up discussions with the RAG engine about patient findings.",
    status_code=status.HTTP_200_OK,
)
@router.post("/api/rag/chat/", include_in_schema=False)
async def rag_chat(
    payload: RagChatRequest = Body(...),
    authorization: Optional[str] = Header(default=None),
) -> dict[str, Any]:
    """
    POST /api/rag/chat

    Provides real-time clinical conversation with the Agentic RAG assistant
    grounded in the active patient's quantum-classical inference results.
    """
    from services.rag_service import chat_with_agentic_rag

    if not payload.message or not payload.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty.",
        )

    result = await chat_with_agentic_rag(
        message=payload.message.strip(),
        history=payload.history or [],
        patient_context=payload.patient_context or {},
        dataset=payload.dataset or "brain-tumor",
    )
    return result

