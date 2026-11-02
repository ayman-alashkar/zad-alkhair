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
