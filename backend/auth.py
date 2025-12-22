import os
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from jose import jwt
from pydantic import BaseModel

from lib.users import (
    seed_users_if_empty,
    load_users,
    find_by_email,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = "HS256"
ACCESS_TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "60"))

ENV = os.getenv("ENV", "dev")  # set to "prod" on Render
COOKIE_NAME = "access_token"

COOKIE_SECURE = ENV == "prod"
COOKIE_SAMESITE: Literal["lax", "none"] = "none" if ENV == "prod" else "lax"


class LoginBody(BaseModel):
    email: str
    password: str


class AuthUser(BaseModel):
    email: str
    role: Literal["admin", "viewer"]


class LoginResponse(BaseModel):
    user: AuthUser


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


@router.on_event("startup")
def _seed_users():
    # creates storage/users.json if missing + seeds demo users from env
    seed_users_if_empty()


@router.post("/login", response_model=LoginResponse)
def login(body: LoginBody, response: Response):
    email = body.email.strip().lower()
    users = load_users()
    u = find_by_email(users, email)
    if not u or not verify_password(body.password, u.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = _create_access_token(u.email, u.role)

    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path="/",
        max_age=ACCESS_TOKEN_MINUTES * 60,
    )
    return {"user": AuthUser(email=u.email, role=u.role)}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/me", response_model=AuthUser)
def me(user: AuthUser = Depends(get_current_user)):
    return user
