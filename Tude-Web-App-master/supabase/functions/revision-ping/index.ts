// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";

// These headers are sent back with every response so browsers allow
// cross-origin requests from the Vercel frontend.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",          // allow any origin (tighten later)
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

Deno.serve(async (req: Request): Promise<Response> => {
  // Browsers send an OPTIONS "preflight" request before the real request
  // to check if CORS is allowed. We must respond with 200 + CORS headers.
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Build the health-check payload
  const body = JSON.stringify({
    status: "ok",
    function: "revision-ping",
    timestamp: new Date().toISOString(),
  });

  return new Response(body, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
});
