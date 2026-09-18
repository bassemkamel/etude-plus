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
): Promise<{ userId: number; issuedAt: number } | null> {
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
    return { userId, issuedAt };
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
 * GET /curriculum/chapters
 * Params: levelCode, sectionKey (optional), subject
 *
 * sectionKey matching:
 *   provided → chapters with NULL or matching sectionKey (questions same logic)
 *   omitted  → chapters with NULL sectionKey only (questions: no filter — all sections)
 */
async function handleChapters(
  req: Request,
  sql: SqlClient,
  secret: string,
): Promise<Response> {
  const auth = await requireAuth(req, sql, secret);
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const levelCode = url.searchParams.get("levelCode");
  const subject = url.searchParams.get("subject");
  const sectionKey = url.searchParams.get("sectionKey") ?? null;

  if (!levelCode || !subject) {
    return json({ error: "levelCode and subject are required" }, 400);
  }

  // Curriculum chapters (may not exist yet — synthetic fallback if table empty)
  let chapRows: Record<string, unknown>[] = [];
  try {
    // sectionKey matching:
    //   If provided → (section_key IS NULL OR section_key = $sectionKey)
    //   If absent   → section_key IS NULL
    // Using the NULL-check pattern so both cases work in one query:
    //   ($sk IS NULL AND chapter.section_key IS NULL)
    //   OR ($sk IS NOT NULL AND (chapter.section_key IS NULL OR chapter.section_key = $sk))
    chapRows = await sql`
      SELECT *
      FROM   curriculum_chapters
      WHERE  level_code = ${levelCode}
        AND  subject    = ${subject}
        AND  is_active  = true
        AND  (
          (${sectionKey}::text IS NULL     AND section_key IS NULL)
          OR
          (${sectionKey}::text IS NOT NULL AND (section_key IS NULL OR section_key = ${sectionKey}))
        )
      ORDER BY order_index
    ` as Record<string, unknown>[];
  } catch {
    chapRows = [];
  }

  // Question counts — always needed (used for both paths)
  // If sectionKey provided: (q.section_key IS NULL OR q.section_key = $sk)
  // If omitted: no sectionKey filter
  const qCounts = await sql`
    SELECT topic, CAST(COUNT(*) AS int) AS question_count
    FROM   questions
    WHERE  status      = 'published'
      AND  grade_level = ${levelCode}
      AND  subject     = ${subject}
      AND  (${sectionKey}::text IS NULL OR section_key IS NULL OR section_key = ${sectionKey})
    GROUP  BY topic
  ` as { topic: string; question_count: number }[];

  // Synthetic fallback when no curriculum rows exist
  if (chapRows.length === 0) {
    if (qCounts.length === 0) return json([]);

    const synthetic = qCounts.map((r, i) => ({
      id: -(i + 1),
      levelCode,
      sectionKey: sectionKey ?? null,
      subject,
      name: r.topic,
      shortName: null,
      slug: r.topic.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      orderIndex: i,
      isActive: true,
      createdAt: new Date().toISOString(),
      questionCount: r.question_count,
      flashcardCount: 0,
    }));
    return json(synthetic);
  }

  // Flashcard counts — only when real chapters exist
  const fcCounts = await sql`
    SELECT topic, CAST(COUNT(*) AS int) AS flashcard_count
    FROM   flashcards
    WHERE  status      = 'live'
      AND  grade_level = ${levelCode}
      AND  subject     = ${subject}
      AND  (
        (${sectionKey}::text IS NULL     AND section_key IS NULL)
        OR
        (${sectionKey}::text IS NOT NULL AND (section_key IS NULL OR section_key = ${sectionKey}))
      )
    GROUP  BY topic
  ` as { topic: string; flashcard_count: number }[];

  const qMap = new Map(qCounts.map((r) => [r.topic, r.question_count]));
  const fcMap = new Map(fcCounts.map((r) => [r.topic, r.flashcard_count]));

  const enriched = chapRows.map((ch) => {
    const c = camel(ch);
    return {
      ...c,
      questionCount: qMap.get(c.name as string) ?? 0,
      flashcardCount: fcMap.get(c.name as string) ?? 0,
    };
  });

  return json(enriched);
}

/**
 * GET /curriculum/subjects
 * Params: levelCode, sectionKey (optional)
 * Returns subject metadata for subjects that have active chapters for this level.
 */
async function handleSubjects(
  req: Request,
  sql: SqlClient,
  secret: string,
): Promise<Response> {
  const auth = await requireAuth(req, sql, secret);
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const levelCode = url.searchParams.get("levelCode");
  const sectionKey = url.searchParams.get("sectionKey") ?? null;

  if (!levelCode) return json({ error: "levelCode is required" }, 400);

  // Find distinct subjects with active chapters for this level/section
  const subjects = await sql`
    SELECT DISTINCT subject
    FROM   curriculum_chapters
    WHERE  level_code = ${levelCode}
      AND  is_active  = true
      AND  (
        (${sectionKey}::text IS NULL     AND section_key IS NULL)
        OR
        (${sectionKey}::text IS NOT NULL AND (section_key IS NULL OR section_key = ${sectionKey}))
      )
  ` as { subject: string }[];

  const subjectNames = subjects.map((r) => r.subject);

  if (subjectNames.length === 0) return json([]);

  // Fetch metadata from curriculum_subjects ordered by order_index
  const meta = await sql`
    SELECT * FROM curriculum_subjects ORDER BY order_index
  ` as Record<string, unknown>[];

  const result = meta
    .filter((s) => subjectNames.includes(s.name as string))
    .map(camel);

  return json(result);
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

  const pathname = new URL(req.url).pathname;
  const route = pathname.split("/").filter(Boolean).pop();

  try {
    switch (route) {
      case "chapters":
        return await handleChapters(req, sql, secret);

      case "subjects":
        return await handleSubjects(req, sql, secret);

      default:
        return json({ error: "Not found" }, 404);
    }
  } catch (err) {
    console.error(`[curriculum] unhandled error on ${route}:`, err);
    return json({ error: "Internal server error" }, 500);
  }
});
