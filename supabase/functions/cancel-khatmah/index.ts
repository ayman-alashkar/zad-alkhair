/* ============================================================
   cancel-khatmah — إنهاء الختمة بأمر منظّمها، وإبلاغ المشاركين.
   ============================================================ */

import { CORS } from "../_shared/config.ts";
import { rpc } from "../_shared/supabase.ts";
import { pause, sendMessage } from "../_shared/telegram.ts";
import { esc } from "../_shared/text.ts";

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
    if ((await sendMessage(chat.chatId, text)).ok) notified++;
    else failed++;
    await pause(60);
  }

  return Response.json({ ok: true, notified, failed }, { headers: CORS });
});
