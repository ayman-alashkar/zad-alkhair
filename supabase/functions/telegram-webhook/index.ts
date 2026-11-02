/* ============================================================
   telegram-webhook — تستقبل ما يرسله المستخدمون للبوت
   وظيفتها الأساسية: ربط محادثة تلغرام بالمشارك عند /start
   ============================================================ */

const HOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";
const TOKEN  = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FINAL_ORIGIN = "https://zad-alkhair.net";
const APP_URL = FINAL_ORIGIN;

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

function readerLink(code?: string, juz?: number) {
  const root = appRoot();
  if (!root) return APP_URL;
  const url = new URL("reader.html", root);
  if (Number.isInteger(juz) && Number(juz) >= 1 && Number(juz) <= 30) {
    url.searchParams.set("juz", String(juz));
  }
  if (code) url.searchParams.set("code", String(code).trim().toUpperCase());
  return url.href;
}

function generalReaderLink() {
  const root = appRoot();
  return root ? new URL("reader.html", root).href : APP_URL;
}

function codeFromUrl(url?: string) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return (parsed.searchParams.get("code") ?? "").trim().toUpperCase();
  } catch {
    return "";
  }
}

function navigationRows(url?: string) {
  const code = codeFromUrl(url);
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

const AR = "٠١٢٣٤٥٦٧٨٩";
const ar = (n: number | string) => String(n).replace(/\d/g, (d) => AR[+d]);
const esc = (value: unknown) => String(value ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type TelegramButton = {
  text: string;
  callback_data?: string;
  url?: string;
};

type TelegramMessage = {
  chat?: { id?: number };
  message_id?: number;
  text?: string;
};

type TelegramUpdate = {
  callback_query?: {
    id: string;
    data?: string;
    message?: TelegramMessage;
  };
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
};

type SharePublication = {
  code?: string;
  title?: string;
  text?: string;
  authorChat?: number;
  rest?: number;
  chats?: Array<{ chatId: number }>;
};

async function sendKb(chat: number, text: string, rows: TelegramButton[][]) {
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chat, text, parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: rows },
    }),
  });
}

async function stripKb(chat: number, msgId: number) {
  await fetch(`https://api.telegram.org/bot${TOKEN}/editMessageReplyMarkup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, message_id: msgId,
      reply_markup: { inline_keyboard: [] } }),
  }).catch(() => {});
}

async function answerCb(id: string, text?: string) {
  await fetch(`https://api.telegram.org/bot${TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: id, text }),
  }).catch(() => {});
}

const ASK_WRITE = `إذًا اكتبها هنا، وسأنقلها إلى الجميع.\n\nلن تتم مشاركة اسمك أو هويتك، فلا تخشَ حظًّا للأنا فيما تكتب، لكن احرص على تحرّي الصحة والدقة والإخلاص فيما تريد إيصاله.`;
const NO_TEXT = `أستطيع نقل النصّ المكتوب فقط. اكتب ما تريد قوله في رسالة نصّية، وسأنقلها.`;
const SHARE_LIMIT = 1500;
const TOO_LONG = `رسالتك طويلة قليلًا. اختصرها في نحو ألف وخمسمئة حرف ليقرأها المشاركون، وأعد إرسالها.`;
const EXPIRED = `نأسف لذلك، لكن نفد الوقت المخصص لمشاركة ما أحببت.`;
const REJECTED = `راجع المشرف ما كتبتَ ورأى تأجيل نشره. جزاك الله خيرًا على مبادرتك الطيبة.`;
const SENT_ORG = `وصلت رسالتك إلى مشرف الختمة، وسيصلك تأكيد نشرها بمجرد موافقته عليها.`;

const shareText = (title: string, body: string) =>
  `🕌 <b>زاد الخير</b>\n\n<b>مشاركة من أحد القراء في ختمة ${esc(title)}</b>\n\n<b>نصّ المشاركة:</b>\n${esc(body)}\n\nــــــ\nملاحظة: ما كُتب هنا هو من أحد المشاركين في الختمة، وليس من إعداد التطبيق.`;

const outro = (rest: number) => rest > 0
  ? `\n\nفضلًا، عد إلى الموقع لتفقّد أجزائك المتبقية، نلقاك على خير بإذن الله.`
  : `\n\nفضلًا، عد إلى الموقع لاختيار جزء جديد لقراءته في هذه الختمة، أو انتظر الختمة القادمة، نلقاك على خير بإذن الله.`;

const OKAY = `حسنًا، هذا مفهوم.`;

/* رابط عام يحمل رمز الختمة فقط كي تستخرج منه send وجهة زاد الخير. */
const linkTo = (code?: string) => readerLink(code);

async function endPolitely(chat: number, code?: string, rest?: number) {
  await send(chat, OKAY + outro(rest ?? 0), linkTo(code));
}

async function publish(r: SharePublication) {
  const link = linkTo(r.code);
  let sent = 0;
  for (const c of r.chats ?? []) {
    const s = await send(c.chatId, shareText(r.title, r.text), link);
    if (s.ok && c.chatId !== r.authorChat) sent++;
    else if (s.blocked) { try { await rpc("unlink_by_chat", { p_chat: c.chatId }); } catch { /**/ } }
    await new Promise((res) => setTimeout(res, 60));
  }
  if (r.authorChat) {
    await send(r.authorChat,
      `ما كتبتَ وصل إلى ${ar(sent)} من المشاركين. جزاك الله خيرًا.`
      + outro(r.rest ?? 0), link);
  }
  return sent;
}

const ok = () => new Response("ok", { status: 200 });

const WELCOME = `🕌 <b>زاد الخير</b>\n\nأهلًا بك. أنا أذكّرك يوميًا بوردك من الختمة الجماعية.\n\nلتفعيل التذكير، افتح التطبيق واضغط زر «فعّل التذكير» فيه، فيعود بك إلى هنا مباشرة.`;

Deno.serve(async (req) => {
  if (!HOOK_SECRET ||
      req.headers.get("x-telegram-bot-api-secret-token") !== HOOK_SECRET) {
    return new Response("forbidden", { status: 403 });
  }
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  let update: TelegramUpdate;
  try { update = await req.json(); } catch { return ok(); }

  const cb = update?.callback_query;
  if (cb) {
    const cChat = cb.message?.chat?.id;
    const cMsg  = cb.message?.message_id;
    const data: string = cb.data ?? "";
    await answerCb(cb.id);
    if (!cChat || !cMsg) return ok();
    await stripKb(cChat, cMsg);

    try {
      if (data.startsWith("ask:")) {
        const [, kcode, juz] = data.split(":");
        const r = await rpc("share_open",
          { p_chat: cChat, p_code: kcode, p_juz: Number(juz) });
        if (r?.ok) {
          await sendKb(cChat, ASK_WRITE,
            [[{ text: "إلغاء", callback_data: "cancel" }]]);
        }
        return ok();
      }

      if (data.startsWith("not:")) {
        const kcode = data.slice(4);
        let st: { rest?: number } | null = null;
        try { st = await rpc("rest_in", { p_chat: cChat, p_code: kcode }); } catch { /**/ }
        await endPolitely(cChat, kcode, st?.rest ?? 0);
        return ok();
      }

      if (data === "send") {
        const r = await rpc("share_submit", { p_chat: cChat });
        if (!r?.ok) {
          if (r?.why === "expired") await send(cChat, EXPIRED);
          return ok();
        }
        if (r.mode === "publish") {
          await publish({ ...r, authorChat: cChat });
        } else {
          await send(cChat, SENT_ORG);
          await sendKb(r.orgChat,
`🕌 <b>زاد الخير</b>\n\n<b>مشاركة من أحد القراء في ختمة ${esc(r.title)}، تنتظر موافقتك للنشر</b>\n\n<b>نصّ المشاركة:</b>\n${esc(r.text)}`,
            [[{ text: "أوافق على نشرها", callback_data: `ok:${r.id}` }],
             [{ text: "لا أوافق",        callback_data: `no:${r.id}` }]]);
        }
        return ok();
      }

      if (data === "edit") {
        await rpc("share_clear", { p_chat: cChat, p_keep: true });
        await send(cChat, "اكتبها من جديد، وسأعرضها عليك قبل الإرسال.");
        return ok();
      }

      if (data === "cancel") {
        const c = await rpc("share_clear", { p_chat: cChat, p_keep: false });
        await endPolitely(cChat, c?.code, c?.rest ?? 0);
        return ok();
      }

      if (data.startsWith("ok:") || data.startsWith("no:")) {
        const approve = data.startsWith("ok:");
        const id = data.slice(3);
        const r = await rpc("share_decide",
          { p_id: id, p_chat: cChat, p_ok: approve });
        if (!r?.ok) return ok();
        if (r.mode === "publish") await publish(r);
        else if (r.authorChat) {
          await send(r.authorChat, REJECTED + outro(r.rest ?? 0), linkTo(r.code));
        }
        return ok();
      }
    } catch { /**/ }
    return ok();
  }

  const msg = update?.message ?? update?.edited_message;
  const chat = msg?.chat?.id;
  const text: string = (msg?.text ?? "").trim();
  if (!chat) return ok();

  if (msg && !text.startsWith("/")) {
    if (!text) {
      const w = await rpc("share_draft", { p_chat: chat, p_text: "" })
        .catch(() => null);
      if (w?.ok || w?.why === "none") { /**/ }
      if (w?.ok) { await send(chat, NO_TEXT); return ok(); }
      if (w?.why === "expired") { await send(chat, EXPIRED); return ok(); }
    } else {
      if (Array.from(text).length > SHARE_LIMIT) {
        const w = await rpc("share_draft", { p_chat: chat, p_text: "" })
          .catch(() => null);
        if (w?.ok) { await send(chat, TOO_LONG); return ok(); }
        if (w?.why === "expired") { await send(chat, EXPIRED); return ok(); }
      } else {
        const w = await rpc("share_draft", { p_chat: chat, p_text: text })
          .catch(() => null);
        if (w?.ok) {
          await sendKb(chat, `هذا ما سيصل للمشاركين:\n\n${esc(text)}`,
            [[{ text: "إرسال", callback_data: "send" },
              { text: "تعديل", callback_data: "edit" },
              { text: "إلغاء", callback_data: "cancel" }]]);
          return ok();
        }
        if (w?.why === "expired") { await send(chat, EXPIRED); return ok(); }
      }
    }
  }

  if (!text) return ok();

  if (text.startsWith("/start")) {
    const code = text.split(/\s+/)[1];
    if (!code) { await send(chat, WELCOME, readerLink()); return ok(); }

    try {
      const r = await rpc("link_telegram", { p_code: code, p_chat: chat });
      if (r?.ok) {
        const link = linkTo(r.code);
        await send(chat, r.again
? `🕌 <b>زاد الخير</b>\n\nلقد فعّلت تذكيرك مسبقًا يا ${esc(r.name)}، وهو يعمل الآن، فلا حاجة لإعادة التفعيل.`
: `🕌 <b>زاد الخير</b>\n\nتم التفعيل يا ${esc(r.name)}. سيصلك التذكير هنا يوميًا ما دام لك جزء لم تُتمّه.${
  r.moved ? `\n\nونُقل التذكير من «${esc(r.moved)}» إليك، فلكل حساب تلغرام اسم واحد في الختمة.` : ""
}`, link);
      } else {
        let st: { linked?: boolean; name?: string; code?: string } | null = null;
        try { st = await rpc("chat_linked", { p_chat: chat }); } catch { /**/ }
        if (st?.linked) {
          await send(chat,
`🕌 <b>زاد الخير</b>\n\nلقد فعّلت تذكيرك مسبقًا يا ${esc(st.name)}، وهو يعمل الآن، فلا حاجة لإعادة التفعيل.`, linkTo(st.code));
        } else {
          await send(chat,
`انتهت صلاحية رابط التفعيل أو استُخدم من قبل.\n\nارجع إلى التطبيق واضغط «فعّل التذكير» من جديد.`, readerLink());
        }
      }
    } catch {
      await send(chat, "تعذّر التفعيل الآن، حاول بعد قليل.");
    }
    return ok();
  }

  if (text === "/stop" || text === "إيقاف") {
    await send(chat,
`🕌 <b>زاد الخير</b>\n\nالتذكير جزء من المشاركة في الختمة، فلا يُوقف من هنا.\n\nفإن كنت لا تريده، فأخبر منظّم الختمة ليأذن لك بالدخول بلا تذكير.\nوإن كنت تريد الخروج من الختمة كلها، فاطلب منه حذف اسمك.`, readerLink());
    return ok();
  }

  await send(chat,
`أنا بوت التذكير فقط، ولا أفهم الأوامر.\n\nالحجز والمتابعة تكون من التطبيق.`, readerLink());
  return ok();
});
