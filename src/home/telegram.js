/* ===================== تلغرام ===================== */
let lkTimer=null;

/* يفتح البوت ويظلّ يراقب حتى يتمّ التفعيل */
let linking=false;   /* حارس: عملية ربط جارية، فلا يُولَّد رمز ثانٍ */

async function startLinking(force){
  /* كل رمز جديد يمحو ما قبله، فتولّد رمزين على ضغطة واحدة
     يُفشل الربط ويُظهر اعتذارًا بلا سبب. */
  if(linking && !force){ if(screen!=="linking"){ screen="linking"; render(); } return; }
  linking=true;
  screen="linking"; render();
  const opened=await openBot();
  if(!opened) showFallback();
  /* بعد ثوانٍ نعرض المخرج على كل حال، فقد يفشل الفتح صامتًا */
  setTimeout(showFallback,5000);
  clearInterval(lkTimer);
  let tries=0,checking=false;
  lkTimer=setInterval(async()=>{
    if(screen!=="linking"||!viewer){ clearInterval(lkTimer); lkTimer=null; linking=false; return; }
    if(checking) return;
    checking=true;
    tries++;
    try{
      if(!await refresh(true)) return;
      if(!state){ clearInterval(lkTimer); lkTimer=null; linking=false; render(); return; }
      const m=memberOf(viewer.id);
      if(m&&(m.linked||m.exempt)){
        clearInterval(lkTimer); lkTimer=null; linking=false;
        if(justCreated){ justCreated=false; screen="share"; render(); toast("بدأت الختمة"); return; }
        screen="main"; render();
        toast(m.linked?"تم تفعيل التذكير، تقبّل الله":"أذن لك المنظّم بالدخول");
      } else if(tries>=100){ clearInterval(lkTimer); lkTimer=null; linking=false; showFallback(); }
    }finally{ checking=false; }
  },3000);
}

function showFallback(){
  const el=document.getElementById("lk-fallback");
  if(el) el.classList.remove("lk-hidden");
}

/* يولّد رمز ربط ويفتح محادثة البوت. يعيد false إن منع المتصفح الفتح */
async function openBot(){
  /* فتح النافذة داخل ضغطة المستخدم يمنع حاجب النوافذ من رفضها بعد انتظار الشبكة. */
  const w=window.open("about:blank","_blank");
  if(w) w.opener=null;
  let lc;
  try{ lc=await rpc("make_link_code",{p_code:code,p_id:viewer.id,p_device:deviceId()}); }
  catch(e){ if(w) w.close(); return false; }
  if(!lc){ if(w) w.close(); return false; }
  const url=`https://t.me/${BOT_USERNAME}?start=${lc}`;
  if(w){ w.location.replace(url); return true; }
  return false;
}

/* الزر الظاهر في الختمة لمن لم يفعّل، أو لمن حذف البوت */
let linkBusy=false;
async function linkTelegram(){
  if(linkBusy) return;
  linkBusy=true;
  const ok=await openBot();
  toast(ok?"اضغط زر البدء في تلغرام ثم عد إلى هنا":"تعذّر فتح تلغرام");
  if(!ok){ linkBusy=false; return; }
  let n=0,checking=false;
  const t=setInterval(async()=>{
    if(checking) return;
    checking=true;
    n++;
    try{
      if(!await refresh(true)) return;
      if(!state){ clearInterval(t); linkBusy=false; render(); return; }
      const m=memberOf(viewer.id);
      if(m&&m.linked){
        clearInterval(t); linkBusy=false; render(); toast("تم تفعيل التذكير");
      }else if(n>=20){ clearInterval(t); linkBusy=false; }
    }finally{ checking=false; }
  },3000);
}
