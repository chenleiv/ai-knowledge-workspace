export type Role = "admin" | "viewer";
export type AuthUser = { email: string; role: Role };

const COOKIE_NAME = "demo_token";

export function parseAuthUserFromCookie(
  cookieHeader: string | null
): AuthUser | null {
  const cookie = cookieHeader ?? "";
  const re = new RegExp(`${COOKIE_NAME}=demo\\.(admin|viewer)`);
  const m = cookie.match(re);
  if (!m) return null;

  const role = m[1] as Role;
  const email = role === "admin" ? "admin@demo.com" : "viewer@demo.com";
  return { email, role };
}

function isLocalRequest(request: Request) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin") ?? "";
  return (
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    origin.startsWith("http://localhost")
  );
}

export function buildLoginCookie(request: Request, role: Role) {
  const isLocal = isLocalRequest(request);
  const attrs = isLocal
    ? "HttpOnly; Path=/; Max-Age=3600; SameSite=Lax"
    : "HttpOnly; Path=/; Max-Age=3600; SameSite=None; Secure";

  return `${COOKIE_NAME}=demo.${role}; ${attrs}`;
}

export function buildLogoutCookie(request: Request) {
  const isLocal = isLocalRequest(request);
  const attrs = isLocal
    ? "HttpOnly; Path=/; Max-Age=0; SameSite=Lax"
    : "HttpOnly; Path=/; Max-Age=0; SameSite=None; Secure";

  return `${COOKIE_NAME}=; ${attrs}`;
}
