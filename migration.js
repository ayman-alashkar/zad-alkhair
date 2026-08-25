"use strict";

/*
  Zad Al-Khair legacy-origin bridge.

  This file is deliberately inert until the custom domain serves a known app
  asset. It can therefore be deployed to the current GitHub Pages origin before
  the DNS cutover without interrupting users or publishing dead links.
*/
(()=>{
  const LEGACY_HOST="ayman-alashkar.github.io";
  const LEGACY_PREFIX="/zad-alkhair";
  const NEW_ORIGIN="https://zad-alkhair.net";
  const READY_ASSET="/icons/icon-32.png";
  const OVERLAY_ID="zad-domain-migration";

  if(location.hostname!==LEGACY_HOST)return;

  function appPath(){
    let path=location.pathname||"/";
    if(path===LEGACY_PREFIX)path="/";
    else if(path.startsWith(LEGACY_PREFIX+"/"))path=path.slice(LEGACY_PREFIX.length)||"/";
    if(!path.startsWith("/"))path="/"+path;
    return path;
  }

  function currentDestination(){
    return NEW_ORIGIN+appPath()+location.search+location.hash;
  }

  function installDestination(){
    const path=appPath().startsWith("/install/")?"/":appPath()+location.search+location.hash;
    const url=new URL("/install/",NEW_ORIGIN);
    if(path&&path!=="/")url.searchParams.set("next",path);
    return url.href;
  }

  function customDomainReady(timeoutMs=5000){
    return new Promise(resolve=>{
      const image=new Image();
      let settled=false;
      const finish=value=>{
        if(settled)return;
        settled=true;
        clearTimeout(timer);
        image.onload=image.onerror=null;
        resolve(value);
      };
      const timer=setTimeout(()=>finish(false),timeoutMs);
      image.onload=()=>finish(true);
      image.onerror=()=>finish(false);
      image.src=NEW_ORIGIN+READY_ASSET+"?migration=v112&time="+Date.now();
    });
  }

  function el(tag,className,text){
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text)node.textContent=text;
    return node;
  }

  function showMigration(){
    if(document.getElementById(OVERLAY_ID)||!document.body)return;

    const style=document.createElement("style");
    style.textContent=`
      #${OVERLAY_ID}{
        position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;
        padding:max(18px,env(safe-area-inset-top)) 18px max(18px,env(safe-area-inset-bottom));
        overflow:auto;direction:rtl;background:rgba(5,31,29,.82);backdrop-filter:blur(12px);
        -webkit-backdrop-filter:blur(12px);font-family:"Alexandria",Tahoma,Arial,sans-serif;
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
      #${OVERLAY_ID} h2{margin:0;color:#0F5C50;font-family:"Aref Ruqaa",serif;font-size:2rem;line-height:1.35}
      #${OVERLAY_ID} p{margin:13px auto 0;max-width:42ch;color:#5f594b;font-size:.96rem;line-height:1.95}
      #${OVERLAY_ID} .zad-migration-domain{display:inline-block;direction:ltr;color:#9A6D25;font-weight:750}
      #${OVERLAY_ID} .zad-migration-actions{display:grid;gap:10px;margin-top:23px}
      #${OVERLAY_ID} a{
        min-height:54px;padding:12px 18px;border-radius:17px;display:flex;align-items:center;
        justify-content:center;text-decoration:none;font:750 .98rem/1.5 "Alexandria",Tahoma,Arial,sans-serif;
      }
      #${OVERLAY_ID} .zad-migration-install{color:#fff;background:linear-gradient(180deg,#0F5C50,#0A473E);box-shadow:0 9px 22px rgba(15,92,80,.2)}
      #${OVERLAY_ID} .zad-migration-open{color:#0F5C50;background:#fffdf5;border:1px solid rgba(15,92,80,.24)}
      #${OVERLAY_ID} .zad-migration-note{font-size:.78rem;color:#786e58;line-height:1.8}
      @media(max-width:520px){
        #${OVERLAY_ID}{padding-inline:12px}
        #${OVERLAY_ID} .zad-migration-card{padding:27px 18px 20px;border-radius:25px}
        #${OVERLAY_ID} h2{font-size:1.72rem}
      }
      @media(prefers-reduced-motion:no-preference){
        #${OVERLAY_ID} .zad-migration-card{animation:zadMigrationIn .28s ease-out both}
        @keyframes zadMigrationIn{from{opacity:0;transform:translateY(9px) scale(.985)}to{opacity:1;transform:none}}
      }
    `;

    const overlay=el("section","");
    overlay.id=OVERLAY_ID;
    overlay.setAttribute("role","dialog");
    overlay.setAttribute("aria-modal","true");
    overlay.setAttribute("aria-labelledby","zad-migration-title");

    const card=el("div","zad-migration-card");
    const mark=el("div","zad-migration-mark","زاد");
    mark.setAttribute("aria-hidden","true");
    const title=el("h2","","انتقل زاد الخير إلى عنوانه الجديد");
    title.id="zad-migration-title";
    const message=el("p","",window.matchMedia("(display-mode: standalone)").matches
      ?"هذه هي النسخة المثبّتة القديمة. افتح النسخة الجديدة وثبّتها لتستمر في تلقي التحديثات."
      :"أصبح لزاد الخير عنوانه الرسمي الجديد. انتقل إليه لتستخدم النسخة الأحدث من التطبيق.");
    const domain=el("span","zad-migration-domain","zad-alkhair.net");
    const domainLine=el("p","");
    domainLine.appendChild(domain);

    const actions=el("div","zad-migration-actions");
    const install=el("a","zad-migration-install","تثبيت التطبيق الجديد");
    install.href=installDestination();
    const open=el("a","zad-migration-open","فتح زاد الخير");
    open.href=currentDestination();
    actions.append(install,open);

    const note=el("p","zad-migration-note","بعد تثبيت النسخة الجديدة يمكنك حذف النسخة القديمة يدويًا من جهازك؛ لا يستطيع المتصفح حذفها تلقائيًا.");
    card.append(mark,title,message,domainLine,actions,note);
    overlay.appendChild(card);
    document.head.appendChild(style);
    document.body.appendChild(overlay);
    document.documentElement.style.overflow="hidden";
    document.body.style.overflow="hidden";
    install.focus({preventScroll:true});
  }

  customDomainReady().then(ready=>{if(ready)showMigration()}).catch(()=>{});
})();
