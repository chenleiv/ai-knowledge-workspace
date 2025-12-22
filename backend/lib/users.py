import json
import os
from pathlib import Path
from typing import Dict, List, Optional

from passlib.context import CryptContext
from pydantic import BaseModel

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

USERS_PATH = Path(__file__).resolve().parent.parent / "storage" / "users.json"


class User(BaseModel):
    id: int
    email: str
    password_hash: str
    role: str  # "admin" | "viewer"


class UserCreate(BaseModel):
    email: str
    password: str
    role: str  # "admin" | "viewer"


class UserPublic(BaseModel):
    id: int
    email: str
    role: str


def _ensure_file():
    if not USERS_PATH.exists():
        USERS_PATH.parent.mkdir(parents=True, exist_ok=True)
        USERS_PATH.write_text("[]", encoding="utf-8")


def load_users() -> List[User]:
    _ensure_file()
    raw = USERS_PATH.read_text(encoding="utf-8").strip() or "[]"
    data = json.loads(raw)
    return [User(**u) for u in data]


def save_users(users: List[User]) -> None:
    USERS_PATH.write_text(
        json.dumps([u.model_dump() for u in users], indent=2), encoding="utf-8"
    )


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def find_by_email(users: List[User], email: str) -> Optional[User]:
    email_norm = email.strip().lower()
    for u in users:
        if u.email.lower() == email_norm:
            return u
    return None


def next_id(users: List[User]) -> int:
    return (max([u.id for u in users]) + 1) if users else 1


def seed_users_if_empty() -> None:
    users = load_users()

    if users:
        return

    admin_email = os.getenv("ADMIN_EMAIL", "admin@demo.com")
    admin_pass = os.getenv("ADMIN_PASSWORD", "admin123")
    viewer_email = os.getenv("VIEWER_EMAIL", "viewer@demo.com")
    viewer_pass = os.getenv("VIEWER_PASSWORD", "viewer123")

    print("ADMIN_PASSWORD len:", len(admin_pass.encode("utf-8")))
    print("ADMIN_PASSWORD preview:", admin_pass[:20])

    print("VIEWER_PASSWORD len:", len(viewer_pass.encode("utf-8")))
    print("VIEWER_PASSWORD preview:", viewer_pass[:20])

    seeded = [
        User(
            id=1,
            email=admin_email,
            password_hash=hash_password(admin_pass),
            role="admin",
        ),
        User(
            id=2,
            email=viewer_email,
            password_hash=hash_password(viewer_pass),
            role="viewer",
        ),
    ]
    save_users(seeded)
