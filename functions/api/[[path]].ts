export const onRequest: PagesFunction<{ ai_workspace: D1Database }> = async (
  ctx
) => {
  const url = new URL(ctx.request.url);
  const path = url.pathname.replace(/^\/api/, ""); // "/documents/1" etc.
  const method = ctx.request.method.toUpperCase();

  // Helper: JSON response
  const json = (data: any, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  // --- CORS preflight ---
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // Make sure binding exists
  const db = ctx.env.ai_workspace;
  if (!db) return json({ detail: "D1 binding ai_workspace is missing" }, 500);

  // ----------------------------
  // GET /documents
  // ----------------------------
  if (method === "GET" && path === "/documents") {
    const { results } = await db
      .prepare(
        "SELECT id, title, category, summary, content FROM documents ORDER BY id DESC"
      )
      .all();
    return json(results);
  }

  // ----------------------------
  // POST /documents (create)  ✅ must return {id,...}
  // ----------------------------
  if (method === "POST" && path === "/documents") {
    const body = await ctx.request.json();
    const { title, category, summary, content } = body ?? {};

    if (!title || !category || !summary || !content) {
      return json({ detail: "Missing fields" }, 400);
    }

    const res = await db
      .prepare(
        "INSERT INTO documents (title, category, summary, content) VALUES (?, ?, ?, ?)"
      )
      .bind(title, category, summary, content)
      .run();

    // D1 gives lastRowId
    const id = (res.meta as any)?.last_row_id ?? (res.meta as any)?.lastRowId;
    return json({ id, title, category, summary, content }, 201);
  }

  // ----------------------------
  // POST /documents/import-bulk ✅
  // Body: [{title,category,summary,content}, ...]
  // ----------------------------
  if (method === "POST" && path === "/documents/import-bulk") {
    const items = await ctx.request.json();
    if (!Array.isArray(items))
      return json({ detail: "Expected an array" }, 400);

    let inserted = 0;

    for (const it of items) {
      const { title, category, summary, content } = it ?? {};
      if (!title || !category || !summary || !content) continue;

      await db
        .prepare(
          "INSERT INTO documents (title, category, summary, content) VALUES (?, ?, ?, ?)"
        )
        .bind(title, category, summary, content)
        .run();

      inserted++;
    }

    return json({ inserted }, 200);
  }

  // ----------------------------
  // /documents/:id (GET/PUT/DELETE) ✅
  // ----------------------------
  const docIdMatch = path.match(/^\/documents\/(\d+)$/);
  if (docIdMatch) {
    const id = Number(docIdMatch[1]);

    if (method === "DELETE") {
      await db.prepare("DELETE FROM documents WHERE id = ?").bind(id).run();
      return json({ ok: true }, 200);
    }

    if (method === "GET") {
      const row = await db
        .prepare(
          "SELECT id, title, category, summary, content FROM documents WHERE id = ?"
        )
        .bind(id)
        .first();
      if (!row) return json({ detail: "Not found" }, 404);
      return json(row, 200);
    }

    if (method === "PUT") {
      const body = await ctx.request.json();
      const { title, category, summary, content } = body ?? {};

      await db
        .prepare(
          "UPDATE documents SET title=?, category=?, summary=?, content=? WHERE id=?"
        )
        .bind(title, category, summary, content, id)
        .run();

      return json({ id, title, category, summary, content }, 200);
    }
  }

  // Fallback
  return json({ detail: "Not found" }, 404);
};
