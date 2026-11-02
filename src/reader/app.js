
(()=>{
"use strict";
/* v85 Reader Navigation + Hardware Back + Bottom Dock
   v80 Quran Home + Offline Foundation + Repeat Semantics
   Based on v78 Index Social Sharing.
   Built directly on the approved v56 reference. Visual/QCF layout contracts are unchanged; production dependencies are hardened and tafsir is lazy-loaded locally.

   Invariants:
   - QCF4 Mushaf composition/layout is untouched.
   - Verified tafsir is loaded lazily from the local audited static repository.
   - Audio behavior is provider-specific; no hidden provider switching.
   - UI ordering never determines the default reciter.
   - QCF4 data/fonts are pinned to npm quran-qcf4@1.0.3; QUL decorative title remains optional with QCF fallback.
*/
const QCF_BASE="https://cdn.jsdelivr.net/npm/quran-qcf4@1.0.3/";
const PAGE_BASE=QCF_BASE+"pages/";
const INDEX_URL=QCF_BASE+"index.json";
const VERSE_INDEX_URL=QCF_BASE+"verses.json";
const QCF_FONT_BASE=QCF_BASE+"fonts-woff2/";
const TOTAL_PAGES=604;
const SURAH_HEADER_GLYPHS=[null,"ﱅ","ﱆ","ﱇ","ﱊ","ﱋ","ﱎ","ﱏ","ﱑ","ﱒ","ﱓ","ﱕ","ﱖ","ﱘ","ﱚ","ﱛ","ﱜ","ﱝ","ﱞ","ﱡ","ﱢ","ﱤ","ﭑ","ﭒ","ﭔ","ﭕ","ﭗ","ﭘ","ﭚ","ﭛ","ﭝ","ﭞ","ﭠ","ﭡ","ﭣ","ﭤ","ﭦ","ﭧ","ﭩ","ﭪ","ﭬ","ﭭ","ﭯ","ﭰ","ﭲ","ﭳ","ﭵ","ﭶ","ﭸ","ﭹ","ﭻ","ﭼ","ﭾ","ﭿ","ﮁ","ﮂ","ﮄ","ﮅ","ﮇ","ﮈ","ﮊ","ﮋ","ﮍ","ﮎ","ﮐ","ﮑ","ﮓ","ﮔ","ﮖ","ﮗ","ﮙ","ﮚ","ﮜ","ﮝ","ﮟ","ﮠ","ﮢ","ﮣ","ﮥ","ﮦ","ﮨ","ﮩ","ﮫ","ﮬ","ﮮ","ﮯ","ﮱ","﮲","﮴","﮵","﮷","﮸","﮺","﮻","﮽","﮾","﯀","﯁","ﯓ","ﯔ","ﯖ","ﯗ","ﯙ","ﯚ","ﯜ","ﯝ","ﯟ","ﯠ","ﯢ","ﯣ","ﯥ","ﯦ","ﯨ","ﯩ","ﯫ"];
let surahHeaderReady=false;
const TAFSIR_DATASET=Object.freeze({
  schemaVersion:1,
  sourceId:"wahba_al_zuhayli_al_wajeez",
  title:"التفسير الوجيز للدكتور وهبة الزحيلي",
  version:"1.0.0",
  surahs:114,
  ayahs:6236,
  fadl:60,
  localBase:"data/tafsir/al-wajeez/"
});
const tafsirSurahCache=new Map();
let tafsirIndexCache=null,tafsirIndexPromise=null,tafsirFadlCache=null,tafsirFadlPromise=null;
function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function validTafsirSurah(data,surah){
  if(!data||Number(data.schema_version)!==TAFSIR_DATASET.schemaVersion||
     data.source_id!==TAFSIR_DATASET.sourceId||Number(data.surah)!==Number(surah)||
     !data.ayahs||typeof data.ayahs!=="object"||Array.isArray(data.ayahs))return false;
  const count=Number(data.ayah_count);
  return count>0&&Object.keys(data.ayahs).length===count;
}
async function loadTafsirIndex(){
  if(tafsirIndexCache)return tafsirIndexCache;
  if(tafsirIndexPromise)return tafsirIndexPromise;
  tafsirIndexPromise=(async()=>{
    const response=await fetch(`${TAFSIR_DATASET.localBase}index.json`,{cache:"force-cache"});
    if(!response.ok)throw new Error(`tafsir index ${response.status}`);
    const data=await response.json();
    const files=Array.isArray(data?.surah_files)?data.surah_files:[];
    const ayahs=files.reduce((n,x)=>n+(Number(x?.ayah_count)||0),0);
    if(Number(data?.schema_version)!==TAFSIR_DATASET.schemaVersion||
       data?.source_id!==TAFSIR_DATASET.sourceId||files.length!==TAFSIR_DATASET.surahs||
       ayahs!==TAFSIR_DATASET.ayahs||Number(data?.total_fadl_records)!==TAFSIR_DATASET.fadl){
      throw new Error("tafsir repository integrity");
    }
    tafsirIndexCache=data;return data;
  })().finally(()=>{tafsirIndexPromise=null});
  return tafsirIndexPromise;
}
async function loadTafsirSurah(surah){
  const s=Math.max(1,Math.min(114,Number(surah)||1));
  if(tafsirSurahCache.has(s))return tafsirSurahCache.get(s);
  await loadTafsirIndex();
  const url=`${TAFSIR_DATASET.localBase}${pad3(s)}.json`;
  const response=await fetch(url,{cache:"force-cache"});
  if(!response.ok)throw new Error(`tafsir ${s}`);
  const data=await response.json();
  if(!validTafsirSurah(data,s))throw new Error(`invalid tafsir ${s}`);
  tafsirSurahCache.set(s,data);
  return data;
}
async function tafsirAyahRecord(key){
  const [surah,ayah]=String(key||"").split(":").map(Number);
  if(!surah||!ayah)return null;
  const data=await loadTafsirSurah(surah);
  const record=data.ayahs?.[String(ayah)]||null;
  if(!record||typeof record.text!=="string"||!record.text.trim())return null;
  return {surah,ayah,surahName:data.surah_name||"",...record};
}
async function loadTafsirFadl(){
  if(tafsirFadlCache)return tafsirFadlCache;
  if(tafsirFadlPromise)return tafsirFadlPromise;
  tafsirFadlPromise=(async()=>{
    await loadTafsirIndex();
    const response=await fetch(`${TAFSIR_DATASET.localBase}fadl.json`,{cache:"force-cache"});
    if(!response.ok)throw new Error(`tafsir fadl ${response.status}`);
    const data=await response.json(),map=new Map();
    if(Number(data?.count)!==TAFSIR_DATASET.fadl||!Array.isArray(data?.records))throw new Error("tafsir fadl integrity");
    for(const record of data.records){
      for(const surah of record.applies_to_surahs||[]){
        const s=Number(surah);if(s>=1&&s<=114&&!map.has(s))map.set(s,record);
      }
    }
    tafsirFadlCache=map;return map;
  })().finally(()=>{tafsirFadlPromise=null});
  return tafsirFadlPromise;
}
async function tafsirFadlForSurah(surah){return (await loadTafsirFadl()).get(Number(surah))||null}

const RECITERS=[
  {
    id:"Ayman_Sowaid_64kbps",name:"فضيلة الشيخ أيمن سويد",
    provider:"ayah",everyAyahId:"Ayman_Sowaid_64kbps",
    ayahBasmalaPrelude:true
  },
  {
    id:"AbdulRashidSufi_Hafs",name:"فضيلة الشيخ عبد الرشيد الصوفي",
    provider:"mp3quran-timed",
    timedNames:["عبدالرشيد صوفي","عبد الرشيد صوفي","عبدالرشيد الصوفي","عبد الرشيد الصوفي"],
    timedPrefer:["حفص","عاصم"],timedRequireAny:["حفص","عاصم"],
    timedReject:["السوسي","الدوري","شعبة","خلف","ورش","قالون"]
  },
  {
    id:"Hudhaify_128kbps",name:"فضيلة الشيخ علي بن عبد الرحمن الحذيفي",
    provider:"ayah",everyAyahId:"Hudhaify_128kbps",ayahBasmalaPrelude:true
  },
  {
    id:"AliJaber_Hafs",name:"فضيلة الشيخ علي جابر",
    provider:"mp3quran-timed",timedNames:["علي جابر"],
    timedPrefer:["حفص","عاصم"],timedRequireAny:["حفص","عاصم"]
  },
  {
    id:"MaherAlMuaiqly128kbps",name:"فضيلة الشيخ ماهر المعيقلي",
    provider:"qul-maher"
  },
  {
    id:"MahmoudAlHamoud_Surah",name:"فضيلة الشيخ محمود الحمود — السور كاملة",
    provider:"surah",audioBase:"https://media.way2quran.com/mahmoud-fayyad-al-hamoud/hafs-an-asim/"
  },
  {
    id:"Minshawy_Mujawwad_192kbps",name:"فضيلة الشيخ محمد صديق المنشاوي — مجود",
    provider:"ayah",everyAyahId:"Minshawy_Mujawwad_192kbps",
    ayahBasmalaPrelude:true
  },
  {
    id:"Minshawy_Murattal_128kbps",name:"فضيلة الشيخ محمد صديق المنشاوي — مرتل",
    provider:"mp3quran-timed",
    timedNames:["محمد صديق المنشاوي","المنشاوي"],
    timedPrefer:["حفص","عاصم"],timedReject:["مجود","معلم"]
  },
  {
    id:"Husary_128kbps",name:"فضيلة الشيخ محمود خليل الحصري",
    provider:"mp3quran-timed",
    fatihaEveryAyahId:"Husary_128kbps",
    timedNames:["محمود خليل الحصري","محمود خليل الحصری","الحصري"],
    timedPrefer:["حفص","عاصم"],timedReject:["مجود","معلم","ورش"]
  },
  {
    id:"MisharyAlafasy_Hafs",name:"فضيلة الشيخ مشاري راشد العفاسي",
    provider:"mp3quran-timed",timedNames:["مشاري العفاسي","مشاري راشد العفاسي"],
    timedPrefer:["حفص","عاصم"],timedRequireAny:["حفص","عاصم"],
    timedReject:["ورش","قالون","شعبة"]
  }
];
const DEFAULT_RECITER_ID="Husary_128kbps";
const SURAH_ONLY_HINT="هذا القارئ متاح للاستماع إلى السور كاملة، دون متابعة أو تحديد الآيات.";
function isSurahOnly(r=reciter){return r.provider==="surah"}
function wholeSurahAudioUrl(s,r=reciter){
  if(!isSurahOnly(r)||!r.audioBase)throw new Error("whole-surah provider unavailable");
  return r.audioBase+pad3(Math.max(1,Math.min(114,Number(s)||1)))+".mp3";
}
function normalizeWholeSurahPlayback(){
  play.current=play.from=play.to=1;
  play.repeatAyah=play.repeatAyahLeft=play.repeatGroup=play.repeatGroupLeft=play.repeatSurah=play.repeatSurahLeft=1;
  continuousStopRef=null;clearSurahBasmalaPrelude();
}
function defaultReciter(){
  return RECITERS.find(r=>r.id===DEFAULT_RECITER_ID)||RECITERS[0];
}
function validateReciterConfig(){
  const allowed=new Set(["ayah","mp3quran-timed","qul-maher","surah"]);
  if(RECITERS.length!==10)throw new Error("reciter config count");
  const ids=new Set(),names=new Set();
  for(const r of RECITERS){
    if(!r?.id||!r?.name||!allowed.has(r.provider))throw new Error("reciter config shape");
    if(ids.has(r.id)||names.has(r.name))throw new Error("duplicate reciter config");
    ids.add(r.id);names.add(r.name);
    if(isSurahOnly(r)&&!/^https:\/\//.test(r.audioBase||""))throw new Error("whole-surah reciter source");
    if(r.provider==="ayah"&&!r.everyAyahId)throw new Error("ayah reciter source");
    if(r.fatihaEveryAyahId&&r.id!=="Husary_128kbps")throw new Error("unexpected Fatiha ayah override");
    if(r.provider==="mp3quran-timed"&&(!Array.isArray(r.timedNames)||!r.timedNames.length))throw new Error("timed reciter matcher");
  }
  if(!ids.has(DEFAULT_RECITER_ID))throw new Error("default reciter missing");
}

/* ---------- persistent state: one guarded gateway ---------- */
const STORAGE_KEYS=Object.freeze({
  qari:"zad:qcf4:qari",
  continuous:"zad:qcf4:continuous",
  meta:"zad:qcf4:meta-v1",
  verseIndex:"zad:qcf4:verse-index-v1",
  indexExcerpts:"zad:qcf4:index-excerpts-v1",
  recentVisits:"zad:qcf4:recent-visits",
  lastPosition:"zad:qcf4:last-position",
  lastSurface:"zad:qcf4:last-surface-v1",
  readerParent:"zad:qcf4:reader-parent-v1",
  pageBookmarks:"zad:qcf4:page-bookmarks",
  ayahBookmarks:"zad:qcf4:ayah-bookmarks",
  searchIndex:"zad:qcf4:search-v1",
  audioOffline:"zad:qcf4:audio-offline-v1",
  legacyBookmarks:"zad:qcf4:bookmarks",
  theme:"zad:qcf4:theme"
});
function storageGet(key,fallback=null){
  try{const v=localStorage.getItem(key);return v===null?fallback:v}catch(_){return fallback}
}
function storageSet(key,value){
  try{localStorage.setItem(key,String(value));return true}catch(_){return false}
}
function storageJsonGet(key,fallback=null){
  try{const raw=localStorage.getItem(key);return raw===null?fallback:JSON.parse(raw)}catch(_){return fallback}
}
function storageJsonSet(key,value){
  try{localStorage.setItem(key,JSON.stringify(value));return true}catch(_){return false}
}

const track=document.getElementById("track"),loading=document.getElementById("loading");
const menu=document.getElementById("ayahMenu"),toast=document.getElementById("toast"),notice=document.getElementById("notice");
const audio=document.getElementById("audio");
const audioPreload=document.getElementById("audioPreload");
audio.preload="auto";audioPreload.preload="auto";
audioPreload.volume=0;

let pages=new Map(),currentPage=1,selectedKey=null,selectedAnchor=null;
let toolsTimer=null,sleepTimerId=null,resizeTimer=null;
let downX=0,downY=0,swipeActive=false,longTimer=null,longTriggered=false;
const storedReciter=storageJsonGet(STORAGE_KEYS.qari,null);
let reciter=RECITERS.find(r=>r.id===storedReciter?.id)||defaultReciter();
let play={surah:1,from:1,to:1,current:1,repeatAyah:1,repeatAyahLeft:1,repeatGroup:1,repeatGroupLeft:1,repeatSurah:1,repeatSurahLeft:1,speed:1};
let continuousMode=storageGet(STORAGE_KEYS.continuous,"0")==="1";
let activeSegment=null,activeTimingRows=null,segmentAdvancing=false,playbackRequestId=0,continuousStopRef=null;
let primedEveryAyahSrc="",primedTimedSurahSrc="",pendingSurahBasmala=false,basmalaFallbackTarget=null;
let repeatMode="off";
let audioRetryTimer=null,audioRetryKey="",audioRetryCount=0,playbackWanted=false;
let sleepDeadline=0,sleepAfterSurah=false;
const savedQueue=storageJsonGet("zad:player:queue:v1",{})||{};
let playbackQueue=Array.isArray(savedQueue.items)?savedQueue.items.filter(x=>x&&Number.isInteger(x.s)&&x.s>=1&&x.s<=114&&typeof x.id==="string").slice(0,300):[];
let queueActive=false,queueIndex=-1;
let mp3ReadsPromise=null;
const timedReadCache=new Map(),mp3TimingCache=new Map(),maherQulTimingCache=new Map();
const PAGE_DATA_CACHE_LIMIT=12;
const pageDataLoads=new Map(),pageLoads=new Map(),qcfFontLoads=new Map();
let qcfMeta=null,chapterMap=new Map(),verseIndex=null,navigationBusy=false;
const JUZ_PAGES=[[1,21],[22,41],[42,61],[62,81],[82,101],[102,121],[122,141],[142,161],[162,181],[182,201],[202,221],[222,241],[242,261],[262,281],[282,301],[302,321],[322,341],[342,361],[362,381],[382,401],[402,421],[422,441],[442,461],[462,481],[482,501],[502,521],[522,541],[542,561],[562,581],[582,604]];
// Local structural index data — 240 Rubʿ al-Hizb starts [surah, ayah, page].
const LOCAL_HIZB_QUARTERS=[[1,1,1],[2,26,5],[2,44,7],[2,60,9],[2,75,11],[2,92,14],[2,106,17],[2,124,19],[2,142,22],[2,158,24],[2,177,27],[2,189,29],[2,203,32],[2,219,34],[2,233,37],[2,243,39],[2,253,42],[2,263,44],[2,272,46],[2,283,49],[3,15,51],[3,33,54],[3,52,56],[3,75,59],[3,93,62],[3,113,64],[3,133,67],[3,153,69],[3,171,72],[3,186,74],[4,1,77],[4,12,79],[4,24,82],[4,36,84],[4,58,87],[4,74,89],[4,88,92],[4,100,94],[4,114,97],[4,135,100],[4,148,102],[4,163,104],[5,1,106],[5,12,109],[5,27,112],[5,41,114],[5,51,117],[5,67,119],[5,82,121],[5,97,124],[5,109,126],[6,13,129],[6,36,132],[6,59,134],[6,74,137],[6,95,140],[6,111,142],[6,127,144],[6,141,146],[6,151,148],[7,1,151],[7,31,154],[7,47,156],[7,65,158],[7,88,162],[7,117,164],[7,142,167],[7,156,170],[7,171,173],[7,189,175],[8,1,177],[8,22,179],[8,41,182],[8,61,184],[9,1,187],[9,19,189],[9,34,192],[9,46,194],[9,60,196],[9,75,199],[9,93,201],[9,111,204],[9,122,206],[10,11,209],[10,26,212],[10,53,214],[10,71,217],[10,90,219],[11,6,222],[11,24,224],[11,41,226],[11,61,228],[11,84,231],[11,108,233],[12,7,236],[12,30,238],[12,53,242],[12,77,244],[12,101,247],[13,5,249],[13,19,252],[13,35,254],[14,10,256],[14,28,259],[15,1,262],[15,50,264],[16,1,267],[16,30,270],[16,51,272],[16,75,275],[16,90,277],[16,111,280],[17,1,282],[17,23,284],[17,50,287],[17,70,289],[17,99,292],[18,17,295],[18,32,297],[18,51,299],[18,75,302],[18,99,304],[19,22,306],[19,59,309],[20,1,312],[20,55,315],[20,83,317],[20,111,319],[21,1,322],[21,29,324],[21,51,326],[21,83,329],[22,1,332],[22,19,334],[22,38,336],[22,60,339],[23,1,342],[23,36,344],[23,75,347],[24,1,350],[24,21,352],[24,35,354],[24,53,356],[25,1,359],[25,21,362],[25,53,364],[26,1,367],[26,52,369],[26,111,371],[26,181,374],[27,1,377],[27,27,379],[27,56,382],[27,82,384],[28,12,386],[28,29,389],[28,51,392],[28,76,394],[29,1,396],[29,26,399],[29,46,402],[30,1,404],[30,31,407],[30,54,410],[31,22,413],[32,11,415],[33,1,418],[33,18,420],[33,31,422],[33,51,425],[33,60,426],[34,10,429],[34,24,431],[34,46,433],[35,15,436],[35,41,439],[36,28,442],[36,60,444],[37,22,446],[37,83,449],[37,145,451],[38,21,454],[38,52,456],[39,8,459],[39,32,462],[39,53,464],[40,1,467],[40,21,469],[40,41,472],[40,66,474],[41,9,477],[41,25,479],[41,47,482],[42,13,484],[42,27,486],[42,51,488],[43,24,491],[43,57,493],[44,17,496],[45,12,499],[46,1,502],[46,21,505],[47,10,507],[47,33,510],[48,18,513],[49,1,515],[49,14,517],[50,27,519],[51,31,522],[52,24,524],[53,26,526],[54,9,529],[55,1,531],[56,1,534],[56,75,536],[57,16,539],[58,1,542],[58,14,544],[59,11,547],[60,7,550],[62,1,553],[63,4,554],[65,1,558],[66,1,560],[67,1,562],[68,1,564],[69,1,566],[70,19,569],[72,1,572],[73,20,575],[75,1,577],[76,19,579],[78,1,582],[80,1,585],[82,1,587],[84,1,589],[87,1,591],[90,1,594],[94,1,596],[100,9,599]];
let indexExcerptCache=storageJsonGet(STORAGE_KEYS.indexExcerpts,{})||{},indexExcerptSaveTimer=null;
if(typeof indexExcerptCache!=="object"||Array.isArray(indexExcerptCache))indexExcerptCache={};
function scheduleIndexExcerptSave(){
  clearTimeout(indexExcerptSaveTimer);
  indexExcerptSaveTimer=setTimeout(()=>storageJsonSet(STORAGE_KEYS.indexExcerpts,indexExcerptCache),180);
}

function ar(n){return String(n).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[+d])}
function pad3(n){return String(Number(n)||0).padStart(3,"0")}
function verseParts(k){
  const [s,a]=k.split(":").map(Number);
  return {s,a,sname:chapterMap.get(s)?.name_arabic||({1:"الفاتحة",2:"البقرة"}[s]||`السورة ${ar(s)}`)};
}
function juzForPage(p){
  const i=JUZ_PAGES.findIndex(([a,b])=>p>=a&&p<=b);return i<0?1:i+1;
}
/* Position inside the 60 Hizb / 240 Rubʿ structure.
   The local table stores the first ayah and Mushaf page of every quarter.
   For page navigation we resolve the latest quarter whose start page is <= p. */
function hizbPositionForPage(p){
  const page=Math.max(1,Math.min(TOTAL_PAGES,Number(p)||1));
  let lo=0,hi=LOCAL_HIZB_QUARTERS.length-1,best=0;
  while(lo<=hi){
    const mid=(lo+hi)>>1,startPage=Number(LOCAL_HIZB_QUARTERS[mid][2]);
    if(startPage<=page){best=mid;lo=mid+1}else hi=mid-1;
  }
  const [surah,ayah,startPage]=LOCAL_HIZB_QUARTERS[best];
  return {
    index:best,
    rub:best+1,
    hizb:Math.floor(best/4)+1,
    phase:best%4, // 0=start, 1=quarter, 2=half, 3=three-quarters
    surah:Number(surah),
    ayah:Number(ayah),
    startPage:Number(startPage)
  };
}
function pageMilestoneLabel(p){
  const page=Number(p)||1,labels=[];
  const j=JUZ_PAGES.findIndex(([from])=>from===page);
  if(j>=0)labels.push(`الجزء ${ar(j+1)}`);
  const h=hizbPositionForPage(page);
  if(h.startPage===page){
    if(h.phase===0)labels.push(`الحزب ${ar(h.hizb)}`);
    else if(h.phase===2)labels.push(`نصف الحزب ${ar(h.hizb)}`);
  }
  return labels.join(" · ");
}
function validateStaticData(){
  if(TAFSIR_DATASET.surahs!==114||TAFSIR_DATASET.ayahs!==6236||TAFSIR_DATASET.fadl!==60)throw new Error("tafsir config integrity");
  validateReciterConfig();
  if(SURAH_HEADER_GLYPHS.length!==115)throw new Error("surah header map integrity");
  if(JUZ_PAGES.length!==30)throw new Error("juz page map integrity");
  if(LOCAL_HIZB_QUARTERS.length!==240)throw new Error("rub al-hizb map integrity");
  let previousEnd=0;
  for(const [from,to] of JUZ_PAGES){
    if(from!==previousEnd+1||to<from||to>TOTAL_PAGES)throw new Error("juz page continuity");
    previousEnd=to;
  }
  if(previousEnd!==TOTAL_PAGES)throw new Error("juz page coverage");
  let previousPage=0,hizbStarts=0,hizbHalves=0;
  for(let i=0;i<LOCAL_HIZB_QUARTERS.length;i++){
    const [surah,ayah,page]=LOCAL_HIZB_QUARTERS[i];
    if(surah<1||surah>114||ayah<1||page<1||page>TOTAL_PAGES||page<previousPage)throw new Error("rub al-hizb data integrity");
    if(i%4===0)hizbStarts++;
    if(i%4===2)hizbHalves++;
    previousPage=page;
  }
  if(hizbStarts!==60||hizbHalves!==60)throw new Error("hizb milestone integrity");
}
function chapterMapFromMeta(meta){
  if(!Array.isArray(meta?.chapters)||meta.chapters.length!==114)return null;
  const map=new Map(meta.chapters.map(x=>[Number(x?.id),x]));
  if(map.size!==114)return null;
  for(let id=1;id<=114;id++){
    const ch=map.get(id),from=Number(ch?.pages?.[0]),to=Number(ch?.pages?.[1]),verses=Number(ch?.verses_count);
    if(Number(ch?.id)!==id||!ch?.name_arabic||from<1||to<from||to>TOTAL_PAGES||verses<1)return null;
  }
  for(const [surah,ayah] of LOCAL_HIZB_QUARTERS)if(ayah>Number(map.get(surah)?.verses_count||0))return null;
  return map;
}
function validateMetadataConsistency(){
  const map=chapterMapFromMeta(qcfMeta);
  if(!map)throw new Error("chapter metadata integrity");
  chapterMap=map;
}
function buildPageShells(){
  track.innerHTML=Array.from({length:TOTAL_PAGES},(_,i)=>`<section class="page" data-page="${i+1}"></section>`).join("");
  track.style.width=(TOTAL_PAGES*100)+"vw";
}
async function loadQcfMeta(){
  if(qcfMeta)return qcfMeta;
  const cached=storageJsonGet(STORAGE_KEYS.meta,null),cachedMap=chapterMapFromMeta(cached);
  if(cachedMap){qcfMeta=cached;chapterMap=cachedMap;return qcfMeta}
  const r=await fetch(INDEX_URL,{cache:"force-cache"});if(!r.ok)throw new Error("qcf index");
  const fresh=await r.json(),freshMap=chapterMapFromMeta(fresh);
  if(!freshMap)throw new Error("invalid qcf index");
  qcfMeta=fresh;chapterMap=freshMap;storageJsonSet(STORAGE_KEYS.meta,qcfMeta);
  return qcfMeta;
}
async function loadVerseIndex(){
  if(verseIndex)return verseIndex;
  const cached=storageJsonGet(STORAGE_KEYS.verseIndex,null);
  if(cached&&typeof cached==="object"&&!Array.isArray(cached)){verseIndex=cached;return verseIndex}
  const r=await fetch(VERSE_INDEX_URL,{cache:"force-cache"});if(!r.ok)throw new Error("verse index");
  const fresh=await r.json();
  if(!fresh||typeof fresh!=="object"||Array.isArray(fresh))throw new Error("invalid verse index");
  verseIndex=fresh;storageJsonSet(STORAGE_KEYS.verseIndex,verseIndex);
  return verseIndex;
}
async function ensureQcfFont(name){
  if(!name||name==="QCF4_QBSML")return;
  if(qcfFontLoads.has(name))return qcfFontLoads.get(name);
  // Do not use document.fonts.check() for undeclared QCF families:
  // browsers may report fallback availability as true and skip the real font.
  const job=(async()=>{
    const face=new FontFace(name,`url("${QCF_FONT_BASE}${name}_W.woff2") format("woff2")`);
    const loaded=await face.load();
    document.fonts.add(loaded);
    return loaded;
  })().catch(err=>{qcfFontLoads.delete(name);throw err});
  qcfFontLoads.set(name,job);
  return job;
}
function showToast(m){toast.textContent=m;toast.classList.add("show");clearTimeout(toast._t);toast._t=setTimeout(()=>toast.classList.remove("show"),1450)}

/* Android/PWA back policy. The first Back at the real app boundary removes
   the synthetic guard and shows the hint. We intentionally leave the guard
   removed for 2.2 s, so a second physical Back is handled natively by
   Android/Chrome instead of trying to close a PWA from JavaScript. */
const readerGuardToken=`${Date.now()}-${Math.random().toString(36).slice(2)}`;
let readerBackGuardReady=false,readerExitPressedAt=0,readerReturnToQuranHome=false,readerNativeBack=false,readerExitRearmTimer=null;
function sameZadReferrer(){
  if(!document.referrer)return false;
  try{
    const ref=new URL(document.referrer),here=new URL(location.href);
    const base=here.pathname.replace(/[^/]*$/,"" );
    return ref.origin===here.origin&&ref.pathname.startsWith(base);
  }catch(_){return false}
}
const readerHasAppParent=sameZadReferrer();
function armReaderBackGuard(){
  clearTimeout(readerExitRearmTimer);
  try{
    if(history.state?.zadReaderGuard===readerGuardToken){readerBackGuardReady=true;return}
    history.pushState({...history.state,zadReaderGuard:readerGuardToken},"",location.href);
    readerBackGuardReady=true;
  }catch(_){ }
}
function closeTopReaderSurface(){
  const sheets=[...document.querySelectorAll(".backdrop")];
  if(sheets.length){sheets[sheets.length-1].remove();return true}
  if(menu?.classList?.contains("show")){closeMenu();return true}
  const panel=document.querySelector(".quran-index");
  if(panel&&panel.dataset.homeMode!=="1"){
    const resumeBtn=panel.querySelector('[data-hub-action="resume"]');
    if(resumeBtn)resumeBtn.click();else panel.remove();
    return true
  }
  return false;
}
function confirmReaderExitOrLeave(){
  readerExitPressedAt=Date.now();
  showToast("اضغط الرجوع مرة أخرى للخروج");
  clearTimeout(readerExitRearmTimer);
  readerExitRearmTimer=setTimeout(()=>{readerExitPressedAt=0;armReaderBackGuard()},2200);
}
window.addEventListener("popstate",()=>{
  if(readerNativeBack){readerNativeBack=false;return}
  readerBackGuardReady=false;
  if(closeTopReaderSurface()){armReaderBackGuard();return}
  const homePanel=document.querySelector('.quran-index[data-home-mode="1"]');
  if(homePanel){
    if(readerHasAppParent){readerNativeBack=true;history.back();return}
    if(readerEntryParams().fromZad){location.href=zadReturnUrl();return}
    confirmReaderExitOrLeave();return;
  }
  if(readerReturnToQuranHome){
    openQuranIndex("s",{home:true});
    armReaderBackGuard();return;
  }
  if(readerHasAppParent){readerNativeBack=true;history.back();return}
  confirmReaderExitOrLeave();
});
queueMicrotask(armReaderBackGuard);
function showNotice(m){notice.textContent=m;notice.classList.add("show");clearTimeout(notice._t);notice._t=setTimeout(()=>notice.classList.remove("show"),1500)}
function hideTools(){
  clearTimeout(toolsTimer);
  document.body.classList.add("hidden-tools");
}
function showToolsFor(ms=2800){
  clearTimeout(toolsTimer);
  document.body.classList.remove("hidden-tools");
  toolsTimer=setTimeout(()=>{
    if(!menu.classList.contains("show")&&!document.querySelector(".backdrop"))hideTools();
  },ms);
}
function normalizeArabic(s){return (s||"").replace(/[\u064B-\u065F\u0670\u06D6-\u06EDـ]/g,"")}
function isAllah(t){const n=normalizeArabic(t);return n.includes("الله")||n.includes("لله")}

async function fetchPage(p){
  const r=await fetch(PAGE_BASE+String(p).padStart(3,"0")+".json",{cache:"force-cache"});
  if(!r.ok)throw new Error("page "+p);
  const data=await r.json();
  if(Number(data?.page)!==Number(p)||!Array.isArray(data?.lines))throw new Error("invalid page "+p);
  return data;
}
function touchPageData(p,data){
  pages.delete(p);pages.set(p,data);
  return data;
}
function prunePageDataCache(center=currentPage){
  if(pages.size<=PAGE_DATA_CACHE_LIMIT)return;
  const protectedPages=new Set([center-2,center-1,center,center+1,center+2].filter(x=>x>=1&&x<=TOTAL_PAGES));
  for(const p of [...pages.keys()]){
    if(pages.size<=PAGE_DATA_CACHE_LIMIT)break;
    if(!protectedPages.has(p))pages.delete(p);
  }
}
async function getPageData(p){
  p=Number(p);if(!Number.isFinite(p)||p<1||p>TOTAL_PAGES)return null;
  if(pages.has(p))return touchPageData(p,pages.get(p));
  if(pageDataLoads.has(p))return pageDataLoads.get(p);
  const job=fetchPage(p).then(data=>{touchPageData(p,data);prunePageDataCache();return data}).finally(()=>pageDataLoads.delete(p));
  pageDataLoads.set(p,job);return job;
}
function surahIdFromPageData(data){
  const direct=Number(data?.surahs?.[0]?.id||data?.surahs?.[0]?.number||data?.surahs?.[0]?.surah_number);
  if(direct)return direct;
  const name=data?.surahs?.[0]?.name_arabic;
  if(name){for(const [id,ch] of chapterMap)if(ch?.name_arabic===name)return Number(id)}
  for(const line of data?.lines||[])for(const w of line.words||[])if(w.verse_key)return Number(w.verse_key.split(":")[0]);
  return 1;
}
function surahIdFromMetaPage(p){
  p=Number(p);let best=1,bestStart=0;
  for(const [id,ch] of chapterMap){
    const from=Number(ch?.pages?.[0]),to=Number(ch?.pages?.[1]);
    if(from<=p&&p<=to&&from>=bestStart){best=Number(id);bestStart=from}
  }
  return best;
}
async function pageDisplayInfo(p){
  p=Number(p);let data=pages.get(p)||null;
  if(!data)try{data=await getPageData(p)}catch(_){}
  const sid=data?surahIdFromPageData(data):surahIdFromMetaPage(p);
  return {page:p,juz:juzForPage(p),surah:sid,sname:chapterMap.get(sid)?.name_arabic||data?.surahs?.[0]?.name_arabic||""};
}
async function ensurePage(p){
  p=Number(p);if(!Number.isFinite(p)||p<1||p>TOTAL_PAGES)return null;
  const root=document.querySelector(`.page[data-page="${p}"]`);
  if(root?.dataset.loaded==="1"&&pages.has(p))return touchPageData(p,pages.get(p));
  if(pageLoads.has(p))return pageLoads.get(p);
  const job=(async()=>{
    const data=await getPageData(p);
    await ensureQcfFont(data.font);renderPage(data);return data;
  })().finally(()=>pageLoads.delete(p));
  pageLoads.set(p,job);return job;
}
async function prefetchAround(p){
  const jobs=[p-1,p+1].filter(x=>x>=1&&x<=TOTAL_PAGES).map(x=>ensurePage(x).catch(()=>null));
  await Promise.all(jobs);
}
function trimPageDom(center){
  document.querySelectorAll('.page[data-loaded="1"]').forEach(root=>{
    const p=Number(root.dataset.page);
    if(Math.abs(p-center)>2){root.innerHTML="";delete root.dataset.loaded;}
  });
  prunePageDataCache(center);
}
async function getVersePage(k){
  try{
    const idx=await loadVerseIndex(),p=Number(idx?.[k]?.page);
    return p>=1&&p<=TOTAL_PAGES?p:null;
  }catch(_){return null}
}

function groupLineWords(words){
  const groups=[];let g=null;
  for(const w of words){
    const key=w.verse_key||null;
    if(key && g && g.key===key){g.words.push(w)}
    else {g={key,words:[w]};groups.push(g)}
  }
  return groups;
}

function makeWord(w){
  const s=document.createElement("span");
  s.className="word"+(w.type==="end"?" end":"")+(isAllah(w.text)?" allah":"");
  s.textContent=w.char;
  s.dataset.text=w.text||"";
  return s;
}

function makeVerseSegment(group){
  const seg=document.createElement("span");
  seg.className="verse-segment";
  if(group.key)seg.dataset.key=group.key;
  for(const w of group.words)seg.appendChild(makeWord(w));
  if(group.key)bindSegment(seg);
  return seg;
}

function surahIdForHeader(data,lineIndex){
  for(let i=lineIndex+1;i<(data.lines||[]).length;i++){
    for(const w of (data.lines[i].words||[])){
      if(w.verse_key){const n=Number(String(w.verse_key).split(":")[0]);if(n)return n}
    }
  }
  const fallback=Number(data.lines?.[lineIndex]?.words?.[0]?.sura||data.lines?.[lineIndex]?.words?.[0]?.surah||0);
  return fallback||Number(data.surahs?.[0]?.id||0);
}

function renderPage(data){
  const root=document.querySelector(`.page[data-page="${data.page}"]`);
  const surahId=surahIdFromPageData(data),juz=juzForPage(data.page);
  root.dataset.loaded="1";
  root.innerHTML=`<div class="page-meta"><button class="page-meta-link" type="button" data-index-tab="s" aria-label="فتح فهرس السور">سورة ${escapeHtml(chapterMap.get(surahId)?.name_arabic||data.surahs[0]?.name_arabic||"")}</button><button class="page-meta-link" type="button" data-index-tab="j" aria-label="فتح فهرس الأجزاء">الجزء ${ar(juz)}</button></div>
    <div class="page-stage ${data.page<=2?"special":"full"}"><div class="mushaf" id="mushaf-${data.page}"></div></div>
    <div class="page-no">${ar(data.page)}</div><div class="qcf-mark">QCF4 · 1441هـ</div>`;
  root.querySelectorAll(".page-meta-link").forEach(btn=>btn.addEventListener("click",e=>{
    e.stopPropagation();
    openQuranIndex(btn.dataset.indexTab||"s");
  }));

  const host=root.querySelector(".mushaf");
  for(let lineIndex=0;lineIndex<data.lines.length;lineIndex++){
    const line=data.lines[lineIndex];
    const lineEl=document.createElement("div");
    lineEl.className="line";
    const inner=document.createElement("div");
    inner.className="line-inner";

    const first=line.words[0];
    inner.style.fontFamily=`"${data.font||"QCF4_Hafs_01"}"`;
    if(first?.type==="surah_header"){
      const sid=surahIdForHeader(data,lineIndex);
      inner.classList.add("surah-line");
      inner.style.fontFamily='"QCF4_QBSML"';
      const glyph=SURAH_HEADER_GLYPHS[sid];
      if(surahHeaderReady&&glyph){
        inner.classList.add("banner-ready");
        const metric=document.createElement("span");
        metric.className="surah-metric";metric.textContent=first.char;
        const banner=document.createElement("canvas");
        banner.className="surah-banner";banner.dataset.glyph=glyph;
        inner.append(metric,banner);
      }else{
        inner.textContent=first.char;
      }
      inner.setAttribute("aria-label",`سورة ${chapterMap.get(sid)?.name_arabic||""}`);
      lineEl.appendChild(inner);host.appendChild(lineEl);continue;
    }
    if(first?.type==="bismillah"){
      inner.classList.add("bismillah-line");
      // QCF4 encodes the Bismillah with the dedicated Hafs_01 glyph font.
      // Do not inherit the current page font (e.g. Hafs_47), otherwise the
      // glyph becomes blank on later pages. The source data itself omits the
      // Bismillah before At-Tawbah, so the Mushaf convention is preserved.
      inner.style.fontFamily=`"${first.font||"QCF4_Hafs_01"}"`;
      const originalBasm=document.createElement("span");
      originalBasm.className="bismillah-original";
      originalBasm.textContent=first.char;
      const desktopBasm=document.createElement("span");
      desktopBasm.className="bismillah-desktop";
      /* محرف مثبّت من منطقة الاستعمال الخاص، فيلزمه خطّه صراحةً. لو ورث خط
         الصفحة (Hafs_47 مثلًا) لخرج فارغًا، وهي العلّة التي عولجت أعلاه
         للبسملة الأصلية ولم تُعالَج لهذه. */
      desktopBasm.style.fontFamily='"QCF4_Hafs_01"';
      desktopBasm.textContent="";
      inner.append(originalBasm,desktopBasm);
      lineEl.appendChild(inner);host.appendChild(lineEl);continue;
    }

    for(const group of groupLineWords(line.words)) inner.appendChild(makeVerseSegment(group));
    lineEl.appendChild(inner);host.appendChild(lineEl);
  }

  if(selectedKey)root.querySelectorAll(`.verse-segment[data-key="${selectedKey}"]`).forEach(x=>x.classList.add("selected"));
  requestAnimationFrame(()=>fitPage(data.page));
}

function renderSurahHeaderCanvas(canvas,glyph){
  if(!canvas||!glyph)return;
  const sample=260;
  const probe=document.createElement("canvas").getContext("2d");
  probe.font=`${sample}px "QUL_SurahHeader"`;
  probe.textAlign="left";probe.textBaseline="alphabetic";
  const m=probe.measureText(glyph);
  const left=Number.isFinite(m.actualBoundingBoxLeft)?m.actualBoundingBoxLeft:0;
  const right=Number.isFinite(m.actualBoundingBoxRight)?m.actualBoundingBoxRight:m.width;
  const asc=Number.isFinite(m.actualBoundingBoxAscent)?m.actualBoundingBoxAscent:sample*.72;
  const desc=Number.isFinite(m.actualBoundingBoxDescent)?m.actualBoundingBoxDescent:sample*.18;
  const inkW=Math.max(1,left+right),inkH=Math.max(1,asc+desc);
  const pad=Math.max(5,Math.round(sample*.025));
  const dpr=Math.min(window.devicePixelRatio||1,2);
  const cssW=inkW+pad*2,cssH=inkH+pad*2;
  canvas.width=Math.ceil(cssW*dpr);canvas.height=Math.ceil(cssH*dpr);
  canvas.style.aspectRatio=`${cssW}/${cssH}`;
  const ctx=canvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.font=`${sample}px "QUL_SurahHeader"`;
  ctx.textAlign="left";ctx.textBaseline="alphabetic";
  // Draw the ready-made color glyph first, then tint only its visible pixels
  // to a calm theme-aware tone. This keeps the professional artwork while
  // avoiding the bright turquoise look in dark mode.
  ctx.fillText(glyph,pad+left,pad+asc);
  ctx.globalCompositeOperation="source-in";
  ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue("--surah-banner").trim()||"#55766D";
  ctx.fillRect(0,0,cssW,cssH);
  ctx.globalCompositeOperation="source-over";
}

/* نسبةُ الإطار الزخرفي للسورة، تُقاس من الخط لا من الرسم، فتُعرف قبل الملاءمة.
   الرسم نفسه يقع بعد تحديد المقياس، ولا يصلح مصدرًا لقرارٍ يسبقه. */
const surahAspectCache=new Map();
function surahGlyphAspect(glyph){
  if(surahAspectCache.has(glyph))return surahAspectCache.get(glyph);
  const sample=260;
  const probe=document.createElement("canvas").getContext("2d");
  probe.font=`${sample}px "QUL_SurahHeader"`;
  probe.textAlign="left";probe.textBaseline="alphabetic";
  const m=probe.measureText(glyph);
  const left=Number.isFinite(m.actualBoundingBoxLeft)?m.actualBoundingBoxLeft:0;
  const right=Number.isFinite(m.actualBoundingBoxRight)?m.actualBoundingBoxRight:m.width;
  const asc=Number.isFinite(m.actualBoundingBoxAscent)?m.actualBoundingBoxAscent:sample*.72;
  const desc=Number.isFinite(m.actualBoundingBoxDescent)?m.actualBoundingBoxDescent:sample*.18;
  const pad=Math.max(5,Math.round(sample*.025));
  const w=Math.max(1,left+right)+pad*2,h=Math.max(1,asc+desc)+pad*2;
  const aspect=w/h;
  /* لا يُخزَّن قياسٌ أُخذ قبل وصول الخط، وإلا ثبت الخطأ إلى آخر الجلسة.
     ويُسأل عن المحرف نفسه: الفحص بلا نصّ يجرّب محارف لاتينية لا وجود لها
     في خطّ العناوين، فيأتي الجواب بالنفي ولو كان الخط حاضرًا. */
  let ready=surahHeaderReady;
  try{if(ready&&document.fonts)ready=document.fonts.check(`${sample}px "QUL_SurahHeader"`,glyph)}catch(e){}
  if(ready&&aspect>0)surahAspectCache.set(glyph,aspect);
  return aspect;
}

/* حبر QCF4 يتجاوز صندوق سطره صعودًا ونزولًا: الشدّة والمدّة تعلوان الصندوق،
   وأرقام الآيات وعلامات الوقف تنزل تحته. وقياس الصناديق لا يرى هذا الحبر،
   فتُحجز له حاشيةٌ في طرفَي الصفحة، مقدارها جزء من ارتفاع السطر الواحد.
   ولمّا كانت الحاشية تُضاف إلى قيد الارتفاع وحده، فهي لا تمسّ صفحةً يحكمها
   العرض — وهي عامّة الصفحات. أثرها محصور في الصفحات المزدحمة بالعناوين. */
const INK_GUARD=.45;

/* أدنى حجم يُقبل به للسطر القرآني، بالبكسل المنطقي، قبل أن تُفتح الصفحة
   للتمرير. اجعله 0 لتعطيل الأرضية والعودة إلى الملاءمة الهندسية المحضة،
   وارفعه إن آثرتَ خطًّا أكبر مع تمرير على صفحةٍ كاملة بخطٍّ أصغر. */
const MIN_LINE_PX=24;

/* الصفحة لا تُكسر من أجل الأرضية إلا إذا كان المكسب معتبرًا. كسرُها لتربح
   جزءًا من بكسل صفقةٌ خاسرة: تخسر الصفحةَ كاملةً وتكسب ما لا يكاد يُرى. */
const FLOOR_TOLERANCE=.90;

const pageFitJobs=new WeakMap();
function fitPage(p){
  const root=document.querySelector(`.page[data-page="${p}"]`);
  if(!root)return;
  const stage=root.querySelector(".page-stage"),host=root.querySelector(".mushaf");
  if(!stage||!host)return;
  const normal=[...host.querySelectorAll(".line-inner:not(.surah-line):not(.bismillah-line)")];
  if(!normal.length)return;

  // Preserve the stable QCF4 composition first. Surah banners are overlays and
  // are deliberately excluded from the Quran text fit; they can never shrink ayat.
  const base=p<=2?112:104;
  const surahBase=p<=2?116:108;
  const basBase=p<=2?102:96;

  const surahs=[...host.querySelectorAll(".surah-line")];
  const bases=[...host.querySelectorAll(".bismillah-line")];
  const job={};
  pageFitJobs.set(root,job);
  const isCurrent=()=>pageFitJobs.get(root)===job&&root.isConnected&&root.querySelector(".mushaf")===host;

  requestAnimationFrame(()=>{
    if(!isCurrent()||stage.clientWidth<=0||stage.clientHeight<=0)return;
    // Reset and measure in the same frame. Superseded fits must never measure
    // a previous fit's scaled text as though it still had the base font size.
    normal.forEach(x=>x.style.fontSize=base+"px");
    surahs.forEach(x=>x.style.fontSize=surahBase+"px");
    bases.forEach(x=>x.style.fontSize=basBase+"px");
    // Always measure from a neutral layout: no scrollbar stealing width, no
    // gap calculated by a previous fit, and no reserved banner height left
    // over from one. Otherwise an earlier result pollutes rawH and the Quran
    // text shrinks a little after repeated resizes.
    stage.classList.remove("scrolls");
    host.style.justifyContent="center";
    host.style.gap="0px";
    surahs.forEach(x=>x.style.minHeight="");

    const targetW=Math.min(stage.clientWidth*.985,775);
    const targetH=stage.clientHeight*.955;
    const maxW=Math.max(...normal.map(x=>x.getBoundingClientRect().width),1);

    // Measure the actual Quran rows, not mushaf.scrollHeight. The Mushaf host is
    // deliberately height:100%, so scrollHeight mostly mirrors the viewport and
    // cannot detect when a window is wide but too short.
    const rows=[...host.children];
    const rawH=Math.max(rows.reduce((sum,row)=>{
      const inner=row.querySelector(".line-inner");
      if(!inner)return sum;
      const box=inner.getBoundingClientRect(),cs=getComputedStyle(inner);
      return sum+box.height+(parseFloat(cs.marginTop)||0)+(parseFloat(cs.marginBottom)||0);
    },0),1);

    // عنوان السورة طبقة عائمة فوق سطره، فارتفاعه الحقيقي لا يدخل في صندوق
    // ذلك السطر ولا في rawH. وهو أطول من الصندوق، لأن نسبة الإطار الجاهز
    // ليست نسبة صندوق QCF4. فإن تُرك بلا حساب وقع أمران معًا: غطّى العنوانُ
    // السطر الذي قبله، وجاءت الصفحة أطول ممّا قيس فطلبت تمريرًا لا موجب له.
    // ولمّا كان عرض الإطار متناسبًا مع المقياس، كان فائضه متناسبًا معه أيضًا،
    // فيُحسب مرة واحدة عند المقياس ١ ويُضاف إلى الارتفاع قبل حلّ المعادلة.
    const banners=[];
    let bannerExtra=0;
    surahs.forEach(line=>{
      const banner=line.querySelector("canvas.surah-banner");
      if(!banner)return;
      const aspect=surahGlyphAspect(banner.dataset.glyph);
      if(!(aspect>0))return;
      const widthAtBase=maxW*.965;
      banners.push({line,banner,aspect});
      bannerExtra+=Math.max(0,widthAtBase/aspect-line.getBoundingClientRect().height);
    });
    const pageH=rawH+bannerExtra+INK_GUARD*(normal[0].getBoundingClientRect().height||base*1.33);

    // قيد العرض لا يُخرق أبدًا: تجاوزه يقصّ السطر القرآني، وهو ما لا يُحتمل.
    // وقيد الارتفاع يُخرق عند الضرورة وحدها، فيتحوّل الأمر إلى تمرير رأسي بدل
    // خطٍّ لا يُقرأ. ولذلك تُقيَّد الأرضية بقيد العرض نفسه، ولا يُعمل بها إلا
    // حين ينزل المقاس عنها نزولًا معتبرًا.
    const wScale=Math.min(1,targetW/maxW);
    const hScale=targetH/pageH;
    const floorScale=Math.min(MIN_LINE_PX/base,wScale);
    const scale=hScale<floorScale*FLOOR_TOLERANCE?floorScale:Math.min(wScale,hScale);
    const overflows=scale>hScale+1e-4;

    // Exactly the same page scale is applied to Quran lines, QCF title metrics,
    // and basmala. The decorative banner itself is fitted only afterwards.
    normal.forEach(x=>x.style.fontSize=(base*scale)+"px");
    surahs.forEach(x=>x.style.fontSize=(surahBase*scale)+"px");
    bases.forEach(x=>x.style.fontSize=(basBase*scale)+"px");

    // كل عنوان يحجز ارتفاعه على سطره، فلا يبقى تراكبٌ ممكنًا بحال.
    banners.forEach(({line,banner,aspect})=>{
      const w=Math.min(maxW*scale*.965,host.clientWidth*.96);
      banner.style.width=w+"px";
      line.style.minHeight=(w/aspect)+"px";
    });

    // مركزةُ محتوًى فائضٍ تجعل أعلاه غير قابل للوصول، فيبدأ من الأعلى حينئذٍ.
    // وعند الخروج من التمرير الطارئ يُصفَّر الموضع صراحةً: المسرح يعود إلى
    // overflow:hidden وهو لا يزال حاوية تمرير برمجيًّا، فقد يبقى فيه إزاحةٌ
    // لا سبيل للقارئ إلى ردّها. ولا يُمسّ الموضع ما دامت الصفحة في التمرير،
    // فلا يُقذف القارئ إلى أوّلها كلّما غُيّر حجم النافذة.
    stage.classList.toggle("scrolls",overflows);
    if(!overflows)stage.scrollTop=0;
    host.style.justifyContent=overflows?"flex-start":"center";

    requestAnimationFrame(()=>{
      if(!isCurrent())return;
      // Render the *visible ink* of the ready-made QUL glyph, then crop the
      // canvas to that ink. This avoids the large internal font metrics that
      // can make the decorative header look tiny. Its CSS width is
      // independent of the QCF4 line box and therefore never shrinks ayat.
      banners.forEach(({banner})=>renderSurahHeaderCanvas(banner,banner.dataset.glyph));

      if(p>=3&&!overflows&&rows.length>1){
        const rowHeight=rows.reduce((sum,row)=>sum+row.getBoundingClientRect().height,0);
        const usable=stage.clientHeight*.955;
        const spare=Math.max(0,usable-rowHeight);
        const gap=Math.max(0,Math.min(18,spare/(rows.length-1)));
        host.style.gap=gap.toFixed(2)+"px";
      }
    });
  });
}

function clearVerseContext(){
  const context=document.getElementById("readerContext");if(!context)return;
  clearTimeout(context._t);context.classList.remove("show");context.replaceChildren();context.removeAttribute("title");
}
function showVerseContext(v){
  const context=document.getElementById("readerContext");if(!context)return;
  clearTimeout(context._t);
  context.innerHTML=`<span class="context-surah">سورة ${escapeHtml(v.sname)}</span> <span class="context-ayah">الآية ${ar(v.a)}</span>`;
  context.title=`سورة ${v.sname} · الآية ${ar(v.a)}`;
  context.classList.add("show");showToolsFor(5400);
  context._t=setTimeout(clearVerseContext,5000);
}
function clearVerseSelection(){
  clearVerseContext();
  document.querySelectorAll(".verse-segment.selected").forEach(x=>x.classList.remove("selected"));
  selectedKey=null;selectedAnchor=null;closeMenu();
}
function selectVerse(k,anchor,force=false){
  if(!force && selectedKey===k){
    clearVerseSelection();
    hideTools();
    return false;
  }
  selectedKey=k;selectedAnchor=anchor||selectedAnchor;
  document.querySelectorAll(".verse-segment.selected").forEach(x=>x.classList.remove("selected"));
  document.querySelectorAll(`.verse-segment[data-key="${k}"]`).forEach(x=>x.classList.add("selected"));
  const v=verseParts(k);showVerseContext(v);
  return true;
}

function bindSegment(seg){
  let sx=0,sy=0,moved=false;
  seg.addEventListener("pointerdown",e=>{
    sx=e.clientX;sy=e.clientY;moved=false;longTriggered=false;
    clearTimeout(longTimer);
    longTimer=setTimeout(()=>{
      if(moved)return;
      longTriggered=true;clearTimeout(toolsTimer);selectVerse(seg.dataset.key,seg,true);openPrimaryMenu(seg);
    },520);
  });
  seg.addEventListener("pointermove",e=>{
    if(Math.hypot(e.clientX-sx,e.clientY-sy)>10){moved=true;clearTimeout(longTimer)}
  });
  seg.addEventListener("pointerup",e=>{
    clearTimeout(longTimer);
    if(!moved&&!longTriggered){const on=selectVerse(seg.dataset.key,seg,false);if(on)showToolsFor(2800)}
  });
  seg.addEventListener("pointercancel",()=>clearTimeout(longTimer));
}

/* ---------- paging: exactly one page per gesture ---------- */
function loadList(key){
  const x=storageJsonGet(key,[]);return Array.isArray(x)?x:[];
}
function saveList(key,list){return storageJsonSet(key,list)}
function archivePreviousVisit(item){
  if(!item||!Number.isFinite(+item.page))return;
  const key=STORAGE_KEYS.recentVisits,list=loadList(key);
  list.unshift({page:+item.page,savedAt:+item.savedAt||Date.now()});
  saveList(key,list.slice(0,3));
}
function saveLastPosition(){
  storageJsonSet(STORAGE_KEYS.lastPosition,{page:currentPage,savedAt:Date.now()});
}
function saveReaderSurface(surface,extra={}){
  storageJsonSet(STORAGE_KEYS.lastSurface,{surface,page:currentPage,savedAt:Date.now(),...extra});
}
function cleanConsumedReaderTarget(){
  try{
    const url=new URL(location.href);
    for(const key of ["home","juz","page","surah","ayah"])url.searchParams.delete(key);
    if(/^#ayah=/i.test(url.hash))url.hash="";
    history.replaceState(history.state,"",url.href);
  }catch(_){ }
}
function enterReaderSurface({consumeTarget=true,fromHome=false}={}){
  saveLastPosition();
  saveReaderSurface("reader");
  if(fromHome){readerReturnToQuranHome=true;storageSet(STORAGE_KEYS.readerParent,"quran-home")}
  if(consumeTarget)cleanConsumedReaderTarget();
}
function updatePage(animate=true,savePosition=true){
  track.style.transition=animate?"transform .31s cubic-bezier(.2,.78,.2,1)":"none";
  track.style.transform=`translateX(${-(TOTAL_PAGES-currentPage)*100}vw)`;
  document.getElementById("prevBtn").disabled=currentPage===1;
  document.getElementById("nextBtn").disabled=currentPage===TOTAL_PAGES;
  document.getElementById("desktopPrevBtn").disabled=currentPage===1;
  document.getElementById("desktopNextBtn").disabled=currentPage===TOTAL_PAGES;
  closeMenu();
  if(savePosition)saveLastPosition();
  const milestone=pageMilestoneLabel(currentPage);
  if(milestone)showNotice(milestone);
}
async function go(p){
  const target=Math.max(1,Math.min(TOTAL_PAGES,Number(p)||1));
  if(navigationBusy||target===currentPage)return;
  navigationBusy=true;
  try{
    await ensurePage(target);
    clearVerseSelection();
    currentPage=target;updatePage(true);enterReaderSurface({consumeTarget:true});
    /* لا يعود التمرير معلّقًا على نوع المؤشّر: أي صفحة قد تصير قابلة للتمرير،
       فتُفتح من أعلاها دائمًا. وهو بلا أثر على الصفحات التي تكتمل. */
    requestAnimationFrame(()=>{
      const s=document.querySelector(`.page[data-page="${target}"] .page-stage`);
      if(s)s.scrollTop=0;
    });
    prefetchAround(target).then(()=>trimPageDom(target));
  }catch(e){console.error("QCF page load failed",target,e);showToast("تعذّر تحميل الصفحة "+ar(target))}
  finally{navigationBusy=false}
}
track.addEventListener("pointerdown",e=>{
  downX=e.clientX;downY=e.clientY;swipeActive=true;
});
track.addEventListener("pointerup",e=>{
  if(!swipeActive)return;swipeActive=false;
  const dx=e.clientX-downX,dy=e.clientY-downY;
  if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy)*1.15)return;
  // Arabic book: swipe RIGHT => next page enters from LEFT.
  if(dx>0)go(currentPage+1); else go(currentPage-1);
});
track.addEventListener("pointercancel",()=>swipeActive=false);
document.getElementById("prevBtn").onclick=()=>go(currentPage-1);
document.getElementById("nextBtn").onclick=()=>go(currentPage+1);
document.getElementById("desktopPrevBtn").onclick=()=>go(currentPage-1);
document.getElementById("desktopNextBtn").onclick=()=>go(currentPage+1);

/* ---------- floating ayah menu ---------- */
function placeMenu(anchor){
  const r=anchor.getBoundingClientRect();
  const x=Math.max(128,Math.min(innerWidth-128,r.left+r.width/2));
  const y=Math.max(100,r.top);
  menu.style.left=x+"px";menu.style.top=y+"px";menu.classList.add("show");
}
function closeMenu(){menu.classList.remove("show");if(!document.body.classList.contains("hidden-tools"))showToolsFor(2800)}
function openPrimaryMenu(anchor){
  menu.innerHTML=`
    <button type="button" class="menu-btn play" data-act="listen"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7Z"/></svg><span class="menu-label">${isSurahOnly()?"استماع للسورة":"استماع"}</span></button>
    <button type="button" class="menu-btn" data-act="tafsir"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M5.333 3c2.46-.003 4.836.887 6.667 2.5V21a10.07 10.07 0 0 0-6.667-2.5c-1.562 0-2.343 0-2.688-.22a1.16 1.16 0 0 1-.424-.425C2 17.51 2 16.895 2 15.663v-9.26c0-1.428 0-2.141.549-2.72c.548-.579 1.11-.609 2.234-.668Q5.056 3 5.333 3m13.334 0A10.07 10.07 0 0 0 12 5.5V21a10.07 10.07 0 0 1 6.667-2.5c1.562 0 2.343 0 2.688-.22c.207-.133.291-.218.424-.425c.221-.345.221-.96.221-2.192v-9.26c0-1.428 0-2.141-.549-2.72s-1.11-.609-2.234-.668Q18.944 3 18.667 3"/><path d="M19 7.326a10.4 10.4 0 0 0-2 .13m2 3.55q-.166-.005-.333-.005a10.1 10.1 0 0 0-3.667.681m4 2.819q-.166-.005-.333-.005a10.1 10.1 0 0 0-3.667.68M5 7.326a10.4 10.4 0 0 1 2 .13m-2 3.55q.166-.005.333-.005A10.1 10.1 0 0 1 9 11.682m-4 2.819q.166-.005.333-.005a10.1 10.1 0 0 1 3.667.68"/></g></svg><span class="menu-label">التفسير</span></button>
    <button type="button" class="menu-btn" data-act="share"><svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.4"/><circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="19" r="2.4"/><path d="M8.2 10.9l7.6-4.7M8.2 13.1l7.6 4.7"/></svg><span class="menu-label">مشاركة</span></button>
    <button type="button" class="menu-btn" data-act="bookmark"><svg viewBox="0 0 24 24"><path d="M5 3h12l2 2v16H5Z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/></svg><span class="menu-label">حفظ</span></button>`;
  bindPrimaryMenu();placeMenu(anchor);
}
function openShareMenu(){
  menu.innerHTML=`
    <button type="button" class="menu-btn" data-share="app"><svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.4"/><circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="19" r="2.4"/><path d="M8.2 10.9l7.6-4.7M8.2 13.1l7.6 4.7"/></svg><span class="menu-label">تطبيق</span></button>
    <button type="button" class="menu-btn" data-share="copy"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg><span class="menu-label">نسخ</span></button>
    <button type="button" class="menu-btn" data-share="link"><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/></svg><span class="menu-label">الرابط</span></button>`;
  menu.querySelectorAll("[data-share]").forEach(b=>b.onclick=()=>doShare(b.dataset.share));
  if(selectedAnchor)placeMenu(selectedAnchor);
}
function openSaveMenu(){
  menu.innerHTML=`
    <button type="button" class="menu-btn wide" data-save="page"><svg viewBox="0 0 24 24"><path d="M6 3h12v19l-6-4-6 4Z"/><path d="M9 7h6"/></svg><span class="menu-label">صفحة مرجعية</span></button>
    <button type="button" class="menu-btn wide" data-save="ayah"><svg viewBox="0 0 24 24"><path d="M6.5 4.5A2.5 2.5 0 0 1 9 2h6a2.5 2.5 0 0 1 2.5 2.5V22L12 18.5 6.5 22Z"/><path d="M9 8h6M9 12h4"/></svg><span class="menu-label">آية مرجعية</span></button>`;
  menu.querySelectorAll("[data-save]").forEach(b=>b.onclick=()=>{
    const kind=b.dataset.save;closeMenu();
    if(kind==="page")savePageBookmark();else saveAyahBookmark();
  });
  if(selectedAnchor)placeMenu(selectedAnchor);
}
function bindPrimaryMenu(){
  menu.querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>{
    const a=b.dataset.act;
    if(a==="share"){openShareMenu();return}
    if(a==="bookmark"){openSaveMenu();return}
    closeMenu();
    if(a==="listen")startSelected();
    if(a==="tafsir")openTafsir();
  });
}

/* ---------- Quran text from page JSON ---------- */
function verseTextCached(k){
  const out=[];
  for(const data of pages.values())for(const line of data.lines||[])for(const w of line.words||[])
    if(w.verse_key===k&&w.type==="word"&&w.text)out.push(w.text);
  return out.join(" ");
}
function collectVerseWords(data,k,out){
  let found=false;
  for(const line of data?.lines||[])for(const w of line.words||[]){
    if(w.verse_key===k&&w.type==="word"&&w.text){out.push(w.text);found=true}
  }
  return found;
}
async function verseTextFull(k,pageHint=null){
  const out=[];
  const hinted=Number(pageHint);
  let start=null;
  if(hinted>=1&&hinted<=TOTAL_PAGES)start=Math.max(1,hinted-1);
  else{
    const indexedStart=await getVersePage(k).catch(()=>null);
    start=indexedStart||Math.max(1,currentPage-1);
  }
  // A verse can cross a Mushaf page boundary. With a page hint we also inspect
  // the previous page so copying/bookmarks still work if the selected segment
  // is a continuation and the global verse index is unavailable offline.
  let seen=false;
  for(let p=start;p<=Math.min(TOTAL_PAGES,start+3);p++){
    try{
      const data=await getPageData(p),found=collectVerseWords(data,k,out);
      if(seen&&!found)break;
      seen=seen||found;
    }catch(_){break}
  }
  return out.length?out.join(" "):verseTextCached(k);
}
function publicSurahUrl(s,ayah=null){
  const n=Number(s),u=new URL(`surah/${n}/`,new URL("./",location.href));
  const a=Number(ayah);
  if(Number.isInteger(a)&&a>=1)u.searchParams.set("ayah",String(a));
  return u.href;
}
function publicJuzUrl(j){
  const n=Number(j);
  return new URL(`juz/${n}/`,new URL("./",location.href)).href;
}
function linkFor(k){
  const [s,a]=String(k||"").split(":").map(Number);
  return publicSurahUrl(s,a);
}
function ayahFromHash(){
  const m=location.hash.match(/^#ayah=(\d{1,3}):(\d{1,3})$/);
  if(!m)return null;
  const s=Number(m[1]),a=Number(m[2]),max=Number(chapterMap.get(s)?.verses_count||0);
  return s>=1&&s<=114&&a>=1&&a<=max?`${s}:${a}`:null;
}
function readerEntryParams(){
  const q=new URLSearchParams(location.search);
  const rawCode=String(q.get("code")||"").trim().toUpperCase();
  const code=rawCode.slice(0,4);
  const juz=Number(q.get("juz")),page=Number(q.get("page"));
  const surah=Number(q.get("surah")),ayah=Number(q.get("ayah")),home=q.get("home")==="1",fromZad=q.get("from")==="zad";
  const qari=String(q.get("qari")||"").trim();
  return {
    code,
    juz:Number.isInteger(juz)&&juz>=1&&juz<=30?juz:null,
    page:Number.isInteger(page)&&page>=1&&page<=TOTAL_PAGES?page:null,
    surah:Number.isInteger(surah)&&surah>=1&&surah<=114?surah:null,
    ayah:Number.isInteger(ayah)&&ayah>=1?ayah:null,
    qari:RECITERS.some(r=>r.id===qari)?qari:null,
    autoplay:q.get("play")==="1",
    home,fromZad
  };
}
function zadReturnUrl(){
  const {code}=readerEntryParams();
  return code?`./#${encodeURIComponent(code)}`:"./?zad=1";
}
async function copyText(t,msg="تم النسخ"){
  try{
    if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(t);
    else{
      const box=document.createElement("textarea");box.value=t;box.setAttribute("readonly","");box.style.cssText="position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(box);box.select();const ok=document.execCommand("copy");box.remove();if(!ok)throw new Error("copy unavailable");
    }
    showToast(msg);
  }catch(_){showToast("تعذّر النسخ من هذا المتصفح")}
}
async function doShare(kind){
  if(!selectedKey)return;
  const v=verseParts(selectedKey),text=await verseTextFull(selectedKey,currentPage),url=linkFor(selectedKey);
  try{
    if(kind==="copy"){await copyText(text);closeMenu();return}
    if(navigator.share){
      if(kind==="app")await navigator.share({title:`سورة ${v.sname} · الآية ${v.a}`,text:`${text}\n— سورة ${v.sname}، الآية ${v.a}`,url});
      else await navigator.share({title:`سورة ${v.sname} · الآية ${v.a}`,url});
    }else await copyText(kind==="app"?`${text}\n${url}`:url,"تم نسخ المحتوى للمشاركة");
  }catch(e){if(e?.name!=="AbortError")showToast("تعذّرت المشاركة الآن")}
  closeMenu();
}
function loadPageBookmarks(){return loadList(STORAGE_KEYS.pageBookmarks)}
function loadAyahBookmarks(){
  let list=loadList(STORAGE_KEYS.ayahBookmarks);
  if(!list.length){
    const legacy=loadList(STORAGE_KEYS.legacyBookmarks).filter(x=>x&&x.verse);
    if(legacy.length){list=legacy;saveList(STORAGE_KEYS.ayahBookmarks,list)}
  }
  return list;
}
function savePageBookmark(){
  const item={page:currentPage,savedAt:Date.now()};
  const list=loadPageBookmarks().filter(x=>x.page!==currentPage);
  list.unshift(item);saveList(STORAGE_KEYS.pageBookmarks,list);
  showToast(`حُفظت الصفحة ${ar(currentPage)} كصفحة مرجعية`);
}
function saveAyahBookmark(){
  if(!selectedKey){showToast("اختر آية أولًا");return}
  const item={page:currentPage,verse:selectedKey,excerpt:firstFourWords(verseTextCached(selectedKey)),savedAt:Date.now()};
  const list=loadAyahBookmarks().filter(x=>x.verse!==selectedKey);
  list.unshift(item);saveList(STORAGE_KEYS.ayahBookmarks,list);
  showToast("حُفظت الآية كآية مرجعية");
}
function firstFourWords(text){
  const words=String(text||"").trim().split(/\s+/).filter(Boolean).slice(0,4);
  return words.length?words.join(" ")+"…":"الآية المحفوظة";
}
async function bookmarkAyahExcerpt(item){
  if(item?.excerpt)return String(item.excerpt);
  const p=Number(item?.page)||await getVersePage(item?.verse);
  try{
    if(p)await getPageData(p);
    return firstFourWords(await verseTextFull(item?.verse,p));
  }catch(_){return firstFourWords(verseTextCached(item?.verse))}
}
function openBookmarks(){
  const b=sheet("العلامات المرجعية",`<div class="bookmark-sections">
    <section class="bookmark-section ref-recent"><div class="bookmark-title"><h4>آخر المتصفحات</h4><small>آخر ٣ زيارات</small></div><div class="bookmark-list" id="recentList"></div></section>
    <section class="bookmark-section ref-pages"><div class="bookmark-title"><h4>مرجعيات الصفحات</h4></div><div class="bookmark-list" id="pageBookmarkList"></div></section>
    <section class="bookmark-section ref-ayahs"><div class="bookmark-title"><h4>مرجعيات الآيات</h4></div><div class="bookmark-list" id="ayahBookmarkList"></div></section>
  </div>`);
  const recentHost=b.querySelector("#recentList"),pageHost=b.querySelector("#pageBookmarkList"),ayahHost=b.querySelector("#ayahBookmarkList");

  async function drawRecent(){
    const list=loadList(STORAGE_KEYS.recentVisits).slice(0,3);
    if(!list.length){recentHost.innerHTML='<div class="empty-state">ستظهر هنا مواضع آخر زياراتك.</div>';return}
    recentHost.innerHTML='<div class="empty-state">تحميل المواضع…</div>';
    const rows=await Promise.all(list.map(async(x,i)=>{const info=await pageDisplayInfo(x.page);return `<div class="bookmark-row recent"><button type="button" class="bookmark-main" data-recent="${i}"><b>سورة ${escapeHtml(info.sname)}</b><small>الصفحة ${ar(info.page)} · الجزء ${ar(info.juz)}</small></button></div>`}));
    recentHost.innerHTML=rows.join("");
    recentHost.querySelectorAll("[data-recent]").forEach(btn=>btn.onclick=()=>{const x=loadList(STORAGE_KEYS.recentVisits)[+btn.dataset.recent];if(!x)return;b.remove();go(x.page)});
  }
  async function drawPages(){
    const list=loadPageBookmarks();
    if(!list.length){pageHost.innerHTML='<div class="empty-state">لا توجد صفحات مرجعية محفوظة بعد.</div>';return}
    pageHost.innerHTML='<div class="empty-state">تحميل المرجعيات…</div>';
    const rows=await Promise.all(list.map(async(x,i)=>{const info=await pageDisplayInfo(x.page);return `<div class="bookmark-row"><button type="button" class="bookmark-main" data-page-open="${i}"><b>سورة ${escapeHtml(info.sname)}</b><small>الصفحة ${ar(info.page)} · الجزء ${ar(info.juz)}</small></button><button type="button" class="bookmark-delete" data-page-del="${i}" aria-label="حذف الصفحة المرجعية">×</button></div>`}));
    pageHost.innerHTML=rows.join("");
    pageHost.querySelectorAll("[data-page-open]").forEach(btn=>btn.onclick=()=>{const x=loadPageBookmarks()[+btn.dataset.pageOpen];if(!x)return;b.remove();go(x.page)});
    pageHost.querySelectorAll("[data-page-del]").forEach(btn=>btn.onclick=e=>{e.stopPropagation();const list=loadPageBookmarks();list.splice(+btn.dataset.pageDel,1);saveList(STORAGE_KEYS.pageBookmarks,list);drawPages();showToast("حُذفت الصفحة المرجعية")});
  }
  async function drawAyahs(){
    const list=loadAyahBookmarks();
    if(!list.length){ayahHost.innerHTML='<div class="empty-state">لا توجد آيات مرجعية محفوظة بعد.</div>';return}
    ayahHost.innerHTML='<div class="empty-state">تحميل المرجعيات…</div>';
    const rows=await Promise.all(list.map(async(x,i)=>{
      const v=verseParts(x.verse),excerpt=await bookmarkAyahExcerpt(x),p=Number(x.page)||await getVersePage(x.verse),j=juzForPage(p||1);
      return `<div class="bookmark-row"><button type="button" class="bookmark-main" data-ayah-open="${i}"><b class="ayah-excerpt">${escapeHtml(excerpt)}</b><small>سورة ${escapeHtml(v.sname)} · الآية ${ar(v.a)} · الجزء ${ar(j)}</small></button><button type="button" class="bookmark-delete" data-ayah-del="${i}" aria-label="حذف الآية المرجعية">×</button></div>`;
    }));
    ayahHost.innerHTML=rows.join("");
    ayahHost.querySelectorAll("[data-ayah-open]").forEach(btn=>btn.onclick=async()=>{const x=loadAyahBookmarks()[+btn.dataset.ayahOpen];if(!x)return;b.remove();await go(x.page);const a=document.querySelector(`.page[data-page="${x.page}"] .verse-segment[data-key="${x.verse}"]`);if(a)selectVerse(x.verse,a)});
    ayahHost.querySelectorAll("[data-ayah-del]").forEach(btn=>btn.onclick=e=>{e.stopPropagation();const list=loadAyahBookmarks();list.splice(+btn.dataset.ayahDel,1);saveList(STORAGE_KEYS.ayahBookmarks,list);drawAyahs();showToast("حُذفت الآية المرجعية")});
  }
  drawRecent().catch(console.error);drawPages().catch(console.error);drawAyahs().catch(console.error);
}

/* ---------- sheets ---------- */
function sheet(title,inner){
  const b=document.createElement("div");b.className="backdrop";
  b.innerHTML=`<section class="sheet"><div class="sheethead"><h3>${escapeHtml(title)}</h3><button type="button" class="close-sheet">إغلاق</button></div>${inner}</section>`;
  b.onclick=e=>{if(e.target===b||e.target.closest(".close-sheet"))b.remove()};
  document.body.appendChild(b);return b;
}
function openAuthorInfo(){
  sheet("عن د. وهبة الزحيلي",`<div class="author-bio">
    د. وهبة الزحيلي عالم وفقيه سوري وأستاذ جامعي، عُرف بمؤلفاته في الفقه وأصوله والتفسير. ومن كتبه «التفسير الوجيز»، الذي يقدّم معاني الآيات بأسلوب مختصر وواضح.
  </div><div class="author-note">اعتمدنا في إعداد هذا النص على النسخة المصوَّرة المتاحة من الكتاب، إذ لا تتوفر نسخة رقمية رسمية منشورة على الإنترنت. وقد نُقِّح النص بعناية قدر الإمكان، لكن الخطأ وارد، وجلَّ من لا يخطئ؛ فإذا لاحظت أي خطأ أو اختلاف بين النص هنا ونص كتاب «التفسير الوجيز»، فنرجو تنبيهنا إلى ذلك.</div>`);
}
async function focusVerseForTafsir(key){
  const p=await getVersePage(key).catch(()=>null);
  if(p){
    await ensurePage(p);
    if(p!==currentPage){
      currentPage=p;updatePage(true);
      prefetchAround(p).then(()=>trimPageDom(p));
    }
  }
  let matches=[...document.querySelectorAll(`.page[data-page="${p||currentPage}"] .verse-segment[data-key="${key}"]`)];
  if(!matches.length)matches=[...document.querySelectorAll(`.verse-segment[data-key="${key}"]`)];
  document.querySelectorAll(".verse-segment.selected").forEach(x=>x.classList.remove("selected"));
  matches.forEach(x=>x.classList.add("selected"));
  selectedKey=key;selectedAnchor=matches[0]||null;
}
async function openTafsir(){
  if(!selectedKey){showToast("اختر آية أولًا");return}
  const b=sheet("التفسير الوجيز",`<div class="tafsir-view"></div>`);
  const view=b.querySelector(".tafsir-view");
  let renderRequest=0;

  async function render(key){
    const request=++renderRequest,v=verseParts(key);
    try{
      const record=await tafsirAyahRecord(key);
      if(request!==renderRequest||!b.isConnected)return;
      if(!record){showToast("لم يُعثر على تفسير هذه الآية");return}
      let fadl=null;try{fadl=await tafsirFadlForSurah(v.s)}catch(fadlErr){console.warn("tafsir fadl unavailable",fadlErr)}
      if(request!==renderRequest||!b.isConnected)return;
      const fadlHtml=fadl?`<details class="tafsir-fadl">
        <summary>${escapeHtml("فضل سورة "+v.sname)}</summary>
        <div class="tafsir-fadl-text">${escapeHtml(fadl.text||"")}</div>
      </details>`:"";
      const prev=previousAyahRef(v.s,v.a),next=nextAyahRef(v.s,v.a);
      view.innerHTML=`<div class="ref">سورة ${escapeHtml(v.sname)} · الآية ${ar(v.a)}</div>
        <div class="tafsir">${escapeHtml(record.text)}</div>
        ${fadlHtml}
        <div class="tafsir-nav">
          <button class="tafsir-nav-btn" type="button" data-tafsir-nav="prev" ${prev?"":"disabled"}>‹ الآية السابقة</button>
          <button class="tafsir-nav-btn" type="button" data-tafsir-nav="next" ${next?"":"disabled"}>الآية التالية ›</button>
        </div>
        <div class="source"><div class="source-line"><span>د. وهبة الزحيلي</span><button class="tafsir-more" type="button">اقرأ المزيد</button></div></div>`;
      const sheetEl=b.querySelector(".sheet");if(sheetEl)sheetEl.scrollTop=0;
      view.querySelector(".tafsir-more").onclick=()=>{b.remove();openAuthorInfo()};
      view.querySelectorAll("[data-tafsir-nav]").forEach(btn=>btn.onclick=async()=>{
        const ref=btn.dataset.tafsirNav==="prev"?previousAyahRef(v.s,v.a):nextAyahRef(v.s,v.a);
        if(!ref||!b.isConnected)return;
        const nextKey=`${ref.s}:${ref.a}`;
        view.querySelectorAll("[data-tafsir-nav]").forEach(x=>x.disabled=true);
        try{
          await focusVerseForTafsir(nextKey);
          if(b.isConnected)await render(nextKey);
        }catch(err){console.error(err);showToast("تعذر الانتقال إلى الآية")}
      });
    }catch(err){
      console.error(err);
      if(b.isConnected)showToast("تعذر فتح التفسير");
    }
  }

  await render(selectedKey);
}
document.getElementById("tafsirBtn").onclick=openTafsir;
document.getElementById("bookmarkBtn").onclick=openBookmarks;
const zadReturnBtn=document.getElementById("backBtn");
let zadReturnHoldTimer=null,zadReturnHeld=false;
function cancelZadReturnHold(){clearTimeout(zadReturnHoldTimer);zadReturnHoldTimer=null}
zadReturnBtn.addEventListener("pointerdown",e=>{
  if(e.pointerType==="mouse"&&e.button!==0)return;
  zadReturnHeld=false;cancelZadReturnHold();
  zadReturnHoldTimer=setTimeout(()=>{zadReturnHeld=true;showToast("العودة إلى زاد الخير");try{navigator.vibrate?.(18)}catch(_){ }},560);
});
["pointercancel","pointerleave"].forEach(type=>zadReturnBtn.addEventListener(type,cancelZadReturnHold));
zadReturnBtn.addEventListener("pointerup",e=>{
  cancelZadReturnHold();
  if(zadReturnHeld){zadReturnHeld=false;e.preventDefault();return}
  location.href=zadReturnUrl();
});
zadReturnBtn.addEventListener("contextmenu",e=>e.preventDefault());

/* ---------- Quran-style index: smooth panes + local collapsible Juz ---------- */
function revelationArabic(place){return String(place||"").toLowerCase()==="madinah"?"مدنية":"مكية"}
function juzStartPage(j){return Number(JUZ_PAGES[Math.max(0,Math.min(29,j-1))]?.[0]||1)}
function localQuarterRowsForJuz(j){
  const start=(j-1)*8;
  return LOCAL_HIZB_QUARTERS.slice(start,start+8).map((x,i)=>({
    rub:start+i+1,surah:Number(x[0]),ayah:Number(x[1]),page:Number(x[2]),phase:(start+i)%4,hizb:Math.floor((start+i)/4)+1
  }));
}
async function verseExcerptForIndex(k,p){
  if(indexExcerptCache[k])return indexExcerptCache[k];
  const data=pages.get(Number(p))||await getPageData(Number(p)),out=[];
  for(const line of data?.lines||[])for(const w of line.words||[]){
    if(w.verse_key===k&&w.type==="word"&&w.text){
      out.push(w.text);
      if(out.length>=4)break;
    }
  }
  const txt=out.length?out.slice(0,4).join(" ")+"…":"";
  if(txt){
    indexExcerptCache[k]=txt;
    scheduleIndexExcerptSave();
  }
  return txt;
}
function indexJuzSeparator(j,page,current=false){
  const el=document.createElement("div");el.className="quran-index-juz-sep"+(current?" current":"");
  el.innerHTML=`<span class="quran-index-juz-num-slot" aria-hidden="true"></span><span class="quran-index-juz-main"><b>الجزء ${ar(j)}</b><span class="quran-index-juz-page">${ar(page)}</span></span><span class="quran-index-juz-actions-slot" aria-hidden="true"></span>`;return el;
}
const HUB_PLAY_ICON='<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7Z"/></svg>';
const HUB_SHARE_ICON='<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/></svg>';
const HUB_DOWNLOAD_ICON='<svg viewBox="0 0 24 24"><path d="M12 3v11"/><path d="m8 10 4 4 4-4"/><path d="M5 18v2h14v-2"/></svg>';
const HUB_CHECK_ICON='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.2 2.2 2.2 4.9-5"/></svg>';
const AUDIO_CACHE_NAME="zad-audio-v1";
const AUDIO_OFFLINE_UNAVAILABLE="هذه السورة غير متاحة للتشغيل دون اتصال";
const MP3QURAN_READS_URL="https://mp3quran.net/api/v3/ayat_timing/reads";
const MAHER_TIMING_REV="2c71289821ff17158dfead0eb0404263c2bd0879";
const audioDownloadJobs=new Map();
let audioDownloadPreparing=false;
function audioPackageKey(s,r=reciter){return `${r.id}:${Number(s)||1}`}
function audioOfflinePackages(){const value=storageJsonGet(STORAGE_KEYS.audioOffline,{});return value&&typeof value==="object"&&!Array.isArray(value)?value:{}}
function getAudioOfflinePackage(s,r=reciter){return audioOfflinePackages()[audioPackageKey(s,r)]||null}
function putAudioOfflinePackage(pkg){const all=audioOfflinePackages();all[pkg.key]=pkg;storageJsonSet(STORAGE_KEYS.audioOffline,all)}
function removeAudioOfflinePackage(s,r=reciter){const all=audioOfflinePackages();delete all[audioPackageKey(s,r)];storageJsonSet(STORAGE_KEYS.audioOffline,all)}
async function audioPackageCached(pkg){
  if(!pkg||!Array.isArray(pkg.urls)||!pkg.urls.length||!("caches" in window))return false;
  try{
    const cache=await caches.open(AUDIO_CACHE_NAME);
    for(let i=0;i<pkg.urls.length;i+=24){
      const checks=await Promise.all(pkg.urls.slice(i,i+24).map(url=>cache.match(url,{ignoreVary:true})));
      if(checks.some(hit=>!hit))return false;
    }
    return true;
  }catch(_){return false}
}
async function isSurahAudioAvailableOffline(s,r=reciter){
  const pkg=getAudioOfflinePackage(s,r);if(!pkg)return false;
  const ok=await audioPackageCached(pkg);
  if(!ok)removeAudioOfflinePackage(s,r);
  return ok;
}
function audioDownloadTag(s,r=reciter){return `surah:${r.id}:${Number(s)||1}`}
function setAudioDownloadButton(btn,state,pct=0){
  if(!btn)return;
  btn.classList.toggle("downloaded",state==="downloaded");
  btn.classList.toggle("downloading",state==="downloading");
  btn.disabled=state==="downloading";
  if(state==="downloaded"){btn.innerHTML=HUB_CHECK_ICON;btn.setAttribute("aria-label","إدارة تنزيل السورة للاستماع دون اتصال")}
  else if(state==="downloading"){btn.textContent=`${ar(Math.max(0,Math.min(100,Number(pct)||0)))}٪`;btn.setAttribute("aria-label","جارٍ تنزيل السورة للاستماع دون اتصال")}
  else{btn.innerHTML=HUB_DOWNLOAD_ICON;btn.setAttribute("aria-label","تنزيل السورة للاستماع دون اتصال")}
}
async function buildSurahAudioPackage(s,r=reciter){
  s=Math.max(1,Math.min(114,Number(s)||1));
  const key=audioPackageKey(s,r),resources=[],ownedUrls=[],sharedUrls=[];
  const add=(url,kind="audio",owned=true)=>{if(!url)return;resources.push({url,kind});(owned?ownedUrls:sharedUrls).push(url)};
  const sourceId=ayahAudioSourceId(s,r);
  if(sourceId){
    for(let a=1;a<=maxAyah(s);a++)add(`https://everyayah.com/data/${sourceId}/${pad3(s)}${pad3(a)}.mp3`,"audio",true);
    if(r.provider==="ayah"&&r.ayahBasmalaPrelude&&s!==1&&s!==9)add(`https://everyayah.com/data/${r.everyAyahId}/001001.mp3`,"audio",false);
  }else if(r.provider==="mp3quran-timed"){
    const timed=await getMp3Timing(s,r),read=timed.read;
    const timingUrl=`https://mp3quran.net/api/v3/ayat_timing?surah=${s}&read=${read.id}`;
    const src=(read.folder_url.endsWith("/")?read.folder_url:read.folder_url+"/")+pad3(s)+".mp3";
    add(MP3QURAN_READS_URL,"support",false);add(timingUrl,"support",true);add(src,"audio",true);
  }else if(r.provider==="qul-maher"){
    const timingUrl=`https://cdn.jsdelivr.net/gh/facilitator999/quranforyunus@${MAHER_TIMING_REV}/audio/maher/timestamps/${s}.json`;
    const timed=await getMaherQulTiming(s);add(timingUrl,"support",true);add(timed.src,"audio",true);
  }else if(isSurahOnly(r)){
    add(wholeSurahAudioUrl(s,r),"audio",true);
  }else throw new Error("offline audio provider");
  const urls=[...new Set(resources.map(x=>x.url))];
  return {version:2,key,reciterId:r.id,reciterName:r.name,surah:s,urls,ownedUrls:[...new Set(ownedUrls)],sharedUrls:[...new Set(sharedUrls)],resources,downloadedAt:Date.now()};
}
async function downloadedAudioPackagesForSurah(s,verify=true){
  const out=[];
  for(const r of RECITERS){
    const pkg=getAudioOfflinePackage(s,r);if(!pkg)continue;
    if(!verify){out.push({r,pkg});continue}
    const ok=await audioPackageCached(pkg);
    if(ok)out.push({r,pkg});else removeAudioOfflinePackage(s,r);
  }
  return out;
}
/* v99 · Offline playback follows the reciter actually downloaded.
   - one downloaded reciter: use it automatically;
   - multiple downloaded reciters: the Surah play button asks which one;
   - inside the reader, keep the current reciter if it is available, otherwise
     choose from the downloaded copies instead of blocking playback. */
function activateOfflineReciter(r){
  if(!r||r.id===reciter.id)return false;
  playbackRequestId++;
  try{audio.pause();audioPreload.pause()}catch(_){ }
  activeSegment=null;activeTimingRows=null;segmentAdvancing=false;
  try{releaseAudioPreload()}catch(_){ }
  try{delete audio.dataset.source;delete audio.dataset.playMode;audio.removeAttribute("src");audio.load()}catch(_){ }
  reciter=r;
  storageJsonSet(STORAGE_KEYS.qari,reciter);
  const q=document.getElementById("panelQari");if(q)q.value=reciter.id;
  try{updatePlayer()}catch(_){ }
  return true;
}
function chooseOfflineReciterForSurah(s,rows){
  return new Promise(resolve=>{
    let settled=false;
    const finish=r=>{if(settled)return;settled=true;try{b.remove()}catch(_){ }resolve(r||null)};
    const choices=rows.map(({r})=>`<button type="button" class="audio-qari-choice" data-offline-play-qari="${escapeHtml(r.id)}"><span>${escapeHtml(r.name)}</span><small>متاح دون اتصال ✓</small></button>`).join("");
    const b=sheet("اختر القارئ",`<div class="audio-offline-prompt">هذه السورة متاحة للتشغيل دون اتصال، بصوت أكثر من قارئ. اختر القارئ الذي تود الاستماع بصوته:</div><div class="audio-qari-choices">${choices}</div>`);
    b.querySelectorAll("[data-offline-play-qari]").forEach(btn=>btn.onclick=()=>{
      const r=rows.find(x=>x.r.id===btn.dataset.offlinePlayQari)?.r||null;finish(r);
    });
    b.addEventListener("click",e=>{if(e.target===b||e.target.closest(".close-sheet"))finish(null)});
  });
}
async function ensureOfflinePlaybackReciter(s,{chooseWhenMultiple=false}={}){
  if(navigator.onLine)return true;
  const rows=await downloadedAudioPackagesForSurah(s,true);
  if(!rows.length){showToast(AUDIO_OFFLINE_UNAVAILABLE);return false}
  const current=rows.find(({r})=>r.id===reciter.id)||null;
  if(rows.length>1&&chooseWhenMultiple){
    const chosen=await chooseOfflineReciterForSurah(s,rows);if(!chosen)return false;
    activateOfflineReciter(chosen);return true;
  }
  if(current)return true;
  if(rows.length===1){
    const chosen=rows[0].r,changed=activateOfflineReciter(chosen);
    if(changed)showToast(`سيبدأ التشغيل بصوت ${chosen.name}`);
    return true;
  }
  const chosen=await chooseOfflineReciterForSurah(s,rows);if(!chosen)return false;
  activateOfflineReciter(chosen);return true;
}
async function refreshAudioDownloadButton(btn,s){
  const rows=await downloadedAudioPackagesForSurah(s,true);
  setAudioDownloadButton(btn,rows.length?"downloaded":"available");
}
async function deleteSurahAudioPackages(s,reciterIds,btn){
  const ids=new Set((reciterIds||[]).map(String));if(!ids.size)return;
  const all=audioOfflinePackages(),deleteKeys=[];
  for(const id of ids)deleteKeys.push(`${id}:${Number(s)||1}`);
  const remainingRefs=new Set();
  for(const [key,pkg] of Object.entries(all)){
    if(deleteKeys.includes(key))continue;
    for(const url of pkg?.urls||[])remainingRefs.add(url);
  }
  try{
    const cache=await caches.open(AUDIO_CACHE_NAME);
    for(const key of deleteKeys){
      const pkg=all[key];if(!pkg)continue;
      for(const url of pkg.ownedUrls||[]){if(!remainingRefs.has(url))await cache.delete(url,{ignoreVary:true})}
      delete all[key];
    }
  }catch(_){for(const key of deleteKeys)delete all[key]}
  storageJsonSet(STORAGE_KEYS.audioOffline,all);
  await refreshAudioDownloadButton(btn,s);
  showToast(ids.size>1?"حُذفت التنزيلات المحددة":"حُذف تنزيل السورة");
}
async function openDeleteSurahAudio(s,btn){
  const rows=await downloadedAudioPackagesForSurah(s,true);
  if(!rows.length){setAudioDownloadButton(btn,"available");return}
  const items=rows.map(({r})=>`<label class="audio-offline-checkrow"><input type="checkbox" value="${escapeHtml(r.id)}"><span>${escapeHtml(r.name)}</span></label>`).join("");
  const b=sheet("حذف التنزيل",`<div class="audio-offline-delete-list"><label class="audio-offline-checkrow select-all"><input type="checkbox" id="audioDeleteAll"><span>تحديد الكل</span></label>${items}</div><div class="audio-offline-actions"><button type="button" class="ok">إلغاء</button><button type="button" class="delete">حذف المحدد</button></div>`);
  const all=b.querySelector("#audioDeleteAll"),checks=[...b.querySelectorAll('.audio-offline-checkrow:not(.select-all) input[type="checkbox"]')];
  all.onchange=()=>checks.forEach(x=>x.checked=all.checked);
  checks.forEach(x=>x.onchange=()=>{all.checked=checks.length>0&&checks.every(c=>c.checked);all.indeterminate=checks.some(c=>c.checked)&&!all.checked});
  b.querySelector(".ok").onclick=()=>b.remove();
  b.querySelector(".delete").onclick=async()=>{
    const selected=checks.filter(x=>x.checked).map(x=>x.value);
    if(!selected.length){showToast("اختر قارئًا واحدًا على الأقل");return}
    b.remove();await deleteSurahAudioPackages(s,selected,btn);
  };
}
async function openDownloadedSurahAudio(s,btn){
  const rows=await downloadedAudioPackagesForSurah(s,true);
  if(!rows.length){setAudioDownloadButton(btn,"available");return openAudioDownloadPicker(s,btn)}
  const names=rows.map(({r})=>`<li>${escapeHtml(r.name)}</li>`).join("");
  const more=rows.length<RECITERS.length?'<button type="button" class="audio-offline-more">تنزيل بصوت قارئ آخر</button>':"";
  const b=sheet("التشغيل دون اتصال",`<div class="audio-offline-message">هذه السورة متاحة للتشغيل دون اتصال، بصوت القارئ:<ul>${names}</ul>${more}</div><div class="audio-offline-actions"><button type="button" class="ok">حسنًا</button><button type="button" class="delete">حذف</button></div>`);
  b.querySelector(".ok").onclick=()=>b.remove();
  b.querySelector(".delete").onclick=()=>{b.remove();openDeleteSurahAudio(s,btn)};
  const moreBtn=b.querySelector(".audio-offline-more");if(moreBtn)moreBtn.onclick=()=>{b.remove();openAudioDownloadPicker(s,btn)};
}
async function openAudioDownloadPicker(s,btn){
  if(!navigator.onLine){showToast("يلزم الاتصال بالإنترنت لتنزيل السورة");return}
  if(audioDownloadPreparing||audioDownloadJobs.size){showToast("انتظر اكتمال تنزيل السورة الحالية");return}
  const downloaded=await downloadedAudioPackagesForSurah(s,true),have=new Set(downloaded.map(x=>x.r.id));
  const rows=RECITERS.map(r=>`<button type="button" class="audio-qari-choice${have.has(r.id)?" downloaded":""}" data-qari="${escapeHtml(r.id)}"><span>${escapeHtml(r.name)}</span>${have.has(r.id)?'<small>متاح دون اتصال ✓</small>':""}</button>`).join("");
  const b=sheet("تنزيل السورة",`<div class="audio-offline-prompt">بصوت أي قارئ تود تنزيل هذه السورة؟</div><div class="audio-qari-choices">${rows}</div>`);
  b.querySelectorAll("[data-qari]").forEach(x=>x.onclick=async()=>{
    const r=RECITERS.find(q=>q.id===x.dataset.qari);if(!r)return;
    if(have.has(r.id)){showToast("هذه النسخة متاحة بالفعل دون اتصال");return}
    b.remove();await downloadSurahAudio(s,btn,r);
  });
}
async function downloadSurahAudio(s,btn,r=reciter){
  if(!navigator.onLine){showToast("يلزم الاتصال بالإنترنت لتنزيل السورة");return}
  if(audioDownloadPreparing||audioDownloadJobs.size){showToast("انتظر اكتمال تنزيل السورة الحالية");return}
  const existing=getAudioOfflinePackage(s,r);
  if(existing&&await audioPackageCached(existing)){await openDownloadedSurahAudio(s,btn);return}
  setAudioDownloadButton(btn,"downloading",0);audioDownloadPreparing=true;
  try{
    const pkg=await buildSurahAudioPackage(s,r),tag=audioDownloadTag(s,r);
    const reg=await navigator.serviceWorker?.ready,worker=reg&&(reg.active||reg.waiting||reg.installing);
    if(!worker)throw new Error("service worker");
    audioDownloadJobs.set(tag,{s,btn,pkg,r});
    worker.postMessage({type:"CACHE_AUDIO_PACKAGE",resources:pkg.resources,tag});
    showToast(`جارٍ تنزيل سورة ${chapterMap.get(Number(s))?.name_arabic||ar(s)} بصوت ${r.name}`);
  }catch(e){console.error(e);await refreshAudioDownloadButton(btn,s);showToast("تعذّر بدء تنزيل السورة الآن")}
  finally{audioDownloadPreparing=false}
}
function bindSurahDownloadButton(btn,s){
  btn.dataset.audioDownload=String(s);setAudioDownloadButton(btn,"available");
  btn.onclick=async()=>{const rows=await downloadedAudioPackagesForSurah(s,true);if(rows.length)await openDownloadedSurahAudio(s,btn);else await openAudioDownloadPicker(s,btn)};
  refreshAudioDownloadButton(btn,s).catch(()=>{});
}
let quranSearchIndex=storageJsonGet(STORAGE_KEYS.searchIndex,null);
if(!Array.isArray(quranSearchIndex))quranSearchIndex=null;
let quranSearchBuildPromise=null;
async function buildQuranSearchIndex(onProgress=()=>{}){
  if(quranSearchIndex)return quranSearchIndex;
  if(quranSearchBuildPromise)return quranSearchBuildPromise;
  quranSearchBuildPromise=(async()=>{
    const verses=new Map();
    for(let from=1;from<=TOTAL_PAGES;from+=8){
      const nums=[];for(let p=from;p<from+8&&p<=TOTAL_PAGES;p++)nums.push(p);
      const batch=await Promise.all(nums.map(p=>getPageData(p)));
      for(const data of batch){
        for(const line of data?.lines||[])for(const w of line.words||[]){
          if(w.type!=="word"||!w.verse_key||!w.text)continue;
          let item=verses.get(w.verse_key);
          if(!item){const v=verseParts(w.verse_key);item={key:w.verse_key,s:v.s,a:v.a,page:Number(data.page)||1,text:""};verses.set(w.verse_key,item)}
          item.text+=(item.text?" ":"")+w.text;
        }
      }
      onProgress(Math.min(TOTAL_PAGES,from+nums.length-1),TOTAL_PAGES);
      await new Promise(r=>setTimeout(r,0));
    }
    quranSearchIndex=[...verses.values()].sort((a,b)=>a.s-b.s||a.a-b.a);
    storageJsonSet(STORAGE_KEYS.searchIndex,quranSearchIndex);
    return quranSearchIndex;
  })().finally(()=>{quranSearchBuildPromise=null});
  return quranSearchBuildPromise;
}
async function openQuranSearch(){
  const b=sheet("البحث في القرآن",`<div class="quran-search-wrap"><input class="quran-search-input" id="quranSearchInput" type="search" inputmode="search" autocomplete="off" placeholder="اكتب كلمة أو عبارة…" aria-label="البحث في القرآن"><div class="quran-search-status" id="quranSearchStatus">اكتب حرفين على الأقل.</div><div class="quran-search-results" id="quranSearchResults"></div></div>`);
  const input=b.querySelector("#quranSearchInput"),status=b.querySelector("#quranSearchStatus"),results=b.querySelector("#quranSearchResults");
  let token=0;
  async function run(){
    const mine=++token,q=normalizeArabic(input.value.trim());results.replaceChildren();
    if(q.length<2){status.textContent="اكتب حرفين على الأقل.";return}
    if(!quranSearchIndex){status.textContent="جاري تجهيز البحث لأول مرة…"}
    let index;
    try{index=await buildQuranSearchIndex((p,total)=>{if(mine===token)status.textContent=`تجهيز البحث… ${ar(Math.round(p/total*100))}٪`})}
    catch(_){if(mine===token)status.textContent="تعذر تجهيز البحث الآن.";return}
    if(mine!==token)return;
    const matches=[];
    for(const item of index){
      if(normalizeArabic(item.text).includes(q)){matches.push(item);if(matches.length>=80)break}
    }
    status.textContent=matches.length?`${ar(matches.length)} نتيجة${matches.length>=80?" أولى":""}`:"لا توجد نتائج.";
    const frag=document.createDocumentFragment();
    for(const item of matches){
      const btn=document.createElement("button");btn.type="button";btn.className="quran-search-result";
      btn.innerHTML=`<b>${escapeHtml(item.text)}</b><small>سورة ${escapeHtml(chapterMap.get(item.s)?.name_arabic||ar(item.s))} · الآية ${ar(item.a)} · الصفحة ${ar(item.page)}</small>`;
      btn.onclick=async()=>{b.remove();const hp=document.querySelector(".quran-index");if(hp?.dataset.homeMode==="1")readerReturnToQuranHome=true;hp?.remove();await go(item.page);await ensurePage(item.page);const a=document.querySelector(`.page[data-page="${item.page}"] .verse-segment[data-key="${item.key}"]`);if(a)selectVerse(item.key,a,true)};
      frag.appendChild(btn);
    }
    results.appendChild(frag);
  }
  let timer=0;input.addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(run,180)});setTimeout(()=>input.focus(),80);
}
function openReaderJump(closeHub=()=>{}){
  const currentChapter=[...chapterMap.values()].find(ch=>currentPage>=Number(ch.pages?.[0]||1)&&currentPage<=Number(ch.pages?.[1]||1));
  const initialS=Number(currentChapter?.id)||Number(play.surah)||1;
  const b=sheet("انتقل إلى",`<div class="settings"><div class="field"><label>السورة</label><select id="readerJumpSurah">${playerSurahOptions(initialS)}</select></div><div class="field"><label>الآية</label><select id="readerJumpAyah">${opts(maxAyah(initialS),1)}</select></div><button type="button" class="apply" id="applyReaderJump">انتقال</button></div>`);
  const ss=b.querySelector("#readerJumpSurah"),aa=b.querySelector("#readerJumpAyah");
  ss.onchange=()=>{aa.innerHTML=opts(maxAyah(Number(ss.value)||1),1)};
  b.querySelector("#applyReaderJump").onclick=async()=>{
    const s=Number(ss.value)||1,a=Number(aa.value)||1,key=`${s}:${a}`;const p=await getVersePage(key);
    b.remove();closeHub();if(!p)return;await go(p);await ensurePage(p);const anchor=document.querySelector(`.page[data-page="${p}"] .verse-segment[data-key="${key}"]`);if(anchor)selectVerse(key,anchor,true);
  };
}
async function shareHubPayload(payload){
  try{if(navigator.share)await navigator.share({title:payload.title,url:payload.url});else await copyText(payload.url,"تم نسخ رابط المشاركة")}
  catch(e){if(e?.name!=="AbortError")showToast("تعذّرت المشاركة الآن")}
}
function setIndexPlaybackBoundary(stop){detachQueue();if(stop)repeatMode="off";continuousStopRef=stop||null}
async function playSurahFromHub(s,closeHub){
  s=Number(s)||1;
  if(!navigator.onLine&&!await ensureOfflinePlaybackReciter(s,{chooseWhenMultiple:true}))return;
  setIndexPlaybackBoundary(null);
  continuousMode=true;storageSet(STORAGE_KEYS.continuous,"1");
  play={surah:s,from:1,to:1,current:1,repeatAyah:1,repeatAyahLeft:1,repeatGroup:1,repeatGroupLeft:1,repeatSurah:1,repeatSurahLeft:1,speed:play.speed||1};
  pendingSurahBasmala=(s!==1&&s!==9);basmalaFallbackTarget=null;
  closeHub();const p=Number(chapterMap.get(s)?.pages?.[0]||1);await go(p);await playCurrent(true);
}
function prepareSurahFromDeepLink(s){
  s=Number(s)||1;
  setIndexPlaybackBoundary(null);
  continuousMode=true;storageSet(STORAGE_KEYS.continuous,"1");
  play={surah:s,from:1,to:1,current:1,repeatAyah:1,repeatAyahLeft:1,repeatGroup:1,repeatGroupLeft:1,repeatSurah:1,repeatSurahLeft:1,speed:play.speed||1};
  pendingSurahBasmala=(s!==1&&s!==9);basmalaFallbackTarget=null;
  updatePlayer();showPlayer(true);
  setTimeout(()=>showToast(`اضغط تشغيل للاستماع بصوت ${reciter.name}`),220);
}
async function playJuzFromHub(j,closeHub){
  if(isSurahOnly()){showToast("تشغيل الجزء يحتاج قارئاً يدعم تحديد الآيات. يمكنك اختيار سورة كاملة بهذا الصوت.");return}
  j=Math.max(1,Math.min(30,Number(j)||1));const start=LOCAL_HIZB_QUARTERS[(j-1)*8];
  const next=j<30?LOCAL_HIZB_QUARTERS[j*8]:null;const stop=next?previousAyahRef(Number(next[0]),Number(next[1])):{s:114,a:maxAyah(114)};
  setIndexPlaybackBoundary(stop);continuousMode=true;storageSet(STORAGE_KEYS.continuous,"1");
  play={surah:Number(start[0]),from:Number(start[1]),to:Number(start[1]),current:Number(start[1]),repeatAyah:1,repeatAyahLeft:1,repeatGroup:1,repeatGroupLeft:1,repeatSurah:1,repeatSurahLeft:1,speed:play.speed||1};
  closeHub();await go(Number(start[2]));await playCurrent(true);
}
function openQuranHubMenu(closeHub){
  const dark=document.documentElement.dataset.theme==="dark";
  const themeIcon=dark
    ?'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M2 12h2M20 12h2M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5"/></svg>'
    :'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z"/></svg>';
  const arrow='<span class="quran-option-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m14 6-6 6 6 6"/></svg></span>';
  const b=sheet("خيارات",`<div class="quran-options-intro">إعدادات سريعة للقارئ</div><div class="quran-hub-menu">
    <button type="button" data-hub="jump"><span class="quran-option-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h10M5 12h7M5 18h10"/><path d="m16 10 3 2-3 2"/></svg></span><span class="quran-option-copy"><strong>انتقل إلى</strong><small>سورة وآية</small></span>${arrow}</button>
    <button type="button" data-hub="theme"><span class="quran-option-icon gold">${themeIcon}</span><span class="quran-option-copy"><strong>${dark?"الوضع النهاري":"الوضع الليلي"}</strong><small>تغيير مظهر القارئ</small></span>${arrow}</button>
    <button type="button" data-hub="guide"><span class="quran-option-icon gold"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="4"/><path d="m10 8 6 4-6 4Z"/></svg></span><span class="quran-option-copy"><strong>دليل مشغّل التلاوة</strong><small>شاهد الشرح بالفيديو · يتطلب الإنترنت</small></span>${arrow}</button>
    <button type="button" data-hub="zad"><span class="quran-option-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11.2 12 4l8.5 7.2"/><path d="M5.5 9.7V20h13V9.7M9.5 20v-5.5h5V20"/></svg></span><span class="quran-option-copy"><strong>زاد الخير</strong><small>العودة إلى الختمات الجماعية</small></span>${arrow}</button>
  </div>`);
  b.querySelector(".sheet")?.classList.add("quran-options-sheet");
  b.querySelector('[data-hub="jump"]').onclick=()=>{b.remove();openReaderJump(closeHub)};
  b.querySelector('[data-hub="theme"]').onclick=()=>{setTheme(dark?"light":"dark");b.remove()};
  b.querySelector('[data-hub="guide"]').onclick=()=>{location.href="/quran/player-guide/"};
  b.querySelector('[data-hub="zad"]').onclick=()=>{location.href=zadReturnUrl()};
}
function openQuranIndex(initialTab="s",options={}){
  document.querySelector(".quran-index")?.remove();
  const homeMode=!!options.home,fromReader=!homeMode;
  if(homeMode)saveReaderSurface("quran-home",{tab:initialTab});
  const panel=document.createElement("section");panel.className="quran-index";panel.setAttribute("aria-label","القرآن العظيم");panel.dataset.homeMode=homeMode?"1":"0";
  const firstIcon=homeMode?'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m19.648 5.437-.659-1.043c-.364-.577-.546-.866-.785-.892-.238-.027-.505.247-1.038.795-1.722 1.77-3.444 1.508-5.166 4.691-1.722-3.183-3.444-2.921-5.166-4.691-.533-.548-.8-.822-1.038-.795-.239.026-.421.315-.785.892l-.658 1.043c-.255.402-.382.604-.347.816.034.212.217.357.584.647l6.182 4.898c.591.468.887.702 1.228.702s.637-.234 1.228-.702L19.41 6.9c.367-.29.55-.435.584-.647.035-.212-.092-.414-.346-.816M22 8.5l-16 12v-4.696M2 8.5l16 12v-4.696"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l7 7-7 7"/></svg>';
  panel.innerHTML=`<div class="quran-index-head"><div class="quran-index-title">القرآن العظيم</div><div class="quran-index-head-actions"><button class="quran-index-head-action" type="button" data-hub-action="resume" aria-label="${homeMode?"متابعة القراءة":"العودة إلى المصحف"}">${firstIcon}</button><button class="quran-index-head-action" type="button" data-hub-action="search" aria-label="البحث"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg></button><button class="quran-index-head-action" type="button" data-hub-action="more" aria-label="المزيد"><svg viewBox="0 0 24 24" aria-hidden="true" class="quran-more-icon"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg></button></div></div>
    <div class="quran-index-tabs" role="tablist"><button class="quran-index-tab active" type="button" data-tab="s">السور</button><button class="quran-index-tab" type="button" data-tab="j">الأجزاء</button><button class="quran-index-tab" type="button" data-tab="m">المرجعيات</button></div>
    <div class="quran-index-viewport" id="quranIndexViewport"><div class="quran-index-track" id="quranIndexTrack"><div class="quran-index-pane" data-pane="m"><div class="quran-index-scroll quran-index-bookmarks" id="quranBookmarkList"></div></div><div class="quran-index-pane" data-pane="j"><div class="quran-index-scroll quran-index-juz-list" id="quranJuzList"></div></div><div class="quran-index-pane" data-pane="s"><div class="quran-index-scroll" id="quranSurahList"></div></div></div></div>`;
  document.body.appendChild(panel);
  const surahHost=panel.querySelector("#quranSurahList"),juzHost=panel.querySelector("#quranJuzList"),bookmarkHost=panel.querySelector("#quranBookmarkList");
  const viewport=panel.querySelector("#quranIndexViewport"),slider=panel.querySelector("#quranIndexTrack");
  let alive=true,activeTab="",ix=0,iy=0;const close=()=>{alive=false;panel.remove()};
  const leaveHubForReader=()=>{enterReaderSurface({consumeTarget:true,fromHome:homeMode});close()};
  panel.querySelector('[data-hub-action="resume"]').onclick=leaveHubForReader;
  panel.querySelector('[data-hub-action="search"]').onclick=openQuranSearch;
  panel.querySelector('[data-hub-action="more"]').onclick=()=>openQuranHubMenu(leaveHubForReader);
  const currentJuz=()=>juzForPage(currentPage);
  function centerIndexItem(host,item){if(!host||!item)return;requestAnimationFrame(()=>{if(!alive||!host.isConnected||!item.isConnected)return;const hr=host.getBoundingClientRect(),ir=item.getBoundingClientRect(),delta=ir.top-hr.top-(host.clientHeight-ir.height)/2;host.scrollTop=Math.max(0,host.scrollTop+delta)})}
  function drawSurahs(){
    if(surahHost.dataset.ready==="1")return;const events=[];
    for(let j=1;j<=30;j++)events.push({type:"juz",page:juzStartPage(j),j,order:0});for(const ch of(qcfMeta?.chapters||[]))events.push({type:"surah",page:Number(ch.pages?.[0]||1),ch,order:1});events.sort((a,b)=>a.page-b.page||a.order-b.order||(a.ch?.id||0)-(b.ch?.id||0));
    const frag=document.createDocumentFragment();
    for(const e of events){
      if(e.type==="juz"){frag.appendChild(indexJuzSeparator(e.j,e.page,e.j===currentJuz()));continue}
      const ch=e.ch,start=e.page,end=Number(ch.pages?.[1]||start),isCurrent=currentPage>=start&&currentPage<=end,row=document.createElement("div");row.className="quran-index-row quran-index-row-with-actions"+(isCurrent?" current":"");
      row.innerHTML=`<span class="quran-index-surah-num">${ar(ch.id)}</span><button class="quran-index-row-main" type="button"><span class="quran-index-main"><span class="quran-index-name">سورة ${escapeHtml(ch.name_arabic)}</span><span class="quran-index-meta">${revelationArabic(ch.revelation_place)} - ${ar(ch.verses_count)} آية</span></span><span class="quran-index-page">${ar(start)}</span></button><span class="quran-index-actions"><button class="quran-index-action play" type="button" aria-label="تشغيل سورة ${escapeHtml(ch.name_arabic)}">${HUB_PLAY_ICON}</button><button class="quran-index-action share" type="button" aria-label="مشاركة سورة ${escapeHtml(ch.name_arabic)}">${HUB_SHARE_ICON}</button><button class="quran-index-action download" type="button" aria-label="تنزيل سورة ${escapeHtml(ch.name_arabic)} للاستماع دون اتصال">${HUB_DOWNLOAD_ICON}</button></span>`;
      row.querySelector(".quran-index-row-main").onclick=async()=>{leaveHubForReader();await go(start)};row.querySelector(".play").onclick=()=>playSurahFromHub(ch.id,leaveHubForReader);row.querySelector(".share").onclick=()=>shareHubPayload({title:`سورة ${ch.name_arabic} | زاد الخير`,url:publicSurahUrl(ch.id)});bindSurahDownloadButton(row.querySelector(".download"),ch.id);frag.appendChild(row);
    }
    surahHost.appendChild(frag);surahHost.dataset.ready="1";const current=surahHost.querySelector(".quran-index-row.current");if(current)centerIndexItem(surahHost,current);
  }
  function createQuarterRow(info){
    const key=`${info.surah}:${info.ayah}`,row=document.createElement("button");row.type="button";row.className="quran-index-row quran-index-quarter-row";row.dataset.verseKey=key;const next=LOCAL_HIZB_QUARTERS[info.rub]||null,nextPage=next?Number(next[2]):TOTAL_PAGES+1;if(currentPage>=info.page&&currentPage<nextPage)row.classList.add("current");const ringClass=info.phase===0?"start":`q${info.phase}`,cached=indexExcerptCache[key]||"";row.innerHTML=`<span class="hizb-ring ${ringClass}">${info.phase===0?ar(info.hizb):""}</span><span class="quran-index-main"><span class="quran-index-quarter-title ${cached?"":"index-excerpt-placeholder"}" data-excerpt>${escapeHtml(cached||"بداية ربع الحزب")}</span><span class="quran-index-meta">سورة ${escapeHtml(chapterMap.get(info.surah)?.name_arabic||ar(info.surah))}، آية ${ar(info.ayah)}</span></span><span class="quran-index-page">${ar(info.page)}</span>`;row.onclick=async()=>{leaveHubForReader();await go(info.page);await ensurePage(info.page);const a=document.querySelector(`.page[data-page="${info.page}"] .verse-segment[data-key="${key}"]`);if(a)selectVerse(key,a,true)};return row;
  }
  function enrichQuarterRows(rows){const work=async()=>{for(const row of rows){if(!alive||!row.isConnected)break;const key=row.dataset.verseKey;if(indexExcerptCache[key])continue;const info=row._quarterInfo,target=row.querySelector("[data-excerpt]");try{const txt=await verseExcerptForIndex(key,info.page);if(txt&&alive&&target&&target.isConnected){target.textContent=txt;target.classList.remove("index-excerpt-placeholder")}}catch(_){}}};if("requestIdleCallback" in window)requestIdleCallback(()=>work(),{timeout:700});else setTimeout(work,40)}
  function toggleJuz(section,force){const open=typeof force==="boolean"?force:!section.classList.contains("open");section.classList.toggle("open",open);section.querySelector(".juz-accordion-head-main").setAttribute("aria-expanded",open?"true":"false");const inner=section.querySelector(".juz-accordion-body-inner");if(!open){setTimeout(()=>{if(!section.classList.contains("open")){inner.replaceChildren();delete inner.dataset.ready}},280);return}if(inner.dataset.ready==="1")return;const j=Number(section.dataset.juz),rows=[],frag=document.createDocumentFragment();for(const info of localQuarterRowsForJuz(j)){const row=createQuarterRow(info);row._quarterInfo=info;rows.push(row);frag.appendChild(row)}inner.appendChild(frag);inner.dataset.ready="1";enrichQuarterRows(rows)}
  function drawJuz(){
    if(juzHost.dataset.ready==="1")return;const frag=document.createDocumentFragment(),cur=currentJuz();
    for(let j=1;j<=30;j++){const[from,to]=JUZ_PAGES[j-1],section=document.createElement("section");section.className="juz-accordion";section.dataset.juz=j;const head=document.createElement("div");head.className="juz-accordion-head-v80"+(j===cur?" current":"");head.innerHTML=`<button type="button" class="juz-accordion-head-main" aria-expanded="false"><span class="juz-accordion-title"><b>الجزء ${ar(j)}</b><small>الصفحات ${ar(from)}–${ar(to)}</small></span><span class="juz-accordion-page">${ar(from)}–${ar(to)}</span><span class="juz-accordion-chevron" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></span></button><span class="quran-index-actions"><button class="quran-index-action play" type="button" aria-label="تشغيل الجزء ${ar(j)}">${HUB_PLAY_ICON}</button><button class="quran-index-action share" type="button" aria-label="مشاركة الجزء ${ar(j)}">${HUB_SHARE_ICON}</button></span>`;const body=document.createElement("div");body.className="juz-accordion-body";body.innerHTML='<div class="juz-accordion-body-inner"></div>';head.querySelector(".juz-accordion-head-main").onclick=()=>toggleJuz(section);head.querySelector(".play").onclick=()=>playJuzFromHub(j,leaveHubForReader);head.querySelector(".share").onclick=()=>shareHubPayload({title:`الجزء ${ar(j)} | زاد الخير`,url:publicJuzUrl(j)});section.append(head,body);frag.appendChild(section)}
    juzHost.appendChild(frag);juzHost.dataset.ready="1";const current=juzHost.querySelector(".juz-accordion-head-v80.current");if(current)centerIndexItem(juzHost,current);
  }
  async function drawBookmarks(){
    if(bookmarkHost.dataset.ready==="1")return;bookmarkHost.dataset.ready="1";bookmarkHost.innerHTML='<div class="quran-bookmark-empty">تحميل المرجعيات…</div>';
    const recent=loadList(STORAGE_KEYS.recentVisits).slice(0,3),pagesList=loadPageBookmarks(),ayahs=loadAyahBookmarks();const groups=[];
    const recentRows=[];for(const x of recent){const info=await pageDisplayInfo(x.page);recentRows.push({kind:"recent",page:x.page,title:`سورة ${info.sname}`,meta:`الصفحة ${ar(info.page)} · الجزء ${ar(info.juz)}`})}groups.push(["آخر المتصفحات",recentRows]);
    const pageRows=[];for(const x of pagesList){const info=await pageDisplayInfo(x.page);pageRows.push({kind:"page",page:x.page,title:`سورة ${info.sname}`,meta:`الصفحة ${ar(info.page)} · الجزء ${ar(info.juz)}`})}groups.push(["مرجعيات الصفحات",pageRows]);
    const ayahRows=[];for(const x of ayahs){const v=verseParts(x.verse),excerpt=await bookmarkAyahExcerpt(x),p=Number(x.page)||await getVersePage(x.verse);ayahRows.push({kind:"ayah",page:p,key:x.verse,title:excerpt,meta:`سورة ${v.sname} · الآية ${ar(v.a)}`})}groups.push(["مرجعيات الآيات",ayahRows]);
    bookmarkHost.replaceChildren();
    for(const[name,rows]of groups){const sec=document.createElement("section");const refClass=name==="آخر المتصفحات"?"ref-recent":name==="مرجعيات الصفحات"?"ref-pages":"ref-ayahs";sec.className=`quran-bookmark-group ${refClass}`;sec.innerHTML=`<h4>${name}</h4>`;if(!rows.length){sec.insertAdjacentHTML("beforeend",'<div class="quran-bookmark-empty">لا توجد عناصر محفوظة.</div>')}else for(const item of rows){const row=document.createElement("div");row.className="quran-bookmark-row";row.innerHTML=`<button type="button" class="quran-bookmark-open"><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.meta)}</small></button>${item.kind==="recent"?"":'<button type="button" class="quran-bookmark-del" aria-label="حذف">×</button>'}`;row.querySelector(".quran-bookmark-open").onclick=async()=>{leaveHubForReader();await go(item.page);if(item.key){await ensurePage(item.page);const a=document.querySelector(`.page[data-page="${item.page}"] .verse-segment[data-key="${item.key}"]`);if(a)selectVerse(item.key,a,true)}};const del=row.querySelector(".quran-bookmark-del");if(del)del.onclick=()=>{if(item.kind==="page"){const list=loadPageBookmarks().filter(x=>Number(x.page)!==Number(item.page));saveList(STORAGE_KEYS.pageBookmarks,list)}else{const list=loadAyahBookmarks().filter(x=>x.verse!==item.key);saveList(STORAGE_KEYS.ayahBookmarks,list)};bookmarkHost.dataset.ready="";drawBookmarks();showToast("حُذفت المرجعية")};sec.appendChild(row)}bookmarkHost.appendChild(sec)}
  }
  function setTab(kind){if(!["s","j","m"].includes(kind)||kind===activeTab)return;activeTab=kind;if(homeMode)saveReaderSurface("quran-home",{tab:kind});panel.querySelectorAll(".quran-index-tab").forEach(x=>x.classList.toggle("active",x.dataset.tab===kind));slider.style.transform=kind==="s"?"translate3d(-66.666666%,0,0)":kind==="j"?"translate3d(-33.333333%,0,0)":"translate3d(0,0,0)";if(kind==="s")drawSurahs();else if(kind==="j")drawJuz();else drawBookmarks();viewport.scrollLeft=0}
  panel.querySelectorAll(".quran-index-tab").forEach(x=>x.onclick=()=>setTab(x.dataset.tab));viewport.addEventListener("pointerdown",e=>{ix=e.clientX;iy=e.clientY},{passive:true});viewport.addEventListener("pointerup",e=>{const dx=e.clientX-ix,dy=e.clientY-iy;if(Math.abs(dx)<52||Math.abs(dx)<Math.abs(dy)*1.25)return;if(activeTab==="s"&&dx>0)setTab("j");else if(activeTab==="j"&&dx>0)setTab("m");else if(activeTab==="m"&&dx<0)setTab("j");else if(activeTab==="j"&&dx<0)setTab("s")},{passive:true});
  setTab(["s","j","m"].includes(initialTab)?initialTab:"s");
}
document.getElementById("quranHomeBtn").onclick=()=>openQuranIndex("s",{home:false});

/* ---------- exact per-ayah audio + collapsible player ---------- */
function ayahAudioSourceId(s,r=reciter){
  if(r.provider==="ayah"&&r.everyAyahId)return r.everyAyahId;
  if(r.id==="Husary_128kbps"&&Number(s)===1&&r.fatihaEveryAyahId)return r.fatihaEveryAyahId;
  return "";
}
function audioUrl(s,a){
  const sourceId=ayahAudioSourceId(s);
  if(!sourceId)throw new Error("ayah provider unavailable");
  return `https://everyayah.com/data/${sourceId}/${pad3(s)}${pad3(a)}.mp3`;
}
function maxAyah(s){return Number(chapterMap.get(Number(s))?.verses_count)||({1:7,2:286}[Number(s)]||286)}
function compactArabic(s){return normalizeArabic(s).replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/\s+/g,"")}
async function loadTimedReads(){
  if(!mp3ReadsPromise){
    mp3ReadsPromise=fetch("https://mp3quran.net/api/v3/ayat_timing/reads",{cache:"force-cache"})
      .then(r=>{if(!r.ok)throw new Error("mp3quran reads");return r.json()})
      .then(rows=>Array.isArray(rows)?rows:[])
      .catch(err=>{mp3ReadsPromise=null;throw err});
  }
  return mp3ReadsPromise;
}
function normalizedAudioText(value){
  return compactArabic(String(value||""))
    .replace(/ة/g,"ه")
    .replace(/ؤ/g,"و")
    .replace(/ئ/g,"ي");
}
function timedReadScore(row,r){
  const n=normalizedAudioText(row?.name),rw=normalizedAudioText(row?.rewaya);
  const names=(r.timedNames||[]).map(normalizedAudioText);
  if(!names.some(x=>x&&(n.includes(x)||x.includes(n))))return -Infinity;

  const rejects=(r.timedReject||[]).map(normalizedAudioText).filter(Boolean);
  if(rejects.some(x=>rw.includes(x)))return -Infinity;

  const required=(r.timedRequireAny||[]).map(normalizedAudioText).filter(Boolean);
  if(required.length&&!required.some(x=>rw.includes(x)))return -Infinity;

  let score=100;
  for(const x of (r.timedPrefer||[]).map(normalizedAudioText).filter(Boolean)){
    if(rw.includes(x))score+=10;
  }
  // Prefer complete 114-surah mappings whenever the API exposes count.
  const count=Number(row?.soar_count)||0;
  if(count===114)score+=8;
  else if(count>0)score+=Math.min(5,count/30);
  return score;
}
async function resolveMp3Read(r=reciter){
  if(timedReadCache.has(r.id))return timedReadCache.get(r.id);
  const rows=await loadTimedReads();
  let best=null,bestScore=-Infinity;
  for(const row of rows){
    const score=timedReadScore(row,r);
    if(score>bestScore){best=row;bestScore=score}
  }
  const resolved=Number.isFinite(bestScore)&&bestScore>-Infinity?best:null;
  timedReadCache.set(r.id,resolved);
  return resolved;
}
async function getMp3Timing(s,r=reciter){
  const read=await resolveMp3Read(r);
  if(!read)throw new Error("timed reciter unavailable");
  const key=`${read.id}:${s}`;
  if(mp3TimingCache.has(key))return {read,rows:mp3TimingCache.get(key)};
  const response=await fetch(`https://mp3quran.net/api/v3/ayat_timing?surah=${s}&read=${read.id}`,{cache:"force-cache"});
  if(!response.ok)throw new Error("mp3quran timing");
  const rows=await response.json();
  if(!Array.isArray(rows)||!rows.some(x=>Number(x.ayah)>0))throw new Error("invalid mp3quran timing");
  mp3TimingCache.set(key,rows);
  return {read,rows};
}
function normalizeTimedRows(raw){
  return (Array.isArray(raw)?raw:[]).map(x=>{
    const verseKey=String(x?.verse_key||x?.verseKey||"");
    const ayah=Number(verseKey.split(":")[1]||x?.ayah||x?.verse_number||x?.verseNumber);
    const start=Number(x?.timestamp_from??x?.timestampFrom??x?.start_time);
    const end=Number(x?.timestamp_to??x?.timestampTo??x?.end_time);
    return {ayah,start_time:start,end_time:end};
  }).filter(x=>x.ayah>0&&Number.isFinite(x.start_time)&&Number.isFinite(x.end_time));
}
async function getMaherQulTiming(s){
  if(maherQulTimingCache.has(s))return maherQulTimingCache.get(s);

  // This is the already-extracted QUL /562 timestamp file used by an
  // existing open-source Quran implementation. We intentionally consume
  // the exported data as-is; no local alignment or offset correction.
  const MAHER_TIMING_REV="2c71289821ff17158dfead0eb0404263c2bd0879";
  const url=`https://cdn.jsdelivr.net/gh/facilitator999/quranforyunus@${MAHER_TIMING_REV}/audio/maher/timestamps/${s}.json`;
  const r=await fetch(url,{cache:"force-cache"});
  if(!r.ok)throw new Error(`Maher QUL timing ${r.status}`);
  const data=await r.json();
  const af=data?.audio_file||data?.audioFile||data;
  const rows=normalizeTimedRows(af?.timestamps||data?.timestamps);
  if(!rows.length)throw new Error("invalid Maher QUL timing");

  const src=`https://audio-cdn.tarteel.ai/quran/surah/maherAlMuaiqly/murattal/mp3/${pad3(s)}.mp3`;
  const out={src,rows};
  maherQulTimingCache.set(s,out);
  return out;
}
function isTimedProvider(r=reciter){
  return r.provider==="mp3quran-timed"||r.provider==="qul-maher";
}
async function resolveGaplessForCurrentSurah(){
  if(!isTimedProvider())return null;

  let src="",rows=[];
  if(reciter.provider==="mp3quran-timed"){
    const timed=await getMp3Timing(play.surah);
    src=(timed.read.folder_url.endsWith("/")?timed.read.folder_url:timed.read.folder_url+"/")+pad3(play.surah)+".mp3";
    rows=normalizeTimedRows(timed.rows);
  }else if(reciter.provider==="qul-maher"){
    const timed=await getMaherQulTiming(play.surah);
    src=timed.src;rows=timed.rows;
  }

  const t=rows.find(x=>Number(x.ayah)===Number(play.current));
  if(!src||!t)throw new Error("timed ayah missing");
  return {src,rows,t};
}
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
function openPlaybackQueue(){
  const b=sheet("قائمة التشغيل",`<div class="settings">
    <div class="queue-source">
      <label class="queue-source-label" for="queueEnabled"><span>التشغيل من القائمة</span><input type="checkbox" role="switch" id="queueEnabled" aria-describedby="queueSourceHint"><span class="queue-switch" aria-hidden="true"></span></label>
      <p id="queueSourceHint" class="player-hint"></p>
    </div>
    <p class="player-hint">رتّب السور بالسحب أو بالأسهم. تُشغَّل جميع السور بصوت القارئ المختار، وتُحفظ القائمة على هذا الجهاز.</p>
    <div class="field"><label for="queueSurah">إضافة سورة</label><select id="queueSurah">${playerSurahOptions(play.surah)}</select></div>
    <div class="queue-toolbar"><button type="button" id="queueNext">تشغيل تالياً</button><button type="button" id="queueAppend">إضافة إلى النهاية</button></div>
    <div id="queueStatus" class="player-hint" role="status" aria-live="polite"></div>
    <ol class="queue-list" id="queueList"></ol>
    <div class="queue-toolbar"><button type="button" id="queueStart">تشغيل القائمة</button><button type="button" id="queueClear">مسح القائمة</button></div>
  </div>`);
  b.classList.add("player-backdrop");
  const list=b.querySelector("#queueList");
  function render(){
    syncQueueControls();
    list.innerHTML=playbackQueue.length?playbackQueue.map((item,i)=>`<li class="queue-row ${queueActive&&i===queueIndex?"current":""}" data-index="${i}">
      <button type="button" class="queue-handle" aria-label="اسحب لترتيب سورة ${escapeHtml(verseParts(item.s+":1").sname)}">⠿</button>
      <button type="button" class="queue-track" data-play="${i}">${ar(i+1)} · ${escapeHtml(verseParts(item.s+":1").sname)}<small>${queueActive&&i===queueIndex?"قيد التشغيل":"تشغيل السورة"}</small></button>
      <span class="queue-actions"><button type="button" data-up="${i}" aria-label="نقل إلى الأعلى" ${i===0?"disabled":""}>↑</button><button type="button" data-down="${i}" aria-label="نقل إلى الأسفل" ${i===playbackQueue.length-1?"disabled":""}>↓</button><button type="button" data-remove="${i}" aria-label="حذف السورة">×</button></span></li>`).join(""):"<p class='queue-empty'>القائمة فارغة. أضف السور التي ترغب في سماعها.</p>";
    b.querySelector("#queueStart").disabled=!playbackQueue.length;
    list.querySelectorAll(".queue-handle").forEach(handle=>{
      handle.onpointerdown=e=>{
        if(e.button!==0)return;e.preventDefault();const row=handle.closest("[data-index]"),from=Number(row.dataset.index);
        let target=from;handle.setPointerCapture(e.pointerId);row.classList.add("dragging");
        handle.onpointermove=ev=>{const hit=document.elementFromPoint(ev.clientX,ev.clientY)?.closest("#queueList [data-index]");if(hit)target=Number(hit.dataset.index)};
        handle.onpointerup=()=>{handle.onpointermove=null;handle.onpointerup=null;reorderQueue(from,target);render();b.querySelector("#queueStatus").textContent="تم ترتيب القائمة"};
        handle.onpointercancel=()=>{row.classList.remove("dragging");handle.onpointermove=null;handle.onpointerup=null};
      };
    });
  }
  list.onclick=async e=>{
    const button=e.target.closest("button");if(!button)return;
    if(button.hasAttribute("data-play")){const i=Number(button.dataset.play);b.remove();await playQueueEntry(i);return}
    if(button.hasAttribute("data-up"))reorderQueue(Number(button.dataset.up),Number(button.dataset.up)-1);
    if(button.hasAttribute("data-down"))reorderQueue(Number(button.dataset.down),Number(button.dataset.down)+1);
    if(button.hasAttribute("data-remove")){
      const i=Number(button.dataset.remove);
      // Removing the sounding entry leaves the audio playing outside the queue.
      if(queueActive&&i===queueIndex)detachQueue();else if(queueActive&&i<queueIndex)queueIndex--;
      playbackQueue.splice(i,1);savePlaybackQueue();
    }
    render();
  };
  function add(next){
    if(playbackQueue.length>=300){showToast("القائمة ممتلئة");return}
    // “Play next” attaches the currently sounding surah to a new queue.
    if(next&&!queueActive&&document.body.classList.contains("player-on")){
      playbackQueue.unshift({id:(typeof crypto.randomUUID==="function"?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)),s:play.surah});queueIndex=0;queueActive=true;
      continuousMode=true;continuousStopRef=null;storageSet(STORAGE_KEYS.continuous,"1");
    }
    const item={id:(typeof crypto.randomUUID==="function"?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)),s:Number(b.querySelector("#queueSurah").value)};
    playbackQueue.splice(next&&queueActive?queueIndex+1:playbackQueue.length,0,item);
    savePlaybackQueue();render();primeNextEveryAyah();primeNextTimedSurah();
    b.querySelector("#queueStatus").textContent=next?"أُضيفت السورة للتشغيل تالياً":"أُضيفت السورة إلى نهاية القائمة";
  }
  b.querySelector("#queueEnabled").onchange=e=>{setQueuePlayback(e.target.checked);render();b.querySelector("#queueStatus").textContent=queueActive?"فُعّل التشغيل من القائمة دون تغيير السورة الحالية":"أُوقف التشغيل من القائمة. قائمتك محفوظة"};
  b.querySelector("#queueNext").onclick=()=>add(true);b.querySelector("#queueAppend").onclick=()=>add(false);
  b.querySelector("#queueStart").onclick=async()=>{b.remove();await playQueueEntry(0)};
  b.querySelector("#queueClear").onclick=()=>{playbackQueue=[];detachQueue();savePlaybackQueue();render();b.querySelector("#queueStatus").textContent="مُسحت القائمة"};
  render();
}
document.getElementById("queueBtn").onclick=openPlaybackQueue;
document.getElementById("queueToggle").onclick=()=>{
  if(setQueuePlayback(!queueActive))showToast(queueActive?"فُعّل التشغيل من القائمة":"المتابعة حسب ترتيب المصحف. قائمتك محفوظة");
};

populateReciters();syncReciterCapabilities();
/* ---------- theme + tap states ---------- */
function setTheme(t){
  document.documentElement.dataset.theme=t;storageSet(STORAGE_KEYS.theme,t);
  document.querySelector('meta[name="theme-color"]').content=t==="dark"?"#061F1D":"#F5F0E4";
  document.getElementById("themeBtn").innerHTML=t==="dark"
    ?'<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z"/></svg>'
    :'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M2 12h2M20 12h2M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5"/></svg>';
  requestAnimationFrame(()=>document.querySelectorAll("canvas.surah-banner").forEach(c=>renderSurahHeaderCanvas(c,c.dataset.glyph)));
}
document.getElementById("themeBtn").onclick=()=>setTheme((document.documentElement.dataset.theme||"light")==="light"?"dark":"light");
setTheme(storageGet(STORAGE_KEYS.theme,"light")==="dark"?"dark":"light");

document.getElementById("reader").addEventListener("contextmenu",e=>e.preventDefault());
document.getElementById("reader").addEventListener("click",e=>{
  if(e.target.closest(".verse-segment"))return;
  closeMenu();
  if(!document.body.classList.contains("hidden-tools")){hideTools();return}
  showToolsFor(2800);
});
document.querySelectorAll(".chrome,.audio-panel,.audio-fab").forEach(x=>x.addEventListener("click",e=>e.stopPropagation()));
document.querySelectorAll(".chrome").forEach(x=>{
  x.addEventListener("pointerdown",()=>clearTimeout(toolsTimer));
  x.addEventListener("pointerup",()=>showToolsFor(2800));
});
document.addEventListener("pointerdown",e=>{if(!e.target.closest(".ayah-menu")&&!e.target.closest(".verse-segment"))closeMenu()},{capture:true});
window.addEventListener("resize",()=>{
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(()=>document.querySelectorAll('.page[data-loaded="1"]').forEach(x=>fitPage(Number(x.dataset.page))),90);
});
if(document.fonts?.ready){
  document.fonts.ready.then(()=>requestAnimationFrame(()=>document.querySelectorAll('.page[data-loaded="1"]').forEach(x=>fitPage(Number(x.dataset.page))))).catch(()=>{});
}
document.fonts?.addEventListener?.("loadingdone",()=>{
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(()=>document.querySelectorAll('.page[data-loaded="1"]').forEach(x=>fitPage(Number(x.dataset.page))),60);
});
window.visualViewport?.addEventListener("resize",()=>{
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(()=>document.querySelectorAll('.page[data-loaded="1"]').forEach(x=>fitPage(Number(x.dataset.page))),80);
},{passive:true});


/* PWA / offline library. Entering the Quran is the opt-in signal to prepare
   the complete Mushaf + Tafsir pack. Audio has a separate explicit cache and
   is never bulk-downloaded automatically. */
const OFFLINE_LIBRARY_KEY="zad:offline-library-v1";
function rememberOfflineLibrary(ready){
  try{
    if(ready)localStorage.setItem(OFFLINE_LIBRARY_KEY,"1");
    else localStorage.removeItem(OFFLINE_LIBRARY_KEY);
    localStorage.removeItem("zad:quran-offline-v1");
  }catch(_){ }
}
async function requestPersistentStorage(){
  try{if(navigator.storage?.persist)await navigator.storage.persist()}catch(_){ }
}
function postOfflineLibrary(type){
  navigator.serviceWorker?.ready?.then(reg=>(reg.active||reg.waiting||reg.installing)?.postMessage({type})).catch(()=>{});
}
if("serviceWorker" in navigator){
  const offlineSetup=document.getElementById("offlineSetup");
  const offlineSetupFill=document.getElementById("offlineSetupFill");
  const offlineSetupPercent=document.getElementById("offlineSetupPercent");
  const offlineSetupTrack=document.getElementById("offlineSetupTrack");
  const offlineSetupTitle=document.getElementById("offlineSetupTitle");
  let offlineHideTimer=null,lastOfflinePercent=0;
  function paintOfflineProgress(done,total){
    const safeTotal=Math.max(1,Number(total)||1);
    const pct=Math.max(0,Math.min(100,Math.round((Number(done)||0)*100/safeTotal)));
    lastOfflinePercent=pct;
    if(offlineSetupFill)offlineSetupFill.style.width=`${pct}%`;
    if(offlineSetupPercent)offlineSetupPercent.textContent=`${ar(pct)}٪`;
    if(offlineSetupTrack)offlineSetupTrack.setAttribute("aria-valuenow",String(pct));
    if(offlineSetupTitle)offlineSetupTitle.textContent="جارٍ تجهيز القرآن والتفسير للعمل دون اتصال";
    offlineSetup?.classList.add("show");
  }
  function hideOfflineProgress(delay=0){
    clearTimeout(offlineHideTimer);
    offlineHideTimer=setTimeout(()=>offlineSetup?.classList.remove("show"),delay);
  }
  navigator.serviceWorker.addEventListener("message",event=>{
    const data=event.data||{};
    if(data.type==="OFFLINE_LIBRARY_READY"){
      rememberOfflineLibrary(true);requestPersistentStorage();
      if(offlineSetup?.classList.contains("show")){
        paintOfflineProgress(100,100);
        if(offlineSetupTitle)offlineSetupTitle.textContent="اكتمل التجهيز للعمل دون اتصال";
        hideOfflineProgress(900);
      }else{
        hideOfflineProgress(0);
      }
    }else if(data.type==="OFFLINE_LIBRARY_INCOMPLETE"){
      rememberOfflineLibrary(false);
      if(!navigator.onLine||Number(data.failed)>0){
        hideOfflineProgress(0);
        if(lastOfflinePercent>0||Number(data.failed)>0)showToast("لم يكتمل التجهيز؛ ستُستكمل الملفات الناقصة عند المحاولة مجدداً");
      }
    }else if(data.type==="OFFLINE_LIBRARY_PROGRESS"){
      paintOfflineProgress(data.done,data.total);
    }else if(data.type==="AUDIO_OFFLINE_PROGRESS"){
      const job=audioDownloadJobs.get(String(data.tag||""));
      if(job){const pct=Math.round((Number(data.done)||0)*100/Math.max(1,Number(data.total)||1));setAudioDownloadButton(job.btn,"downloading",pct)}
    }else if(data.type==="AUDIO_OFFLINE_DONE"){
      const tag=String(data.tag||""),job=audioDownloadJobs.get(tag);if(!job)return;
      audioDownloadJobs.delete(tag);
      if(Number(data.failed)===0){putAudioOfflinePackage(job.pkg);setAudioDownloadButton(job.btn,"downloaded");showToast("أصبحت السورة متاحة للتشغيل دون اتصال")}
      else{refreshAudioDownloadButton(job.btn,job.s).catch(()=>setAudioDownloadButton(job.btn,"available"));showToast("تعذّر تنزيل السورة كاملة، حاول مرة أخرى")}
    }
  });
  const prepareReaderServiceWorker=()=>navigator.serviceWorker.register("sw.js",{updateViaCache:"none"}).then(reg=>reg.update().catch(()=>reg)).then(()=>navigator.serviceWorker.ready).then(reg=>{
    const worker=reg.active||reg.waiting||reg.installing;
    if(navigator.onLine)worker?.postMessage({type:"ENSURE_OFFLINE_SHELL"});
    worker?.postMessage({type:navigator.onLine?"ENSURE_OFFLINE_LIBRARY":"CHECK_OFFLINE_LIBRARY"});
  }).catch(()=>{});
  prepareReaderServiceWorker();
  window.addEventListener("online",()=>postOfflineLibrary("ENSURE_OFFLINE_LIBRARY"));
  navigator.serviceWorker.addEventListener("controllerchange",()=>postOfflineLibrary(navigator.onLine?"ENSURE_OFFLINE_LIBRARY":"CHECK_OFFLINE_LIBRARY"));
}

/* ---------- init ---------- */
(async()=>{
  try{
    validateStaticData();
    buildPageShells();
    await Promise.all([
      document.fonts.load('48px "QCF4_QBSML"'),
      document.fonts.load('48px "QCF4_Hafs_01"')
    ]);
    try{
      await document.fonts.load('64px "QUL_SurahHeader"',SURAH_HEADER_GLYPHS[1]);
      surahHeaderReady=true;
    }catch(_){surahHeaderReady=false}
    await loadQcfMeta();
    validateMetadataConsistency();
    currentPage=1;let previousVisit=null;
    const m=storageJsonGet(STORAGE_KEYS.lastPosition,null),savedPage=Number(m?.page);
    if(savedPage>=1&&savedPage<=TOTAL_PAGES){currentPage=savedPage;previousVisit={...m,page:savedPage}}
    archivePreviousVisit(previousVisit);

    /* Integration deep links. Specific ayah wins, then page, then juz, then saved position. */
    const entry=readerEntryParams();
    if(entry.qari){
      reciter=RECITERS.find(r=>r.id===entry.qari)||defaultReciter();
      storageJsonSet(STORAGE_KEYS.qari,reciter);
    }
    let deepLinkedAyah=ayahFromHash();
    if(!deepLinkedAyah&&entry.surah&&entry.ayah){
      const max=Number(chapterMap.get(entry.surah)?.verses_count||0);
      if(entry.ayah<=max)deepLinkedAyah=`${entry.surah}:${entry.ayah}`;
    }
    const noDeepTarget=!deepLinkedAyah&&!entry.page&&!entry.juz&&!entry.surah;
    const storedSurface=storageJsonGet(STORAGE_KEYS.lastSurface,null);
    const wantsHome=entry.home||(noDeepTarget&&storedSurface?.surface!=="reader");
    if(!noDeepTarget&&!entry.home){readerReturnToQuranHome=false;storageSet(STORAGE_KEYS.readerParent,"")}
    else if(noDeepTarget&&storedSurface?.surface==="reader"&&storageGet(STORAGE_KEYS.readerParent,"")==="quran-home")readerReturnToQuranHome=true;
    if(deepLinkedAyah){
      const p=await getVersePage(deepLinkedAyah);
      if(p)currentPage=p;
    }else if(entry.page){
      currentPage=entry.page;
    }else if(entry.juz){
      currentPage=juzStartPage(entry.juz);
    }
    await ensurePage(currentPage);
    updatePage(false,false);
    saveLastPosition();
    if(!wantsHome)saveReaderSurface("reader");
    loading.classList.add("hide");
    if(deepLinkedAyah){
      const anchor=document.querySelector(`.page[data-page="${currentPage}"] .verse-segment[data-key="${deepLinkedAyah}"]`);
      if(anchor)selectVerse(deepLinkedAyah,anchor,true);
    }
    if(entry.autoplay&&entry.surah)prepareSurahFromDeepLink(entry.surah);
    prefetchAround(currentPage).then(()=>trimPageDom(currentPage));
    loadTafsirIndex().catch(err=>console.warn("tafsir index unavailable",err));
    if(wantsHome){
      const restoredTab=storedSurface?.surface==="quran-home"&&["s","j","m"].includes(storedSurface?.tab)?storedSurface.tab:"s";
      requestAnimationFrame(()=>openQuranIndex(restoredTab,{home:true}));
    }else setTimeout(()=>showToast("QCF4 · مصحف المدينة ١٤٤١هـ · ٦٠٤ صفحات"),350);
  }catch(e){
    console.error(e);
    loading.classList.remove("hide");
    loading.innerHTML=`<div class="loading-error"><div>تعذّر تحميل بيانات المصحف. تحقق من الاتصال ثم أعد المحاولة.</div><button class="loading-retry" type="button">إعادة المحاولة</button></div>`;
    loading.querySelector(".loading-retry")?.addEventListener("click",()=>location.reload());
  }
})();
})();
