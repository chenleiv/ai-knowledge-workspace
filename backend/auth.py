# auth.py
import os
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from jose import jwt

router = APIRouter(prefix="/api/auth", tags=["auth"])

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")
JWT_ALG = "HS256"
JWT_EXP_SECONDS = 60 * 60 * 24  # 24 שעות

DEMO_USERS = {
    "admin@demo.com": {
        "password": "admin123",
        "role": "admin",
    },
    "viewer@demo.com": {
        "password": "viewer123",
        "role": "viewer",
    },
}


class LoginInput(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    user: dict


@router.post("/login", response_model=LoginResponse)
def login(data: LoginInput):
    user = DEMO_USERS.get(data.email)

    if not user or user["password"] != data.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    payload = {
        "sub": data.email,
        "role": user["role"],
        "exp": int(time.time()) + JWT_EXP_SECONDS,
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

    return {
        "access_token": token,
        "user": {
            "email": data.email,
            "role": user["role"],
        },
    }
