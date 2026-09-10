"""
API Routes for Authentication, Captcha Verification, and Admin User Management.

Provides full parity with the frontend AuthContext and AdminManagementModal:
- Captcha retrieval and verification
- JWT/Bearer token authentication and verification
- Current user profile endpoint (/api/auth/me/)
- Admin User Governance CRUD endpoints (/api/auth/users/*)
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field

from services import auth_service

router = APIRouter(prefix="/api/auth", tags=["Authentication & User Governance"])


# ---------------------------------------------------------------------------
# Request & Response Schemas
# ---------------------------------------------------------------------------

class CaptchaResponse(BaseModel):
    status: str = "success"
    captcha_token: str
    captcha_svg: str


class LoginRequest(BaseModel):
    username: str
    password: str
    captcha_token: Optional[str] = None
    captcha_answer: Optional[str] = None


class UserProfile(BaseModel):
    id: int
    username: str
    role: str
    name: str
    title: Optional[str] = None
    department: Optional[str] = None
    is_active: bool = True


class LoginResponse(BaseModel):
    status: str = "success"
    token: str
    user: UserProfile
    message: Optional[str] = None


class MeResponse(BaseModel):
    status: str = "success"
    user: UserProfile


class VerifyTokenRequest(BaseModel):
    token: str


class VerifyTokenResponse(BaseModel):
    status: str = "success"
    valid: bool = True
    user: Optional[UserProfile] = None


class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str = Field(default="doctor", description="doctor, researcher, or admin")
    name: Optional[str] = ""
    title: Optional[str] = ""
    department: Optional[str] = ""


class ResetPasswordRequest(BaseModel):
    username: str
    new_password: str


class UpdateUserRequest(BaseModel):
    username: str
    role: Optional[str] = None
    name: Optional[str] = None
    title: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None


class DeleteUserRequest(BaseModel):
    username: str


class GenericStatusResponse(BaseModel):
    status: str = "success"
    message: str


class UsersListResponse(BaseModel):
    status: str = "success"
    users: List[UserProfile]


# ---------------------------------------------------------------------------
# Dependency: Extract & Authenticate Token
# ---------------------------------------------------------------------------

def get_current_user_optional(authorization: Optional[str] = Header(default=None)) -> Optional[Dict[str, Any]]:
    """Extracts user from Authorization: Bearer <token> header without throwing 401 if absent."""
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None

    payload = auth_service.decode_access_token(token)
    if not payload:
        return None

    user = auth_service.get_user_by_username(payload["sub"])
    return user


def get_current_user(authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    """Strict dependency requiring authenticated user."""
    user = get_current_user_optional(authorization)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Strict dependency requiring Admin role."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator clearance required for this operation.",
        )
    return current_user


# ---------------------------------------------------------------------------
# Authentication & Captcha Endpoints
# ---------------------------------------------------------------------------

@router.get("/captcha/", response_model=CaptchaResponse, summary="Fetch security captcha")
@router.get("/captcha", response_model=CaptchaResponse, include_in_schema=False)
async def get_captcha() -> Dict[str, Any]:
    """Generates a cryptographic visual captcha for login security verification."""
    token, svg = auth_service.generate_captcha()
    return {
        "status": "success",
        "captcha_token": token,
        "captcha_svg": svg,
    }


@router.post("/login/", response_model=LoginResponse, summary="User login with captcha")
@router.post("/login", response_model=LoginResponse, include_in_schema=False)
async def login(payload: LoginRequest) -> Dict[str, Any]:
    """
    Authenticates user credentials and verifies visual security captcha.
    Returns access token and user role profile.
    """
    # 1. Verify captcha if provided
    if payload.captcha_token and payload.captcha_answer:
        if not auth_service.verify_captcha(payload.captcha_token, payload.captcha_answer):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid security captcha answer. Please refresh and try again.",
            )

    # 2. Authenticate user credentials
    user = auth_service.authenticate_user(payload.username, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    # 3. Create bearer token
    token = auth_service.create_access_token(user)

    return {
        "status": "success",
        "token": token,
        "user": user,
        "message": f"Welcome back, {user['name']}.",
    }


@router.get("/me/", response_model=MeResponse, summary="Get current user profile")
@router.get("/me", response_model=MeResponse, include_in_schema=False)
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Retrieves authenticated user identity and clearance privileges."""
    return {
        "status": "success",
        "user": current_user,
    }


@router.post("/verify/", response_model=VerifyTokenResponse, summary="Verify token validity")
@router.post("/verify", response_model=VerifyTokenResponse, include_in_schema=False)
async def verify(payload: VerifyTokenRequest) -> Dict[str, Any]:
    """Validates whether a JWT token is active and unexpired."""
    decoded = auth_service.decode_access_token(payload.token)
    if not decoded:
        return {"status": "error", "valid": False, "user": None}

    user = auth_service.get_user_by_username(decoded["sub"])
    if not user:
        return {"status": "error", "valid": False, "user": None}

    return {
        "status": "success",
        "valid": True,
        "user": user,
    }


# ---------------------------------------------------------------------------
# Admin User Governance Endpoints (CRUD)
# ---------------------------------------------------------------------------

@router.get("/users/", response_model=UsersListResponse, summary="List users (Admin only)")
@router.get("/users", response_model=UsersListResponse, include_in_schema=False)
async def list_all_users(_admin: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    """Lists all user accounts across Doctor, Researcher, and Admin roles."""
    users = auth_service.list_users()
    return {
        "status": "success",
        "users": users,
    }


@router.post("/users/create/", summary="Create new user (Admin only)")
@router.post("/users/create", summary="Create new user (Admin only)", include_in_schema=False)
async def admin_create_user(
    payload: CreateUserRequest,
    _admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    """Creates a new user profile with designated role permissions."""
    try:
        new_user = auth_service.create_user(
            username=payload.username,
            password=payload.password,
            role=payload.role,
            name=payload.name or "",
            title=payload.title or "",
            department=payload.department or "",
        )
        return {
            "status": "success",
            "user": new_user,
            "message": f"User '{payload.username}' created successfully.",
        }
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.post("/users/reset-password/", response_model=GenericStatusResponse, summary="Reset password (Admin only)")
@router.post("/users/reset-password", response_model=GenericStatusResponse, include_in_schema=False)
async def admin_reset_password(
    payload: ResetPasswordRequest,
    _admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    """Resets the password for a Doctor, Researcher, or Admin account."""
    success = auth_service.reset_user_password(payload.username, payload.new_password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{payload.username}' not found.",
        )
    return {
        "status": "success",
        "message": f"Password for '{payload.username}' successfully updated.",
    }


@router.post("/users/update/", summary="Update user profile (Admin only)")
@router.post("/users/update", summary="Update user profile (Admin only)", include_in_schema=False)
async def admin_update_user(
    payload: UpdateUserRequest,
    _admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    """Modifies user role, name, title, department, or active status."""
    updated = auth_service.update_user(
        username=payload.username,
        role=payload.role,
        name=payload.name,
        title=payload.title,
        department=payload.department,
        is_active=payload.is_active,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{payload.username}' not found.",
        )
    return {
        "status": "success",
        "user": updated,
        "message": f"User '{payload.username}' updated successfully.",
    }


@router.post("/users/delete/", response_model=GenericStatusResponse, summary="Delete user (Admin only)")
@router.post("/users/delete", response_model=GenericStatusResponse, include_in_schema=False)
async def admin_delete_user(
    payload: DeleteUserRequest,
    _admin: Dict[str, Any] = Depends(require_admin),
) -> Dict[str, Any]:
    """Permanently deletes a user account."""
    try:
        success = auth_service.delete_user(payload.username)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User '{payload.username}' not found.",
            )
        return {
            "status": "success",
            "message": f"User '{payload.username}' deleted successfully.",
        }
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
