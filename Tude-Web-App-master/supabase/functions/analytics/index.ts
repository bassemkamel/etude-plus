import { createClient } from "@supabase/functions-js";

const ALLOWED_ORIGINS = (
  Deno.env.get("ALLOWED_ORIGINS") ??
  Deno.env.get("ALLOWED_ORIGIN") ??
  "https://tude-web-app-etude-plus-xi.vercel.app"
).split(",").map((s) => s.trim()).filter(Boolean);

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };
}

function json(data: unknown, status = 200, req?: Request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...(req ? corsHeaders(req) : {}), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  const url = new URL(req.url);

  // GET: return summary stub for any sub-path
  if (req.method === "GET") {
    return json(
      { summary: {}, charts: [], cookieConsent: [], live: 0, events: [] },
      200,
      req,
    );
  }

  // POST: attempt to store the event, succeed silently either way
  if (req.method === "POST") {
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (supabaseUrl && supabaseKey) {
        const body = await req.json().catch(() => ({}));
        const supabase = createClient(supabaseUrl, supabaseKey);

        await supabase.from("analytics_events").insert({
          event_name: body?.event_name ?? body?.event ?? "unknown",
          properties: body?.properties ?? body ?? {},
          created_at: new Date().toISOString(),
        });
      }
    } catch (_err) {
      // Silently succeed — table may not exist yet
    }

    return json({ ok: true }, 200, req);
  }

  return json({ ok: true }, 200, req);
});
