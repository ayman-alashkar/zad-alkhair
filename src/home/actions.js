/* ===================== الأفعال ===================== */
let actionBusy=false;
async function act(a,i){
  const num=i+1;
  const j=state.juz[i];
  const mine=j.ownerId===viewer.id;
  const o=j.ownerId?memberOf(j.ownerId):null;

  /* حين يتصرّف المنظّم في جزء غيره، يُسأل باسم صاحبه صراحةً */
  if(!mine&&o){
    if(a==="done"&&!await appConfirm(`هل أتمّ ${o.name} الجزء ${ar(num)} فعلًا؟\nسيتوقف تذكيره به، وتصله رسالة شكر.`,{title:"تأكيد القراءة",ok:"نعم، أتمّه"})) return;
    if(a==="undone"&&!await appConfirm(`سيعود الجزء ${ar(num)} إلى «لم يُتمّ» باسم ${o.name}، ويعود تذكيره به.`,{title:"إعادة حالة الجزء",ok:"أعده"})) return;
    if(a==="free"&&!await appConfirm(`سيُحرَّر الجزء ${ar(num)} من ${o.name} ويعود متاحًا للجميع.`,{title:"تحرير الجزء",ok:"حرّر الجزء",danger:true})) return;
  }

  if(actionBusy) return;
  actionBusy=true;
  let ownerId=j.ownerId;
  const unreadBefore=state.juz.filter(x=>x.status!=="done").length;
  try{
    try{
      let r;
      if(a==="take")        r=await rpc("claim_juz",{p_code:code,p_id:viewer.id,p_num:num,p_device:deviceId()});
      else if(a==="free")   r=await rpc("release_juz",{p_code:code,p_id:viewer.id,p_num:num,p_org_code:orgCode(),p_device:deviceId()});
      else if(a==="done")   r=await rpc("set_done",{p_code:code,p_id:viewer.id,p_num:num,p_done:true,p_org_code:orgCode(),p_device:deviceId()});
      else if(a==="undone") r=await rpc("set_done",{p_code:code,p_id:viewer.id,p_num:num,p_done:false,p_org_code:orgCode(),p_device:deviceId()});
      if(r&&!r.ok){ await refresh(); return toast(r.error||"تعذّر التنفيذ"); }
      if(r&&r.ownerId) ownerId=r.ownerId;
    }catch(e){ return toast("تعذّر الاتصال"); }

    closeLayer();
    const loaded=await refresh();

    if(a==="done"){
      /* تحفظ الرسالة محليًا إن انقطع الاتصال، ثم تُعاد محاولتها تلقائيًا. */
      enqueueEdge("notify-done",{code,id:ownerId,num},
        `notify:${code}:${state.roundNo||1}:${ownerId}:${num}:done`);
      const left=loaded&&state
        ?state.juz.filter(x=>x.status!=="done").length
        :Math.max(0,unreadBefore-1);
      if(left===0){
        /* اكتملت الثلاثون، فيُبلَّغ الجميع تلقائيًا. */
        enqueueEdge("announce",{kind:"done",code},
          `announce:${code}:${state.roundNo||1}:done`);
      }
      toast(left===0?"تمّت الختمة، تقبّل الله"
        :mine?`تقبّل الله. بقي ${ar(left)} جزءًا`:`سُجّل جزء ${o?o.name:""}`);
    }
  }finally{ actionBusy=false; }
}

function copyLink(){
  const url=linkFor(code);
  navigator.clipboard.writeText(url).then(()=>toast("نُسخ الرابط"))
    .catch(()=>appCopyFallback("نسخ رابط الدعوة",url));
}

function shareText(){
  const free=state.juz.map((j,i)=>j.status==="free"?i+1:null).filter(Boolean);
  const done=state.juz.filter(j=>j.status==="done").length;
  const msg=`${state.title}${state.dedication?"\nعلى نية: "+state.dedication:""}
تنتهي: ${fmtG(state.endDate)} — ${fmtH(state.endDate)}
تمّت قراءة ${done} من 30 جزءًا.
${free.length?"الأجزاء المتاحة: "+free.join("، "):"اكتملت الحجوزات، بارك الله فيكم."}
ادخل واحجز جزءك: ${linkFor(code)}`;
  navigator.clipboard.writeText(msg).then(()=>toast("نُسخت الرسالة، أرسلها للمجموعة"))
    .catch(()=>appCopyFallback("نسخ رسالة الدعوة",msg));
}

function logoutCurrent(){
  localStorage.removeItem(vKey()); localStorage.removeItem(cKey());
  activeKhatmahForget(code);
  clearInterval(lkTimer); lkTimer=null; linking=false;
  viewer=null;gateName="";closeTopMenu();closeLayer();screen="gate";render();
}
function reminderFromAccountMenu(){
  /* في الختمة العامة لكل مشارك ساعة تذكير خاصة به؛
     لذلك يبدأ التفعيل وإعادة التفعيل دائمًا باختيار الساعة. */
  if(state&&state.accessType==="public") askReminderHour();
  else linkTelegram();
}
function handleTopMenuClick(e){
  const mine=e.target.closest("[data-top-mine]");
  if(mine){closeTopMenu();zkReplaceHash(mine.dataset.topMine);boot();return;}
  const action=e.target.closest("[data-top-action]")?.dataset.topAction;
  if(!action) return;
  if(action==="mine"){showTopMenu("mine");return;}
  if(action==="account"){showTopMenu("account");return;}
  closeTopMenu();
  if(action==="history") historyDialog();
  else if(action==="reminder") reminderFromAccountMenu();
  else if(action==="logout") logoutCurrent();
  else if(action==="leave") leaveDialog();
}
