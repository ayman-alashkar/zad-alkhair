/* ---------- تبويب «التلاوة»: واجهة ثانية لمشغّل التلاوة نفسه ----------
   الصفحة لا تملك مشغّلًا خاصًا بها: كل تشغيل وإيقاف وتنقّل يمرّ بمحرّك المصحف
   (playCurrent وstepPlayer وغيرهما). لذلك تستمر التلاوة بين الاستماع والمصحف
   والفهرس، لأنها كلها في هذه الصفحة. تُرسم الواجهة من حالة المحرّك عند كل تغيير. */
const LISTEN_LAST_KEY="zad:listen:last-v1";
const LISTEN_FAVS_KEY="zad:listen:favorites-v1";
const LISTEN_PICKS=[18,67,36,56,55];
const ARC_LEN=301.6;
const LISTEN_ICONS={
  play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></svg>',
  pause:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="3.6" height="14" rx="1.2"/><rect x="13.9" y="5" width="3.6" height="14" rx="1.2"/></svg>',
  prev:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14M9 6l9 6-9 6Z"/></svg>',
  next:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 5v14M15 6l-9 6 9 6Z"/></svg>',
  repeat:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>',
  more:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>',
  read:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/></svg>',
  chevron:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  search:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
  check:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7"/></svg>',
  heart:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.2s-7.5-4.4-9.1-9.3C1.8 7.4 4 4.3 7.3 4.3c2 0 3.5 1.1 4.7 2.8 1.2-1.7 2.7-2.8 4.7-2.8 3.3 0 5.5 3.1 4.4 6.6-1.6 4.9-9.1 9.3-9.1 9.3Z"/></svg>',
  headphones:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4.6" height="6.6" rx="2"/><rect x="16.4" y="14" width="4.6" height="6.6" rx="2"/></svg>'
};
let readerReturnToListen=false;
/* موضع البدء الذي يختاره المستخدم بسحب القوس قبل التشغيل: {s: السورة، f: الموضع من ٠ إلى ١}.
   seekAfterLoad: لقارئ السورة الكاملة، يُطبَّق الموضع حين تُعرف مدة الملف. */
let listenPending=null,listenSeekAfterLoad=null;
let listenTarget=null,listenReturnUrl=null;
let listenPanel=null,listenTab="s",listenObserver=null,listenDrag=null,listenLastSaved="";

function listenIsOpen(){return !!listenPanel?.isConnected}
function listenSurahName(s){return chapterMap.get(Number(s))?.name_arabic||ar(s)}
function listenActive(){return document.body.classList.contains("player-on")}
function listenLast(){
  const v=storageJsonGet(LISTEN_LAST_KEY,null);
  if(!v||!(v.s>=1&&v.s<=114))return null;
  return {s:Number(v.s),a:Math.max(1,Number(v.a)||1),q:String(v.q||"")};
}
/* آخر موضع استماع، لبطاقة «تابع الاستماع» حين لا تُتلى سورة. */
function listenRemember(){
  if(!listenActive())return;
  const mark=`${play.surah}:${play.current}:${reciter.id}`;
  if(mark===listenLastSaved)return;listenLastSaved=mark;
  storageJsonSet(LISTEN_LAST_KEY,{s:play.surah,a:isSurahOnly()?1:play.current,q:reciter.id,at:Date.now()});
}
/* «٧ آيات» و«٨٦ آية»: جمع القلة من ٣ إلى ١٠. */
function listenAyahCount(n){n=Number(n)||0;return `${ar(n)} ${n>=3&&n<=10?"آيات":"آية"}`}
function listenFavorites(){const v=storageJsonGet(LISTEN_FAVS_KEY,[]);return Array.isArray(v)?v.map(Number).filter(n=>n>=1&&n<=114):[]}
function listenIsFavorite(s){return listenFavorites().includes(Number(s))}
function listenToggleFavorite(s){
  s=Number(s);const list=listenFavorites(),on=!list.includes(s);
  storageJsonSet(LISTEN_FAVS_KEY,on?[...list,s]:list.filter(n=>n!==s));
  showToast(on?`أُضيفت سورة ${listenSurahName(s)} إلى المفضلة`:`أُزيلت سورة ${listenSurahName(s)} من المفضلة`);
  if(listenTab==="f")listenRedrawLists();else listenPaint();
}
function listenFriday(){return new Date().getDay()===5}

/* تقدّم السورة كلها، لا تقدّم الآية: في تلاوة الآية آيةً آية يُحسب من رقم الآية وموضعها. */
function listenProgress(){
  const d=Number(audio.duration),t=Number(audio.currentTime)||0,max=maxAyah(play.surah);
  const mode=audio.dataset.playMode;
  if((mode==="surah"||mode==="gapless")&&Number.isFinite(d)&&d>0)return {f:Math.min(1,t/d),t,d,timed:true};
  if(mode==="ayah"){
    const inner=Number.isFinite(d)&&d>0?Math.min(1,t/d):0;
    return {f:Math.min(1,(Number(play.current)-1+inner)/Math.max(1,max)),timed:false};
  }
  return {f:0,timed:false};
}
function listenArcPoint(f){
  const a=Math.PI*Math.max(0,Math.min(1,f));
  return [110+96*Math.cos(a),110-96*Math.sin(a)];
}
function listenPaintArc(f){
  if(!listenPanel)return;
  const fill=listenPanel.querySelector(".zl-arc-fill"),knob=listenPanel.querySelector(".zl-arc-knob");
  if(fill)fill.style.strokeDashoffset=(ARC_LEN*(1-f)).toFixed(1);
  if(knob){const[x,y]=listenArcPoint(f);knob.setAttribute("transform",`translate(${x.toFixed(1)} ${y.toFixed(1)})`)}
}
function listenTick(){
  if(!listenIsOpen()||listenDrag)return;
  const p=listenActive()?listenProgress():{f:listenIdleFraction(),timed:false};
  listenPaintArc(p.f);
  const bar=listenPanel.querySelector(".zl-mini-bar i");if(bar)bar.style.transform=`scaleX(${p.f.toFixed(4)})`;
  const time=listenPanel.querySelector(".zl-time");
  if(time){
    time.hidden=!p.timed;
    if(p.timed)time.innerHTML=`<bdi dir="ltr">${formatAudioTime(p.t)}</bdi> / <bdi dir="ltr">${formatAudioTime(p.d)}</bdi>`;
  }
}

/* موضع الكرة قبل التشغيل: ما اختاره بالسحب، أو آخر آية سُمعت، أو البداية. */
function listenIdleFraction(){
  const st=listenCardState();
  if(listenPending&&listenPending.s===st.s)return listenPending.f;
  if(st.kind==="resume"&&!isSurahOnly(st.r))return (st.a-1)/Math.max(1,maxAyah(st.s));
  return 0;
}
function listenIdleLabel(st,f){
  if(isSurahOnly(st.r))return f>0?`من ${ar(Math.round(f*100))}٪ من السورة`:"السورة كاملة";
  const max=maxAyah(st.s);
  return `الآية ${ar(Math.min(max,Math.floor(f*max)+1))} من ${ar(max)}`;
}
/* الحالة التي تعرضها البطاقة: التلاوة الجارية، أو آخر ما سُمع، أو الفاتحة. */
function listenCardState(){
  if(listenActive())return {kind:"now",s:play.surah,a:play.current,r:reciter};
  if(listenTarget)return {kind:"link",s:listenTarget.surah,a:1,r:listenTarget.reciter};
  const last=listenLast();
  if(last)return {kind:"resume",s:last.s,a:last.a,r:RECITERS.find(x=>x.id===last.q)||reciter};
  return {kind:"start",s:listenFriday()?18:1,a:1,r:reciter};
}
function listenAyahLine(st){
  if(isSurahOnly(st.r))return "السورة كاملة";
  const max=maxAyah(st.s);
  if(st.kind==="now"&&audio.dataset.playMode==="basmala")return "البسملة";
  if(st.kind!=="now"&&listenPending&&listenPending.s===st.s)return listenIdleLabel(st,listenPending.f);
  return st.kind==="start"||st.kind==="link"?listenAyahCount(max):`الآية ${ar(st.a)} من ${ar(max)}`;
}
function listenPaint(){
  if(!listenIsOpen())return;
  const st=listenCardState(),card=listenPanel.querySelector(".zl-card");
  const playing=st.kind==="now"&&!audio.paused&&!!audio.dataset.playMode;
  card.dataset.kind=st.kind;card.classList.toggle("playing",playing);
  card.querySelector(".zl-eyebrow").innerHTML=st.kind==="now"
    ?(playing?`<span class="zl-wave on" aria-hidden="true"><i></i><i></i><i></i><i></i></span>يُتلى الآن`:playbackWanted?"جارٍ تحميل التلاوة…":"متوقفة مؤقتًا")
    :st.kind==="resume"?"تابع الاستماع":st.kind==="link"?"استمع إلى السورة":(listenFriday()?"سنّة يوم الجمعة":"ابدأ الاستماع");
  card.querySelector(".zl-name").textContent=`سورة ${listenSurahName(st.s)}`;
  card.querySelector(".zl-ayah").textContent=listenAyahLine(st);
  const main=card.querySelector(".zl-main");
  main.innerHTML=playing?LISTEN_ICONS.pause:LISTEN_ICONS.play;
  main.setAttribute("aria-label",playing?"إيقاف مؤقت":st.kind==="resume"?"متابعة الاستماع":"تشغيل");
  const whole=isSurahOnly(st.r);
  card.querySelector(".zl-prev").setAttribute("aria-label",whole?"السورة السابقة":"الآية السابقة");
  card.querySelector(".zl-next").setAttribute("aria-label",whole?"السورة التالية":"الآية التالية");
  const rep=card.querySelector(".zl-repeat");
  rep.classList.toggle("on",repeatMode!=="off");rep.dataset.badge=repeatMode==="one"?"١":repeatMode==="all"?"∞":"";
  rep.setAttribute("aria-pressed",String(repeatMode!=="off"));
  rep.setAttribute("aria-label",repeatMode==="one"?"تكرار السورة":repeatMode==="all"?"تكرار المصحف":"التكرار متوقف");
  const heart=card.querySelector(".zl-heart"),fav=listenIsFavorite(st.s);
  heart.classList.toggle("on",fav);heart.setAttribute("aria-pressed",String(fav));
  heart.setAttribute("aria-label",fav?`إزالة سورة ${listenSurahName(st.s)} من المفضلة`:`إضافة سورة ${listenSurahName(st.s)} إلى المفضلة`);
  const more=card.querySelector(".zl-more");
  more.classList.toggle("on",!!(sleepDeadline||sleepAfterSurah)||play.speed!==1);
  card.querySelector(".zl-qari-mono").textContent=listenMonogram(st.r);
  card.querySelector(".zl-qari-name").textContent=listenReciterName(st.r);
  const dl=card.querySelector(".zl-dl");
  if(dl.dataset.audioDownload!==String(st.s)){dl.dataset.audioDownload=String(st.s);bindListenDownload(dl,st.s)}
  else refreshAudioDownloadButton(dl,st.s).then(()=>listenLabelDownload(dl)).catch(()=>{});
  listenPanel.querySelector(".zl-mini-name").textContent=`سورة ${listenSurahName(st.s)}`;
  listenPanel.querySelector(".zl-mini-ayah").textContent=listenAyahLine(st);
  listenPanel.querySelector(".zl-mini-wave").classList.toggle("on",playing);
  const miniPlay=listenPanel.querySelector(".zl-mini-play");
  miniPlay.innerHTML=playing?LISTEN_ICONS.pause:LISTEN_ICONS.play;miniPlay.setAttribute("aria-label",playing?"إيقاف مؤقت":"تشغيل");
  listenPanel.querySelectorAll(".zl-row[data-surah]").forEach(row=>{
    const on=st.kind==="now"&&Number(row.dataset.surah)===Number(st.s);
    row.classList.toggle("now",on);row.classList.toggle("playing",on&&playing);
  });
  listenTick();listenRemember();
}
function listenReciterName(r){return String(r?.name||"").replace(/^فضيلة\s+/,"").replace(/\s+—\s+السور كاملة$/,"")}
function listenMonogram(r){
  const name=String(r?.name||"").replace(/^فضيلة\s+الشيخ\s+/,"").trim();
  return name.charAt(0)||"ق";
}
/* زر التنزيل في البطاقة نصّه ظاهر، فيتبع حالة زر الفهرس نفسه. */
function listenLabelDownload(btn){
  const label=btn.parentElement?.querySelector(".zl-dl-label");if(!label)return;
  label.textContent=btn.classList.contains("downloaded")?"منزّلة":btn.classList.contains("downloading")?"جارٍ التنزيل":"تنزيل";
}
function bindListenDownload(btn,s){
  bindSurahDownloadButton(btn,s);
  const sync=()=>listenLabelDownload(btn);
  new MutationObserver(sync).observe(btn,{attributes:true,attributeFilter:["class"]});
  sync();
}

/* ---------- أفعال التشغيل: كلها عبر المحرّك ---------- */
function listenQuietReciter(r,{persist=true}={}){
  if(!r||r.id===reciter.id)return;
  reciter=r;if(persist)storageJsonSet(STORAGE_KEYS.qari,reciter);
  activeSegment=null;activeTimingRows=null;releaseAudioPreload();
  delete audio.dataset.source;delete audio.dataset.playMode;
}
async function listenPlaySurah(s,a=1){
  s=Math.max(1,Math.min(114,Number(s)||1));
  listenPending=null;listenSeekAfterLoad=null;
  if(listenTarget)listenQuietReciter(listenTarget.reciter,{persist:false});
  if(!navigator.onLine&&!await ensureOfflinePlaybackReciter(s,{chooseWhenMultiple:!listenTarget,confirmDifferent:!!listenTarget}))return;
  listenTarget=null;
  setIndexPlaybackBoundary(null);
  continuousMode=true;storageSet(STORAGE_KEYS.continuous,"1");
  const from=isSurahOnly()?1:Math.max(1,Math.min(maxAyah(s),Number(a)||1));
  play={surah:s,from,to:from,current:from,repeatAyah:1,repeatAyahLeft:1,repeatGroup:1,repeatGroupLeft:1,repeatSurah:1,repeatSurahLeft:1,speed:play.speed||1};
  pendingSurahBasmala=from===1&&s!==1&&s!==9;basmalaFallbackTarget=null;
  await playCurrent(false);
}
async function listenMain(){
  const st=listenCardState();
  if(st.kind==="now"){document.getElementById("panelPlay").click();return}
  if(st.kind==="resume")listenQuietReciter(st.r);
  const pend=listenPending&&listenPending.s===st.s?listenPending.f:null;
  if(pend!==null){
    if(isSurahOnly(st.r)){await listenPlaySurah(st.s,1);if(pend>0)listenSeekAfterLoad=pend;listenApplyPendingSeek();return}
    await listenPlaySurah(st.s,Math.min(maxAyah(st.s),Math.floor(pend*maxAyah(st.s))+1));return;
  }
  await listenPlaySurah(st.s,st.kind==="resume"?st.a:1);
}
function listenApplyPendingSeek(){
  const f=listenSeekAfterLoad,d=Number(audio.duration);
  if(f===null||audio.dataset.playMode!=="surah"||!(Number.isFinite(d)&&d>0))return;
  listenSeekAfterLoad=null;
  try{audio.currentTime=f*d}catch(_){ }
}
async function listenStep(dir){
  if(listenActive()){await stepPlayer(dir);return}
  const st=listenCardState();
  const s=Math.max(1,Math.min(114,st.s+dir));
  if(st.kind==="resume")listenQuietReciter(st.r);
  await listenPlaySurah(s,1);
}
/* سحب القوس: يُعرض موضع الإصبع أثناء السحب، ويُطبَّق عند الإفلات. */
function listenArcFraction(e,svg){
  const box=svg.getBoundingClientRect(),vb=svg.viewBox.baseVal;
  const x=vb.x+(e.clientX-box.left)*vb.width/box.width,y=vb.y+(e.clientY-box.top)*vb.height/box.height;
  if(y>110)return x>=110?0:1;
  const a=Math.atan2(110-y,x-110);
  return Math.max(0,Math.min(1,a/Math.PI));
}
async function listenSeekTo(f){
  if(!listenActive())return;
  const mode=audio.dataset.playMode,d=Number(audio.duration);
  if(mode==="surah"&&Number.isFinite(d)&&d>0){try{audio.currentTime=f*d}catch(_){ }return}
  if(mode==="gapless"&&Number.isFinite(d)&&d>0&&Array.isArray(activeTimingRows)){
    const target=f*d,row=timingRowAt(target);
    if(row){
      activeSegment={start:Number(row.start_time)/1000,end:Number(row.end_time)/1000};
      const a=Number(row.ayah);
      if(a&&a!==play.current){play.current=a;play.repeatAyahLeft=play.repeatAyah;continuousStopRef=null;updatePlayer()}
    }
    try{audio.currentTime=target}catch(_){ }
    return;
  }
  const max=maxAyah(play.surah),a=Math.max(1,Math.min(max,Math.floor(f*max)+1));
  if(a!==play.current)await movePlayerTo({s:play.surah,a});
}
function listenBindArc(svg){
  const label=()=>listenPanel?.querySelector(".zl-ayah");
  svg.addEventListener("pointerdown",e=>{
    e.preventDefault();svg.setPointerCapture?.(e.pointerId);
    listenDrag={f:listenArcFraction(e,svg)};listenPaintArc(listenDrag.f);svg.classList.add("dragging");
  });
  svg.addEventListener("pointermove",e=>{
    if(!listenDrag)return;
    listenDrag.f=listenArcFraction(e,svg);listenPaintArc(listenDrag.f);
    const el=label();
    if(el&&!listenActive()){el.textContent=listenIdleLabel(listenCardState(),listenDrag.f);return}
    if(el){
      if(isSurahOnly()||audio.dataset.playMode==="surah"){const d=Number(audio.duration);if(d>0)el.textContent=formatAudioTime(listenDrag.f*d)}
      else if(audio.dataset.playMode==="gapless"&&Number(audio.duration)>0){const row=timingRowAt(listenDrag.f*audio.duration);if(row)el.textContent=`الآية ${ar(row.ayah)} من ${ar(maxAyah(play.surah))}`}
      else{const max=maxAyah(play.surah);el.textContent=`الآية ${ar(Math.min(max,Math.floor(listenDrag.f*max)+1))} من ${ar(max)}`}
    }
  });
  const end=async()=>{
    if(!listenDrag)return;
    const f=listenDrag.f;listenDrag=null;svg.classList.remove("dragging");
    /* قبل التشغيل: يُحفظ الموضع، ويبدأ منه زر التشغيل. */
    if(!listenActive()){listenPending={s:listenCardState().s,f};listenPaint();return}
    await listenSeekTo(f);listenPaint();
  };
  svg.addEventListener("pointerup",end);svg.addEventListener("pointercancel",()=>{listenDrag=null;svg.classList.remove("dragging");listenPaint()});
}

/* ---------- النوافذ: القارئ، والمزيد ---------- */
function listenOpenReciters(){
  const offline=audioOfflinePackages(),count=id=>Object.keys(offline).filter(k=>k.startsWith(id+":")).length;
  const selected=listenCardState().r;
  const rows=RECITERS.map(r=>{
    const whole=isSurahOnly(r),n=count(r.id),on=r.id===selected.id;
    const meta=[whole?"السورة كاملة":"تتبع الآيات"];if(n)meta.push(n===1?"سورة منزّلة":`${ar(n)} سور منزّلة`);
    return `<button type="button" class="zl-qrow${on?" on":""}" data-qari="${escapeHtml(r.id)}" aria-pressed="${on}"><span class="zl-qmono">${escapeHtml(listenMonogram(r))}</span><span class="zl-qcopy"><b>${escapeHtml(listenReciterName(r))}</b><small><i class="zl-dot${whole?" whole":""}"></i>${meta.join("، ")}</small></span>${on?`<span class="zl-qcheck">${LISTEN_ICONS.check}</span>`:""}</button>`;
  }).join("");
  const b=sheet("اختر القارئ",`<div class="zl-legend"><span><i class="zl-dot"></i>تتبع الآيات في المصحف</span><span><i class="zl-dot whole"></i>السورة كاملة</span></div><div class="zl-qlist">${rows}</div>`);
  b.classList.add("player-backdrop","zl-sheet");
  b.querySelectorAll("[data-qari]").forEach(btn=>btn.onclick=async()=>{
    const r=RECITERS.find(x=>x.id===btn.dataset.qari);b.remove();
    if(!r||r.id===selected.id)return;
    if(listenActive()){
      const q=document.getElementById("panelQari");populateReciters();q.value=r.id;
      q.dispatchEvent(new Event("change"));
    }else if(listenTarget){
      listenTarget.reciter=r;
      storageJsonSet(STORAGE_KEYS.qari,r);
      setListenUrl();
    }else{
      /* لا تلاوة الآن: يُختار القارئ فقط، ويبقى موضع «تابع الاستماع» كما هو. */
      const last=listenLast();listenQuietReciter(r);
      if(last)storageJsonSet(LISTEN_LAST_KEY,{s:last.s,a:last.a,q:r.id,at:Date.now()});
      updatePlayer();
    }
    listenPaint();listenRedrawLists();
  });
}
function listenOpenMore(){
  const speedsRow=[.75,1,1.25,1.5,2].map(v=>`<button type="button" class="${play.speed===v?"on":""}" data-speed="${v}"><bdi dir="ltr">${ar(String(v)).replace(".","٫")}×</bdi></button>`).join("");
  const timer=sleepAfterSurah?"بعد نهاية السورة":sleepDeadline?`بعد ${formatAudioTime(Math.ceil((sleepDeadline-Date.now())/1000))}`:"غير مفعّل";
  const b=sheet("خيارات الاستماع",`<div class="zl-more-sheet">
    <div class="zl-more-block"><div class="zl-more-title">السرعة</div><div class="zl-speeds">${speedsRow}</div></div>
    <button type="button" class="zl-more-row" data-more="timer"><span class="zl-more-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="7"/><path d="M12 9v4l3 2M9 2h6M12 2v3"/></svg></span><span class="zl-more-copy"><b>مؤقت الإيقاف</b><small>${timer}</small></span>${LISTEN_ICONS.chevron}</button>
    <button type="button" class="zl-more-row" data-more="continue" role="switch" aria-checked="${continuousMode}"><span class="zl-more-ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h11M4 12h8M4 17h6"/><path d="m15 13 5 3.5-5 3.5Z"/></svg></span><span class="zl-more-copy"><b>متابعة التلاوة</b><small>إذا انتهت السورة تبدأ التي بعدها</small></span><span class="zl-switch" aria-hidden="true"></span></button>
    <button type="button" class="zl-more-row" data-more="share"><span class="zl-more-ico">${HUB_SHARE_ICON}</span><span class="zl-more-copy"><b>مشاركة مشغّل التلاوة</b></span>${LISTEN_ICONS.chevron}</button>
  </div>`);
  b.classList.add("player-backdrop","zl-sheet");
  b.querySelectorAll("[data-speed]").forEach(btn=>btn.onclick=()=>{
    play.speed=Number(btn.dataset.speed)||1;audio.playbackRate=play.speed;updatePlayer();
    b.querySelectorAll("[data-speed]").forEach(x=>x.classList.toggle("on",x===btn));
  });
  b.querySelector('[data-more="timer"]').onclick=()=>{b.remove();document.getElementById("sleepTimer").click()};
  b.querySelector('[data-more="share"]').onclick=()=>{
    b.remove();
    shareHubPayload({title:"مشغّل التلاوة | زاد الخير",url:new URL("/quran-listen/",location.origin).href});
  };
  b.querySelector('[data-more="continue"]').onclick=e=>{
    document.getElementById("continuousBtn").click();
    e.currentTarget.setAttribute("aria-checked",String(continuousMode));
  };
}
/* تنزيل سورة بصوت قارئ غير المختار: يصير هو القارئ، لأن من نزّلها يريد سماعها بصوته.
   لا تُقطع تلاوة سورة أخرى جارية؛ وإن كانت السورة نفسها تُتلى، يكمل بالصوت الجديد من الآية نفسها. */
function listenOnDownloaded(pkg){
  if(!listenIsOpen()||!pkg?.key)return;
  const[id,sRaw]=String(pkg.key).split(":"),s=Number(sRaw),r=RECITERS.find(x=>x.id===id);
  if(listenTarget)return;
  if(!r||r.id===reciter.id)return;
  if(listenActive()&&Number(play.surah)!==s){showToast(`نُزّلت سورة ${listenSurahName(s)} بصوت ${listenReciterName(r)}`);return}
  if(listenActive()){
    const q=document.getElementById("panelQari");populateReciters();q.value=r.id;q.dispatchEvent(new Event("change"));
  }else{
    listenQuietReciter(r);
    const last=listenLast();
    storageJsonSet(LISTEN_LAST_KEY,last&&last.s===s?{...last,q:r.id,at:Date.now()}:{s,a:1,q:r.id,at:Date.now()});
    updatePlayer();
  }
  listenPaint();
}
/* «اقرأ مع التلاوة»: إلى صفحة الآية الجارية في المصحف، والتلاوة مستمرة. */
async function listenReadAlong(){
  const st=listenCardState();
  closeListenPage({readAlong:true});
  if(!readerBooted)loading.classList.remove("hide");
  enterReaderSurface({consumeTarget:true});
  readerReturnToListen=true;
  if(st.kind==="now"){
    collapsePlayer();
    const k=`${play.surah}:${play.current}`;
    const p=isSurahOnly()?Number(chapterMap.get(Number(play.surah))?.pages?.[0]||1):await getVersePage(k);
    await go(p||currentPage);
    syncPlaybackSelectionInBackground(playbackRequestId);
  }else{
    const p=isSurahOnly(st.r)?Number(chapterMap.get(st.s)?.pages?.[0]||1):await getVersePage(`${st.s}:${st.a}`);
    await go(p||1);
  }
  armReaderBackGuard();
}
function listenShareSurah(s){
  if(!directQuranSurah(s)){
    shareHubPayload({title:`سورة ${listenSurahName(s)} | زاد الخير`,url:publicSurahUrl(s)});
    return;
  }
  const url=new URL(`/quran-listen/${s}/`,location.origin);
  url.searchParams.set("qari",listenCardState().r.id);
  shareHubPayload({title:`استماع إلى سورة ${listenSurahName(s)} | زاد الخير`,url:url.href});
}
function listenShare(){listenShareSurah(listenCardState().s)}

/* ---------- القوائم ---------- */
function listenSurahRow(ch){
  const s=Number(ch.id),row=document.createElement("div");
  row.className="zl-row";row.dataset.surah=String(s);row.dataset.find=compactArabic(`${ch.name_arabic} ${s}`);
  row.innerHTML=`<span class="zl-num">${ar(s)}</span><button type="button" class="zl-row-main" aria-label="تشغيل سورة ${escapeHtml(ch.name_arabic)}"><b>سورة ${escapeHtml(ch.name_arabic)}</b><small>${revelationArabic(ch.revelation_place)}، ${listenAyahCount(ch.verses_count)}</small></button><button type="button" class="zl-row-dl quran-index-action download"></button><button type="button" class="zl-row-share" aria-label="مشاركة سورة ${escapeHtml(ch.name_arabic)}">${HUB_SHARE_ICON}</button>`;
  row.querySelector(".zl-row-main").onclick=()=>listenPlaySurah(s,1);
  row.querySelector(".zl-row-share").onclick=()=>listenShareSurah(s);
  bindSurahDownloadButton(row.querySelector(".zl-row-dl"),s);
  return row;
}
function listenDrawSurahs(host){
  const frag=document.createDocumentFragment();
  [...chapterMap.values()].sort((a,b)=>a.id-b.id).forEach(ch=>frag.appendChild(listenSurahRow(ch)));
  host.replaceChildren(frag);
}
function listenDrawDownloaded(host){
  const bySurah=new Map();
  for(const key of Object.keys(audioOfflinePackages())){
    const[id,sRaw]=key.split(":"),s=Number(sRaw),r=RECITERS.find(x=>x.id===id);
    if(!r||!(s>=1&&s<=114))continue;
    if(!bySurah.has(s))bySurah.set(s,[]);bySurah.get(s).push(r);
  }
  if(!bySurah.size){host.innerHTML=`<div class="zl-empty"><b>لا توجد سور منزّلة بعد</b><span>اضغط زر التنزيل بجانب أي سورة لتسمعها دون اتصال.</span></div>`;return}
  const frag=document.createDocumentFragment();
  [...bySurah.keys()].sort((a,b)=>a-b).forEach(s=>{
    const ch=chapterMap.get(s);if(!ch)return;
    const row=listenSurahRow(ch),list=bySurah.get(s);
    row.querySelector(".zl-row-main small").textContent=list.map(r=>r.name.replace(/^فضيلة\s+الشيخ\s+/,"")).join("، ");
    /* سورة منزّلة تُسمع بصوت من نُزّلت بصوته إن لم يكن القارئ الحالي منهم. */
    const go=()=>{if(!list.some(r=>r.id===reciter.id))listenQuietReciter(list[0]);listenPlaySurah(s,1);listenPaint()};
    row.querySelector(".zl-row-main").onclick=go;
    frag.appendChild(row);
  });
  host.replaceChildren(frag);
}
function listenDrawFavorites(host){
  const list=listenFavorites();
  if(!list.length){host.innerHTML=`<div class="zl-empty"><b>لا توجد سور مفضلة بعد</b><span>اضغط القلب في المشغّل لتضيف السورة التي تُتلى إلى المفضلة.</span></div>`;return}
  const frag=document.createDocumentFragment();
  list.forEach(s=>{const ch=chapterMap.get(s);if(ch)frag.appendChild(listenSurahRow(ch))});
  host.replaceChildren(frag);
}
function listenRedrawLists(){
  if(!listenIsOpen())return;
  const host=listenPanel.querySelector(".zl-list");
  if(listenTab==="f")listenDrawFavorites(host);else if(listenTab==="d")listenDrawDownloaded(host);else listenDrawSurahs(host);
  listenFilter();listenPaint();
}
function listenFilter(){
  const input=listenPanel?.querySelector(".zl-search input");if(!input)return;
  const q=compactArabic(input.value||"").replace(/^سوره?/,"");
  listenPanel.querySelectorAll(".zl-list .zl-row[data-find]").forEach(row=>{row.hidden=!!q&&!row.dataset.find.includes(q)});
}
function listenSetTab(kind){
  listenTab=["s","f","d"].includes(kind)?kind:"s";
  listenPanel.querySelectorAll(".zl-seg button").forEach(b=>b.classList.toggle("on",b.dataset.tab===listenTab));
  listenPanel.querySelector(".zl-search").hidden=listenTab!=="s";
  listenRedrawLists();
}

/* ---------- الصفحة ---------- */
const LISTEN_APP_TABS=READER_APP_TABS.replace('style="--app-tab-i:1"','style="--app-tab-i:2"').replace(' aria-current="page" data-app-tab="quran"',' data-app-tab="quran"').replace('data-app-tab="listen"','aria-current="page" data-app-tab="listen"');
function openListenPage(){
  if(listenIsOpen()){listenPaint();return}
  setListenUrl(readerReturnToListen?listenReturnUrl:null);
  listenReturnUrl=null;
  readerReturnToListen=false;
  document.querySelector(".quran-index")?.remove();
  const picks=(listenFriday()?LISTEN_PICKS:LISTEN_PICKS.slice(1).concat(18)).map(s=>`<button type="button" class="zl-chip${listenFriday()&&s===18?" gold":""}" data-pick="${s}">${escapeHtml(listenSurahName(s))}${listenFriday()&&s===18?" · يوم الجمعة":""}</button>`).join("");
  const panel=document.createElement("section");panel.className="zad-listen";panel.setAttribute("aria-label","مشغّل التلاوة");
  panel.innerHTML=`<div class="zl-pattern" aria-hidden="true"></div><div class="zl-mini" aria-hidden="true"><button type="button" class="zl-mini-open"><span class="zl-wave zl-mini-wave" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="zl-mini-copy"><span class="zl-mini-name"></span><small class="zl-mini-ayah"></small></span></button><button type="button" class="zl-mini-play" tabindex="-1"></button><span class="zl-mini-bar" aria-hidden="true"><i></i></span></div>
  <div class="zl-scroll">
    <header class="zl-head"><h1>مشغّل التلاوة</h1><button type="button" class="zl-theme" aria-label="${document.documentElement.dataset.theme==="dark"?"تفعيل الوضع النهاري":"تفعيل الوضع الليلي"}"><svg class="zl-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.4A8.6 8.6 0 0 1 8.6 3.8a8.8 8.8 0 1 0 11.6 11.6Z"/></svg><svg class="zl-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg></button></header>
    <section class="zl-card" aria-label="مشغّل التلاوة"><div class="zl-card-pattern" aria-hidden="true"></div>
      <button type="button" class="zl-heart" aria-pressed="false">${LISTEN_ICONS.heart}</button>
      <div class="zl-eyebrow"></div>
      <div class="zl-arc">
        <svg viewBox="-8 -2 236 124" aria-label="موضع التلاوة، اسحب للتنقل" role="img">
          <path class="zl-arc-track" d="M 206 110 A 96 96 0 0 0 14 110"/>
          <path class="zl-arc-fill" d="M 206 110 A 96 96 0 0 0 14 110"/>
          <path class="zl-arc-hit" d="M 206 110 A 96 96 0 0 0 14 110"/>
          <g class="zl-arc-knob" transform="translate(206 110)"><circle r="13" class="halo"/><circle r="7" class="dot"/></g>
        </svg>
        <div class="zl-arc-label"><div class="zl-name"></div><div class="zl-ayah"></div><div class="zl-time" hidden></div></div>
      </div>
      <div class="zl-controls">
        <button type="button" class="zl-ctl zl-more" aria-label="خيارات الاستماع">${LISTEN_ICONS.more}</button>
        <button type="button" class="zl-ctl zl-prev">${LISTEN_ICONS.prev}</button>
        <button type="button" class="zl-main"></button>
        <button type="button" class="zl-ctl zl-next">${LISTEN_ICONS.next}</button>
        <button type="button" class="zl-ctl zl-repeat">${LISTEN_ICONS.repeat}</button>
      </div>
      <button type="button" class="zl-qari"><span class="zl-qari-mono"></span><span class="zl-qari-name"></span>${LISTEN_ICONS.chevron}</button>
      <div class="zl-actions">
        <button type="button" class="zl-act zl-read">${LISTEN_ICONS.read}<span>اقرأ مع التلاوة</span></button>
        <span class="zl-act zl-act-dl"><button type="button" class="zl-dl quran-index-action download"></button><span class="zl-dl-label">تنزيل</span></span>
        <button type="button" class="zl-act zl-share">${HUB_SHARE_ICON}<span>مشاركة</span></button>
      </div>
    </section>
    <section class="zl-picks" aria-label="مختارات"><h2>مختارات</h2><div class="zl-chips">${picks}</div></section>
    <section class="zl-browse">
      <div class="zl-seg" role="tablist"><button type="button" data-tab="s" class="on">السور</button><button type="button" data-tab="f">المفضلة</button><button type="button" data-tab="d">المنزّلة</button></div>
      <label class="zl-search">${LISTEN_ICONS.search}<input type="search" placeholder="ابحث عن سورة" aria-label="ابحث عن سورة" enterkeyhint="search"></label>
      <div class="zl-list"></div>
    </section>
  </div>${LISTEN_APP_TABS}`;
  document.body.appendChild(panel);listenPanel=panel;
  document.body.classList.add("zl-open");
  const card=panel.querySelector(".zl-card"),scroll=panel.querySelector(".zl-scroll");
  card.querySelector(".zl-main").onclick=listenMain;
  card.querySelector(".zl-prev").onclick=()=>listenStep(-1);
  card.querySelector(".zl-next").onclick=()=>listenStep(1);
  card.querySelector(".zl-repeat").onclick=()=>{document.getElementById("repeatBtn").click();listenPaint()};
  card.querySelector(".zl-more").onclick=listenOpenMore;
  card.querySelector(".zl-qari").onclick=listenOpenReciters;
  card.querySelector(".zl-read").onclick=listenReadAlong;
  card.querySelector(".zl-share").onclick=listenShare;
  /* زر الوضع كالذي في الرئيسية: الإعداد نفسه للتطبيق كله. */
  panel.querySelector(".zl-theme").onclick=e=>{
    const dark=(document.documentElement.dataset.theme||"light")!=="dark";
    setTheme(dark?"dark":"light");
    e.currentTarget.setAttribute("aria-label",dark?"تفعيل الوضع النهاري":"تفعيل الوضع الليلي");
  };
  card.querySelector(".zl-heart").onclick=()=>listenToggleFavorite(listenCardState().s);
  listenBindArc(card.querySelector(".zl-arc svg"));
  panel.querySelector(".zl-mini-open").onclick=()=>scroll.scrollTo({top:0,behavior:"smooth"});
  panel.querySelector(".zl-mini-play").onclick=listenMain;
  panel.querySelectorAll("[data-pick]").forEach(b=>b.onclick=()=>listenPlaySurah(Number(b.dataset.pick),1));
  panel.querySelectorAll(".zl-seg button").forEach(b=>b.onclick=()=>listenSetTab(b.dataset.tab));
  panel.querySelector(".zl-search input").addEventListener("input",listenFilter);
  /* البطاقة إذا مُرِّرت خارج الشاشة يظهر شريط رفيع ثابت في الأعلى. */
  const mini=panel.querySelector(".zl-mini");
  listenObserver=new IntersectionObserver(([entry])=>{
    const show=!entry.isIntersecting;
    mini.classList.toggle("show",show);mini.setAttribute("aria-hidden",String(!show));
    mini.querySelector(".zl-mini-play").tabIndex=show?0:-1;
  },{root:scroll,threshold:0,rootMargin:"-40px 0px 0px 0px"});
  listenObserver.observe(card.querySelector(".zl-controls"));
  bindListenTabs(panel);
  listenSetTab(listenTab);
}
function closeListenPage({readAlong=false}={}){
  listenObserver?.disconnect();listenObserver=null;
  listenPanel?.remove();listenPanel=null;
  document.body.classList.remove("zl-open");
  if(readAlong){
    listenReturnUrl=location.href;
    history.replaceState(history.state,"","/quran-read/");
  }else{
    listenTarget=null;
    history.replaceState(history.state,"","/quran-read/?from=zad");
  }
}
function setListenUrl(returnUrl=null){
  const current=new URL(location.href);
  const url=new URL(returnUrl||(directQuranPath()?.mode==="listen"?current.href:"/quran-listen/"),current.origin);
  if(current.searchParams.get("from")==="zad")url.searchParams.set("from","zad");
  if(listenTarget)url.searchParams.set("qari",listenTarget.reciter.id);
  if(url.href!==current.href)history.replaceState(history.state,"",url.href);
}
function bindListenTabs(panel){
  const tabs=panel.querySelector(".reader-app-tabs");if(!tabs)return;
  tabs.querySelector('[data-app-tab="listen"]')?.addEventListener("click",e=>{e.preventDefault();panel.querySelector(".zl-scroll").scrollTo({top:0,behavior:"smooth"})});
  /* «القرآن» في الصفحة نفسها: يُفتح الفهرس دون إعادة تحميل، والتلاوة مستمرة. */
  tabs.querySelector('[data-app-tab="quran"]')?.addEventListener("click",e=>{
    e.preventDefault();
    closeListenPage();openQuranIndex("s",{home:true});
  });
  tabs.querySelectorAll('a[data-app-tab]:not([data-app-tab=quran]):not([data-app-tab=listen])').forEach(link=>link.addEventListener("click",e=>{
    if(e.metaKey||e.ctrlKey||e.shiftKey||e.button)return;
    e.preventDefault();
    const links=[...tabs.querySelectorAll("a[data-app-tab]")];
    links.forEach(a=>a===link?a.setAttribute("aria-current","page"):a.removeAttribute("aria-current"));
    tabs.style.setProperty("--app-tab-i",String(links.indexOf(link)));
    const still=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setTimeout(()=>{location.href=link.getAttribute("href")},still?0:280);
  }));
}
/* وكذلك في القارئ: الرجوع إليه من الرئيسية يعيد المؤشر إلى القسم الظاهر. */
window.addEventListener("pageshow",event=>{
  if(!event.persisted)return;
  document.querySelectorAll(".reader-app-tabs").forEach(tabs=>{
    const current=tabs.closest(".zad-listen")?"listen":"quran";
    const links=[...tabs.querySelectorAll("a[data-app-tab]")];
    links.forEach((a,i)=>{if(a.dataset.appTab===current){a.setAttribute("aria-current","page");tabs.style.setProperty("--app-tab-i",String(i))}else a.removeAttribute("aria-current")});
  });
});
audio.addEventListener("timeupdate",()=>{if(listenIsOpen())listenTick()});
audio.addEventListener("loadedmetadata",()=>{listenApplyPendingSeek();if(listenIsOpen())listenTick()});
audio.addEventListener("durationchange",listenApplyPendingSeek);
