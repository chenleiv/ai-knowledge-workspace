import { NavLink } from "react-router-dom";
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
      <div className="header-left">
        <h1 className="header-title">Knowledge Workspace</h1>
      </div>

      {isAuthed && (
        <nav>
          <NavLink
            className={({ isActive }) =>
              `nav-link${isActive ? " is-active" : ""}`
            }
            to="/documents"
          >
            Documents
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `nav-link${isActive ? " is-active" : ""}`
            }
            to="/assistant"
          >
            AI Assistant
          </NavLink>
        </nav>
      )}

      <div className="header-right">
        <ThemeToggle value={theme} onChange={setTheme} />
        <UserMenu />
      </div>
    </header>
  );
}
