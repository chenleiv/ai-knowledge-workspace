export async function onRequest(ctx: any) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const path = url.pathname.replace("/api/", "");

  // LOGIN
  if (path === "auth/login" && request.method === "POST") {
    return new Response(
      JSON.stringify({
        user: { email: "admin@demo.com", role: "admin" },
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie":
            "access_token=dummy; HttpOnly; Path=/; SameSite=None; Secure",
        },
      }
    );
  }

  // ME
  if (path === "auth/me") {
    return new Response(
      JSON.stringify({ email: "admin@demo.com", role: "admin" }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // DOCUMENTS
  if (path === "documents") {
    const rows = await env.ai_workspace
      .prepare("SELECT * FROM documents")
      .all();

    return new Response(JSON.stringify(rows.results), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Not Found", { status: 404 });
}
