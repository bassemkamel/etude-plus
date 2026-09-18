import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const hash = await bcrypt.hash("etude123", 12);

const result = await db
  .update(usersTable)
  .set({ passwordHash: hash, emailVerified: true })
  .where(eq(usersTable.email, "rayan@etude.com"))
  .returning({ id: usersTable.id, email: usersTable.email });

if (result.length === 0) {
  console.error("No user found with email rayan@etude.com");
  process.exit(1);
}

console.log("Password updated successfully for", result[0].email);
process.exit(0);
