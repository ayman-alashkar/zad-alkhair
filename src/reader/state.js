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
