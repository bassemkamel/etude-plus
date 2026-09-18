import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import router from "./routes";

const app: Express = express();
const IS_PROD = process.env["NODE_ENV"] === "production";

// Trust exactly one proxy hop (Railway's edge load balancer).
// This makes req.ip the real client IP from X-Forwarded-For and
// suppresses Railway's "trust proxy is false" warning.
// '1' is safer than 'true': it ignores any client-supplied hops beyond
// the one Railway itself appends, preventing IP spoofing.
app.set("trust proxy", 1);

// ── Security headers ────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // allow image/file CDN serving
  contentSecurityPolicy: false, // frontend is on a separate domain; CSP is set there
}));

// ── CORS — fail CLOSED in production if CORS_ORIGINS is not set ────────────
const rawCorsOrigins = process.env["CORS_ORIGINS"];
const allowedOrigins: string[] = rawCorsOrigins
  ? rawCorsOrigins.split(",").map((o) => o.trim()).filter(Boolean)
  : [];

if (IS_PROD && allowedOrigins.length === 0) {
  console.error("FATAL: CORS_ORIGINS is not set in production. Refusing to start with open CORS.");
  process.exit(1);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header means the request is from curl, a health checker, Railway's own
      // health probes, or server-to-server calls — none of which are subject to CORS
      // (CORS is a browser-only mechanism). Always allow these.
      if (!origin) {
        return callback(null, true);
      }
      // In development, allow all browser origins too.
      if (!IS_PROD) {
        return callback(null, true);
      }
      // In production: only allow browsers from the declared allowlist.
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Body parsing ─────────────────────────────────────────────────────────────
// Storage uploads (base64 file content) need a higher limit than other routes
app.use("/api/storage/uploads/direct", express.json({ limit: "20mb" }));

app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Root health/landing — responds to Railway health probes and direct browser visits
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "Étude+ API" });
});

app.use("/api", router);

// 404 handler — return JSON for unknown API routes
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler — return JSON, never leak internal details in production
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err?.status ?? err?.statusCode ?? 500;
  // In production, hide internal error messages from clients
  const message = IS_PROD && status >= 500
    ? "Internal server error"
    : (err?.message ?? "Internal server error");
  if (status >= 500) console.error("Express error:", err);
  res.status(status).json({ error: message });
});

export default app;
