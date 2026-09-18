// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

// ── Constants ─────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;
const SHA256_LEGACY_SALT = "etude_salt";
const SESSION_COOKIE = "etude_session";
const TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;   // 30 days
const REFRESH_THRESHOLD_MS = 23 * 24 * 60 * 60 * 1000; // 23 days
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MERCHANT_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };
}

// ── Response helpers ──────────────────────────────────────────────────────────

type SqlClient = ReturnType<typeof neon>;

function json(
  data: unknown,
  status = 200,
  extra: Record<string, string> = {},
  req?: Request,
): Response {
  const cors = req ? getCorsHeaders(req) : { "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0], "Access-Control-Allow-Credentials": "true" };
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json", ...extra },
  });
}

/** snake_case DB row → camelCase JS object */
function camel(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase()),
      v,
    ]),
  );
}

/** Remove password_hash before converting to camelCase */
function sanitize(row: Record<string, unknown>): Record<string, unknown> {
  const { password_hash: _drop, ...rest } = row;
  return camel(rest);
}

// ── Password ──────────────────────────────────────────────────────────────────

function isLegacyHash(hash: string): boolean {
  return /^[0-9a-f]{64}$/.test(hash);
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Supports both bcrypt (current) and legacy SHA-256 hashes. */
async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  if (!storedHash) { console.log("[verifyPassword] storedHash is empty/null"); return false; }
  const legacy = isLegacyHash(storedHash);
  console.log("[verifyPassword] isLegacyHash:", legacy);
  if (legacy) {
    const legacyHash = await sha256Hex(password + SHA256_LEGACY_SALT);
    // Constant-time compare to prevent timing attacks
    if (legacyHash.length !== storedHash.length) return false;
    let diff = 0;
    for (let i = 0; i < legacyHash.length; i++) {
      diff |= legacyHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
    }
    return diff === 0;
  }
  const result = bcrypt.compareSync(password, storedHash);
  console.log("[verifyPassword] compareSync returned:", result);
  return result;
}

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

// ── Token ─────────────────────────────────────────────────────────────────────

async function hmacHex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBytes = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time string comparison */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function generateToken(userId: number, secret: string): Promise<string> {
  const payload = `${userId}:${Date.now()}`;
  const sig = await hmacHex(secret, payload);
  // base64url — payload is pure ASCII so btoa works directly
  return btoa(`${payload}:${sig}`)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
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
    const expectedSig = await hmacHex(secret, payload);

    if (!timingSafeEqual(sig, expectedSig)) return null;

    const colonIdx = payload.indexOf(":");
    if (colonIdx < 0) return null;

    const userId = parseInt(payload.slice(0, colonIdx), 10);
    const issuedAt = parseInt(payload.slice(colonIdx + 1), 10);
    if (isNaN(userId) || userId <= 0) return null;
    if (isNaN(issuedAt) || issuedAt <= 0) return null;
    if (Date.now() - issuedAt > TOKEN_MAX_AGE_MS) return null;

    return { userId, issuedAt };
  } catch {
    return null;
  }
}

// ── Cookie ────────────────────────────────────────────────────────────────────
// Always SameSite=None;Secure because the Vercel frontend and Supabase Edge
// Functions are on different origins — SameSite=Lax would silently drop the
// cookie on cross-site requests.

function sessionCookieHeader(token: string, persist: boolean): string {
  const parts = [
    `${SESSION_COOKIE}=${token}`,
    "HttpOnly",
    "SameSite=None",
    "Secure",
    "Path=/",
  ];
  if (persist) parts.push(`Max-Age=${30 * 24 * 60 * 60}`);
  return parts.join("; ");
}

function clearCookieHeader(): string {
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=None; Secure; Path=/; Max-Age=0`;
}

// ── Merchant ID ───────────────────────────────────────────────────────────────

function generateMerchantId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let result = "ETD-";
  for (let i = 0; i < 8; i++) result += MERCHANT_CHARS[bytes[i] % MERCHANT_CHARS.length];
  return result;
}

async function getUniqueMerchantId(sql: SqlClient): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const id = generateMerchantId();
    const rows = await sql`SELECT id FROM users WHERE merchant_id = ${id} LIMIT 1`;
    if (rows.length === 0) return id;
  }
  throw new Error("Could not generate unique merchant ID after 10 attempts");
}

// ── Auth helper ───────────────────────────────────────────────────────────────

type AuthResult =
  | { ok: true; user: Record<string, unknown>; parsed: { userId: number; issuedAt: number }; fromCookie: boolean }
  | { ok: false; response: Response };

async function authenticate(
  req: Request,
  sql: SqlClient,
  secret: string,
): Promise<AuthResult> {
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

  // Bearer header wins (same priority as Express middleware)
  const token = headerToken ?? cookieToken;
  if (!token) return { ok: false, response: json({ error: "Unauthorized" }, 401) };

  const parsed = await verifyToken(token, secret);
  if (!parsed) return { ok: false, response: json({ error: "Invalid or expired token" }, 401) };

  const rows = await sql`SELECT * FROM users WHERE id = ${parsed.userId} LIMIT 1`;
  if (rows.length === 0) return { ok: false, response: json({ error: "User not found" }, 401) };

  return {
    ok: true,
    user: rows[0] as Record<string, unknown>,
    parsed,
    fromCookie: headerToken === null && cookieToken !== null,
  };
}

// ── Profile fetch helper ──────────────────────────────────────────────────────

async function fetchProfiles(
  sql: SqlClient,
  user: Record<string, unknown>,
): Promise<{ studentProfile: unknown; professorProfile: unknown }> {
  let studentProfile = null;
  let professorProfile = null;

  if (user.role === "student") {
    const sp = await sql`SELECT * FROM student_profiles WHERE user_id = ${user.id} LIMIT 1`;
    studentProfile = sp.length > 0 ? camel(sp[0] as Record<string, unknown>) : null;
  } else if (user.role === "professor") {
    const pp = await sql`SELECT * FROM professors WHERE user_id = ${user.id} LIMIT 1`;
    if (pp.length > 0) {
      professorProfile = {
        ...camel(pp[0] as Record<string, unknown>),
        fullName: user.full_name,
        profilePhoto: user.profile_photo,
        city: user.city,
      };
    }
  }

  return { studentProfile, professorProfile };
}

// ── Route handlers ────────────────────────────────────────────────────────────

async function handleLogin(req: Request, sql: SqlClient, secret: string): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { email, password, rememberMe } = body;

  if (!email || !password) return json({ error: "Email and password required" }, 400);
  if (typeof email !== "string" || typeof password !== "string") {
    return json({ error: "Invalid input" }, 400);
  }

  const normalizedEmail = email.toLowerCase().trim();
  if (!EMAIL_RE.test(normalizedEmail)) return json({ error: "Invalid email format" }, 400);

  const userRows = await sql`SELECT * FROM users WHERE email = ${normalizedEmail} LIMIT 1`;
  // Same error message for wrong email and wrong password — prevents user enumeration
  console.log("[login] user found:", userRows.length > 0);
  if (userRows.length === 0) return json({ error: "Invalid credentials" }, 401);

  const user = userRows[0] as Record<string, unknown>;
  const storedHash = user.password_hash as string | undefined;
  console.log("[login] password_hash exists:", storedHash != null);
  console.log("[login] password_hash prefix:", storedHash?.slice(0, 7) ?? "null");

  const passwordValid = await verifyPassword(password, storedHash ?? "");
  console.log("[login] bcrypt compare result:", passwordValid);
  if (!passwordValid) return json({ error: "Invalid credentials" }, 401);

  if (user.is_suspended) {
    return json(
      { error: "Your account has been suspended. Please contact support." },
      403,
    );
  }

  // Silently upgrade legacy SHA-256 hash to bcrypt on successful login
  if (isLegacyHash(user.password_hash as string)) {
    const newHash = await hashPassword(password);
    await sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${user.id}`;
  }

  const token = await generateToken(user.id as number, secret);
  const { studentProfile, professorProfile } = await fetchProfiles(sql, user);

  return json(
    { user: { ...sanitize(user), studentProfile, professorProfile }, token },
    200,
    { "Set-Cookie": sessionCookieHeader(token, rememberMe === true) },
  );
}

async function handleRegister(req: Request, sql: SqlClient, secret: string): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const {
    email, password, role, fullName, city, phone,
    gradeLevel, educationSection, schoolName, termsAccepted,
  } = body;

  if (!email || !password || !role || !fullName) {
    return json({ error: "Missing required fields" }, 400);
  }
  if (
    typeof email !== "string" || typeof password !== "string" ||
    typeof role !== "string" || typeof fullName !== "string"
  ) {
    return json({ error: "Invalid input" }, 400);
  }

  const normalizedEmail = email.toLowerCase().trim();
  if (!EMAIL_RE.test(normalizedEmail)) return json({ error: "Invalid email format" }, 400);
  if (password.length < MIN_PASSWORD_LENGTH) {
    return json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` }, 400);
  }
  if (password.length > MAX_PASSWORD_LENGTH) return json({ error: "Password is too long" }, 400);

  const trimmedName = fullName.trim();
  if (trimmedName.length === 0 || fullName.length > 200) {
    return json({ error: "Invalid full name" }, 400);
  }

  // MVP: only students can self-register
  if (role !== "student") {
    return json({ error: "Invalid role. Must be 'student'" }, 400);
  }

  const existing = await sql`SELECT id FROM users WHERE email = ${normalizedEmail} LIMIT 1`;
  if (existing.length > 0) return json({ error: "Email already registered" }, 400);

  const merchantId = await getUniqueMerchantId(sql);
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const verificationToken = Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const now = new Date();
  const verificationExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const nowIso = now.toISOString();
  const passwordHash = await hashPassword(password);

  const newUserRows = await sql`
    INSERT INTO users (
      email, password_hash, role, full_name, city, phone,
      merchant_id, email_verified, email_verification_token,
      email_verification_expires_at, terms_accepted, terms_accepted_at, created_at
    ) VALUES (
      ${normalizedEmail},
      ${passwordHash},
      ${"student"},
      ${trimmedName},
      ${(city as string | null) ?? null},
      ${(phone as string | null) ?? null},
      ${merchantId},
      false,
      ${verificationToken},
      ${verificationExpiresAt},
      ${termsAccepted === true},
      ${termsAccepted === true ? nowIso : null},
      ${nowIso}
    )
    RETURNING *
  `;
  const newUser = newUserRows[0] as Record<string, unknown>;

  const spRows = await sql`
    INSERT INTO student_profiles (
      user_id, grade_level, education_section, school_name, preferred_subjects, created_at
    ) VALUES (
      ${newUser.id},
      ${(gradeLevel as string | null) ?? null},
      ${(educationSection as string | null) ?? null},
      ${(schoolName as string | null) ?? null},
      '{}',
      ${nowIso}
    )
    RETURNING *
  `;
  const studentProfile = spRows.length > 0
    ? camel(spRows[0] as Record<string, unknown>)
    : null;

  const token = await generateToken(newUser.id as number, secret);

  return json(
    {
      user: { ...sanitize(newUser), studentProfile, professorProfile: null },
      token,
    },
    200,
    { "Set-Cookie": sessionCookieHeader(token, false) },
  );
}

async function handleMe(req: Request, sql: SqlClient, secret: string): Promise<Response> {
  const auth = await authenticate(req, sql, secret);
  if (!auth.ok) return auth.response;

  const { user, parsed, fromCookie } = auth;
  const { studentProfile, professorProfile } = await fetchProfiles(sql, user);

  const extra: Record<string, string> = {};

  // Auto-refresh cookie when it was issued via cookie (not Bearer) and is > 23 days old
  if (fromCookie && Date.now() - parsed.issuedAt > REFRESH_THRESHOLD_MS) {
    const newToken = await generateToken(user.id as number, secret);
    extra["Set-Cookie"] = sessionCookieHeader(newToken, true);
  }

  // /me returns the user object flat (no wrapping { user: ... }) — matches Express shape
  return json(
    { ...sanitize(user), studentProfile, professorProfile },
    200,
    extra,
  );
}

function handleLogout(): Response {
  return json({ success: true }, 200, { "Set-Cookie": clearCookieHeader() });
}

// ── OTP email ─────────────────────────────────────────────────────────────────

async function sendOtpEmail(to: string, code: string): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  const from = Deno.env.get("RESEND_FROM");
  if (!from) throw new Error("RESEND_FROM is not configured");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Votre code de vérification Étude+",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#4f46e5;margin-bottom:8px">Votre code de vérification</h2>
          <p>Utilisez ce code pour confirmer votre adresse email :</p>
          <div style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#111;padding:20px 0">${code}</div>
          <p style="color:#666;font-size:14px">Ce code expire dans <strong>10 minutes</strong>. Ne le partagez avec personne.</p>
        </div>`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "(unreadable)");
    console.error(`[auth/send-code] resend failed status=${res.status} body=${body}`);
    throw new Error(`Resend rejected the request: ${res.status}`);
  }

  console.log("[auth/send-code] resend accepted");
}

// ── Phase 1 route handlers ────────────────────────────────────────────────────

async function handleSendCode(req: Request, sql: SqlClient): Promise<Response> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  const { email } = body;
  if (!email || typeof email !== "string") return json({ error: "Email invalide" }, 400);

  const normalizedEmail = email.toLowerCase().trim();
  if (!EMAIL_RE.test(normalizedEmail)) return json({ error: "Email invalide" }, 400);

  // Check not already registered
  const existing = await sql`SELECT id FROM users WHERE email = ${normalizedEmail} LIMIT 1`;
  if (existing.length > 0) return json({ error: "Cette adresse email est déjà utilisée" }, 400);

  // Invalidate all previous codes for this email
  await sql`UPDATE email_verifications SET used = true WHERE email = ${normalizedEmail}`;

  // Cryptographically random 6-digit code (100000–999999)
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const code = String(100000 + (buf[0] % 900000));

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await sql`
    INSERT INTO email_verifications (email, code, expires_at, used)
    VALUES (${normalizedEmail}, ${code}, ${expiresAt}, false)
  `;
  console.log("[auth/send-code] verification row inserted");

  console.log("[auth/send-code] sending email");
  await sendOtpEmail(normalizedEmail, code);
  // sendOtpEmail throws on any failure — error propagates to the top-level
  // handler which returns 500, so the client never sees a false success.

  return json({ success: true, message: "Code envoyé" });
}

async function handleVerifyCode(req: Request, sql: SqlClient): Promise<Response> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  const { email, code } = body;
  if (!email || !code) return json({ error: "Email et code requis" }, 400);
  if (typeof email !== "string" || typeof code !== "string") return json({ error: "Invalid input" }, 400);

  const normalizedEmail = email.toLowerCase().trim();
  const now = new Date().toISOString();

  const rows = await sql`
    SELECT id FROM email_verifications
    WHERE email     = ${normalizedEmail}
      AND code      = ${String(code)}
      AND used      = false
      AND expires_at > ${now}::timestamptz
    LIMIT 1
  `;

  if (rows.length === 0) return json({ error: "Code incorrect ou expiré" }, 400);

  await sql`UPDATE email_verifications SET used = true WHERE id = ${rows[0].id}`;

  return json({ success: true, verified: true });
}

async function handleChangePassword(
  req: Request,
  sql: SqlClient,
  secret: string,
): Promise<Response> {
  const auth = await authenticate(req, sql, secret);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }

  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) {
    return json({ error: "Current password and new password are required" }, 400);
  }
  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return json({ error: "Invalid input" }, 400);
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` }, 400);
  }
  if (newPassword.length > MAX_PASSWORD_LENGTH) {
    return json({ error: "New password is too long" }, 400);
  }

  const { user } = auth;
  const passwordValid = await verifyPassword(currentPassword, user.password_hash as string);
  if (!passwordValid) return json({ error: "Current password is incorrect" }, 401);

  const newHash = await hashPassword(newPassword);
  await sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${user.id}`;

  return json({ success: true });
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: getCorsHeaders(req) });
  }

  // Resolve secrets once per invocation
  const dbUrl = Deno.env.get("DATABASE_URL");
  if (!dbUrl) return json({ error: "Server misconfigured" }, 500);
  const secret = Deno.env.get("TOKEN_SECRET");
  if (!secret) return json({ error: "Server misconfigured" }, 500);

  const sql = neon(dbUrl);

  // Route on the last path segment: /functions/v1/auth/<route>
  const pathname = new URL(req.url).pathname;
  const route = pathname.split("/").filter(Boolean).pop();

  try {
    switch (route) {
      case "login":
        if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
        return await handleLogin(req, sql, secret);

      case "register":
        if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
        return await handleRegister(req, sql, secret);

      case "me":
        if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);
        return await handleMe(req, sql, secret);

      case "logout":
        if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
        return handleLogout();

      case "send-code":
        if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
        return await handleSendCode(req, sql);

      case "verify-code":
        if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
        return await handleVerifyCode(req, sql);

      case "change-password":
        if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
        return await handleChangePassword(req, sql, secret);

      case "restore-session": {
        if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
        const auth = await authenticate(req, sql, secret);
        if (!auth.ok) return auth.response;
        const freshToken = await generateToken(auth.user.id as number, secret);
        return json({ token: freshToken }, 200, {
          "Set-Cookie": sessionCookieHeader(freshToken, true),
        });
      }

      default:
        return json({ error: "Not found" }, 404);
    }
  } catch (err) {
    // Log internally but never expose raw errors or stack traces to the client
    console.error(`[auth] unhandled error on ${route}:`, err);
    return json({ error: "Internal server error" }, 500);
  }
});
