"use strict";

/*
  Zad Al-Khair legacy-origin bridge.

  The bridge is deliberately inert until the final domain serves the unique
  v113 readiness asset. Membership data is exchanged through a short-lived,
  one-time server token; device and organizer credentials never enter the URL.
*/
(()=>{
  const LEGACY_HOST="ayman-alashkar.github.io";
  const LEGACY_PREFIX="/zad-alkhair";
  const NEW_ORIGIN="https://zad-alkhair.net";
  const READY_ASSET="/icons/migration-ready-v113.svg";
  const HANDOFF_URL="https://webqpbcijjbawatykoxe.supabase.co/functions/v1/migration-handoff";
  const SUPABASE_KEY="sb_publishable_51JPJ2XgwWW5l66bwqHN3Q_CJrEtyZv";
  const OVERLAY_ID="zad-domain-migration";
  const SAFE_PREF_KEYS=[
    "zad:prayer",
    "zad:qcf4:qari",
    "zad:qcf4:continuous",
    "zad:qcf4:recent-visits",
    "zad:qcf4:last-position",
    "zad:qcf4:last-surface-v1",
    "zad:qcf4:reader-parent-v1",
    "zad:qcf4:page-bookmarks",
    "zad:qcf4:ayah-bookmarks",
    "zad:qcf4:bookmarks",
    "zad:qcf4:theme"
  ];

  if(location.hostname!==LEGACY_HOST)return;

  function cleanCode(value){
    return String(value||"").trim().toUpperCase().slice(0,12);
  }

  function appPath(){
    let path=location.pathname||"/";
    if(path===LEGACY_PREFIX)path="/";
    else if(path.startsWith(LEGACY_PREFIX+"/"))path=path.slice(LEGACY_PREFIX.length)||"/";
    if(!path.startsWith("/"))path="/"+path;
    return path;
  }

  function currentDestinationPath(){
    return appPath()+location.search+location.hash;
  }

  function safeJson(value){
    try{return JSON.parse(value)}catch(_){return null}
  }

  function collectProfiles(){
    const candidates=[];
    const seen=new Set();
    const add=(code,mid,orgCode="")=>{
      const c=cleanCode(code),m=String(mid||"").trim();
      if(!c||!m||seen.has(c)||c.length>12||m.length>200)return;
      seen.add(c);candidates.push({code:c,mid:m,orgCode:String(orgCode||"").slice(0,200)});
    };

    let mine=[];
    try{
      const parsed=safeJson(localStorage.getItem("zad:mine")||"[]");
      if(Array.isArray(parsed))mine=parsed.slice(0,12);
    }catch(_){ }
    const active=cleanCode(localStorage.getItem("zad:last"));
    const codes=[active,...mine.map(item=>item&&item.code)];
    try{
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i)||"";
        if(key.startsWith("zad:viewer:"))codes.push(key.slice("zad:viewer:".length));
      }
    }catch(_){ }

    for(const code of codes){
      const c=cleanCode(code);if(!c)continue;
      const viewer=safeJson(localStorage.getItem("zad:viewer:"+c)||"null");
      if(viewer&&viewer.id)add(c,viewer.id,localStorage.getItem("zad:orgcode:"+c)||"");
    }
    return {active,profiles:candidates.slice(0,12)};
  }

  function collectPreferences(){
    const prefs={};let total=0;
    for(const key of SAFE_PREF_KEYS){
      try{
        const value=localStorage.getItem(key);
        if(value===null||value.length>24000)continue;
        total+=key.length+value.length;
        if(total>90000)break;
        prefs[key]=value;
      }catch(_){ }
    }
    return prefs;
  }

  function collectHandoff(){
    const {active,profiles}=collectProfiles();
    let device="";
    try{device=String(localStorage.getItem("zad:device")||"").slice(0,128)}catch(_){ }
    return {action:"create",device,active,profiles,prefs:collectPreferences()};
  }

  function customDomainReady(timeoutMs=5000){
    return new Promise(resolve=>{
      const image=new Image();let settled=false;
      const finish=value=>{
        if(settled)return;settled=true;clearTimeout(timer);
        image.onload=image.onerror=null;resolve(value);
      };
      const timer=setTimeout(()=>finish(false),timeoutMs);
      image.onload=()=>finish(true);image.onerror=()=>finish(false);
      image.src=NEW_ORIGIN+READY_ASSET+"?migration=v113&time="+Date.now();
    });
  }

  function el(tag,className,text){
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=text;
    return node;
  }

  function transferDestination(token,next){
    const url=new URL("/transfer/",NEW_ORIGIN);
    url.hash=new URLSearchParams({token,next}).toString();
    return url.href;
  }

  async function createHandoff(){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),15000);
    try{
      const response=await fetch(HANDOFF_URL,{
        method:"POST",mode:"cors",cache:"no-store",credentials:"omit",
        headers:{
          "Content-Type":"application/json",
          apikey:SUPABASE_KEY,
          Authorization:"Bearer "+SUPABASE_KEY
        },
        body:JSON.stringify(collectHandoff()),signal:controller.signal
      });
      const data=await response.json().catch(()=>null);
      if(!response.ok||!data||typeof data.token!=="string")throw new Error("handoff_failed");
      return data.token;
    }finally{clearTimeout(timer)}
  }

  function migrationStyles(){
    const style=document.createElement("style");
    style.textContent=`
      #${OVERLAY_ID}{
        position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;
        padding:max(18px,env(safe-area-inset-top)) 18px max(18px,env(safe-area-inset-bottom));
        overflow:auto;direction:rtl;background:rgba(5,31,29,.84);backdrop-filter:blur(14px);
        -webkit-backdrop-filter:blur(14px);font-family:"Alexandria",Tahoma,Arial,sans-serif;
      }
      #${OVERLAY_ID} .zad-migration-card{
        width:min(520px,100%);padding:30px 24px 24px;text-align:center;color:#0A473E;
        background:#FFF9EA;border:1px solid rgba(197,154,74,.72);border-radius:30px;
        box-shadow:0 24px 70px rgba(0,0,0,.28);position:relative;overflow:hidden;
      }
      #${OVERLAY_ID} .zad-migration-card::before{
        content:"";position:absolute;inset:0 0 auto;height:7px;
        background:linear-gradient(90deg,#0F5C50,#C59A4A,#0F5C50);
      }
      #${OVERLAY_ID} .zad-migration-mark{
        width:74px;height:74px;margin:0 auto 15px;border-radius:22px;display:grid;place-items:center;
        color:#FFF9EA;background:#0A473E;border:1px solid rgba(197,154,74,.5);
        font-family:"Aref Ruqaa",serif;font-size:2rem;font-weight:700;
      }
      #${OVERLAY_ID} h2{margin:0;color:#0F5C50;font-family:"Aref Ruqaa",serif;font-size:1.9rem;line-height:1.4}
      #${OVERLAY_ID} p{margin:13px auto 0;max-width:44ch;color:#5f594b;font-size:.94rem;line-height:1.95}
      #${OVERLAY_ID} .zad-migration-domain{display:inline-block;direction:ltr;color:#9A6D25;font-weight:780;font-size:1.02rem}
      #${OVERLAY_ID} .zad-migration-action{
        appearance:none;width:100%;min-height:54px;margin-top:23px;padding:12px 18px;border:0;border-radius:17px;
        color:#fff;background:linear-gradient(180deg,#0F5C50,#0A473E);box-shadow:0 9px 22px rgba(15,92,80,.2);
        cursor:pointer;font:750 .96rem/1.5 "Alexandria",Tahoma,Arial,sans-serif;
      }
      #${OVERLAY_ID} .zad-migration-action:disabled{cursor:wait;opacity:.72}
      #${OVERLAY_ID} .zad-migration-action:focus-visible{outline:3px solid rgba(197,154,74,.45);outline-offset:3px}
      #${OVERLAY_ID} .zad-migration-note{font-size:.77rem;color:#786e58;line-height:1.8}
      #${OVERLAY_ID} .zad-migration-error{color:#9f3f43;font-weight:700}
      #${OVERLAY_ID} .zad-migration-spinner{display:inline-block;width:1em;height:1em;margin-inline-end:.55em;border:2px solid rgba(255,255,255,.42);border-top-color:#fff;border-radius:50%;vertical-align:-.14em;animation:zadMigrationSpin .8s linear infinite}
      @keyframes zadMigrationSpin{to{transform:rotate(360deg)}}
      @media(max-width:520px){
        #${OVERLAY_ID}{padding-inline:12px}
        #${OVERLAY_ID} .zad-migration-card{padding:27px 18px 20px;border-radius:25px}
        #${OVERLAY_ID} h2{font-size:1.66rem}
      }
      @media(prefers-reduced-motion:no-preference){
        #${OVERLAY_ID} .zad-migration-card{animation:zadMigrationIn .28s ease-out both}
        @keyframes zadMigrationIn{from{opacity:0;transform:translateY(9px) scale(.985)}to{opacity:1;transform:none}}
      }
    `;
    return style;
  }

  function showMigration(){
    if(document.getElementById(OVERLAY_ID)||!document.body)return;

    const overlay=el("section");overlay.id=OVERLAY_ID;
    overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");
    overlay.setAttribute("aria-labelledby","zad-migration-title");
    const card=el("div","zad-migration-card");
    const mark=el("div","zad-migration-mark","زاد");mark.setAttribute("aria-hidden","true");
    const title=el("h2","","شكرًا لمساعدتنا في النسخة التجريبية من زاد الخير");title.id="zad-migration-title";
    const intro=el("p","","أصبحت النسخة النهائية من زاد الخير متاحة الآن على:");
    const domainLine=el("p");domainLine.appendChild(el("span","zad-migration-domain","zad-alkhair.net"));
    const message=el("p","","إذا كان التطبيق مثبتًا لديك، افتح النسخة النهائية أولًا. وبعد تأكيد نجاح الانتقال يمكنك إزالة النسخة القديمة وتثبيت التطبيق الجديد.");
    const thanks=el("p","","نعتذر عن الإزعاج، ونشكرك على ثقتك.");
    const action=el("button","zad-migration-action","الانتقال بأمان إلى النسخة النهائية");action.type="button";
    const note=el("p","zad-migration-note","لن نحذف أو نغيّر أي بيانات أثناء الانتقال.");

    action.addEventListener("click",async()=>{
      action.disabled=true;action.replaceChildren(el("span","zad-migration-spinner"),document.createTextNode("جارٍ الانتقال…"));
      note.className="zad-migration-note";note.textContent="يرجى الانتظار لحظات…";
      try{
        const token=await createHandoff();
        location.replace(transferDestination(token,currentDestinationPath()));
      }catch(_){
        action.disabled=false;action.textContent="إعادة المحاولة";
        note.className="zad-migration-note zad-migration-error";
        note.textContent="لم يكتمل الانتقال. لم تُحذف أو تتغير أي بيانات؛ تحقق من الاتصال ثم أعد المحاولة.";
      }
    });

    card.append(mark,title,intro,domainLine,message,thanks,action,note);overlay.appendChild(card);
    document.head.appendChild(migrationStyles());document.body.appendChild(overlay);
    document.documentElement.style.overflow="hidden";document.body.style.overflow="hidden";
    action.focus({preventScroll:true});
  }

  function checkAndShow(){customDomainReady().then(ready=>{if(ready)showMigration()}).catch(()=>{})}
  checkAndShow();window.addEventListener("online",checkAndShow,{passive:true});
})();
