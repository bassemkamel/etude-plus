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

type SqlClient = ReturnType<typeof neon>;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function camel(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
      v,
    ]),
  );
}

// ── Auth ──────────────────────────────────────────────────────────────────────

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyToken(
  token: string,
  secret: string,
): Promise<{ userId: number } | null> {
  try {
    const padded = token.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(padded);
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
    return { userId };
  } catch {
    return null;
  }
}

const SESSION_COOKIE = "etude_session";

async function requireAuth(
  req: Request,
  sql: SqlClient,
  secret: string,
): Promise<{ userId: number } | Response> {
  const rawHeader = req.headers.get("Authorization");
  const headerToken = rawHeader?.startsWith("Bearer ")
    ? rawHeader.slice(7).trim()
    : null;
  const cookieToken =
    req.headers
      .get("Cookie")
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
      ?.slice(SESSION_COOKIE.length + 1) ?? null;

  const token = headerToken ?? cookieToken;
  if (!token) return json({ error: "Unauthorized" }, 401);

  const parsed = await verifyToken(token, secret);
  if (!parsed) return json({ error: "Invalid or expired token" }, 401);

  const rows = await sql`SELECT id FROM users WHERE id = ${parsed.userId} LIMIT 1`;
  if (rows.length === 0) return json({ error: "User not found" }, 401);

  return { userId: parsed.userId };
}

// ── Route handlers ────────────────────────────────────────────────────────────

/**
 * GET /revision/content/flashcards
 * Params: subject, gradeLevel, sectionKey?, topic?
 */
async function handleFlashcards(
  req: Request,
  sql: SqlClient,
  secret: string,
): Promise<Response> {
  const auth = await requireAuth(req, sql, secret);
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const subject = url.searchParams.get("subject");
  const gradeLevel = url.searchParams.get("gradeLevel");
  const sectionKey = url.searchParams.get("sectionKey") ?? null;
  const topic = url.searchParams.get("topic") ?? null;

  if (!subject || !gradeLevel) {
    return json({ error: "subject and gradeLevel are required" }, 400);
  }

  const rows = await sql`
    SELECT *
    FROM   flashcards
    WHERE  status      = 'live'
      AND  subject     = ${subject}
      AND  grade_level = ${gradeLevel}
      AND  (${sectionKey}::text IS NULL OR section_key = ${sectionKey})
      AND  (${topic}::text      IS NULL OR topic       = ${topic})
  ` as Record<string, unknown>[];

  return json(rows.map(camel));
}

/**
 * GET /revision/content/notions
 * Params: subject, gradeLevel, sectionKey?
 */
async function handleNotions(
  req: Request,
  sql: SqlClient,
  secret: string,
): Promise<Response> {
  const auth = await requireAuth(req, sql, secret);
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const subject = url.searchParams.get("subject");
  const gradeLevel = url.searchParams.get("gradeLevel");
  const sectionKey = url.searchParams.get("sectionKey") ?? null;

  if (!subject || !gradeLevel) {
    return json({ error: "subject and gradeLevel are required" }, 400);
  }

  const rows = await sql`
    SELECT *
    FROM   notions
    WHERE  status      = 'live'
      AND  subject     = ${subject}
      AND  grade_level = ${gradeLevel}
      AND  (${sectionKey}::text IS NULL OR section_key = ${sectionKey})
  ` as Record<string, unknown>[];

  return json(rows.map(camel));
}

/**
 * GET /revision/content/annales
 * Params: subject, gradeLevel, sectionKey?
 * Ordered by year DESC (most recent first).
 */
async function handleAnnales(
  req: Request,
  sql: SqlClient,
  secret: string,
): Promise<Response> {
  const auth = await requireAuth(req, sql, secret);
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const subject = url.searchParams.get("subject");
  const gradeLevel = url.searchParams.get("gradeLevel");
  const sectionKey = url.searchParams.get("sectionKey") ?? null;

  if (!subject || !gradeLevel) {
    return json({ error: "subject and gradeLevel are required" }, 400);
  }

  const rows = await sql`
    SELECT *
    FROM   annales
    WHERE  status      = 'live'
      AND  subject     = ${subject}
      AND  grade_level = ${gradeLevel}
      AND  (${sectionKey}::text IS NULL OR section_key = ${sectionKey})
    ORDER  BY year DESC
  ` as Record<string, unknown>[];

  return json(rows.map(camel));
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const dbUrl = Deno.env.get("DATABASE_URL");
  if (!dbUrl) return json({ error: "Server misconfigured" }, 500);
  const secret = Deno.env.get("TOKEN_SECRET");
  if (!secret) return json({ error: "Server misconfigured" }, 500);

  const sql = neon(dbUrl);

  // URL path: .../revision/content/<resource>
  // Extract "content/<resource>" by finding the "content" segment.
  const pathname = new URL(req.url).pathname;
  const parts = pathname.split("/").filter(Boolean);
  const contentIdx = parts.findIndex((p) => p === "content");
  const resource = contentIdx >= 0 ? parts[contentIdx + 1] : null;

  try {
    switch (resource) {
      case "flashcards":
        return await handleFlashcards(req, sql, secret);

      case "notions":
        return await handleNotions(req, sql, secret);

      case "annales":
        return await handleAnnales(req, sql, secret);

      default:
        return json({ error: "Not found" }, 404);
    }
  } catch (err) {
    console.error(`[revision] unhandled error on ${resource}:`, err);
    return json({ error: "Internal server error" }, 500);
  }
});
