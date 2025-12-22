import os
from fastapi import APIRouter, HTTPException
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/auth", tags=["auth"])

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is not set")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@demo.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

VIEWER_EMAIL = os.getenv("VIEWER_EMAIL", "viewer@demo.com")
VIEWER_PASSWORD = os.getenv("VIEWER_PASSWORD", "viewer123")


def verify_password(plain, expected):
    return plain == expected


@router.post("/login")
def login(data: dict):
    email = data.get("email")
    password = data.get("password")

    if email == ADMIN_EMAIL and verify_password(password, ADMIN_PASSWORD):
        role = "admin"
    elif email == VIEWER_EMAIL and verify_password(password, VIEWER_PASSWORD):
        role = "viewer"
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    payload = {
        "sub": email,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=8),
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "email": email,
            "role": role,
        },
    }
