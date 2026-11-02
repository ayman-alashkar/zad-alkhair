
(()=>{
"use strict";
/* v85 Reader Navigation + Hardware Back + Bottom Dock
   v80 Quran Home + Offline Foundation + Repeat Semantics
   Based on v78 Index Social Sharing.
   Built directly on the approved v56 reference. Visual/QCF layout contracts are unchanged; production dependencies are hardened and tafsir is lazy-loaded locally.

   Invariants:
   - QCF4 Mushaf composition/layout is untouched.
   - Verified tafsir is loaded lazily from the local audited static repository.
   - Audio behavior is provider-specific; no hidden provider switching.
   - UI ordering never determines the default reciter.
   - QCF4 data/fonts are pinned to npm quran-qcf4@1.0.3; QUL decorative title remains optional with QCF fallback.
*/
const QCF_BASE="https://cdn.jsdelivr.net/npm/quran-qcf4@1.0.3/";
const PAGE_BASE=QCF_BASE+"pages/";
const INDEX_URL=QCF_BASE+"index.json";
const VERSE_INDEX_URL=QCF_BASE+"verses.json";
const QCF_FONT_BASE=QCF_BASE+"fonts-woff2/";
const TOTAL_PAGES=604;
const SURAH_HEADER_GLYPHS=[null,"ﱅ","ﱆ","ﱇ","ﱊ","ﱋ","ﱎ","ﱏ","ﱑ","ﱒ","ﱓ","ﱕ","ﱖ","ﱘ","ﱚ","ﱛ","ﱜ","ﱝ","ﱞ","ﱡ","ﱢ","ﱤ","ﭑ","ﭒ","ﭔ","ﭕ","ﭗ","ﭘ","ﭚ","ﭛ","ﭝ","ﭞ","ﭠ","ﭡ","ﭣ","ﭤ","ﭦ","ﭧ","ﭩ","ﭪ","ﭬ","ﭭ","ﭯ","ﭰ","ﭲ","ﭳ","ﭵ","ﭶ","ﭸ","ﭹ","ﭻ","ﭼ","ﭾ","ﭿ","ﮁ","ﮂ","ﮄ","ﮅ","ﮇ","ﮈ","ﮊ","ﮋ","ﮍ","ﮎ","ﮐ","ﮑ","ﮓ","ﮔ","ﮖ","ﮗ","ﮙ","ﮚ","ﮜ","ﮝ","ﮟ","ﮠ","ﮢ","ﮣ","ﮥ","ﮦ","ﮨ","ﮩ","ﮫ","ﮬ","ﮮ","ﮯ","ﮱ","﮲","﮴","﮵","﮷","﮸","﮺","﮻","﮽","﮾","﯀","﯁","ﯓ","ﯔ","ﯖ","ﯗ","ﯙ","ﯚ","ﯜ","ﯝ","ﯟ","ﯠ","ﯢ","ﯣ","ﯥ","ﯦ","ﯨ","ﯩ","ﯫ"];
let surahHeaderReady=false;
/* @include tafsir.js */

/* @include reciters.js */

/* @include state.js */
/* @include mushaf.js */

/* @include page-fit.js */

/* @include reading-tools.js */

/* @include library.js */

/* @include audio-sources.js */
/* @include player-ui.js */


/* @include audio-playback.js */
/* @include transport-controls.js */

/* @include playlist.js */
/* @include playlist-ui.js */
/* @include appearance.js */


/* @include offline.js */

/* @include bootstrap.js */

})();
