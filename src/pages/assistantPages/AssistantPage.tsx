import { useEffect, useMemo, useState } from "react";
import "./assistantPage.scss";

import { listDocuments, type DocumentItem } from "../../api/documentsClient";
import type { ChatMessage, SourceRef } from "./types";
import {
  CHAT_KEY,
  CONTEXT_KEY,
  buildSnippet,
  loadJson,
  saveJson,
  scoreDoc,
  uid,
} from "./utils";

import ContextPanel from "./components/ContextPanel";
import MessagesList from "./components/MessagesList";
import TemplatesBar from "./components/TemplatesBar";
import Composer from "./components/Composer";

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
    const set = new Set(selectedIds);
    return docs.filter((d) => set.has(d.id));
  }, [docs, selectedIds]);

  function clearChat() {
    setMessages([
      {
        id: uid(),
        role: "assistant",
        text: "Chat cleared. Select documents and ask again.",
      },
    ]);
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

      const ranked = contextDocs
        .map((d) => ({ doc: d, score: scoreDoc(d, question) }))
        .sort((a, b) => b.score - a.score);

      const top = ranked
        .filter((x) => x.score > 0)
        .slice(0, 3)
        .map((x) => x.doc);

      const sources: SourceRef[] =
        top.length === 0
          ? []
          : top.map((d) => ({
              id: d.id,
              title: d.title,
              snippet: buildSnippet(d.content || d.summary || "", question),
            }));

      let answer: string;

      if (contextDocs.length === 0) {
        answer =
          "No documents available yet. Create documents first, then ask again.";
      } else if (top.length === 0) {
        answer =
          selectedDocs.length > 0
            ? "I could not find this in the selected documents."
            : "I could not find this in your documents.";
      } else {
        answer =
          "Here is a mock, document-grounded answer based on retrieved sources. Next step: connect a real LLM + RAG for better reasoning and citations.";
      }

      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "assistant", text: answer, sources },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="assistant-shell">
      <ContextPanel
        docs={docs}
        loading={docsLoading}
        error={docsError}
        selectedIds={selectedIds}
        contextQuery={contextQuery}
        onRefresh={load}
        onToggleSelected={toggleSelected}
        onChangeQuery={setContextQuery}
      />

      <section className="assistant-page">
        <TemplatesBar onApply={applyTemplate} onClear={clearChat} />

        <MessagesList messages={messages} />

        {selectedIds.length === 0 && (
          <div className="assistant-hint">
            Scope:{" "}
            {selectedDocs.length > 0
              ? `Selected documents (${selectedDocs.length})`
              : "All documents"}
          </div>
        )}

        <Composer
          value={input}
          disabled={isSending}
          onChange={setInput}
          onSend={send}
        />
      </section>
    </div>
  );
}
