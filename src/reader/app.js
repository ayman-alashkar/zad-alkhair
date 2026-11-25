
import { zuDeviceId, zuPackFresh, zuPlatform, zuSurface, zuTrackAudio } from "../shared/usage.mjs";
import { escapeHtml, pad3 } from "./util.mjs";
import { reading } from "./reader-state.mjs";
import { activeEngine, decoratePageHeader, onEngineChange, registerEngine } from "./page-engine.mjs";
import { qcfRenderLines } from "./engines/qcf.mjs";
import { loadWordIndex, wordGiAt } from "./word-gi.mjs";
import { createDigitalKhattEngine } from "./engines/digitalkhatt.mjs";
import { riwaya, initRiwaya } from "./riwaya.mjs";
import { openCard, reportTarget } from "./card/index.mjs";
import { ayahAt, ayahElements, clearAyahHighlight, highlightAyah } from "./ayah-marks.mjs";
import { bindGestures, onGesture } from "./gestures.mjs";
import { searchMatcher, searchNormalize } from "./search-text.mjs";
import { TAFSIR_DATASET, loadTafsirIndex, tafsirAyahRecord, tafsirFadlForSurah } from "./tafsir.mjs";
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
   - The Mushaf is QCF V4 (Madinah 1441, KFGQPC and Dar al-Maarifah, as published by QUL), self-hosted:
     one colour font per page (fonts/qcf-v4), page data built by scripts/build-qcf-v4.mjs.
     Reading uses the single-colour palette, so pages look as QCF4 did; tajweed switches the palette.
   - QUL decorative title remains optional with QCF fallback.
*/
const MUSHAF_VERSION="dev";
const MUSHAF_Q="?v="+MUSHAF_VERSION;
const QCF_BASE="/data/qcf-v4/";
const PAGE_BASE=QCF_BASE+"pages/";
const PAGE_SUFFIX=".json"+MUSHAF_Q;
const INDEX_URL=QCF_BASE+"index.json"+MUSHAF_Q;
const VERSE_INDEX_URL=QCF_BASE+"verses.json"+MUSHAF_Q;
const QCF_FONT_BASE="/fonts/qcf-v4/";
const TOTAL_PAGES=604;
const SURAH_HEADER_GLYPHS=[null,"ﱅ","ﱆ","ﱇ","ﱊ","ﱋ","ﱎ","ﱏ","ﱑ","ﱒ","ﱓ","ﱕ","ﱖ","ﱘ","ﱚ","ﱛ","ﱜ","ﱝ","ﱞ","ﱡ","ﱢ","ﱤ","ﭑ","ﭒ","ﭔ","ﭕ","ﭗ","ﭘ","ﭚ","ﭛ","ﭝ","ﭞ","ﭠ","ﭡ","ﭣ","ﭤ","ﭦ","ﭧ","ﭩ","ﭪ","ﭬ","ﭭ","ﭯ","ﭰ","ﭲ","ﭳ","ﭵ","ﭶ","ﭸ","ﭹ","ﭻ","ﭼ","ﭾ","ﭿ","ﮁ","ﮂ","ﮄ","ﮅ","ﮇ","ﮈ","ﮊ","ﮋ","ﮍ","ﮎ","ﮐ","ﮑ","ﮓ","ﮔ","ﮖ","ﮗ","ﮙ","ﮚ","ﮜ","ﮝ","ﮟ","ﮠ","ﮢ","ﮣ","ﮥ","ﮦ","ﮨ","ﮩ","ﮫ","ﮬ","ﮮ","ﮯ","ﮱ","﮲","﮴","﮵","﮷","﮸","﮺","﮻","﮽","﮾","﯀","﯁","ﯓ","ﯔ","ﯖ","ﯗ","ﯙ","ﯚ","ﯜ","ﯝ","ﯟ","ﯠ","ﯢ","ﯣ","ﯥ","ﯦ","ﯨ","ﯩ","ﯫ"];
let surahHeaderReady=false;
/* إقلاع القارئ: يكتمل حين تُحمَّل خطوط المصحف وتُرسم الصفحة الحالية.
   الفهرس قد يظهر قبل ذلك؛ ومن يغادره إلى المصحف ينتظر هذا الوعد. */
let readerBooted=false,readerGoPending=false,readerBootDone=()=>{};
const readerBootReady=new Promise(resolve=>{readerBootDone=()=>{readerBooted=true;resolve()}});

/* @include reciters.js */

/* @include state.js */
/* @include mushaf.js */
/* @include qcf-palettes.js */

/* @include page-fit.js */

/* @include uthmani.js */
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
