const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../reader.html','utf8');
const chunk=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
function fixture(){
  const ctx=vm.createContext({pad3:n=>String(n).padStart(3,'0'),normalizeArabic:s=>s,fetch:()=>{throw Error('unexpected fetch')}});
  vm.runInContext(chunk('const RECITERS=[','/* ---------- persistent state:'),ctx);
  return {ctx,run:s=>vm.runInContext(s,ctx)};
}
test('new reciters pass source validation and preserve the existing explicit default',()=>{
  const f=fixture();f.run('validateReciterConfig()');
  assert.equal(f.run('RECITERS.length'),10);assert.equal(f.run('defaultReciter().id'),'Husary_128kbps');
  assert.equal(f.run('RECITERS.find(r=>r.id==="AliJaber_Hafs").provider'),'mp3quran-timed');
  assert.equal(f.run('isSurahOnly(RECITERS.find(r=>r.id==="MahmoudAlHamoud_Surah"))'),true);
});
test('Ali Jaber resolves only the matching Hafs recording',async()=>{
  const f=fixture();Object.assign(f.ctx,{mp3ReadsPromise:Promise.resolve([{id:99,name:'علي حجاج السويسي',rewaya:'حفص عن عاصم'},{id:76,name:'علي جابر',rewaya:'حفص عن عاصم',soar_count:114}]),timedReadCache:new Map()});
  f.run(chunk('function compactArabic(', 'async function getMp3Timing('));
  const r=await f.run('resolveMp3Read(RECITERS.find(r=>r.id==="AliJaber_Hafs"))');assert.equal(r.id,76);
});
test('Alafasy resolves Hafs, rejects other readings and retains the matching offline audio and timings',async()=>{
  const f=fixture();
  Object.assign(f.ctx,{mp3ReadsPromise:Promise.resolve([
    {id:1,name:'مشاري العفاسي',rewaya:'ورش عن نافع',soar_count:114},
    {id:123,name:'مشاري العفاسي',rewaya:'حفص عن عاصم',soar_count:114,folder_url:'https://cdn.mp3quran.net/audio/mishary-alafasy/r1/'},
    {id:2,name:'علي جابر',rewaya:'حفص عن عاصم',soar_count:114}
  ]),timedReadCache:new Map()});
  f.run(chunk('function compactArabic(', 'async function getMp3Timing('));
  const qari=f.run('RECITERS.find(r=>r.id==="MisharyAlafasy_Hafs")');
  const read=await f.run('resolveMp3Read(RECITERS.find(r=>r.id==="MisharyAlafasy_Hafs"))');
  assert.equal(read.id,123);
  Object.assign(f.ctx,{ayahAudioSourceId:()=>'',audioPackageKey:(s,r)=>r.id+':'+s,MP3QURAN_READS_URL:'https://mp3quran.net/api/v3/ayat_timing/reads',getMp3Timing:async()=>({read})});
  f.run(chunk('async function buildSurahAudioPackage(', 'async function downloadedAudioPackagesForSurah('));
  f.ctx.alafasy=qari;
  const pkg=await f.run('buildSurahAudioPackage(114,alafasy)');
  assert.ok(pkg.urls.includes('https://cdn.mp3quran.net/audio/mishary-alafasy/r1/114.mp3'));
  assert.ok(pkg.urls.includes('https://mp3quran.net/api/v3/ayat_timing?surah=114&read=123'));
  assert.equal(pkg.key,'MisharyAlafasy_Hafs:114');
});
test('offline packages for whole-surah and timed reciters retain independent resources',async()=>{
  const f=fixture();Object.assign(f.ctx,{ayahAudioSourceId:()=>'',audioPackageKey:(s,r)=>r.id+':'+s,MP3QURAN_READS_URL:'https://mp3quran.net/api/v3/ayat_timing/reads',getMp3Timing:async()=>({read:{id:76,folder_url:'https://cdn.mp3quran.net/audio/ali-jaber/r1/'}})});
  f.run(chunk('async function buildSurahAudioPackage(', 'async function downloadedAudioPackagesForSurah('));
  const a=await f.run('buildSurahAudioPackage(114,RECITERS.find(r=>r.id==="MahmoudAlHamoud_Surah"))');
  assert.equal(a.resources.length,1);assert.match(a.urls[0],/mahmoud-fayyad-al-hamoud\/hafs-an-asim\/114\.mp3$/);assert.equal(a.resources[0].kind,'audio');
  const b=await f.run('buildSurahAudioPackage(114,RECITERS.find(r=>r.id==="AliJaber_Hafs"))');
  assert.equal(b.resources.length,3);assert.ok(b.urls.some(u=>u.includes('read=76')));assert.notEqual(a.key,b.key);
});
test('whole-surah selection never schedules an ayah highlight or a partial juz playback',async()=>{
  const f=fixture();Object.assign(f.ctx,{reciter:{provider:'surah'},play:{surah:112,current:1},chapterMap:new Map(),playbackRequestId:7,cleared:0});
  f.run('function clearVerseSelection(){cleared++}');
  f.run(chunk('async function syncPlaybackSelection(', 'function nextPlaybackRefForPriming('));
  await f.run('syncPlaybackSelection(7)');assert.equal(f.ctx.cleared,1);
  await f.run('syncPlaybackSelection(6)');assert.equal(f.ctx.cleared,1);
  f.ctx.showToast=()=>{};f.ctx.closed=false;
  f.run(chunk('async function playJuzFromHub(', 'function openQuranHubMenu('));
  await f.run('playJuzFromHub(2,()=>{closed=true})');assert.equal(f.ctx.closed,false);
});
test('whole-surah playback opens the surah page without selecting a fabricated verse',async()=>{
  const f=fixture();Object.assign(f.ctx,{reciter:{provider:'surah'},play:{surah:112,current:1},chapterMap:new Map([[112,{pages:[604,604]}]]),playbackRequestId:2,currentPage:1,cleared:0,ensured:[],pageUpdates:0,ensurePage:async p=>f.ctx.ensured.push(p),prefetchAround:async()=>{},trimPageDom(){}});
  f.run('function clearVerseSelection(){cleared++} function updatePage(){pageUpdates++}');
  f.run(chunk('async function syncPlaybackSelection(', 'function nextPlaybackRefForPriming('));
  await f.run('syncPlaybackSelection(2)');assert.equal(f.ctx.currentPage,604);assert.equal(f.ctx.pageUpdates,1);assert.equal(f.ctx.cleared,1);assert.deepEqual(f.ctx.ensured,[604]);
});
test('Hudhaifi uses the verified per-ayah recording and independently caches its surah and basmala',async()=>{
  const f=fixture();f.ctx.reciter=f.run('RECITERS.find(r=>r.id==="Hudhaify_128kbps")');
  assert.equal(f.ctx.reciter.provider,'ayah');assert.equal(f.ctx.reciter.everyAyahId,'Hudhaify_128kbps');assert.equal(f.ctx.reciter.ayahBasmalaPrelude,true);
  Object.assign(f.ctx,{chapterMap:new Map([[112,{verses_count:4}]]),audioPackageKey:(s,r)=>r.id+':'+s,getMp3Timing:()=>{throw Error('no timestamp substitution')}});
  f.run(chunk('function ayahAudioSourceId(', 'function compactArabic('));
  f.run(chunk('async function buildSurahAudioPackage(', 'async function downloadedAudioPackagesForSurah('));
  assert.equal(f.run('audioUrl(112,4)'),'https://everyayah.com/data/Hudhaify_128kbps/112004.mp3');
  const pkg=await f.run('buildSurahAudioPackage(112,reciter)');assert.equal(pkg.ownedUrls.length,4);assert.equal(pkg.sharedUrls.length,1);
  assert.ok(pkg.resources.every(x=>x.url.startsWith('https://everyayah.com/data/Hudhaify_128kbps/')));
  assert.equal(pkg.sharedUrls[0],'https://everyayah.com/data/Hudhaify_128kbps/001001.mp3');
});
