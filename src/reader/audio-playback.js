function nextPlaybackRefForPriming(){
  if(play.repeatAyahLeft>1)return {s:play.surah,a:play.current};
  if(play.current<play.to)return {s:play.surah,a:play.current+1};
  if(play.repeatGroupLeft>1)return {s:play.surah,a:play.from};
  if(continuousMode){
    if(play.current>=maxAyah(play.surah)&&(play.repeatSurah||1)>1&&(play.repeatSurahLeft||1)>1)return {s:play.surah,a:1};
    if(continuousStopRef&&play.surah===continuousStopRef.s&&play.current===continuousStopRef.a)return null;
    return atSurahEnd()?nextSurahRef():nextAyahRef(play.surah,play.current);
  }
  return null;
}
function releaseAudioPreload(){
  primedEveryAyahSrc="";primedTimedSurahSrc="";
  try{
    audioPreload.pause();
    audioPreload.removeAttribute("src");
    audioPreload.load();
  }catch(_){}
}
function primeNextEveryAyah(){
  const currentSourceId=ayahAudioSourceId(play.surah);
  if(!currentSourceId||audio.dataset.playMode!=="ayah"||!document.body.classList.contains("player-on"))return;
  const n=nextPlaybackRefForPriming();
  if(!n){releaseAudioPreload();return}
  const nextSourceId=ayahAudioSourceId(n.s);
  if(!nextSourceId||nextSourceId!==currentSourceId){releaseAudioPreload();return}
  const src=audioUrl(n.s,n.a);
  if(src===primedEveryAyahSrc)return;
  primedEveryAyahSrc=src;
  try{
    audioPreload.pause();
    audioPreload.src=src;
    audioPreload.load();
  }catch(_){}
}
async function primeNextTimedSurah(){
  if(!continuousMode||(!isTimedProvider()&&!isSurahOnly())||!["gapless","surah"].includes(audio.dataset.playMode)||!document.body.classList.contains("player-on"))return;
  if(continuousStopRef&&Number(play.surah)===Number(continuousStopRef.s)&&Number(play.current)>=Number(continuousStopRef.a))return;
  if((play.repeatSurah||1)>1&&(play.repeatSurahLeft||1)>1)return;
  const next=nextSurahRef();if(!next||sleepAfterSurah)return;
  const nextSurah=next.s;
  const guard=`${reciter.id}:${play.surah}`;
  try{
    let src="";
    if(reciter.provider==="mp3quran-timed"){
      const timed=await getMp3Timing(nextSurah);
      src=(timed.read.folder_url.endsWith("/")?timed.read.folder_url:timed.read.folder_url+"/")+pad3(nextSurah)+".mp3";
    }else if(reciter.provider==="qul-maher"){
      src=(await getMaherQulTiming(nextSurah)).src;
    }else if(isSurahOnly()){src=wholeSurahAudioUrl(nextSurah)}
    if(!src||guard!==`${reciter.id}:${play.surah}`||!continuousMode||nextSurahRef()?.s!==nextSurah||!document.body.classList.contains("player-on"))return;
    if(src===primedTimedSurahSrc)return;
    primedTimedSurahSrc=src;primedEveryAyahSrc="";
    audioPreload.pause();audioPreload.src=src;audioPreload.preload="auto";audioPreload.load();
  }catch(_){ }
}
function syncPlaybackSelectionInBackground(requestId){
  Promise.resolve(syncPlaybackSelection(requestId)).catch(err=>console.error("selection sync",err));
}
function shouldPlaySurahBasmala(surah,ayah){
  return pendingSurahBasmala&&Number(ayah)===1&&Number(surah)!==1&&Number(surah)!==9;
}
function clearSurahBasmalaPrelude(){
  pendingSurahBasmala=false;basmalaFallbackTarget=null;
}

async function playEveryAyahBasmalaPrelude(requestId,keepExpanded){
  if(requestId!==playbackRequestId||reciter.provider!=="ayah"||!reciter.everyAyahId||!reciter.ayahBasmalaPrelude)return false;
  // Approved contract for per-ayah reciters:
  // same-reciter Fatiha 1:1 supplies the basmala before a new surah.
  const target={s:play.surah,a:play.current};
  basmalaFallbackTarget=target;
  const src=`https://everyayah.com/data/${reciter.everyAyahId}/001001.mp3`;
  activeSegment=null;activeTimingRows=null;
  audio.dataset.playMode="basmala";
  audio.title="البسملة قبل بداية السورة";
  if(audio.dataset.source!==src){
    audio.pause();
    audio.dataset.source=src;audio.src=src;audio.preload="auto";
  }else{
    try{audio.currentTime=0}catch(_){}
  }
  audio.playbackRate=play.speed;
  updatePlayer();showPlayer(keepExpanded);
  if(checkSleepTimer()||requestId!==playbackRequestId)return;
  await audio.play();
  if(requestId===playbackRequestId)syncPlay();
  return true;
}
function linearTimedNextRef(){
  if(!activeTimingRows||play.repeatAyahLeft>1)return null;
  if(play.current<play.to)return {s:play.surah,a:play.current+1};
  if(play.repeatGroupLeft>1)return null;
  if(continuousMode){
    if(play.current>=maxAyah(play.surah)&&(play.repeatSurah||1)>1&&(play.repeatSurahLeft||1)>1)return {s:play.surah,a:1};
    if(continuousStopRef&&play.surah===continuousStopRef.s&&play.current===continuousStopRef.a)return null;
    const n=nextAyahRef(play.surah,play.current);
    if(n&&n.s===play.surah)return n;
  }
  return null;
}
function isFinalQuranAyah(){
  return Number(play.surah)===114&&Number(play.current)===Number(maxAyah(114));
}
function advanceTimedSegmentWithoutPause(){
  const n=linearTimedNextRef();
  if(!n)return false;
  const t=activeTimingRows.find(x=>Number(x.ayah)===n.a);
  if(!t)return false;
  if(n.s===play.surah&&n.a===1&&play.current>=maxAyah(play.surah)&&(play.repeatSurahLeft||1)>1)play.repeatSurahLeft--;
  play.current=n.a;
  play.repeatAyahLeft=play.repeatAyah;
  activeSegment={start:Number(t.start_time)/1000,end:Number(t.end_time)/1000};
  updatePlayer();
  const requestId=++playbackRequestId;
  syncPlaybackSelectionInBackground(requestId);
  return true;
}

function handleAudioFailure(error,requestId){
  if(!playbackWanted||requestId!==playbackRequestId)return;
  const key=`${reciter.id}:${play.surah}:${play.current}`;
  if(key!==audioRetryKey){audioRetryKey=key;audioRetryCount=0}
  const retryable=navigator.onLine&&error?.name!=="NotAllowedError"&&error?.name!=="NotSupportedError";
  if(retryable&&audioRetryCount<2){
    if(audioRetryTimer)return;
    const delay=1000*(++audioRetryCount);
    showToast("انقطع تحميل التلاوة؛ جارٍ إعادة المحاولة…");
    audioRetryTimer=setTimeout(()=>{
      audioRetryTimer=null;
      if(requestId!==playbackRequestId||checkSleepTimer())return;
      delete audio.dataset.source;playCurrent(false);
    },delay);
  }else{
    showToast(error?.name==="NotAllowedError"?"اضغط تشغيل لمتابعة التلاوة":navigator.onLine?"تعذّر تحميل التلاوة. اضغط تشغيل للمحاولة مجدداً":AUDIO_OFFLINE_UNAVAILABLE);
    syncPlay();
  }
}
async function playCurrent(expand=false){
  playbackWanted=true;
  clearTimeout(audioRetryTimer);audioRetryTimer=null;
  const requestId=++playbackRequestId;
  if(!navigator.onLine&&!await ensureOfflinePlaybackReciter(play.surah))return false;
  if(requestId!==playbackRequestId)return;
  if(isSurahOnly())normalizeWholeSurahPlayback();
  const keepExpanded=expand||document.body.classList.contains("player-expanded");
  resetAudioProgress();
  updatePlayer();showPlayer(keepExpanded);
  syncPlaybackSelectionInBackground(requestId);

  try{
    if(isSurahOnly()){
      const src=wholeSurahAudioUrl(play.surah);
      activeSegment=null;activeTimingRows=null;audio.dataset.playMode="surah";
      if(audio.dataset.source!==src){
        audio.src=src;audio.dataset.source=src;audio.preload="auto";audio.load();
        await mediaReady();if(requestId!==playbackRequestId)return;
      }
      audio.currentTime=0;audio.playbackRate=play.speed;
      if(checkSleepTimer()||requestId!==playbackRequestId)return;
      await audio.play();if(requestId===playbackRequestId){syncPlay();primeNextTimedSurah()}return;
    }
    const ayahSourceId=ayahAudioSourceId(play.surah);
    if(ayahSourceId){
      if(shouldPlaySurahBasmala(play.surah,play.current)){
        const handled=await playEveryAyahBasmalaPrelude(requestId,keepExpanded);
        if(requestId!==playbackRequestId)return;
        if(handled)return;
        clearSurahBasmalaPrelude();
      }

      activeSegment=null;activeTimingRows=null;
      audio.dataset.playMode="ayah";
      const src=audioUrl(play.surah,play.current);

      if(audio.dataset.source!==src){
        audio.dataset.source=src;
        audio.src=src;
        audio.preload="auto";
      }else{
        try{audio.currentTime=0}catch(_){}
      }

      audio.playbackRate=play.speed;
      if(checkSleepTimer()||requestId!==playbackRequestId)return;
      await audio.play();
      if(requestId!==playbackRequestId)return;
      syncPlay();
      primeNextEveryAyah();
      return;
    }

    if(isTimedProvider()){
      const {src,rows,t}=await resolveGaplessForCurrentSurah();
      if(requestId!==playbackRequestId)return;

      activeTimingRows=rows;
      activeSegment={start:Number(t.start_time)/1000,end:Number(t.end_time)/1000};
      audio.dataset.playMode="gapless";

      if(audio.dataset.source!==src){
        audio.src=src;
        audio.dataset.source=src;
        audio.preload="auto";
        audio.load();
        await mediaReady();
        if(requestId!==playbackRequestId)return;
      }

      // Automatic surah-to-surah continuation starts from the beginning of
      // the source recording so its own basmala is heard naturally.
      // Al-Fatiha is handled by its exact ayah source when applicable;
      // At-Tawbah has no Basmala prelude.
      if(shouldPlaySurahBasmala(play.surah,play.current)){
        audio.currentTime=0;
        clearSurahBasmalaPrelude();
      }else{
        pendingSurahBasmala=false;
        audio.currentTime=activeSegment.start;
      }

      audio.playbackRate=play.speed;
      if(checkSleepTimer()||requestId!==playbackRequestId)return;
      await audio.play();
      if(requestId===playbackRequestId){syncPlay();primeNextTimedSurah()}
      return;
    }

    throw new Error("unknown reciter provider");
  }catch(e){
    if(requestId!==playbackRequestId)return;
    console.error(e);
    activeSegment=null;activeTimingRows=null;
    handleAudioFailure(e,requestId);
  }
}
async function startSelected(){
  if(!selectedKey){showToast("اختر آية أولًا");return}
  const v=verseParts(selectedKey);
  detachQueue();
  pendingSurahBasmala=false;basmalaFallbackTarget=null;
  continuousStopRef=null;
  play={surah:v.s,from:v.a,to:v.a,current:v.a,repeatAyah:1,repeatAyahLeft:1,repeatGroup:1,repeatGroupLeft:1,repeatSurah:1,repeatSurahLeft:1,speed:1};
  await playCurrent(true);
}
document.getElementById("listenBtn").onclick=startSelected;
document.getElementById("audioFab").onclick=expandPlayer;
document.getElementById("collapsePlayer").onclick=collapsePlayer;
document.getElementById("stopPlayer").onclick=stopPlayer;
document.getElementById("panelPlay").onclick=async()=>{
  if(audio.paused){
    playbackWanted=true;audioRetryCount=0;
    if(queueActive&&audio.ended&&atSurahEnd()&&!nextSurahRef()){await playQueueEntry(0);return}
    if(activeSegment&&audio.currentTime>=activeSegment.end-.08)await playCurrent(false);
    else if(audio.src&&!audio.ended)await audio.play();
    else await playCurrent(false);
  }else{playbackWanted=false;playbackRequestId++;clearTimeout(audioRetryTimer);audioRetryTimer=null;audio.pause()}
  syncPlay();
};
function previousAyahRef(s,a){
  s=Number(s);a=Number(a);
  if(a>1)return {s,a:a-1};
  if(s>1)return {s:s-1,a:maxAyah(s-1)};
  return null;
}
function nextAyahRef(s,a){
  s=Number(s);a=Number(a);
  if(a<maxAyah(s))return {s,a:a+1};
  if(s<114)return {s:s+1,a:1};
  return null;
}
async function movePlayerTo(ref){
  if(!ref)return;continuousStopRef=null;const changedSurah=ref.s!==play.surah;
  if(changedSurah)detachQueue();
  // Manual previous/next seeks directly to the requested ayah.
  pendingSurahBasmala=false;basmalaFallbackTarget=null;
  play.surah=ref.s;play.current=ref.a;play.repeatAyahLeft=play.repeatAyah;
  if(changedSurah){play.from=ref.a;play.to=ref.a;play.repeatGroupLeft=play.repeatGroup}
  await playCurrent(false);
}
async function stepPlayer(direction){
  if(queueActive){
    let index=queueIndex+direction;
    if(repeatMode==="all")index=(index+playbackQueue.length)%playbackQueue.length;
    if(index<0||index>=playbackQueue.length){showToast(direction>0?"هذه آخر سورة في القائمة":"هذه أول سورة في القائمة");return}
    await playQueueEntry(index);return;
  }
  if(isSurahOnly()){
    let s=play.surah+direction;
    if(repeatMode==="all")s=(s+113)%114+1;
    if(s<1||s>114){showToast("وصلت إلى نهاية المصحف في هذا الاتجاه");return}
    play.surah=s;await playCurrent(false);return;
  }
  await movePlayerTo(direction>0?nextAyahRef(play.surah,play.current):previousAyahRef(play.surah,play.current));
}
document.getElementById("audioPrev").onclick=()=>stepPlayer(-1);
document.getElementById("audioNext").onclick=()=>stepPlayer(1);
document.getElementById("continuousBtn").onclick=()=>{
  continuousMode=!continuousMode;repeatMode="off";detachQueue();continuousStopRef=null;storageSet(STORAGE_KEYS.continuous,continuousMode?"1":"0");
  play.repeatAyah=1;play.repeatAyahLeft=1;play.repeatSurah=1;play.repeatSurahLeft=1;
  updatePlayer();primeNextEveryAyah();if(continuousMode)primeNextTimedSurah();
  showToast(isSurahOnly()?(continuousMode?"ستتابع التلاوة حسب ترتيب السور":"ستتوقف التلاوة عند نهاية السورة"):(continuousMode?"ستستمر التلاوة بعد الآية المحددة":"ستتوقف التلاوة عند نهاية التحديد"));
};
document.getElementById("panelQari").onchange=async e=>{
  reciter=RECITERS.find(r=>r.id===e.target.value)||defaultReciter();
  playbackRequestId++;audio.pause();
  activeSegment=null;activeTimingRows=null;releaseAudioPreload();
  pendingSurahBasmala=false;basmalaFallbackTarget=null;
  delete audio.dataset.source;delete audio.dataset.playMode;audio.removeAttribute("src");audio.load();
  storageJsonSet(STORAGE_KEYS.qari,reciter);
  updatePlayer();
  if(document.body.classList.contains("player-on"))await playCurrent(false);
};
const speeds=[.75,1,1.25,1.5,2];
document.getElementById("speedBtn").onclick=()=>{
  let i=speeds.indexOf(play.speed);play.speed=speeds[(i+1)%speeds.length];
  audio.playbackRate=play.speed;updatePlayer();
};
document.getElementById("repeatBtn").onclick=()=>{
  repeatMode=repeatMode==="off"?"one":repeatMode==="one"?"all":"off";
  if(repeatMode!=="off"){
    continuousMode=true;storageSet(STORAGE_KEYS.continuous,"1");continuousStopRef=null;
    play.repeatAyah=play.repeatAyahLeft=play.repeatGroup=play.repeatGroupLeft=play.repeatSurah=play.repeatSurahLeft=1;
  }
  updatePlayer();primeNextEveryAyah();primeNextTimedSurah();
  showToast(repeatMode==="one"?"ستتكرر السورة حتى تلغي التكرار":repeatMode==="all"?(queueActive?"ستتكرر قائمة التشغيل كاملة":"ستستمر التلاوة حسب ترتيب المصحف وتعود إلى أوله بعد سورة الناس"):"أُلغي التكرار");
};
