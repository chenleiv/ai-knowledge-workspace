import { NavLink } from "react-router-dom";
import { FileText, Sparkles } from "lucide-react";
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
                <div className="icon">
                    <FileText />
                </div>
                <span>Documents</span>
            </NavLink>
            <NavLink
                to="/assistant"
                className={({ isActive }) =>
                    `mobile-nav-item${isActive ? " is-active" : ""}`
                }
            >
                <div className="icon">
                    <Sparkles />
                </div>
                <span>Assistant</span>
            </NavLink>
        </nav>
    );
}
