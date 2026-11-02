function syncQueueControls(){
  const button=document.getElementById("queueBtn"),toggle=document.getElementById("queueToggle");
  button.classList.toggle("active",queueActive);
  button.title=queueActive?"قائمة التشغيل مفعّلة":"قائمة التشغيل غير مفعّلة";
  button.setAttribute("aria-label",`فتح قائمة التشغيل — ${queueActive?"مفعّلة":"غير مفعّلة"}`);
  toggle.setAttribute("aria-checked",String(queueActive));toggle.disabled=!playbackQueue.length;
  toggle.title=!playbackQueue.length?"أضف سوراً إلى القائمة لتفعيلها":queueActive?"إيقاف التشغيل من القائمة":"تفعيل التشغيل من القائمة";
  const enabled=document.getElementById("queueEnabled"),hint=document.getElementById("queueSourceHint");
  if(enabled){enabled.checked=queueActive;enabled.disabled=!playbackQueue.length}
  if(hint)hint.textContent=!playbackQueue.length?"أضف سوراً لتفعيل التشغيل من القائمة.":queueActive?"يتابع المشغّل حسب ترتيب قائمتك بعد السورة الحالية.":"المتابعة حسب ترتيب المصحف، وتبقى قائمتك محفوظة.";
}
function setQueuePlayback(enabled){
  if(enabled&&!playbackQueue.length)return false;
  if(enabled){
    if(!queueActive)queueIndex=playbackQueue.findIndex(item=>item.s===play.surah);
    queueActive=true;
    play.repeatAyah=play.repeatAyahLeft=play.repeatGroup=play.repeatGroupLeft=play.repeatSurah=play.repeatSurahLeft=1;
  }else{queueActive=false;queueIndex=-1}
  // Only change what follows the sounding surah; never restart or pause it.
  continuousMode=true;continuousStopRef=null;storageSet(STORAGE_KEYS.continuous,"1");
  updatePlayer();releaseAudioPreload();primeNextEveryAyah();primeNextTimedSurah();
  return true;
}
function savePlaybackQueue(){storageJsonSet("zad:player:queue:v1",{items:playbackQueue});updatePlayer()}
async function playQueueEntry(index){
  if(!playbackQueue[index])return;
  queueActive=true;queueIndex=index;continuousMode=true;continuousStopRef=null;
  storageSet(STORAGE_KEYS.continuous,"1");
  const s=playbackQueue[index].s;
  play={surah:s,from:1,to:1,current:1,repeatAyah:1,repeatAyahLeft:1,repeatGroup:1,repeatGroupLeft:1,repeatSurah:1,repeatSurahLeft:1,speed:play.speed||1};
  pendingSurahBasmala=s!==1&&s!==9;basmalaFallbackTarget=null;
  await playCurrent(true);
}
function reorderQueue(from,to){
  if(from<0||to<0||from>=playbackQueue.length||to>=playbackQueue.length||from===to)return;
  const current=queueActive?playbackQueue[queueIndex]?.id:null;
  playbackQueue.splice(to,0,playbackQueue.splice(from,1)[0]);
  if(current)queueIndex=playbackQueue.findIndex(x=>x.id===current);
  savePlaybackQueue();
}
