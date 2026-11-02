/* ===================== الإقلاع ===================== */
async function boot(){
  flushOutbox();
  minePruneMissing();
  code=hashCode();
  closeLayer();
  clearInterval(lkTimer); lkTimer=null; linking=false;

  if(!code){
    /* زر «الختمات الجماعية» يفتح سياق الجلسة أولًا، ثم آخر ختمة محفوظة
       على الجهاز. إن لم توجد ختمة نشطة أصلًا نعرض صفحة الختمات المعتادة. */
    const active=activeKhatmahGet();
    if(active){zkReplaceHash(active);code=active;}
    else{state=null;viewer=null;screen="home";render();loadPublicKhatmahs();return;}
  }

  activeKhatmahSet(code,false);
  loadViewer();
  if(viewer) activeKhatmahSet(code,true);
  screen="boot"; render();
  await refresh();
}
document.getElementById("btn-help").onclick=helpDialog;
const tbHome=document.getElementById("tb-home");
if(tbHome) tbHome.onclick=goHome;
const tbReader=document.getElementById("tb-reader");
if(tbReader) tbReader.onclick=()=>{ location.href=readerLink(null,code); };
const tbUser=document.getElementById("tb-user");
if(tbUser) tbUser.onclick=e=>{e.stopPropagation();toggleTopMenu();};
const tbPopover=document.getElementById("tb-popover");
if(tbPopover) tbPopover.onclick=e=>{e.stopPropagation();handleTopMenuClick(e);};
document.addEventListener("click",e=>{
  if(!e.target.closest("#tb-user,#tb-popover")) closeTopMenu();
});
document.addEventListener("keydown",e=>{if(e.key==="Escape") closeTopMenu();});
/* يمنع الضغطة المزدوجة العرضية مع إبقاء أثر اللمس المرئي كما هو. */
document.addEventListener("click",e=>{
  const target=e.target.closest("button,a,[role='button']");
  if(!target||target.disabled) return;
  const now=Date.now(),lockedUntil=Number(target.dataset.tapLock||0);
  if(now<lockedUntil){ e.preventDefault(); e.stopImmediatePropagation(); return; }
  target.dataset.tapLock=String(now+700);
},true);
const zkLaunch=document.getElementById("zk-launch");
const zkOfflineStatus=document.getElementById("zk-offline-status");

/* v111 · critical home assets gate.
   The launcher canvas is revealed only after its actual Arabic display font
   and local mark are ready, so the browser never paints fallback typography
   and then reflows it a fraction of a second later. */
let zkHomeReady=false;
function zkRevealHome(){
  if(zkHomeReady)return;
  zkHomeReady=true;
  zkLaunch?.classList.add("zk-home-ready");
}
async function zkPrepareHome(){
  const jobs=[];
  try{
    if(document.fonts?.load){
      jobs.push(document.fonts.load('700 67px "Aref Ruqaa"',"زاد الخير اقرأ وارتق القرآن العظيم الختمات الجماعية مواقيت الصلاة"));
    }
  }catch(_){ }
  try{
    const mark=zkLaunch?.querySelector(".zk-launch-mark");
    if(mark?.decode) jobs.push(mark.decode());
  }catch(_){ }
  try{ await Promise.allSettled(jobs); }catch(_){ }
  zkRevealHome();
}
/* Safety only: never leave navigation inaccessible because of a broken
   browser font API. Normal cached/PWA launches resolve far earlier. */
const zkHomeReadyFallback=setTimeout(zkRevealHome,1800);
zkPrepareHome().finally(()=>clearTimeout(zkHomeReadyFallback));

const ZK_HOME_BASE_W=500,ZK_HOME_BASE_H=780,ZK_HOME_GUTTER=24;
function zkFitLaunch(){
  if(!zkLaunch)return;
  const vv=window.visualViewport;
  const w=vv?.width||window.innerWidth||ZK_HOME_BASE_W;
  const h=vv?.height||window.innerHeight||ZK_HOME_BASE_H;
  const x=(vv?.offsetLeft||0)+(w/2);
  const y=(vv?.offsetTop||0)+(h/2);
  const scale=Math.max(.1,Math.min(1,(w-ZK_HOME_GUTTER)/ZK_HOME_BASE_W,(h-ZK_HOME_GUTTER)/ZK_HOME_BASE_H));
  zkLaunch.style.setProperty("--zk-home-scale",String(scale));
  zkLaunch.style.setProperty("--zk-home-cx",x+"px");
  zkLaunch.style.setProperty("--zk-home-cy",y+"px");
}

function zkCaptureIncomingKhatmah(){
  const incoming=hashCode();
  if(!incoming)return "";
  /* الرابط يحدد سياق هذه الجلسة حتى لو كان المستخدم جديدًا في الختمة.
     لا نجعله دائمًا إلا إن كان هذا الجهاز مسجّلًا فيها بالفعل. */
  const known=!!localStorage.getItem("zad:viewer:"+incoming);
  activeKhatmahSet(incoming,known);
  zkReplaceHash("");
  return incoming;
}
function zkShowLaunch(){
  if(!zkLaunch)return;
  closeTopMenu();closeLayer();
  zkFitLaunch();
  document.documentElement.classList.add("zk-launch-open");
  document.body.classList.add("zk-launch-open");
  zkLaunch.classList.add("show");
  zkLaunch.setAttribute("aria-hidden","false");
}
function zkHideLaunch(){
  if(!zkLaunch)return;
  zkLaunch.classList.remove("show");
  zkLaunch.setAttribute("aria-hidden","true");
  document.documentElement.classList.remove("zk-launch-open");
  document.body.classList.remove("zk-launch-open");
}
const zkRootGuardToken=`${Date.now()}-${Math.random().toString(36).slice(2)}`;
let zkExitPressedAt=0,zkExitRearmTimer=null;
function zkArmRootGuard(){
  clearTimeout(zkExitRearmTimer);
  try{
    if(history.state?.zkRootGuard===zkRootGuardToken)return;
    history.pushState({...history.state,zkRootGuard:zkRootGuardToken},"",location.href);
  }catch(_){ }
}
function zkLaunchVisible(){return !!zkLaunch?.classList.contains("show")}
function zkConfirmNativeExit(){
  zkExitPressedAt=Date.now();
  toast("اضغط الرجوع مرة أخرى للخروج");
  clearTimeout(zkExitRearmTimer);
  /* Keep the guard removed briefly. A second physical Back now belongs to
     Android/Chrome. If the user stays, restore the guard automatically. */
  zkExitRearmTimer=setTimeout(()=>{zkExitPressedAt=0;zkArmRootGuard()},2200);
}
function zkRootBack(){
  if(document.getElementById("layer")?.innerHTML){closeLayer();zkArmRootGuard();return}
  const topMenu=document.getElementById("tb-popover");
  if(topMenu&&!topMenu.hidden){closeTopMenu();zkArmRootGuard();return}
  if(!zkLaunchVisible()){
    zkShowLaunch();zkArmRootGuard();return;
  }
  zkConfirmNativeExit();
}
window.addEventListener("popstate",()=>zkRootBack());
document.getElementById("zk-launch-quran")?.addEventListener("click",event=>{
  event.preventDefault();
  location.href="reader.html?home=1&from=zad";
});
document.getElementById("zk-launch-zad")?.addEventListener("click",event=>{event.preventDefault();zkHideLaunch();boot()});
document.getElementById("zk-launch-prayer")?.addEventListener("click",()=>{document.body.classList.add("zk-launch-prayer");prayerDialog()});
window.addEventListener("hashchange",()=>{
  const incoming=hashCode();
  if(incoming){
    const known=!!localStorage.getItem("zad:viewer:"+incoming);
    activeKhatmahSet(incoming,known);zkReplaceHash("");zkHideLaunch();boot();return;
  }
  if(!zkLaunchVisible())boot();
});
window.addEventListener("resize",queueTopUserSync,{passive:true});
window.addEventListener("resize",zkFitLaunch,{passive:true});
window.visualViewport?.addEventListener("resize",zkFitLaunch,{passive:true});
window.visualViewport?.addEventListener("scroll",zkFitLaunch,{passive:true});
window.addEventListener("online",outboxWake);
const zkIncomingKhatmah=zkCaptureIncomingKhatmah();
if(zkIncomingKhatmah||new URLSearchParams(location.search).get("section")==="khatmahs"){zkHideLaunch();boot()}
else zkShowLaunch();
zkArmRootGuard()

/* PWA shell + offline Quran/Tafsir library. The index checks status only;
   entering reader.html is the opt-in that starts a missing full download. */
const ZK_OFFLINE_LIBRARY_KEY="zad:offline-library-v1";
function zkRememberOfflineLibrary(ready){
  try{
    if(ready)localStorage.setItem(ZK_OFFLINE_LIBRARY_KEY,"1");
    else localStorage.removeItem(ZK_OFFLINE_LIBRARY_KEY);
    localStorage.removeItem("zad:quran-offline-v1");
  }catch(_){ }
}
function zkPaintOfflineStatus(ready){
  if(!zkOfflineStatus)return;
  zkOfflineStatus.classList.toggle("ready",!!ready);
  const label=zkOfflineStatus.querySelector("span:last-child");
  if(label)label.textContent="";
}
if("serviceWorker" in navigator){
  navigator.serviceWorker.addEventListener("message",event=>{
    const data=event.data||{};
    if(data.type==="OFFLINE_LIBRARY_READY"){
      zkRememberOfflineLibrary(true);zkPaintOfflineStatus(true);
    }else if(data.type==="OFFLINE_LIBRARY_INCOMPLETE"){
      zkRememberOfflineLibrary(false);zkPaintOfflineStatus(false);
    }
  });
  const zkPrepareServiceWorker=()=>navigator.serviceWorker.register("sw.js",{updateViaCache:"none"})
    .then(reg=>Promise.allSettled([reg.update(),navigator.serviceWorker.ready]))
    .then(()=>navigator.serviceWorker.ready)
    .then(reg=>{
      const worker=reg.active||reg.waiting||reg.installing;
      worker?.postMessage({type:"CHECK_OFFLINE_LIBRARY"});
      if(navigator.onLine)worker?.postMessage({type:"ENSURE_OFFLINE_SHELL"});
      return reg;
    }).catch(()=>null);
  zkPrepareServiceWorker();
  window.addEventListener("online",zkPrepareServiceWorker);
  navigator.serviceWorker.addEventListener("controllerchange",()=>navigator.serviceWorker.ready.then(reg=>(reg.active||reg.waiting||reg.installing)?.postMessage({type:"CHECK_OFFLINE_LIBRARY"})).catch(()=>{}));
}
let ptTimer=setInterval(ptTick,30000);
let outboxTimer=setInterval(flushOutbox,30000);
zLoop();
let syncBusy=false;
async function syncState(){
  if(syncBusy) return;
  if(screen!=="main") return;
  if(selected!==null || document.getElementById("layer").innerHTML) return;
  syncBusy=true;
  const before=JSON.stringify(state);
  try{
    const loaded=await refresh(true);
    if(loaded&&JSON.stringify(state)!==before) render();
  }finally{ syncBusy=false; }
}
let syncTimer=setInterval(syncState,15000);
