"use strict";

// Keep the two offline-critical documents self-contained. Source files are
// separate for editing; emitted HTML retains the original inline execution order.
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { readerRoutes, supported, shareOrigin, preview, indexPath } = require("./quran-routes.cjs");
const { readAppScript } = require("./app-source.cjs");
const root = path.resolve(__dirname, "..");
const check = process.argv.includes("--check");
const escape = value => String(value).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
let stale = false;

function write(output, content) {
  const target = path.join(root, output);
  if (fs.existsSync(target) && fs.readFileSync(target, "utf8") === content) return;
  if (check) {
    console.error(`Stale generated file: ${output}; run npm run build`);
    stale = true;
    return;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function appSources(dir) {
  const css = fs.readFileSync(path.join(dir, "styles.css"), "utf8");
  const js = readAppScript(dir);
  if (/<\/script[\s>]/i.test(js) || /<\/style[\s>]/i.test(css)) throw Error(`Unsafe inline closing tag in ${dir}`);
  return { css, js };
}

function readerMeta({ mode, surah, path: route }) {
  const listening = mode === "listen";
  const kind = listening ? "استماع" : "قراءة";
  const label = surah ? `سورة ${surah.name} — ${kind}` : listening ? "مشغّل التلاوة في زاد الخير" : "قارئ زاد الخير";
  const title = surah ? `${label} | زاد الخير` : label;
  const description = surah
    ? listening ? `استمع إلى سورة ${surah.name} بصوت القارئ الذي تختاره في مشغّل زاد الخير.`
      : `اقرأ سورة ${surah.name} في المصحف الشريف مع التفسير الوجيز في زاد الخير.`
    : listening ? "استمع إلى القرآن العظيم في مشغّل زاد الخير." : "اقرأ القرآن العظيم في مصحف زاد الخير.";
  const image = surah ? `/social/surah/surah-${String(surah.n).padStart(3, "0")}-${mode}-v2.jpg`
    : `/social/zad-alkhair-${listening ? "listen" : "reader"}-share-v2.jpg`;
  const meta = (name, content) => `<meta ${name.startsWith("og:") ? "property" : "name"}="${name}" content="${escape(content)}">`;
  return [
    `<title>${escape(title)}</title>`,
    meta("description", description),
    meta("robots", preview || listening || !surah ? "noindex,follow" : "index,follow,max-image-preview:large"),
    `<link rel="canonical" href="https://zad-alkhair.net${route}">`,
    meta("og:type", "website"), meta("og:locale", "ar_AR"), meta("og:site_name", "زاد الخير"),
    meta("og:url", shareOrigin + route), meta("og:title", title), meta("og:description", description),
    meta("og:image", shareOrigin + image), meta("og:image:alt", label),
    meta("og:image:width", "1200"), meta("og:image:height", "675"),
    meta("twitter:card", "summary_large_image"), meta("twitter:title", title),
    meta("twitter:description", description), meta("twitter:image", shareOrigin + image),
  ].join("\n");
}

function readingSummary({mode, surah}) {
  if (mode !== "read" || !surah) return "تحميل مصحف المدينة QCF4…";
  const n = surah.n;
  const tafsir = JSON.parse(fs.readFileSync(path.join(root, "data/tafsir/al-wajeez", String(n).padStart(3, "0") + ".json"), "utf8"));
  const title = `سورة ${surah.name}`;
  return `<article class="reader-surah-summary">
  <h1>${escape(title)} مكتوبة</h1>
  <p>السورة رقم ${n} في المصحف، وعدد آياتها ${surah.verses}.</p>
  <h2>من تفسير الآية الأولى للدكتور وهبة الزحيلي</h2>
  <p>${escape(tafsir.ayahs["1"].text)}</p>
  <nav aria-label="روابط ${escape(title)}"><a href="/quran-listen/${n}/">استمع إلى ${escape(title)}</a> · <a href="${indexPath}">فهرس القرآن</a></nav>
  <p role="status">جارٍ فتح المصحف…</p>
</article>`;
}

for (const [name, output] of [["home", "index.html"], ["reader", "reader.html"]]) {
  const dir = path.join(root, "src", name);
  let template = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  const { css, js } = appSources(dir);
  const cssMarker = "<!-- @inline styles.css -->", jsMarker = "<!-- @inline app.js -->";
  for (const marker of [cssMarker, jsMarker]) {
    if (template.split(marker).length !== 2) throw Error(`Expected one ${marker} in ${name}`);
  }
  if (name === "reader") {
    template = template.replace("<!-- @quran-route-config -->", `<meta name="zk-direct-reader" content="${[...supported].join(",")}">`);
  }
  write(output, template.replace(cssMarker, () => css).replace(jsMarker, () => js));
  if (name !== "reader") continue;

  const version = createHash("sha256").update(css).update("\0").update(js).digest("hex").slice(0, 12);
  const assets = "/quran/runtime/reader";
  write("quran/runtime/reader.css", css);
  write("quran/runtime/reader.js", js);
  const directTemplate = template
    .replace(`<style>${cssMarker}</style>`, `<link rel="stylesheet" href="${assets}.css?v=${version}">`)
    .replace(`<script>${jsMarker}</script>`, `<script src="${assets}.js?v=${version}"></script>`)
    .replace("</body>", `<noscript><p>فعّل JavaScript لفتح المصحف ومشغّل التلاوة. <a href="${indexPath}">فهرس القرآن</a></p></noscript>\n</body>`);
  for (const route of readerRoutes) {
    const html = directTemplate.replace(/<!-- @reader-meta-start -->[\s\S]*?<!-- @reader-meta-end -->/, () => readerMeta(route))
      .replace("تحميل مصحف المدينة QCF4…", () => readingSummary(route));
    write(`${route.path.slice(1)}index.html`, html);
  }
}

const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const directPaths = /^const DIRECT_QURAN_PATHS=.*;$/m;
if (!directPaths.test(worker)) throw Error("Missing direct Quran paths in sw.js");
write("sw.js", worker.replace(directPaths, `const DIRECT_QURAN_PATHS=new Set(${JSON.stringify(readerRoutes.map(route => route.path))});`));
if (stale) process.exitCode = 1;
