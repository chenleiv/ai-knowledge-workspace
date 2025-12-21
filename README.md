# AI Knowledge Workspace

A full-stack knowledge management workspace designed to explore document organization, retrieval, and AI-assisted querying.

This project demonstrates a modern frontend architecture combined with a lightweight backend, with a clear path toward LLM-based retrieval (RAG).

## Features

### Documents

- Create, edit, delete documents
- Categorization and summaries
- Favorites support
- Drag & drop reordering (persistent)
- Import / Export documents as JSON
- Safe destructive actions with confirmation modals

### Assistant

- Select documents as context
- Ask questions based on selected documents
- Prepared architecture for LLM / RAG integration

### UI / UX

- Light / Dark theme toggle
- Consistent menu & modal components
- Keyboard-accessible confirmation dialogs
- Clean, neutral design inspired by modern AI tools

---

## Architecture Overview

### Frontend

- React + TypeScript
- Vite
- Modular component structure
- Centralized theme system (CSS variables)
- Reusable UI primitives (Menu, ConfirmDialog)
- Custom hooks: useConfirm, useTheme

### Backend

- Python + FastAPI
- JSON-based persistence (simple and explicit)
- Clear separation of responsibilities:
  - data
  - persistence
  - retrieval (prepared for AI usage)

---

## ⚙️ Environment Setup

### Frontend

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Create a `.env` file (based on `.env.example`) and set:
VITE_API_BASE=http://127.0.0.1:8000

### Backend

Navigate to the backend folder and start the server:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## Roadmap

- Vector embeddings
- Semantic search
- RAG pipeline (documents → embeddings → LLM)
- Local-only LLM experimentation

---

## Why This Project

This workspace was built as a learning and exploration platform:
Frontend architecture & UX decisions, Safe data handling, Preparing real-world AI workflows without over-engineering.

- This repository is intended for demonstration and learning purposes.
  LLM functionality is designed to run locally and is not deployed publicly.

---

## Project Structure (Simplified)

````md
```text
frontend/
  src/
    components/
    pages/
    hooks/
    api/
    styles/
    themeToggle/

backend/
  main.py
  data/
  lib/
  storage/

```
````
