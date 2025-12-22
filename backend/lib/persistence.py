import json
from pathlib import Path
from typing import List, Any

from pydantic import BaseModel


STORAGE_PATH = Path(__file__).resolve().parent.parent / "storage" / "documents.json"


class DocumentBase(BaseModel):
    title: str
    category: str
    summary: str
    content: str


class Document(DocumentBase):
    id: int


def load_documents() -> List[Document]:
    if not STORAGE_PATH.exists():
        STORAGE_PATH.parent.mkdir(parents=True, exist_ok=True)
        STORAGE_PATH.write_text("[]", encoding="utf-8")

    raw = STORAGE_PATH.read_text(encoding="utf-8").strip() or "[]"
    data = json.loads(raw)

    docs: List[Document] = []
    for item in data:
        docs.append(Document(**item))

    return docs


def save_documents(docs: List[Document]) -> None:
    payload = [d.model_dump() for d in docs]
    STORAGE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STORAGE_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def seed_documents_if_empty(seed: Any) -> bool:
    """
    Seed the storage ONLY if it's empty.
    Expected seed format: list of objects with: title, category, summary, content
    (id is optional; we generate ids)
    Returns True if seeding happened, otherwise False.
    """
    existing = load_documents()
    if len(existing) > 0:
        return False

    if not isinstance(seed, list) or len(seed) == 0:
        return False

    seeded: List[Document] = []
    next_id = 1

    for raw in seed:
        if not isinstance(raw, dict):
            continue
        try:
            base = DocumentBase(**raw)
        except Exception:
            continue

        seeded.append(Document(id=next_id, **base.model_dump()))
        next_id += 1

    if not seeded:
        return False

    save_documents(seeded)
    return True
