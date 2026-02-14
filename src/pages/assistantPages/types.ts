export type Role = "user" | "assistant";

export type SourceRef = {
  id: number;
  title: string;
  snippet: string;
};

export type ChatMessage = {
  id: string;
  role: Role;
  text: React.ReactNode;
  sources?: SourceRef[];
  isTyped?: boolean;
  isGreeting?: boolean;
};
