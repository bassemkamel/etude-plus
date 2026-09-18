import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { db, usersTable, professorsTable, studentProfilesTable, emailVerificationsTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import {
  hashPassword,
  generateToken,
  requireAuth,
  verifyPassword,
  isLegacyPasswordHash,
} from "../lib/auth";
import { logEvent } from "../lib/auditLog";
import { sendOtpEmail, sendAccountVerificationEmail } from "../services/emailService";
import { randomBytes, randomInt } from "crypto";
import { lt, isNull, or } from "drizzle-orm";

// ── Rate limiters ────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,                 // 10 attempts per window per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Trop de tentatives de connexion. Réessayez dans 15 minutes." },
});

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5,                  // 5 OTP sends per hour per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Trop de demandes de code. Réessayez dans une heure." },
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,                 // 10 verify attempts per window per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Trop de tentatives. Réessayez dans 15 minutes." },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10,                 // 10 registrations per hour per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Trop d'inscriptions depuis cette IP. Réessayez dans une heure." },
});

function generateMerchantId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "ETD-";
  const bytes = randomBytes(8);
  for (let i = 0; i < 8; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

async function getUniqueMerchantId(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const id = generateMerchantId();
    const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.merchantId, id));
    if (!existing) return id;
  }
  throw new Error("Could not generate unique merchant ID");
}

const router = Router();

// ── Feature flags ─────────────────────────────────────────────────────────────
// Set to true when Resend sending limits allow additional transactional emails.
// While false, only the OTP email fires during the signup/auth flow.
const ENABLE_EXTRA_EMAILS = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
// MVP: professor role suppressed from self-registration
const ALLOWED_ROLES = ["student"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

router.get("/me", requireAuth, async (req, res) => {
  const user = (req as any).user;
  let studentProfile = null;
  let professorProfile = null;

  if (user.role === "student") {
    const [sp] = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.userId, user.id));
    studentProfile = sp || null;
  } else if (user.role === "professor") {
    const [pp] = await db.select().from(professorsTable).where(eq(professorsTable.userId, user.id));
    professorProfile = pp ? {
      ...pp,
      fullName: user.fullName,
      profilePhoto: user.profilePhoto,
      city: user.city,
    } : null;
  }

  res.json({
    ...user,
    passwordHash: undefined,
    studentProfile,
    professorProfile,
  });
});

const SESSION_COOKIE = "etude_session";
const IS_PROD = process.env["NODE_ENV"] === "production";

function setSessionCookie(res: any, token: string, rememberMe: boolean) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    // "none" is required for cross-origin requests (e.g. Netlify frontend → Railway API).
    // "lax" only works when frontend and backend share the same registrable domain.
    sameSite: IS_PROD ? "none" : "lax",
    secure: IS_PROD,
    path: "/",
    ...(rememberMe ? { maxAge: 30 * 24 * 60 * 60 * 1000 } : {}),
  });
}

router.post("/login", loginLimiter, async (req, res) => {
  const { email, password, rememberMe } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  if (!EMAIL_RE.test(normalizedEmail)) {
    res.status(400).json({ error: "Invalid email format" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
  // Use same error message whether email is wrong or password is wrong (prevents user enumeration)
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    await logEvent(req, "login_failed", "user", user.id, null, { email: normalizedEmail });
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.isSuspended) {
    await logEvent(req, "login_blocked_suspended", "user", user.id, null, { email: normalizedEmail });
    res.status(403).json({ error: "Your account has been suspended. Please contact support." });
    return;
  }

  // Email verification check temporarily disabled — unverified users can log in.
  // Re-enable by un-commenting the block below when APP_URL is confirmed correct
  // and the verification email flow is fully tested end-to-end.
  //
  // if (!user.emailVerified) {
  //   res.status(403).json({
  //     error: "email_not_verified",
  //     message: "Veuillez confirmer votre email avant de vous connecter.",
  //   });
  //   return;
  // }

  // Silently upgrade legacy SHA-256 hash to bcrypt on successful login
  if (isLegacyPasswordHash(user.passwordHash)) {
    const newHash = await hashPassword(password);
    await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, user.id));
  }

  const token = generateToken(user.id);

  // Set httpOnly session cookie
  setSessionCookie(res, token, rememberMe === true);

  await logEvent(req, "user_login", "user", user.id, user.id, {
    email: user.email, role: user.role,
  });

  let studentProfile = null;
  let professorProfile = null;

  if (user.role === "student") {
    const [sp] = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.userId, user.id));
    studentProfile = sp || null;
  } else if (user.role === "professor") {
    const [pp] = await db.select().from(professorsTable).where(eq(professorsTable.userId, user.id));
    professorProfile = pp ? { ...pp, fullName: user.fullName, profilePhoto: user.profilePhoto, city: user.city } : null;
  }

  res.json({
    user: { ...user, passwordHash: undefined, studentProfile, professorProfile },
    token,
  });
});

// POST /api/auth/send-code — send a 6-digit OTP to email
router.post("/send-code", otpLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email || !EMAIL_RE.test(email.toLowerCase().trim())) {
    res.status(400).json({ error: "Email invalide" }); return;
  }
  const normalizedEmail = email.toLowerCase().trim();

  // Check email not already registered
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
  if (existing) {
    res.status(400).json({ error: "Cette adresse email est déjà utilisée" }); return;
  }

  // Invalidate previous codes for this email
  await db.update(emailVerificationsTable)
    .set({ used: true })
    .where(eq(emailVerificationsTable.email, normalizedEmail));

  const code = String(randomInt(100000, 1000000)); // cryptographically secure 6-digit OTP
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await db.insert(emailVerificationsTable).values({ email: normalizedEmail, code, expiresAt });

  sendOtpEmail(normalizedEmail, code);

  const IS_DEV = process.env["NODE_ENV"] !== "production";
  res.json({ success: true, message: "Code envoyé", ...(IS_DEV ? { devCode: code } : {}) });
});

// POST /api/auth/verify-code — verify the OTP
router.post("/verify-code", verifyLimiter, async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    res.status(400).json({ error: "Email et code requis" }); return;
  }
  const normalizedEmail = email.toLowerCase().trim();
  const now = new Date();

  const [verification] = await db.select().from(emailVerificationsTable)
    .where(and(
      eq(emailVerificationsTable.email, normalizedEmail),
      eq(emailVerificationsTable.code, String(code)),
      eq(emailVerificationsTable.used, false),
      gt(emailVerificationsTable.expiresAt, now),
    ));

  if (!verification) {
    res.status(400).json({ error: "Code incorrect ou expiré" }); return;
  }

  // Mark as used
  await db.update(emailVerificationsTable).set({ used: true }).where(eq(emailVerificationsTable.id, verification.id));

  res.json({ success: true, verified: true });
});

router.post("/register", registerLimiter, async (req, res) => {
  const {
    email, password, role, fullName, city, phone,
    subjects, gradeLevels, bio, qualifications, yearsExperience, currentSchool,
    gradeLevel, schoolName, termsAccepted,
  } = req.body;

  if (!email || !password || !role || !fullName) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  if (typeof email !== "string" || typeof password !== "string" ||
      typeof role !== "string" || typeof fullName !== "string") {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  if (!EMAIL_RE.test(normalizedEmail)) {
    res.status(400).json({ error: "Invalid email format" });
    return;
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    return;
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    res.status(400).json({ error: "Password is too long" });
    return;
  }

  if (fullName.trim().length === 0 || fullName.length > 200) {
    res.status(400).json({ error: "Invalid full name" });
    return;
  }

  // Prevent self-registration as admin
  if (!ALLOWED_ROLES.includes(role as AllowedRole)) {
    res.status(400).json({ error: "Invalid role. Must be 'student'" });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const merchantId = await getUniqueMerchantId();
  const verificationToken = randomBytes(32).toString("hex");
  const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const now = new Date();
  const [newUser] = await db.insert(usersTable).values({
    email: normalizedEmail,
    passwordHash: await hashPassword(password),
    role: role as AllowedRole,
    fullName: fullName.trim(),
    city: city || null,
    phone: phone || null,
    merchantId,
    emailVerified: false,
    emailVerificationToken: verificationToken,
    emailVerificationExpiresAt: verificationExpiresAt,
    termsAccepted: termsAccepted === true,
    termsAcceptedAt: termsAccepted === true ? now : null,
  }).returning();

  // Account verification email suppressed — the OTP email sent at /send-code
  // already welcomes the user. Re-enable when sending limits increase.

  let professorProfile = null;
  let studentProfile = null;

  if (role === "student") {
    const { educationSection } = req.body;
    const [sp] = await db.insert(studentProfilesTable).values({
      userId: newUser.id,
      preferredSubjects: [],
      gradeLevel: gradeLevel || null,
      educationSection: educationSection || null,
      schoolName: schoolName || null,
    }).returning();
    studentProfile = sp;
  } else if (role === "professor") {
    const [pp] = await db.insert(professorsTable).values({
      userId: newUser.id,
      subjects: subjects || [],
      gradeLevels: gradeLevels || [],
      bio: bio || null,
      qualifications: qualifications || null,
      yearsOfExperience: yearsExperience ? parseInt(yearsExperience) : null,
      currentSchool: currentSchool || null,
      status: "pending",
      isVerified: false,
      totalReviews: 0,
      totalStudents: 0,
    }).returning();
    professorProfile = pp ? { ...pp, fullName: newUser.fullName, city: newUser.city } : null;
  }

  const token = generateToken(newUser.id);

  // Set a session cookie (no rememberMe on registration — user must explicitly opt in on login)
  setSessionCookie(res, token, false);

  await logEvent(req, "user_registered", "user", newUser.id, newUser.id, {
    email: newUser.email, role: newUser.role, fullName: newUser.fullName,
  });

  res.json({
    user: { ...newUser, passwordHash: undefined, studentProfile, professorProfile },
    token,
  });
});

router.post("/change-password", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Current password and new password are required" });
    return;
  }

  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    res.status(400).json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    return;
  }

  if (newPassword.length > MAX_PASSWORD_LENGTH) {
    res.status(400).json({ error: "New password is too long" });
    return;
  }

  // Fetch user's current password hash from DB
  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.id, user.id));
  if (!dbUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const passwordValid = await verifyPassword(currentPassword, dbUser.passwordHash);
  if (!passwordValid) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const newHash = await hashPassword(newPassword);
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, user.id));

  res.json({ success: true });
});

router.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: IS_PROD ? "none" : "lax", secure: IS_PROD, path: "/" });
  res.json({ success: true });
});

// POST /api/auth/restore-session — used by exitImpersonation to put the admin cookie back
router.post("/restore-session", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const newToken = generateToken(user.id);
  setSessionCookie(res, newToken, true);
  res.json({ success: true, token: newToken });
});

// GET /api/auth/verify-email?token=TOKEN — click-to-verify link
router.get("/verify-email", async (req, res) => {
  const { token } = req.query as { token?: string };
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "Token manquant" }); return;
  }

  const [user] = await db.select().from(usersTable)
    .where(eq(usersTable.emailVerificationToken, token));

  if (!user) {
    res.status(400).json({ error: "Lien invalide" }); return;
  }

  if (user.emailVerified) {
    res.json({ success: true, alreadyVerified: true, role: user.role }); return;
  }

  if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
    res.status(400).json({ error: "Lien expiré" }); return;
  }

  await db.update(usersTable).set({
    emailVerified: true,
    emailVerificationToken: null,
    emailVerificationExpiresAt: null,
  }).where(eq(usersTable.id, user.id));

  res.json({ success: true, role: user.role });
});

// POST /api/auth/resend-verification — resend the confirmation email
router.post("/resend-verification", async (req, res) => {
  const { email } = req.body;
  if (!email || !EMAIL_RE.test(String(email).toLowerCase().trim())) {
    res.status(400).json({ error: "Email invalide" }); return;
  }
  const normalizedEmail = String(email).toLowerCase().trim();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
  if (!user) { res.status(404).json({ error: "Compte introuvable" }); return; }
  if (user.emailVerified) { res.status(400).json({ error: "Email déjà confirmé" }); return; }

  // Rate limit: allow resend only if last token was issued > 5 minutes ago
  if (user.emailVerificationExpiresAt) {
    const issuedAt = user.emailVerificationExpiresAt.getTime() - 24 * 60 * 60 * 1000;
    if (Date.now() - issuedAt < 5 * 60 * 1000) {
      res.status(429).json({ error: "Veuillez attendre 5 minutes avant de renvoyer." }); return;
    }
  }

  const newToken = randomBytes(32).toString("hex");
  const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.update(usersTable).set({
    emailVerificationToken: newToken,
    emailVerificationExpiresAt: newExpiry,
  }).where(eq(usersTable.id, user.id));

  if (ENABLE_EXTRA_EMAILS) {
    sendAccountVerificationEmail(
      { email: user.email, fullName: user.fullName, merchantId: user.merchantId },
      newToken
    );
  }

  res.json({ success: true, message: "Email de confirmation renvoyé." });
});

// Verify all unverified users (admin-only, one-time fix)
router.post("/verify-all-users", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin" && user.role !== "super_admin") {
    res.status(403).json({ error: "Admin only" }); return;
  }
  const result = await db.update(usersTable)
    .set({ emailVerified: true, emailVerificationToken: null, emailVerificationExpiresAt: null })
    .where(eq(usersTable.emailVerified, false));
  res.json({ success: true, message: "All users verified" });
});

// Backfill merchant IDs for existing users (one-time admin endpoint)
router.post("/backfill-merchant-ids", requireAuth, async (req, res) => {
  const user = (req as any).user;
  if (user.role !== "admin" && user.role !== "super_admin") {
    res.status(403).json({ error: "Admin only" }); return;
  }
  const usersWithoutId = await db.select().from(usersTable).where(eq(usersTable.merchantId, null as any));
  let count = 0;
  for (const u of usersWithoutId) {
    const mid = await getUniqueMerchantId();
    await db.update(usersTable).set({ merchantId: mid }).where(eq(usersTable.id, u.id));
    count++;
  }
  res.json({ updated: count });
});

export default router;
