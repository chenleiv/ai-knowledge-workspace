import { useEffect, useState } from "react";
import "./assistantPage.scss";

import { listDocuments, type DocumentItem } from "../../api/documentsClient";
import { chatWithAI } from "../../api/aiClient";
import type { ChatMessage, SourceRef } from "./types";
import { CHAT_KEY, CONTEXT_KEY, buildSnippet, scoreDoc, uid } from "./utils";
import { Check, PanelRight } from "lucide-react";

import ContextPanel from "./components/ContextPanel";
import MessagesList from "./components/MessagesList";
import Composer from "./components/Composer";
import { loadJson, saveJson } from "../../utils/storage";

const INITIAL_GREETING =
  "Select documents on the left to focus my answer on specific sources, or ask me anything to search across your entire library.";

export default function AssistantPage() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);

  const [contextQuery, setContextQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>(
    loadJson<number[]>(CONTEXT_KEY, []),
  );

  const [messages, setMessages] = useState<ChatMessage[]>(
    loadJson<ChatMessage[]>(CHAT_KEY, [
      {
        id: uid(),
        role: "assistant",
        text: INITIAL_GREETING,
        isTyped: true,
        isGreeting: true,
      },
    ]),
  );

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isContextOpen, setIsContextOpen] = useState(false);

  function onClearSelection() {
    setSelectedIds([]);
    saveJson(CONTEXT_KEY, []);
  }
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

  const showContextPanel = isContextOpen;

  function toggleSelected(id: number) {
    setSelectedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      saveJson(CONTEXT_KEY, next);
      if (next.length > prev.length) {
        setIsContextOpen(true);
      }
      return next;
    });
  }

  const selectedDocs = (() => {
    if (selectedIds.length === 0) return [];
    const set = new Set(selectedIds);
    return docs.filter((d) => set.has(d.id));
  })();

  function clearChat() {
    setMessages([
      {
        id: uid(),
        role: "assistant",
        text: INITIAL_GREETING,
        isTyped: true,
        isGreeting: true,
      },
    ]);
  }

  async function send() {
    const question = input.trim();
    if (!question) return;

    setMessages((prev) => {
      const isInitial =
        prev.length === 1 &&
        prev[0].role === "assistant" &&
        prev[0].text === INITIAL_GREETING;
      const history = isInitial ? [] : prev;

      return [...history, { id: uid(), role: "user", text: question }];
    });
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

      const response = await chatWithAI(question, top);

      const sources: SourceRef[] = response.sources.map((s) => ({
        id: s.id,
        title: s.title,
        snippet: buildSnippet(
          contextDocs.find((d) => d.id === s.id)?.content || "",
          question,
        ),
      }));

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          text: response.answer,
          sources,
          isTyped: false,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          text:
            e instanceof Error
              ? e.message
              : "Sorry, I encountered an error connecting to the AI service.",
          isTyped: false,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function handleTypingComplete(id: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isTyped: true } : m)),
    );
  }

  return (
    <div
      className={`assistant-shell ${showContextPanel ? "with-context" : "no-context"
        }`}
    >
      <aside
        className={`context-panel-container ${showContextPanel ? "mobile-open" : ""}`}
      >
        <div className="context-panel-inner">
          <ContextPanel
            docs={docs}
            loading={docsLoading}
            error={docsError}
            selectedIds={selectedIds}
            contextQuery={contextQuery}
            onToggleSelected={toggleSelected}
            onChangeQuery={(q) => {
              setContextQuery(q);
              if (q.trim().length > 0) setIsContextOpen(true);
            }}
            onClearSelection={onClearSelection}
          />
        </div>
      </aside>

      {showContextPanel && (
        <button
          onClick={() => setIsContextOpen(false)}
          className="mobile-context-close-btn"
          aria-label="Close context"
        >
          <Check />
        </button>
      )}

      <section className="assistant-page">
        <div className="assistant-page-inner">
          <MessagesList
            messages={messages}
            isThinking={isSending}
            onTypingComplete={handleTypingComplete}
          />
          <div className="assistant-topbar">
            <button
              type="button"
              className="text-btn"
              onClick={clearChat}
              disabled={messages.length === 0}
            >
              Clear chat
            </button>

            <button
              type="button"
              className="icon-btn mobile-only-btn"
              onClick={() => setIsContextOpen(!isContextOpen)}
              title="Toggle Context"
            >
              <span>Documents</span>
              <PanelRight />
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
