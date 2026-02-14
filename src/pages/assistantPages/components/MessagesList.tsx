import { useEffect, useRef } from "react";
import type { ChatMessage } from "../types";
import TypewriterText from "./TypewriterText";

type Props = {
  messages: ChatMessage[];
  isThinking?: boolean;
  onTypingComplete?: (id: string) => void;
};

export default function MessagesList({ messages, isThinking, onTypingComplete }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isThinking]);

  return (
    <div ref={containerRef} className="messages">
      {messages.map((m, idx) => {
        const isLastAssistantMessage = m.role === "assistant" && idx === messages.length - 1;

        return (
          <div key={m.id} className={`message ${m.role} ${m.isGreeting ? "greeting" : ""}`}>
            <div className="bubble">
              {isLastAssistantMessage && m.isTyped === false ? (
                <TypewriterText
                  text={m.text}
                  onComplete={() => onTypingComplete?.(m.id)}
                />
              ) : (
                m.text
              )}
            </div>
          </div>
        );
      })}

      {isThinking && (
        <div className="message assistant thinking">
          <div className="bubble">
            <span /><span /><span />
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
