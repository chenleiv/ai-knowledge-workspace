import os
from typing import List, Literal, Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from auth import AuthUser, get_current_user, require_admin, router as auth_router
from lib.persistence import (
    load_documents,
    save_documents,
    seed_documents_if_empty,
    Document,
    DocumentBase,
)
from lib.retrieval import retrieve_top_docs

app = FastAPI(title="Knowledge Workspace API")
app.include_router(auth_router)

frontend_url = os.getenv("FRONTEND_URL")
allow_origins = ["http://localhost:5173", "http://localhost:5174"]
if frontend_url:
    allow_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,  # IMPORTANT for cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

SEED_PATH = os.path.join(os.path.dirname(__file__), "data", "seed_documents.json")


@app.on_event("startup")
def seed_docs():
    try:
        if os.path.exists(SEED_PATH):
            import json

            with open(SEED_PATH, "r", encoding="utf-8") as f:
                seed = json.load(f)
            seed_documents_if_empty(seed)
    except Exception:
        pass


@app.get("/health")
def health():
    return {"ok": True}


# -------- Documents (READ: any logged-in user) --------
@app.get("/api/documents", response_model=List[Document])
def list_documents(user: AuthUser = Depends(get_current_user)):
    return load_documents()


@app.get("/api/documents/{doc_id}", response_model=Document)
def get_document(doc_id: int, user: AuthUser = Depends(get_current_user)):
    docs = load_documents()
    for d in docs:
        if d.id == doc_id:
            return d
    raise HTTPException(status_code=404, detail="Not found")


# -------- Documents (WRITE: admin only) --------
@app.post("/api/documents", response_model=Document)
def create_document(payload: DocumentBase, admin: AuthUser = Depends(require_admin)):
    docs = load_documents()
    next_id = (max((d.id for d in docs), default=0) + 1) if docs else 1
    doc = Document(id=next_id, **payload.model_dump())
    docs.append(doc)
    save_documents(docs)
    return doc


@app.put("/api/documents/{doc_id}", response_model=Document)
def update_document(
    doc_id: int, payload: DocumentBase, admin: AuthUser = Depends(require_admin)
):
    docs = load_documents()
    for i, d in enumerate(docs):
        if d.id == doc_id:
            updated = Document(id=doc_id, **payload.model_dump())
            docs[i] = updated
            save_documents(docs)
            return updated
    raise HTTPException(status_code=404, detail="Not found")


@app.delete("/api/documents/{doc_id}", status_code=204)
def delete_document(doc_id: int, admin: AuthUser = Depends(require_admin)):
    docs = load_documents()
    new_docs = [d for d in docs if d.id != doc_id]
    if len(new_docs) == len(docs):
        raise HTTPException(status_code=404, detail="Not found")
    save_documents(new_docs)
    return None


# -------- Admin tools --------
class ImportBulkBody(BaseModel):
    mode: Literal["merge", "replace"]
    documents: List[Document]


@app.get("/api/documents/export", response_model=List[Document])
def export_documents(admin: AuthUser = Depends(require_admin)):
    return load_documents()


@app.post("/api/documents/import-bulk", response_model=List[Document])
def import_documents_bulk(
    body: ImportBulkBody, admin: AuthUser = Depends(require_admin)
):
    existing = load_documents()

    if body.mode == "replace":
        save_documents(body.documents)
        return body.documents

    by_id = {d.id: d for d in existing}
    max_id = max(by_id.keys(), default=0)

    for d in body.documents:
        if d.id in by_id:
            by_id[d.id] = d
        else:
            if d.id <= 0:
                max_id += 1
                by_id[max_id] = Document(id=max_id, **d.model_dump(exclude={"id"}))
            else:
                by_id[d.id] = d
                max_id = max(max_id, d.id)

    merged = sorted(by_id.values(), key=lambda x: x.id)
    save_documents(merged)
    return merged


# -------- Chat --------
class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    contextDocIds: Optional[List[int]] = None


class Source(BaseModel):
    id: int
    title: str
    snippet: str


class ChatResponse(BaseModel):
    role: Literal["assistant"]
    text: str
    sources: List[Source] = []


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest, user: AuthUser = Depends(get_current_user)):
    # Demo: use last user message as query
    q = ""
    for m in reversed(req.messages):
        if m.role == "user":
            q = m.content
            break

    hits = retrieve_top_docs(q, top_k=3)

    if not hits:
        return {
            "role": "assistant",
            "text": "I couldn't find anything relevant in your documents. Try a different query or add more documents.",
            "sources": [],
        }

    sources = [
        {"id": h["doc"].id, "title": h["doc"].title, "snippet": h["snippet"]}
        for h in hits
    ]
    lines = ["I found relevant information in your documents:"]
    for i, h in enumerate(hits, start=1):
        d = h["doc"]
        lines.append(f"{i}. {d.title} ({d.category})")
    lines.append("")
    lines.append("Short snippets from sources:")
    for h in hits:
        lines.append(f"- {h['snippet']}")

    return {"role": "assistant", "text": "\n".join(lines), "sources": sources}
