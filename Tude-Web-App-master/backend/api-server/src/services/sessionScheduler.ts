/**
 * Session Scheduler
 * Runs every 2 minutes — automatically marks live sessions as "ended"
 * once their scheduled end time (scheduledAt + durationHours) has passed.
 */

import { db, liveSessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export function startSessionScheduler(): void {
  const tick = async () => {
    try {
      const now = new Date();
      const liveSessions = await db
        .select()
        .from(liveSessionsTable)
        .where(eq(liveSessionsTable.status, "live"));

      for (const session of liveSessions) {
        const endTime = new Date(
          new Date(session.scheduledAt).getTime() + session.durationHours * 60 * 60 * 1000
        );
        if (endTime <= now) {
          await db
            .update(liveSessionsTable)
            .set({ status: "ended" })
            .where(eq(liveSessionsTable.id, session.id));
          console.log(`[SessionScheduler] Auto-completed session ${session.id} (${session.title})`);
        }
      }
    } catch (err) {
      console.error("[SessionScheduler] Error during tick:", err);
    }
  };

  // First tick after 30s (let the server fully start), then every 2 minutes
  setTimeout(() => {
    tick();
    setInterval(tick, 2 * 60 * 1000);
  }, 30_000);

  console.log("[SessionScheduler] Started — will auto-complete sessions every 2 minutes.");
}
