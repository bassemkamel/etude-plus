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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const kbIdx = parts.indexOf("kb");
  const sub = kbIdx >= 0 ? parts.slice(kbIdx + 1) : parts;
  const method = req.method;

  // GET /kb/files
  if (method === "GET" && sub[0] === "files") {
    return json({ files: [], total: 0 }, 200, req);
  }

  // POST /kb/check-duplicate
  if (method === "POST" && sub[0] === "check-duplicate") {
    return json({ isDuplicate: false }, 200, req);
  }

  // POST /kb/publish-all-ready
  if (method === "POST" && sub[0] === "publish-all-ready") {
    return json({ published: 0 }, 200, req);
  }

  // POST /kb/reprocess-all
  if (method === "POST" && sub[0] === "reprocess-all") {
    return json({ reprocessed: 0 }, 200, req);
  }

  // DELETE /kb/files/:id
  if (method === "DELETE" && sub[0] === "files" && sub[1]) {
    return json({ deleted: false }, 200, req);
  }

  // POST /kb/files
  if (method === "POST" && sub[0] === "files") {
    return json({ id: null, message: "KB upload not available" }, 201, req);
  }

  // Fallback POST
  if (method === "POST") {
    return json({ id: null, message: "KB upload not available" }, 201, req);
  }

  return json({ error: "Method not allowed" }, 405, req);
});
