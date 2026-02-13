import { NavLink } from "react-router-dom";
import "./mobileNav.scss";
import { useAuth } from "../../auth/useAuth";

export default function MobileNav() {
    const { isAuthed } = useAuth();

    if (!isAuthed) return null;

    return (
        <nav className="mobile-nav">
            <NavLink
                to="/documents"
                className={({ isActive }) =>
                    `mobile-nav-item${isActive ? " is-active" : ""}`
                }
            >
                <div className="icon">📄</div>
                <span>Documents</span>
            </NavLink>
            <NavLink
                to="/assistant"
                className={({ isActive }) =>
                    `mobile-nav-item${isActive ? " is-active" : ""}`
                }
            >
                <div className="icon">✨</div>
                <span>Assistant</span>
            </NavLink>
        </nav>
    );
}
