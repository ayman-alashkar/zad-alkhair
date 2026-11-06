// يصدّر صور المشاركة من مصادرها في social/cards إلى صور JPEG
// (أقل من 300 كيلوبايت، حدّ معاينة واتساب). القياس 1200×675، وصورة بوت تلغرام 1024×1024.
// الاستعمال: node scripts/build-share-cards.cjs [--only=surah|juz|app|listen-share]   (يتطلّب playwright مع Chromium)
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const listenShare = require("../src/discovery/listen-share.json");

const root = path.resolve(__dirname, "..");
const fileUrl = relative => "file://" + path.join(root, relative);

// بطاقات التطبيق: لكل منها ملف HTML مستقل.
const appCards = [
  ["social/cards/home.html", "social/zad-alkhair-share-v2.jpg"],
  ["social/cards/reader.html", "social/zad-alkhair-reader-share.jpg"],
  ["social/cards/install.html", "social/zad-alkhair-install-share-v2.jpg"],
  ["social/cards/guide.html", "social/player-guide-card-v6.jpg"],
  ["social/cards/telegram-avatar.html", "social/zad-alkhair-telegram-avatar.jpg", 1024, 1024],
];

// بطاقات السور والأجزاء: قالب واحد. الخط في أغلبها مأخوذ من البطاقات الأصلية
// (social/cards/lettering، استُخرج بـ scripts/extract-card-lettering.py).
// ما لا يصلح استخراجه يُكتب نصًّا هنا بخط Aref Ruqaa Ink، وهو خط البطاقات الأصلية:
// الحروف خضراء والحركات ذهبية في العنوان، والعكس في سطر البيانات.
const written = {
  // البطاقة الأصلية كانت لقطة شاشة صغيرة (748×442)، فأعيدت كتابتها.
  "surah-060": { name: "الممتحنة", nameVowelled: "الْمُمْتَحَنَةِ", place: "مدنية", placeVowelled: "مَدَنِيَّة", verses: "١٣" },
  // المصحف المدني (مصحف المدينة الذي يعرضه القارئ) يصنّفها مكية، والبطاقة الأصلية قالت مدنية.
  "surah-083": { name: "المطففين", nameVowelled: "الْمُطَفِّفِينَ", place: "مكية", placeVowelled: "مَكِّيَّة", verses: "٣٦" },
  // القاف المتطرفة في Aref Ruqaa بلا نقطتين، فتُقرأ «ٯ». بديل التطويل (jalt) هو شكلها المنقوط.
  "surah-050": { name: "ق", nameVowelled: "ق", place: "مكية", placeVowelled: "مَكِّيَّة", verses: "٤٥", dottedQaf: true },
  "surah-065": { name: "الطلاق", nameVowelled: "الطَّلَاقِ", place: "مدنية", placeVowelled: "مَدَنِيَّة", verses: "١٢", dottedQaf: true },
  "surah-084": { name: "الانشقاق", nameVowelled: "الْانْشِقَاقِ", place: "مكية", placeVowelled: "مَكِّيَّة", verses: "٢٥", dottedQaf: true },
  "surah-086": { name: "الطارق", nameVowelled: "الطَّارِقِ", place: "مكية", placeVowelled: "مَكِّيَّة", verses: "١٧", dottedQaf: true },
  "surah-096": { name: "العلق", nameVowelled: "الْعَلَقِ", place: "مكية", placeVowelled: "مَكِّيَّة", verses: "١٩", dottedQaf: true },
  "surah-113": { name: "الفلق", nameVowelled: "الْفَلَقِ", place: "مكية", placeVowelled: "مَكِّيَّة", verses: "٥", dottedQaf: true },
  // البطاقة الأصلية بدأت الجزء الأول بسورة البقرة، وهو يبدأ بالفاتحة.
  "juz-01": { juz: true, title: "الجزء الأول", titleVowelled: "الْجُزْءُ الْأَوَّلُ",
    from: ["الفاتحة", "الْفَاتِحَةِ", "١"], to: ["البقرة", "الْبَقَرَةِ", "١٤١"] },
};

const font = fileUrl("social/cards/fonts/aref-ruqaa-ink-arabic-700.woff2");
const contentHead = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
@font-face{font-family:"Alexandria";src:url("${fileUrl("fonts/alexandria-latin-400-800.woff2")}") format("woff2");font-weight:400 800}
@font-face{font-family:"Alexandria";src:url("${fileUrl("fonts/alexandria-arabic-400-800.woff2")}") format("woff2");font-weight:400 800;unicode-range:U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFC}
@font-face{font-family:"Aref Ruqaa Ink";src:url("${font}") format("woff2");font-weight:700}
body{margin:0}
.ground{position:relative;width:1200px;height:675px;overflow:hidden;background:radial-gradient(circle at 50% -10%,rgba(213,177,106,.22),transparent 520px),#F5F0E4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px}
.ground::before{content:"";position:absolute;inset:0;opacity:.05;background:url("${fileUrl("icons/zad-rosette.svg")}") -60px -40px/496.31px 329.9px repeat;pointer-events:none}
.card{position:relative;width:960px;height:520px;box-sizing:border-box;border-radius:44px;background:#FFFBF2;border:1px solid rgba(169,131,58,.26);box-shadow:0 40px 80px -50px rgba(69,52,21,.6);display:flex;flex-direction:column;align-items:center;justify-content:center}
.address{position:relative;font-family:Alexandria,sans-serif;font-size:22px;font-weight:600;letter-spacing:.06em;color:#8E6A28;direction:ltr}
.two{position:relative;display:inline-block;font-family:"Aref Ruqaa Ink",serif;font-weight:700;white-space:nowrap}
.two .letters{position:absolute;inset:0}
.title{font-size:120px;line-height:1.5}.title .vowels{color:#C29544}.title .letters{color:#14655A}
.data{display:flex;align-items:center;gap:26px;font-size:48px;line-height:1.6}
.data .vowels{color:#14655A}.data .letters{color:#C29544}
.data .sep{width:3px;height:40px;background:#14655A}.data .num{margin-inline-start:-8px;color:#14655A}
.juzline{gap:16px;line-height:1.45}.juzline .num{margin-inline-start:0}
.rule{display:flex;align-items:center;gap:14px;margin:2px 0 26px}.rule i{width:92px;height:1.5px;background:#C29544}.rule b{width:9px;height:9px;background:#C29544;transform:rotate(45deg)}
.mode{position:absolute;top:27px;display:flex;align-items:center;gap:13px;padding:11px 25px;border-radius:999px;border:1px solid #C6AB70;background:#F5F0E4;color:#174C42;font:650 34px/1.3 Alexandria,sans-serif}
.share-lettering{display:flex;flex-direction:column;align-items:center;transform:translateY(20px)}
.mode svg{width:31px;height:31px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.mode.listen{background:#123E36;color:#FAE4B2;border-color:#123E36}
.card.player{overflow:hidden;background:radial-gradient(ellipse at 30% 12%,#22574B,transparent 65%),#0C352E;color:#FFFAE9}
.card.player::before{content:"";position:absolute;inset:0;opacity:.07;background:url("${fileUrl("icons/zad-rosette.svg")}") 120px 40px/496.31px 329.9px repeat}
.player img{position:relative;width:58px;height:58px}
.player .brand{position:relative;margin-top:12px;font:650 30px/1.4 Alexandria,sans-serif;color:#F5D899}
.player .title{position:relative;font:700 111px/1.65 "Aref Ruqaa Ink",serif;color:#FFF2D3}
.player .subtitle{position:relative;margin-top:3px;font:500 26px/1.4 Alexandria,sans-serif;color:#F5D899}
</style></head><body>`;

const twoTone = (vowelled, bare) => `<span class="vowels">${vowelled}</span><span class="letters">${bare}</span>`;
const writtenSurah = w => `<div class="two title"${w.dottedQaf ? ' style="font-feature-settings:\'jalt\'"' : ""}>${twoTone("سُورَةُ " + w.nameVowelled, "سورة " + w.name)}</div>
<div class="rule"><i></i><b></b><i></i></div>
<div class="data"><span class="two">${twoTone(w.placeVowelled, w.place)}</span><span class="sep"></span><span class="two">${twoTone("آيَاتُهَا", "آياتها")}</span><span class="two num">${w.verses}</span></div>`;

const juzLine = (word, [name, nameVowelled, verse]) =>
  `<div class="data juzline"><span class="two">${twoTone(`${word} سُورَةِ ${nameVowelled} الآية رقم`, `${word} سورة ${name} الآية رقم`)}</span><span class="two num">${verse}</span></div>`;
const writtenJuz = w => `<div class="two title" style="font-size:125px">${twoTone(w.titleVowelled, w.title)}</div>
<div class="rule" style="margin-bottom:56px"><i></i><b></b><i></i></div>${juzLine("من", w.from)}${juzLine("إلى", w.to)}`;

function contentCards() {
  const cards = [];
  for (let n = 1; n <= 114; n++) cards.push({ id: `surah-${String(n).padStart(3, "0")}`, kind: "surah", n });
  for (let n = 1; n <= 30; n++) cards.push({ id: `juz-${String(n).padStart(2, "0")}`, kind: "juz", n });
  return cards.map(card => {
    const w = written[card.id];
    const inner = w
      ? (w.juz ? writtenJuz(w) : writtenSurah(w))
      : `<img src="${fileUrl(`social/cards/lettering/${card.id}.png`)}" alt="" style="display:block">`;
    const html = `${contentHead}<div class="ground"><div class="card">${inner}</div><div class="address">zad-alkhair.net/${card.kind}/${card.n}</div></div></body></html>`;
    return { html, output: `social/${card.kind}/${card.id}-v2.jpg`, kind: card.kind };
  });
}

function listenShareCards() {
  const book = '<path d="M12 6v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/>';
  const headphones = '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4.6" height="6.6" rx="2"/><rect x="16.4" y="14" width="4.6" height="6.6" rx="2"/>';
  const frame = (inner, url, cardClass = "") => `${contentHead}<div class="ground"><div class="card ${cardClass}">${inner}</div><div class="address">zad-alkhair.net/${url}</div></div></body></html>`;
  const player = `<img src="${fileUrl("icons/zad-mark-reverse.svg")}" alt=""><div class="brand">زاد الخير</div><div class="title">مشغّل التلاوة</div><div class="subtitle">استمع إلى القرآن العظيم</div>`;
  const cards = [{ html: frame(player, "listen", "player"), output: "social/zad-alkhair-listen-share-v1.jpg" }];
  for (const n of listenShare.surahs) {
    const id = `surah-${String(n).padStart(3, "0")}`, w = written[id];
    const inner = w ? writtenSurah(w) : `<img src="${fileUrl(`social/cards/lettering/${id}.png`)}" alt="" style="display:block">`;
    for (const [mode, label, icon, url] of [["read", "قراءة", book, `surah/${n}`], ["listen", "استماع", headphones, `listen/${n}`]]) {
      const badge = `<div class="mode ${mode}"><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg>${label}</div>`;
      cards.push({ html: frame(`<div class="share-lettering">${inner}</div>` + badge, url), output: `social/surah/${id}-${mode}-v1.jpg` });
    }
  }
  return cards;
}

(async () => {
  const only = (process.argv.find(a => a.startsWith("--only=")) || "").slice(7);
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"] } : {});
  const shoot = async (page, output) => {
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(root, output), type: "jpeg", quality: 90 });
    console.log(output);
  };
  if (!only || only === "app") {
    for (const [source, output, width = 1200, height = 675] of appCards) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      await page.goto(fileUrl(source));
      await shoot(page, output);
      await page.close();
    }
  }
  const page = await browser.newPage({ viewport: { width: 1200, height: 675 }, deviceScaleFactor: 1 });
  const tmp = path.join(root, "social/cards/.render.html");
  const cards = only === "listen-share" ? listenShareCards() : contentCards().filter(card => !only || only === card.kind);
  if (!only) cards.push(...listenShareCards());
  for (const card of cards) {
    fs.writeFileSync(tmp, card.html);
    await page.goto("file://" + tmp);
    await shoot(page, card.output);
  }
  fs.rmSync(tmp, { force: true });
  await browser.close();
})();
