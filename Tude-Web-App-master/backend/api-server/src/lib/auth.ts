import { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;
// Legacy salt used before bcrypt migration — kept only for read-time verification
const SHA256_LEGACY_SALT = "etude_salt";

function getTokenSecret(): string {
  const secret = process.env["TOKEN_SECRET"];
  if (!secret) throw new Error("TOKEN_SECRET environment variable is required");
  return secret;
}

/** Hash a new password with bcrypt. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/** Returns true if the hash looks like a legacy SHA-256 hex hash. */
export function isLegacyPasswordHash(hash: string): boolean {
  return /^[0-9a-f]{64}$/.test(hash);
}

/**
 * Verify a plaintext password against a stored hash.
 * Supports both bcrypt (current) and legacy SHA-256 hashes.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (isLegacyPasswordHash(storedHash)) {
    const legacyHash = crypto
      .createHash("sha256")
      .update(password + SHA256_LEGACY_SALT)
      .digest("hex");
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(legacyHash, "hex"), Buffer.from(storedHash, "hex"));
  }
  return bcrypt.compare(password, storedHash);
}

/** Generate a cryptographically signed token for a user. */
export function generateToken(userId: number): string {
  const timestamp = Date.now().toString();
  const payload = `${userId}:${timestamp}`;
  const sig = crypto
    .createHmac("sha256", getTokenSecret())
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

const SESSION_COOKIE = "etude_session";
const _IS_PROD = process.env["NODE_ENV"] === "production";
// Cross-origin deployments (Vercel frontend → Railway backend) require SameSite=None; Secure.
// SameSite=Lax only works when frontend and backend share the same registrable domain.
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: (_IS_PROD ? "none" : "lax") as "none" | "lax",
  secure: _IS_PROD,
  path: "/",
};
// Refresh the cookie if it was issued more than 23 days ago (for 30-day cookies)
const REFRESH_THRESHOLD_MS = 23 * 24 * 60 * 60 * 1000;

// Tokens older than 30 days are rejected even if the signature is valid
const TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Parse and verify a token string. Returns { userId, issuedAt } or null. */
function verifyToken(token: string): { userId: number; issuedAt: number } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon < 0) return null;

    const payload = decoded.slice(0, lastColon);
    const sig = decoded.slice(lastColon + 1);

    const expectedSig = crypto
      .createHmac("sha256", getTokenSecret())
      .update(payload)
      .digest("hex");

    let sigValid = false;
    try {
      const sigBuf = Buffer.from(sig, "hex");
      const expectedBuf = Buffer.from(expectedSig, "hex");
      if (sigBuf.length === expectedBuf.length) {
        sigValid = crypto.timingSafeEqual(sigBuf, expectedBuf);
      }
    } catch { /* invalid hex */ }

    if (!sigValid) return null;

    const colonIdx = payload.indexOf(":");
    if (colonIdx < 0) return null;

    const userId = parseInt(payload.slice(0, colonIdx), 10);
    const issuedAt = parseInt(payload.slice(colonIdx + 1), 10);
    if (!userId || isNaN(userId) || userId <= 0) return null;
    if (isNaN(issuedAt) || issuedAt <= 0) return null;

    // Reject tokens older than TOKEN_MAX_AGE_MS
    if (Date.now() - issuedAt > TOKEN_MAX_AGE_MS) return null;

    return { userId, issuedAt };
  } catch {
    return null;
  }
}

/** Middleware: require a valid signed auth token. Reads Authorization header first, then cookie.
 *  Bearer takes priority so that impersonation (localStorage token) overrides the admin cookie. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const cookieToken: string | undefined = (req as any).cookies?.[SESSION_COOKIE];
  const rawHeader = req.headers.authorization;
  const headerToken = rawHeader?.startsWith("Bearer ") ? rawHeader.slice(7).trim() : null;

  // Bearer wins when present — this makes impersonation reliable regardless of which
  // cookie the browser has cached.  Cookie is the fallback for cookie-only sessions.
  const token = headerToken || cookieToken;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = verifyToken(token);
  if (!parsed) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parsed.userId));
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    (req as any).user = user;

    // Auto-refresh: if the token came from a cookie and was issued > 23 days ago, reissue it
    if (cookieToken && Date.now() - parsed.issuedAt > REFRESH_THRESHOLD_MS) {
      const newToken = generateToken(user.id);
      res.cookie(SESSION_COOKIE, newToken, { ...COOKIE_OPTIONS, maxAge: 30 * 24 * 60 * 60 * 1000 });
    }

    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

/**
 * Middleware: attach user to req if a valid token is present, but never block.
 * Used on public routes that return extra data to authenticated admins.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const cookieToken: string | undefined = (req as any).cookies?.[SESSION_COOKIE];
  const rawHeader = req.headers.authorization;
  const headerToken = rawHeader?.startsWith("Bearer ") ? rawHeader.slice(7).trim() : null;
  const token = headerToken || cookieToken;

  if (token) {
    try {
      const parsed = verifyToken(token);
      if (parsed && parsed.userId > 0) {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parsed.userId));
        if (user) (req as any).user = user;
      }
    } catch { /* ignore — token is optional */ }
  }
  next();
}

/** Middleware: require admin or super_admin role. Must be used after requireAuth. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

/** Middleware: require super_admin role only. Must be used after requireAuth. */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== "super_admin") {
    res.status(403).json({ error: "Super-admin access required" });
    return;
  }
  next();
}
