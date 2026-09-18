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

function stripPassword(row: Record<string, unknown>) {
  const { password_hash, passwordHash, ...rest } = row as Record<string, unknown> & { password_hash?: unknown; passwordHash?: unknown };
  void password_hash; void passwordHash;
  return rest;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const usersIdx = parts.indexOf("users");
  const sub = usersIdx >= 0 ? parts.slice(usersIdx + 1) : parts;
  const method = req.method;
  const id = sub[0] && !isNaN(parseInt(sub[0])) ? parseInt(sub[0]) : null;

  // GET /users/:id
  if (method === "GET" && id !== null) {
    try {
      const dbUrl = Deno.env.get("DATABASE_URL");
      if (!dbUrl) return json({ error: "Not found" }, 404, req);
      const sql = neon(dbUrl);
      const rows = await sql`
        SELECT id, email, full_name, role, is_suspended, created_at, phone, city
        FROM users WHERE id = ${id} LIMIT 1
      ` as Record<string, unknown>[];
      if (rows.length === 0) return json({ error: "Not found" }, 404, req);
      return json(camel(stripPassword(rows[0])), 200, req);
    } catch {
      return json({ error: "Not found" }, 404, req);
    }
  }

  // PUT /users/:id
  if (method === "PUT" && id !== null) {
    try {
      const dbUrl = Deno.env.get("DATABASE_URL");
      if (!dbUrl) return json({ error: "Update failed" }, 500, req);
      const sql = neon(dbUrl);
      const body = await req.json() as Record<string, unknown>;
      const { full_name, fullName, phone, city, is_suspended, isSuspended, role, gradeLevel, educationSection } = body as {
        full_name?: string; fullName?: string; phone?: string; city?: string;
        is_suspended?: boolean; isSuspended?: boolean; role?: string;
        gradeLevel?: string | null; educationSection?: string | null;
      };
      const name = full_name ?? fullName;
      const suspended = is_suspended ?? isSuspended;
      await sql`
        UPDATE users SET
          full_name    = COALESCE(${name ?? null}, full_name),
          phone        = COALESCE(${phone ?? null}, phone),
          city         = COALESCE(${city ?? null}, city),
          is_suspended = COALESCE(${suspended ?? null}, is_suspended),
          role         = COALESCE(${role ?? null}, role)
        WHERE id = ${id}
      `;

      // Also update student_profiles when grade level is provided
      if (gradeLevel !== undefined || educationSection !== undefined) {
        try {
          const sp = await sql`SELECT id FROM student_profiles WHERE user_id = ${id} LIMIT 1`;
          if (sp.length > 0) {
            await sql`
              UPDATE student_profiles SET
                grade_level       = COALESCE(${gradeLevel ?? null}, grade_level),
                education_section = COALESCE(${educationSection ?? null}, education_section)
              WHERE user_id = ${id}
            `;
          } else {
            await sql`
              INSERT INTO student_profiles (user_id, grade_level, education_section, preferred_subjects, created_at)
              VALUES (${id}, ${gradeLevel ?? null}, ${educationSection ?? null}, '{}', NOW())
            `;
          }
        } catch { /* student_profiles table may not exist — non-fatal */ }
      }

      const rows = await sql`
        SELECT id, email, full_name, role, is_suspended, created_at, phone, city
        FROM users WHERE id = ${id} LIMIT 1
      ` as Record<string, unknown>[];
      if (rows.length === 0) return json({ error: "Not found" }, 404, req);
      return json(camel(rows[0]), 200, req);
    } catch {
      return json({ error: "Update failed" }, 500, req);
    }
  }

  // GET /users
  if (method === "GET") {
    try {
      const dbUrl = Deno.env.get("DATABASE_URL");
      if (!dbUrl) return json({ users: [] }, 200, req);
      const sql = neon(dbUrl);
      const rows = await sql`
        SELECT id, email, full_name, role, is_suspended, created_at, phone, city
        FROM users ORDER BY created_at DESC LIMIT 100
      ` as Record<string, unknown>[];
      return json({ users: rows.map(camel) }, 200, req);
    } catch {
      return json({ users: [] }, 200, req);
    }
  }

  return json({ error: "Method not allowed" }, 405, req);
});
