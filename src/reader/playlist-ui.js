function openPlaybackQueue(){
  const b=sheet("قائمة التشغيل",`<div class="settings">
    <div class="queue-source">
      <label class="queue-source-label" for="queueEnabled"><span>التشغيل من القائمة</span><input type="checkbox" role="switch" id="queueEnabled" aria-describedby="queueSourceHint"><span class="queue-switch" aria-hidden="true"></span></label>
      <p id="queueSourceHint" class="player-hint"></p>
    </div>
    <p class="player-hint">رتّب السور بالسحب أو بالأسهم. تُشغَّل جميع السور بصوت القارئ المختار، وتُحفظ القائمة على هذا الجهاز.</p>
    <div class="field"><label for="queueSurah">إضافة سورة</label><select id="queueSurah">${playerSurahOptions(play.surah)}</select></div>
    <div class="queue-toolbar"><button type="button" id="queueNext">تشغيل تالياً</button><button type="button" id="queueAppend">إضافة إلى النهاية</button></div>
    <div id="queueStatus" class="player-hint" role="status" aria-live="polite"></div>
    <ol class="queue-list" id="queueList"></ol>
    <div class="queue-toolbar"><button type="button" id="queueStart">تشغيل القائمة</button><button type="button" id="queueClear">مسح القائمة</button></div>
  </div>`);
  b.classList.add("player-backdrop");
  const list=b.querySelector("#queueList");
  function render(){
    syncQueueControls();
    list.innerHTML=playbackQueue.length?playbackQueue.map((item,i)=>`<li class="queue-row ${queueActive&&i===queueIndex?"current":""}" data-index="${i}">
      <button type="button" class="queue-handle" aria-label="اسحب لترتيب سورة ${escapeHtml(verseParts(item.s+":1").sname)}">⠿</button>
      <button type="button" class="queue-track" data-play="${i}">${ar(i+1)} · ${escapeHtml(verseParts(item.s+":1").sname)}<small>${queueActive&&i===queueIndex?"قيد التشغيل":"تشغيل السورة"}</small></button>
      <span class="queue-actions"><button type="button" data-up="${i}" aria-label="نقل إلى الأعلى" ${i===0?"disabled":""}>↑</button><button type="button" data-down="${i}" aria-label="نقل إلى الأسفل" ${i===playbackQueue.length-1?"disabled":""}>↓</button><button type="button" data-remove="${i}" aria-label="حذف السورة">×</button></span></li>`).join(""):"<p class='queue-empty'>القائمة فارغة. أضف السور التي ترغب في سماعها.</p>";
    b.querySelector("#queueStart").disabled=!playbackQueue.length;
    list.querySelectorAll(".queue-handle").forEach(handle=>{
      handle.onpointerdown=e=>{
        if(e.button!==0)return;e.preventDefault();const row=handle.closest("[data-index]"),from=Number(row.dataset.index);
        let target=from;handle.setPointerCapture(e.pointerId);row.classList.add("dragging");
        handle.onpointermove=ev=>{const hit=document.elementFromPoint(ev.clientX,ev.clientY)?.closest("#queueList [data-index]");if(hit)target=Number(hit.dataset.index)};
        handle.onpointerup=()=>{handle.onpointermove=null;handle.onpointerup=null;reorderQueue(from,target);render();b.querySelector("#queueStatus").textContent="تم ترتيب القائمة"};
        handle.onpointercancel=()=>{row.classList.remove("dragging");handle.onpointermove=null;handle.onpointerup=null};
      };
    });
  }
  list.onclick=async e=>{
    const button=e.target.closest("button");if(!button)return;
    if(button.hasAttribute("data-play")){const i=Number(button.dataset.play);b.remove();await playQueueEntry(i);return}
    if(button.hasAttribute("data-up"))reorderQueue(Number(button.dataset.up),Number(button.dataset.up)-1);
    if(button.hasAttribute("data-down"))reorderQueue(Number(button.dataset.down),Number(button.dataset.down)+1);
    if(button.hasAttribute("data-remove")){
      const i=Number(button.dataset.remove);
      // Removing the sounding entry leaves the audio playing outside the queue.
      if(queueActive&&i===queueIndex)detachQueue();else if(queueActive&&i<queueIndex)queueIndex--;
      playbackQueue.splice(i,1);savePlaybackQueue();
    }
    render();
  };
  function add(next){
    if(playbackQueue.length>=300){showToast("القائمة ممتلئة");return}
    // “Play next” attaches the currently sounding surah to a new queue.
    if(next&&!queueActive&&document.body.classList.contains("player-on")){
      playbackQueue.unshift({id:(typeof crypto.randomUUID==="function"?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)),s:play.surah});queueIndex=0;queueActive=true;
      continuousMode=true;continuousStopRef=null;storageSet(STORAGE_KEYS.continuous,"1");
    }
    const item={id:(typeof crypto.randomUUID==="function"?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)),s:Number(b.querySelector("#queueSurah").value)};
    playbackQueue.splice(next&&queueActive?queueIndex+1:playbackQueue.length,0,item);
    savePlaybackQueue();render();primeNextEveryAyah();primeNextTimedSurah();
    b.querySelector("#queueStatus").textContent=next?"أُضيفت السورة للتشغيل تالياً":"أُضيفت السورة إلى نهاية القائمة";
  }
  b.querySelector("#queueEnabled").onchange=e=>{setQueuePlayback(e.target.checked);render();b.querySelector("#queueStatus").textContent=queueActive?"فُعّل التشغيل من القائمة دون تغيير السورة الحالية":"أُوقف التشغيل من القائمة. قائمتك محفوظة"};
  b.querySelector("#queueNext").onclick=()=>add(true);b.querySelector("#queueAppend").onclick=()=>add(false);
  b.querySelector("#queueStart").onclick=async()=>{b.remove();await playQueueEntry(0)};
  b.querySelector("#queueClear").onclick=()=>{playbackQueue=[];detachQueue();savePlaybackQueue();render();b.querySelector("#queueStatus").textContent="مُسحت القائمة"};
  render();
}
document.getElementById("queueBtn").onclick=openPlaybackQueue;
document.getElementById("queueToggle").onclick=()=>{
  if(setQueuePlayback(!queueActive))showToast(queueActive?"فُعّل التشغيل من القائمة":"المتابعة حسب ترتيب المصحف. قائمتك محفوظة");
};

populateReciters();syncReciterCapabilities();
