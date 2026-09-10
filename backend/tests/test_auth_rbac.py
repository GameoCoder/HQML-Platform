"""
Unit & Integration tests for Authentication, Captcha, RBAC, and User Governance.
"""

import base64
import pytest
from fastapi.testclient import TestClient
from main import app
from services.auth_service import init_auth_db

client = TestClient(app)

def get_captcha_solution(token: str) -> str:
    payload_b64 = token.split(".")[0]
    padding = "=" * ((4 - len(payload_b64) % 4) % 4)
    decoded = base64.urlsafe_b64decode(payload_b64 + padding).decode("utf-8")
    return decoded.split(":")[0]

@pytest.fixture(autouse=True)
def setup_test_db():
    init_auth_db()

def test_captcha_generation():
    response = client.get("/api/auth/captcha/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "captcha_token" in data
    assert "captcha_svg" in data
    assert "<svg" in data["captcha_svg"]

def test_login_success_and_profile():
    # 1. Fetch captcha
    cap_res = client.get("/api/auth/captcha/")
    cap_token = cap_res.json()["captcha_token"]
    solution = get_captcha_solution(cap_token)

    # 2. Login as Doctor
    login_res = client.post("/api/auth/login/", json={
        "username": "doctor",
        "password": "doctor123",
        "captcha_token": cap_token,
        "captcha_answer": solution
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["status"] == "success"
    assert "token" in login_data
    assert login_data["user"]["role"] == "doctor"
    token = login_data["token"]

    # 3. Verify /me profile
    me_res = client.get("/api/auth/me/", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["user"]["username"] == "doctor"

def test_login_invalid_password():
    cap_res = client.get("/api/auth/captcha/")
    cap_token = cap_res.json()["captcha_token"]
    solution = get_captcha_solution(cap_token)

    login_res = client.post("/api/auth/login/", json={
        "username": "doctor",
        "password": "wrongpassword",
        "captcha_token": cap_token,
        "captcha_answer": solution
    })
    assert login_res.status_code == 401
    assert "Invalid username or password" in login_res.json()["detail"]

def test_login_invalid_captcha():
    cap_res = client.get("/api/auth/captcha/")
    cap_token = cap_res.json()["captcha_token"]

    login_res = client.post("/api/auth/login/", json={
        "username": "doctor",
        "password": "doctor123",
        "captcha_token": cap_token,
        "captcha_answer": "WRONG_ANSWER"
    })
    assert login_res.status_code == 400
    assert "Invalid security captcha answer" in login_res.json()["detail"]

def test_doctor_rbac_restriction_on_genomic_and_tabular():
    # Login as Doctor
    cap_res = client.get("/api/auth/captcha/")
    token = client.post("/api/auth/login/", json={
        "username": "doctor",
        "password": "doctor123",
        "captcha_token": cap_res.json()["captcha_token"],
        "captcha_answer": get_captcha_solution(cap_res.json()["captcha_token"])
    }).json()["token"]

    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to access tcga-lung-cell -> MUST BE 403 FORBIDDEN
    tsv_content = b"header\ncomment\nTP53\t4.8\n"
    res = client.post(
        "/api/predict/tcga-lung-cell",
        files={"file": ("test.tsv", tsv_content, "text/tab-separated-values")},
        headers=headers
    )
    assert res.status_code == 403
    assert "Access Restricted: Doctor clearance is restricted to image-based diagnostic models only" in res.json()["detail"]

    # Attempt to access breast-cancer tabular -> MUST BE 403 FORBIDDEN
    res_bc = client.post(
        "/api/predict/",
        json={"dataset": "breast-cancer", "data": [1.0] * 30},
        headers=headers
    )
    assert res_bc.status_code == 403

def test_researcher_rbac_access_allowed():
    # Login as Researcher
    cap_res = client.get("/api/auth/captcha/")
    token = client.post("/api/auth/login/", json={
        "username": "researcher",
        "password": "researcher123",
        "captcha_token": cap_res.json()["captcha_token"],
        "captcha_answer": get_captcha_solution(cap_res.json()["captcha_token"])
    }).json()["token"]

    headers = {"Authorization": f"Bearer {token}"}

    # Researcher accessing breast-cancer -> Allowed (not 403)
    res_bc = client.post(
        "/api/predict/",
        json={"dataset": "breast-cancer", "data": [1.0] * 30},
        headers=headers
    )
    assert res_bc.status_code == 200

def test_admin_user_crud():
    # Login as Admin
    cap_res = client.get("/api/auth/captcha/")
    admin_token = client.post("/api/auth/login/", json={
        "username": "admin",
        "password": "admin123",
        "captcha_token": cap_res.json()["captcha_token"],
        "captcha_answer": get_captcha_solution(cap_res.json()["captcha_token"])
    }).json()["token"]

    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Non-admin accessing user list -> 403
    doc_cap = client.get("/api/auth/captcha/").json()["captcha_token"]
    doc_token = client.post("/api/auth/login/", json={
        "username": "doctor",
        "password": "doctor123",
        "captcha_token": doc_cap,
        "captcha_answer": get_captcha_solution(doc_cap)
    }).json()["token"]
    assert client.get("/api/auth/users/", headers={"Authorization": f"Bearer {doc_token}"}).status_code == 403

    # 2. Admin lists users
    users_res = client.get("/api/auth/users/", headers=admin_headers)
    assert users_res.status_code == 200
    assert len(users_res.json()["users"]) >= 3

    # 3. Admin creates a new user
    new_user_res = client.post("/api/auth/users/create/", headers=admin_headers, json={
        "username": "test_radiologist",
        "password": "password_safe_123",
        "role": "doctor",
        "name": "Dr. Sarah Connor",
        "title": "Lead Neuro-Radiologist",
        "department": "Radiology & Imaging"
    })
    assert new_user_res.status_code == 200
    assert new_user_res.json()["status"] == "success"

    # 4. Admin resets password
    reset_res = client.post("/api/auth/users/reset-password/", headers=admin_headers, json={
        "username": "test_radiologist",
        "new_password": "updated_password_456"
    })
    assert reset_res.status_code == 200

    # 5. Verify new login with updated password
    new_cap = client.get("/api/auth/captcha/").json()["captcha_token"]
    new_login = client.post("/api/auth/login/", json={
        "username": "test_radiologist",
        "password": "updated_password_456",
        "captcha_token": new_cap,
        "captcha_answer": get_captcha_solution(new_cap)
    })
    assert new_login.status_code == 200

    # 6. Admin deletes user
    del_res = client.post("/api/auth/users/delete/", headers=admin_headers, json={
        "username": "test_radiologist"
    })
    assert del_res.status_code == 200
