import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { login } from "../../api/authClient";
import { useAuth } from "../../auth/Auth";

export default function LoginPage() {
  const nav = useNavigate();
  const location = useLocation();
  const { isReady, isAuthed, loginSuccess } = useAuth();

  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // if already authed, go where user tried to go
  useEffect(() => {
    if (!isReady) return;
    if (isAuthed) {
      const to = (location.state as any)?.from?.pathname ?? "/documents";
      nav(to, { replace: true });
    }
  }, [isReady, isAuthed, nav, location.state]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(email.trim().toLowerCase(), password);
      // login sets HttpOnly cookie; response gives user only
      loginSuccess(res.user);
      nav("/documents", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel" style={{ maxWidth: 520, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>Login</h2>
      <p style={{ color: "var(--muted)", marginTop: 6 }}>
        Demo roles: admin / viewer
      </p>

      <form className="form" onSubmit={onSubmit}>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button
          className="primary-btn"
          type="submit"
          disabled={loading || !isReady}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
}
