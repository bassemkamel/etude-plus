const ALLOWED_ORIGINS = (
  Deno.env.get("ALLOWED_ORIGINS") ??
  Deno.env.get("ALLOWED_ORIGIN") ??
  "https://tude-web-app-etude-plus-xi.vercel.app"
).split(",").map((s) => s.trim()).filter(Boolean);

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };
}

function json(data: unknown, status = 200, req?: Request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...(req ? corsHeaders(req) : {}), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  // OPTIONS must always return 200 with CORS headers, even for 503 routes
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === "GET") {
    return json({ error: "File storage not migrated" }, 503, req);
  }

  if (req.method === "POST") {
    if (path.endsWith("/request-url")) {
      return json(
        { url: null, objectPath: null, error: "File upload not available" },
        503,
        req,
      );
    }

    if (path.endsWith("/direct")) {
      return json({ error: "File upload not available" }, 503, req);
    }

    // Default POST fallback
    return json({ error: "File upload not available" }, 503, req);
  }

  return json({ error: "File storage not migrated" }, 503, req);
});
