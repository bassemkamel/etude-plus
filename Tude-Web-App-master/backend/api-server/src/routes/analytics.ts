import { Router } from "express";
import { db, userEventsTable } from "@workspace/db";
import crypto from "crypto";
import type { Request, Response } from "express";

const router = Router();

const ALLOWED_EVENT_TYPES = new Set([
  "page_view", "login", "logout", "signup_started", "signup_completed",
  "email_verified", "class_viewed", "class_enrolled", "content_viewed",
  "quiz_started", "quiz_completed", "test_started", "test_submitted",
  "live_session_joined", "mon_prof_opened", "mon_prof_question_asked",
  "ad_shown", "ad_completed", "class_created", "content_uploaded",
  "quiz_created", "test_created", "live_session_created",
  "cookies_accepted", "cookies_rejected", "cookies_customized",
]);

// Simple in-memory rate limiter: 100 req/min per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  if (entry.count >= 100) return true;
  entry.count++;
  return false;
}

// Prune stale entries every 5 minutes to avoid memory leak
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((v, k) => { if (now > v.resetAt) rateLimitMap.delete(k); });
}, 5 * 60_000);

function hashIp(ip: string): string {
  return crypto
    .createHash("sha256")
    .update(ip + (process.env["IP_HASH_SALT"] ?? "etude_ip"))
    .digest("hex")
    .slice(0, 16);
}

function detectDevice(ua: string): "mobile" | "tablet" | "desktop" {
  if (/mobile/i.test(ua)) return "mobile";
  if (/tablet|ipad/i.test(ua)) return "tablet";
  return "desktop";
}

function getIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    ""
  );
}

// POST /api/analytics/event — public, no auth required
router.post("/event", async (req: Request, res: Response) => {
  try {
    const ip = getIp(req);
    if (isRateLimited(ip)) {
      res.status(429).json({ error: "Too many requests" });
      return;
    }

    // Accept both snake_case (spec) and camelCase (legacy) field names
    const sessionId: string = req.body.session_id ?? req.body.sessionId ?? "";
    const eventType: string = req.body.event_type ?? req.body.eventType ?? "";
    const eventData = req.body.event_data ?? req.body.eventData ?? null;
    const page: string | null = req.body.page ?? null;

    if (!sessionId || typeof sessionId !== "string" || sessionId.length > 128) {
      res.status(400).json({ error: "Invalid session_id" });
      return;
    }

    if (!eventType || !ALLOWED_EVENT_TYPES.has(eventType)) {
      res.status(400).json({ error: "Invalid event_type" });
      return;
    }

    const ua = req.headers["user-agent"] ?? "";
    const userId: number | null = (req as any).user?.id ?? null;

    await db.insert(userEventsTable).values({
      userId,
      sessionId,
      eventType,
      eventData: eventData ?? null,
      page: typeof page === "string" ? page.slice(0, 512) : null,
      deviceType: detectDevice(ua),
      ipHash: ip ? hashIp(ip) : null,
    });

    res.json({ success: true });
  } catch {
    // Never crash — silently swallow all errors
    res.json({ success: true });
  }
});

export default router;
