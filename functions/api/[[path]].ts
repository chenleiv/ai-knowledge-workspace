export async function onRequest(ctx: any) {
  const { request, env } = ctx;

  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, ""); // "/documents", "/auth/login" וכו'

  // רק /documents כדי לוודא ש-D1 עובד
  if (path === "/documents" && request.method === "GET") {
    const { results } = await env.ai_workspace
      .prepare(
        `SELECT id, title, category, summary, content
         FROM documents
         ORDER BY id DESC
         LIMIT 100`
      )
      .all();

    return new Response(JSON.stringify(results ?? []), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Not Found", { status: 404 });
}
