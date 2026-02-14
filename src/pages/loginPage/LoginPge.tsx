import { useActionState, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { login } from "../../api/authClient";
import { useAuth } from "../../auth/useAuth";
import { useStatus } from "../../components/statusBar/useStatus";
import "./loginPage.scss";

export type LoginLocationState = { from?: Location };

export default function LoginPage() {
  const nav = useNavigate();
  const location = useLocation();
  const status = useStatus();

  const { isAuthed, loginSuccess } = useAuth();

  const [email, setEmail] = useState("admin@demo.com");
  const [password, setPassword] = useState("admin123");

  const redirectTo = (() => {
    const state = location.state as LoginLocationState | null;
    return state?.from?.pathname ?? "/documents";
  })();

  const [error, loginAction, isPending] = useActionState(
    async (_previousState: string | null, formData: FormData) => {
      const emailVal = formData.get("email") as string;
      const passVal = formData.get("password") as string;

      try {
        const res = await login(emailVal.trim(), passVal);
        loginSuccess(res.user);
        nav(redirectTo, { replace: true });
        return null;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Login failed";
        status.show({ kind: "error", title: "Login failed", message });
        return message;
      }
    },
    null
  );

  useEffect(() => {
    if (isAuthed) {
      nav(redirectTo, { replace: true });
    }
  }, [isAuthed, nav, redirectTo]);

  return (
    <div className="login-panel">
      <h2 className="login-title">Login</h2>

      <form className="login-form" action={loginAction}>
        {error && <div className="login-error">{error}</div>}
        <label className="login-field">
          Email
          <input
            name="email"
            className="login-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="login-field">
          Password
          <input
            name="password"
            className="login-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button className="primary-btn" type="submit" disabled={isPending}>
          {isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
