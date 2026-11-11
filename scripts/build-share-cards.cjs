// يصدّر صور المشاركة من مصادرها في social/cards إلى صور JPEG
// (أقل من 300 كيلوبايت، حدّ معاينة واتساب). القياس 1200×675، وصورة بوت تلغرام 1024×1024.
// الاستعمال: node scripts/build-share-cards.cjs [--only=surah|juz|app|listen-share|adhkar] [--surah=114]
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const fileUrl = relative => "file://" + path.join(root, relative);
const readerCardOutput = "social/zad-alkhair-reader-share-v2.jpg";
const bookIcon = '<path d="M12 6v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/>';
// بطاقات الأذكار: بطاقة القارئ نفسها، بعنوان القسم وأيقونته (أيقونات adhkar.js). مصدر الأقسام adhkar-pages.json.
const adhkarPages = require("../src/home/adhkar-pages.json");
const headphonesIcon = '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4.6" height="6.6" rx="2"/><rect x="16.4" y="14" width="4.6" height="6.6" rx="2"/>';

// بطاقات التطبيق: لكل منها ملف HTML مستقل.
const appCards = [
  ["social/cards/home.html", "social/zad-alkhair-share-v2.jpg"],
  ["social/cards/reader.html", readerCardOutput],
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
.share-mode{position:absolute;left:28px;top:42px;display:flex;align-items:center;gap:11px;padding:10px 19px;border-radius:999px;border:1px solid #A6B9A5;background:#EEF1E7;color:#245549;font:650 31px/1.3 Alexandria,sans-serif}
.share-mode svg{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.share-mode.listen{border-color:#D3B77E;background:#F7EDDA;color:#74521D}
</style></head><body>`;

const twoTone = (vowelled, bare) => `<span class="vowels">${vowelled}</span><span class="letters">${bare}</span>`;
const writtenSurah = w => `<div class="two title"${w.dottedQaf ? ' style="font-feature-settings:\'jalt\'"' : ""}>${twoTone("سُورَةُ " + w.nameVowelled, "سورة " + w.name)}</div>
<div class="rule"><i></i><b></b><i></i></div>
<div class="data"><span class="two">${twoTone(w.placeVowelled, w.place)}</span><span class="sep"></span><span class="two">${twoTone("آيَاتُهَا", "آياتها")}</span><span class="two num">${w.verses}</span></div>`;

const juzLine = (word, [name, nameVowelled, verse]) =>
  `<div class="data juzline"><span class="two">${twoTone(`${word} سُورَةِ ${nameVowelled} الآية رقم`, `${word} سورة ${name} الآية رقم`)}</span><span class="two num">${verse}</span></div>`;
const writtenJuz = w => `<div class="two title" style="font-size:125px">${twoTone(w.titleVowelled, w.title)}</div>
<div class="rule" style="margin-bottom:56px"><i></i><b></b><i></i></div>${juzLine("من", w.from)}${juzLine("إلى", w.to)}`;

function contentLettering(id) {
  const w = written[id];
  return w ? (w.juz ? writtenJuz(w) : writtenSurah(w))
    : `<img src="${fileUrl(`social/cards/lettering/${id}.png`)}" alt="" style="display:block">`;
}

function contentCards() {
  const cards = [];
  for (let n = 1; n <= 114; n++) cards.push({ id: `surah-${String(n).padStart(3, "0")}`, kind: "surah", n });
  for (let n = 1; n <= 30; n++) cards.push({ id: `juz-${String(n).padStart(2, "0")}`, kind: "juz", n });
  return cards.map(card => {
    const inner = contentLettering(card.id);
    const html = `${contentHead}<div class="ground"><div class="card">${inner}</div><div class="address">zad-alkhair.net/${card.kind}/${card.n}</div></div></body></html>`;
    return { html, output: `social/${card.kind}/${card.id}-v2.jpg`, kind: card.kind };
  });
}

function surahShareCards(surahs) {
  const modes = [
    ["read", "قراءة", bookIcon],
    ["listen", "استماع", headphonesIcon],
  ];
  return surahs.flatMap(n => {
    const id = `surah-${String(n).padStart(3, "0")}`;
    const inner = contentLettering(id);
    return modes.map(([mode, label, icon]) => {
      const badge = `<div class="share-mode ${mode}"><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg>${label}</div>`;
      const html = `${contentHead}<div class="ground"><div class="card">${inner}${badge}</div><div class="address">zad-alkhair.net/quran-${mode}/${n}</div></div></body></html>`;
      return { html, output: `social/surah/${id}-${mode}-v2.jpg` };
    });
  });
}

(async () => {
  const only = (process.argv.find(a => a.startsWith("--only=")) || "").slice(7);
  const surahArg = process.argv.find(a => a.startsWith("--surah="));
  const surah = Number(surahArg?.slice(8));
  if (surahArg && (only !== "listen-share" || !Number.isInteger(surah) || surah < 1 || surah > 114)) {
    throw Error("Use --surah=1…114 with --only=listen-share");
  }
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
  if (only === "listen-share") {
    await page.goto(fileUrl("social/cards/reader.html"));
    await shoot(page, readerCardOutput);
    await page.evaluate(icon => {
      document.querySelector("[data-card-icon]").innerHTML = icon;
      document.querySelector("[data-card-label]").textContent = "مشغّل التلاوة في زاد الخير";
      document.querySelector("[data-card-address]").textContent = "zad-alkhair.net/quran-listen";
    }, headphonesIcon);
    await shoot(page, "social/zad-alkhair-listen-share-v2.jpg");
  }
  if (only === "adhkar") {
    await page.goto(fileUrl("social/cards/reader.html"));
    for (const item of adhkarPages) {
      await page.evaluate(item => {
        document.querySelector("[data-card-icon]").innerHTML = item.icon;
        document.querySelector("[data-card-label]").textContent = "الأذكار في زاد الخير";
        const title = document.querySelector("[data-card-title]");
        title.textContent = item.title;
        /* عنوان طويل («أذكار الاستيقاظ») يصغر حتى يتسع للبطاقة. */
        title.style.fontSize = "124px";
        for (let size = 124; title.scrollWidth > 760 && size > 80; size -= 4) title.style.fontSize = size + "px";
        document.querySelector("[data-card-sub]").textContent = item.card;
        document.querySelector("[data-card-address]").textContent = "zad-alkhair.net" + item.path.replace(/\/$/, "");
      }, item);
      await page.evaluate(() => document.fonts.ready);
      await shoot(page, `social/adhkar/${item.slug}.jpg`);
    }
    await browser.close();
    return;
  }
  const cards = only === "listen-share"
    ? surahShareCards(surahArg ? [surah] : Array.from({ length: 114 }, (_, i) => i + 1))
    : contentCards().filter(card => !only || only === card.kind);
  for (const card of cards) {
    fs.writeFileSync(tmp, card.html);
    await page.goto("file://" + tmp);
    await shoot(page, card.output);
  }
  fs.rmSync(tmp, { force: true });
  await browser.close();
})();
