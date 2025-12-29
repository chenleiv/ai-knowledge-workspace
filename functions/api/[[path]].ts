export interface Env {
  ai_workspace: D1Database;
}

type Role = "admin" | "viewer";
type AuthUser = { email: string; role: Role };

interface DocumentBody {
  title?: string;
  category?: string;
  summary?: string;
  content?: string;
}

type LoginBody = { email?: string; password?: string };

function parseAuthUserFromCookie(cookieHeader: string | null): AuthUser | null {
  const cookie = cookieHeader ?? "";
  const m = cookie.match(/access_token=demo\.(admin|viewer)/);
  if (!m) return null;

  const role = m[1] as Role;
  const email = role === "admin" ? "admin@demo.com" : "viewer@demo.com";
  return { email, role };
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  const rawPath = url.pathname;
  const path = rawPath.replace(/^\/api(?=\/|$)/, "").replace(/\/+$/, "");

  const origin = request.headers.get("Origin") ?? "";
  const allowOrigin = origin || "*";

  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  };

  const json = (
    data: unknown,
    status = 200,
    extraHeaders?: Record<string, string>
  ) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...baseHeaders, ...(extraHeaders ?? {}) },
    });

  // CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: baseHeaders });
  }

  const db = env.ai_workspace;
  if (!db) return json({ detail: "D1 binding ai_workspace is missing" }, 500);

  // ----------------------------
  // AUTH: login/me/logout
  // ----------------------------

  // POST /auth/login
  if (method === "POST" && path === "/auth/login") {
    const body = (await request.json()) as LoginBody;

    const isAdmin =
      body?.email === "admin@demo.com" && body?.password === "admin123";
    const isViewer =
      body?.email === "viewer@demo.com" && body?.password === "viewer123";

    if (!isAdmin && !isViewer) {
      return json({ detail: "Invalid credentials" }, 401);
    }

    const user: AuthUser = {
      email: body.email!,
      role: isAdmin ? "admin" : "viewer",
    };

    return json({ user }, 200, {
      // Demo cookie used only to identify role
      "Set-Cookie": `access_token=demo.${user.role}; HttpOnly; Path=/; Max-Age=3600; SameSite=None; Secure`,
    });
  }

  // GET /auth/me
  if (method === "GET" && path === "/auth/me") {
    const user = parseAuthUserFromCookie(request.headers.get("Cookie"));
    if (!user) return json({ detail: "Not authenticated" }, 401);
    return json(user, 200);
  }

  // POST /auth/logout
  if (method === "POST" && path === "/auth/logout") {
    return json({ ok: true }, 200, {
      "Set-Cookie": `access_token=; HttpOnly; Path=/; Max-Age=0; SameSite=None; Secure`,
    });
  }

  // ----------------------------
  // AUTH GUARDS for documents
  // ----------------------------
  const authedUser = parseAuthUserFromCookie(request.headers.get("Cookie"));

  const requireAuth = () => {
    if (!authedUser) return json({ detail: "Not authenticated" }, 401);
    return null;
  };

  const requireAdmin = () => {
    if (!authedUser) return json({ detail: "Not authenticated" }, 401);
    if (authedUser.role !== "admin") return json({ detail: "Forbidden" }, 403);
    return null;
  };

  // Any /documents* endpoint requires auth
  if (path === "/documents" || path.startsWith("/documents/")) {
    const guard = requireAuth();
    if (guard) return guard;
  }

  // ----------------------------
  // GET /documents   (viewer/admin)
  // ----------------------------
  if (method === "GET" && path === "/documents") {
    const { results } = await db
      .prepare(
        `SELECT id, title, category, summary, content, created_at, updated_at
         FROM documents
         ORDER BY id DESC`
      )
      .all();

    return json(results, 200);
  }

  // ----------------------------
  // POST /documents (create)  (admin only)
  // ----------------------------
  if (method === "POST" && path === "/documents") {
    const guard = requireAdmin();
    if (guard) return guard;

    const body = (await request.json()) as DocumentBody;
    const { title, category, summary, content } = body ?? {};

    if (!title || !category || !summary || !content) {
      return json({ detail: "Missing fields" }, 400);
    }

    const now = new Date().toISOString();

    const res = await db
      .prepare(
        `INSERT INTO documents (title, category, summary, content, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(title, category, summary, content, now, now)
      .run();

    const id =
      (res as any)?.meta?.last_row_id ?? (res as any)?.meta?.lastRowId ?? null;

    if (!id)
      return json({ detail: "Insert succeeded but no id returned" }, 500);

    return json(
      {
        id,
        title,
        category,
        summary,
        content,
        created_at: now,
        updated_at: now,
      },
      201
    );
  }

  // ----------------------------
  // POST /documents/import-bulk  (admin only)
  // ----------------------------
  if (method === "POST" && path === "/documents/import-bulk") {
    const guard = requireAdmin();
    if (guard) return guard;

    const items = await request.json();
    if (!Array.isArray(items))
      return json({ detail: "Expected an array" }, 400);

    const now = new Date().toISOString();
    let inserted = 0;

    for (const it of items) {
      const { title, category, summary, content } = it ?? {};
      if (!title || !category || !summary || !content) continue;

      await db
        .prepare(
          `INSERT INTO documents (title, category, summary, content, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(title, category, summary, content, now, now)
        .run();

      inserted++;
    }

    return json({ inserted }, 200);
  }

  // ----------------------------
  // POST /documents/export  (viewer/admin)
  // Returns JSON array of documents
  // ----------------------------
  if (method === "POST" && path === "/documents/export") {
    const { results } = await db
      .prepare(
        `SELECT id, title, category, summary, content, created_at, updated_at
         FROM documents
         ORDER BY id DESC`
      )
      .all();

    return json(results, 200, {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="documents-export.json"`,
    });
  }

  // ----------------------------
  // /documents/:id (GET/PUT/DELETE)
  // GET: viewer/admin
  // PUT/DELETE: admin only
  // ----------------------------
  const match = path.match(/^\/documents\/(\d+)$/);
  if (match) {
    const id = Number(match[1]);

    if (method === "GET") {
      const row = await db
        .prepare(
          `SELECT id, title, category, summary, content, created_at, updated_at
           FROM documents
           WHERE id = ?`
        )
        .bind(id)
        .first();

      if (!row) return json({ detail: "Not found" }, 404);
      return json(row, 200);
    }

    if (method === "PUT") {
      const guard = requireAdmin();
      if (guard) return guard;

      const body = (await request.json()) as DocumentBody;
      const { title, category, summary, content } = body ?? {};

      const now = new Date().toISOString();

      await db
        .prepare(
          `UPDATE documents
           SET title = ?, category = ?, summary = ?, content = ?, updated_at = ?
           WHERE id = ?`
        )
        .bind(title, category, summary, content, now, id)
        .run();

      return json(
        { id, title, category, summary, content, updated_at: now },
        200
      );
    }

    if (method === "DELETE") {
      const guard = requireAdmin();
      if (guard) return guard;

      await db.prepare(`DELETE FROM documents WHERE id = ?`).bind(id).run();
      return json({ ok: true }, 200);
    }
  }

  return json({ detail: "Not found" }, 404);
};
