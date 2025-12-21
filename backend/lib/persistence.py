import json
from pathlib import Path
from typing import List, Iterable, Dict, Any

from pydantic import BaseModel

STORAGE_PATH = Path(__file__).resolve().parent.parent / "storage" / "documents.json"


class DocumentBase(BaseModel):
    title: str
    category: str
    summary: str
    content: str


class Document(DocumentBase):
    id: int


def _ensure_storage_file() -> None:
    STORAGE_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not STORAGE_PATH.exists():
        STORAGE_PATH.write_text("[]", encoding="utf-8")


def load_documents() -> List[Document]:
    _ensure_storage_file()

    raw = STORAGE_PATH.read_text(encoding="utf-8").strip() or "[]"
    data = json.loads(raw)

    docs: List[Document] = []
    for item in data:
        docs.append(Document(**item))

    return docs


def save_documents(docs: List[Document]) -> None:
    _ensure_storage_file()
    payload = [d.model_dump() for d in docs]
    STORAGE_PATH.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8"
    )


def seed_documents_if_empty(seed: Iterable[Dict[str, Any]]) -> bool:
    """
    Seeds storage only if documents.json is empty.
    Returns True if seeding happened.
    """
    docs = load_documents()
    if len(docs) > 0:
        return False

    seed_list = list(seed)
    if not seed_list:
        return False

    next_id = 1
    new_docs: List[Document] = []
    for item in seed_list:
        new_docs.append(Document(id=next_id, **DocumentBase(**item).model_dump()))
        next_id += 1

    save_documents(new_docs)
    return True
