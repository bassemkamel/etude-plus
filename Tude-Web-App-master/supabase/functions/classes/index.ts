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
  const classesIdx = parts.indexOf("classes");
  const sub = classesIdx >= 0 ? parts.slice(classesIdx + 1) : parts;
  const method = req.method;

  // GET /classes/my-classes
  if (method === "GET" && sub[0] === "my-classes") {
    return json({ classes: [] }, 200, req);
  }

  // GET /classes/my-sessions
  if (method === "GET" && sub[0] === "my-sessions") {
    return json({ sessions: [] }, 200, req);
  }

  // PUT /classes/:id
  if (method === "PUT" && sub[0] && !isNaN(parseInt(sub[0]))) {
    return json({ message: "Not available" }, 200, req);
  }

  // POST /classes
  if (method === "POST") {
    return json({ id: null, message: "Class creation not available" }, 201, req);
  }

  // GET /classes
  if (method === "GET") {
    try {
      const dbUrl = Deno.env.get("DATABASE_URL");
      if (!dbUrl) return json({ classes: [] }, 200, req);
      const sql = neon(dbUrl);

      const professorIdParam = url.searchParams.get("professorId");
      const isPublishedParam = url.searchParams.get("isPublished");

      let rows: Record<string, unknown>[];

      if (professorIdParam && isPublishedParam === "true") {
        const profId = parseInt(professorIdParam);
        rows = await sql`
          SELECT id, title, subject, grade_level, price, is_published, created_at
          FROM classes
          WHERE professor_id = ${profId} AND is_published = true
          ORDER BY created_at DESC LIMIT 100
        ` as Record<string, unknown>[];
      } else if (professorIdParam) {
        const profId = parseInt(professorIdParam);
        rows = await sql`
          SELECT id, title, subject, grade_level, price, is_published, created_at
          FROM classes
          WHERE professor_id = ${profId}
          ORDER BY created_at DESC LIMIT 100
        ` as Record<string, unknown>[];
      } else if (isPublishedParam === "true") {
        rows = await sql`
          SELECT id, title, subject, grade_level, price, is_published, created_at
          FROM classes
          WHERE is_published = true
          ORDER BY created_at DESC LIMIT 100
        ` as Record<string, unknown>[];
      } else {
        rows = await sql`
          SELECT id, title, subject, grade_level, price, is_published, created_at
          FROM classes
          ORDER BY created_at DESC LIMIT 100
        ` as Record<string, unknown>[];
      }

      return json({ classes: rows.map(camel) }, 200, req);
    } catch {
      return json({ classes: [] }, 200, req);
    }
  }

  return json({ error: "Method not allowed" }, 405, req);
});
