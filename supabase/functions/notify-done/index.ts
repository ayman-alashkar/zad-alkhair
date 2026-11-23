/* ============================================================
   notify-done — رسالة شكر فور تعليم الجزء مقروءًا.
   قاعدة البيانات تتحقق من الإنجاز وتحجز تسليمًا لا يتكرر.
   ============================================================ */

import { CORS } from "../_shared/config.ts";
import { rpc } from "../_shared/supabase.ts";
import { sendMessage } from "../_shared/telegram.ts";
import { ar, esc, JUZ } from "../_shared/text.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" },
      { status: 405, headers: CORS });
  }

  let body: { code?: string; id?: string; num?: number };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  if (!body.code || !body.id || !Number.isInteger(body.num) ||
      body.num! < 1 || body.num! > 30) {
    return Response.json({ ok: true, skipped: true }, { headers: CORS });
  }

  let delivery;
  try {
    delivery = await rpc("chat_for_done", {
      p_code: body.code,
      p_id: body.id,
      p_num: body.num,
    });
  } catch {
    return Response.json({ ok: false, error: "تعذّر الاتصال" },
      { status: 503, headers: CORS });
  }

  if (delivery?.retry) {
    return Response.json({ ok: false, error: "التسليم قيد التنفيذ" }, {
      status: 409,
      headers: { ...CORS, "Retry-After": "900" },
    });
  }
  if (delivery?.skip || !delivery?.deliveryId || !delivery?.chatId) {
    return Response.json({ ok: true, skipped: true }, { headers: CORS });
  }

  const num = body.num!;
  const mine: number[] = delivery.mine ?? [];
  let rest = "";
  if (mine.length === 1) {
    rest = `\n\nوبقي عليك الجزء ${ar(mine[0])} — ${JUZ[mine[0] - 1]}.`;
  } else if (mine.length === 2) {
    rest = `\n\nوبقي عليك الجزءان ${ar(mine[0])} و${ar(mine[1])}.`;
  } else if (mine.length > 2) {
    rest = `\n\nوبقي عليك ${ar(mine.length)} أجزاء: ${mine.map(ar).join("، ")}.`;
  }
  const more = mine.length === 0 && delivery.freeCount > 0
    ? `\n\nوإن أردت الزيادة، ما زال في الختمة ${ar(delivery.freeCount)} ${
      delivery.freeCount === 1 ? "جزء متاح" : "أجزاء متاحة"
    }.`
    : "";

  const text = `🕌 <b>زاد الخير</b>

تقبّل الله منك يا ${esc(delivery.name)}. أتممت الجزء ${ar(num)} — ${JUZ[num - 1]}، ولن يصلك بعد اليوم تذكير به.

«مَنْ قَرَأَ حَرْفًا مِنْ كِتَابِ اللَّهِ فَلَهُ بِهِ حَسَنَةٌ، وَالْحَسَنَةُ بِعَشْرِ أَمْثَالِهَا»
— رواه الترمذي وقال: حسن صحيح${rest}${more}

ــــــ
هل صادفت في هذا الجزء آية أو معنًى ترك فيك أثرًا جميلًا، ووددتَ لو أن كل من يتدارسون القرآن معك في هذه الختمة على دراية به؟`;

  const result = await sendMessage(delivery.chatId, text, [[
    { text: "نعم", callback_data: `ask:${body.code}:${num}` },
    { text: "ليس الآن", callback_data: `not:${body.code}` },
  ]]);

  try {
    if (result.blocked) {
      await rpc("unlink_by_chat", { p_chat: delivery.chatId }).catch(() => null);
    }
    await rpc("notification_finish", {
      p_delivery: delivery.deliveryId,
      p_ok: result.ok,
      p_permanent: result.blocked,
    });
  } catch {
    return Response.json({ ok: false, error: "تعذّر تثبيت التسليم" },
      { status: 503, headers: CORS });
  }

  if (result.ok || result.blocked) {
    return Response.json({ ok: true, blocked: result.blocked }, { headers: CORS });
  }
  return Response.json({ ok: false, error: result.error ?? "تعذّر الإرسال" },
    { status: 503, headers: CORS });
});
