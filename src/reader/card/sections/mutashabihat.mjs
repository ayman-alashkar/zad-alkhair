/* المتشابهات: العبارات التي تقع فيها الكلمة، ومواضع كل عبارة. الضغط على موضع ينقل إليه.
   تُبرز في كل موضع الكلمات التي تخالف الموضع الحالي في رسمها. */
import { registerSection, goTo } from "../card.mjs";
import { mutashabihatFor, wordIndex, wordLayers, qiraatPage } from "../data.mjs";
import { esc, node, src, AR, surahName } from "./util.mjs";

const bare = s => String(s).replace(/[ً-ٰٟۖ-ۭـ]/g, "").replace(/[ٱأإآ]/g, "ا");
const pageOf = (I, g) => { let p = 1; while (p < 604 && I.page_starts[p] <= g) p++; return p; };

async function occurrence(I, a, b) {
  const words = [];
  for (let g = a; g <= b; g++) { const L = await wordLayers(pageOf(I, g), g); words.push(L ? L.text : ""); }
  const page = pageOf(I, a), Q = await qiraatPage(page), w = Q && Q.words[a - Q.words[0][0]];
  return { a, b, page, words, surah: w ? w[1] : 0, ayah: w ? w[2] : 0 };
}

registerSection({
  id: "mutashabihat", level: "word", label: "المتشابهات", order: 50,
  async available(ctx) { return (await mutashabihatFor(ctx.gi)).length > 0; },
  async render(ctx) {
    const I = await wordIndex(), phrases = await mutashabihatFor(ctx.gi);
    const box = node(`<div style="display:contents"></div>`);
    for (const ph of phrases) {
      const occ = [];
      for (const [a, b] of ph.occ) occ.push(await occurrence(I, a, b));
      const here = occ.find(o => ctx.gi >= o.a && ctx.gi <= o.b) || occ[0];
      const differs = occ.filter(o => o.words.map(bare).join(" ") !== here.words.map(bare).join(" ")).length;
      box.appendChild(node(`<div class="zc-sub" style="text-align:start">«${esc(here.words.join(" "))}» في ${AR(occ.length)} مواضع${differs ? `، ويخالف ${AR(differs)} منها` : ""}. اضغط موضعًا للانتقال إليه.</div>`));
      for (const o of occ) {
        const isHere = o === here;
        const text = o.words.map((w, k) => (here.words[k] !== undefined && bare(w) !== bare(here.words[k]) ? `<span style="color:#C2185B">${esc(w)}</span>` : esc(w))).join(" ");
        const b = node(`<button type="button" class="zc-occ${isHere ? " here" : ""}"><span class="r"><b>${esc(await surahName(o.surah))} ${AR(o.ayah)}</b><span>${isHere ? "هنا" : "ص " + AR(o.page)}</span></span><span class="t">${text}</span></button>`);
        if (!isHere) b.onclick = () => goTo(o.page, o.a);
        box.appendChild(b);
      }
    }
    box.appendChild(node(src("المتشابهات من ترتيل (Tarteel) — مكتبة QUL")));
    return box;
  },
});
