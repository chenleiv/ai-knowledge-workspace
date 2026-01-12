import { Navigate, Route, Routes } from "react-router-dom";

import DocumentsPage from "./pages/documentsPages/DocumentsPage";
import DocumentDetailsPage from "./pages/documentsPages/DocumentDetailsPage";
import AssistantPage from "./pages/assistantPages/AssistantPage";
import LoginPage from "./pages/loginPage/LoginPge";
import UsersPage from "./pages/loginPage/UsersPage";

import "./components/confirmModal/confirmDialog.scss";

import Header from "./components/header/Header";

import { useAuth } from "./auth/useAuth";
import RequireAuth from "./auth/RequireAuth";
import RequireRole from "./auth/RequireRole";

function App() {
  const { isAuthed } = useAuth();

  return (
    <div className="app-layout">
      <Header />

      <main>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<RequireAuth />}>
            <Route path="/" element={<Navigate to="/documents" replace />} />
            <Route path="/documents" element={<DocumentsPage />} />

            {/* Admin-only: create */}
            <Route element={<RequireRole allow={["admin"]} />}>
              <Route path="/documents/new" element={<DocumentDetailsPage />} />
              <Route path="/users" element={<UsersPage />} />
            </Route>

            {/* Everyone: view/edit existing by id */}
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
