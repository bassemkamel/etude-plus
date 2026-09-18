/**
 * Seed script: creates the super_admin account (rayan@etude.com / etude123)
 * and upserts it safely so it can be run multiple times.
 *
 * Usage:
 *   DATABASE_URL=<your-neon-or-local-url> npx tsx scripts/seed-admin.ts
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL is not set.");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes("neon") ? { rejectUnauthorized: false } : undefined });
const db = drizzle(pool);

// Inline schema refs to avoid workspace import issues in standalone script
import { usersTable } from "../db/src/schema/index.js";

async function main() {
  const email = "rayan@etude.com";
  const password = "etude123";
  const fullName = "Rayan Super Admin";

  const passwordHash = await bcrypt.hash(password, 12);

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (existing) {
    await db.update(usersTable)
      .set({ role: "super_admin", passwordHash, fullName })
      .where(eq(usersTable.email, email));
    console.log(`✅  Updated existing account ${email} → role: super_admin`);
  } else {
    await db.insert(usersTable).values({
      email,
      passwordHash,
      role: "super_admin",
      fullName,
      city: "Tunis",
    });
    console.log(`✅  Created super_admin account: ${email}`);
  }

  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  await pool.end();
}

main().catch(err => {
  console.error("❌  Seed failed:", err.message);
  process.exit(1);
});
