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
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === "GET") {
    return json({ codes: [] }, 200, req);
  }

  if (req.method === "POST") {
    if (path.endsWith("/validate")) {
      return json(
        { valid: false, message: "Discount codes not available" },
        200,
        req,
      );
    }

    // Default POST fallback
    return json(
      { valid: false, message: "Discount codes not available" },
      200,
      req,
    );
  }

  return json({ codes: [] }, 200, req);
});
