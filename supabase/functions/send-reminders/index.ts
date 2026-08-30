/* ============================================================
   send-reminders — تستيقظ كل ساعة، فإذا حلّت ساعة التذكير
   أرسلت لكل من فعّل التذكير وله جزء لم يُتمّه
   ============================================================ */

const TOKEN  = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_TIME_ZONE = Deno.env.get("APP_TIME_ZONE") ?? "Asia/Damascus";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const FINAL_ORIGIN = "https://zad-alkhair.net";
const CONFIGURED_APP_URL = Deno.env.get("APP_URL") ?? "";
const APP_URL = (() => {
  try {
    const configured = new URL(CONFIGURED_APP_URL);
    if (configured.origin === FINAL_ORIGIN) return configured.href;
  } catch { /**/ }
  return `${FINAL_ORIGIN}/`;
})();

async function rpc(fn: string, args: unknown = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${fn}: ${r.status} ${t}`);
  return t ? JSON.parse(t) : null;
}

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

function generalReaderLink() {
  const root = appRoot();
  return root ? new URL("reader.html", root).href : APP_URL;
}

function navigationRows(sourceUrl: string) {
  let code = "";
  try {
    code = (new URL(sourceUrl).searchParams.get("code") ?? "").trim().toUpperCase();
  } catch { /**/ }
  const app = appLink(code || undefined);
  const reader = generalReaderLink();
  const row: Array<{ text: string; url: string }> = [];
  if (app) row.push({ text: "افتح زاد الخير", url: app });
  if (reader) row.push({ text: "افتح المصحف", url: reader });
  return row.length ? [row] : [];
}

/* إرسال رسالة. يعيد blocked إذا حظر المستخدم البوت */
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
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (r.ok) return { ok: true, blocked: false };
  const j = await r.json().catch(() => ({}));
  const blocked = r.status === 403 ||
    /blocked|deactivated|chat not found/i.test(j?.description ?? "");
  return { ok: false, blocked, error: j?.description ?? r.status };
}

/* الأرقام العربية الهندية */
const AR = "٠١٢٣٤٥٦٧٨٩";
const ar = (n: number | string) =>
  String(n).replace(/\d/g, (d) => AR[+d]);
const esc = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

function readerLink(code?: string, juz?: number) {
  const root = appRoot();
  if (!root) return APP_URL;
  const validJuz = Number.isInteger(juz) && Number(juz) >= 1 && Number(juz) <= 30;
  const url = new URL(validJuz ? `juz/${Number(juz)}/` : "reader.html", root);
  if (code) url.searchParams.set("code", String(code).trim().toUpperCase());
  return url.href;
}

const JUZ=[
 "الفاتحة ١ – البقرة ١٤١","البقرة ١٤٢ – ٢٥٢","البقرة ٢٥٣ – آل عمران ٩٢","آل عمران ٩٣ – النساء ٢٣",
 "النساء ٢٤ – ١٤٧","النساء ١٤٨ – المائدة ٨١","المائدة ٨٢ – الأنعام ١١٠","الأنعام ١١١ – الأعراف ٨٧",
 "الأعراف ٨٨ – الأنفال ٤٠","الأنفال ٤١ – التوبة ٩٢","التوبة ٩٣ – هود ٥","هود ٦ – يوسف ٥٢",
 "يوسف ٥٣ – إبراهيم ٥٢","الحجر ١ – النحل ١٢٨","الإسراء ١ – الكهف ٧٤","الكهف ٧٥ – طه ١٣٥",
 "الأنبياء ١ – الحج ٧٨","المؤمنون ١ – الفرقان ٢٠","الفرقان ٢١ – النمل ٥٥","النمل ٥٦ – العنكبوت ٤٥",
 "العنكبوت ٤٦ – الأحزاب ٣٠","الأحزاب ٣١ – يس ٢٧","يس ٢٨ – الزمر ٣١","الزمر ٣٢ – فصلت ٤٦",
 "فصلت ٤٧ – الجاثية ٣٧","الأحقاف ١ – الذاريات ٣٠","الذاريات ٣١ – الحديد ٢٩","المجادلة ١ – التحريم ١٢",
 "الملك ١ – المرسلات ٥٠","النبأ ١ – الناس ٦"];

const MOTIV=[
 {t:"تذكّر أن كل حرف تقرؤه سيقف عنك يوم القيامة شافعًا.",q:"اقْرَؤُوا الْقُرْآنَ؛ فَإِنَّهُ يَأْتِي يَوْمَ الْقِيَامَةِ شَفِيعًا لِأَصْحَابِهِ",s:"رواه مسلم",k:"h"},
 {t:"في هذه السورة بركة لا يعرفها إلا من لازمها.",q:"اقْرَؤُوا سُورَةَ الْبَقَرَةِ؛ فَإِنَّ أَخْذَهَا بَرَكَةٌ، وَتَرْكَهَا حَسْرَةٌ",s:"رواه مسلم",k:"h"},
 {t:"في جزئك خاتمة البقرة، فلا تمرّ عليها مرورًا عابرًا.",q:"الْآيَتَانِ مِنْ آخِرِ سُورَةِ الْبَقَرَةِ، مَنْ قَرَأَهُمَا فِي لَيْلَةٍ كَفَتَاهُ",s:"متفق عليه",k:"h"},
 {t:"هذه واحدة من منزلتين تُغبَط عليهما.",q:"لَا حَسَدَ إِلَّا فِي اثْنَتَيْنِ: رَجُلٌ آتَاهُ اللَّهُ الْقُرْآنَ فَهُوَ يَقُومُ بِهِ آنَاءَ اللَّيْلِ وَآنَاءَ النَّهَارِ",s:"متفق عليه",k:"h"},
 {t:"لا تستصغر آية، فالحساب بالحروف لا بالصفحات.",q:"مَنْ قَرَأَ حَرْفًا مِنْ كِتَابِ اللَّهِ فَلَهُ بِهِ حَسَنَةٌ، وَالْحَسَنَةُ بِعَشْرِ أَمْثَالِهَا",s:"رواه الترمذي وقال: حسن صحيح",k:"h"},
 {t:"ما بين يديك نور، وما تقرؤه اليوم يستبين به طريقك.",q:"قَدْ جَاءَكُمْ مِنَ اللَّهِ نُورٌ وَكِتَابٌ مُبِينٌ",s:"المائدة: ١٥",k:"a"},
 {t:"القرآن يترك في صاحبه أثرًا يُشمّ كما تُشمّ الرائحة الطيبة.",q:"مَثَلُ الْمُؤْمِنِ الَّذِي يَقْرَأُ الْقُرْآنَ كَمَثَلِ الْأُتْرُجَّةِ: رِيحُهَا طَيِّبٌ وَطَعْمُهَا طَيِّبٌ",s:"متفق عليه",k:"h"},
 {t:"بركة هذا الكتاب في اتّباعه، لا في تلاوته وحدها.",q:"وَهَذَا كِتَابٌ أَنْزَلْنَاهُ مُبَارَكٌ فَاتَّبِعُوهُ وَاتَّقُوا لَعَلَّكُمْ تُرْحَمُونَ",s:"الأنعام: ١٥٥",k:"a"},
 {t:"مما ستقرؤه في هذا الجزء، أنّ الله يحول بين المرء وقلبه، فما أشدّ قربه عزّ وجلّ.",q:"يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَجِيبُوا لِلَّهِ وَلِلرَّسُولِ إِذَا دَعَاكُمْ لِمَا يُحْيِيكُمْ وَاعْلَمُوا أَنَّ اللَّهَ يَحُولُ بَيْنَ الْمَرْءِ وَقَلْبِهِ وَأَنَّهُ إِلَيْهِ تُحْشَرُونَ",s:"الأنفال: ٢٤",k:"a"},
 {t:"هذا الكتاب يرفع أهله، فاجعل لك منه نصيبًا.",q:"إِنَّ اللَّهَ يَرْفَعُ بِهَذَا الْكِتَابِ أَقْوَامًا وَيَضَعُ بِهِ آخَرِينَ",s:"رواه مسلم",k:"h"},
 {t:"إن كان في صدرك ضيق، فدواؤه بين يديك.",q:"يَا أَيُّهَا النَّاسُ قَدْ جَاءَتْكُمْ مَوْعِظَةٌ مِنْ رَبِّكُمْ وَشِفَاءٌ لِمَا فِي الصُّدُورِ",s:"يونس: ٥٧",k:"a"},
 {t:"تقرأ اليوم أحسن ما قُصّ على البشر.",q:"نَحْنُ نَقُصُّ عَلَيْكَ أَحْسَنَ الْقَصَصِ بِمَا أَوْحَيْنَا إِلَيْكَ هَذَا الْقُرْآنَ",s:"يوسف: ٣",k:"a"},
 {t:"كل آية تزيدها اليوم ترفعك درجة هناك.",q:"يُقَالُ لِصَاحِبِ الْقُرْآنِ: اقْرَأْ وَارْتَقِ وَرَتِّلْ كَمَا كُنْتَ تُرَتِّلُ فِي الدُّنْيَا، فَإِنَّ مَنْزِلَتَكَ عِنْدَ آخِرِ آيَةٍ تَقْرَؤُهَا",s:"رواه أبو داود والترمذي وقال: حسن صحيح",k:"h"},
 {t:"احفظه في قلبك، يحفظك الله بمعيّته.",q:"إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ",s:"الحجر: ٩",k:"a"},
 {t:"في أول جزئك عصمة، فاحرص على حفظ أوائل الكهف.",q:"مَنْ حَفِظَ عَشْرَ آيَاتٍ مِنْ أَوَّلِ سُورَةِ الْكَهْفِ عُصِمَ مِنَ الدَّجَّالِ",s:"رواه مسلم",k:"h"},
 {t:"لم يُؤمر النبيّ ﷺ بالاستزادة من شيء إلا من العلم.",q:"وَقُلْ رَبِّ زِدْنِي عِلْمًا",s:"طه: ١١٤",k:"a"},
 {t:"فلنعمل بما فيه، فبه شرفنا وفخرنا.",q:"لَقَدْ أَنْزَلْنَا إِلَيْكُمْ كِتَابًا فِيهِ ذِكْرُكُمْ",s:"الأنبياء: ١٠",k:"a"},
 {t:"أنت اليوم في جماعة تتدارس كتاب الله، وهذا موعدها.",q:"مَا اجْتَمَعَ قَوْمٌ فِي بَيْتٍ مِنْ بُيُوتِ اللَّهِ يَتْلُونَ كِتَابَ اللَّهِ وَيَتَدَارَسُونَهُ بَيْنَهُمْ إِلَّا نَزَلَتْ عَلَيْهِمُ السَّكِينَةُ وَغَشِيَتْهُمُ الرَّحْمَةُ",s:"رواه مسلم",k:"h"},
 {t:"هجر القرآن شكوى يرفعها النبيّ ﷺ، فلا تكن ممّن يُشكى.",q:"وَقَالَ الرَّسُولُ يَا رَبِّ إِنَّ قَوْمِي اتَّخَذُوا هَذَا الْقُرْآنَ مَهْجُورًا",s:"الفرقان: ٣٠",k:"a"},
 {t:"ادعُه، يسمعك ويستجيب.",q:"أَمَّنْ يُجِيبُ الْمُضْطَرَّ إِذَا دَعَاهُ وَيَكْشِفُ السُّوءَ وَيَجْعَلُكُمْ خُلَفَاءَ الْأَرْضِ أَإِلَهٌ مَعَ اللَّهِ قَلِيلًا مَا تَذَكَّرُونَ",s:"النمل: ٦٢",k:"a"},
 {t:"موضع هذا الكتاب الصدور، لا الرفوف.",q:"بَلْ هُوَ آيَاتٌ بَيِّنَاتٌ فِي صُدُورِ الَّذِينَ أُوتُوا الْعِلْمَ",s:"العنكبوت: ٤٩",k:"a"},
 {t:"اللهم اجعلنا ممّن يذاكر كتابك ويداوم عليه.",q:"تَعَاهَدُوا هَذَا الْقُرْآنَ، فَوَالَّذِي نَفْسُ مُحَمَّدٍ بِيَدِهِ لَهُوَ أَشَدُّ تَفَلُّتًا مِنَ الْإِبِلِ فِي عُقُلِهَا",s:"متفق عليه",k:"h"},
 {t:"ذكرٌ يُحيي القلب، وبيانٌ لا لبس فيه.",q:"إِنْ هُوَ إِلَّا ذِكْرٌ وَقُرْآنٌ مُبِينٌ",s:"يس: ٦٩",k:"a"},
 {t:"أبشِر، وتذكّر أنه: سلِّم لنا تسلَم.",q:"إِنَّ الَّذِينَ قَالُوا رَبُّنَا اللَّهُ ثُمَّ اسْتَقَامُوا تَتَنَزَّلُ عَلَيْهِمُ الْمَلَائِكَةُ أَلَّا تَخَافُوا وَلَا تَحْزَنُوا وَأَبْشِرُوا بِالْجَنَّةِ الَّتِي كُنْتُمْ تُوعَدُونَ",s:"فصلت: ٣٠",k:"a"},
 {t:"يا تُرى، ما حجّتنا أمام من لغته ليست العربية؟",q:"إِنَّا جَعَلْنَاهُ قُرْآنًا عَرَبِيًّا لَعَلَّكُمْ تَعْقِلُونَ",s:"الزخرف: ٣",k:"a"},
 {t:"اقرأ بقلب منشرح، إلى الباري مُقبِل.",q:"أَفَلَا يَتَدَبَّرُونَ الْقُرْآنَ أَمْ عَلَى قُلُوبٍ أَقْفَالُهَا",s:"محمد: ٢٤",k:"a"},
 {t:"سبحان من يسّره لنا، فلنُقبِل.",q:"وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِنْ مُدَّكِرٍ",s:"القمر: ١٧",k:"a"},
 {t:"الجبل خشع وتصدّع، وقلبك أولى بذلك.",q:"لَوْ أَنْزَلْنَا هَذَا الْقُرْآنَ عَلَى جَبَلٍ لَرَأَيْتَهُ خَاشِعًا مُتَصَدِّعًا مِنْ خَشْيَةِ اللَّهِ",s:"الحشر: ٢١",k:"a"},
 {t:"سبحان الله، لا إله إلا هو.",q:"وَاذْكُرِ اسْمَ رَبِّكَ وَتَبَتَّلْ إِلَيْهِ تَبْتِيلًا. رَبُّ الْمَشْرِقِ وَالْمَغْرِبِ لَا إِلَهَ إِلَّا هُوَ فَاتَّخِذْهُ وَكِيلًا",s:"المزمل: ٨-٩",k:"a"},
 {t:"في خاتمة جزئك سورة تعدل ثلث القرآن.",q:"قُلْ هُوَ اللَّهُ أَحَدٌ تَعْدِلُ ثُلُثَ الْقُرْآنِ",s:"رواه مسلم",k:"h"}
];

type Group = {
  deliveryId: string; chatId: number; name: string; juz: number[];
  code: string; endDate: string; title: string;
  doneCount: number; freeCount: number; remaining: number; daysLeft: number;
};

function quote(i: number) {
  const m = MOTIV[i];
  const body = m.k === "a" ? `﴿ ${m.q} ﴾` : `قال ﷺ: «${m.q}»`;
  return `<i>${m.t}</i>\n${body}\n— ${m.s}`;
}

const JUZ_START: [number, number][] = [
  [1,1],   [2,142], [2,253], [3,93],  [4,24],  [4,148], [5,82],  [6,111],
  [7,88],  [8,41],  [9,93],  [11,6],  [12,53], [15,1],  [17,1],  [18,75],
  [21,1],  [23,1],  [25,21], [27,56], [29,46], [33,31], [36,28], [39,32],
  [41,47], [46,1],  [51,31], [58,1],  [67,1],  [78,1],
];

const readLink = (juz: number, code: string, _legacyToken = "") =>
  readerLink(code, juz);

function juzWord(n: number) {
  if (n === 1) return "جزؤك";
  if (n === 2) return "جزءاك";
  return `أجزاؤك ال${n <= 10 ? ["","","","ثلاثة","أربعة","خمسة","ستة","سبعة","ثمانية","تسعة","عشرة"][n] : ar(n)}`;
}
function juzList(nums: number[], code: string, migrationToken = "", respectful = false) {
  const invitation = respectful ? "يمكنكم" : "يمكنك";
  return nums.map((n) =>
    `• الجزء ${ar(n)} — ${JUZ[n - 1]}\n  📖 ${invitation} قراءة هذا الجزء من <a href="${esc(readLink(n, code, migrationToken))}">هنا</a>`
  ).join("\n");
}

function daily(g: Group, migrationToken = "") {
  const nums = g.juz;
  const first = nums[0];
  const per = Math.max(1, Math.ceil(20 * nums.length / Math.max(1, g.daysLeft || 1)));
  const group = g.doneCount >= 15
    ? `\n<b>المجموعة:</b> أتمّت ${ar(g.doneCount)} من ٣٠ جزءًا` : "";
  const numberList = nums.length === 1
    ? ar(nums[0])
    : nums.length === 2
      ? `${ar(nums[0])} و${ar(nums[1])}`
      : `${nums.slice(0, -1).map((n) => ar(n)).join("، ")} و${ar(nums[nums.length - 1])}`;
  const subject = nums.length === 1
    ? `الجزء ${numberList}`
    : nums.length === 2
      ? `الجزآن ${numberList}`
      : `الأجزاء ${numberList}`;
  const waiting = nums.length === 1 ? "ما زال" : nums.length === 2 ? "ما زالا" : "ما تزال";
  const reasonSubject = nums.length === 1 ? "الجزء" : nums.length === 2 ? "الجزأين" : "الأجزاء";
  const notMarked = nums.length === 1
    ? "لم يُعلَّم مقروءًا"
    : nums.length === 2
      ? "لم يُعلَّما مقروءين"
      : "لم تُعلَّم مقروءة";
  const marking = nums.length === 1 ? "بتعليمه" : nums.length === 2 ? "بتعليمهما" : "بتعليمها";
  const tail = nums.length > 1
    ? `ابدؤوا بالجزء ${ar(first)}، ولو صفحة واحدة.`
    : "افتحوا المصحف الآن، ولو صفحة واحدة.";

  return `🕌 <b>زاد الخير</b>\n\nالسلام عليكم يا ${esc(g.name)}\n\n${subject} ${waiting} بانتظار الإتمام.\n\n${juzList(nums, g.code, migrationToken, true)}\n<b>وردكم اليوم:</b> ${ar(per)} صفحات تقريبًا${group}\n\n${quote(first - 1)}\n\n${tail}\n\n———\nوصلتكم هذه الرسالة لأن ${reasonSubject} ${notMarked} بعد. إن كنتم قد أتممتم القراءة، فتفضّلوا ${marking} في التطبيق. جزاكم الله خيرًا وكتب لكم القبول.`;
}

function lastDay(g: Group, migrationToken = "") {
  const nums = g.juz;
  const first = nums[0];
  const numberList = nums.length === 1
    ? ar(nums[0])
    : nums.length === 2
      ? `${ar(nums[0])} و${ar(nums[1])}`
      : `${nums.slice(0, -1).map((n) => ar(n)).join("، ")} و${ar(nums[nums.length - 1])}`;
  const subject = nums.length === 1
    ? `الجزء ${numberList}`
    : nums.length === 2
      ? `الجزآن ${numberList}`
      : `الأجزاء ${numberList}`;
  const waiting = nums.length === 1 ? "ما زال" : nums.length === 2 ? "ما زالا" : "ما تزال";
  const marking = nums.length === 1 ? "بتعليمه" : nums.length === 2 ? "بتعليمهما" : "بتعليمها";

  return `🕌 <b>زاد الخير</b> — اليوم آخر يوم\n\nالسلام عليكم يا ${esc(g.name)}\n\n${subject} ${waiting} بانتظار الإتمام، وموعد انتهاء الختمة اليوم. إن كنتم قد أتممتم القراءة، فتفضّلوا ${marking} في التطبيق، وإن لم يتيسّر بعد فاقرؤوا ما استطعتم. جزاكم الله خيرًا وكتب لكم القبول.\n\n${juzList(nums, g.code, migrationToken, true)}\n\n${quote(first - 1)}`;
}

function overdue(g: Group, migrationToken = "") {
  const nums = g.juz;
  const first = nums[0];
  const late = Math.abs(g.daysLeft);
  const when = late === 0 ? "اليوم انقضى موعد الختمة"
    : late === 1 ? "مضى على موعد الختمة يوم"
    : late === 2 ? "مضى على موعد الختمة يومان"
    : `مضت على موعد الختمة ${ar(late)} أيام`;

  const line = g.remaining === nums.length
    ? `${esc(g.name)}، ${when}، ولم يبق من الختمة إلا ما بين يديك.`
    : `${esc(g.name)}، ${when}، وما زال ${nums.length === 1 ? "جزؤك" : "ما حجزت"} بانتظارك.`;

  return `🕌 <b>زاد الخير</b>\n\n${line} وباب الخير مفتوح، فما فات وقته عند الله شيء.\n\n${juzList(nums, g.code, migrationToken)}\n\n${quote(first - 1)}\n\nاقرأ اليوم ما تيسّر، ولو صفحة.`;
}

function localNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

Deno.serve(async (req) => {
  if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response("forbidden", { status: 403 });
  }
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  const now = localNow();
  let due: Group[];
  try {
    due = await rpc("due_reminders", {
      p_local_date: now.date,
      p_hour: now.hour,
      p_minute: now.minute,
    });
  } catch {
    return Response.json({ ok: false, error: "تعذّر الاتصال بقاعدة البيانات" },
      { status: 503 });
  }

  let sent = 0;
  let blocked = 0;
  let failed = 0;
  for (const group of due ?? []) {
    group.juz.sort((a, b) => a - b);
    const text = group.daysLeft < 0 ? overdue(group)
      : group.daysLeft <= 1 ? lastDay(group) : daily(group);
    const link = readerLink(group.code, group.juz[0]) || undefined;
    const result = await send(group.chatId, text, link);
    if (result.ok) sent++;
    else if (result.blocked) {
      blocked++;
      await rpc("unlink_by_chat", { p_chat: group.chatId }).catch(() => null);
    } else failed++;

    try {
      await rpc("notification_finish", {
        p_delivery: group.deliveryId,
        p_ok: result.ok,
        p_permanent: result.blocked,
      });
    } catch {
      failed++;
    }
    await new Promise((resolve) => setTimeout(resolve, 60));
  }

  return Response.json({
    ok: failed === 0,
    timeZone: APP_TIME_ZONE,
    localDate: now.date,
    hour: now.hour,
    minute: now.minute,
    people: due?.length ?? 0,
    sent,
    blocked,
    failed,
  }, { status: failed === 0 ? 200 : 503 });
});
