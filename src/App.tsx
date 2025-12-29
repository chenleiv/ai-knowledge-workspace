import { Link, Navigate, Route, Routes } from "react-router-dom";

import DocumentsPage from "./pages/documentsPages/DocumentsPage";
import DocumentDetailsPage from "./pages/documentsPages/DocumentDetailsPage";
import AssistantPage from "./pages/assistantPages/AssistantPage";
import LoginPage from "./pages/loginPage/LoginPge";
import UsersPage from "./pages/loginPage/UsersPage";

import { useTheme } from "./hooks/useTheme";
import ThemeToggle from "./themeToggle/ThemeToggle";
import "./components/confirmModal/confirmDialog.scss";
import UserMenu from "./components/userMenu/UserMenu";
import "./components/userMenu/userMenu.scss";
import { useAuth } from "./auth/Auth";
import RequireAuth from "./auth/RequireAuth";
import RequireRole from "./auth/RequireRole";

function App() {
  const { theme, setTheme } = useTheme();
  const { isAuthed } = useAuth();

  return (
    <div className="app-layout">
      <header>
        <h1>Knowledge Workspace</h1>

        {isAuthed && (
          <nav>
            <Link to="/documents">Documents</Link>
            <Link to="/assistant">AI Assistant</Link>
          </nav>
        )}

        <div className="header-right">
          <ThemeToggle value={theme} onChange={setTheme} />
          <UserMenu />
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<RequireAuth />}>
            <Route path="/" element={<Navigate to="/documents" replace />} />

            <Route path="/documents" element={<DocumentsPage />} />

            <Route element={<RequireRole allow={["admin"]} />}>
              <Route
                path="/documents/new"
                element={<Navigate to="/documents" replace />}
              />
              <Route path="/users" element={<UsersPage />} />
            </Route>

            <Route path="/documents/:id" element={<DocumentDetailsPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
          </Route>

          <Route
            path="*"
            element={
              <Navigate to={isAuthed ? "/documents" : "/login"} replace />
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
