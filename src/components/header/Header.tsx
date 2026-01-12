import { Link } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import ThemeToggle from "../../themeToggle/ThemeToggle";
import UserMenu from "../userMenu/UserMenu";
import "../userMenu/userMenu.scss";
import { useAuth } from "../../auth/useAuth";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const { isAuthed } = useAuth();

  return (
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
  );
}
