/* أقسام مستوى الآية: التفسير (المختصر، السعدي، الوجيز)، الإعراب، التصريف، أسباب النزول. */
import { registerSection, refresh } from "../card.mjs";
import { TAFSIRS, tafsir, ayahIrab, ayahWords, wordLayers, nuzool } from "../data.mjs";
import { tafsirFadlForSurah } from "../../tafsir.mjs";
import { esc, node, para, ref, surahName, shareBlock, SOURCE_CENTER } from "./util.mjs";

const TAFSIR_SOURCE = {
  "al-mukhtasar": `المختصر في تفسير القرآن الكريم، ${SOURCE_CENTER}`,
  "al-saadi": `تفسير السعدي، عن ${SOURCE_CENTER}`,
  "al-wajeez": "التفسير الوجيز، د. وهبة الزحيلي",
};
/* آخر تفسير اختاره المستخدم؛ والوجيز أولًا كما كان في زاد الخير. */
const BOOK_KEY = "zad:tafsir-book";
let book = "al-wajeez";
try { const b = localStorage.getItem(BOOK_KEY); if (TAFSIRS.some(t => t.id === b)) book = b; } catch {}
/* علامات المختصر _…_ حول الكلمات المفسَّرة تصير إبرازًا، وتُفصل الفقرات عند الأسطر الجديدة. */
const rich = text => esc(text).replace(/_([^_\n]+)_/g, '<span class="zc-em">$1</span>');
const paras = (text, where, fmt = esc, cls = "") => text.split(/\n+/).filter(Boolean).map(t => para(fmt(t), where, cls)).join("");

registerSection({
  id: "tafsir", level: "ayah", label: "التفسير", order: 10, nav: "ayah",
  title: () => TAFSIRS.find(t => t.id === book).id === "al-wajeez" ? "التفسير الوجيز" : "التفسير",
  available: () => true,
  source: () => TAFSIR_SOURCE[book],
  get sourceMore() {
    return book === "al-wajeez" ? { label: "اقرأ المزيد", run: () => window.dispatchEvent(new CustomEvent("zad:tafsir-author")) } : null;
  },
  async render(ctx) {
    const text = await tafsir(book, ctx.surah, ctx.ayah);
    const label = TAFSIRS.find(t => t.id === book).label;
    let fadl = "";
    if (book === "al-wajeez") {
      try {
        const f = await tafsirFadlForSurah(ctx.surah);
        if (f && f.text) fadl = `<details class="tafsir-fadl"><summary>فضل سورة ${esc(await surahName(ctx.surah))}</summary><div class="tafsir-fadl-text">${esc(f.text)}</div></details>`;
      } catch {}
    }
    const box = node(`<div class="zc-stack">
      <div class="zc-chips"></div>
      <div class="ref">${esc(await ref(ctx))}</div>
      ${text ? paras(text, `التفسير: ${label}`, book === "al-mukhtasar" ? rich : esc, "tafsir") : '<div class="zc-none">لم يُنزَّل هذا التفسير بعد</div>'}
      ${fadl}</div>`);
    const chips = box.querySelector(".zc-chips");
    for (const t of TAFSIRS) {
      const b = node(`<button type="button" class="zc-chip${t.id === book ? " on" : ""}">${esc(t.label)}</button>`);
      b.onclick = () => { book = t.id; try { localStorage.setItem(BOOK_KEY, book); } catch {} refresh(); };
      chips.appendChild(b);
    }
    return box;
  },
  async shareText(ctx) {
    const text = await tafsir(book, ctx.surah, ctx.ayah);
    return text && shareBlock(`التفسير ${TAFSIRS.find(t => t.id === book).label}`, text.replace(/_([^_\n]+)_/g, "$1"), TAFSIR_SOURCE[book], ctx);
  },
});

registerSection({
  id: "ayah-irab", level: "ayah", label: "الإعراب", title: "إعراب الآية", order: 20, nav: "ayah",
  async available(ctx) { return !!(await ayahIrab(ctx.surah, ctx.ayah)); },
  source: () => SOURCE_CENTER,
  async render(ctx) {
    const text = await ayahIrab(ctx.surah, ctx.ayah);
    // السطر الأول نص الآية بين قوسين؛ وكل سطر بعده «الكلمة: إعرابها»
    const body = text.split(/\n+/).filter(Boolean).map((l, k) => {
      if (k === 0 && /^\{.*\}$/.test(l.trim())) return "";
      const m = l.match(/^([^:]{1,40}):\s*(.*)$/);
      return para(m ? `<b>${esc(m[1])}:</b> ${esc(m[2])}` : esc(l), "إعراب الآية");
    }).join("");
    return node(`<div class="zc-stack zc-irab"><div class="ref">${esc(await ref(ctx))}</div>${body}</div>`);
  },
  async shareText(ctx) { return shareBlock("إعراب الآية", (await ayahIrab(ctx.surah, ctx.ayah)) || "", SOURCE_CENTER, ctx); },
});

async function sarfRows(ctx) {
  const rows = [];
  for (const w of await ayahWords(ctx.page, ctx.surah, ctx.ayah)) { const L = await wordLayers(w.page, w.gi); if (L && L.sarf) rows.push(L.sarf); }
  return rows;
}
registerSection({
  id: "ayah-sarf", level: "ayah", label: "التصريف", title: "تصريف كلمات الآية", order: 30, nav: "ayah",
  available: () => true,
  source: () => SOURCE_CENTER,
  async render(ctx) {
    const rows = await sarfRows(ctx);
    return node(`<div class="zc-stack"><div class="ref">${esc(await ref(ctx))}</div>${rows.map(r => para(esc(r), "تصريف الآية")).join("")}</div>`);
  },
  async shareText(ctx) { return shareBlock("تصريف كلمات الآية", (await sarfRows(ctx)).join("\n"), SOURCE_CENTER, ctx); },
});

registerSection({
  id: "nuzool", level: "ayah", label: "أسباب النزول", order: 40, nav: "ayah",
  async available(ctx) { return !!(await nuzool(ctx.surah, ctx.ayah)); },
  source: () => SOURCE_CENTER,
  async render(ctx) {
    const text = await nuzool(ctx.surah, ctx.ayah);
    return node(`<div class="zc-stack"><div class="ref">${esc(await ref(ctx))}</div>${paras(text, "أسباب النزول")}</div>`);
  },
  async shareText(ctx) { return shareBlock("أسباب النزول", await nuzool(ctx.surah, ctx.ayah), SOURCE_CENTER, ctx); },
});
