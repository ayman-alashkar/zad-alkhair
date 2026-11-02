/* ============================================================
   announce — إشعار اكتمال الختمة أو بدء دورة جديدة.
   لكل مستقبِل سجل تسليم مستقل، فلا تتكرر الرسالة عند الإعادة.
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

const AR = "٠١٢٣٤٥٦٧٨٩";
const ar = (value: number | string) =>
  String(value).replace(/\d/g, (digit) => AR[+digit]);
const esc = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

function appRoot() {
  if (!APP_URL) return null;
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
    return root;
  } catch {
    return null;
  }
}

function appLink(code?: string) {
  const root = appRoot();
  if (!root) return APP_URL;
  if (code) root.hash = String(code).trim().toUpperCase();
  return root.href;
}

function readerLink() {
  const root = appRoot();
  return root ? new URL("reader.html", root).href : APP_URL;
}

function navRows(code?: string) {
  const app = appLink(code);
  const reader = readerLink();
  const row: Array<{ text: string; url: string }> = [];
  if (app) row.push({ text: "افتح زاد الخير", url: app });
  if (reader) row.push({ text: "افتح المصحف", url: reader });
  return row.length ? [row] : [];
}

const MONTHS = [
  "كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران",
  "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول",
];

function fmtDate(iso: string) {
  const date = new Date(`${iso}T12:00:00Z`);
  const gregorian = `${ar(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]}`;
  let hijri = "";
  try {
    hijri = date.toLocaleDateString("ar-SA-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    });
  } catch {
    /* التقويم الميلادي يبقى متاحًا. */
  }
  return hijri ? `${gregorian} · ${hijri}` : gregorian;
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

async function send(chat: number, text: string, code?: string) {
  const body: Record<string, unknown> = {
    chat_id: chat,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  const rows = navRows(code);
  if (rows.length) body.reply_markup = { inline_keyboard: rows };
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

type DoneInfo = {
  readers?: number;
  days?: number;
  dedication?: string;
};

type RoundInfo = {
  title?: string;
  dedication?: string;
  endDate?: string;
};

function doneText(result: DoneInfo) {
  const readers = Number(result.readers ?? 0);
  const who = readers === 1 ? "ختم واحد منّا"
    : readers === 2 ? "ختم اثنان منّا"
    : `ختم ${ar(readers)} منّا`;
  const countDays = Number(result.days ?? 1);
  const days = countDays === 1 ? "في يوم واحد"
    : countDays === 2 ? "في يومين"
    : `في ${ar(countDays)} أيام`;
  const dedication = result.dedication
    ? `، على نية: ${esc(result.dedication)}`
    : "";

  return `🕌 <b>زاد الخير</b>\n\n<b>تمّت الختمة والحمد لله، تقبّل الله منّا ومنكم</b>\n\n${who} كلام الباري عزّ وجلّ ${days}${dedication}.\n\nقال ﷺ:\n«يُقَالُ لِصَاحِبِ الْقُرْآنِ: اقْرَأْ وَارْتَقِ وَرَتِّلْ كَمَا كُنْتَ تُرَتِّلُ فِي الدُّنْيَا، فَإِنَّ مَنْزِلَتَكَ عِنْدَ آخِرِ آيَةٍ تَقْرَؤُهَا»\n— رواه أبو داود والترمذي وقال: حسن صحيح\n\nوقال عليه الصلاة والسلام:\n«الْمَاهِرُ بِالْقُرْآنِ مَعَ السَّفَرَةِ الْكِرَامِ الْبَرَرَةِ، وَالَّذِي يَقْرَأُ الْقُرْآنَ وَيَتَعْتَعُ فِيهِ وَهُوَ عَلَيْهِ شَاقٌّ لَهُ أَجْرَانِ»\n— متفق عليه\n\nاللهم ارحمنا بالقرآن، واجعله لنا إمامًا ونورًا وهدًى ورحمة.\n\nنلقاكم في الختمة القادمة بإذن الله، ولا تنسونا من صالح دعائكم.`;
}

function roundText(result: RoundInfo, name: string) {
  const dedication = result.dedication
    ? `\nعلى نية: ${esc(result.dedication)}`
    : "";
  return `🕌 <b>زاد الخير</b>\n\nالسلام عليكم يا ${esc(name)}\n\n<b>بدأت ختمة جديدة: ${esc(result.title)}</b>${dedication}\nتنتهي: ${fmtDate(result.endDate ?? "")}\n\n﴿ وَالسَّابِقُونَ السَّابِقُونَ ۝ أُولَئِكَ الْمُقَرَّبُونَ ﴾\n— الواقعة: ١٠-١١\n\nالأجزاء الثلاثون متاحة الآن، فبادر واحجز جزءك.\n\nقال ﷺ:\n«اقْرَؤُوا الْقُرْآنَ؛ فَإِنَّهُ يَأْتِي يَوْمَ الْقِيَامَةِ شَفِيعًا لِأَصْحَابِهِ»\n— رواه مسلم\n\nبادر قبل أن تفوتك الغنائم ✨`;
}


const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
Deno.serve(async (req) => {
  if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET)
    return new Response("forbidden", { status: 403 });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let jobs;
  try { jobs = await rpc("claim_completion_notifications"); }
  catch (error) {
    console.error("completion claim failed", String(error));
    return Response.json({ok:false,error:"claim failed"}, {status:503});
  }
  let sent=0, blocked=0, failed=0;
  for (const job of jobs ?? []) {
    let result;
    try { result = await send(job.chatId, doneText(job), job.code); }
    catch { result = {ok:false,blocked:false,error:"network failure"}; }
    if (result.ok) sent++;
    else if (result.blocked) {
      blocked++;
      await rpc("unlink_by_chat", {p_chat:job.chatId}).catch(()=>null);
    } else failed++;
    try {
      await rpc("notification_finish", {
        p_delivery:job.deliveryId, p_ok:result.ok, p_permanent:result.blocked
      });
    } catch { failed++; }
    await new Promise(resolve=>setTimeout(resolve,60));
  }
  console.log("completion deliveries", {sent,blocked,failed});
  return Response.json({ok:failed===0,sent,blocked,failed}, {status:failed?503:200});
});
