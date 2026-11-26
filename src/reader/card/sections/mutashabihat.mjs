/* المتشابهات: العبارات التي تقع فيها الكلمة، ومواضع كل عبارة. الضغط على موضع ينقل إليه،
   والسهمان ينقلان إلى الموضع السابق والتالي. تُبرز في كل موضع الكلمات التي تخالف الموضع الحالي. */
import { registerSection, goTo } from "../card.mjs";
import { mutashabihatFor } from "../data.mjs";
import { esc, node, AR, surahName, ayahLink } from "./util.mjs";

const SOURCE = "ترتيل (Tarteel)، مكتبة QUL";
const bare = s => String(s).replace(/[ً-ٰٟۖ-ۭـ]/g, "").replace(/[ٱأإآ]/g, "ا");
const hereOf = (ph, gi) => ph.occ.find(o => gi >= o.a && gi <= o.b) || ph.occ[0];

registerSection({
  id: "mutashabihat", level: "word", label: "المتشابهات", order: 30, nav: "occ",
  async available(ctx) { return (await mutashabihatFor(ctx.gi)).length > 0; },
  source: () => SOURCE,
  async render(ctx) {
    const phrases = await mutashabihatFor(ctx.gi);
    const box = node(`<div class="zc-stack"></div>`);
    for (const ph of phrases) {
      const here = hereOf(ph, ctx.gi);
      const differs = ph.occ.filter(o => o.words.map(bare).join(" ") !== here.words.map(bare).join(" ")).length;
      box.appendChild(node(`<div class="ref">«${esc(here.words.join(" "))}» في ${AR(ph.occ.length)} مواضع${differs ? `، ويخالف ${AR(differs)} منها` : ""}</div>`));
      for (const o of ph.occ) {
        const isHere = o === here;
        const text = o.words.map((w, k) => (here.words[k] !== undefined && bare(w) !== bare(here.words[k]) ? `<span class="zc-diff">${esc(w)}</span>` : esc(w))).join(" ");
        const name = await surahName(o.surah);
        const b = node(`<div class="zc-occ${isHere ? " here" : ""}" role="button" tabindex="0" data-report="المتشابهات: ${esc(name)} ${o.ayah}"><span class="r"><b>${esc(name)} ${AR(o.ayah)}</b><span>${isHere ? "هنا" : "ص " + AR(o.page)}</span></span><span class="t">${text}</span></div>`);
        if (!isHere) b.onclick = e => { if (!e.target.closest(".zc-rep,.zc-repform")) goTo(o.page, o.a + Math.max(0, ctx.gi - here.a)); };
        box.appendChild(b);
      }
    }
    return box;
  },
  /* الموضع السابق أو التالي في العبارة الأولى، على الكلمة المقابلة للكلمة الحالية. */
  async step(ctx, d) {
    const [ph] = await mutashabihatFor(ctx.gi);
    if (!ph) return null;
    const here = hereOf(ph, ctx.gi), k = ph.occ.indexOf(here), o = ph.occ[k + d];
    if (!o) return null;
    return { page: o.page, gi: Math.min(o.b, o.a + (ctx.gi - here.a)) };
  },
  async shareText(ctx) {
    const phrases = await mutashabihatFor(ctx.gi), out = [];
    for (const ph of phrases) {
      out.push(`«${hereOf(ph, ctx.gi).words.join(" ")}»`);
      for (const o of ph.occ) out.push(`${await surahName(o.surah)} ${AR(o.ayah)}: ${o.words.join(" ")}`);
    }
    return `المتشابهات\n${out.join("\n")}\nالمصدر: ${SOURCE}\n${ayahLink(ctx.surah, ctx.ayah)}`;
  },
});
