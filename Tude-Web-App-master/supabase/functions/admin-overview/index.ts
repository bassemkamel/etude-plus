// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { neon } from "@neondatabase/serverless";

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGIN =
  Deno.env.get("ALLOWED_ORIGIN") ?? "https://tude-web-app-etude-plus-xi.vercel.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Credentials": "true",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Auth ──────────────────────────────────────────────────────────────────────

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function verifyToken(
  token: string,
  secret: string,
): Promise<{ userId: number; issuedAt: number } | null> {
  try {
    const padded = token.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)),
    );
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon < 0) return null;
    const payload = decoded.slice(0, lastColon);
    const sig = decoded.slice(lastColon + 1);
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sigBytes = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
    const expectedSig = Array.from(new Uint8Array(sigBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (!timingSafeEqual(sig, expectedSig)) return null;
    const colonIdx = payload.indexOf(":");
    if (colonIdx < 0) return null;
    const userId = parseInt(payload.slice(0, colonIdx), 10);
    const issuedAt = parseInt(payload.slice(colonIdx + 1), 10);
    if (isNaN(userId) || userId <= 0) return null;
    if (isNaN(issuedAt) || issuedAt <= 0) return null;
    if (Date.now() - issuedAt > 30 * 24 * 60 * 60 * 1000) return null;
    return { userId, issuedAt };
  } catch {
    return null;
  }
}

type SqlClient = ReturnType<typeof neon>;

async function getAuthUser(
  req: Request,
  sql: SqlClient,
): Promise<Record<string, unknown> | Response> {
  const rawHeader = req.headers.get("Authorization");
  const headerToken = rawHeader?.startsWith("Bearer ")
    ? rawHeader.slice(7).trim()
    : null;
  const cookieToken =
    req.headers
      .get("Cookie")
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("etude_session="))
      ?.slice("etude_session=".length) ?? null;
  const token = headerToken ?? cookieToken;
  if (!token) return json({ error: "Unauthorized" }, 401);
  const secret = Deno.env.get("TOKEN_SECRET");
  if (!secret) return json({ error: "Server misconfigured: TOKEN_SECRET missing" }, 500);
  const parsed = await verifyToken(token, secret);
  if (!parsed) return json({ error: "Invalid or expired token" }, 401);
  const rows = await sql`SELECT * FROM users WHERE id = ${parsed.userId} LIMIT 1`;
  if (rows.length === 0) return json({ error: "User not found" }, 401);
  return rows[0] as Record<string, unknown>;
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const dbUrl = Deno.env.get("DATABASE_URL");
  if (!dbUrl) return json({ error: "DATABASE_URL not configured" }, 500);
  const sql = neon(dbUrl);

  const authResult = await getAuthUser(req, sql);
  if (authResult instanceof Response) return authResult;
  const user = authResult;

  const role = user.role as string;
  if (role !== "admin" && role !== "super_admin") {
    return json({ error: "Forbidden: admin role required" }, 403);
  }

  // ── Core user counts (always available) ────────────────────────────────────
  const userCounts = await sql`
    SELECT
      COUNT(*)                                                  AS total_users,
      COUNT(*) FILTER (WHERE role = 'student')                  AS total_students,
      COUNT(*) FILTER (WHERE role = 'professor')                AS total_professors,
      COUNT(*) FILTER (WHERE role IN ('admin', 'super_admin'))  AS total_admins
    FROM users
  `;

  const uc = userCounts[0];

  // ── Questions count ─────────────────────────────────────────────────────────
  let totalQuestions = 0;
  try {
    const qRows = await sql`SELECT COUNT(*) AS cnt FROM questions`;
    totalQuestions = Number(qRows[0].cnt);
  } catch { /* questions table missing */ }

  // ── Professors pending KYC (graceful — table may not exist in this DB) ──────
  let pendingProfessors = 0;
  try {
    const pRows = await sql`
      SELECT COUNT(*) AS cnt FROM professors
      WHERE status IN ('pending', 'kyc_submitted')
    `;
    pendingProfessors = Number(pRows[0].cnt);
  } catch { /* professors table not in this DB */ }

  // ── Classes / courses (graceful) ─────────────────────────────────────────────
  let totalClasses = 0;
  try {
    const cRows = await sql`SELECT COUNT(*) AS cnt FROM classes WHERE is_published = true`;
    totalClasses = Number(cRows[0].cnt);
  } catch { /* classes table not in this DB */ }

  // ── Transactions (graceful) ───────────────────────────────────────────────────
  let totalTransactions = 0;
  let revenue = 0;
  try {
    const txRows = await sql`
      SELECT
        COUNT(*)                                                AS cnt,
        COALESCE(SUM(platform_fee), 0)                         AS revenue
      FROM transactions
      WHERE status = 'completed'
    `;
    totalTransactions = Number(txRows[0].cnt);
    revenue = Number(txRows[0].revenue);
  } catch { /* transactions table not in this DB */ }

  return json({
    totalUsers:        Number(uc.total_users),
    totalStudents:     Number(uc.total_students),
    totalProfessors:   Number(uc.total_professors),
    totalAdmins:       Number(uc.total_admins),
    totalQuestions,
    pendingProfessors,
    totalClasses,
    totalTransactions,
    revenue,
  });
});
