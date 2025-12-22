import { Link, Route, Routes } from "react-router-dom";
import DocumentsPage from "./pages/documentsPages/DocumentsPage";
import DocumentDetailsPage from "./pages/documentsPages/DocumentDetailsPage";
import AssistantPage from "./pages/assistantPages/AssistantPage";
import { useTheme } from "./hooks/useTheme";
import "./components/confirmModal/confirmDialog.scss";
import ThemeToggle from "./themeToggle/ThemeToggle";
import RequireAuth from "./auth/RequireAuth";
import LoginPage from "./pages/loginPage/LoginPge";
import UsersPage from "./pages/loginPage/UsersPage";

function App() {
  const { theme, setTheme } = useTheme();

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
          <Route path="/login" element={<LoginPage />} />

          <Route element={<RequireAuth />}>
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/documents/:id" element={<DocumentDetailsPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/users" element={<UsersPage />} />
          </Route>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
