# main.py
import json
import os
from typing import Literal, List

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from auth import AuthUser, get_current_user, require_admin, router as auth_router

DATA_FILE = os.getenv("DATA_FILE", "documents.json")


# -------------------------
# Models
# -------------------------
class DocumentBase(BaseModel):
    title: str
    category: str
    summary: str
    content: str


class Document(DocumentBase):
    id: int


class ImportBulkBody(BaseModel):
    mode: Literal["merge", "replace"]
    documents: List[Document]


# -------------------------
# Persistence
# -------------------------
def _load_documents() -> List[Document]:
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            raw = json.load(f)
        if not isinstance(raw, list):
            return []
        return [Document(**x) for x in raw]
    except Exception:
        return []


def _save_documents(docs: List[Document]) -> None:
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump([d.model_dump() for d in docs], f, ensure_ascii=False, indent=2)


def _next_id(docs: List[Document]) -> int:
    return (max((d.id for d in docs), default=0) + 1) if docs else 1


# -------------------------
# App + CORS
# -------------------------
app = FastAPI(title="Knowledge Workspace API")

# Auth router
app.include_router(auth_router)

frontend_url = os.getenv("FRONTEND_URL")  # e.g. https://your-frontend.onrender.com
allow_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
]
if frontend_url:
    allow_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,  # IMPORTANT for cookies
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------
# Health
# -------------------------
@app.get("/health")
def health():
    return {"ok": True}


# -------------------------
# Documents (READ: any logged-in user)
# -------------------------
@app.get("/api/documents", response_model=List[Document])
def list_documents(user: AuthUser = Depends(get_current_user)):
    docs = _load_documents()
    return docs


@app.get("/api/documents/{doc_id}", response_model=Document)
def get_document(doc_id: int, user: AuthUser = Depends(get_current_user)):
    docs = _load_documents()
    for d in docs:
        if d.id == doc_id:
            return d
    raise HTTPException(status_code=404, detail="Not found")


# -------------------------
# Documents (WRITE: admin only)
# -------------------------
@app.post("/api/documents", response_model=Document)
def create_document(payload: DocumentBase, admin: AuthUser = Depends(require_admin)):
    docs = _load_documents()
    new_doc = Document(id=_next_id(docs), **payload.model_dump())
    docs.append(new_doc)
    _save_documents(docs)
    return new_doc


@app.put("/api/documents/{doc_id}", response_model=Document)
def update_document(
    doc_id: int, payload: DocumentBase, admin: AuthUser = Depends(require_admin)
):
    docs = _load_documents()
    for i, d in enumerate(docs):
        if d.id == doc_id:
            updated = Document(id=doc_id, **payload.model_dump())
            docs[i] = updated
            _save_documents(docs)
            return updated
    raise HTTPException(status_code=404, detail="Not found")


@app.delete("/api/documents/{doc_id}", status_code=204)
def delete_document(doc_id: int, admin: AuthUser = Depends(require_admin)):
    docs = _load_documents()
    new_docs = [d for d in docs if d.id != doc_id]
    if len(new_docs) == len(docs):
        raise HTTPException(status_code=404, detail="Not found")
    _save_documents(new_docs)
    return None


# -------------------------
# Admin tools (export/import)
# -------------------------
@app.get("/api/documents/export", response_model=List[Document])
def export_documents(admin: AuthUser = Depends(require_admin)):
    return _load_documents()


@app.post("/api/documents/import-bulk", response_model=List[Document])
def import_documents_bulk(
    body: ImportBulkBody, admin: AuthUser = Depends(require_admin)
):
    existing = _load_documents()

    if body.mode == "replace":
        # replace everything
        docs = body.documents
        # ensure IDs are unique & stable; if duplicates, normalize
        seen = set()
        normalized: List[Document] = []
        next_id = 1
        for d in docs:
            if d.id in seen:
                normalized.append(Document(id=next_id, **d.model_dump(exclude={"id"})))
                next_id += 1
            else:
                normalized.append(d)
                seen.add(d.id)
                next_id = max(next_id, d.id + 1)
        _save_documents(normalized)
        return normalized

    # merge
    by_id = {d.id: d for d in existing}
    max_id = max(by_id.keys(), default=0)

    for d in body.documents:
        if d.id in by_id:
            by_id[d.id] = d
        else:
            # if incoming id collides weirdly, reassign
            if d.id <= 0 or d.id in by_id:
                max_id += 1
                by_id[max_id] = Document(id=max_id, **d.model_dump(exclude={"id"}))
            else:
                by_id[d.id] = d
                max_id = max(max_id, d.id)

    merged = sorted(by_id.values(), key=lambda x: x.id)
    _save_documents(merged)
    return merged
