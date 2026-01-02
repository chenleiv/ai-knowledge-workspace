import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { login } from "../../api/authClient";
import { useAuth } from "../../auth/useAuth";
import type { LoginLocationState } from "../../router/locationState";
import { useStatus } from "../../components/statusBar/useStatus";

export default function LoginPage() {
  const nav = useNavigate();
  const location = useLocation();
  const status = useStatus();

  const { isAuthed, loginSuccess } = useAuth();

  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  const redirectTo = useMemo(() => {
    const state = location.state as LoginLocationState | null;
    return state?.from?.pathname ?? "/documents";
  }, [location.state]);

  useEffect(() => {
    if (isAuthed) {
      nav(redirectTo, { replace: true });
    }
  }, [isAuthed, nav, redirectTo]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await login(email.trim(), password);
      loginSuccess(res.user);
      nav(redirectTo, { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      status.show({ kind: "error", title: "Login failed", message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel" style={{ maxWidth: 520, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>Login</h2>

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

        <button className="primary-btn" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
