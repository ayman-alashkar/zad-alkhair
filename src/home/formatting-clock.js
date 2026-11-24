/* ═══════════ موعد الختمة والعدّاد ═══════════ */
function deadlineDialog(){
  if(!state||!state.endDate) return;
  modal(`<div class="deadline-dialog" role="dialog" aria-modal="true" aria-label="موعد انتهاء الختمة">
    <p class="deadline-copy">التاريخ المتفق عليه للانتهاء من القراءة الجماعية لهذه الختمة هو:</p>
    <div class="deadline-date-field">
      <span class="deadline-date-g">${esc(fmtClockG(state.endDate))}</span>
      <span class="deadline-date-h">${esc(fmtClockH(state.endDate))}</span>
    </div>
    <button class="btn gold" id="deadline-close">إغلاق</button>
  </div>`);
  document.getElementById("deadline-close").onclick=closeLayer;
}

/* الوقت المتبقّي حتى نهاية يوم الموعد، في لوحة التقدّم (khatmahProgress). */
function zTick(){
  const hms=document.getElementById("cd-hms");
  if(!hms||!state||!state.endDate) return;
  const days=document.getElementById("cd-days"), lab=document.getElementById("cd-lab");
  const left=new Date(state.endDate+"T23:59:59").getTime()-Date.now();
  if(left<=0){
    if(lab) lab.textContent="انقضى وقت الختمة";
    if(days) days.textContent="";
    hms.textContent=ar("00:00:00");
    return;
  }
  const t=Math.floor(left/1000), p=v=>String(v).padStart(2,"0"), d=Math.floor(t/86400);
  if(days) days.textContent=d?dayWord(d):"";
  hms.textContent=ar(`${p(Math.floor(t/3600)%24)}:${p(Math.floor(t/60)%60)}:${p(t%60)}`);
}
/* حلقة تُصحّح انحرافها، فتقع كل نبضة على رأس الثانية */
function zLoop(){ zTick(); setTimeout(zLoop, 1000-(Date.now()%1000)); }
