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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

// ── Auth ──────────────────────────────────────────────────────────────────────

type SqlClient = ReturnType<typeof neon>;

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
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)),
    );
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon < 0) return null;
    const payload = decoded.slice(0, lastColon);
    const sig = decoded.slice(lastColon + 1);
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const sigBytes = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
    const expected = Array.from(new Uint8Array(sigBytes))
      .map((b) => b.toString(16).padStart(2, "0")).join("");
    if (!timingSafeEqual(sig, expected)) return null;
    const colonIdx = payload.indexOf(":");
    if (colonIdx < 0) return null;
    const userId = parseInt(payload.slice(0, colonIdx), 10);
    const issuedAt = parseInt(payload.slice(colonIdx + 1), 10);
    if (isNaN(userId) || userId <= 0 || isNaN(issuedAt) || issuedAt <= 0) return null;
    if (Date.now() - issuedAt > 30 * 24 * 60 * 60 * 1000) return null;
    return { userId };
  } catch { return null; }
}

const SESSION_COOKIE = "etude_session";

async function requireAuth(
  req: Request,
  sql: SqlClient,
  secret: string,
): Promise<{ userId: number } | Response> {
  const rawHeader = req.headers.get("Authorization");
  const headerToken = rawHeader?.startsWith("Bearer ") ? rawHeader.slice(7).trim() : null;
  const cookieToken =
    req.headers.get("Cookie")?.split(";").map((c) => c.trim())
      .find((c) => c.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1) ?? null;
  const token = headerToken ?? cookieToken;
  if (!token) return json({ error: "Unauthorized" }, 401);
  const parsed = await verifyToken(token, secret);
  if (!parsed) return json({ error: "Invalid or expired token" }, 401);
  const rows = await sql`SELECT id FROM users WHERE id = ${parsed.userId} LIMIT 1`;
  if (rows.length === 0) return json({ error: "User not found" }, 401);
  return { userId: parsed.userId };
}

// ── Table bootstrap ───────────────────────────────────────────────────────────

async function ensureTable(sql: SqlClient): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS revision_attempts (
        id              SERIAL PRIMARY KEY,
        user_id         INTEGER NOT NULL,
        type            TEXT DEFAULT 'practice',
        subject         TEXT,
        grade_level     TEXT,
        section_key     TEXT,
        topic           TEXT,
        total_marks     INTEGER,
        marks_awarded   INTEGER,
        questions_count INTEGER,
        correct_count   INTEGER,
        grade_out_of_20 NUMERIC(4,1),
        created_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `;
  } catch { /* already exists or insufficient privileges — ignore */ }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  const dbUrl = Deno.env.get("DATABASE_URL");
  if (!dbUrl) return json({ error: "SERVER_ERROR" }, 500, req);
  const secret = Deno.env.get("TOKEN_SECRET");
  if (!secret) return json({ error: "SERVER_ERROR" }, 500, req);

  const sql = neon(dbUrl);

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const progIdx = parts.indexOf("progress");
  const sub = progIdx >= 0 ? parts.slice(progIdx + 1) : parts;
  const method = req.method;

  // ── POST /progress/attempts — save session result ─────────────────────────
  if (method === "POST" && sub[0] === "attempts") {
    const auth = await requireAuth(req, sql, secret);
    if (auth instanceof Response) return auth;

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400, req); }

    const { type, subject, gradeLevel, sectionKey, topic, totalMarks, marksAwarded, questionsCount, correctCount } = body;

    const grade =
      typeof totalMarks === "number" && totalMarks > 0 && typeof marksAwarded === "number"
        ? Math.round(((marksAwarded as number) / (totalMarks as number)) * 20 * 10) / 10
        : null;

    await ensureTable(sql);

    try {
      const inserted = await sql`
        INSERT INTO revision_attempts (
          user_id, type, subject, grade_level, section_key, topic,
          total_marks, marks_awarded, questions_count, correct_count, grade_out_of_20
        ) VALUES (
          ${auth.userId},
          ${(type as string | null) ?? "practice"},
          ${(subject as string | null) ?? null},
          ${(gradeLevel as string | null) ?? null},
          ${(sectionKey as string | null) ?? null},
          ${(topic as string | null) ?? null},
          ${typeof totalMarks === "number" ? (totalMarks as number) : null},
          ${typeof marksAwarded === "number" ? (marksAwarded as number) : null},
          ${typeof questionsCount === "number" ? (questionsCount as number) : null},
          ${typeof correctCount === "number" ? (correctCount as number) : null},
          ${grade}
        )
        RETURNING id, grade_out_of_20
      `;
      const row = inserted[0] as Record<string, unknown>;
      return json({
        id: row.id,
        gradeOutOf20: row.grade_out_of_20 !== null ? Number(row.grade_out_of_20) : null,
        saved: true,
      }, 201, req);
    } catch {
      // Table write failed — still return grade so the toast works
      return json({ gradeOutOf20: grade, saved: false }, 200, req);
    }
  }

  // All remaining routes are GET — require auth
  const auth = await requireAuth(req, sql, secret);
  if (auth instanceof Response) return auth;

  if (method !== "GET") return json({ error: "Method not allowed" }, 405, req);

  await ensureTable(sql);

  // ── GET /progress/overview ────────────────────────────────────────────────
  if (sub[0] === "overview") {
    try {
      const totals = await sql`
        SELECT
          COALESCE(SUM(questions_count), 0)::int AS total_questions,
          COALESCE(SUM(correct_count), 0)::int   AS correct_answers,
          ROUND(AVG(grade_out_of_20)::numeric, 1) AS avg_grade
        FROM revision_attempts
        WHERE user_id = ${auth.userId}
      `;
      const subjectRows = await sql`
        SELECT subject,
               COUNT(*)::int AS attempts,
               ROUND(AVG(grade_out_of_20)::numeric, 1) AS avg_grade
        FROM   revision_attempts
        WHERE  user_id = ${auth.userId} AND subject IS NOT NULL
        GROUP  BY subject
        ORDER  BY attempts DESC
        LIMIT  10
      `;
      const t = totals[0] as Record<string, unknown>;
      return json({
        totalQuestions:   Number(t.total_questions ?? 0),
        correctAnswers:   Number(t.correct_answers ?? 0),
        streak:           0,
        avgGrade:         t.avg_grade !== null ? Number(t.avg_grade) : null,
        subjectBreakdown: subjectRows.map((r) => ({
          subject:  r.subject,
          attempts: Number(r.attempts),
          avgGrade: r.avg_grade !== null ? Number(r.avg_grade) : null,
        })),
      }, 200, req);
    } catch {
      return json({ totalQuestions: 0, correctAnswers: 0, streak: 0, subjectBreakdown: [] }, 200, req);
    }
  }

  // ── GET /progress/history ─────────────────────────────────────────────────
  if (sub[0] === "history") {
    const subjectFilter = url.searchParams.get("subject") ?? null;
    const limitParam    = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 100);
    try {
      const rows = await sql`
        SELECT id, type, subject, grade_level, topic,
               total_marks, marks_awarded, questions_count, correct_count,
               grade_out_of_20, created_at
        FROM   revision_attempts
        WHERE  user_id = ${auth.userId}
          AND  (${subjectFilter}::text IS NULL OR subject = ${subjectFilter})
        ORDER  BY created_at DESC
        LIMIT  ${limitParam}
      `;
      return json(rows.map((r) => ({
        id:             r.id,
        type:           r.type,
        subject:        r.subject,
        gradeLevel:     r.grade_level,
        topic:          r.topic,
        totalMarks:     r.total_marks,
        marksAwarded:   r.marks_awarded,
        questionsCount: r.questions_count,
        correctCount:   r.correct_count,
        gradeOutOf20:   r.grade_out_of_20 !== null ? Number(r.grade_out_of_20) : null,
        createdAt:      r.created_at,
      })), 200, req);
    } catch {
      return json([], 200, req);
    }
  }

  // ── GET /progress/weak-topics ─────────────────────────────────────────────
  if (sub[0] === "weak-topics") {
    const subjectFilter = url.searchParams.get("subject") ?? null;
    try {
      const rows = await sql`
        SELECT topic, subject,
               COUNT(*)::int AS attempts,
               ROUND(AVG(grade_out_of_20)::numeric, 1) AS avg_grade
        FROM   revision_attempts
        WHERE  user_id = ${auth.userId}
          AND  topic IS NOT NULL
          AND  grade_out_of_20 IS NOT NULL
          AND  (${subjectFilter}::text IS NULL OR subject = ${subjectFilter})
        GROUP  BY topic, subject
        HAVING AVG(grade_out_of_20) < 12
        ORDER  BY AVG(grade_out_of_20) ASC
        LIMIT  10
      `;
      return json(rows.map((r) => ({
        topic:    r.topic,
        subject:  r.subject,
        attempts: Number(r.attempts),
        avgGrade: r.avg_grade !== null ? Number(r.avg_grade) : null,
      })), 200, req);
    } catch {
      return json([], 200, req);
    }
  }

  return json({ error: "Not found" }, 404, req);
});
