import { Router } from "express";
import { db, userEventsTable, transactionsTable } from "@workspace/db";
import { requireAuth, requireSuperAdmin } from "../lib/auth";
import { sql, gte, and, eq, desc } from "drizzle-orm";

const router = Router();

// All routes: super_admin only
router.use(requireAuth, requireSuperAdmin);

function startOf(unit: "day" | "week" | "month"): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (unit === "week") d.setDate(d.getDate() - d.getDay());
  if (unit === "month") d.setDate(1);
  return d;
}

// Simple in-memory cache for the live endpoint (2s TTL)
let liveCache: { data: any; at: number } | null = null;

// ─── GET /api/admin/analytics/summary ────────────────────────────────────────
router.get("/summary", async (_req, res) => {
  try {
    const todayStart = startOf("day");
    const weekStart = startOf("week");
    const monthStart = startOf("month");

    async function countEvents(eventType: string, since: Date): Promise<number> {
      const [row] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(userEventsTable)
        .where(and(eq(userEventsTable.eventType, eventType), gte(userEventsTable.createdAt, since)));
      return row?.c ?? 0;
    }

    async function revenue(since: Date): Promise<number> {
      const [row] = await db
        .select({ total: sql<number>`coalesce(sum(platform_fee), 0)::float` })
        .from(transactionsTable)
        .where(and(eq(transactionsTable.status, "completed"), gte(transactionsTable.createdAt, since)));
      return row?.total ?? 0;
    }

    async function activeUsers(): Promise<number> {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      const [row] = await db
        .select({ c: sql<number>`count(distinct session_id)::int` })
        .from(userEventsTable)
        .where(gte(userEventsTable.createdAt, fiveMinAgo));
      return row?.c ?? 0;
    }

    const [
      todayPageViews, todaySignups, todayEnrollments,
      todayMonProf, todayAds, todayRevenue, todayActive,
      weekPageViews, weekSignups, weekEnrollments, weekRevenue,
      monthPageViews, monthSignups, monthEnrollments, monthRevenue,
    ] = await Promise.all([
      countEvents("page_view", todayStart),
      countEvents("signup_completed", todayStart),
      countEvents("class_enrolled", todayStart),
      countEvents("mon_prof_question_asked", todayStart),
      countEvents("ad_completed", todayStart),
      revenue(todayStart),
      activeUsers(),
      countEvents("page_view", weekStart),
      countEvents("signup_completed", weekStart),
      countEvents("class_enrolled", weekStart),
      revenue(weekStart),
      countEvents("page_view", monthStart),
      countEvents("signup_completed", monthStart),
      countEvents("class_enrolled", monthStart),
      revenue(monthStart),
    ]);

    res.json({
      today: {
        pageViews: todayPageViews,
        signups: todaySignups,
        enrollments: todayEnrollments,
        revenue: todayRevenue,
        monProfQuestions: todayMonProf,
        adsCompleted: todayAds,
        activeUsers: todayActive,
      },
      thisWeek: { pageViews: weekPageViews, signups: weekSignups, enrollments: weekEnrollments, revenue: weekRevenue },
      thisMonth: { pageViews: monthPageViews, signups: monthSignups, enrollments: monthEnrollments, revenue: monthRevenue },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/admin/analytics/charts?days=30 ─────────────────────────────────
router.get("/charts", async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(String(req.query["days"] ?? "30"), 10) || 30, 1), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [dailyPageViews, dailySignups, dailyEnrollments, topPages, deviceBreakdown, peakHours, monProfDaily] =
      await Promise.all([
        db.execute(sql`
          SELECT date_trunc('day', created_at)::date::text AS date, count(*)::int AS count
          FROM user_events
          WHERE event_type = 'page_view' AND created_at >= ${since}
          GROUP BY 1 ORDER BY 1
        `),
        db.execute(sql`
          SELECT date_trunc('day', created_at)::date::text AS date, count(*)::int AS count
          FROM user_events
          WHERE event_type = 'signup_completed' AND created_at >= ${since}
          GROUP BY 1 ORDER BY 1
        `),
        db.execute(sql`
          SELECT date_trunc('day', created_at)::date::text AS date, count(*)::int AS count
          FROM user_events
          WHERE event_type = 'class_enrolled' AND created_at >= ${since}
          GROUP BY 1 ORDER BY 1
        `),
        db.execute(sql`
          SELECT page, count(*)::int AS count
          FROM user_events
          WHERE page IS NOT NULL AND created_at >= ${since}
          GROUP BY page ORDER BY count DESC LIMIT 10
        `),
        db.execute(sql`
          SELECT device_type AS device, count(*)::int AS count
          FROM user_events
          WHERE device_type IS NOT NULL AND created_at >= ${since}
          GROUP BY device_type
        `),
        db.execute(sql`
          SELECT extract(hour FROM created_at)::int AS hour, count(*)::int AS count
          FROM user_events
          WHERE created_at >= ${since}
          GROUP BY hour ORDER BY hour
        `),
        db.execute(sql`
          SELECT date_trunc('day', created_at)::date::text AS date, count(*)::int AS count
          FROM user_events
          WHERE event_type = 'mon_prof_question_asked' AND created_at >= ${since}
          GROUP BY 1 ORDER BY 1
        `),
      ]);

    res.json({
      dailyPageViews: (dailyPageViews as any).rows ?? dailyPageViews,
      dailySignups: (dailySignups as any).rows ?? dailySignups,
      dailyEnrollments: (dailyEnrollments as any).rows ?? dailyEnrollments,
      topPages: (topPages as any).rows ?? topPages,
      deviceBreakdown: (deviceBreakdown as any).rows ?? deviceBreakdown,
      peakHours: (peakHours as any).rows ?? peakHours,
      monProfDaily: (monProfDaily as any).rows ?? monProfDaily,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/admin/analytics/cookie-consent ─────────────────────────────────
router.get("/cookie-consent", async (_req, res) => {
  try {
    const [rows] = await Promise.all([
      db.execute(sql`
        SELECT
          count(*) FILTER (WHERE event_type = 'cookies_accepted')::int AS accepted,
          count(*) FILTER (WHERE event_type = 'cookies_rejected')::int AS rejected,
          count(*) FILTER (WHERE event_type = 'cookies_customized')::int AS customized,
          count(*) FILTER (WHERE event_type IN ('cookies_accepted','cookies_rejected','cookies_customized'))::int AS total,
          count(*) FILTER (WHERE event_type = 'cookies_customized' AND (event_data->>'analytics')::boolean = true)::int AS analytics_on,
          count(*) FILTER (WHERE event_type = 'cookies_customized' AND (event_data->>'advertising')::boolean = true)::int AS advertising_on
        FROM user_events
      `),
    ]);
    const r = ((rows as any).rows ?? rows)[0] ?? {};
    const total = r.total ?? 0;
    const accepted = r.accepted ?? 0;
    res.json({
      accepted,
      rejected: r.rejected ?? 0,
      customized: r.customized ?? 0,
      analyticsOn: r.analytics_on ?? 0,
      advertisingOn: r.advertising_on ?? 0,
      total,
      acceptanceRate: total > 0 ? ((accepted / total) * 100).toFixed(1) + "%" : "0%",
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/admin/analytics/live ───────────────────────────────────────────
router.get("/live", async (_req, res) => {
  try {
    if (liveCache && Date.now() - liveCache.at < 2000) {
      res.json(liveCache.data);
      return;
    }

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

    const [activeRow, pagesRows, eventsRows] = await Promise.all([
      db.execute(sql`
        SELECT count(distinct session_id)::int AS count
        FROM user_events WHERE created_at >= ${fiveMinAgo}
      `),
      db.execute(sql`
        SELECT page, count(*)::int AS count
        FROM user_events
        WHERE page IS NOT NULL AND created_at >= ${fiveMinAgo}
        GROUP BY page ORDER BY count DESC LIMIT 10
      `),
      db
        .select({
          eventType: userEventsTable.eventType,
          page: userEventsTable.page,
          deviceType: userEventsTable.deviceType,
          createdAt: userEventsTable.createdAt,
          userId: userEventsTable.userId,
        })
        .from(userEventsTable)
        .orderBy(desc(userEventsTable.createdAt))
        .limit(20),
    ]);

    const data = {
      activeNow: ((activeRow as any).rows ?? activeRow)[0]?.count ?? 0,
      currentPages: (pagesRows as any).rows ?? pagesRows,
      recentEvents: eventsRows,
    };

    liveCache = { data, at: Date.now() };
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/admin/analytics/export?days=30 ─────────────────────────────────
router.get("/export", async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(String(req.query["days"] ?? "30"), 10) || 30, 1), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = await db.execute(sql`
      SELECT
        created_at::text AS date,
        event_type,
        page,
        device_type,
        coalesce(user_id::text, '') AS user_id_hash,
        session_id
      FROM user_events
      WHERE created_at >= ${since}
      ORDER BY created_at DESC
      LIMIT 50000
    `);

    const data: any[] = (rows as any).rows ?? (rows as any);

    const header = "date,event_type,page,device_type,user_id_hash,session_id\n";
    const csvRows = data.map((r: any) => {
      const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      return [r.date, r.event_type, r.page, r.device_type, r.user_id_hash, r.session_id].map(escape).join(",");
    });

    const csv = header + csvRows.join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="etude-analytics-${days}days.csv"`);
    res.send(csv);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
