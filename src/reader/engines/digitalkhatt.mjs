/* محرّك DigitalKhatt للروايات غير حفص: الصفحة نفسها (سطور طبعة المدينة 1441)، كل سطر
   صورة SVG مرسومة مسبقًا بخط DigitalKhatt (data/qiraat-mushaf، يبنيها
   scripts/build-qiraat-mushaf.mjs). ملف كل صفحة فيه سطور حفص كاملة، ولكل رواية السطور
   التي تخالف فيها حفصًا وحدها؛ ومسارات الحروف كلها في meta.json.

   عنوان السورة والبسملة يرسمهما محرّك QCF كما هما (السطور نفسها في الطبعتين)، ثم تُستبدل
   أسطر النص بأسطر DigitalKhatt بالترتيب. علامات العناصر كما تطلبها ayah-marks.mjs:
   data-ayah وdata-gi على مجموعة حروف كل كلمة، فالضغطات والتحديد تعمل كما في حفص. */

const SVGNS = "http://www.w3.org/2000/svg";
const ASC = 1000, LH = 1330;
const pad = n => String(n).padStart(3, "0");
let metaPromise = null;

function loadMeta() {
  if (!metaPromise) metaPromise = fetch("/data/qiraat-mushaf/meta.json", { cache: "force-cache" })
    .then(r => { if (!r.ok) throw new Error("meta " + r.status); return r.json(); })
    .then(meta => { installGlyphs(meta); return meta; })
    .catch(e => { metaPromise = null; throw e; });
  return metaPromise;
}

/* مسارات الحروف مرة واحدة في المستند، وكل سطر يستعملها بـ <use>. */
function installGlyphs(meta) {
  if (document.getElementById("dk-glyphs")) return;
  const svg = document.createElementNS(SVGNS, "svg");
  svg.id = "dk-glyphs";
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
  const defs = document.createElementNS(SVGNS, "defs");
  for (const [gid, d] of Object.entries(meta.glyphs)) {
    const p = document.createElementNS(SVGNS, "path");
    p.id = "dkg" + gid;
    p.setAttribute("d", d);
    defs.appendChild(p);
  }
  svg.appendChild(defs);
  document.body.appendChild(svg);
}

function lineSvg(L, P, meta, first) {
  const W = Math.max(meta.lineUnits, L.n), MK = meta.mk;
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("class", "dk-line");
  svg.setAttribute("viewBox", `${-W} ${-ASC} ${W} ${LH}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  const flip = document.createElementNS(SVGNS, "g");
  flip.setAttribute("transform", "scale(1,-1)");
  svg.appendChild(flip);
  const groups = new Map();
  const groupFor = t => {
    if (groups.has(t)) return groups.get(t);
    const g = document.createElementNS(SVGNS, "g");
    const i = t >= MK ? t - MK : t;
    const key = `${P.data.surah[i]}:${P.data.ayah[i]}`;
    g.dataset.ayah = key;
    if (t < MK) { g.dataset.gi = String(first + i); g.setAttribute("class", "dk-w"); }
    else g.setAttribute("class", "dk-end" + (P.ghost && P.ghost.has(i) ? " ghost" : "") + (P.added && P.added.has(i) ? " added" : ""));
    flip.appendChild(g);
    groups.set(t, g);
    return g;
  };
  /* مساحة ضغط لكل كلمة: مستطيل شفاف بعرضها وارتفاع السطر، فيصيب الإصبع الكلمة لا الفراغ
     بين حروفها، ويُلوَّن عند تحديد الآية. L.e أزواج [الكلمة، بداية رسمها] من اليمين. */
  for (let k = 0; k < L.e.length; k += 2) {
    const t = L.e[k];
    if (t < 0) continue;
    const right = L.e[k + 1], left = k + 3 < L.e.length ? L.e[k + 3] : -L.n;
    const rect = document.createElementNS(SVGNS, "rect");
    rect.setAttribute("x", Math.min(left, right));
    rect.setAttribute("y", -(LH - ASC));
    rect.setAttribute("width", Math.abs(right - left));
    rect.setAttribute("height", LH);
    rect.setAttribute("class", "dk-hit");
    groupFor(t).appendChild(rect);
  }
  for (let j = 0; j < L.t.length; j++) {
    const u = document.createElementNS(SVGNS, "use");
    u.setAttribute("href", "#dkg" + L.g[3 * j]);
    u.setAttribute("x", L.g[3 * j + 1]);
    u.setAttribute("y", L.g[3 * j + 2]);
    if (L.c[j]) u.setAttribute("class", "dk-c" + L.c[j]);
    groupFor(L.t[j]).appendChild(u);
  }
  return svg;
}

/**
 * env: { qcfPrepare(page, data), qcfRender(host, data), riwaya() → رمز الرواية المختارة }
 */
export function createDigitalKhattEngine(env) {
  return {
    id: "digitalkhatt",
    async prepare(page, data) {
      const [meta, P] = await Promise.all([
        loadMeta(),
        fetch(`/data/qiraat-mushaf/pages/${pad(page)}.json`, { cache: "force-cache" }).then(r => { if (!r.ok) throw new Error("page " + r.status); return r.json(); }),
        env.qcfPrepare(page, data),
      ]);
      return { meta, P, data };
    },
    renderLines(host, prepared) {
      const { meta, P, data } = prepared, r = env.riwaya();
      env.qcfRender(host, data);
      const am = P.data.AM[r] || {};
      P.ghost = new Set(Object.entries(am).filter(([, v]) => v[2] === "-").map(([i]) => Number(i)));
      P.added = new Set(Object.entries(am).filter(([, v]) => v[2] === "+").map(([i]) => Number(i)));
      const own = (P.lines[r] && !Array.isArray(P.lines[r])) ? P.lines[r] : {};
      const first = P.data.first;
      let li = 0;
      for (const inner of host.querySelectorAll(".line-inner")) {
        if (inner.classList.contains("surah-line") || inner.classList.contains("bismillah-line")) continue;
        const L = own[li] || P.lines.hafs[li];
        li++;
        if (!L) continue;
        inner.replaceChildren(lineSvg(L, P, meta, first));
        inner.classList.add("dk");
        inner.style.fontFamily = "";
      }
      host.dataset.riwaya = r;
    },
  };
}
