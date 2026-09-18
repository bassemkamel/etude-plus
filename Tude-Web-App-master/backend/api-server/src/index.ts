process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT EXCEPTION:", error);
  process.exit(1);
});

console.log("Loading app...");
import app from "./app.js";
import { runStartupMigrations } from "./lib/startupMigrations.js";
// MVP: live sessions suppressed — scheduler disabled
// import { startSessionScheduler } from "./services/sessionScheduler.js";

console.log("Checking environment variables...");
const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);
if (!process.env["DATABASE_URL"]) throw new Error("DATABASE_URL environment variable is required but was not provided.");
if (!process.env["TOKEN_SECRET"] || process.env["TOKEN_SECRET"].length < 32) {
  throw new Error("TOKEN_SECRET environment variable is required and must be at least 32 characters long.");
}

const IS_PROD_STARTUP = process.env["NODE_ENV"] === "production";
if (IS_PROD_STARTUP) {
  if (!process.env["APP_URL"]) {
    // Fatal: without APP_URL, email verification links point to localhost and users can never verify their email.
    throw new Error("APP_URL environment variable is required in production (email links will otherwise point to localhost).");
  }
  if (!process.env["RESEND_API_KEY"]) {
    // Non-fatal but critical: registration OTPs and all transactional emails will silently be dropped.
    console.warn("WARNING: RESEND_API_KEY is not set. All transactional emails (OTP, welcome, etc.) will be silently dropped in production.");
  }
  if (!process.env["IP_HASH_SALT"]) {
    console.warn("WARNING: IP_HASH_SALT is not set. Falling back to default salt — set a random secret to strengthen IP pseudonymisation.");
  }
}

async function main() {
  console.log("Running startup migrations...");
  await runStartupMigrations();

  console.log("Starting HTTP listener...");
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log("Server ready.");
    // startSessionScheduler(); // MVP: suppressed
  });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
