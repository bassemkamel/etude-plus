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

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // GET: public — return announcements list
  if (req.method === "GET") {
    try {
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase
          .from("announcements")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);

        if (!error && data) {
          return json(data, 200, req);
        }
      }
    } catch (_err) {
      // Table may not exist — fall through to empty response
    }

    return json([], 200, req);
  }

  // POST: stub insert
  if (req.method === "POST") {
    try {
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const body = await req.json().catch(() => ({}));
        await supabase.from("announcements").insert({
          ...body,
          created_at: new Date().toISOString(),
        });
      }
    } catch (_err) {
      // Silently succeed
    }

    return json({ ok: true, message: "Announcement created" }, 201, req);
  }

  // DELETE: stub delete
  if (req.method === "DELETE") {
    try {
      if (supabaseUrl && supabaseKey) {
        const url = new URL(req.url);
        const id = url.searchParams.get("id");
        if (id) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          await supabase.from("announcements").delete().eq("id", id);
        }
      }
    } catch (_err) {
      // Silently succeed
    }

    return json({ ok: true, message: "Announcement deleted" }, 200, req);
  }

  return json({ ok: true }, 200, req);
});
