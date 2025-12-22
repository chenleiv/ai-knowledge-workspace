# auth.py
import os
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from jose import jwt
from passlib.context import CryptContext
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["auth"])

# -------------------------
# Config
# -------------------------
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = "HS256"
ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "60"))

ENV = os.getenv("ENV", "dev")  # set "prod" on Render
COOKIE_NAME = "access_token"
COOKIE_SECURE = ENV == "prod"  # True on HTTPS (Render)
COOKIE_SAMESITE: Literal["lax", "strict"] = "lax"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# -------------------------
# Demo Users (env-based) - recommended
# -------------------------
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@demo.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
VIEWER_EMAIL = os.getenv("VIEWER_EMAIL", "viewer@demo.com")
VIEWER_PASSWORD = os.getenv("VIEWER_PASSWORD", "viewer123")

# NOTE: These hashes are created at runtime.
DEMO_USERS = {
    ADMIN_EMAIL: {"password_hash": pwd_context.hash(ADMIN_PASSWORD), "role": "admin"},
    VIEWER_EMAIL: {
        "password_hash": pwd_context.hash(VIEWER_PASSWORD),
        "role": "viewer",
    },
}


# -------------------------
# Models
# -------------------------
class LoginBody(BaseModel):
    email: str
    password: str


class AuthUser(BaseModel):
    email: str
    role: Literal["admin", "viewer"]


class LoginResponse(BaseModel):
    user: AuthUser


# -------------------------
# Helpers
# -------------------------
def _create_access_token(email: str, role: str) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=ACCESS_TOKEN_MINUTES)
    payload = {
        "sub": email,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": exp,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def _verify_user(email: str, password: str) -> Optional[AuthUser]:
    u = DEMO_USERS.get(email)
    if not u:
        return None
    if not pwd_context.verify(password, u["password_hash"]):
        return None
    return AuthUser(email=email, role=u["role"])


def get_current_user(request: Request) -> AuthUser:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        email = payload.get("sub")
        role = payload.get("role")
        if not email or role not in ("admin", "viewer"):
            raise HTTPException(status_code=401, detail="Invalid token")
        return AuthUser(email=email, role=role)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_admin(user: AuthUser = Depends(get_current_user)) -> AuthUser:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


# -------------------------
# Routes
# -------------------------
@router.post("/login", response_model=LoginResponse)
def login(body: LoginBody, response: Response):
    email = body.email.strip().lower()
    user = _verify_user(email, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = _create_access_token(user.email, user.role)

    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path="/",
        max_age=ACCESS_TOKEN_MINUTES * 60,
    )
    return {"user": user}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/me", response_model=AuthUser)
def me(user: AuthUser = Depends(get_current_user)):
    return user
