import { useCallback, useEffect, useMemo, useState } from "react";
import "./assistantPage.scss";

import { listDocuments, type DocumentItem } from "../../api/documentsClient";
import { chatWithAI } from "../../api/aiClient";
import type { ChatMessage, SourceRef } from "./types";
import { CHAT_KEY, CONTEXT_KEY, buildSnippet, scoreDoc, uid } from "./utils";

import ContextPanel from "./components/ContextPanel";
import MessagesList from "./components/MessagesList";
import TemplatesBar from "./components/TemplatesBar";
import Composer from "./components/Composer";
import { loadJson, saveJson } from "../../utils/storage";

export default function AssistantPage() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);

  const [contextQuery, setContextQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>(
    loadJson<number[]>(CONTEXT_KEY, [])
  );

  const [messages, setMessages] = useState<ChatMessage[]>(
    loadJson<ChatMessage[]>(CHAT_KEY, [
      {
        id: uid(),
        role: "assistant",
        text: "Select documents on the left, then ask something. I will respond using selected sources (mock for now).",
      },
    ])
  );

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);

  const onClearSelection = useCallback(() => {
    setSelectedIds([]);
    saveJson(CONTEXT_KEY, []);
  }, []);
  async function load() {
    setDocsLoading(true);
    setDocsError(null);
    try {
      const data = await listDocuments();
      setDocs(data);

      const ids = new Set(data.map((d) => d.id));
      setSelectedIds((prev) => {
        const next = prev.filter((id) => ids.has(id));
        saveJson(CONTEXT_KEY, next);
        return next;
      });
    } catch (e) {
      setDocsError(e instanceof Error ? e.message : "Failed to load documents");
    } finally {
      setDocsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    saveJson(CHAT_KEY, messages);
  }, [messages]);

  useEffect(() => {
    if (selectedIds.length > 0 || contextQuery.trim().length > 0) {
      setIsContextOpen(true);
    }
  }, [selectedIds, contextQuery]);
  const showContextPanel = isContextOpen;

  function toggleSelected(id: number) {
    setSelectedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      saveJson(CONTEXT_KEY, next);
      return next;
    });
  }

  const selectedDocs = useMemo(() => {
    if (selectedIds.length === 0) return [];
    const set = new Set(selectedIds);
    return docs.filter((d) => set.has(d.id));
  }, [docs, selectedIds]);

  function clearChat() {
    setMessages([]);
  }

  function applyTemplate(kind: "summarize" | "actions" | "interview") {
    if (kind === "summarize")
      setInput("Summarize the selected documents in 6 bullet points.");
    if (kind === "actions")
      setInput(
        "Extract action items from the selected documents. Return a checklist."
      );
    if (kind === "interview")
      setInput(
        "Generate 12 interview questions based on the selected documents, with short model answers."
      );
  }

  async function send() {
    const question = input.trim();
    if (!question) return;

    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "user", text: question },
    ]);
    setInput("");
    setIsSending(true);

    try {
      const contextDocs = selectedDocs.length > 0 ? selectedDocs : docs;

      // For RAG, we still rank locally to pick top 3 relevant docs to send as context
      const ranked = contextDocs
        .map((d) => ({ doc: d, score: scoreDoc(d, question) }))
        .sort((a, b) => b.score - a.score);

      const top = ranked
        .filter((x) => x.score > 0)
        .slice(0, 3)
        .map((x) => x.doc);

      // Call the real AI endpoint
      const response = await chatWithAI(question, top);

      const sources: SourceRef[] = response.sources.map((s) => ({
        id: s.id,
        title: s.title,
        snippet: buildSnippet(contextDocs.find(d => d.id === s.id)?.content || "", question),
      }));

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          text: response.answer,
          sources
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          text: e instanceof Error ? e.message : "Sorry, I encountered an error connecting to the AI service."
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div
      className={`assistant-shell ${showContextPanel ? "with-context" : "no-context"
        }`}
    >
      <aside className="context-panel-container">
        <div className="context-panel-inner">
          <ContextPanel
            docs={docs}
            loading={docsLoading}
            error={docsError}
            selectedIds={selectedIds}
            contextQuery={contextQuery}
            onToggleSelected={toggleSelected}
            onChangeQuery={setContextQuery}
            onClearSelection={onClearSelection}
          />
        </div>
      </aside>

      <section className="assistant-page">
        <div className="assistant-page-inner">
          <MessagesList messages={messages} />
          <div className="assistant-topbar">
            <TemplatesBar onApply={applyTemplate} />
            <button
              type="button"
              className="text-btn"
              onClick={clearChat}
              disabled={messages.length === 0}
            >
              Clear chat
            </button>
          </div>

          <Composer
            value={input}
            disabled={isSending}
            onChange={setInput}
            onSend={send}
          />
        </div>
      </section>


    </div>
  );
}
