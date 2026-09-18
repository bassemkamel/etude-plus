// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

// ── CORS ──────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = (
  Deno.env.get("ALLOWED_ORIGINS") ??
  Deno.env.get("ALLOWED_ORIGIN") ??
  "https://tude-web-app-etude-plus-xi.vercel.app"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

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

function camel(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase()),
      v,
    ]),
  );
}

function sanitize(row: Record<string, unknown>): Record<string, unknown> {
  const { password_hash: _ph, email_verification_token: _evk, email_verification_expires_at: _eve, ...rest } = row;
  return camel(rest);
}

// ── Token helpers ─────────────────────────────────────────────────────────────

async function hmacHex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function generateToken(userId: number, secret: string): Promise<string> {
  const payload = `${userId}:${Date.now()}`;
  const sig = await hmacHex(secret, payload);
  return btoa(`${payload}:${sig}`)
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyToken(token: string, secret: string): Promise<{ userId: number } | null> {
  try {
    const padded = token.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(padded);
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon < 0) return null;
    const payload = decoded.slice(0, lastColon);
    const sig = decoded.slice(lastColon + 1);
    const expected = await hmacHex(secret, payload);
    if (!timingSafeEqual(sig, expected)) return null;
    const colonIdx = payload.indexOf(":");
    if (colonIdx < 0) return null;
    const userId = parseInt(payload.slice(0, colonIdx), 10);
    const issuedAt = parseInt(payload.slice(colonIdx + 1), 10);
    if (isNaN(userId) || userId <= 0 || isNaN(issuedAt)) return null;
    if (Date.now() - issuedAt > 30 * 24 * 60 * 60 * 1000) return null;
    return { userId };
  } catch { return null; }
}

type SqlClient = ReturnType<typeof neon>;

async function getAuthUser(req: Request, sql: SqlClient): Promise<Record<string, unknown> | Response> {
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
  const rows = await sql`SELECT * FROM users WHERE id = ${parsed.userId} LIMIT 1`;
  if (rows.length === 0) return json({ error: "User not found" }, 401);
  return rows[0] as Record<string, unknown>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_ROLES = ["student", "professor", "admin", "super_admin"];
const BCRYPT_ROUNDS = 10;

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: getCorsHeaders(req) });
  }

  const dbUrl = Deno.env.get("DATABASE_URL");
  if (!dbUrl) return json({ error: "DATABASE_URL not configured" }, 500, req);
  const sql = neon(dbUrl);

  const authResult = await getAuthUser(req, sql);
  if (authResult instanceof Response) return authResult;
  const callerUser = authResult;
  const callerRole = callerUser.role as string;

  const url = new URL(req.url);
  const idStr = url.searchParams.get("id");
  const id = idStr ? parseInt(idStr, 10) : NaN;
  const action = url.searchParams.get("action") ?? null;

  // ── GET ────────────────────────────────────────────────────────────────────

  if (req.method === "GET") {
    if (callerRole !== "admin" && callerRole !== "super_admin") {
      return json({ error: "Forbidden" }, 403, req);
    }

    // Single user details
    if (!isNaN(id)) {
      const rows = await sql`
        SELECT id, email, full_name, role, is_suspended, email_verified, created_at,
               phone, city, profile_photo, password_hash
        FROM users WHERE id = ${id} LIMIT 1
      `;
      if (rows.length === 0) return json({ error: "User not found" }, 404, req);
      const user = rows[0] as Record<string, unknown>;

      // Gracefully fetch related data
      let grades: unknown[] = [];
      let reviews: unknown[] = [];
      let transactions: unknown[] = [];
      let enrollments: unknown[] = [];
      let professorProfile: unknown = null;
      let professorClasses: unknown[] = [];
      let studentProfile: unknown = null;

      try { grades = (await sql`SELECT * FROM grades WHERE student_id = ${id} ORDER BY graded_at DESC LIMIT 50`).map(camel); } catch { /* */ }
      try { reviews = (await sql`SELECT * FROM reviews WHERE student_id = ${id} OR professor_id = ${id} ORDER BY created_at DESC LIMIT 20`).map(camel); } catch { /* */ }
      try { transactions = (await sql`SELECT * FROM transactions WHERE student_id = ${id} ORDER BY created_at DESC LIMIT 50`).map(camel); } catch { /* */ }
      try { enrollments = (await sql`SELECT * FROM enrollments WHERE student_id = ${id} ORDER BY created_at DESC LIMIT 50`).map(camel); } catch { /* */ }
      try {
        const pp = await sql`SELECT * FROM professors WHERE user_id = ${id} LIMIT 1`;
        if (pp.length > 0) {
          professorProfile = camel(pp[0] as Record<string, unknown>);
          const pc = await sql`SELECT * FROM classes WHERE professor_id = ${id} ORDER BY created_at DESC LIMIT 20`;
          professorClasses = pc.map(camel);
        }
      } catch { /* */ }
      try {
        const sp = await sql`SELECT * FROM student_profiles WHERE user_id = ${id} LIMIT 1`;
        if (sp.length > 0) studentProfile = camel(sp[0] as Record<string, unknown>);
      } catch { /* */ }

      return json({
        user: sanitize(user),
        grades,
        reviews,
        transactions,
        enrollments,
        professorProfile,
        professorClasses,
        studentProfile,
      }, 200, req);
    }

    // List all users (with optional search/role filter)
    const search = url.searchParams.get("search")?.trim() ?? null;
    const roleFilter = url.searchParams.get("role")?.trim() ?? null;

    let rows: Record<string, unknown>[];
    if (search && roleFilter) {
      const pattern = `%${search}%`;
      rows = await sql`
        SELECT id, email, full_name, role, is_suspended, email_verified, created_at, phone, city, profile_photo
        FROM users WHERE role = ${roleFilter} AND (full_name ILIKE ${pattern} OR email ILIKE ${pattern})
        ORDER BY created_at DESC
      ` as Record<string, unknown>[];
    } else if (search) {
      const pattern = `%${search}%`;
      rows = await sql`
        SELECT id, email, full_name, role, is_suspended, email_verified, created_at, phone, city, profile_photo
        FROM users WHERE full_name ILIKE ${pattern} OR email ILIKE ${pattern}
        ORDER BY created_at DESC
      ` as Record<string, unknown>[];
    } else if (roleFilter) {
      rows = await sql`
        SELECT id, email, full_name, role, is_suspended, email_verified, created_at, phone, city, profile_photo
        FROM users WHERE role = ${roleFilter} ORDER BY created_at DESC
      ` as Record<string, unknown>[];
    } else {
      rows = await sql`
        SELECT id, email, full_name, role, is_suspended, email_verified, created_at, phone, city, profile_photo
        FROM users ORDER BY created_at DESC
      ` as Record<string, unknown>[];
    }

    const countRows = await sql`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE role = 'student') AS students,
        COUNT(*) FILTER (WHERE role = 'professor') AS professors,
        COUNT(*) FILTER (WHERE role IN ('admin','super_admin')) AS admins
      FROM users
    `;
    const c = countRows[0];
    return json({
      users: rows.map(camel),
      counts: {
        total:      Number(c.total),
        students:   Number(c.students),
        professors: Number(c.professors),
        admins:     Number(c.admins),
      },
    }, 200, req);
  }

  // ── POST: create user ──────────────────────────────────────────────────────

  if (req.method === "POST") {
    if (callerRole !== "admin" && callerRole !== "super_admin") {
      return json({ error: "Forbidden" }, 403, req);
    }

    const body = await req.json().catch(() => ({}));
    const { fullName, email, password, role = "student" } = body as any;

    if (!fullName || !email || !password) {
      return json({ error: "fullName, email, password are required" }, 400, req);
    }
    if (!VALID_ROLES.includes(role)) {
      return json({ error: `role must be one of: ${VALID_ROLES.join(", ")}` }, 400, req);
    }
    if (password.length < 8) {
      return json({ error: "Password must be at least 8 characters" }, 400, req);
    }

    const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()} LIMIT 1`;
    if (existing.length > 0) {
      return json({ error: "Email already in use" }, 409, req);
    }

    const passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);

    const [newUser] = await sql`
      INSERT INTO users (email, password_hash, full_name, role, is_suspended, email_verified)
      VALUES (${email.toLowerCase()}, ${passwordHash}, ${fullName}, ${role}, false, true)
      RETURNING id, email, full_name, role, is_suspended, email_verified, created_at
    `;

    // Create a student_profile row if role is student
    if (role === "student") {
      try {
        await sql`INSERT INTO student_profiles (user_id) VALUES (${(newUser as any).id})`;
      } catch { /* table may not exist */ }
    }

    return json({ user: camel(newUser as Record<string, unknown>), email }, 201, req);
  }

  // ── PATCH: update user ─────────────────────────────────────────────────────

  if (req.method === "PATCH") {
    if (callerRole !== "admin" && callerRole !== "super_admin") {
      return json({ error: "Forbidden" }, 403, req);
    }
    if (isNaN(id)) return json({ error: "?id= is required" }, 400, req);

    const body = await req.json().catch(() => ({})) as any;

    // Prevent self-demotion for super_admin
    const target = await sql`SELECT role FROM users WHERE id = ${id} LIMIT 1`;
    if (target.length === 0) return json({ error: "User not found" }, 404, req);
    const targetRole = (target[0] as any).role as string;
    if (targetRole === "super_admin" && callerRole !== "super_admin") {
      return json({ error: "Cannot modify a super_admin account" }, 403, req);
    }

    switch (action) {
      case "suspend": {
        await sql`UPDATE users SET is_suspended = true WHERE id = ${id}`;
        return json({ ok: true, isSuspended: true }, 200, req);
      }

      case "unsuspend": {
        await sql`UPDATE users SET is_suspended = false WHERE id = ${id}`;
        return json({ ok: true, isSuspended: false }, 200, req);
      }

      case "change-role": {
        const { role } = body;
        if (!role || !VALID_ROLES.includes(role)) {
          return json({ error: `role must be one of: ${VALID_ROLES.join(", ")}` }, 400, req);
        }
        if (role === "super_admin" && callerRole !== "super_admin") {
          return json({ error: "Only super_admin can grant super_admin" }, 403, req);
        }
        const [updated] = await sql`
          UPDATE users SET role = ${role} WHERE id = ${id}
          RETURNING id, email, full_name, role, is_suspended
        `;
        return json(camel(updated as Record<string, unknown>), 200, req);
      }

      case "reset-password": {
        const pw = body.password ?? body.newPassword;
        if (!pw || pw.length < 8) {
          return json({ error: "Password must be at least 8 characters" }, 400, req);
        }
        const hash = bcrypt.hashSync(pw, BCRYPT_ROUNDS);
        await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${id}`;
        return json({ ok: true }, 200, req);
      }

      case "impersonate": {
        if (callerRole !== "super_admin") {
          return json({ error: "Only super_admin can impersonate" }, 403, req);
        }
        const secret = Deno.env.get("TOKEN_SECRET");
        if (!secret) return json({ error: "Server misconfigured" }, 500, req);
        const tokenStr = await generateToken(id, secret);
        const [targetUser] = await sql`
          SELECT id, email, full_name, role FROM users WHERE id = ${id} LIMIT 1
        `;
        return json({
          token: tokenStr,
          user: camel(targetUser as Record<string, unknown>),
        }, 200, req);
      }

      default: {
        // Generic field update
        const { fullName, phone, city } = body;
        const [updated] = await sql`
          UPDATE users SET
            full_name   = COALESCE(${fullName ?? null}, full_name),
            phone       = COALESCE(${phone ?? null}, phone),
            city        = COALESCE(${city ?? null}, city)
          WHERE id = ${id}
          RETURNING id, email, full_name, role, is_suspended, created_at, phone, city
        `;
        if (!updated) return json({ error: "User not found" }, 404, req);
        return json(camel(updated as Record<string, unknown>), 200, req);
      }
    }
  }

  // ── DELETE: delete user ────────────────────────────────────────────────────

  if (req.method === "DELETE") {
    if (callerRole !== "admin" && callerRole !== "super_admin") {
      return json({ error: "Forbidden" }, 403, req);
    }
    if (isNaN(id)) return json({ error: "?id= is required" }, 400, req);

    const target = await sql`SELECT role FROM users WHERE id = ${id} LIMIT 1`;
    if (target.length === 0) return json({ error: "User not found" }, 404, req);
    if ((target[0] as any).role === "super_admin") {
      return json({ error: "Cannot delete a super_admin account" }, 403, req);
    }

    await sql`DELETE FROM users WHERE id = ${id}`;
    return json({ deleted: true, id }, 200, req);
  }

  return json({ error: "Method not allowed" }, 405, req);
});
