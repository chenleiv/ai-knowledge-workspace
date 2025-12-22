export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    const target =
      "https://ai-knowledge-workspace.onrender.com" +
      url.pathname.replace("/api", "");

    const req = new Request(target, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: "manual",
    });

    return fetch(req);
  },
};
