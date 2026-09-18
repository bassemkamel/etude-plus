import "@supabase/functions-js/edge-runtime.d.ts";
import { neon } from "@neondatabase/serverless";

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

function camel(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), v])
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const qualIdx = parts.indexOf("qualifications");
  const sub = qualIdx >= 0 ? parts.slice(qualIdx + 1) : parts;
  const method = req.method;

  // GET /qualifications/requests/mine
  if (method === "GET" && sub[0] === "requests" && sub[1] === "mine") {
    return json([], 200, req);
  }

  // GET /qualifications/requests/all
  if (method === "GET" && sub[0] === "requests" && sub[1] === "all") {
    return json([], 200, req);
  }

  // GET /qualifications/requests
  if (method === "GET" && sub[0] === "requests") {
    return json([], 200, req);
  }

  // GET /qualifications/mine
  if (method === "GET" && sub[0] === "mine") {
    try {
      const dbUrl = Deno.env.get("DATABASE_URL");
      if (!dbUrl) return json({ qualifications: [] }, 200, req);
      const sql = neon(dbUrl);
      const rows = await sql`
        SELECT * FROM qualifications ORDER BY created_at DESC LIMIT 100
      ` as Record<string, unknown>[];
      return json({ qualifications: rows.map(camel) }, 200, req);
    } catch {
      return json({ qualifications: [] }, 200, req);
    }
  }

  // POST /qualifications
  if (method === "POST") {
    return json({ id: null }, 201, req);
  }

  // GET /qualifications
  if (method === "GET") {
    try {
      const dbUrl = Deno.env.get("DATABASE_URL");
      if (!dbUrl) return json({ qualifications: [] }, 200, req);
      const sql = neon(dbUrl);
      const rows = await sql`
        SELECT * FROM qualifications ORDER BY created_at DESC LIMIT 100
      ` as Record<string, unknown>[];
      return json({ qualifications: rows.map(camel) }, 200, req);
    } catch {
      return json({ qualifications: [] }, 200, req);
    }
  }

  return json({ error: "Method not allowed" }, 405, req);
});
