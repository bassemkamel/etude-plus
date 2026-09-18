// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { neon } from "@neondatabase/serverless";

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGIN =
  Deno.env.get("ALLOWED_ORIGIN") ?? "https://tude-web-app-etude-plus-xi.vercel.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
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

  const dbUrl = Deno.env.get("DATABASE_URL");
  if (!dbUrl) return json({ error: "DATABASE_URL not configured" }, 500);
  const sql = neon(dbUrl);

  const authResult = await getAuthUser(req, sql);
  if (authResult instanceof Response) return authResult;
  const user = authResult;

  const url = new URL(req.url);

  // ── GET: list questions with their mark schemes ───────────────────────────
  if (req.method === "GET") {
    const subject = url.searchParams.get("subject");
    const gradeLevel = url.searchParams.get("gradeLevel");
    const topic = url.searchParams.get("topic") ?? null;
    const sectionKey = url.searchParams.get("sectionKey") ?? null;

    if (!subject || !gradeLevel) {
      return json({ error: "subject and gradeLevel are required" }, 400);
    }

    const questionRows = await sql`
      SELECT * FROM questions
      WHERE  subject     = ${subject}
        AND  grade_level = ${gradeLevel}
        AND  (${sectionKey}::text IS NULL OR section_key = ${sectionKey})
        AND  (${topic}::text      IS NULL OR topic       = ${topic})
      ORDER  BY created_at DESC
    `;

    if (questionRows.length === 0) return json([]);

    const questionIds = questionRows.map((q: Record<string, unknown>) => q.id as number);
    const schemeRows = await sql`
      SELECT * FROM mark_schemes
      WHERE  question_id = ANY(${questionIds}::int[])
      ORDER  BY order_index
    `;

    const questions = questionRows.map(camel);
    const schemes = schemeRows.map(camel);

    const enriched = questions.map((q) => ({
      ...q,
      markScheme: schemes.filter((s) => s.questionId === q.id),
    }));

    return json(enriched);
  }

  // ── Write operations: require admin or super_admin ────────────────────────
  const role = user.role as string;
  if (role !== "admin" && role !== "super_admin") {
    return json({ error: "Forbidden: admin role required" }, 403);
  }

  // ── POST: create question ─────────────────────────────────────────────────
  if (req.method === "POST") {
    const body = await req.json();
    const {
      subject, gradeLevel, sectionKey, topic, type, difficulty, questionText, totalMarks,
      parts: bodyParts, markScheme,
      // New-shape fields (all optional; admins may continue to use legacy parts/markScheme)
      instruction, options, correctAnswer, explanation, direction, source, status: bodyStatus,
    } = body;

    if (!subject || !gradeLevel || !topic || !questionText) {
      return json({ error: "subject, gradeLevel, topic, questionText are required" }, 400);
    }

    const optionsJson = options !== undefined && options !== null ? JSON.stringify(options) : null;
    const VALID_STATUSES = ["draft", "published", "archived"];
    const status = bodyStatus && VALID_STATUSES.includes(bodyStatus) ? bodyStatus : "published";

    const [qRow] = await sql`
      INSERT INTO questions
        (subject, grade_level, section_key, topic, type, difficulty, question_text, total_marks,
         status, kb_file_id,
         instruction, options, correct_answer, explanation, direction, source)
      VALUES
        (${subject}, ${gradeLevel}, ${sectionKey ?? null}, ${topic},
         ${type ?? "Exercice"}, ${difficulty ?? "moyen"}, ${questionText},
         ${totalMarks ?? null}, ${status}, NULL,
         ${instruction ?? null}, ${optionsJson}::jsonb,
         ${correctAnswer ?? null}, ${explanation ?? null},
         ${direction ?? null}, ${source ?? null})
      RETURNING *
    `;

    const qId = qRow.id as number;

    if (Array.isArray(bodyParts) && bodyParts.length > 0) {
      for (let i = 0; i < bodyParts.length; i++) {
        const p = bodyParts[i];
        await sql`
          INSERT INTO question_parts (question_id, part_label, text, marks, order_index)
          VALUES (${qId}, ${p.label ?? String.fromCharCode(97 + i)}, ${p.text ?? ""}, ${p.marks ?? 0}, ${i})
        `;
      }
    }

    if (Array.isArray(markScheme) && markScheme.length > 0) {
      for (let i = 0; i < markScheme.length; i++) {
        const ms = markScheme[i];
        await sql`
          INSERT INTO mark_schemes (question_id, part_label, answer, order_index)
          VALUES (${qId}, ${ms.partLabel ?? "a"}, ${ms.answer ?? ""}, ${i})
        `;
      }
    }

    return json(camel(qRow), 201);
  }

  // ── PUT: update question (id via query param) ─────────────────────────────
  if (req.method === "PUT") {
    const idStr = url.searchParams.get("id");
    const id = idStr ? parseInt(idStr, 10) : NaN;
    if (isNaN(id)) return json({ error: "?id= required" }, 400);

    const body = await req.json();
    const {
      subject, gradeLevel, sectionKey, topic, type, difficulty, questionText, totalMarks,
      parts: bodyParts, markScheme,
      instruction, options, correctAnswer, explanation, direction, source, status: bodyStatus,
    } = body;

    if (!subject || !gradeLevel || !topic || !questionText) {
      return json({ error: "subject, gradeLevel, topic, questionText are required" }, 400);
    }

    const optionsJson = options !== undefined && options !== null ? JSON.stringify(options) : null;
    const VALID_STATUSES = ["draft", "published", "archived"];
    const statusToSet = bodyStatus && VALID_STATUSES.includes(bodyStatus) ? bodyStatus : null;

    const updated = await sql`
      UPDATE questions SET
        subject       = ${subject},
        grade_level   = ${gradeLevel},
        section_key   = ${sectionKey ?? null},
        topic         = ${topic},
        type          = ${type ?? "Exercice"},
        difficulty    = ${difficulty ?? "moyen"},
        question_text = ${questionText},
        total_marks   = ${totalMarks ?? null},
        instruction   = ${instruction ?? null},
        options       = ${optionsJson}::jsonb,
        correct_answer = ${correctAnswer ?? null},
        explanation   = ${explanation ?? null},
        direction     = ${direction ?? null},
        source        = ${source ?? null},
        status        = COALESCE(${statusToSet}, status)
      WHERE id = ${id}
      RETURNING *
    `;
    if (updated.length === 0) return json({ error: "Question not found" }, 404);

    await sql`DELETE FROM question_parts WHERE question_id = ${id}`;
    if (Array.isArray(bodyParts) && bodyParts.length > 0) {
      for (let i = 0; i < bodyParts.length; i++) {
        const p = bodyParts[i];
        await sql`
          INSERT INTO question_parts (question_id, part_label, text, marks, order_index)
          VALUES (${id}, ${p.label ?? String.fromCharCode(97 + i)}, ${p.text ?? ""}, ${p.marks ?? 0}, ${i})
        `;
      }
    }

    await sql`DELETE FROM mark_schemes WHERE question_id = ${id}`;
    if (Array.isArray(markScheme) && markScheme.length > 0) {
      for (let i = 0; i < markScheme.length; i++) {
        const ms = markScheme[i];
        await sql`
          INSERT INTO mark_schemes (question_id, part_label, answer, order_index)
          VALUES (${id}, ${ms.partLabel ?? "a"}, ${ms.answer ?? ""}, ${i})
        `;
      }
    }

    return json(camel(updated[0]));
  }

  // ── PATCH: approve / change status (id via query param) ──────────────────
  if (req.method === "PATCH") {
    const idStr = url.searchParams.get("id");
    const id = idStr ? parseInt(idStr, 10) : NaN;
    if (isNaN(id)) return json({ error: "?id= required" }, 400);

    const body = await req.json().catch(() => ({})) as { status?: string };
    const { status } = body;
    const VALID_STATUSES = ["draft", "published", "archived"];
    if (!status || !VALID_STATUSES.includes(status)) {
      return json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` }, 400);
    }

    const patched = await sql`
      UPDATE questions SET status = ${status} WHERE id = ${id}
      RETURNING id, status, source, question_text, difficulty, subject, grade_level, topic
    `;
    if (patched.length === 0) return json({ error: "Question not found" }, 404);
    return json(camel(patched[0] as Record<string, unknown>));
  }

  // ── DELETE: delete question (id via query param) ──────────────────────────
  if (req.method === "DELETE") {
    const idStr = url.searchParams.get("id");
    const id = idStr ? parseInt(idStr, 10) : NaN;
    if (isNaN(id)) return json({ error: "?id= required" }, 400);

    const deleted = await sql`DELETE FROM questions WHERE id = ${id} RETURNING id`;
    if (deleted.length === 0) return json({ error: "Question not found" }, 404);
    return json({ deleted: true, id });
  }

  return json({ error: "Method not allowed" }, 405);
});
