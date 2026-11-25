/* ============================================================
   send-message — رسالة من المنظّم إلى مشارك أو إلى الجميع.
   قاعدة البيانات تتحقق من رمز المنظّم ومن جهازه، ولا تُخرج
   معرّفات محادثات تلغرام إلى المتصفح.
   ============================================================ */

import { CORS } from "../_shared/config.ts";
import { navRows } from "../_shared/links.ts";
import { loginToken, rpc } from "../_shared/supabase.ts";
import { eachConcurrently, pause, SEND_LANES, sendMessage } from "../_shared/telegram.ts";
import { esc } from "../_shared/text.ts";

/* رسالة بزرّي «افتح زاد الخير» (على الختمة) و«افتح المصحف» */
async function send(chat: number, text: string, code: string) {
  return sendMessage(chat, text, navRows(code, await loginToken(chat)));
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

  let sent = 0;
  let blocked = 0;
  let failed = 0;
  /* كل مشارك يكلف نحو ثانية (رابط الدخول ثم تيليغرام)، والواجهة تنتظر الرد، فيُرسل
     إلى عدة مشاركين معًا بدل واحد بعد واحد. أربعة مسارات تبقى بعيدة عن حدود تيليغرام. */
  const code = body.code;
  await eachConcurrently<{ chatId: number }>(target.chats ?? [], SEND_LANES, async (chat) => {
    const result = await send(chat.chatId, text, code);
    if (result.ok) sent++;
    else if (result.blocked) {
      blocked++;
      try {
        await rpc("unlink_by_chat", { p_chat: chat.chatId });
      } catch {
        /* لا يفشل الإرسال كله بسبب تنظيف الربط. */
      }
    } else failed++;
    await pause(60);
  });

  return Response.json({ ok: true, sent, blocked, failed, cut },
    { headers: CORS });
});
