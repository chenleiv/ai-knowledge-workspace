import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../api/authClient";
import { useAuth } from "../../auth/Auth";

export default function LoginPage() {
  const nav = useNavigate();
  const { isReady, isAuthed, loginSuccess } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isReady && isAuthed) nav("/documents", { replace: true });
  }, [isReady, isAuthed, nav]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(email.trim(), password);
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

        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
}
