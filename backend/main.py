from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Literal, Optional, Dict
from lib.retrieval import retrieve_top_docs
from lib.persistence import load_documents, save_documents
from fastapi.responses import JSONResponse

from pathlib import Path
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    text: str


class ChatRequest(BaseModel):
    history: List[ChatMessage]
    question: str


class Source(BaseModel):
    id: int
    title: str
    snippet: str


class ChatResponse(BaseModel):
    role: Literal["assistant"]
    text: str
    sources: Optional[List[Source]] = []


class DocumentBase(BaseModel):
    title: str
    category: str
    summary: str
    content: str


class Document(DocumentBase):
    id: int


class ImportRequest(BaseModel):
    filename: str
    category: str
    content: str


class BulkImportRequest(BaseModel):
    documents: list[Document]


@app.get("/api/documents/export")
def export_documents():
    db = _load_db()
    docs = list(db.values())
    payload = [d.model_dump() for d in docs]
    return JSONResponse(content=payload)


@app.post("/api/documents/import-bulk", response_model=list[Document])
def import_documents_bulk(payload: list[Document]):
    # Replace mode only: overwrite everything with the uploaded list
    db: Dict[int, Document] = {doc.id: doc for doc in payload}
    _save_db(db)
    return list(db.values())


def _load_db() -> Dict[int, Document]:
    docs = load_documents()
    return {d.id: d for d in docs}


def _save_db(db: Dict[int, Document]) -> None:
    save_documents(list(db.values()))


def _next_id(db: Dict[int, Document]) -> int:
    return (max(db.keys()) + 1) if db else 1


@app.get("/api/documents", response_model=List[Document])
def list_documents(q: Optional[str] = None, category: Optional[str] = None):
    db = _load_db()
    docs = list(db.values())

    if category:
        docs = [d for d in docs if d.category.lower() == category.lower()]

    if q:
        qq = q.lower().strip()
        docs = [
            d
            for d in docs
            if qq in d.title.lower()
            or qq in d.category.lower()
            or qq in d.summary.lower()
            or qq in d.content.lower()
        ]

    return docs


@app.get("/api/documents/{doc_id}", response_model=Document)
def get_document(doc_id: int):
    db = _load_db()
    doc = db.get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@app.post("/api/documents", response_model=Document, status_code=201)
def create_document(payload: DocumentBase):
    db = _load_db()
    new_id = _next_id(db)

    doc = Document(id=new_id, **payload.model_dump())
    db[new_id] = doc
    _save_db(db)
    return doc


@app.put("/api/documents/{doc_id}", response_model=Document)
def update_document(doc_id: int, payload: DocumentBase):
    db = _load_db()
    if doc_id not in db:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = Document(id=doc_id, **payload.model_dump())
    db[doc_id] = doc
    _save_db(db)
    return doc


@app.delete("/api/documents/{doc_id}", status_code=204)
def delete_document(doc_id: int):
    db = _load_db()
    if doc_id not in db:
        raise HTTPException(status_code=404, detail="Document not found")

    del db[doc_id]
    _save_db(db)
    return


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    hits = retrieve_top_docs(req.question, top_k=3)

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

    return {
        "role": "assistant",
        "text": "\n".join(lines),
        "sources": sources,
    }


DIST_DIR = Path(__file__).resolve().parent.parent / "dist"
INDEX_FILE = DIST_DIR / "index.html"

if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        if full_path.startswith("api"):
            return {"detail": "Not Found"}
        return FileResponse(INDEX_FILE)
