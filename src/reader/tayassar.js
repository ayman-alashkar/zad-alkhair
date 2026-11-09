/* ---------- «ما تيسّر»: مقاطع متتابعة من مواضع مختلفة في المصحف ----------
   المواضع: بدايات السور الـ١١٤، وبدايات أرباع الأحزاب في وسط السور ما دام يبقى
   بعدها من سورتها أكثر من عشر آيات (يُستبعد ١٥ ربعًا تقع في آخر سورتها).
   المقطع يمتد من موضعه إلى أول حدّ بعده: بداية الربع التالي أو نهاية السورة.
   عند التفعيل يُخلط ترتيب المواضع مرة واحدة ويُختار قارئ يتتبع الآيات؛ ثم تُتلى
   المقاطع بهذا الترتيب: لا يتكرر مقطع حتى تنتهي كلها، والسابق والتالي معروفان.
   القارئ يُغيَّر متى شاء المستخدم ولا يتغيّر الترتيب. الوضع يعيش في المحرّك نفسه:
   continuousStopRef هو نهاية المقطع، وعندها يبدأ المقطع التالي بدل التوقف. */
const TAYASSUR_MIN_REMAINING=11;
/* سحب القوس إلى آخره (آخر ٢٪) ينقل إلى المقطع التالي. */
const TAYASSUR_NEXT_AT=.98;
let tayassur=null;

function tayassurPositions(){
  const out=[];
  for(let s=1;s<=114;s++)out.push({s,a:1});
  for(const[s,a]of LOCAL_HIZB_QUARTERS)if(a>1&&maxAyah(s)-a+1>=TAYASSUR_MIN_REMAINING)out.push({s,a});
  return out;
}
/* نهاية المقطع: الآية التي قبل أول ربع يبدأ بعد موضعه في السورة نفسها، أو آخر السورة. */
function tayassurEnd(p){
  let end=maxAyah(p.s);
  for(const[s,a]of LOCAL_HIZB_QUARTERS)if(s===p.s&&a>p.a&&a-1<end)end=a-1;
  return end;
}
function tayassurShuffle(list){
  const out=list.slice();
  for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}
  return out;
}
/* يبقى الوضع مفعّلًا ما دامت نهاية المقطع هي حدّ المحرّك. أي تشغيل يختاره المستخدم
   بنفسه (سورة من القائمة، آية من المصحف، التكرار، متابعة التلاوة) يغيّر هذا الحدّ فينتهي. */
function tayassurActive(){
  if(!tayassur)return false;
  if(continuousStopRef===tayassur.stop&&!isSurahOnly())return true;
  tayassur=null;return false;
}
function tayassurSegment(){
  if(!tayassurActive())return null;
  const p=tayassur.order[tayassur.i];
  return {s:p.s,from:p.a,to:tayassur.stop.a};
}
function tayassurNext(){
  if(!tayassurActive())return null;
  return tayassur.order[(tayassur.i+1)%tayassur.order.length];
}
async function tayassurPlay(i){
  const n=tayassur.order.length;i=((i%n)+n)%n;
  const p=tayassur.order[i];
  tayassur.i=i;tayassur.stop={s:p.s,a:tayassurEnd(p)};
  /* القارئ الموقّت يحتاج وقتًا ليجلب توقيت السورة الجديدة، والملف القديم ما زال يُسمع.
     لو بقي توقيته فعّالًا لنقل play.current إلى آيته، فيبدأ المقطع الجديد من آية خاطئة
     أو يقفز مقطعًا. لذلك يُسكت الملف القديم ويُفصل توقيته قبل الانتقال. */
  activeSegment=null;activeTimingRows=null;
  if(!audio.paused)audio.pause();
  detachQueue();repeatMode="off";
  continuousMode=true;continuousStopRef=tayassur.stop;
  listenPending=null;listenSeekAfterLoad=null;
  play={surah:p.s,from:p.a,to:p.a,current:p.a,repeatAyah:1,repeatAyahLeft:1,repeatGroup:1,repeatGroupLeft:1,repeatSurah:1,repeatSurahLeft:1,speed:play.speed||1};
  pendingSurahBasmala=p.a===1&&p.s!==1&&p.s!==9;basmalaFallbackTarget=null;
  await playCurrent(false);
}
async function tayassurStart(){
  if(!navigator.onLine){showToast("«ما تيسّر» يحتاج اتصالًا بالإنترنت");return}
  const pool=RECITERS.filter(r=>!isSurahOnly(r));
  const r=pool[Math.floor(Math.random()*pool.length)];
  listenTarget=null;setIndexPlaybackBoundary(null);
  listenQuietReciter(r);
  tayassur={order:tayassurShuffle(tayassurPositions()),i:0,stop:null};
  await tayassurPlay(0);
}
/* الإطفاء لا يقطع التلاوة: تكمل السورة الجارية كما لو بدأها المستخدم من هذا الموضع،
   أي بمتابعة التلاوة كما تبدأ كل سورة في صفحة الاستماع (listenPlaySurah). */
function tayassurStop(){
  if(!tayassur)return;
  const wasActive=continuousStopRef===tayassur.stop;
  tayassur=null;
  if(wasActive){continuousMode=true;continuousStopRef=null;releaseAudioPreload();primeNextEveryAyah();primeNextTimedSurah()}
}
async function tayassurToggle(){
  if(tayassurActive()){tayassurStop();showToast("أُطفئ «ما تيسّر»، وتكمل السورة الحالية");listenPaint();return}
  await tayassurStart();
  showToast(`ما تيسّر من القرآن بصوت ${listenReciterName(reciter)}`);
}
/* القوس في هذا الوضع يمثل المقطع لا السورة. */
function tayassurProgress(){
  const seg=tayassurSegment();if(!seg)return null;
  const d=Number(audio.duration),t=Number(audio.currentTime)||0;
  if(audio.dataset.playMode==="gapless"&&Array.isArray(activeTimingRows)){
    const a=activeTimingRows.find(x=>Number(x.ayah)===seg.from),b=activeTimingRows.find(x=>Number(x.ayah)===seg.to);
    if(a&&b){
      const s0=Number(a.start_time)/1000,s1=Number(b.end_time)/1000,len=Math.max(.001,s1-s0);
      return {f:Math.max(0,Math.min(1,(t-s0)/len)),t:Math.max(0,t-s0),d:len,timed:true};
    }
  }
  const inner=audio.dataset.playMode==="ayah"&&Number.isFinite(d)&&d>0?Math.min(1,t/d):0;
  const count=seg.to-seg.from+1;
  return {f:Math.max(0,Math.min(1,(Number(play.current)-seg.from+inner)/count)),timed:false};
}
function tayassurAyahAt(f){
  const seg=tayassurSegment();if(!seg)return null;
  return Math.min(seg.to,seg.from+Math.floor(Math.max(0,f)*(seg.to-seg.from+1)));
}
async function tayassurSeekTo(f){
  const seg=tayassurSegment();if(!seg)return false;
  if(f>=TAYASSUR_NEXT_AT){await tayassurPlay(tayassur.i+1);return true}
  if(audio.dataset.playMode==="gapless"&&Array.isArray(activeTimingRows)){
    const a=activeTimingRows.find(x=>Number(x.ayah)===seg.from),b=activeTimingRows.find(x=>Number(x.ayah)===seg.to);
    if(a&&b){
      const target=Number(a.start_time)/1000+f*(Number(b.end_time)-Number(a.start_time))/1000,row=timingRowAt(target);
      if(row){
        activeSegment={start:Number(row.start_time)/1000,end:Number(row.end_time)/1000};
        const n=Number(row.ayah);if(n&&n!==play.current){play.current=n;play.repeatAyahLeft=play.repeatAyah;updatePlayer()}
      }
      try{audio.currentTime=target}catch(_){ }
      return true;
    }
  }
  const n=tayassurAyahAt(f);
  if(n!==play.current){pendingSurahBasmala=false;play.current=n;play.repeatAyahLeft=play.repeatAyah;await playCurrent(false)}
  return true;
}
function tayassurRefLabel(p){return p.a===1?`سورة ${listenSurahName(p.s)}`:`سورة ${listenSurahName(p.s)} من الآية ${ar(p.a)}`}
