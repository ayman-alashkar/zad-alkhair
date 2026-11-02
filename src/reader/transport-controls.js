/* Transport policy: queue entries are complete surahs using the selected reciter. */
function nextSurahRef(){
  if(repeatMode==="one")return {s:play.surah,a:1};
  if(queueActive){
    const next=queueIndex+1;
    if(next<playbackQueue.length)return {s:playbackQueue[next].s,a:1};
    return repeatMode==="all"&&playbackQueue.length?{s:playbackQueue[0].s,a:1}:null;
  }
  return play.surah<114?{s:play.surah+1,a:1}:repeatMode==="all"?{s:1,a:1}:null;
}
function atSurahEnd(){return isSurahOnly()?audio.ended:Number(play.current)>=Number(maxAyah(play.surah))}
function detachQueue(){queueActive=false;queueIndex=-1;if(repeatMode==="all")repeatMode="off"}
function stopAtTimerBoundary(){
  if(sleepAfterSurah&&atSurahEnd()){clearSleepTimer();playbackRequestId++;playbackWanted=false;audio.pause();syncPlay();completeAudioProgress();showToast("توقف الاستماع بعد نهاية السورة");return true}
  return checkSleepTimer();
}
async function finishWholeSurah(){
  if(checkSleepTimer())return;
  if(sleepAfterSurah){
    clearSleepTimer();playbackRequestId++;playbackWanted=false;audio.pause();syncPlay();completeAudioProgress();
    showToast("توقف الاستماع بعد نهاية السورة");return;
  }
  const next=continuousMode?nextSurahRef():null;
  if(next){
    if(queueActive&&repeatMode!=="one")queueIndex=(queueIndex+1)%playbackQueue.length;
    play.surah=next.s;await playCurrent(false);return;
  }
  playbackWanted=false;audio.pause();syncPlay();completeAudioProgress();
}
async function finishCurrentAyah(){
  if(stopAtTimerBoundary())return;
  if(continuousMode&&atSurahEnd()&&repeatMode==="one"){
    play.current=play.from=play.to=1;pendingSurahBasmala=play.surah!==1&&play.surah!==9;
    await playCurrent(false);return;
  }
  if(play.repeatAyahLeft>1){play.repeatAyahLeft--;await playCurrent(false);return}
  play.repeatAyahLeft=play.repeatAyah;
  if(play.current<play.to){play.current++;await playCurrent(false);return}
  if(play.repeatGroupLeft>1){play.repeatGroupLeft--;play.current=play.from;await playCurrent(false);return}
  if(continuousMode){
    if(play.current>=maxAyah(play.surah)&&(play.repeatSurah||1)>1&&(play.repeatSurahLeft||1)>1){
      play.repeatSurahLeft--;play.from=1;play.to=1;play.current=1;play.repeatAyahLeft=1;play.repeatGroupLeft=1;
      pendingSurahBasmala=(play.surah!==1&&play.surah!==9);await playCurrent(false);return;
    }
    if(continuousStopRef&&play.surah===continuousStopRef.s&&play.current===continuousStopRef.a){
      continuousStopRef=null;playbackWanted=false;audio.pause();syncPlay();completeAudioProgress();return;
    }
    const previousSurah=play.surah,n=atSurahEnd()?nextSurahRef():nextAyahRef(play.surah,play.current);
    if(atSurahEnd()&&n&&queueActive&&repeatMode!=="one")queueIndex=(queueIndex+1)%playbackQueue.length;
    if(n){
      if(n.s!==previousSurah)play.repeatSurahLeft=play.repeatSurah||1;
      const changedSurah=n.s!==play.surah;play.surah=n.s;play.current=n.a;
      if(changedSurah){
        play.from=n.a;play.to=n.a;
        pendingSurahBasmala=(n.a===1&&n.s!==1&&n.s!==9);
      }else{
        pendingSurahBasmala=false;
      }
      play.repeatAyahLeft=play.repeatAyah;play.repeatGroupLeft=1;
      await playCurrent(false);return;
    }
  }
  playbackWanted=false;audio.pause();syncPlay();completeAudioProgress();
}
function reconcileTimedPosition(ended=false){
  if(audio.dataset.playMode!=="gapless"||!activeTimingRows||!continuousMode||play.repeatAyah>1||play.repeatGroup>1)return;
  let row=ended?activeTimingRows[activeTimingRows.length-1]:timingRowAt(audio.currentTime);
  if(continuousStopRef&&continuousStopRef.s===play.surah&&Number(row?.ayah)>continuousStopRef.a)row=activeTimingRows.find(x=>Number(x.ayah)===continuousStopRef.a);
  if(!row||Number(row.ayah)===play.current)return;
  play.current=Number(row.ayah);
  activeSegment={start:Number(row.start_time)/1000,end:Number(row.end_time)/1000};
  updatePlayer();syncPlaybackSelectionInBackground(++playbackRequestId);
}
audio.ontimeupdate=()=>{
  if(checkSleepTimer())return;
  reconcileTimedPosition();
  if(!progressSeeking)paintAudioProgress();
  updateMediaSessionPosition();
  if(activeSegment){
    // On the very last ayah of the Quran, do not cut the recording at the
    // timestamp boundary. If the reciter continues with a closing phrase,
    // let the source file finish naturally and handle completion in onended.
    if(isFinalQuranAyah())return;
    /* At a surah boundary, never pause the media element before loading the next
       surah. On locked/background Android that pause can terminate the active
       media session before JavaScript gets a chance to start the following file.
       Let the source file end naturally; onended performs the transition. */
    if(continuousMode&&Number(play.current)>=Number(maxAyah(play.surah)))return;

    if(!segmentAdvancing&&!audio.paused&&audio.currentTime>=activeSegment.end){
      segmentAdvancing=true;

      // Same source file keeps playing. Only the active ayah changes.
      if(advanceTimedSegmentWithoutPause()){
        segmentAdvancing=false;
      }else{
        audio.pause();
        Promise.resolve(finishCurrentAyah()).finally(()=>{segmentAdvancing=false});
      }
    }
  }
};
const progressSeek=document.getElementById("progressSeek");
progressSeek.addEventListener("pointerdown",()=>{progressSeeking=true});
progressSeek.addEventListener("input",e=>{
  progressSeeking=true;
  paintAudioProgress(Number(e.target.value)/1000);
});
progressSeek.addEventListener("change",e=>{
  seekAudioProgress(e.target.value);
  progressSeeking=false;
  paintAudioProgress();
});
progressSeek.addEventListener("pointercancel",()=>{progressSeeking=false;paintAudioProgress()});
audio.addEventListener("loadedmetadata",()=>paintAudioProgress());
audio.addEventListener("durationchange",()=>{paintAudioProgress();updateMediaSessionPosition(true)});
audio.onplay=()=>{if(!checkSleepTimer())syncPlay()};audio.onpause=syncPlay;
audio.addEventListener("error",()=>{
  if(audio.error?.code===2&&document.body.classList.contains("player-on"))handleAudioFailure(new Error("audio network"),playbackRequestId);
});
installMediaSession();
audio.onended=async()=>{
  if(audio.dataset.playMode==="basmala"){
    const target=basmalaFallbackTarget;
    clearSurahBasmalaPrelude();
    if(target&&target.s===play.surah&&target.a===play.current){
      delete audio.dataset.source;delete audio.dataset.playMode;
      await playCurrent(false);
    }
    return;
  }
  // A media file can reach its physical end a few milliseconds before the
  // final timestamp callback. Treat the file ending as a valid completion
  // for BOTH timed-surah and ayah-by-ayah modes.
  if(segmentAdvancing)return;
  if(audio.dataset.playMode==="surah"){
    segmentAdvancing=true;try{await finishWholeSurah()}finally{segmentAdvancing=false}return;
  }
  reconcileTimedPosition(true);
  segmentAdvancing=true;
  try{await finishCurrentAyah()}
  finally{segmentAdvancing=false}
};

function opts(max,sel){let s="";for(let i=1;i<=max;i++)s+=`<option value="${i}" ${i===sel?"selected":""}>${ar(i)}</option>`;return s}
const BASMALA_AUDIO_LABEL="بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";
function audioAyahOptions(surah,selected=1){
  const s=Math.max(1,Math.min(114,Number(surah)||1)),max=maxAyah(s);let out="";
  if(s===1){
    for(let i=1;i<=max;i++)out+=`<option value="${i}" ${Number(selected)===i?"selected":""}>${ar(i)}</option>`;
    return out;
  }
  if(s!==9)out+=`<option value="basmala" ${selected==="basmala"?"selected":""}>${BASMALA_AUDIO_LABEL}</option>`;
  for(let i=1;i<=max;i++)out+=`<option value="${i}" ${Number(selected)===i?"selected":""}>${ar(i)}</option>`;
  return out;
}
function audioStartSelection(surah,value){
  const s=Math.max(1,Math.min(114,Number(surah)||1));
  if(value==="basmala"&&s!==1&&s!==9)return {ayah:1,basmala:true};
  return {ayah:Math.max(1,Number(value)||1),basmala:false};
}

function playerSurahOptions(selected){
  return [...chapterMap.values()]
    .sort((a,b)=>Number(a.id)-Number(b.id))
    .map(c=>`<option value="${Number(c.id)}" ${Number(c.id)===Number(selected)?"selected":""}>${ar(Number(c.id))} · ${escapeHtml(c.name_arabic||"")}</option>`)
    .join("");
}
document.getElementById("audioJump").onclick=()=>{
  const initialS=Number(play.surah)||1,initialA=Number(play.current)||1;
  const b=sheet("الانتقال إلى",`<div class="settings">
    <div class="field"><label>السورة</label><select id="jumpSurah">${playerSurahOptions(initialS)}</select></div>
    <div class="field" ${isSurahOnly()?"hidden":""}><label>الآية</label><select id="jumpAyah" ${isSurahOnly()?"disabled":""}>${audioAyahOptions(initialS,initialA)}</select></div>
    ${isSurahOnly()?`<p class="player-hint">${SURAH_ONLY_HINT}</p>`:""}
    <button type="button" class="apply" id="applyAudioJump">تشغيل</button>
  </div>`);
  b.classList.add("player-backdrop");
  const ss=b.querySelector("#jumpSurah"),aa=b.querySelector("#jumpAyah");
  ss.onchange=()=>{
    const s=Number(ss.value)||1;
    aa.innerHTML=audioAyahOptions(s,(s===1||s===9)?1:"basmala");
  };
  b.querySelector("#applyAudioJump").onclick=async()=>{
    const s=Number(ss.value)||1,start=isSurahOnly()?{ayah:1,basmala:false}:audioStartSelection(s,aa.value),a=start.ayah;
    detachQueue();pendingSurahBasmala=start.basmala;basmalaFallbackTarget=null;
    play.surah=s;play.from=a;play.to=a;play.current=a;
    continuousStopRef=null;play.repeatAyahLeft=play.repeatAyah;
    play.repeatGroup=1;play.repeatGroupLeft=1;play.repeatSurah=1;play.repeatSurahLeft=1;
    b.remove();
    await playCurrent(true);
  };
};

document.getElementById("audioSettings").onclick=()=>{
  const s=selectedKey?verseParts(selectedKey).s:play.surah,max=maxAyah(s);
  const b=sheet("إعدادات الاستماع",`<div class="settings">
    <div class="field"><label>القارئ</label><select id="qari">${RECITERS.map(r=>`<option value="${escapeHtml(r.id)}" ${r.id===reciter.id?"selected":""}>${escapeHtml(r.name)}</option>`).join("")}</select></div>
    <p class="player-hint" id="surahOnlySettingsHint" hidden>${SURAH_ONLY_HINT}</p>
    <div class="grid2 audio-verse-settings"><div class="field"><label>من الآية</label><select id="from">${audioAyahOptions(s,pendingSurahBasmala?"basmala":play.from)}</select></div><div class="field"><label>إلى الآية</label><select id="to">${opts(max,play.to)}</select></div></div>
    <div class="grid2 audio-verse-settings"><div class="field"><label>تكرار المجموعة</label><select id="grp"><option>1</option><option>2</option><option>3</option><option>5</option><option>10</option></select></div><div class="field"><label>تكرار كل آية</label><select id="each"><option>1</option><option>2</option><option>3</option><option>5</option><option>10</option></select></div></div>
    <div class="field"><label>السرعة</label><select id="speed"><option value=".75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></div>
    <button type="button" class="apply" id="applyAudio">تطبيق وتشغيل</button></div>`);
  b.classList.add("player-backdrop");
  function syncSettingsCapabilities(){
    const chosen=RECITERS.find(r=>r.id===b.querySelector("#qari").value)||defaultReciter(),whole=isSurahOnly(chosen);
    b.querySelector("#surahOnlySettingsHint").hidden=!whole;
    b.querySelectorAll(".audio-verse-settings").forEach(el=>{el.hidden=whole;el.querySelectorAll("select").forEach(input=>input.disabled=whole)});
  }
  b.querySelector("#qari").onchange=syncSettingsCapabilities;syncSettingsCapabilities();
  b.querySelector("#grp").value=String(play.repeatGroup);b.querySelector("#each").value=String(play.repeatAyah);b.querySelector("#speed").value=String(play.speed);
  b.querySelector("#applyAudio").onclick=async()=>{
    reciter=RECITERS.find(r=>r.id===b.querySelector("#qari").value)||defaultReciter();playbackRequestId++;audio.pause();activeSegment=null;activeTimingRows=null;releaseAudioPreload();basmalaFallbackTarget=null;delete audio.dataset.source;delete audio.dataset.playMode;audio.removeAttribute("src");audio.load();storageJsonSet(STORAGE_KEYS.qari,reciter);
    const start=isSurahOnly()?{ayah:1,basmala:false}:audioStartSelection(s,b.querySelector("#from").value),f=start.ayah,t=isSurahOnly()?1:+b.querySelector("#to").value;if(t<f){showToast("اختر نهاية بعد البداية");return}
    detachQueue();repeatMode="off";pendingSurahBasmala=start.basmala;continuousStopRef=null;
    play={surah:s,from:f,to:t,current:f,repeatAyah:+b.querySelector("#each").value,repeatAyahLeft:+b.querySelector("#each").value,repeatGroup:+b.querySelector("#grp").value,repeatGroupLeft:+b.querySelector("#grp").value,repeatSurah:1,repeatSurahLeft:1,speed:+b.querySelector("#speed").value};
    b.remove();await playCurrent(true)
  }
};

function clearSleepTimer(){
  clearInterval(sleepTimerId);sleepTimerId=null;sleepDeadline=0;sleepAfterSurah=false;
  const l=document.getElementById("timerLabel");if(l)l.textContent="—";
}
function checkSleepTimer(){
  if(!sleepDeadline||Date.now()<sleepDeadline)return false;
  clearSleepTimer();playbackWanted=false;playbackRequestId++;clearTimeout(audioRetryTimer);audioRetryTimer=null;audio.pause();syncPlay();showToast("توقف الاستماع بانتهاء المؤقت");return true;
}
function setSleepTimer(seconds){
  clearSleepTimer();if(!seconds)return;
  sleepDeadline=Date.now()+seconds*1000;
  const tick=()=>{if(!checkSleepTimer())document.getElementById("timerLabel").textContent=formatAudioTime(Math.ceil((sleepDeadline-Date.now())/1000))};
  tick();sleepTimerId=setInterval(tick,1000);
}
document.addEventListener("visibilitychange",()=>{checkSleepTimer();if(!document.hidden)updateReciterMarquee()});
let timerHapticStamp=-Infinity;
function timerHaptic(duration=8){
  // Enhancement only: unsupported/disabled vibration must never interrupt the timer.
  try{
    if(typeof navigator.vibrate!=="function"||document.hidden)return;
    if(typeof matchMedia==="function"&&matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    const now=performance.now();
    if(duration<16&&now-timerHapticStamp<65)return;
    timerHapticStamp=now;navigator.vibrate(duration);
  }catch(_){ }
}
document.getElementById("sleepTimer").onclick=()=>{
  const remaining=sleepDeadline?Math.max(0,Math.ceil((sleepDeadline-Date.now())/1000)):1800;
  const values=[Math.floor(remaining/3600),Math.floor(remaining%3600/60),remaining%60];
  const units=[{name:"ساعة",max:23},{name:"دقيقة",max:59},{name:"ثانية",max:59}];
  const b=sheet("مؤقت إيقاف التلاوة",`<div class="settings">
    <p class="player-hint">مرّر الأرقام لاختيار المدة، أو أوقف التلاوة بعد نهاية السورة الحالية.</p>
    <div class="timer-digits">
      ${units.map((unit,i)=>`<div class="timer-column">
        <div class="timer-column-title" id="timerUnit${i}">${unit.name}</div>
        <button type="button" class="timer-nudge" data-nudge="${i}" data-step="-1" aria-label="إنقاص ${unit.name}">⌃</button>
        <div class="timer-wheel-wrap"><div class="timer-wheel" data-unit="${i}" role="listbox" tabindex="0" aria-labelledby="timerUnit${i}">
          ${Array.from({length:unit.max+1},(_,v)=>`<button type="button" class="timer-value" role="option" tabindex="-1" data-value="${v}" id="timerOption${i}_${v}" aria-selected="${v===values[i]}">${ar(String(v).padStart(2,"0"))}</button>`).join("")}
        </div></div>
        <button type="button" class="timer-nudge" data-nudge="${i}" data-step="1" aria-label="زيادة ${unit.name}">⌄</button>
      </div>`).join("")}
    </div>
    <div class="timer-presets">${[5,15,30,60].map(m=>`<button type="button" data-min="${m}">${ar(m)} د</button>`).join("")}</div>
    <button type="button" class="apply" id="startSleep">بدء المؤقت</button>
    <div class="queue-toolbar"><button type="button" id="endSurahTimer">بعد نهاية السورة</button><button type="button" id="cancelSleep">إلغاء المؤقت</button></div>
  </div>`);
  b.classList.add("player-backdrop");
  const wheels=[...b.querySelectorAll(".timer-wheel")];
  function mark(i,v,feedback=false){
    const previous=values[i];
    values[i]=Math.max(0,Math.min(units[i].max,v));
    if(feedback&&values[i]!==previous)timerHaptic();
    wheels[i].querySelectorAll("[role=option]").forEach(option=>option.setAttribute("aria-selected",String(Number(option.dataset.value)===values[i])));
    wheels[i].setAttribute("aria-activedescendant",`timerOption${i}_${values[i]}`);
  }
  function choose(i,v,smooth=false,feedback=true){
    mark(i,v,feedback);
    wheels[i].scrollTo({top:values[i]*44,behavior:smooth&&!matchMedia("(prefers-reduced-motion: reduce)").matches?"smooth":"instant"});
  }
  wheels.forEach((wheel,i)=>{
    wheel.addEventListener("scroll",()=>mark(i,Math.round(wheel.scrollTop/44),true),{passive:true});
    wheel.onclick=e=>{const option=e.target.closest("[data-value]");if(option)choose(i,Number(option.dataset.value),true)};
    wheel.onkeydown=e=>{
      const shifts={ArrowUp:-1,ArrowDown:1,PageUp:-5,PageDown:5};
      if(e.key in shifts){e.preventDefault();choose(i,values[i]+shifts[e.key])}
      else if(e.key==="Home"||e.key==="End"){e.preventDefault();choose(i,e.key==="Home"?0:units[i].max)}
    };
    choose(i,values[i],false,false);
  });
  b.querySelectorAll("[data-nudge]").forEach(button=>button.onclick=()=>{const i=Number(button.dataset.nudge);choose(i,values[i]+Number(button.dataset.step))});
  b.querySelectorAll("[data-min]").forEach(button=>button.onclick=()=>{const seconds=Number(button.dataset.min)*60;choose(0,Math.floor(seconds/3600),false,false);choose(1,seconds%3600/60,false,false);choose(2,0,false,false);timerHaptic()});
  b.querySelector("#startSleep").onclick=()=>{
    // Read actual wheel positions so a tap during inertial scrolling uses the visible value.
    wheels.forEach((wheel,i)=>choose(i,Math.round(wheel.scrollTop/44),false,false));
    const seconds=values[0]*3600+values[1]*60+values[2];
    if(!seconds){showToast("اختر مدة أكبر من صفر");return}setSleepTimer(seconds);timerHaptic(18);b.remove();
  };
  b.querySelector("#endSurahTimer").onclick=()=>{clearSleepTimer();sleepAfterSurah=true;continuousMode=true;continuousStopRef=null;storageSet(STORAGE_KEYS.continuous,"1");updatePlayer();document.getElementById("timerLabel").textContent="نهاية";timerHaptic(18);b.remove()};
  b.querySelector("#cancelSleep").onclick=()=>{clearSleepTimer();b.remove()};
};
