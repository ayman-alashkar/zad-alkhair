/* ---------- theme + tap states ---------- */
/* ما دام مشغّل التلاوة مفتوحًا لا يُرسم المصحف تحته (body.zl-open في styles.css)،
   فتؤجَّل إعادة رسم رؤوس السور وضبط الصفحات إلى العودة إليه (readerAfterListen). */
let readerBannersStale=false;
function setTheme(t){
  document.documentElement.dataset.theme=t;storageSet(STORAGE_KEYS.theme,t);
  /* أيقونة الوضع كما في الرئيسية ومشغّل التلاوة: قمر نهارًا (للانتقال إلى الليل)، وشمس ليلًا. */
  const btn=document.getElementById("themeBtn");
  btn.innerHTML=t==="dark"
    ?'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>'
    :'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.4A8.6 8.6 0 0 1 8.6 3.8a8.8 8.8 0 1 0 11.6 11.6Z"/></svg>';
  btn.setAttribute("aria-label",t==="dark"?"تفعيل الوضع النهاري":"تفعيل الوضع الليلي");
  if(document.body.classList.contains("zl-open")){readerBannersStale=true;return}
  requestAnimationFrame(()=>document.querySelectorAll("canvas.surah-banner").forEach(c=>renderSurahHeaderCanvas(c,c.dataset.glyph)));
}
document.getElementById("themeBtn").onclick=()=>setTheme((document.documentElement.dataset.theme||"light")==="light"?"dark":"light");
setTheme(storageGet(STORAGE_KEYS.theme,"light")==="dark"?"dark":"light");
/* A reader prepared in the background takes the theme chosen since then on home. */
document.addEventListener("prerenderingchange",()=>setTheme(storageGet(STORAGE_KEYS.theme,"light")==="dark"?"dark":"light"),{once:true});

document.getElementById("reader").addEventListener("contextmenu",e=>e.preventDefault());
document.getElementById("reader").addEventListener("click",e=>{
  if(e.target.closest(".verse-segment"))return;
  closeMenu();
  if(!document.body.classList.contains("hidden-tools")){hideTools();return}
  placeReaderToolbar(null,{x:e.clientX,y:e.clientY});
  showToolsFor(2800);
});
document.querySelectorAll(".chrome,.audio-panel,.audio-fab").forEach(x=>x.addEventListener("click",e=>e.stopPropagation()));
document.querySelectorAll(".chrome").forEach(x=>{
  x.addEventListener("pointerdown",()=>clearTimeout(toolsTimer));
  x.addEventListener("pointerup",()=>showToolsFor(2800));
});
document.addEventListener("pointerdown",e=>{if(!e.target.closest(".ayah-menu")&&!e.target.closest(".verse-segment"))closeMenu()},{capture:true});
/* Refit the Mushaf only when the window has really changed size and settled.
   The Android share sheet (and similar system panels) shrinks the window for a
   moment and restores it; while it is up the page is in the background, so the
   check waits until the page is back, by which time the size is usually the
   same as before and nothing moves. */
let fittedSize=`${innerWidth}x${innerHeight}`;
function refitIfResized(delay){
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(()=>{
    if(document.hidden||!document.hasFocus())return; // re-checked on focus/visibility
    const size=`${innerWidth}x${innerHeight}`;
    if(size===fittedSize)return;
    fittedSize=size;
    document.querySelectorAll('.page[data-loaded="1"]').forEach(x=>fitPage(Number(x.dataset.page)));
    requestAnimationFrame(()=>{if(!document.body.classList.contains("hidden-tools"))placeReaderToolbar(selectedAnchor)});
  },delay);
}
window.addEventListener("resize",()=>refitIfResized(150));
window.addEventListener("focus",()=>refitIfResized(60));
document.addEventListener("visibilitychange",()=>{if(!document.hidden)refitIfResized(60)});
if(document.fonts?.ready){
  document.fonts.ready.then(()=>requestAnimationFrame(()=>document.querySelectorAll('.page[data-loaded="1"]').forEach(x=>fitPage(Number(x.dataset.page))))).catch(()=>{});
}
document.fonts?.addEventListener?.("loadingdone",()=>{
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(()=>{fittedSize=`${innerWidth}x${innerHeight}`;document.querySelectorAll('.page[data-loaded="1"]').forEach(x=>fitPage(Number(x.dataset.page)))},60);
});
window.visualViewport?.addEventListener("resize",()=>refitIfResized(150),{passive:true});
/* العودة من مشغّل التلاوة: ما قيس من المصحف وهو مخفي لا يُعتمد، فتُضبط الصفحات من جديد،
   وتُرسم رؤوس السور إن تغيّر الوضع في أثناء ذلك. */
function readerAfterListen(){
  requestAnimationFrame(()=>{
    fittedSize=`${innerWidth}x${innerHeight}`;
    document.querySelectorAll('.page[data-loaded="1"]').forEach(x=>fitPage(Number(x.dataset.page)));
    if(readerBannersStale){
      readerBannersStale=false;
      document.querySelectorAll("canvas.surah-banner").forEach(c=>renderSurahHeaderCanvas(c,c.dataset.glyph));
    }
  });
}
