/* ---------- تلاوة الرواية المختارة ----------
   في غير حفص يكون القارئ قارئ الرواية وحده (riwaya-audio.mjs)، بلا اختيار؛ ويعود قارئ
   المستخدم في حفص كما كان. صفحات «الاستماع» لا تتأثر بالرواية. */
let riwayaAudioData=null,riwayaRest=[],riwayaFirst="",hafsReciter=null;
function riwayaFilesFor(s,a,r=reciter){
  return r.riwaya&&riwayaAudioData?riwayaAyahFiles(riwayaAudioData,r.riwaya,s,a):null;
}
function riwayaSurahMissing(s,r=reciter){
  return !!(r.riwaya&&riwayaAudioData?.reciters[r.riwaya]?.missing?.includes(Number(s)));
}
const riwayaPlayerApplies=()=>!location.pathname.startsWith("/quran-listen");
async function applyRiwayaReciter(){
  if(!riwayaPlayerApplies())return;
  const r=riwaya();
  const want=r==="hafs"?null:r;
  if((reciter.riwaya||null)===want)return;
  let next;
  if(want){
    try{riwayaAudioData=await loadRiwayaAudio()}catch(_){showToast("تعذّر تحميل تلاوة الرواية");return}
    if(riwaya()!==want)return;
    const rec=riwayaAudioData.reciters[want];
    if(!reciter.riwaya)hafsReciter=reciter;
    next={id:"riwaya:"+want,name:`${rec.name} — برواية ${riwayaName(want)}`,provider:"ayah",riwaya:want};
  }else next=hafsReciter||RECITERS.find(x=>x.id===storageJsonGet(STORAGE_KEYS.qari,null)?.id)||defaultReciter();
  const wasPlaying=document.body.classList.contains("player-on")&&!audio.paused;
  playbackRequestId++;audio.pause();riwayaRest=[];releaseAudioPreload();
  delete audio.dataset.source;delete audio.dataset.playMode;audio.removeAttribute("src");audio.load();
  reciter=next;
  document.documentElement.classList.toggle("riwaya-audio",!!want);
  updateReciterMarquee();
  if(wasPlaying)syncPlay();
}
document.addEventListener("zad:riwaya",()=>applyRiwayaReciter());
applyRiwayaReciter();
