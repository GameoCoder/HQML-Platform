"""
Authentication & Role-Based Access Control (RBAC) Service.

Provides secure SQLite-backed user storage, salted PBKDF2 password hashing,
stateless HMAC-SHA256 bearer tokens, and dynamic cryptographic SVG captchas.
Seeds default accounts for Doctor, Researcher, and Admin.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
from pathlib import Path
import random
import secrets
import sqlite3
import time
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("auth_service")

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "users.db"
SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "quantum_medical_ai_secret_key_2026_sih")

TOKEN_TTL_SECONDS = 86400 * 7  # 7 days
CAPTCHA_TTL_SECONDS = 300      # 5 minutes


# ---------------------------------------------------------------------------
# Database Initialization & Helpers
# ---------------------------------------------------------------------------

def _get_db() -> sqlite3.Connection:
    """Returns a SQLite connection with dict-like row factory."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_auth_db() -> None:
    """Initializes the users table and seeds default accounts if missing."""
    with _get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('doctor', 'researcher', 'admin')),
                name TEXT NOT NULL,
                title TEXT,
                department TEXT,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL
            )
            """
        )
        conn.commit()

        # Seed default users if table is empty
        cursor.execute("SELECT COUNT(*) as cnt FROM users")
        row = cursor.fetchone()
        if row and row["cnt"] == 0:
            logger.info("Seeding default accounts (doctor, researcher, admin)...")
            default_users = [
                (
                    "doctor",
                    "doctor123",
                    "doctor",
                    "Dr. Sarah Lin, MD",
                    "Lead Neuro-Radiologist",
                    "Department of Neuroradiology",
                ),
                (
                    "researcher",
                    "researcher123",
                    "researcher",
                    "Dr. Alex Vance, PhD",
                    "Principal Quantum Genomics Investigator",
                    "Computational Oncology Lab",
                ),
                (
                    "admin",
                    "admin123",
                    "admin",
                    "System Administrator",
                    "Head of Clinical Infrastructure",
                    "Clinical Informatics Directorate",
                ),
            ]
            for username, raw_password, role, name, title, department in default_users:
                salt, pwd_hash = _hash_password(raw_password)
                cursor.execute(
                    """
                    INSERT INTO users (username, password_hash, salt, role, name, title, department, is_active, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
                    """,
                    (username, pwd_hash, salt, role, name, title, department, int(time.time())),
                )
            conn.commit()


def _hash_password(password: str, salt: Optional[str] = None) -> Tuple[str, str]:
    """Hashes password with PBKDF2-HMAC-SHA256 (100,000 rounds)."""
    salt_hex = salt or secrets.token_hex(16)
    salt_bytes = bytes.fromhex(salt_hex)
    pwd_bytes = password.encode("utf-8")
    hash_bytes = hashlib.pbkdf2_hmac("sha256", pwd_bytes, salt_bytes, 100_000)
    return salt_hex, hash_bytes.hex()


def _verify_password(password: str, salt: str, expected_hash: str) -> bool:
    """Verifies a password against the stored salt and hash."""
    _, computed_hash = _hash_password(password, salt)
    return hmac.compare_digest(computed_hash, expected_hash)


# ---------------------------------------------------------------------------
# Token Generation & Verification (HMAC-SHA256 Bearer Tokens)
# ---------------------------------------------------------------------------

def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64_decode(data_str: str) -> bytes:
    padding = "=" * ((4 - len(data_str) % 4) % 4)
    return base64.urlsafe_b64decode(data_str + padding)


def create_access_token(user: Dict[str, Any], ttl_seconds: int = TOKEN_TTL_SECONDS) -> str:
    """Generates a cryptographically signed bearer token."""
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user["username"],
        "id": user["id"],
        "role": user["role"],
        "name": user["name"],
        "exp": int(time.time()) + ttl_seconds,
    }
    header_b64 = _b64_encode(json.dumps(header).encode("utf-8"))
    payload_b64 = _b64_encode(json.dumps(payload).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    sig_b64 = _b64_encode(signature)
    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates token signature and expiration."""
    try:
        parts = token.strip().split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
        actual_sig = _b64_decode(sig_b64)
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None

        payload_bytes = _b64_decode(payload_b64)
        payload = json.loads(payload_bytes.decode("utf-8"))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Cryptographic SVG Captcha Generator
# ---------------------------------------------------------------------------

CAPTCHA_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"


def generate_captcha() -> Tuple[str, str]:
    """
    Generates a 4-character visual security captcha.
    Returns (captcha_token, captcha_svg).
    """
    code = "".join(random.choices(CAPTCHA_CHARS, k=4))
    exp = int(time.time()) + CAPTCHA_TTL_SECONDS
    # Sign code and expiration into stateless token
    token_payload = f"{code}:{exp}".encode("utf-8")
    sig = hmac.new(SECRET_KEY.encode("utf-8"), token_payload, hashlib.sha256).hexdigest()[:16]
    captcha_token = f"{_b64_encode(token_payload)}.{sig}"

    # Generate dark-themed SVG with curves and distortion
    width = 160
    height = 54
    lines_svg = []
    for _ in range(4):
        x1, y1 = random.randint(0, width), random.randint(0, height)
        x2, y2 = random.randint(0, width), random.randint(0, height)
        c = random.choice(["#ff8fa3", "#d81b40", "#a855f7", "#38bdf8"])
        lines_svg.append(
            f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{c}" stroke-width="1.2" stroke-opacity="0.35" />'
        )

    text_svg = []
    for i, ch in enumerate(code):
        x = 24 + i * 32 + random.randint(-2, 2)
        y = 36 + random.randint(-3, 3)
        rot = random.randint(-15, 15)
        color = random.choice(["#ffd9e0", "#ff8fa3", "#fca5a5", "#ffffff"])
        text_svg.append(
            f'<text x="{x}" y="{y}" fill="{color}" font-family="monospace, monospace" font-size="28" font-weight="bold" '
            f'transform="rotate({rot} {x} {y})" letter-spacing="3">{ch}</text>'
        )

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">'
        f'<rect width="{width}" height="{height}" rx="10" fill="#120c14" />'
        f'<rect width="{width}" height="{height}" rx="10" fill="none" stroke="rgba(255,143,163,0.3)" stroke-width="1" />'
        f'{"".join(lines_svg)}'
        f'{"".join(text_svg)}'
        f'</svg>'
    )
    return captcha_token, svg


def verify_captcha(captcha_token: str, answer: str) -> bool:
    """Verifies user's submitted captcha answer against signed token."""
    if not captcha_token or not answer:
        return False
    try:
        parts = captcha_token.strip().split(".")
        if len(parts) != 2:
            return False
        payload_b64, sig = parts
        payload_bytes = _b64_decode(payload_b64)
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()[:16]
        if not hmac.compare_digest(expected_sig, sig):
            return False

        decoded = payload_bytes.decode("utf-8")
        code, exp_str = decoded.split(":", 1)
        if int(exp_str) < time.time():
            return False

        return code.strip().upper() == answer.strip().upper()
    except Exception:
        return False


# ---------------------------------------------------------------------------
# User Authentication & Management Queries
# ---------------------------------------------------------------------------

def authenticate_user(username: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticates username and password against database."""
    init_auth_db()
    with _get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ? AND is_active = 1", (username.strip().lower(),))
        row = cursor.fetchone()
        if not row:
            return None

        if _verify_password(password, row["salt"], row["password_hash"]):
            return {
                "id": row["id"],
                "username": row["username"],
                "role": row["role"],
                "name": row["name"],
                "title": row["title"],
                "department": row["department"],
                "is_active": bool(row["is_active"]),
            }
        return None


def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    """Retrieves user profile by username."""
    init_auth_db()
    with _get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ?", (username.strip().lower(),))
        row = cursor.fetchone()
        if row:
            return {
                "id": row["id"],
                "username": row["username"],
                "role": row["role"],
                "name": row["name"],
                "title": row["title"],
                "department": row["department"],
                "is_active": bool(row["is_active"]),
            }
        return None


def list_users() -> List[Dict[str, Any]]:
    """Lists all users for Admin management console."""
    init_auth_db()
    with _get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, role, name, title, department, is_active FROM users ORDER BY id ASC")
        rows = cursor.fetchall()
        return [
            {
                "id": r["id"],
                "username": r["username"],
                "role": r["role"],
                "name": r["name"],
                "title": r["title"],
                "department": r["department"],
                "is_active": bool(r["is_active"]),
            }
            for r in rows
        ]


def create_user(
    username: str,
    password: str,
    role: str = "doctor",
    name: str = "",
    title: str = "",
    department: str = "",
) -> Dict[str, Any]:
    """Creates a new user in the system."""
    clean_username = username.strip().lower()
    if role not in ("doctor", "researcher", "admin"):
        raise ValueError(f"Invalid role '{role}'. Must be doctor, researcher, or admin.")

    init_auth_db()
    salt, pwd_hash = _hash_password(password)
    with _get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE username = ?", (clean_username,))
        if cursor.fetchone():
            raise ValueError(f"Username '{clean_username}' already exists.")

        display_name = name.strip() or clean_username.capitalize()
        cursor.execute(
            """
            INSERT INTO users (username, password_hash, salt, role, name, title, department, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
            """,
            (clean_username, pwd_hash, salt, role, display_name, title.strip(), department.strip(), int(time.time())),
        )
        conn.commit()
        user_id = cursor.lastrowid
        return {
            "id": user_id,
            "username": clean_username,
            "role": role,
            "name": display_name,
            "title": title.strip(),
            "department": department.strip(),
            "is_active": True,
        }


def reset_user_password(username: str, new_password: str) -> bool:
    """Updates a user's password."""
    clean_username = username.strip().lower()
    init_auth_db()
    salt, pwd_hash = _hash_password(new_password)
    with _get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET password_hash = ?, salt = ? WHERE username = ?",
            (pwd_hash, salt, clean_username),
        )
        conn.commit()
        return cursor.rowcount > 0


def update_user(
    username: str,
    role: Optional[str] = None,
    name: Optional[str] = None,
    title: Optional[str] = None,
    department: Optional[str] = None,
    is_active: Optional[bool] = None,
) -> Optional[Dict[str, Any]]:
    """Updates user properties."""
    clean_username = username.strip().lower()
    init_auth_db()
    with _get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ?", (clean_username,))
        row = cursor.fetchone()
        if not row:
            return None

        new_role = role if role in ("doctor", "researcher", "admin") else row["role"]
        new_name = name.strip() if name is not None else row["name"]
        new_title = title.strip() if title is not None else row["title"]
        new_dept = department.strip() if department is not None else row["department"]
        new_active = int(is_active) if is_active is not None else row["is_active"]

        cursor.execute(
            """
            UPDATE users SET role = ?, name = ?, title = ?, department = ?, is_active = ?
            WHERE username = ?
            """,
            (new_role, new_name, new_title, new_dept, new_active, clean_username),
        )
        conn.commit()
        return {
            "id": row["id"],
            "username": clean_username,
            "role": new_role,
            "name": new_name,
            "title": new_title,
            "department": new_dept,
            "is_active": bool(new_active),
        }


def delete_user(username: str) -> bool:
    """Deletes a user account (admin protected)."""
    clean_username = username.strip().lower()
    if clean_username == "admin":
        raise ValueError("Cannot delete root administrator account.")

    init_auth_db()
    with _get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE username = ?", (clean_username,))
        conn.commit()
        return cursor.rowcount > 0


# Pre-initialize DB on import
init_auth_db()
