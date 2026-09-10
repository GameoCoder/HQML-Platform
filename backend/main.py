"""
Main application entrypoint for the Hybrid Quantum Machine Learning Platform.

Initializes FastAPI, configures permissive CORS for client frontends,
and attaches the inference API routes.
"""

from pathlib import Path
import sys

# Ensure backend root is in Python sys.path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Auto-discover site-packages from local .venv and ~/venv
for site_pkg in list(BASE_DIR.glob(".venv/lib/python*/site-packages")) + list((Path.home() / "venv").glob("lib/python*/site-packages")):
    if str(site_pkg) not in sys.path:
        sys.path.insert(0, str(site_pkg))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router as api_router
from api.auth_routes import router as auth_router

# Initialize FastAPI application
app = FastAPI(
    title="Hybrid Quantum Machine Learning Platform API",
    description=(
        "A modular, scalable backend serving disease-specific hybrid "
        "quantum-classical inference pipelines (PyTorch, PennyLane, Scikit-Learn)."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(auth_router)


@app.get("/", tags=["Health & Status"])
async def root():
    """Root metadata and platform status."""
    return {
        "platform": "Hybrid Quantum Machine Learning Platform",
        "status": "online",
        "version": "1.0.0",
        "documentation": "/docs",
        "endpoints": {
            "predict": "POST /api/predict/{dataset_id}",
            "predict_mri": "POST /api/predict/mri",
            "models": "GET /api/models",
            "health": "GET /health",
        },
    }


@app.get("/health", tags=["Health & Status"])
async def health_check():
    """Health check probe for load balancers and orchestrators."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
