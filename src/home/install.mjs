/* تثبيت التطبيق: زر التثبيت في شاشة الإقلاع، وتسجيل أول فتح للتطبيق المثبّت.
   وحدة آثار جانبية: تعمل حين تُستورد، ولا تصدّر شيئًا. */
import { SUPABASE_KEY, SUPABASE_URL } from "./config.mjs";
import { zuDeviceId, zuPlatform } from "../shared/usage.mjs";

/* ═══════════ PWA install analytics · v108 ═══════════
   Supabase is the source of truth. The client persists only one anonymous UUID.
   An installed app UPSERTs its own row on each real app launch. If offline, the
   request simply fails harmlessly and the next launch / online event retries it.
   Normal browser visits are never counted. */
const PWA_APP_VERSION="v115";
let pwaInstallReportBusy=false;
let pwaInstallReportedThisPage=false;

function pwaIsStandalone(){
  return window.matchMedia("(display-mode: standalone)").matches ||
         window.navigator.standalone===true;
}
let pwaInstallPrompt=null;
const pwaInstallButton=document.getElementById("zk-launch-install");
function pwaPaintInstallButton(){
  if(pwaInstallButton)pwaInstallButton.hidden=pwaIsStandalone();
}
window.addEventListener("beforeinstallprompt",event=>{
  event.preventDefault();pwaInstallPrompt=event;pwaPaintInstallButton();
});
window.addEventListener("appinstalled",()=>{
  pwaInstallPrompt=null;if(pwaInstallButton)pwaInstallButton.hidden=true;
});
try{
  window.matchMedia("(display-mode: standalone)").addEventListener("change",pwaPaintInstallButton);
}catch(_){ }
pwaInstallButton?.addEventListener("click",async event=>{
  if(pwaIsStandalone()){event.preventDefault();pwaInstallButton.hidden=true;return}
  if(!pwaInstallPrompt)return;
  event.preventDefault();
  const prompt=pwaInstallPrompt;pwaInstallPrompt=null;
  let choice=null;
  try{await prompt.prompt();choice=await prompt.userChoice}catch(_){location.href=pwaInstallButton.href;return}
  if(choice&&choice.outcome==="accepted")pwaInstallButton.hidden=true;
  else pwaPaintInstallButton();
});
pwaPaintInstallButton();
/* المعرّف المجهول ونوع الجهاز مشتركان مع إحصاءات الاستعمال (src/shared/usage.mjs). */
function pwaInstallPlatform(){return zuPlatform()}
function pwaInstallId(){return zuDeviceId()}
function pwaClearLegacyAnalyticsFlags(){
  try{
    [
      "zad:pwa-standalone-reported-v1",
      "zad:pwa-standalone-reported-v2",
      "zad:pwa-standalone-pending-v1",
      "zad:pwa-standalone-pending-v2",
      "zad:pwa-install-accepted-reported-v1"
    ].forEach(k=>localStorage.removeItem(k));
  }catch(_){ }
}
async function pwaReportStandalone(){
  if(!pwaIsStandalone()||pwaInstallReportBusy||pwaInstallReportedThisPage) return;
  const id=pwaInstallId();
  if(!id) return;

  pwaInstallReportBusy=true;
  try{
    const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/record_pwa_install`,{
      method:"POST",keepalive:true,
      headers:{"Content-Type":"application/json",apikey:SUPABASE_KEY,Authorization:"Bearer "+SUPABASE_KEY},
      body:JSON.stringify({
        p_device_id:id,
        p_platform:pwaInstallPlatform(),
        p_event:"standalone_open",
        p_app_version:PWA_APP_VERSION
      })
    });
    if(r.ok) pwaInstallReportedThisPage=true;
  }catch(_){
    /* Analytics must never interfere with app startup or offline use. */
  }finally{
    pwaInstallReportBusy=false;
  }
}

pwaClearLegacyAnalyticsFlags();
pwaReportStandalone();
window.addEventListener("online",pwaReportStandalone,{passive:true});
