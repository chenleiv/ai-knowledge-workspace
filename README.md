# AI Knowledge Workspace

A modern, full-stack knowledge management workspace optimized for AI-assisted document organization, retrieval, and querying.

This project features a **React 19** frontend with mobile-first navigation and a **Node.js** backend, designed with a clear path toward LLM-based retrieval (RAG).

## ✨ Key Features

### 📱 Experience

- **Mobile-First Design**: Bottom-bar navigation tailored for mobile devices.
- **Dynamic UI**: Fluid transitions and premium aesthetics using CSS variables.
- **Theme Support**: Integrated Light / Dark mode.

### 📄 Document Management

- **Smart Organization**: Create, edit, and categorize documents with ease.
- **Drag & Drop**: Persistent reordering powered by `@dnd-kit`.
- **Interactivity**: Favorites support and safe destructive actions with confirmation modals.
- **Portability**: Import and export your knowledge base as JSON.

### 🤖 AI-Ready Assistant

- **Contextual Querying**: Select specific documents to provide context for the AI.
- **React 19 Powered**: Leverages the latest React features like `useActionState` and the **React Compiler** for optimized performance.
- **Scalable Architecture**: Built to integrate seamlessly with LLMs and RAG pipelines.

---

## 🛠️ Architecture Overview

### Frontend

- **React 19**: Utilizing the newest hooks and the React Compiler for automatic memoization.
- **Vite**: Ultra-fast development and build tooling.
- **Styling**: SCSS with a centralized theme system for maximum flexibility.
- **Routing**: `react-router-dom` v7 for modern navigation.

### Backend

- **Node.js + Express**: Scalable and fast middleware layer.
- **MongoDB + Mongoose**: Reliable data persistence and flexible schema management.
- **Security**: JWT-based authentication and `bcryptjs` for password hashing.
- **AI Integration**: Prepared for `@huggingface/inference` and local-only LLM experimentation.

---

## ⚙️ Environment Setup

### 🚀 Quick Start

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Backend Configuration**:
   Create a `.env` file in the root directory and configure your MongoDB URI and JWT secrets (see `.env.example`).

3. **Start Development Servers**:
   ```bash
   # Start both frontend and backend (Vite + Node --watch)
   npm run dev
   ```

---

## 📂 Project Structure

```text
frontend/ (Root)
  ├── src/
  │   ├── components/       # Reusable UI primitives (Menu, Nav, Modals)
  │   │   └── mobileNav/    # Mobile-first navigation bar
  │   ├── pages/            # Page-level components (Documents, Login)
  │   ├── hooks/            # Custom React hooks (useConfirm, useTheme)
  │   ├── api/              # API interaction layer
  │   └── styles/           # Global styles and theme tokens
  └── package.json

backend/
  ├── index.js              # Server entry point
  ├── auth.js               # Authentication logic
  ├── models.js             # Mongoose schemas
  └── ai.js                 # AI/LLM integration logic
```

---

## 🚀 Roadmap

- [x] React 19 Migration & React Compiler Integration
- [x] Mobile-First Navigation UI
- [ ] Vector Embeddings & Semantic Search

---

## Why This Project?

Built as a high-performance learning platform, this workspace focuses on modern React patterns, clean architecture, and preparing real-world AI workflows without unnecessary complexity.
