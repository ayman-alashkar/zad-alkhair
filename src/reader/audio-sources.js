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
