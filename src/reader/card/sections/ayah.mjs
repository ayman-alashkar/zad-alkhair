/* أقسام مستوى الآية: التفسير (المختصر، السعدي، الوجيز)، الإعراب، التصريف، أسباب النزول. */
import { registerSection } from "../card.mjs";
import { TAFSIRS, tafsir, ayahIrab, ayahWords, wordLayers, nuzool } from "../data.mjs";
import { esc, node, para, src, ref, shareBlock, SOURCE_CENTER } from "./util.mjs";

const TAFSIR_SOURCE = { "al-mukhtasar": SOURCE_CENTER, "al-saadi": `تفسير السعدي، عن ${SOURCE_CENTER}`, "al-wajeez": "التفسير الوجيز" };
let book = "al-mukhtasar";
/* علامات المختصر _…_ حول الكلمات المفسَّرة تصير إبرازًا، وتُفصل الفقرات عند الأسطر الجديدة. */
const rich = (text, id) => esc(text).replace(/_([^_\n]+)_/g, '<span class="zc-em">$1</span>');
const paras = (text, where, fmt = esc) => text.split(/\n+/).filter(Boolean).map(t => para(fmt(t), where)).join("");

registerSection({
  id: "tafsir", level: "ayah", label: "التفسير", order: 10,
  available: () => true,
  async render(ctx) {
    const text = await tafsir(book, ctx.surah, ctx.ayah);
    const label = TAFSIRS.find(t => t.id === book).label;
    const box = node(`<div style="display:contents">
      <div class="zc-chips"></div>
      <div class="zc-sub">${esc(await ref(ctx))} · ${esc(label)}</div>
      ${text ? paras(text, `التفسير: ${label}`, book === "al-mukhtasar" ? rich : esc) : '<div class="zc-none">لم يُنزَّل هذا التفسير بعد</div>'}
      ${src(`من ${TAFSIR_SOURCE[book]}`)}</div>`);
    const chips = box.querySelector(".zc-chips");
    for (const t of TAFSIRS) {
      const b = node(`<button type="button" class="zc-chip${t.id === book ? " on" : ""}">${esc(t.label)}</button>`);
      b.onclick = async () => { book = t.id; box.replaceWith(await this.render(ctx)); };
      chips.appendChild(b);
    }
    return box;
  },
  async shareText(ctx) {
    const text = await tafsir(book, ctx.surah, ctx.ayah);
    return text && shareBlock(`التفسير — ${TAFSIRS.find(t => t.id === book).label}`, text.replace(/_([^_\n]+)_/g, "$1"), TAFSIR_SOURCE[book], ctx);
  },
});

registerSection({
  id: "ayah-irab", level: "ayah", label: "الإعراب", order: 20,
  async available(ctx) { return !!(await ayahIrab(ctx.surah, ctx.ayah)); },
  async render(ctx) {
    const text = await ayahIrab(ctx.surah, ctx.ayah);
    // السطر الأول نص الآية بين قوسين؛ وكل سطر بعده «الكلمة: إعرابها»
    const lines = text.split(/\n+/).filter(Boolean);
    const body = lines.map((l, k) => {
      if (k === 0 && /^\{.*\}$/.test(l.trim())) return "";
      const m = l.match(/^([^:]{1,40}):\s*(.*)$/);
      return para(m ? `<b>${esc(m[1])}:</b> ${esc(m[2])}` : esc(l), "إعراب الآية");
    }).join("");
    return node(`<div class="zc-irab" style="display:contents"><div class="zc-sub">${esc(await ref(ctx))} · إعراب الآية كاملة</div>${body}${src(`من ${SOURCE_CENTER}`)}</div>`);
  },
  async shareText(ctx) {
    return shareBlock("إعراب الآية", (await ayahIrab(ctx.surah, ctx.ayah)) || "", SOURCE_CENTER, ctx);
  },
});

registerSection({
  id: "ayah-sarf", level: "ayah", label: "التصريف", order: 30,
  available: () => true,
  async render(ctx) {
    const words = await ayahWords(ctx.page, ctx.surah, ctx.ayah);
    const rows = [];
    for (const w of words) { const L = await wordLayers(w.page, w.gi); if (L && L.sarf) rows.push(para(esc(L.sarf), "تصريف الآية")); }
    return node(`<div style="display:contents"><div class="zc-sub">${esc(await ref(ctx))} · تصريف كلمات الآية</div>${rows.join("")}${src(`من ${SOURCE_CENTER}`)}</div>`);
  },
});

registerSection({
  id: "nuzool", level: "ayah", label: "أسباب النزول", order: 40,
  async available(ctx) { return !!(await nuzool(ctx.surah, ctx.ayah)); },
  async render(ctx) {
    const text = await nuzool(ctx.surah, ctx.ayah);
    return node(`<div style="display:contents"><div class="zc-sub">${esc(await ref(ctx))} · أسباب النزول</div>${paras(text, "أسباب النزول")}${src(`من ${SOURCE_CENTER}`)}</div>`);
  },
  async shareText(ctx) { return shareBlock("أسباب النزول", await nuzool(ctx.surah, ctx.ayah), SOURCE_CENTER, ctx); },
});
