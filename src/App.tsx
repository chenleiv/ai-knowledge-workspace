import { Link, Route, Routes } from "react-router-dom";
import DocumentsPage from "./pages/documentsPages/DocumentsPage";
import DocumentDetailsPage from "./pages/documentsPages/DocumentDetailsPage";
import AssistantPage from "./pages/assistantPages/AssistantPage";
import { useTheme } from "./hooks/useTheme";
import "./components/confirmModal/confirmDialog.scss";
import ThemeToggle from "./themeToggle/ThemeToggle";

function App() {
  const { theme, setTheme } = useTheme();
  console.log("API_BASE:", import.meta.env.VITE_API_BASE);

  return (
    <div className="app-layout">
      <header>
        <h1>Knowledge Workspace</h1>

        <nav>
          <Link to="/documents">Documents</Link>
          <Link to="/assistant">AI Assistant</Link>
        </nav>

        <ThemeToggle value={theme} onChange={setTheme} />
      </header>

      <main>
        <Routes>
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/documents/:id" element={<DocumentDetailsPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
