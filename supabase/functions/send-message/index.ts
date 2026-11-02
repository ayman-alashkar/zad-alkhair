/* ============================================================
   send-message — رسالة من المنظّم إلى مشارك أو إلى الجميع.
   قاعدة البيانات تتحقق من رمز المنظّم ومن جهازه، ولا تُخرج
   معرّفات محادثات تلغرام إلى المتصفح.
   ============================================================ */

const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FINAL_ORIGIN = "https://zad-alkhair.net";
const APP_URL = FINAL_ORIGIN;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const esc = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

function readerLink(code?: string, juz?: number) {
  if (!APP_URL) return "";
  try {
    const root = new URL(APP_URL);
    root.hash = "";
    root.search = "";
    if (!root.pathname.endsWith("/")) {
      const last = root.pathname.split("/").pop() ?? "";
      root.pathname = last.includes(".")
        ? root.pathname.replace(/[^/]*$/, "")
        : root.pathname + "/";
    }
    const url = new URL("reader.html", root);
    if (Number.isInteger(juz) && Number(juz) >= 1 && Number(juz) <= 30) {
      url.searchParams.set("juz", String(juz));
    }
    if (code) url.searchParams.set("code", String(code).trim().toUpperCase());
    return url.href;
  } catch {
    return APP_URL;
  }
}

function navigationRows(sourceUrl: string) {
  try {
    const source = new URL(sourceUrl);
    const code = (source.searchParams.get("code") ?? "").trim().toUpperCase();
    const root = new URL(APP_URL || source.origin);
    root.hash = "";
    root.search = "";
    if (!root.pathname.endsWith("/")) {
      const last = root.pathname.split("/").pop() ?? "";
      root.pathname = last.includes(".")
        ? root.pathname.replace(/[^/]*$/, "")
        : root.pathname + "/";
    }
    const app = new URL(root.href);
    if (code) app.hash = code;
    const reader = new URL("reader.html", root);
    return [[
      { text: "افتح زاد الخير", url: app.href },
      { text: "افتح المصحف", url: reader.href },
    ]];
  } catch {
    return [[{ text: "افتح زاد الخير", url: sourceUrl }]];
  }
}

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

async function send(chat: number, text: string, url?: string) {
  const body: Record<string, unknown> = {
    chat_id: chat,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (url) {
    body.reply_markup = { inline_keyboard: navigationRows(url) };
  }
  const response = await fetch(
    `https://api.telegram.org/bot${TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (response.ok) return { ok: true, blocked: false };
  const result = await response.json().catch(() => ({}));
  const description = String(result?.description ?? response.status);
  const blocked = response.status === 403 ||
    /blocked|deactivated|chat not found/i.test(description);
  return { ok: false, blocked, error: description };
}

const LIMIT = 3800;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" },
      { status: 405, headers: CORS });
  }

  let body: {
    code?: string;
    orgCode?: string;
    device?: string;
    to?: string;
    text?: string;
  };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const message = (body.text ?? "").trim();
  if (!body.code || !body.orgCode || !body.device || !message) {
    return Response.json({ ok: false, error: "بيانات ناقصة" },
      { status: 400, headers: CORS });
  }

  let target;
  try {
    target = body.to
      ? await rpc("chat_of", {
        p_code: body.code,
        p_org_code: body.orgCode,
        p_id: body.to,
        p_device: body.device,
      })
      : await rpc("chats_all", {
        p_code: body.code,
        p_org_code: body.orgCode,
        p_device: body.device,
      });
  } catch {
    return Response.json({ ok: false, error: "تعذّر الاتصال" },
      { status: 503, headers: CORS });
  }
  if (!target?.ok) {
    return Response.json({ ok: false, error: target?.error ?? "غير مصرح" },
      { status: 403, headers: CORS });
  }

  const cut = message.length > LIMIT;
  const safeMessage = cut ? `${message.slice(0, LIMIT)}…` : message;
  const text = `🕌 <b>${esc(target.title)}</b>\n\n${esc(safeMessage)}`;
  const link = readerLink(body.code) || undefined;

  let sent = 0;
  let blocked = 0;
  let failed = 0;
  for (const chat of target.chats ?? []) {
    const result = await send(chat.chatId, text, link);
    if (result.ok) sent++;
    else if (result.blocked) {
      blocked++;
      try {
        await rpc("unlink_by_chat", { p_chat: chat.chatId });
      } catch {
        /* لا يفشل الإرسال كله بسبب تنظيف الربط. */
      }
    } else failed++;
    await new Promise((resolve) => setTimeout(resolve, 60));
  }

  return Response.json({ ok: true, sent, blocked, failed, cut },
    { headers: CORS });
});
