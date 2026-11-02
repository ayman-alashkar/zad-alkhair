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
