export interface Env {
  ai_workspace: D1Database;
}

type Role = "admin" | "viewer";

type AuthUser = {
  email: string;
  role: Role;
};

type LoginBody = {
  email?: string;
  password?: string;
};

type DocumentRow = {
  id: number;
  title: string;
  category: string;
  summary: string;
  content: string;
  created_at?: string;
  updated_at?: string;
};

type DocumentBody = {
  title?: string;
  category?: string;
  summary?: string;
  content?: string;
};

type ImportBulkBody =
  | {
      mode: "merge" | "replace";
      documents: Array<{
        id?: number;
        title?: string;
        category?: string;
        summary?: string;
        content?: string;
      }>;
    }
  | Array<{
      id?: number;
      title?: string;
      category?: string;
      summary?: string;
      content?: string;
    }>;

function parseCookie(cookieHeader: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;

  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

function isAuthed(req: Request): { ok: true; role: Role } | { ok: false } {
  const cookies = parseCookie(req.headers.get("Cookie"));
  const token = cookies["access_token"];
  if (!token) return { ok: false };

  const m = token.match(/^demo\.(admin|viewer)$/);
  if (!m) return { ok: false };

  return { ok: true, role: m[1] as Role };
}

function requireAdmin(
  req: Request
): { ok: true } | { ok: false; res: Response } {
  const auth = isAuthed(req);
  if (!auth.ok) {
    return {
      ok: false,
      res: new Response(JSON.stringify({ detail: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  if (auth.role !== "admin") {
    return {
      ok: false,
      res: new Response(JSON.stringify({ detail: "Admin only" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    };
  }
  return { ok: true };
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;

  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  const rawPath = url.pathname;
  const path = rawPath.replace(/^\/api(?=\/|$)/, "").replace(/\/+$/, "");

  const origin = request.headers.get("Origin") ?? "";

  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    Vary: "Origin",
  };

  const json = (
    data: unknown,
    status = 200,
    extraHeaders?: Record<string, string>
  ) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
        ...(extraHeaders ?? {}),
      },
    });

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const db = env.ai_workspace;
  if (!db) return json({ detail: "D1 binding ai_workspace is missing" }, 500);

  // ----------------------------
  // AUTH
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

    // Cookie for demo auth (works on HTTPS + cross-origin if SameSite=None;Secure)
    return json({ user }, 200, {
      "Set-Cookie":
        `access_token=demo.${user.role}; ` +
        "HttpOnly; Path=/; Max-Age=3600; SameSite=None; Secure",
    });
  }

  // GET /auth/me
  if (method === "GET" && path === "/auth/me") {
    const auth = isAuthed(request);
    if (!auth.ok) return json({ detail: "Not authenticated" }, 401);

    const email = auth.role === "admin" ? "admin@demo.com" : "viewer@demo.com";
    return json({ email, role: auth.role }, 200);
  }

  // POST /auth/logout
  if (method === "POST" && path === "/auth/logout") {
    return json({ ok: true }, 200, {
      "Set-Cookie":
        "access_token=; HttpOnly; Path=/; Max-Age=0; SameSite=None; Secure",
    });
  }

  // ----------------------------
  // DOCUMENTS (list)
  // GET /documents   (any logged-in user)
  // ----------------------------
  if (method === "GET" && path === "/documents") {
    const auth = isAuthed(request);
    if (!auth.ok) return json({ detail: "Not authenticated" }, 401);

    const { results } = await db
      .prepare(
        `SELECT id, title, category, summary, content, created_at, updated_at
         FROM documents
         ORDER BY id DESC`
      )
      .all<DocumentRow>();

    return json(results ?? []);
  }

  // ----------------------------
  // DOCUMENTS (export) ✅
  // GET /documents/export  (admin only)
  // ----------------------------
  if (method === "GET" && path === "/documents/export") {
    const admin = requireAdmin(request);
    if (!admin.ok) return admin.res;

    const { results } = await db
      .prepare(
        `SELECT id, title, category, summary, content, created_at, updated_at
         FROM documents
         ORDER BY id ASC`
      )
      .all<DocumentRow>();

    return json(results ?? []);
  }

  // ----------------------------
  // DOCUMENTS (create)
  // POST /documents  (admin only)
  // ----------------------------
  if (method === "POST" && path === "/documents") {
    const admin = requireAdmin(request);
    if (!admin.ok) return admin.res;

    const body = (await request.json()) as DocumentBody;
    const { title, category, summary, content } = body ?? {};

    if (!title || !category || !summary || !content) {
      return json({ detail: "Missing fields" }, 400);
    }

    const res = await db
      .prepare(
        `INSERT INTO documents (title, category, summary, content)
         VALUES (?, ?, ?, ?)`
      )
      .bind(title, category, summary, content)
      .run();

    const id =
      (res as any)?.meta?.last_row_id ?? (res as any)?.meta?.lastRowId ?? null;

    return json({ id, title, category, summary, content }, 201);
  }

  // ----------------------------
  // DOCUMENTS (import bulk) ✅
  // POST /documents/import-bulk  (admin only)
  // supports:
  // 1) { mode: "merge"|"replace", documents: [...] }
  // 2) [...]  (array only)
  // ----------------------------
  if (method === "POST" && path === "/documents/import-bulk") {
    const admin = requireAdmin(request);
    if (!admin.ok) return admin.res;

    const payload = (await request.json()) as ImportBulkBody;

    let mode: "merge" | "replace" = "merge";
    let documents: Array<any> = [];

    if (Array.isArray(payload)) {
      documents = payload;
    } else {
      mode = payload.mode;
      documents = payload.documents ?? [];
    }

    if (!Array.isArray(documents)) {
      return json({ detail: "Invalid payload" }, 400);
    }

    if (mode === "replace") {
      // Clear and re-insert
      await db.prepare("DELETE FROM documents").run();
    }

    let inserted = 0;

    for (const d of documents) {
      const { title, category, summary, content } = d ?? {};
      if (!title || !category || !summary || !content) continue;

      await db
        .prepare(
          `INSERT INTO documents (title, category, summary, content)
           VALUES (?, ?, ?, ?)`
        )
        .bind(title, category, summary, content)
        .run();

      inserted++;
    }

    // Return the full list like your FastAPI did (helps the UI)
    const { results } = await db
      .prepare(
        `SELECT id, title, category, summary, content, created_at, updated_at
         FROM documents
         ORDER BY id DESC`
      )
      .all<DocumentRow>();

    return json(results ?? [], 200, { "X-Inserted": String(inserted) });
  }

  // ----------------------------
  // DOCUMENTS by id
  // /documents/:id  (GET any authed, PUT/DELETE admin)
  // ----------------------------
  const match = path.match(/^\/documents\/(\d+)$/);
  if (match) {
    const id = Number(match[1]);

    if (method === "GET") {
      const auth = isAuthed(request);
      if (!auth.ok) return json({ detail: "Not authenticated" }, 401);

      const row = await db
        .prepare(
          `SELECT id, title, category, summary, content, created_at, updated_at
           FROM documents
           WHERE id = ?`
        )
        .bind(id)
        .first<DocumentRow>();

      if (!row) return json({ detail: "Not found" }, 404);
      return json(row, 200);
    }

    if (method === "PUT") {
      const admin = requireAdmin(request);
      if (!admin.ok) return admin.res;

      const body = (await request.json()) as DocumentBody;
      const { title, category, summary, content } = body ?? {};

      await db
        .prepare(
          `UPDATE documents
           SET title = ?, category = ?, summary = ?, content = ?, updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(title, category, summary, content, id)
        .run();

      const row = await db
        .prepare(
          `SELECT id, title, category, summary, content, created_at, updated_at
           FROM documents
           WHERE id = ?`
        )
        .bind(id)
        .first<DocumentRow>();

      return json(row ?? { id, title, category, summary, content }, 200);
    }

    if (method === "DELETE") {
      const admin = requireAdmin(request);
      if (!admin.ok) return admin.res;

      await db.prepare("DELETE FROM documents WHERE id = ?").bind(id).run();
      return json({ ok: true }, 200);
    }
  }

  return json({ detail: "Not found" }, 404);
};
