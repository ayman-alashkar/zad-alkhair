/* ============================================================
   notify-done — رسالة شكر فور تعليم الجزء مقروءًا.
   قاعدة البيانات تتحقق من الإنجاز وتحجز تسليمًا لا يتكرر.
   ============================================================ */

const TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const AR = "٠١٢٣٤٥٦٧٨٩";
const ar = (value: number | string) =>
  String(value).replace(/\d/g, (digit) => AR[+digit]);
const esc = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

const JUZ = [
  "الفاتحة ١ – البقرة ١٤١", "البقرة ١٤٢ – ٢٥٢", "البقرة ٢٥٣ – آل عمران ٩٢", "آل عمران ٩٣ – النساء ٢٣",
  "النساء ٢٤ – ١٤٧", "النساء ١٤٨ – المائدة ٨١", "المائدة ٨٢ – الأنعام ١١٠", "الأنعام ١١١ – الأعراف ٨٧",
  "الأعراف ٨٨ – الأنفال ٤٠", "الأنفال ٤١ – التوبة ٩٢", "التوبة ٩٣ – هود ٥", "هود ٦ – يوسف ٥٢",
  "يوسف ٥٣ – إبراهيم ٥٢", "الحجر ١ – النحل ١٢٨", "الإسراء ١ – الكهف ٧٤", "الكهف ٧٥ – طه ١٣٥",
  "الأنبياء ١ – الحج ٧٨", "المؤمنون ١ – الفرقان ٢٠", "الفرقان ٢١ – النمل ٥٥", "النمل ٥٦ – العنكبوت ٤٥",
  "العنكبوت ٤٦ – الأحزاب ٣٠", "الأحزاب ٣١ – يس ٢٧", "يس ٢٨ – الزمر ٣١", "الزمر ٣٢ – فصلت ٤٦",
  "فصلت ٤٧ – الجاثية ٣٧", "الأحقاف ١ – الذاريات ٣٠", "الذاريات ٣١ – الحديد ٢٩", "المجادلة ١ – التحريم ١٢",
  "الملك ١ – المرسلات ٥٠", "النبأ ١ – الناس ٦",
];

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

async function sendKb(chat: number, text: string, rows: unknown[][]) {
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
        reply_markup: { inline_keyboard: rows },
      }),
    },
  );
  if (response.ok) return { ok: true, blocked: false };
  const result = await response.json().catch(() => ({}));
  const description = String(result?.description ?? response.status);
  const blocked = response.status === 403 ||
    /blocked|deactivated|chat not found/i.test(description);
  return { ok: false, blocked, error: description };
}

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

  const result = await sendKb(delivery.chatId, text, [[
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
