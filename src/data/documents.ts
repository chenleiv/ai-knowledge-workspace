export interface DocumentItem {
  id: number;
  title: string;
  category: string;
  summary: string;
  content: string;
}

export const DOCUMENTS: DocumentItem[] = [
  {
    id: 1,
    title: "Intro to React",
    category: "Frontend",
    summary: "Basic concepts: components, props, state.",
    content:
      "React is a library for building UIs with components. Props are inputs, state is internal data. Hooks manage state and side effects.",
  },
  {
    id: 2,
    title: "What is an API?",
    category: "Backend",
    summary: "Simple explanation of REST APIs and HTTP.",
    content:
      "An API is a contract between client and server. In REST, endpoints map to resources using HTTP methods (GET/POST/PUT/DELETE).",
  },
  {
    id: 3,
    title: "Authentication vs Authorization",
    category: "Security",
    summary: "Difference between authN and authZ.",
    content:
      "Authentication verifies who you are. Authorization determines what you can access. OAuth2/PKCE help secure auth flows for SPAs.",
  },
];
