
(()=>{
"use strict";
/* v85 Reader Navigation + Hardware Back + Bottom Dock
   v80 Quran Home + Offline Foundation + Repeat Semantics
   Based on v78 Index Social Sharing.
   Built directly on the approved v56 reference. Visual/QCF layout contracts are unchanged; production dependencies are hardened and tafsir is lazy-loaded locally.

   Invariants:
   - Mushaf pages are pre-rendered from the KFGQPC 1441H text and layout (data/mushaf).
   - Verified tafsir is loaded lazily from the local audited static repository.
   - Audio behavior is provider-specific; no hidden provider switching.
   - UI ordering never determines the default reciter.
   - The QUL surah title font is served locally (fonts/qul), with a Mushaf-font fallback.
*/
/* المصحف مرسوم مسبقًا في data/mushaf (scripts/build-mushaf.mjs، والعرض في mushaf-dk.js). */
const MUSHAF_BASE="/data/mushaf/";
/* بصمة بيانات data/mushaf (يكتبها scripts/build-app.cjs): تُلحق بعناوين ملفاتها فلا يُقدَّم قديمها. */
const MUSHAF_VERSION="dev";
const MUSHAF_Q="?v="+MUSHAF_VERSION;
const PAGE_BASE=MUSHAF_BASE+"pages/";
const PAGE_SUFFIX=".json"+MUSHAF_Q;
const INDEX_URL=MUSHAF_BASE+"index.json"+MUSHAF_Q;
const VERSE_INDEX_URL=MUSHAF_BASE+"verses.json"+MUSHAF_Q;
try{localStorage.removeItem("zad:mushaf-engine")}catch(_){} // مفتاح فترة التجربة، لم يعد له معنى
const TOTAL_PAGES=604;
const SURAH_HEADER_GLYPHS=[null,"ﱅ","ﱆ","ﱇ","ﱊ","ﱋ","ﱎ","ﱏ","ﱑ","ﱒ","ﱓ","ﱕ","ﱖ","ﱘ","ﱚ","ﱛ","ﱜ","ﱝ","ﱞ","ﱡ","ﱢ","ﱤ","ﭑ","ﭒ","ﭔ","ﭕ","ﭗ","ﭘ","ﭚ","ﭛ","ﭝ","ﭞ","ﭠ","ﭡ","ﭣ","ﭤ","ﭦ","ﭧ","ﭩ","ﭪ","ﭬ","ﭭ","ﭯ","ﭰ","ﭲ","ﭳ","ﭵ","ﭶ","ﭸ","ﭹ","ﭻ","ﭼ","ﭾ","ﭿ","ﮁ","ﮂ","ﮄ","ﮅ","ﮇ","ﮈ","ﮊ","ﮋ","ﮍ","ﮎ","ﮐ","ﮑ","ﮓ","ﮔ","ﮖ","ﮗ","ﮙ","ﮚ","ﮜ","ﮝ","ﮟ","ﮠ","ﮢ","ﮣ","ﮥ","ﮦ","ﮨ","ﮩ","ﮫ","ﮬ","ﮮ","ﮯ","ﮱ","﮲","﮴","﮵","﮷","﮸","﮺","﮻","﮽","﮾","﯀","﯁","ﯓ","ﯔ","ﯖ","ﯗ","ﯙ","ﯚ","ﯜ","ﯝ","ﯟ","ﯠ","ﯢ","ﯣ","ﯥ","ﯦ","ﯨ","ﯩ","ﯫ"];
let surahHeaderReady=false;
/* إقلاع القارئ: يكتمل حين تُحمَّل خطوط المصحف وتُرسم الصفحة الحالية.
   الفهرس قد يظهر قبل ذلك؛ ومن يغادره إلى المصحف ينتظر هذا الوعد. */
let readerBooted=false,readerGoPending=false,readerBootDone=()=>{};
const readerBootReady=new Promise(resolve=>{readerBootDone=()=>{readerBooted=true;resolve()}});
/* @include ../shared/usage.js */
/* @include tafsir.js */

/* @include reciters.js */

/* @include state.js */
/* @include mushaf.js */
/* @include mushaf-dk.js */

/* @include page-fit.js */

/* @include uthmani.js */
/* @include search-text.js */
/* @include reading-tools.js */

/* @include library.js */

/* @include audio-sources.js */
/* @include player-ui.js */


/* @include audio-playback.js */
/* @include transport-controls.js */

/* @include playlist.js */
/* @include playlist-ui.js */
/* @include listen.js */
/* @include tayassar.js */
/* @include appearance.js */


/* @include offline.js */

/* @include bootstrap.js */

})();
