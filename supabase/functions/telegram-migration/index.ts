import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const FINAL_URL = "https://zad-alkhair.net/";

Deno.serve((_req: Request) => new Response(
  JSON.stringify({ error: "telegram_migration_retired", url: FINAL_URL }),
  {
    status: 410,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    },
  },
));
