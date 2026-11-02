const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const esc = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

async function rpc(fn: string, args: unknown = {}) {
  const response = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`${fn}: ${response.status} ${raw}`);
  return raw ? JSON.parse(raw) : null;
}

async function send(chat: number, text: string) {
  const response = await fetch(
    `https://api.telegram.org/bot${TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chat,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    },
  );
  return response.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" },
      { status: 405, headers: CORS });
  }

  let body: { code?: string; orgCode?: string; device?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  if (!body.code || !body.orgCode || !body.device) {
    return Response.json({ ok: false, error: "بيانات ناقصة" },
      { status: 400, headers: CORS });
  }

  let result;
  try {
    result = await rpc("delete_khatmah", {
      p_code: body.code,
      p_org_code: body.orgCode,
      p_device: body.device,
    });
  } catch {
    return Response.json({ ok: false, error: "تعذّر الاتصال" },
      { status: 503, headers: CORS });
  }
  if (!result?.ok) {
    return Response.json({ ok: false, error: result?.error ?? "غير مصرح" },
      { status: 403, headers: CORS });
  }

  const text = `🕌 <b>زاد الخير</b>

أُلغيت ختمة «${esc(result.title)}» من قِبَل منظّمها، ولن يصلك تذكير بعد اليوم.

جزاك الله خيرًا على ما قرأت، ولا يضيع عند الله شيء.`;

  let notified = 0;
  let failed = 0;
  for (const chat of result.chats ?? []) {
    if (await send(chat.chatId, text)) notified++;
    else failed++;
    await new Promise((resolve) => setTimeout(resolve, 60));
  }

  return Response.json({ ok: true, notified, failed }, { headers: CORS });
});
