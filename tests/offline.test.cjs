const test=require('node:test');
const assert=require('node:assert/strict');
const {setup}=require('./helpers/service-worker.cjs');

test('shell survives offline startup and query-string reader navigation',async()=>{
  const e=setup();
  assert.equal(await e.run('ensureOfflineShell()'),true);
  e.setFetch(async()=>{throw Error('offline')});
  const root=await e.run("networkFirstDocument(new Request('https://example.test/'))");
  const reader=await e.run("networkFirstDocument(new Request('https://example.test/reader.html?home=1&from=zad'))");
  assert.match(await root.text(),/ok:https:\/\/example\.test\/$/);
  assert.match(await reader.text(),/ok:https:\/\/example\.test\/reader$/);
  await assert.rejects(e.run("networkFirstDocument(new Request('https://example.test/other/'))"),/offline/);
});

test('known shell falls back on server error or a stalled network',async()=>{
  const e=setup();await e.run('ensureOfflineShell()');
  e.setFetch(async()=>new Response('server error',{status:503}));
  assert.match(await (await e.run("networkFirstDocument(new Request('https://example.test/'))")).text(),/ok:https:\/\/example\.test\/$/);
  e.setFetch((r,opts)=>new Promise((resolve,reject)=>opts.signal.addEventListener('abort',()=>reject(Error('timeout')))));
  assert.match(await (await e.run("networkFirstDocument(new Request('https://example.test/reader'))")).text(),/ok:https:\/\/example\.test\/reader$/);
});

test('failed shell refresh retains last good pages',async()=>{
  const e=setup();await e.run('ensureOfflineShell()');
  e.setFetch(async r=>r.url.endsWith('/reader')?new Response('failure',{status:503}):new Response('new index'));
  await e.run('ensureOfflineShell()');
  e.setFetch(async()=>{throw Error('offline')});
  assert.match(await (await e.run("networkFirstDocument(new Request('https://example.test/'))")).text(),/ok:https:\/\/example\.test\/$/);
});

test('offline library resumes only missing files and restores readiness markers',async()=>{
  const e=setup();await e.run('ensureOfflineLibrary()');
  assert.equal((await e.run('packState()')).ready,true);
  const q=e.stores.get('zad-quran-core-v1'), t=e.stores.get('zad-tafsir-alwajeez-v1');
  const page='https://cdn.jsdelivr.net/npm/quran-qcf4@1.0.3/pages/003.json';
  await q.delete(page); await t.delete('https://example.test/__zad_tafsir_alwajeez_v1_ready__');
  e.calls.length=0;e.messages.length=0;
  await e.run('ensureOfflineLibrary()');
  assert.deepEqual(e.calls,[page]);
  assert.equal((await e.run('packState()')).ready,true);
  const progress=e.messages.filter(m=>m.type==='OFFLINE_LIBRARY_PROGRESS');
  assert.ok(progress.length>0&&progress.every(m=>m.total===1));
});

test('failed download remains incomplete and can resume',async()=>{
  const e=setup();const missing='https://cdn.jsdelivr.net/npm/quran-qcf4@1.0.3/pages/001.json';
  e.setFetch(async r=>r.url===missing?new Response('fail',{status:503}):new Response('ok'));
  assert.equal((await e.run('ensureOfflineLibrary()')).ready,false);
  const progress=e.messages.filter(m=>m.type==='OFFLINE_LIBRARY_PROGRESS');
  assert.ok(progress.at(-1).done<progress.at(-1).total);
  e.calls.length=0;e.setFetch(async()=>new Response('ok'));
  assert.equal((await e.run('ensureOfflineLibrary()')).ready,true);
  assert.deepEqual(e.calls,[missing]);
});

test('concurrent shell refreshes share one staging operation',async()=>{
  const e=setup();
  const result=await e.run('Promise.all([ensureOfflineShell(),ensureOfflineShell(),ensureOfflineShell()])');
  assert.deepEqual(Array.from(result),[true,true,true]);
  assert.equal(e.calls.filter(u=>u==='https://example.test/').length,1);
  assert.equal(e.calls.filter(u=>u==='https://example.test/reader').length,1);
});

test('existing redirected shell responses remain usable for offline navigation',async()=>{
  const http=require('node:http');
  const server=http.createServer((req,res)=>{
    if(req.url==='/redirect'){res.writeHead(302,{Location:'/page'});res.end();return}
    res.writeHead(200,{'Content-Type':'text/html'});res.end('<h1>Saved page</h1>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const redirected=await fetch('http://127.0.0.1:'+server.address().port+'/redirect');
    assert.equal(redirected.redirected,true);
    const e=setup(),cache=await e.run('caches.open("zad-shell-stable-v1")');
    await cache.put(new Request('https://example.test/index.html'),redirected.clone());
    await cache.put(new Request('https://example.test/reader.html'),redirected.clone());
    e.setFetch(async()=>{throw Error('offline')});
    const home=await e.run("networkFirstDocument(new Request('https://example.test/',{redirect:'manual'}))");
    const reader=await e.run("networkFirstDocument(new Request('https://example.test/reader',{redirect:'manual'}))");
    for(const response of [home,reader]){
      assert.equal(response.redirected,false);
      assert.equal(response.headers.get('content-type'),'text/html');
      assert.equal(await response.text(),'<h1>Saved page</h1>');
    }
  }finally{await new Promise(resolve=>server.close(resolve))}
});

test('whole-surah audio from the new host remains seekable from the existing offline cache',async()=>{
  const e=setup(),url='https://media.way2quran.com/mahmoud-fayyad-al-hamoud/hafs-an-asim/112.mp3';
  e.setFetch(async()=>new Response('audio-content',{headers:{'Content-Type':'audio/mpeg'}}));
  const result=await e.run(`cacheAudioResources([{url:${JSON.stringify(url)},kind:"audio"}],"hamoud-test")`);
  assert.equal(result.failed,0);
  e.setFetch(async()=>{throw Error('offline')});
  const full=await e.run(`audioFetch(new Request(${JSON.stringify(url)}))`);assert.equal(await full.text(),'audio-content');
  const range=await e.run(`audioFetch(new Request(${JSON.stringify(url)},{headers:{Range:"bytes=0-3"}}))`);
  assert.equal(range.status,206);assert.equal(range.headers.get('Content-Range'),'bytes 0-3/13');assert.equal(await range.text(),'audi');
});

test('a truncated cached Baqarah file is replaced without touching other downloads',async()=>{
  const e=setup(),cache=await e.run('caches.open(TAFSIR_CACHE)');
  const url='https://example.test/data/tafsir/al-wajeez/002.json';
  await cache.put(url,new Response('Warning: truncated output'));
  await cache.put('https://example.test/data/tafsir/al-wajeez/001.json',new Response('untouched tafsir'));
  const audio=await e.run('caches.open(AUDIO_CACHE)');
  await audio.put('https://example.test/recording.mp3',new Response('untouched audio'));
  const bytes=require('node:fs').readFileSync(__dirname+'/../data/tafsir/al-wajeez/002.json','utf8');
  e.setFetch(async(request,options)=>{assert.equal(request.url,url);assert.equal(options.cache,'no-store');return new Response(bytes)});
  await e.run('repairCachedBaqarah()');
  assert.equal((await (await cache.match(url)).json()).surah,2);
  assert.equal(await (await cache.match('https://example.test/data/tafsir/al-wajeez/001.json')).text(),'untouched tafsir');
  assert.equal(await (await audio.match('https://example.test/recording.mp3')).text(),'untouched audio');
  e.calls.length=0;await e.run('repairCachedBaqarah()');assert.deepEqual(e.calls,[]);
});

test('offline repair invalidates only a broken file and readiness marker so download can resume',async()=>{
  const e=setup(),cache=await e.run('caches.open(TAFSIR_CACHE)');
  const url='https://example.test/data/tafsir/al-wajeez/002.json';
  const marker='https://example.test/__zad_tafsir_alwajeez_v1_ready__';
  await cache.put(url,new Response('truncated'));await cache.put(marker,new Response('ready'));
  e.setFetch(async()=>{throw Error('offline')});
  await e.run('repairCachedBaqarah()');
  assert.equal(await cache.match(url),undefined);assert.equal(await cache.match(marker),undefined);
  assert.equal((await e.run('packState()')).tafsirReady,false);
});

test('a failed repair cannot cache an invalid or incomplete replacement',async()=>{
  for(const response of [new Response('failure',{status:503}),new Response('{}'),new Response('{"surah":2,"ayahs":{}}')]){
    const e=setup(),cache=await e.run('caches.open(TAFSIR_CACHE)');
    const url='https://example.test/data/tafsir/al-wajeez/002.json';
    await cache.put(url,new Response('truncated'));e.setFetch(async()=>response);
    await e.run('repairCachedBaqarah()');assert.equal(await cache.match(url),undefined);
  }
});
