import json
from pathlib import Path
from typing import List

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
    STORAGE_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
