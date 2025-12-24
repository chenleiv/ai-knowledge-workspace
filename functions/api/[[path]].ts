export interface Env {
  ai_workspace: D1Database;
}

interface DocumentBody {
  title?: string;
  category?: string;
  summary?: string;
  content?: string;
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const method = request.method.toUpperCase();

  // strip /api prefix
  const path = url.pathname.replace(/^\/api/, "") || "/";

  const origin = request.headers.get("Origin") ?? "*";

  const json = (data: any, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
      },
    });

  // --------------------
  // CORS preflight
  // --------------------
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  const db = env.ai_workspace;
  if (!db) {
    return json({ detail: "D1 binding ai_workspace is missing" }, 500);
  }

  // ======================================================
  // GET /documents
  // ======================================================
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

  // ======================================================
  // POST /documents (create)
  // ======================================================
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

  // ======================================================
  // POST /documents/import-bulk
  // Body: [{title,category,summary,content}, ...]
  // ======================================================
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

  // ======================================================
  // /documents/:id  (GET / PUT / DELETE)
  // ======================================================
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

  // ======================================================
  // Fallback
  // ======================================================
  return json({ detail: "Not found" }, 404);
};
