"""
Configuration settings for the Hybrid Quantum Machine Learning Platform.

Provides centralized options for model services, Ollama LLM integration,
timeouts, and application settings. Supports environment variables and .env overrides.
"""

import os
from pathlib import Path
from typing import Any, Dict

BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"


def _load_env_file(filepath: Path) -> None:
    """Lightweight .env parser without external dependencies."""
    if not filepath.is_file():
        return
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip("'\"")
                # Do not override existing environment variables
                if key not in os.environ:
                    os.environ[key] = val
    except Exception:
        pass


# Load .env file on module import if present
_load_env_file(ENV_FILE)


class Settings:
    """Application configuration with environment variable support."""

    def __init__(self) -> None:
        # Ollama LLM Agentic RAG Configuration
        self.OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
        self.OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen2.5:1.5b")
        self.OLLAMA_TIMEOUT_SECONDS: float = float(os.getenv("OLLAMA_TIMEOUT_SECONDS", "3.5"))

    def to_dict(self) -> Dict[str, Any]:
        """Return configuration as dictionary."""
        return {
            "OLLAMA_BASE_URL": self.OLLAMA_BASE_URL,
            "OLLAMA_MODEL": self.OLLAMA_MODEL,
            "OLLAMA_TIMEOUT_SECONDS": self.OLLAMA_TIMEOUT_SECONDS,
        }


# Singleton configuration instance
settings = Settings()
