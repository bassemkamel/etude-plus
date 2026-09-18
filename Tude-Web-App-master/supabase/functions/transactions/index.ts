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
  const txIdx = parts.indexOf("transactions");
  const sub = txIdx >= 0 ? parts.slice(txIdx + 1) : parts;
  const method = req.method;

  // GET /transactions/my
  if (method === "GET" && sub[0] === "my") {
    return json({ transactions: [] }, 200, req);
  }

  // GET /transactions/my-earnings
  if (method === "GET" && sub[0] === "my-earnings") {
    return json({ earnings: 0, transactions: [] }, 200, req);
  }

  // PATCH /transactions/:id/status
  if (method === "PATCH" && sub[1] === "status") {
    return json({ ok: true }, 200, req);
  }

  // GET /transactions
  if (method === "GET") {
    try {
      const dbUrl = Deno.env.get("DATABASE_URL");
      if (!dbUrl) return json({ transactions: [], total: 0 }, 200, req);
      const sql = neon(dbUrl);
      const rows = await sql`
        SELECT id, amount, status, created_at, platform_fee
        FROM transactions
        ORDER BY created_at DESC LIMIT 100
      ` as Record<string, unknown>[];
      return json({ transactions: rows.map(camel), total: rows.length }, 200, req);
    } catch {
      return json({ transactions: [], total: 0 }, 200, req);
    }
  }

  return json({ error: "Method not allowed" }, 405, req);
});
