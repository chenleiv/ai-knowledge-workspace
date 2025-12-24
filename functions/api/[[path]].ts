export const onRequest = async (ctx: any) => {
  const { request } = ctx;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  const url = new URL(request.url);

  const target = `https://ai-knowledge-workspace.onrender.com${url.pathname}`;

  const res = await fetch(target, {
    method: request.method, // ⬅️ קריטי
    headers: request.headers,
    body: request.method !== "GET" ? await request.text() : undefined,
  });

  return new Response(res.body, res);
};
