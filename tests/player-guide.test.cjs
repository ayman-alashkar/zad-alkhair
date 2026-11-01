const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const read=p=>fs.readFileSync(__dirname+'/../'+p,'utf8');

test('guide movie streams directly, preserves range responses, and cannot fall back to offline cache',async()=>{
  const listeners={},calls=[];
  let offline=false;
  const cacheTrap=new Proxy({},{get(){throw Error('Guide must not access Cache Storage')}});
  const ctx=vm.createContext({URL,Request,Response,Headers,AbortController,setTimeout,clearTimeout,console,
    self:{location:new URL('https://example.test/'),registration:{scope:'https://example.test/'},addEventListener:(name,fn)=>listeners[name]=fn},
    caches:cacheTrap,fetch:async(request,options)=>{
      calls.push({request,options});if(offline)throw Error('offline');
      return new Response('movie bytes',{status:206,headers:{'Content-Range':'bytes 0-10/100'}});
    }});
  vm.runInContext(read('sw.js'),ctx);
  function request(){let response;listeners.fetch({request:new Request('https://example.test/Zad-Alkhair-Player-Guide.mp4',{headers:{Range:'bytes=0-10'}}),respondWith:r=>response=r});return response}
  const response=await request();assert.equal(response.status,206);
  assert.equal(response.headers.get('Content-Range'),'bytes 0-10/100');
  assert.equal(calls[0].options.cache,'no-store');assert.equal(calls[0].request.headers.get('Range'),'bytes=0-10');
  offline=true;await assert.rejects(request(),/offline/);
});

function pageFixture(online){
  const events={},videoEvents={},buttonEvents={},overlayEvents={},src=new Map();
  const video={dataset:{src:'/Zad-Alkhair-Player-Guide.mp4'},currentTime:35,duration:110,paused:false,
    hasAttribute:k=>src.has(k),removeAttribute:k=>src.delete(k),pause(){this.paused=true},load(){this.currentTime=0},
    play(){this.paused=false;return Promise.resolve()},addEventListener:(k,fn)=>videoEvents[k]=fn};
  Object.defineProperty(video,'src',{set:v=>src.set('src',v)});
  const elements={guideVideo:video,videoStatus:{textContent:''},startVideo:{hidden:false,addEventListener:(k,fn)=>buttonEvents[k]=fn},playOverlay:{hidden:false,addEventListener:(k,fn)=>overlayEvents[k]=fn},retryVideo:{hidden:true,addEventListener(){}},shareGuide:{hidden:true,addEventListener(){}},shareStatus:{textContent:''}};
  const navigator={onLine:online};
  vm.runInNewContext(read('quran/player-guide/guide.js'),{navigator,window:{addEventListener:(k,fn)=>events[k]=fn},document:{getElementById:k=>elements[k]}});
  return {video,events,videoEvents,buttonEvents,overlayEvents,navigator,elements};
}
test('both the overlaid play button and initial video click attach the source and enable native controls',()=>{
  for(const trigger of [f=>f.overlayEvents.click(),f=>f.videoEvents.click()]){
    const f=pageFixture(true);assert.equal(f.video.hasAttribute('src'),false);
    trigger(f);assert.equal(f.video.hasAttribute('src'),true);
    assert.equal(f.video.controls,true);assert.equal(f.elements.playOverlay.hidden,true);
  }
  const offline=pageFixture(false);offline.overlayEvents.click();
  assert.equal(offline.video.hasAttribute('src'),false);assert.equal(offline.elements.playOverlay.disabled,true);
});
test('online page and reconnect do not attach a video source until an explicit play click',()=>{
  const f=pageFixture(true);assert.equal(f.video.hasAttribute('src'),false);
  f.events.online();assert.equal(f.video.hasAttribute('src'),false);
  f.buttonEvents.click();assert.equal(f.video.hasAttribute('src'),true);
  f.videoEvents.playing();assert.equal(f.elements.startVideo.hidden,true);
});
test('offline visitors do not request the movie; going offline pauses and disconnects playback',()=>{
  const f=pageFixture(false);assert.equal(f.video.hasAttribute('src'),false);assert.match(f.elements.videoStatus.textContent,/دون اتصال/);
  f.buttonEvents.click();assert.equal(f.video.hasAttribute('src'),false);
  f.navigator.onLine=true;f.events.online();assert.equal(f.video.hasAttribute('src'),false);
  f.buttonEvents.click();assert.equal(f.video.hasAttribute('src'),true);
  f.navigator.onLine=false;f.events.offline();assert.equal(f.video.paused,true);assert.equal(f.video.hasAttribute('src'),false);
  f.navigator.onLine=true;f.events.online();f.videoEvents.loadedmetadata();assert.equal(f.video.currentTime,35);
});
test('page uses deferred video loading and a crawlable share image',()=>{
  const html=read('quran/player-guide/index.html');
  assert.match(html,/preload="none"/);assert.match(html,/controlslist="nodownload"/);
  assert.doesNotMatch(html,/<video[^>]*\ssrc=/);assert.doesNotMatch(html,/<a[^>]*\sdownload/);
  assert.match(html,/<meta property="og:image" content="https:\/\/zad-alkhair.net\/social\/player-guide-card-v4.jpg">/);
  assert.ok(fs.statSync(__dirname+'/../social/player-guide-card-v4.jpg').size>10000);
});
