export interface Env {
  ai_workspace: D1Database;
}

interface DocumentBody {
  title?: string;
  category?: string;
  summary?: string;
  content?: string;
}

type LoginBody = { email?: string; password?: string };

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  // Normalize path (remove /api prefix)
  const rawPath = url.pathname;
  const path = rawPath
    .replace(/^\/api(?=\/|$)/, "") // remove /api only if it is a prefix
    .replace(/\/+$/, ""); // trim trailing slashes

  // =========================
  // CORS (IMPORTANT for cookies)
  // =========================
  const origin = request.headers.get("Origin") ?? "";

  // ✅ Recommended: allowlist
  const allowedOrigins = new Set<string>([
    "https://ai-knowledge-workspace.pages.dev",
    // add preview domains here if you use them
    // "https://<your-preview>.ai-knowledge-workspace.pages.dev",
    "http://localhost:5173",
    "http://localhost:5174",
  ]);

  const allowOrigin = allowedOrigins.has(origin)
    ? origin
    : "https://ai-knowledge-workspace.pages.dev";

  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    Vary: "Origin",
  };

  const json = (data: any, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  // Preflight
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // DB binding
  const db = env.ai_workspace;
  if (!db) return json({ detail: "D1 binding ai_workspace is missing" }, 500);

  // ======================================================
  // AUTH
  // ======================================================

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

    const user = {
      email: body.email!,
      role: (isAdmin ? "admin" : "viewer") as "admin" | "viewer",
    };

    return new Response(JSON.stringify({ user }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
        // Demo cookie (HttpOnly)
        "Set-Cookie": `access_token=demo.${user.role}; HttpOnly; Path=/; Max-Age=3600; SameSite=None; Secure`,
      },
    });
  }

  // GET /auth/me
  if (method === "GET" && path === "/auth/me") {
    const cookie = request.headers.get("Cookie") || "";
    const m = cookie.match(/access_token=demo\.(admin|viewer)/);
    if (!m) return json({ detail: "Not authenticated" }, 401);

    const role = m[1] as "admin" | "viewer";
    const email = role === "admin" ? "admin@demo.com" : "viewer@demo.com";
    return json({ email, role }, 200);
  }

  // POST /auth/logout
  if (method === "POST" && path === "/auth/logout") {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
        "Set-Cookie": `access_token=; HttpOnly; Path=/; Max-Age=0; SameSite=None; Secure`,
      },
    });
  }

  // ======================================================
  // DOCUMENTS
  // ======================================================

  // GET /documents
  if (method === "GET" && path === "/documents") {
    const { results } = await db
      .prepare(
        `SELECT id, title, category, summary, content
         FROM documents
         ORDER BY id DESC`
      )
      .all();

    return json(results);
  }

  // POST /documents (create)
  if (method === "POST" && path === "/documents") {
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

    if (!id) {
      return json(
        { detail: "Insert succeeded but no last_row_id returned" },
        500
      );
    }

    return json({ id, title, category, summary, content }, 201);
  }

  // POST /documents/import-bulk
  // Body: [{title,category,summary,content}, ...]
  if (method === "POST" && path === "/documents/import-bulk") {
    const items = await request.json();

    if (!Array.isArray(items)) {
      return json({ detail: "Expected an array" }, 400);
    }

    let inserted = 0;

    for (const it of items) {
      const { title, category, summary, content } = it ?? {};
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

    return json({ inserted }, 200);
  }

  // /documents/:id
  const match = path.match(/^\/documents\/(\d+)$/);
  if (match) {
    const id = Number(match[1]);

    // GET /documents/:id
    if (method === "GET") {
      const row = await db
        .prepare(
          `SELECT id, title, category, summary, content
           FROM documents
           WHERE id = ?`
        )
        .bind(id)
        .first();

      if (!row) return json({ detail: "Not found" }, 404);
      return json(row);
    }

    // PUT /documents/:id
    if (method === "PUT") {
      const body = (await request.json()) as DocumentBody;
      const { title, category, summary, content } = body ?? {};

      await db
        .prepare(
          `UPDATE documents
           SET title = ?, category = ?, summary = ?, content = ?
           WHERE id = ?`
        )
        .bind(title, category, summary, content, id)
        .run();

      return json({ id, title, category, summary, content });
    }

    // DELETE /documents/:id
    if (method === "DELETE") {
      await db.prepare(`DELETE FROM documents WHERE id = ?`).bind(id).run();
      return json({ ok: true });
    }
  }

  return json({ detail: "Not found" }, 404);
};
