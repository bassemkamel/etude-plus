import "@supabase/functions-js/edge-runtime.d.ts";
import { neon } from "@neondatabase/serverless";

// ── CORS ──────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = (
  Deno.env.get("ALLOWED_ORIGINS") ??
  Deno.env.get("ALLOWED_ORIGIN") ??
  "https://tude-web-app-etude-plus-xi.vercel.app"
).split(",").map((s) => s.trim()).filter(Boolean);

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };
}

function json(data: unknown, status = 200, req?: Request): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...(req ? getCorsHeaders(req) : {}), "Content-Type": "application/json" },
  });
}

// ── Token verification ────────────────────────────────────────────────────────

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

type SqlClient = ReturnType<typeof neon>;

async function getAuthUser(
  req: Request,
  sql: SqlClient,
): Promise<Record<string, unknown> | Response> {
  const rawHeader = req.headers.get("Authorization");
  const headerToken = rawHeader?.startsWith("Bearer ") ? rawHeader.slice(7).trim() : null;
  const cookieToken =
    req.headers.get("Cookie")?.split(";").map((c) => c.trim())
      .find((c) => c.startsWith("etude_session="))?.slice("etude_session=".length) ?? null;
  const token = headerToken ?? cookieToken;
  if (!token) return json({ error: "Unauthorized" }, 401);
  const secret = Deno.env.get("TOKEN_SECRET");
  if (!secret) return json({ error: "Server misconfigured" }, 500);
  const parsed = await verifyToken(token, secret);
  if (!parsed) return json({ error: "Invalid or expired token" }, 401);
  const rows = await sql`SELECT id, role FROM users WHERE id = ${parsed.userId} LIMIT 1`;
  if (rows.length === 0) return json({ error: "User not found" }, 401);
  return rows[0] as Record<string, unknown>;
}

// ── Gemini REST call ──────────────────────────────────────────────────────────

interface GeminiQuestion {
  questionText: string;
  answer: string;
  points: number;
  difficulty: string;
}

async function callGemini(
  prompt: string,
  apiKey: string,
): Promise<GeminiQuestion[]> {
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("Quota Gemini dépassé — réessayez dans quelques minutes");
    }
    throw new Error(`Erreur Gemini ${res.status}`);
  }

  const result = await res.json();
  const rawText: string =
    result?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Strip code fences if Gemini wrapped the JSON despite responseMimeType
  const clean = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: { questions?: unknown };
  try {
    parsed = JSON.parse(clean);
  } catch {
    throw new Error("Gemini a renvoyé une réponse non-JSON inattendue");
  }

  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new Error("Gemini n'a renvoyé aucune question");
  }

  return parsed.questions as GeminiQuestion[];
}

// ── Ensure source column exists (idempotent) ──────────────────────────────────

async function ensureSourceColumn(sql: SqlClient): Promise<void> {
  try {
    await sql`ALTER TABLE questions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'`;
  } catch { /* already exists or insufficient privileges — ignore */ }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: getCorsHeaders(req) });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const route = pathParts[pathParts.length - 1];

  // ── POST /ai/question-variations ─────────────────────────────────────────
  if (req.method === "POST" && route === "question-variations") {
    const dbUrl = Deno.env.get("DATABASE_URL");
    if (!dbUrl) return json({ error: "DATABASE_URL not configured" }, 500, req);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return json(
        { error: "GEMINI_API_KEY non configurée — contactez l'administrateur" },
        503,
        req,
      );
    }

    const sql = neon(dbUrl);

    // Auth + role check
    const authResult = await getAuthUser(req, sql);
    if (authResult instanceof Response) return authResult;
    const role = (authResult as Record<string, unknown>).role as string;
    if (role !== "admin" && role !== "super_admin") {
      return json({ error: "Forbidden: rôle admin requis" }, 403, req);
    }

    // Parse body
    let body: { questionId?: unknown; count?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ error: "Corps JSON invalide" }, 400, req);
    }

    const questionId = typeof body.questionId === "number" ? body.questionId : NaN;
    if (isNaN(questionId) || questionId <= 0) {
      return json({ error: "questionId (nombre entier) est requis" }, 400, req);
    }

    const count = Math.min(
      Math.max(typeof body.count === "number" ? Math.floor(body.count) : 5, 1),
      10,
    );

    // Fetch original question
    const qRows = await sql`SELECT * FROM questions WHERE id = ${questionId} LIMIT 1`;
    if (qRows.length === 0) {
      return json({ error: "Question introuvable" }, 404, req);
    }
    const q = qRows[0] as Record<string, unknown>;

    // Fetch mark scheme
    const msRows = await sql`
      SELECT part_label, answer FROM mark_schemes
      WHERE question_id = ${questionId}
      ORDER BY order_index
    `;
    const markSchemeText = msRows.length > 0
      ? (msRows as Record<string, unknown>[])
          .map((ms) => `${ms.part_label}: ${ms.answer}`)
          .join("\n")
      : "(aucun corrigé fourni)";

    // Ensure source column exists before inserting
    await ensureSourceColumn(sql);

    // Build strict Gemini prompt
    const prompt = `Tu es un générateur de questions pédagogiques pour l'éducation tunisienne.

Matière : ${q.subject}
Niveau scolaire : ${q.grade_level}${q.section_key ? ` / section ${q.section_key}` : ""}
Chapitre / Thème : ${q.topic}
Difficulté : ${q.difficulty}
Type de question : ${q.type}

QUESTION ORIGINALE :
${q.question_text}

CORRIGÉ ORIGINAL :
${markSchemeText}

RÈGLES ABSOLUES — ne les ignore jamais :
1. Génère exactement ${count} variations de cette question.
2. Reste strictement dans le même chapitre : "${q.topic}".
3. Reste strictement dans la même matière : "${q.subject}".
4. Conserve la même difficulté : "${q.difficulty}".
5. Change uniquement les valeurs numériques, les noms ou la formulation — ne change JAMAIS le type de concept testé.
   Exemple correct si l'original est "x + 7 = 3" : générer "y + 5 = 12" ou "x - 4 = 9".
   Exemple INTERDIT : passer à des quadratiques, géométrie ou autre concept.
6. Chaque variation doit inclure un corrigé complet et exact.
7. Réponds UNIQUEMENT avec du JSON valide — zéro explication, zéro markdown, zéro texte avant ou après.

FORMAT JSON EXACT — respecte-le à la lettre :
{
  "questions": [
    {
      "questionText": "Énoncé complet de la variation",
      "answer": "Réponse complète avec démarche si nécessaire",
      "points": ${q.total_marks ?? 2},
      "difficulty": "${q.difficulty}"
    }
  ]
}`;

    // Call Gemini
    let geminiQuestions: GeminiQuestion[];
    try {
      geminiQuestions = await callGemini(prompt, apiKey);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur Gemini inconnue";
      return json({ error: msg }, 503, req);
    }

    // Persist each variation to Neon
    const createdIds: number[] = [];
    for (const gq of geminiQuestions.slice(0, count)) {
      const questionText = String(gq.questionText ?? "").trim();
      const answer = String(gq.answer ?? "").trim();
      const points =
        typeof gq.points === "number" ? gq.points : ((q.total_marks as number | null) ?? null);

      if (!questionText) continue;

      try {
        const inserted = await sql`
          INSERT INTO questions
            (subject, grade_level, section_key, topic, type, difficulty,
             question_text, total_marks, status, source, kb_file_id)
          VALUES
            (${q.subject as string},
             ${q.grade_level as string},
             ${(q.section_key as string | null) ?? null},
             ${q.topic as string},
             ${q.type as string},
             ${q.difficulty as string},
             ${questionText},
             ${points},
             'draft',
             'ai',
             NULL)
          RETURNING id
        `;
        const newId = (inserted[0] as Record<string, unknown>).id as number;
        createdIds.push(newId);

        if (answer) {
          await sql`
            INSERT INTO mark_schemes (question_id, part_label, answer, order_index)
            VALUES (${newId}, 'a', ${answer}, 0)
          `;
        }
      } catch {
        // Skip failed insertions silently; partial success is still useful
      }
    }

    return json(
      {
        generated: createdIds.length,
        questionIds: createdIds,
        message: `${createdIds.length} variante(s) générée(s) et sauvegardée(s) en brouillon`,
      },
      201,
      req,
    );
  }

  // All other routes — stub (keep backward compat)
  return json(
    { result: null, message: "AI generation not available in this environment" },
    200,
    req,
  );
});
