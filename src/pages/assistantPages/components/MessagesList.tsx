import { useEffect, useRef } from "react";
import type { ChatMessage } from "../types";

type Props = {
  messages: ChatMessage[];
};

export default function MessagesList({ messages }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Best-effort: scroll to bottom on new messages
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  return (
    <div ref={containerRef} className="messages">
      {messages.map((m) => (
        <div key={m.id} className={`message ${m.role}`}>
          <div className="bubble">{m.text}</div>

          {m.role === "assistant" && m.sources && m.sources.length > 0 && (
            <div className="sources">
              <div className="sources-title">Used sources</div>
              <ul className="sources-list">
                {m.sources.map((s) => (
                  <li key={s.id} className="source-item">
                    <div className="source-title">{s.title}</div>
                    <div className="source-snippet">{s.snippet}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}

      <div ref={endRef} />
    </div>
  );
}
