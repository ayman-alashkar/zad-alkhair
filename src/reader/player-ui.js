function mediaReady(){
  if(audio.readyState>=1)return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>bad(),15000);
    const ok=()=>{cleanup();resolve()},bad=()=>{cleanup();reject(new Error("audio metadata"))};
    const cleanup=()=>{clearTimeout(timer);audio.removeEventListener("loadedmetadata",ok);audio.removeEventListener("error",bad)};
    audio.addEventListener("loadedmetadata",ok,{once:true});audio.addEventListener("error",bad,{once:true});
  });
}

let progressSeeking=false;
function formatAudioTime(seconds){
  const total=Math.max(0,Math.floor(Number(seconds)||0));
  const h=Math.floor(total/3600),m=Math.floor((total%3600)/60),sec=total%60;
  const raw=h?`${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`:`${m}:${String(sec).padStart(2,"0")}`;
  return ar(raw);
}
function timedSurahProgressMode(){
  return continuousMode&&audio.dataset.playMode==="gapless"&&Array.isArray(activeTimingRows)&&activeTimingRows.length>0&&Number.isFinite(audio.duration)&&audio.duration>0;
}
function audioProgressScope(){
  if(timedSurahProgressMode())return {start:0,end:audio.duration,current:audio.currentTime||0,surah:true};
  if(activeSegment)return {start:activeSegment.start,end:activeSegment.end,current:audio.currentTime||activeSegment.start,surah:false};
  if(Number.isFinite(audio.duration)&&audio.duration>0)return {start:0,end:audio.duration,current:audio.currentTime||0,surah:false};
  return {start:0,end:0,current:0,surah:false};
}
function paintAudioProgress(value=null){
  const scope=audioProgressScope(),span=Math.max(0,scope.end-scope.start);
  const p=value===null?(span?Math.max(0,Math.min(1,(scope.current-scope.start)/span)):0):Math.max(0,Math.min(1,Number(value)||0));
  const fill=document.getElementById("progressFill"),seek=document.getElementById("progressSeek");
  if(fill)fill.style.width=(p*100)+"%";
  if(seek&&!progressSeeking)seek.value=String(Math.round(p*1000));
  const current=document.getElementById("audioTimeCurrent"),total=document.getElementById("audioTimeTotal");
  if(current)current.textContent=formatAudioTime(span*p);
  if(total)total.textContent=formatAudioTime(span);
}
function resetAudioProgress(){
  progressSeeking=false;
  const seek=document.getElementById("progressSeek");if(seek)seek.value="0";
  const fill=document.getElementById("progressFill");if(fill)fill.style.width="0%";
  const current=document.getElementById("audioTimeCurrent"),total=document.getElementById("audioTimeTotal");
  if(current)current.textContent="٠:٠٠";if(total)total.textContent="٠:٠٠";
}
function completeAudioProgress(){
  progressSeeking=false;
  const scope=audioProgressScope(),span=Math.max(0,scope.end-scope.start);
  const seek=document.getElementById("progressSeek");if(seek)seek.value="1000";
  const fill=document.getElementById("progressFill");if(fill)fill.style.width="100%";
  const current=document.getElementById("audioTimeCurrent"),total=document.getElementById("audioTimeTotal");
  if(current)current.textContent=formatAudioTime(span);if(total)total.textContent=formatAudioTime(span);
}
function timingRowAt(seconds){
  if(!Array.isArray(activeTimingRows)||!activeTimingRows.length)return null;
  const t=Number(seconds)||0;
  let chosen=activeTimingRows[0];
  for(const row of activeTimingRows){
    const start=Number(row.start_time)/1000,end=Number(row.end_time)/1000;
    if(t>=start)chosen=row;
    if(t>=start&&t<end)return row;
    if(t<start)break;
  }
  return chosen;
}
function seekAudioProgress(value){
  const scope=audioProgressScope(),span=Math.max(0,scope.end-scope.start);
  if(!(span>0))return;
  const p=Math.max(0,Math.min(1,Number(value)/1000)),target=scope.start+span*p;
  if(scope.surah){
    const row=timingRowAt(target);
    if(row){
      const a=Number(row.ayah);
      activeSegment={start:Number(row.start_time)/1000,end:Number(row.end_time)/1000};
      if(a&&a!==play.current){
        play.current=a;play.repeatAyahLeft=play.repeatAyah;
        updatePlayer();
        const requestId=++playbackRequestId;
        syncPlaybackSelectionInBackground(requestId);
      }
    }
  }
  try{audio.currentTime=target}catch(_){return}
  paintAudioProgress(p);
}

function populateReciters(){
  const q=document.getElementById("panelQari");
  q.innerHTML=RECITERS.map(r=>`<option value="${escapeHtml(r.id)}" ${r.id===reciter.id?"selected":""}>${escapeHtml(r.name)}</option>`).join("");
}
function updateReciterMarquee(){
  const label=document.getElementById("qariName"),wrap=label.parentElement;
  if(label.textContent!==reciter.name){label.textContent=reciter.name;wrap.classList.remove("moving")}
  document.getElementById("panelQari").title=reciter.name;
  requestAnimationFrame(()=>{
    const distance=Math.max(0,label.scrollWidth-wrap.clientWidth);
    label.style.setProperty("--qari-distance",distance+"px");
    label.style.setProperty("--qari-duration",Math.max(12,distance/22+6)+"s");
    wrap.classList.toggle("moving",distance>2);
  });
}
window.addEventListener("resize",updateReciterMarquee);
function showPlayer(expand=true){
  document.body.classList.add("player-on");
  document.body.classList.toggle("player-expanded",!!expand);
  populateReciters();updateReciterMarquee();
}
function collapsePlayer(){document.body.classList.remove("player-expanded")}
function expandPlayer(){if(document.body.classList.contains("player-on"))document.body.classList.add("player-expanded")}
function stopPlayer(){
  playbackWanted=false;
  clearTimeout(audioRetryTimer);audioRetryTimer=null;
  playbackRequestId++;
  audio.pause();audioPreload.pause();
  activeSegment=null;activeTimingRows=null;segmentAdvancing=false;primedEveryAyahSrc="";
  pendingSurahBasmala=false;basmalaFallbackTarget=null;
  delete audio.dataset.source;delete audio.dataset.playMode;audio.removeAttribute("src");audio.load();
  audioPreload.removeAttribute("src");audioPreload.load();
  document.body.classList.remove("player-on","player-expanded","audio-playing");
  if("mediaSession" in navigator){try{navigator.mediaSession.playbackState="none";navigator.mediaSession.metadata=null}catch(_){ }}
  resetAudioProgress();
  clearSleepTimer();
}
let mediaPositionStamp=0;
function updateMediaSessionMetadata(){
  if(!("mediaSession" in navigator)||typeof MediaMetadata!=="function")return;
  const v=verseParts(`${play.surah}:${play.current}`);
  try{
    navigator.mediaSession.metadata=new MediaMetadata({
      title:isSurahOnly()?`سورة ${v.sname} · استماع للسورة كاملة`:`سورة ${v.sname} · الآية ${ar(play.current)}`,
      artist:reciter.name,
      album:"القرآن العظيم · زاد الخير",
      artwork:[
        {src:new URL("icons/icon-192.png",location.href).href,sizes:"192x192",type:"image/png"},
        {src:new URL("icons/icon-512.png",location.href).href,sizes:"512x512",type:"image/png"}
      ]
    });
  }catch(_){ }
}
function updateMediaSessionPosition(force=false){
  if(!("mediaSession" in navigator)||typeof navigator.mediaSession.setPositionState!=="function")return;
  const now=Date.now();if(!force&&now-mediaPositionStamp<900)return;mediaPositionStamp=now;
  try{
    const duration=Number(audio.duration),position=Math.max(0,Math.min(Number(audio.currentTime)||0,duration||0));
    if(Number.isFinite(duration)&&duration>0)navigator.mediaSession.setPositionState({duration,playbackRate:Math.max(.1,Number(audio.playbackRate)||1),position});
  }catch(_){ }
}
function updateMediaSessionState(){
  if(!("mediaSession" in navigator))return;
  try{navigator.mediaSession.playbackState=audio.paused?"paused":"playing"}catch(_){ }
  updateMediaSessionPosition(true);
}
function installMediaSession(){
  if(!("mediaSession" in navigator))return;
  const set=(name,fn)=>{try{navigator.mediaSession.setActionHandler(name,fn)}catch(_){ }};
  set("play",async()=>{try{playbackWanted=true;audioRetryCount=0;if(queueActive&&audio.ended&&atSurahEnd()&&!nextSurahRef()){await playQueueEntry(0);return}if(audio.src&&!audio.ended)await audio.play();else await playCurrent(false)}catch(_){ }});
  set("pause",()=>{playbackWanted=false;playbackRequestId++;clearTimeout(audioRetryTimer);audioRetryTimer=null;audio.pause()});
  set("previoustrack",()=>stepPlayer(-1));
  set("nexttrack",()=>stepPlayer(1));
  set("seekbackward",details=>{const step=Number(details?.seekOffset)||10;try{audio.currentTime=Math.max(0,(audio.currentTime||0)-step)}catch(_){ }});
  set("seekforward",details=>{const step=Number(details?.seekOffset)||10;try{audio.currentTime=Math.min(Number.isFinite(audio.duration)?audio.duration:Infinity,(audio.currentTime||0)+step)}catch(_){ }});
  set("seekto",details=>{if(Number.isFinite(details?.seekTime)){try{audio.currentTime=details.seekTime}catch(_){ }}});
  set("stop",()=>stopPlayer());
}
function syncReciterCapabilities(){
  document.getElementById("listenBtn").innerHTML=isSurahOnly()?"<span>▶</span> استماع للسورة":"<span>▶</span> استماع";
  document.getElementById("audioJump").setAttribute("aria-label",isSurahOnly()?"اختيار السورة":"اختيار السورة والآية");
  document.getElementById("audioJump").title=isSurahOnly()?"الانتقال إلى سورة كاملة":"الانتقال إلى سورة وآية";
  document.getElementById("audioPrev").setAttribute("aria-label",queueActive?"السورة السابقة في القائمة":isSurahOnly()?"السورة السابقة":"الآية السابقة");
  document.getElementById("audioNext").setAttribute("aria-label",queueActive?"السورة التالية في القائمة":isSurahOnly()?"السورة التالية":"الآية التالية");
}
function updatePlayer(){
  const v=verseParts(`${play.surah}:${play.current}`);
  document.getElementById("audioNow").innerHTML=`<span class="audio-surah-title">سورة ${escapeHtml(v.sname)}</span><span class="audio-ayah-label">${isSurahOnly()?"استماع للسورة كاملة":"الآية "+ar(play.current)}</span>`;
  document.getElementById("speedBtn").textContent=(play.speed===1?"1.0":String(play.speed))+"×";
  const rb=document.getElementById("repeatBtn"),labels={off:"التكرار متوقف",one:"تكرار السورة باستمرار",all:queueActive?"تكرار قائمة التشغيل":"تكرار المصحف"};
  rb.classList.toggle("active",repeatMode!=="off");
  rb.setAttribute("aria-label",labels[repeatMode]);rb.title=labels[repeatMode];
  rb.dataset.repeat=repeatMode;
  rb.setAttribute("aria-pressed",String(repeatMode!=="off"));
  let badge=rb.querySelector("small");if(!badge){badge=document.createElement("small");rb.appendChild(badge)}
  badge.textContent=repeatMode==="one"?"١":repeatMode==="all"?"∞":"";
  document.getElementById("queueCount").textContent=playbackQueue.length?ar(playbackQueue.length):"";
  syncQueueControls();
  updateReciterMarquee();
  syncReciterCapabilities();
  const c=document.getElementById("continuousBtn");if(c){c.classList.toggle("active",continuousMode);c.textContent=continuousMode?"مستمر":"متابعة";c.setAttribute("aria-label",isSurahOnly()?"متابعة التلاوة بين السور":"استمرار التلاوة بعد الآية المحددة")}
  updateMediaSessionMetadata();
  if(!progressSeeking)paintAudioProgress();
}
function syncPlay(){
  const paused=audio.paused;
  document.getElementById("panelPlay").textContent=paused?"▶":"Ⅱ";
  document.body.classList.toggle("audio-playing",!paused);
  updateMediaSessionState();
}

/* Keep the visible ayah selection locked to the ayah currently being recited. */
async function syncPlaybackSelection(requestId){
  const whole=isSurahOnly();
  if(whole&&requestId===playbackRequestId)clearVerseSelection();
  const k=`${play.surah}:${play.current}`;
  const p=whole?Number(chapterMap.get(Number(play.surah))?.pages?.[0]||0):await getVersePage(k);
  if(requestId!==playbackRequestId)return false;
  if(p){
    await ensurePage(p);
    if(requestId!==playbackRequestId)return false;
    if(p!==currentPage){
      currentPage=p;updatePage(true);
      prefetchAround(p).then(()=>trimPageDom(p));
    }
  }
  if(whole)return true;
  let matches=[...document.querySelectorAll(`.page[data-page="${p||currentPage}"] .verse-segment[data-key="${k}"]`)];
  if(!matches.length)matches=[...document.querySelectorAll(`.verse-segment[data-key="${k}"]`)];
  if(!matches.length)return false;
  document.querySelectorAll(".verse-segment.selected").forEach(x=>x.classList.remove("selected"));
  matches.forEach(x=>x.classList.add("selected"));
  selectedKey=k;selectedAnchor=matches[0];
  return true;
}
