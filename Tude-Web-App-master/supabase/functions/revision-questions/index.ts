// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { neon } from "@neondatabase/serverless";

// ── CORS ──────────────────────────────────────────────────────────────────────
// Restricted to the Vercel frontend. Set the ALLOWED_ORIGIN secret to your exact
// Vercel URL. For local dev, set it to "http://localhost:5173".
//   supabase secrets set ALLOWED_ORIGIN="https://your-app.vercel.app"
const ALLOWED_ORIGIN =
  Deno.env.get("ALLOWED_ORIGIN") ?? "https://tude-web-app-etude-plus-xi.vercel.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Shorthand that attaches CORS headers to every JSON response. */
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Convert snake_case DB column names → camelCase JavaScript keys.
 * This makes the response shape identical to what Drizzle ORM returned from
 * the old Express backend, so the frontend won't need any changes.
 * e.g. { grade_level: "bac", question_text: "…" } → { gradeLevel: "bac", questionText: "…" }
 */
function camel(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
      v,
    ]),
  );
}

// ── Auth ──────────────────────────────────────────────────────────────────────
// Mirrors verifyToken() + requireAuth() from backend/api-server/src/lib/auth.ts.
// The token format is: base64url( "userId:issuedAt:hmac_sha256_hex(secret, 'userId:issuedAt')" )

/** Constant-time string comparison — prevents timing attacks on the HMAC signature. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Returns { userId, issuedAt } if the token is valid and not expired, otherwise null. */
async function verifyToken(
  token: string,
  secret: string,
): Promise<{ userId: number; issuedAt: number } | null> {
  try {
    // Step 1: base64url → UTF-8 string (equivalent to Buffer.from(token, "base64url") in Node.js)
    const padded = token.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)),
    );

    // Step 2: split on the last colon → payload = "userId:issuedAt", sig = hex HMAC
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon < 0) return null;
    const payload = decoded.slice(0, lastColon);
    const sig = decoded.slice(lastColon + 1);

    // Step 3: recompute HMAC-SHA256 using Web Crypto API (Deno's built-in, replaces Node crypto)
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

    // Step 4: parse userId and issuedAt from payload
    const colonIdx = payload.indexOf(":");
    if (colonIdx < 0) return null;
    const userId = parseInt(payload.slice(0, colonIdx), 10);
    const issuedAt = parseInt(payload.slice(colonIdx + 1), 10);
    if (isNaN(userId) || userId <= 0) return null;
    if (isNaN(issuedAt) || issuedAt <= 0) return null;

    // Step 5: reject tokens older than 30 days (same as TOKEN_MAX_AGE_MS in auth.ts)
    if (Date.now() - issuedAt > 30 * 24 * 60 * 60 * 1000) return null;

    return { userId, issuedAt };
  } catch {
    return null;
  }
}

type SqlClient = ReturnType<typeof neon>;

/**
 * Verifies the request token and returns the matching user row from Neon.
 * Returns a 401 Response if anything fails, or the user object on success.
 * Reads the token from the Authorization: Bearer header first, then the
 * "etude_session" cookie — matching the priority order in the Express middleware.
 */
async function getAuthUser(
  req: Request,
  sql: SqlClient,
): Promise<Record<string, unknown> | Response> {
  // Bearer header wins (same logic as the Express requireAuth middleware)
  const rawHeader = req.headers.get("Authorization");
  const headerToken = rawHeader?.startsWith("Bearer ")
    ? rawHeader.slice(7).trim()
    : null;

  // Cookie fallback — cookie name "etude_session" is defined in auth.ts line 54
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
  // 1. Handle CORS preflight (browsers send this before every cross-origin request)
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  // 2. Connect to Neon using the serverless HTTP driver (no TCP pool needed)
  const dbUrl = Deno.env.get("DATABASE_URL");
  if (!dbUrl) return json({ error: "DATABASE_URL not configured" }, 500);
  const sql = neon(dbUrl);

  // 3. Authenticate — rejects unauthenticated callers with 401
  const authResult = await getAuthUser(req, sql);
  if (authResult instanceof Response) return authResult;

  // 4. Parse query parameters (mirrors the Express handler exactly)
  const url = new URL(req.url);
  const subject = url.searchParams.get("subject");
  const gradeLevel = url.searchParams.get("gradeLevel");
  // Optional filters — null means "no filter" in the SQL query below
  const sectionKey = url.searchParams.get("sectionKey") ?? null;
  const topic = url.searchParams.get("topic") ?? null;
  const difficulty = url.searchParams.get("difficulty") ?? null;
  const type = url.searchParams.get("type") ?? null;
  const limitParam = parseInt(url.searchParams.get("limit") ?? "20", 10);
  const limit = Math.min(isNaN(limitParam) ? 20 : limitParam, 100);

  if (!subject || !gradeLevel) {
    return json({ error: "subject and gradeLevel are required" }, 400);
  }

  // 5. Fetch matching published questions.
  //    Optional filters use a NULL-check pattern: when the param is null the condition
  //    is skipped (evaluates to true), so no extra branches are needed.
  //    Each ${variable} becomes a safe parameterised placeholder — never string-interpolated.
  const questionRows = await sql`
    SELECT *
    FROM   questions
    WHERE  status      = 'published'
      AND  subject     = ${subject}
      AND  grade_level = ${gradeLevel}
      AND  (${sectionKey}::text IS NULL OR section_key = ${sectionKey})
      AND  (${topic}::text      IS NULL OR topic       = ${topic})
      AND  (${difficulty}::text IS NULL OR difficulty  = ${difficulty})
      AND  (${type}::text       IS NULL OR type        = ${type})
    LIMIT  ${limit}
  `;

  if (questionRows.length === 0) return json([]);

  // 6. Fetch question_parts and mark_schemes for all returned questions in parallel.
  //    ANY(array::int[]) is the SQL equivalent of Drizzle's inArray().
  const questionIds = questionRows.map((q: Record<string, unknown>) => q.id as number);

  const [partRows, schemeRows] = await Promise.all([
    sql`
      SELECT * FROM question_parts
      WHERE  question_id = ANY(${questionIds}::int[])
      ORDER  BY order_index
    `,
    sql`
      SELECT * FROM mark_schemes
      WHERE  question_id = ANY(${questionIds}::int[])
      ORDER  BY order_index
    `,
  ]);

  // 7. Map all rows to camelCase, then join parts and markScheme onto each question.
  //    The resulting shape is identical to what the Express/Drizzle backend returned.
  const questions = questionRows.map(camel);
  const parts = partRows.map(camel);
  const schemes = schemeRows.map(camel);

  const enriched = questions.map((q) => ({
    ...q,
    parts: parts.filter((p) => p.questionId === q.id),
    markScheme: schemes.filter((s) => s.questionId === q.id),
  }));

  return json(enriched);
});
