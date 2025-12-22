# backend/auth.py
import os
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from jose import jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from lib.users import load_users, seed_users_if_empty, find_by_email, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

# -------------------------
# Config
# -------------------------
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = "HS256"
ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "60"))

# IMPORTANT: cross-origin SPA <-> API works best with None+Secure in prod
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


ENV = os.getenv("ENV", "dev")  # set "prod" on Render
COOKIE_NAME = "access_token"
COOKIE_SECURE = ENV == "prod"

# חשוב: ב-Render זה חייב להיות none כדי לאפשר cross-site
COOKIE_SAMESITE: Literal["lax", "none"] = "none" if ENV == "prod" else "lax"


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
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def _verify_user(email: str, password: str) -> Optional[AuthUser]:
    users = load_users()
    u = find_by_email(users, email)
    if not u:
        return None
    if not verify_password(password, u.password_hash):
        return None
    role = u.role
    if role not in ("admin", "viewer"):
        return None
    return AuthUser(email=u.email, role=role)


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
@router.on_event("startup")
def _seed_users():
    # reads ADMIN_EMAIL/ADMIN_PASSWORD/VIEWER_EMAIL/VIEWER_PASSWORD from env
    seed_users_if_empty()


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
        samesite=COOKIE_SAMESITE,  # <-- THIS is the Render fix
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
