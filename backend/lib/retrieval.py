from typing import List, Dict, Any
from lib.persistence import load_documents, Document


def _score_doc(doc: Document, query: str) -> int:
    q = query.lower().strip()
    if not q:
        return 0

    hay = f"{doc.title} {doc.category} {doc.summary} {doc.content}".lower()
    parts = [p for p in q.split() if p]

    score = 0
    for p in parts:
        if p in doc.title.lower():
            score += 4
        if p in doc.category.lower():
            score += 2
        if p in doc.summary.lower():
            score += 2
        if p in doc.content.lower():
            score += 1
    return score


def retrieve_top_docs(query: str, top_k: int = 3) -> List[Dict[str, Any]]:
    docs = load_documents()
    scored: List[Dict[str, Any]] = []

    for doc in docs:
        s = _score_doc(doc, query)
        if s > 0:
            snippet = doc.content[:160] + ("…" if len(doc.content) > 160 else "")
            scored.append({"doc": doc, "score": s, "snippet": snippet})

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]
