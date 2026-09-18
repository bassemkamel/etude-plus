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

async function getStatsData(req: Request) {
  const dbUrl = Deno.env.get("DATABASE_URL");
  if (!dbUrl) {
    return { totalStudents: 0, totalProfessors: 0, totalClasses: 0, pendingProfessors: 0, totalUsers: 0, totalAdmins: 0 };
  }
  const sql = neon(dbUrl);

  let totalStudents = 0;
  let totalProfessors = 0;
  let totalAdmins = 0;
  let totalUsers = 0;
  let totalClasses = 0;
  let pendingProfessors = 0;

  try {
    const rows = await sql`
      SELECT role, COUNT(*) as count FROM users GROUP BY role
    ` as { role: string; count: string }[];
    for (const row of rows) {
      const count = parseInt(row.count, 10);
      totalUsers += count;
      if (row.role === "student") totalStudents = count;
      else if (row.role === "professor") totalProfessors = count;
      else if (row.role === "admin") totalAdmins = count;
    }
  } catch { /* users table unavailable */ }

  try {
    const rows = await sql`
      SELECT COUNT(*) as count FROM professors WHERE status = 'pending'
    ` as { count: string }[];
    pendingProfessors = parseInt(rows[0]?.count ?? "0", 10);
  } catch { /* professors table unavailable */ }

  try {
    const rows = await sql`
      SELECT COUNT(*) as count FROM classes
    ` as { count: string }[];
    totalClasses = parseInt(rows[0]?.count ?? "0", 10);
  } catch { /* classes table unavailable */ }

  return { totalStudents, totalProfessors, totalClasses, pendingProfessors, totalUsers, totalAdmins };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const statsIdx = parts.indexOf("stats");
  const sub = statsIdx >= 0 ? parts.slice(statsIdx + 1) : parts;
  const method = req.method;

  if (method !== "GET") return json({ error: "Method not allowed" }, 405, req);

  // GET /stats/professor/:id
  if (sub[0] === "professor" && sub[1]) {
    return json({ rating: 0, totalStudents: 0, totalReviews: 0, totalEarnings: 0 }, 200, req);
  }

  // GET /stats/overview or GET /stats
  try {
    const data = await getStatsData(req);
    return json(data, 200, req);
  } catch {
    return json({ totalStudents: 0, totalProfessors: 0, totalClasses: 0, pendingProfessors: 0, totalUsers: 0, totalAdmins: 0 }, 200, req);
  }
});
