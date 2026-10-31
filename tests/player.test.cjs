const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../reader.html','utf8');
const chunk=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
function fixture(){
  const nodes=new Map();
  const document={getElementById(id){if(!nodes.has(id))nodes.set(id,{textContent:''});return nodes.get(id)}};
  const ctx=vm.createContext({document,console,reciter:{id:"husary"},Date:{now:()=>10000},clearInterval(){},setInterval:()=>1,
    audio:{dataset:{playMode:'gapless'},currentTime:0,paused:false,pause(){this.paused=true}},
    play:{surah:112,current:1,from:1,to:1,repeatAyah:1,repeatAyahLeft:1,repeatGroup:1,repeatGroupLeft:1,repeatSurah:1,repeatSurahLeft:1},
    repeatMode:'off',continuousMode:true,continuousStopRef:null,queueActive:false,queueIndex:-1,playbackQueue:[],
    playbackWanted:true,audioRetryTimer:null,audioRetryKey:'',audioRetryCount:0,clearTimeout(){},setTimeout(){return 1},navigator:{onLine:true},AUDIO_OFFLINE_UNAVAILABLE:'offline',sleepAfterSurah:false,sleepDeadline:0,sleepTimerId:null,playbackRequestId:1,segmentAdvancing:false,
    activeSegment:null,activeTimingRows:null,pendingSurahBasmala:false,basmalaFallbackTarget:null,
    maxAyah:s=>({112:4,113:5,114:6}[s]||7),syncPlay(){},completeAudioProgress(){},updatePlayer(){},
    showToast(){},formatAudioTime:x=>String(x),played:[],
    async playCurrent(){this.played.push([this.play.surah,this.play.current])},
    syncPlaybackSelectionInBackground(){},clearSurahBasmalaPrelude(){},savePlaybackQueue(){},
    storageSet(){},STORAGE_KEYS:{continuous:'continuous'},primeNextEveryAyah(){},primeNextTimedSurah(){},releaseAudioPreload(){}
  });
  vm.runInContext(`async function playCurrent(){played.push([play.surah,play.current])}`,ctx);
  vm.runInContext(chunk('function isSurahOnly(', 'function defaultReciter('),ctx);
  vm.runInContext(chunk('function previousAyahRef(', 'async function movePlayerTo('),ctx);
  vm.runInContext(chunk('function timingRowAt(', 'function seekAudioProgress('),ctx);
  vm.runInContext(chunk('function clearSleepTimer(){','document.addEventListener("visibilitychange"'),ctx);
  vm.runInContext(chunk('function nextSurahRef(){','audio.ontimeupdate='),ctx);
  vm.runInContext(chunk('function nextPlaybackRefForPriming(){','function releaseAudioPreload('),ctx);
  vm.runInContext(chunk('function handleAudioFailure(', 'async function playCurrent('),ctx);
  vm.runInContext(chunk('function reorderQueue(', 'function openPlaybackQueue('),ctx);
  vm.runInContext(chunk('function setQueuePlayback(', 'function savePlaybackQueue('),ctx);
  vm.runInContext(chunk('audio.onended=async()=>{','function opts('),ctx);
  vm.runInContext(chunk('document.getElementById("repeatBtn").onclick=', '/* Transport policy:'),ctx);
  return {ctx,run:code=>vm.runInContext(code,ctx),nodes};
}
test('repeat-one stays on the same surah through many completions',async()=>{
  const f=fixture();f.ctx.repeatMode='one';
  for(let i=0;i<20;i++){f.ctx.play.current=4;await f.run('finishCurrentAyah()');assert.equal(f.ctx.play.surah,112);assert.equal(f.ctx.play.current,1)}
  assert.equal(f.ctx.played.length,20);
});
test('repeat button cycles off, one, all, off for either playback source',()=>{
  const f=fixture(),click=()=>f.nodes.get('repeatBtn').onclick();
  click();assert.equal(f.ctx.repeatMode,'one');click();assert.equal(f.ctx.repeatMode,'all');click();assert.equal(f.ctx.repeatMode,'off');
  f.ctx.queueActive=true;f.ctx.playbackQueue=[{s:112}];
  click();assert.equal(f.ctx.repeatMode,'one');click();assert.equal(f.ctx.repeatMode,'all');click();assert.equal(f.ctx.repeatMode,'off');
});
test('a custom queue follows its order, including duplicate surahs, then stops',async()=>{
  const f=fixture();Object.assign(f.ctx,{queueActive:true,queueIndex:0,playbackQueue:[{s:112},{s:114},{s:112}]});
  f.ctx.play.current=4;await f.run('finishCurrentAyah()');assert.equal(f.ctx.play.surah,114);assert.equal(f.ctx.queueIndex,1);
  f.ctx.play.current=6;await f.run('finishCurrentAyah()');assert.equal(f.ctx.play.surah,112);assert.equal(f.ctx.queueIndex,2);
  f.ctx.play.current=4;await f.run('finishCurrentAyah()');assert.equal(f.ctx.audio.paused,true);assert.equal(f.ctx.played.length,2);
});
test('repeat-all wraps from the last queue entry to the first',async()=>{
  const f=fixture();Object.assign(f.ctx,{repeatMode:'all',queueActive:true,queueIndex:1,playbackQueue:[{s:113},{s:112}]});
  f.ctx.play.current=4;await f.run('finishCurrentAyah()');assert.equal(f.ctx.play.surah,113);assert.equal(f.ctx.queueIndex,0);
});
test('physical recording end advances to the next surah despite throttled timeupdate',async()=>{
  const f=fixture();f.ctx.activeTimingRows=[1,2,3,4].map((ayah,i)=>({ayah,start_time:i*1000,end_time:(i+1)*1000}));
  await f.ctx.audio.onended();assert.equal(f.ctx.play.surah,113);assert.equal(f.ctx.play.current,1);
});
test('a delayed update catches up to the actual ayah without replaying earlier audio',()=>{
  const f=fixture();f.ctx.activeTimingRows=[1,2,3,4].map((ayah,i)=>({ayah,start_time:i*1000,end_time:(i+1)*1000}));
  f.ctx.audio.currentTime=3.5;f.run('reconcileTimedPosition()');assert.equal(f.ctx.play.current,4);assert.equal(f.ctx.audio.currentTime,3.5);
});
test('finite ayah/group repeats keep their independent counters',async()=>{
  const f=fixture();Object.assign(f.ctx.play,{repeatAyah:3,repeatAyahLeft:3});
  await f.run('finishCurrentAyah()');assert.equal(f.ctx.play.current,1);assert.equal(f.ctx.play.repeatAyahLeft,2);
  f.ctx.activeTimingRows=[{ayah:4,start_time:3000,end_time:4000}];f.run('reconcileTimedPosition(true)');assert.equal(f.ctx.play.current,1);
});
test('a juz boundary stops before queue or next-surah continuation',async()=>{
  const f=fixture();f.ctx.continuousStopRef={s:112,a:4};f.ctx.play.current=4;
  await f.run('finishCurrentAyah()');assert.equal(f.ctx.audio.paused,true);assert.equal(f.ctx.played.length,0);
});
test('sleep after surah takes precedence over infinite repeat',async()=>{
  const f=fixture();f.ctx.sleepAfterSurah=true;f.ctx.repeatMode='one';f.ctx.play.current=4;
  await f.run('finishCurrentAyah()');assert.equal(f.ctx.audio.paused,true);assert.equal(f.ctx.played.length,0);assert.equal(f.ctx.sleepAfterSurah,false);
});
test('sleep deadline uses wall time and cancels a pending playback request',async()=>{
  const f=fixture();f.ctx.sleepDeadline=9000;
  await f.run('finishCurrentAyah()');assert.equal(f.ctx.audio.paused,true);assert.equal(f.ctx.played.length,0);assert.equal(f.ctx.playbackRequestId,2);
});
test('reordering preserves the identity of the sounding entry',()=>{
  const f=fixture();Object.assign(f.ctx,{queueActive:true,queueIndex:1,playbackQueue:[{id:'a',s:112},{id:'b',s:113},{id:'c',s:114}]});
  f.run('reorderQueue(1,0)');assert.equal(f.ctx.queueIndex,0);assert.equal(f.ctx.playbackQueue[0].id,'b');
  f.run('reorderQueue(2,0)');assert.equal(f.ctx.queueIndex,1);assert.equal(f.ctx.playbackQueue[1].id,'b');
});
test('preloading follows the queue and infinite repeat policies',()=>{
  const f=fixture();f.ctx.play.current=4;f.ctx.repeatMode='one';assert.equal(f.run('nextPlaybackRefForPriming().s'),112);
  f.ctx.repeatMode='off';f.ctx.queueActive=true;f.ctx.queueIndex=0;f.ctx.playbackQueue=[{s:112},{s:114}];assert.equal(f.run('nextPlaybackRefForPriming().s'),114);
  f.ctx.queueIndex=1;assert.equal(f.run('nextPlaybackRefForPriming()'),null);
});

test('network errors have a bounded retry count and respect a user pause',()=>{
  const f=fixture();f.run('handleAudioFailure(new Error("network"),1)');assert.equal(f.ctx.audioRetryCount,1);assert.equal(f.ctx.audioRetryTimer,1);
  f.ctx.audioRetryTimer=null;f.run('handleAudioFailure(new Error("network"),1)');assert.equal(f.ctx.audioRetryCount,2);
  f.ctx.audioRetryTimer=null;f.run('handleAudioFailure(new Error("network"),1)');assert.equal(f.ctx.audioRetryTimer,null);
  f.ctx.audioRetryCount=0;f.ctx.playbackWanted=false;f.run('handleAudioFailure(new Error("network"),1)');assert.equal(f.ctx.audioRetryCount,0);
});
test('autoplay denial and superseded requests never trigger retries',()=>{
  const f=fixture();f.run('handleAudioFailure({name:"NotAllowedError"},1)');assert.equal(f.ctx.audioRetryTimer,null);
  f.run('handleAudioFailure(new Error("network"),0)');assert.equal(f.ctx.audioRetryCount,0);
});

test('short-surah playback crosses consecutive physical file ends then stops at Quran end',async()=>{
  const f=fixture();
  for(const expected of [113,114]){
    const n=f.ctx.maxAyah(f.ctx.play.surah);f.ctx.activeTimingRows=Array.from({length:n},(_,i)=>({ayah:i+1,start_time:i*1000,end_time:(i+1)*1000}));
    f.ctx.play.current=1;await f.ctx.audio.onended();assert.equal(f.ctx.play.surah,expected);assert.equal(f.ctx.play.current,1);
  }
  f.ctx.activeTimingRows=Array.from({length:6},(_,i)=>({ayah:i+1,start_time:i*1000,end_time:(i+1)*1000}));
  await f.ctx.audio.onended();assert.equal(f.ctx.audio.paused,true);assert.equal(f.ctx.play.surah,114);assert.equal(f.ctx.play.current,6);
});

test('disabled saved list stays disabled when selecting repeat-all',async()=>{
  const f=fixture();f.ctx.playbackQueue=[{id:'a',s:114},{id:'b',s:113}];
  f.nodes.get('repeatBtn').onclick();f.nodes.get('repeatBtn').onclick();
  assert.equal(f.ctx.repeatMode,'all');assert.equal(f.ctx.queueActive,false);
  f.ctx.play.current=4;await f.run('finishCurrentAyah()');assert.equal(f.ctx.play.surah,113);
  f.ctx.play.surah=114;f.ctx.play.current=6;await f.run('finishCurrentAyah()');assert.equal(f.ctx.play.surah,1);
  assert.deepEqual(Array.from(f.ctx.playbackQueue,x=>x.id),['a','b']);
});
test('source switch preserves sounding audio and the saved order, applying at the boundary',async()=>{
  const f=fixture();f.ctx.playbackQueue=[{id:'a',s:114},{id:'b',s:113}];
  f.ctx.audio.currentTime=12.5;f.ctx.repeatMode='all';
  const before=JSON.stringify(f.ctx.play),request=f.ctx.playbackRequestId;
  assert.equal(f.run('setQueuePlayback(true)'),true);
  assert.equal(f.ctx.queueIndex,-1);assert.equal(JSON.stringify(f.ctx.play),before);
  assert.equal(f.ctx.audio.currentTime,12.5);assert.equal(f.ctx.audio.paused,false);
  assert.equal(f.ctx.playbackRequestId,request);assert.equal(f.ctx.played.length,0);
  f.ctx.play.current=4;assert.equal(f.run('nextPlaybackRefForPriming().s'),114);
  await f.run('finishCurrentAyah()');assert.equal(f.ctx.play.surah,114);assert.equal(f.ctx.queueIndex,0);
  f.run('setQueuePlayback(false)');assert.equal(f.ctx.repeatMode,'all');assert.equal(f.ctx.played.length,1);
  assert.equal(f.ctx.audio.currentTime,12.5);assert.equal(f.ctx.audio.paused,false);
  f.ctx.play.current=6;assert.equal(f.run('nextPlaybackRefForPriming().s'),1);
  await f.run('finishCurrentAyah()');assert.equal(f.ctx.play.surah,1);
  assert.deepEqual(Array.from(f.ctx.playbackQueue,x=>x.id),['a','b']);
});
test('enabling a saved list attaches to the current entry and preserves its position on repeated enable',()=>{
  const f=fixture();f.ctx.playbackQueue=[{id:'a',s:114},{id:'b',s:112},{id:'c',s:112}];
  f.run('setQueuePlayback(true)');assert.equal(f.ctx.queueIndex,1);
  f.ctx.queueIndex=2;f.run('setQueuePlayback(true)');assert.equal(f.ctx.queueIndex,2);
  f.ctx.play.current=4;assert.equal(f.run('nextSurahRef()'),null);
  f.ctx.repeatMode='all';assert.equal(f.run('nextSurahRef().s'),114);
});
test('empty list cannot be enabled and switching a paused player does not start it',()=>{
  const f=fixture();assert.equal(f.run('setQueuePlayback(true)'),false);assert.equal(f.ctx.queueActive,false);
  f.ctx.playbackQueue=[{id:'a',s:114}];f.ctx.audio.paused=true;f.ctx.repeatMode='one';
  f.run('setQueuePlayback(true)');f.run('setQueuePlayback(false)');
  assert.equal(f.ctx.audio.paused,true);assert.equal(f.ctx.played.length,0);
  assert.equal(f.ctx.repeatMode,'one');assert.equal(f.run('nextSurahRef().s'),112);
});

test('panel and sheet queue switches share state, including an empty saved list',()=>{
  const node=()=>({attributes:{},classes:new Set(),classList:{toggle(name,on){on?this.owner.classes.add(name):this.owner.classes.delete(name)}},setAttribute(name,value){this.attributes[name]=value}});
  const nodes=new Map(['queueBtn','queueToggle','queueEnabled','queueSourceHint'].map(id=>{const n=node();n.classList.owner=n;return [id,n]}));
  const context=vm.createContext({document:{getElementById:id=>nodes.get(id)||null},queueActive:false,playbackQueue:[]});
  vm.runInContext(chunk('function syncQueueControls(', 'function setQueuePlayback('),context);
  const sync=()=>vm.runInContext('syncQueueControls()',context);
  sync();assert.equal(nodes.get('queueToggle').disabled,true);assert.equal(nodes.get('queueEnabled').disabled,true);
  context.playbackQueue=[{id:'saved',s:112}];context.queueActive=true;sync();
  assert.equal(nodes.get('queueToggle').attributes['aria-checked'],'true');assert.equal(nodes.get('queueToggle').disabled,false);
  assert.equal(nodes.get('queueEnabled').checked,true);assert.equal(nodes.get('queueBtn').classes.has('active'),true);
  context.queueActive=false;sync();assert.equal(nodes.get('queueToggle').attributes['aria-checked'],'false');
  assert.equal(nodes.get('queueEnabled').checked,false);assert.equal(nodes.get('queueBtn').classes.has('active'),false);
  assert.equal(context.playbackQueue[0].id,'saved');assert.match(nodes.get('queueSourceHint').textContent,/محفوظة/);
  nodes.delete('queueEnabled');nodes.delete('queueSourceHint');sync(); // The sheet can be closed.
});

test('whole-surah recordings follow the queue once without fabricating ayah progress',async()=>{
  const f=fixture();Object.assign(f.ctx,{reciter:{id:'hamoud',provider:'surah'},queueActive:true,queueIndex:0,playbackQueue:[{s:112},{s:114},{s:112}]});
  f.ctx.audio.dataset.playMode='surah';
  await f.ctx.audio.onended();assert.equal(f.ctx.play.surah,114);assert.equal(f.ctx.queueIndex,1);
  await f.ctx.audio.onended();assert.equal(f.ctx.play.surah,112);assert.equal(f.ctx.queueIndex,2);
  await f.ctx.audio.onended();assert.equal(f.ctx.audio.paused,true);assert.equal(f.ctx.played.length,2);
  assert.equal(f.ctx.play.current,1);assert.equal(f.ctx.activeTimingRows,null);
});
test('whole-surah repeat handles one surah, playlist wrap and Quran wrap',async()=>{
  const f=fixture();Object.assign(f.ctx,{reciter:{id:'hamoud',provider:'surah'},repeatMode:'one'});
  await f.run('finishWholeSurah()');assert.equal(f.ctx.play.surah,112);
  Object.assign(f.ctx,{repeatMode:'all',queueActive:true,queueIndex:1,playbackQueue:[{s:113},{s:112}]});
  await f.run('finishWholeSurah()');assert.equal(f.ctx.play.surah,113);assert.equal(f.ctx.queueIndex,0);
  f.ctx.queueActive=false;f.ctx.play.surah=114;await f.run('finishWholeSurah()');assert.equal(f.ctx.play.surah,1);
});
test('whole-surah playback stops at the end when continuation is disabled',async()=>{
  const f=fixture();Object.assign(f.ctx,{reciter:{id:'hamoud',provider:'surah'},continuousMode:false});
  await f.run('finishWholeSurah()');assert.equal(f.ctx.played.length,0);assert.equal(f.ctx.audio.paused,true);
});
test('whole-surah sleep deadline and end-of-surah timer override repeating',async()=>{
  for(const kind of ['deadline','surah']){
    const f=fixture();Object.assign(f.ctx,{reciter:{id:'hamoud',provider:'surah'},repeatMode:'one'});
    if(kind==='deadline')f.ctx.sleepDeadline=9000;else f.ctx.sleepAfterSurah=true;
    await f.run('finishWholeSurah()');assert.equal(f.ctx.played.length,0);assert.equal(f.ctx.audio.paused,true);assert.equal(f.ctx.playbackWanted,false);
  }
});
test('whole-surah seeking changes time without a false selected ayah or request cancellation',()=>{
  const f=fixture();f.ctx.reciter={provider:'surah'};f.ctx.audio.dataset.playMode='surah';f.ctx.audio.duration=200;
  f.ctx.paintAudioProgress=()=>{};
  f.run(chunk('function timedSurahProgressMode(){','function paintAudioProgress('));
  f.run(chunk('function seekAudioProgress(', 'function populateReciters('));
  f.run('seekAudioProgress(750)');assert.equal(f.ctx.audio.currentTime,150);assert.equal(f.ctx.play.current,1);assert.equal(f.ctx.playbackRequestId,1);
});
test('whole-surah source resets stale ayah restrictions before playing and uses no timing resolver',async()=>{
  const f=fixture();Object.assign(f.ctx,{reciter:{id:'hamoud',provider:'surah',audioBase:'https://media.way2quran.com/mahmoud-fayyad-al-hamoud/hafs-an-asim/'},repeatMode:'all',queueActive:true,queueIndex:0,playbackQueue:[{s:112}],continuousStopRef:{s:112,a:3}});
  Object.assign(f.ctx.play,{current:3,from:3,to:4,repeatAyah:5,repeatGroup:3});
  f.ctx.document.body={classList:{contains:()=>false}};
  f.ctx.resetAudioProgress=()=>{};f.ctx.showPlayer=()=>{};f.ctx.mediaReady=async()=>{};f.ctx.pad3=n=>String(n).padStart(3,'0');
  f.ctx.audio.load=()=>{};f.ctx.audio.play=async()=>{};f.ctx.audio.currentTime=44;
  f.ctx.getMp3Timing=()=>{throw Error('timings must not be requested')};
  f.run(chunk('async function playCurrent(', 'async function startSelected('));
  await f.run('playCurrent()');
  assert.match(f.ctx.audio.src,/hafs-an-asim\/112\.mp3$/);assert.equal(f.ctx.audio.currentTime,0);
  assert.equal(f.ctx.audio.dataset.playMode,'surah');assert.equal(f.ctx.activeSegment,null);assert.equal(f.ctx.activeTimingRows,null);
  assert.equal(f.ctx.play.current,1);assert.equal(f.ctx.play.repeatAyah,1);assert.equal(f.ctx.play.repeatGroup,1);
  assert.equal(f.ctx.continuousStopRef,null);assert.equal(f.ctx.repeatMode,'all');assert.equal(f.ctx.queueActive,true);
});
test('whole-surah preloading follows the active playlist source',async()=>{
  const f=fixture();Object.assign(f.ctx,{reciter:{id:'hamoud',provider:'surah',audioBase:'https://media.way2quran.com/mahmoud-fayyad-al-hamoud/hafs-an-asim/'},queueActive:true,queueIndex:0,playbackQueue:[{s:112},{s:114}],primedTimedSurahSrc:'',primedEveryAyahSrc:''});
  f.ctx.document.body={classList:{contains:()=>true}};f.ctx.audio.dataset.playMode='surah';f.ctx.pad3=n=>String(n).padStart(3,'0');
  f.ctx.isTimedProvider=()=>false;f.ctx.audioPreload={pause(){},load(){}};
  f.run(chunk('async function primeNextTimedSurah(){','function syncPlaybackSelectionInBackground('));
  await f.run('primeNextTimedSurah()');assert.match(f.ctx.audioPreload.src,/114\.mp3$/);
  f.ctx.sleepAfterSurah=true;f.ctx.audioPreload.src='unchanged';await f.run('primeNextTimedSurah()');assert.equal(f.ctx.audioPreload.src,'unchanged');
});
