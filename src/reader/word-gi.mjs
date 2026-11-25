/* رقم الكلمة الثابت (الفهرس الموحّد) لكل كلمة في صفحة QCF.
   data/words/index.json فيه لكل رقم كلمة gi موضعها في QCF: السطر (qcf_line) وترتيبها في
   words[] ذلك السطر (qcf_word)، والصفحة هي صفحة المصحف إلا ما في qcf_page.
   «لَّوۡمَا» (الحجر 7) محرفان في QCF: الثاني في qcf_extra ويشير إلى الكلمة نفسها. */

let ready = null;
const byPage = new Map();   // الصفحة → Map("السطر:الكلمة" → gi)

function build(I) {
  let page = 1;
  const put = (p, line, word, gi) => {
    if (!byPage.has(p)) byPage.set(p, new Map());
    byPage.get(p).set(`${line}:${word}`, gi);
  };
  for (let gi = 0; gi < I.count; gi++) {
    while (page < 604 && I.page_starts[page] <= gi) page++;
    put(I.qcf_page[gi] ?? page, I.qcf_line[gi], I.qcf_word[gi], gi);
  }
  for (const [gi, [p, line, word]] of Object.entries(I.qcf_extra || {})) put(p, line, word, Number(gi));
}

/** يحمّل الفهرس مرة واحدة. لا يرمي: إن تعذّر التحميل بقيت الكلمات بلا رقم. */
export function loadWordIndex() {
  if (!ready) ready = fetch("/data/words/index.json", { cache: "force-cache" })
    .then(r => (r.ok ? r.json() : null))
    .then(I => { if (I) build(I); })
    .catch(() => { ready = null; });
  return ready;
}

/** رقم الكلمة: الصفحة، وموضع السطر في lines[] (من 0)، وموضع الكلمة في words[] السطر. */
export function wordGiAt(page, lineIndex, wordIndex) {
  const m = byPage.get(Number(page));
  return m ? m.get(`${lineIndex}:${wordIndex}`) : undefined;
}
