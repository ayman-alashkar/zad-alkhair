/* ---------- theme + tap states ---------- */
function setTheme(t){
  document.documentElement.dataset.theme=t;storageSet(STORAGE_KEYS.theme,t);
  document.querySelector('meta[name="theme-color"]').content=t==="dark"?"#061F1D":"#F5F0E4";
  document.getElementById("themeBtn").innerHTML=t==="dark"
    ?'<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z"/></svg>'
    :'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M2 12h2M20 12h2M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5"/></svg>';
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
