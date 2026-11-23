/* ============================================================
   announce — إشعار اكتمال الختمة أو بدء دورة جديدة.
   لكل مستقبِل سجل تسليم مستقل، فلا تتكرر الرسالة عند الإعادة.
   ============================================================ */

import { CORS } from "../_shared/config.ts";
import { doneText } from "../_shared/completion.ts";
import { navRows } from "../_shared/links.ts";
import { loginToken, rpc } from "../_shared/supabase.ts";
import { eachConcurrently, pause, SEND_LANES, sendMessage } from "../_shared/telegram.ts";
import { esc, fmtDate } from "../_shared/text.ts";

/* رسالة بزرّي «افتح زاد الخير» (على الختمة) و«افتح المصحف» */
async function send(chat: number, text: string, code?: string) {
  return sendMessage(chat, text, navRows(code, await loginToken(chat)));
}

type RoundInfo = {
  title?: string;
  dedication?: string;
  endDate?: string;
};

function roundText(result: RoundInfo, name: string) {
  const dedication = result.dedication
    ? `\nعلى نية: ${esc(result.dedication)}`
    : "";
  return `🕌 <b>زاد الخير</b>\n\nالسلام عليكم يا ${esc(name)}\n\n<b>بدأت ختمة جديدة: ${esc(result.title)}</b>${dedication}\nتنتهي: ${fmtDate(result.endDate ?? "")}\n\n﴿ وَالسَّابِقُونَ السَّابِقُونَ ۝ أُولَئِكَ الْمُقَرَّبُونَ ﴾\n— الواقعة: ١٠-١١\n\nالأجزاء الثلاثون متاحة الآن، فبادر واحجز جزءك.\n\nقال ﷺ:\n«اقْرَؤُوا الْقُرْآنَ؛ فَإِنَّهُ يَأْتِي يَوْمَ الْقِيَامَةِ شَفِيعًا لِأَصْحَابِهِ»\n— رواه مسلم\n\nبادر قبل أن تفوتك الغنائم ✨`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" },
      { status: 405, headers: CORS });
  }

  let body: {
    kind?: "done" | "round";
    code?: string;
    orgCode?: string;
    device?: string;
    end?: string;
    requestId?: string;
  };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  if (!body.code || (body.kind !== "done" && body.kind !== "round")) {
    return Response.json({ ok: false, error: "بيانات ناقصة" },
      { status: 400, headers: CORS });
  }
  if (body.kind === "round" &&
      (!body.orgCode || !body.device || !body.end || !body.requestId)) {
    return Response.json({ ok: false, error: "بيانات ناقصة" },
      { status: 400, headers: CORS });
  }

  let result;
  try {
    result = body.kind === "done"
      ? await rpc("khatmah_done_info", { p_code: body.code })
      : await rpc("new_round_info", {
        p_code: body.code,
        p_org_code: body.orgCode,
        p_end: body.end,
        p_device: body.device,
        p_request: body.requestId,
      });
  } catch {
    return Response.json({ ok: false, error: "تعذّر الاتصال" },
      { status: 503, headers: CORS });
  }

  if (result?.retry) {
    return Response.json({ ok: false, error: "التسليم قيد التنفيذ" }, {
      status: 409,
      headers: { ...CORS, "Retry-After": "900" },
    });
  }
  if (!result?.ok) {
    return Response.json({ ok: false, error: result?.error ?? "غير مصرح" },
      { status: body.kind === "round" ? 403 : 400, headers: CORS });
  }
  if (result.skip) {
    return Response.json({ ok: true, skipped: true }, { headers: CORS });
  }

  let sent = 0;
  let blocked = 0;
  let failed = 0;

  /* كل مشارك يكلف نحو ثانية (رابط الدخول ثم تيليغرام ثم تسجيل التسليم)، والواجهة تنتظر
     الرد عند بدء ختمة جديدة، فيُرسل إلى عدة مشاركين معًا. أربعة مسارات تبقى بعيدة عن حدود تيليغرام. */
  type Chat = { chatId: number; name: string; deliveryId: string };
  await eachConcurrently<Chat>(result.chats ?? [], SEND_LANES, async (chat) => {
    const text = body.kind === "done"
      ? doneText(result)
      : roundText(result, chat.name);
    const delivery = await send(chat.chatId, text, body.code);
    if (delivery.ok) sent++;
    else if (delivery.blocked) {
      blocked++;
      await rpc("unlink_by_chat", { p_chat: chat.chatId }).catch(() => null);
    } else failed++;

    try {
      await rpc("notification_finish", {
        p_delivery: chat.deliveryId,
        p_ok: delivery.ok,
        p_permanent: delivery.blocked,
      });
    } catch {
      failed++;
    }
    await pause(60);
  });

  if (body.kind === "done" && failed > 0) {
    return Response.json({ ok: false, sent, blocked, failed },
      { status: 503, headers: CORS });
  }
  return Response.json({ ok: true, sent, blocked, failed,
    roundNo: result.roundNo }, { headers: CORS });
});
