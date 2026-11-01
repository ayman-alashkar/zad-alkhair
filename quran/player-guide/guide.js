(()=>{
  'use strict';
  const video=document.getElementById('guideVideo');
  const status=document.getElementById('videoStatus');
  const retry=document.getElementById('retryVideo');
  const start=document.getElementById('startVideo');
  const overlay=document.getElementById('playOverlay');
  const share=document.getElementById('shareGuide');
  const shareStatus=document.getElementById('shareStatus');
  const guideUrl='https://zad-alkhair.net/quran/player-guide/';
  let resumeAt=0;
  let started=false;
  function connect(){
    retry.hidden=true;
    if(navigator.onLine===false){
      start.disabled=true;
      overlay.disabled=true;
      if(video.hasAttribute('src')){
        resumeAt=video.currentTime||resumeAt;
        video.pause();video.removeAttribute('src');video.load();
      }
      status.textContent='أنت دون اتصال. اتصل بالإنترنت لمشاهدة الدليل.';
      return;
    }
    start.disabled=false;
    overlay.disabled=false;
    status.textContent='';
    if(started&&!video.hasAttribute('src'))video.src=video.dataset.src;
  }
  function playGuide(){
    if(navigator.onLine===false){connect();return}
    started=true;video.controls=true;overlay.hidden=true;connect();
    video.play().catch(()=>{
      status.textContent='اضغط تشغيل في نافذة الفيديو لبدء المشاهدة.';
    });
  }
  start.addEventListener('click',playGuide);
  overlay.addEventListener('click',playGuide);
  video.addEventListener('click',()=>{if(!started)playGuide()});
  window.addEventListener('offline',connect);
  window.addEventListener('online',connect);
  video.addEventListener('loadedmetadata',()=>{
    if(resumeAt>0&&resumeAt<video.duration)video.currentTime=resumeAt;
    resumeAt=0;
  });
  video.addEventListener('playing',()=>{status.textContent='';retry.hidden=true;start.hidden=true});
  video.addEventListener('error',()=>{
    if(navigator.onLine===false){connect();return}
    status.textContent='تعذّر تشغيل الفيديو. تحقق من اتصالك ثم أعد المحاولة.';
    retry.hidden=false;
  });
  retry.addEventListener('click',()=>{
    if(navigator.onLine===false){connect();return}
    resumeAt=video.currentTime||resumeAt;
    video.removeAttribute('src');connect();video.load();
    video.play().catch(()=>{});
  });
  share.hidden=false;
  share.addEventListener('click',async()=>{
    shareStatus.textContent='';
    try{
      if(navigator.share){
        await navigator.share({title:'دليل مشغّل التلاوة | زاد الخير',url:guideUrl});
      }else if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(guideUrl);
        shareStatus.textContent='نُسخ رابط الدليل، يمكنك مشاركته الآن.';
      }else{
        shareStatus.textContent='رابط الدليل: '+guideUrl;
      }
    }catch(error){
      if(error.name!=='AbortError')shareStatus.textContent='يمكنك نسخ رابط الدليل من شريط العنوان ومشاركته.';
    }
  });
  connect();
})();
