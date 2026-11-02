/* PWA / offline library. Entering the Quran is the opt-in signal to prepare
   the complete Mushaf + Tafsir pack. Audio has a separate explicit cache and
   is never bulk-downloaded automatically. */
const OFFLINE_LIBRARY_KEY="zad:offline-library-v1";
function rememberOfflineLibrary(ready){
  try{
    if(ready)localStorage.setItem(OFFLINE_LIBRARY_KEY,"1");
    else localStorage.removeItem(OFFLINE_LIBRARY_KEY);
    localStorage.removeItem("zad:quran-offline-v1");
  }catch(_){ }
}
async function requestPersistentStorage(){
  try{if(navigator.storage?.persist)await navigator.storage.persist()}catch(_){ }
}
function postOfflineLibrary(type){
  navigator.serviceWorker?.ready?.then(reg=>(reg.active||reg.waiting||reg.installing)?.postMessage({type})).catch(()=>{});
}
if("serviceWorker" in navigator){
  const offlineSetup=document.getElementById("offlineSetup");
  const offlineSetupFill=document.getElementById("offlineSetupFill");
  const offlineSetupPercent=document.getElementById("offlineSetupPercent");
  const offlineSetupTrack=document.getElementById("offlineSetupTrack");
  const offlineSetupTitle=document.getElementById("offlineSetupTitle");
  let offlineHideTimer=null,lastOfflinePercent=0;
  function paintOfflineProgress(done,total){
    const safeTotal=Math.max(1,Number(total)||1);
    const pct=Math.max(0,Math.min(100,Math.round((Number(done)||0)*100/safeTotal)));
    lastOfflinePercent=pct;
    if(offlineSetupFill)offlineSetupFill.style.width=`${pct}%`;
    if(offlineSetupPercent)offlineSetupPercent.textContent=`${ar(pct)}٪`;
    if(offlineSetupTrack)offlineSetupTrack.setAttribute("aria-valuenow",String(pct));
    if(offlineSetupTitle)offlineSetupTitle.textContent="جارٍ تجهيز القرآن والتفسير للعمل دون اتصال";
    offlineSetup?.classList.add("show");
  }
  function hideOfflineProgress(delay=0){
    clearTimeout(offlineHideTimer);
    offlineHideTimer=setTimeout(()=>offlineSetup?.classList.remove("show"),delay);
  }
  navigator.serviceWorker.addEventListener("message",event=>{
    const data=event.data||{};
    if(data.type==="OFFLINE_LIBRARY_READY"){
      rememberOfflineLibrary(true);requestPersistentStorage();
      if(offlineSetup?.classList.contains("show")){
        paintOfflineProgress(100,100);
        if(offlineSetupTitle)offlineSetupTitle.textContent="اكتمل التجهيز للعمل دون اتصال";
        hideOfflineProgress(900);
      }else{
        hideOfflineProgress(0);
      }
    }else if(data.type==="OFFLINE_LIBRARY_INCOMPLETE"){
      rememberOfflineLibrary(false);
      if(!navigator.onLine||Number(data.failed)>0){
        hideOfflineProgress(0);
        if(lastOfflinePercent>0||Number(data.failed)>0)showToast("لم يكتمل التجهيز؛ ستُستكمل الملفات الناقصة عند المحاولة مجدداً");
      }
    }else if(data.type==="OFFLINE_LIBRARY_PROGRESS"){
      paintOfflineProgress(data.done,data.total);
    }else if(data.type==="AUDIO_OFFLINE_PROGRESS"){
      const job=audioDownloadJobs.get(String(data.tag||""));
      if(job){const pct=Math.round((Number(data.done)||0)*100/Math.max(1,Number(data.total)||1));setAudioDownloadButton(job.btn,"downloading",pct)}
    }else if(data.type==="AUDIO_OFFLINE_DONE"){
      const tag=String(data.tag||""),job=audioDownloadJobs.get(tag);if(!job)return;
      audioDownloadJobs.delete(tag);
      if(Number(data.failed)===0){putAudioOfflinePackage(job.pkg);setAudioDownloadButton(job.btn,"downloaded");showToast("أصبحت السورة متاحة للتشغيل دون اتصال")}
      else{refreshAudioDownloadButton(job.btn,job.s).catch(()=>setAudioDownloadButton(job.btn,"available"));showToast("تعذّر تنزيل السورة كاملة، حاول مرة أخرى")}
    }
  });
  const prepareReaderServiceWorker=()=>navigator.serviceWorker.register("sw.js",{updateViaCache:"none"}).then(reg=>reg.update().catch(()=>reg)).then(()=>navigator.serviceWorker.ready).then(reg=>{
    const worker=reg.active||reg.waiting||reg.installing;
    if(navigator.onLine)worker?.postMessage({type:"ENSURE_OFFLINE_SHELL"});
    worker?.postMessage({type:navigator.onLine?"ENSURE_OFFLINE_LIBRARY":"CHECK_OFFLINE_LIBRARY"});
  }).catch(()=>{});
  prepareReaderServiceWorker();
  window.addEventListener("online",()=>postOfflineLibrary("ENSURE_OFFLINE_LIBRARY"));
  navigator.serviceWorker.addEventListener("controllerchange",()=>postOfflineLibrary(navigator.onLine?"ENSURE_OFFLINE_LIBRARY":"CHECK_OFFLINE_LIBRARY"));
}
