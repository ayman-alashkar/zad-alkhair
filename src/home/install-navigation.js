/* ═══════════ PWA install analytics · v108 ═══════════
   Supabase is the source of truth. The client persists only one anonymous UUID.
   An installed app UPSERTs its own row on each real app launch. If offline, the
   request simply fails harmlessly and the next launch / online event retries it.
   Normal browser visits are never counted. */
const PWA_INSTALL_ID_KEY="zad:pwa-install-id";
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
  await prompt.prompt();
  const choice=await prompt.userChoice.catch(()=>null);
  if(choice&&choice.outcome==="accepted")pwaInstallButton.hidden=true;
  else pwaPaintInstallButton();
});
pwaPaintInstallButton();
function pwaInstallPlatform(){
  const ua=navigator.userAgent||"";
  const uaPlatform=navigator.userAgentData&&navigator.userAgentData.platform||"";
  if(/Android/i.test(ua)||/Android/i.test(uaPlatform)) return "android";
  if(/iPad|iPhone|iPod/i.test(ua)||
     /iPad|iPhone|iPod|iOS/i.test(uaPlatform)||
     (navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1)) return "ios";
  if(/Windows|Macintosh|MacIntel|Linux|CrOS/i.test(`${ua} ${uaPlatform} ${navigator.platform||""}`)) return "desktop";
  return "other";
}
function pwaInstallId(){
  try{
    let id=localStorage.getItem(PWA_INSTALL_ID_KEY);
    const valid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if(id&&valid.test(id)) return id;
    if(crypto.randomUUID) id=crypto.randomUUID();
    else{
      const b=new Uint8Array(16);crypto.getRandomValues(b);
      b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
      const h=[...b].map(v=>v.toString(16).padStart(2,"0")).join("");
      id=`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
    }
    localStorage.setItem(PWA_INSTALL_ID_KEY,id);
    return id;
  }catch(_){ return null; }
}
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

/* موضع بدء كل جزء: رقم السورة ورقم الآية.
   منه يُبنى رابط القراءة، فيفتح المصحف عند أول الجزء لا أول السورة. */
const JUZ_START=[
  [1,1],   [2,142], [2,253], [3,93],  [4,24],  [4,148], [5,82],  [6,111],
  [7,88],  [8,41],  [9,93],  [11,6],  [12,53], [15,1],  [17,1],  [18,75],
  [21,1],  [23,1],  [25,21], [27,56], [29,46], [33,31], [36,28], [39,32],
  [41,47], [46,1],  [51,31], [58,1],  [67,1],  [78,1],
];
function readerLink(j=null,khatmahCode=code){
  const q=new URLSearchParams();
  const n=Number(j);
  if(n>=1&&n<=30) q.set("juz",String(n));
  else q.set("home","1");
  const c=String(khatmahCode||"").trim().toUpperCase();
  if(c) q.set("code",c);
  const tail=q.toString();
  return "reader.html"+(tail?"?"+tail:"");
}
function sharedJuzLink(j,khatmahCode=code){
  const n=Number(j);
  if(!(n>=1&&n<=30)) return readerLink(j,khatmahCode);
  const q=new URLSearchParams();
  const c=String(khatmahCode||"").trim().toUpperCase();
  if(c) q.set("code",c);
  const tail=q.toString();
  return `juz/${n}/`+(tail?`?${tail}`:"");
}
const readLink=j=>sharedJuzLink(j);
