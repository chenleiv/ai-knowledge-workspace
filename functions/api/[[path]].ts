import {
  parseAuthUserFromCookie,
  buildLoginCookie,
  buildLogoutCookie,
  type AuthUser,
  type Role,
} from "./helpers/authCookie";

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

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: baseHeaders });
  }

  const db = env.ai_workspace;
  if (!db) return json({ detail: "D1 binding ai_workspace is missing" }, 500);

  // ----------------------------
  // AUTH: login/me/logout
  // ----------------------------

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
      "Set-Cookie": buildLoginCookie(request, user.role as Role),
    });
  }

  if (method === "GET" && path === "/auth/me") {
    const user = parseAuthUserFromCookie(request.headers.get("Cookie"));
    if (!user) return json({ detail: "Not authenticated" }, 401);
    return json(user, 200);
  }

  if (method === "POST" && path === "/auth/logout") {
    return json({ ok: true }, 200, {
      "Set-Cookie": buildLogoutCookie(request),
    });
  }

  // ----------------------------
  // AUTH GUARDS for documents
  // ----------------------------
  const authedUser = parseAuthUserFromCookie(
    request.headers.get("Cookie")
  ) as AuthUser | null;

  const requireAuth = () => {
    if (!authedUser) return json({ detail: "Not authenticated" }, 401);
    return null;
  };

  const requireAdmin = () => {
    if (!authedUser) return json({ detail: "Not authenticated" }, 401);
    if (authedUser.role !== "admin") return json({ detail: "Forbidden" }, 403);
    return null;
  };

  if (path === "/documents" || path.startsWith("/documents/")) {
    const guard = requireAuth();
    if (guard) return guard;
  }

  // ----------------------------
  // GET /documents (viewer/admin)
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
  // POST /documents (admin only)
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

    type D1RunResult = {
      meta?: {
        last_row_id?: number;
        lastRowId?: number;
      };
    };

    const runRes = res as D1RunResult;
    const id = runRes.meta?.last_row_id ?? runRes.meta?.lastRowId ?? null;

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
  // POST /documents/import-bulk (admin only)
  // ----------------------------
  // ----------------------------
  // POST /documents/import-bulk  (admin only)
  // Supports:
  // 1) Array form: [ {title, category, summary, content}, ... ]
  // 2) Payload form: { mode: "merge"|"replace", documents: [...] }
  // ----------------------------
  if (method === "POST" && path === "/documents/import-bulk") {
    const guard = requireAdmin();
    if (guard) return guard;

    const raw = await request.json();

    const mode: "merge" | "replace" =
      raw && typeof raw === "object" && !Array.isArray(raw) && "mode" in raw
        ? (raw as { mode?: unknown }).mode === "replace"
          ? "replace"
          : "merge"
        : "merge";

    const docsRaw: unknown = Array.isArray(raw)
      ? raw
      : raw &&
        typeof raw === "object" &&
        !Array.isArray(raw) &&
        "documents" in raw
      ? (raw as { documents?: unknown }).documents
      : null;

    if (!Array.isArray(docsRaw)) {
      return json({ detail: "Expected an array" }, 400);
    }

    // Normalize to safe rows (ignore id/created_at/updated_at if they exist)
    const rows = docsRaw
      .filter(
        (d): d is Record<string, unknown> =>
          !!d && typeof d === "object" && !Array.isArray(d)
      )
      .map((d) => ({
        title: String(d.title ?? "").trim(),
        category: String(d.category ?? "").trim(),
        summary: String(d.summary ?? "").trim(),
        content: String(d.content ?? "").trim(),
      }))
      .filter((d) => d.title && d.category && d.summary && d.content);

    if (mode === "replace") {
      await db.prepare("DELETE FROM documents").run();
    }

    const now = new Date().toISOString();
    let inserted = 0;

    for (const r of rows) {
      await db
        .prepare(
          `INSERT INTO documents (title, category, summary, content, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
        )
        .bind(r.title, r.category, r.summary, r.content, now, now)
        .run();

      inserted++;
    }

    return json({ inserted, mode }, 200);
  }

  // ----------------------------
  // GET/POST /documents/export (viewer/admin)
  // ----------------------------
  if ((method === "GET" || method === "POST") && path === "/documents/export") {
    const { results } = await db
      .prepare(
        `SELECT id, title, category, summary, content, created_at, updated_at
         FROM documents
         ORDER BY id DESC`
      )
      .all();

    const filename = `documents-export-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;

    return json(results, 200, {
      "Content-Disposition": `attachment; filename="${filename}"`,
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

  // ----------------------------
  // Favorites order (per user)
  // GET  /favorites/order
  // PUT  /favorites/order   body: { order: number[] }
  // ----------------------------
  if (path === "/favorites/order") {
    const guard = requireAuth();
    if (guard) return guard;

    const user = authedUser; // already parsed from cookie in your file
    if (!user) return json({ detail: "Not authenticated" }, 401);

    if (method === "GET") {
      const row = await db
        .prepare(`SELECT order_json FROM favorites_order WHERE email = ?`)
        .bind(user.email)
        .first<{ order_json: string }>();

      const order = row?.order_json
        ? (JSON.parse(row.order_json) as number[])
        : [];
      return json({ order }, 200);
    }

    if (method === "PUT") {
      const body = (await request.json()) as { order?: unknown };
      if (!Array.isArray(body.order)) {
        return json({ detail: "Expected { order: number[] }" }, 400);
      }

      // sanitize to numbers only
      const order = body.order
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n));

      const now = new Date().toISOString();
      await db
        .prepare(
          `INSERT INTO favorites_order (email, order_json, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET
           order_json = excluded.order_json,
           updated_at = excluded.updated_at`
        )
        .bind(user.email, JSON.stringify(order), now)
        .run();

      return json({ ok: true }, 200);
    }
  }

  return json({ detail: "Not found" }, 404);
};
