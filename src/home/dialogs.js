/* ===================== لوح الجزء ===================== */
function openSheet(i){
  selected=i;
  const j=state.juz[i];
  const o=j.ownerId?memberOf(j.ownerId):null, mine=j.ownerId===viewer.id;
  let acts="", note="";
  if(j.status==="free") acts=`<button class="btn green" data-act="take" data-i="${i}">احجز هذا الجزء</button>`
    + (isOrganizer()?`<button class="btn" id="s-assign" data-i="${i}">أسنده إلى مشارك</button>`:"");
  else if(mine&&j.status==="taken") acts=`<button class="btn gold" data-act="done" data-i="${i}">أتممت قراءته</button>
    <button class="btn quiet" data-act="free" data-i="${i}">تراجع عن الحجز</button>`;
  else if(mine) acts=`<button class="btn quiet" data-act="undone" data-i="${i}">تراجع عن الإتمام</button>`;
  else{ note=j.status==="done"&&!o
      ? "هذا الجزء مقروء، وقد غادر قارئه الختمة."
      : `محجوز باسم ${esc(o?o.name:"—")}${j.status==="done"?"، وقد أتمّه.":"."}`;
    if(isOrganizer()&&j.status==="taken")
      acts=`<button class="btn gold" data-act="done" data-i="${i}">علّمه مقروءًا نيابةً عنه</button>
            <button class="btn" id="s-assign" data-i="${i}">أسنده إلى غيره</button>
            <button class="btn" data-act="free" data-i="${i}">حرِّر الجزء للجميع</button>`;
    else if(isOrganizer()&&j.status==="done")
      acts=`<button class="btn quiet" data-act="undone" data-i="${i}">تراجع عن الإتمام</button>`; }
  document.getElementById("layer").innerHTML=`
    <div class="scrim" id="scrim"></div>
    <div class="frame sheet">
      <div class="grip"></div>
      <h3>الجزء ${ar(i+1)}</h3>
      <div class="range">${JUZ[i]}</div>
      <a class="readbtn" href="${readLink(i+1)}">
        <span class="rb-icon">${BOOK_ICON}</span>
        <span class="rb-text">اقرأ الجزء</span>
        <span class="rb-src">قارئ زاد الخير</span>
        <span class="rb-fill"></span>
      </a>
      <div class="ward">
        <p class="motiv">${MOTIV[i].t}</p>
        <p class="quote ${MOTIV[i].k==="a"?"ayah":"hadith"}">${MOTIV[i].k==="a"
          ? "﴿ "+MOTIV[i].q+" ﴾" : "قال ﷺ: «"+MOTIV[i].q+"»"}</p>
        <p class="src">${MOTIV[i].s}</p>
      </div>
      ${note?`<p class="hint">${note}</p>`:""}
      <div class="actions">${acts}<button class="btn quiet spacer" id="s-close">إغلاق</button></div>
    </div>`;
  document.getElementById("scrim").onclick=closeLayer;
  document.getElementById("s-close").onclick=closeLayer;
  const asg=document.getElementById("s-assign");
  if(asg) asg.onclick=()=>assignDialog(i);
  document.querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>act(b.dataset.act,+b.dataset.i));
}
function closeLayer(){document.getElementById("layer").innerHTML="";document.body.classList.remove("zk-launch-prayer");selected=null;}
function modal(html,kind=""){
  document.getElementById("layer").innerHTML=`<div class="modal${kind?` ${kind}`:""}" id="m-back"><div class="frame">${html}</div></div>`;
  document.getElementById("m-back").onclick=e=>{if(e.target.id==="m-back")closeLayer();};
}


/* نافذة تأكيد موحّدة: نفس modal/frame والعناوين والأزرار المستعملة في التطبيق. */
function appConfirm(message,{title="تأكيد",ok="متابعة",cancel="إلغاء",danger=false}={}){
  return new Promise(resolve=>{
    const host=document.createElement("div");
    host.className="modal app-confirm-overlay";
    host.setAttribute("role","presentation");
    host.innerHTML=`<div class="frame app-confirm-card" role="dialog" aria-modal="true" aria-labelledby="app-confirm-title">
      <div class="display" id="app-confirm-title" style="font-size:1.4rem">${esc(title)}</div>
      <p class="hint app-confirm-copy" style="margin:.7rem 0 1.1rem;line-height:2">${esc(message)}</p>
      <div class="actions">
        <button class="btn ${danger?"danger":"gold"}" data-confirm-ok>${esc(ok)}</button>
        <button class="btn quiet" data-confirm-cancel>${esc(cancel)}</button>
      </div>
    </div>`;
    document.body.appendChild(host);
    const okBtn=host.querySelector("[data-confirm-ok]");
    const cancelBtn=host.querySelector("[data-confirm-cancel]");
    let settled=false;
    const done=value=>{
      if(settled) return;
      settled=true;
      document.removeEventListener("keydown",onKey,true);
      host.remove();
      resolve(value);
    };
    const onKey=e=>{
      if(e.key==="Escape"){e.preventDefault();done(false);}
    };
    okBtn.onclick=()=>done(true);
    cancelBtn.onclick=()=>done(false);
    host.onclick=e=>{if(e.target===host)done(false);};
    document.addEventListener("keydown",onKey,true);
    requestAnimationFrame(()=>okBtn.focus({preventScroll:true}));
  });
}

/* بديل داخلي لـ prompt، بنفس نافذة التطبيق القياسية. */
function appCopyFallback(title,value){
  return new Promise(resolve=>{
    const host=document.createElement("div");
    host.className="modal app-confirm-overlay";
    host.innerHTML=`<div class="frame app-confirm-card" role="dialog" aria-modal="true" aria-labelledby="app-copy-title">
      <div class="display" id="app-copy-title" style="font-size:1.4rem">${esc(title)}</div>
      <p class="hint" style="margin:.7rem 0 .9rem;line-height:2">تعذّر النسخ التلقائي. حدّد النص وانسخه من هنا.</p>
      <textarea class="app-copy-box" readonly>${esc(value)}</textarea>
      <div class="actions" style="margin-top:1rem">
        <button class="btn gold" data-copy-close>حسنًا</button>
      </div>
    </div>`;
    document.body.appendChild(host);
    const ta=host.querySelector("textarea");
    const close=()=>{host.remove();resolve();};
    host.querySelector("[data-copy-close]").onclick=close;
    host.onclick=e=>{if(e.target===host)close();};
    requestAnimationFrame(()=>{ta.focus({preventScroll:true});ta.select();});
  });
}

async function loadPublicKhatmahs(force=false){
  if(publicKhatmahsLoading||(!force&&publicKhatmahsLoaded)) return;
  publicKhatmahsLoading=true;publicKhatmahsError=false;
  if(screen==="home") render();
  try{
    const rows=await rpc("list_active_khatmahs",{});
    publicKhatmahs=Array.isArray(rows)?rows:[];
    publicKhatmahsLoaded=true;
  }catch(e){
    /* بيانات عرض داخل بيئة المعاينة وحدها؛ لا تُستعمل على الموقع الحقيقي. */
    if(location.hostname==="terminal.local"){
      publicKhatmahs=[
        {publicId:"preview-1",title:"ختمة أهل القرآن",accessType:"public",participantCount:12,reservedCount:23,doneCount:14,endDate:plusDays(5)},
        {publicId:"preview-2",title:"ختمة المحبة",accessType:"public",participantCount:8,reservedCount:17,doneCount:9,endDate:plusDays(8)},
        {publicId:"preview-3",title:"رفقة النور",accessType:"private",participantCount:21,reservedCount:30,doneCount:26,endDate:plusDays(2)},
        {publicId:"preview-4",title:"ختمة العائلة",accessType:"private",participantCount:6,reservedCount:11,doneCount:4,endDate:plusDays(10)}
      ];
      publicKhatmahsLoaded=true;
    }else publicKhatmahsError=true;
  }
  finally{
    publicKhatmahsLoading=false;
    if(screen==="home") render();
  }
}

async function joinKhatmahCard(publicId){
  const item=publicKhatmahs.find(k=>k.publicId===publicId);
  if(!item) return;
  if(item.accessType==="public"){
    toast("جارٍ فتح الختمة…");
    let publicCode;
    try{publicCode=await rpc("open_public_khatmah",{p_public_id:publicId});}
    catch(e){return toast("تعذّر فتح الختمة الآن");}
    if(!publicCode) return toast("لم تعد هذه الختمة متاحة");
    zkReplaceHash(String(publicCode).toUpperCase());boot();return;
  }
  modal(`<div class="display" style="font-size:1.35rem">${esc(item.title)}</div>
    <p class="hint" style="margin:.55rem 0 1rem">أدخل رمز هذه الختمة للانضمام إليها.</p>
    <div class="field-row"><input id="card-code" class="field codebox" maxlength="4"
      autocomplete="off" inputmode="text" placeholder="ABCD"></div>
    <div class="actions"><button class="btn gold" id="card-go">انضمام</button>
      <button class="btn quiet" id="card-no">إلغاء</button></div>`);
  const field=document.getElementById("card-code");
  const go=async()=>{
    const c=norm(field.value).toUpperCase();
    if(c.length!==4) return toast("الرمز أربعة محارف");
    let matches=false;
    try{matches=await rpc("match_khatmah_code",{p_public_id:publicId,p_code:c});}
    catch(e){return toast("تعذّر التحقق من الرمز");}
    if(!matches) return toast("هذا الرمز لا يخصّ الختمة المختارة");
    closeLayer();zkReplaceHash(c);boot();
  };
  document.getElementById("card-go").onclick=go;
  document.getElementById("card-no").onclick=closeLayer;
  field.onkeydown=e=>{if(e.key==="Enter")go();};
  field.focus();
}

async function historyDialog(){
  modal(`<div class="display" style="font-size:1.4rem">سجلي في هذه الختمة</div>
    <p class="hint" style="margin:.8rem 0">جارٍ جمع ما قرأت عبر دورات هذه الختمة…</p>`);
  let result;
  try{
    result=await rpc("get_my_history",{
      p_code:code,p_id:viewer.id,p_device:deviceId()
    });
  }catch(e){
    modal(`<div class="display" style="font-size:1.35rem">سجلي في هذه الختمة</div>
      <p class="hint" style="margin:.8rem 0 1rem">تعذّر تحميل السجل الآن.</p>
      <div class="actions"><button class="btn quiet" id="history-close">إغلاق</button></div>`);
    document.getElementById("history-close").onclick=closeLayer;
    return;
  }
  if(!result||!result.ok){
    modal(`<div class="display" style="font-size:1.35rem">سجلي في هذه الختمة</div>
      <p class="hint" style="margin:.8rem 0 1rem">${esc(result&&result.error||"تعذّر تحميل السجل")}</p>
      <div class="actions"><button class="btn quiet" id="history-close">إغلاق</button></div>`);
    document.getElementById("history-close").onclick=closeLayer;return;
  }
  const rows=Array.isArray(result.history)?result.history:[];
  const groups=new Map();
  rows.forEach(row=>{
    const round=Number(row.roundNo)||1;
    if(!groups.has(round)) groups.set(round,[]);
    groups.get(round).push(Number(row.number));
  });
  const rounds=[...groups.entries()].sort((a,b)=>b[0]-a[0]);
  const body=rounds.length?rounds.map(([round,parts])=>`
    <section class="history-round">
      <h4>الختمة ${ar(round)}</h4>
      <div class="history-parts">${parts.sort((a,b)=>a-b).map(n=>`<span class="history-part" title="الجزء ${n}">${ar(n)}</span>`).join("")}</div>
    </section>`).join(""):
    `<p class="hint" style="padding:1rem 0">لم يُسجّل لك جزء مقروء بعد.</p>`;
  modal(`<div class="display" style="font-size:1.4rem">سجلي في هذه الختمة</div>
    <p class="hint" style="margin:.5rem 0 .2rem">الأجزاء التي قرأتها، لتختار غيرها.</p>
    <div class="history-rounds">${body}</div>
    <div class="actions"><button class="btn quiet" id="history-close">إغلاق</button></div>`);
  document.getElementById("history-close").onclick=closeLayer;
}
