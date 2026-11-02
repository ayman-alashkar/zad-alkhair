/* معرّف عشوائي ثابت لهذا المتصفح، به يُقفل الاسم على صاحبه */
function deviceId(){
  let d=localStorage.getItem("zad:device");
  if(!d){
    d=(crypto.randomUUID?crypto.randomUUID():
       Date.now().toString(36)+Math.random().toString(36).slice(2,12));
    localStorage.setItem("zad:device",d);
  }
  return d;
}

function loadViewer(){
  try{ viewer=JSON.parse(localStorage.getItem(vKey())||"null"); }catch(e){ viewer=null; }
}

/* الرجوع إلى الرئيسية: من الشريط العلوي ومن أزرار الصفحات سواء */
function goHome(){
  clearInterval(lkTimer); lkTimer=null; linking=false;
  /* الرجوع إلى صفحة الختمات لا يغيّر الختمة النشطة. بذلك إذا عاد القارئ
     لاحقًا إلى واجهة زاد الخير ثم اختار «الختمات الجماعية» يرجع إلى ختمته. */
  closeLayer();
  zkReplaceHash("");code="";state=null;viewer=null;screen="home";render();
  loadPublicKhatmahs(true);
}
function toast(m){const t=document.getElementById("toast");t.textContent=m;t.classList.add("show");
  clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("show"),3000);}
const isOrganizer=()=>!!(viewer&&state&&state.organizerId===viewer.id);
const memberOf=id=>((state&&state.members)||[]).find(m=>m.id===id);
const BOOK_ICON=`<svg class="zk-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M12 6.25C10.15 4.85 7.95 4.2 5.15 4.2v12.65c2.75.02 5.08.78 6.85 2.25 1.77-1.47 4.1-2.23 6.85-2.25V4.2c-2.8 0-5 .65-6.85 2.05Z"/>
  <path d="M12 6.25V19.1"/><path d="M7.25 7.55c1.2.1 2.15.38 2.9.84M16.75 7.55c-1.2.1-2.15.38-2.9.84"/>
  <path d="M4 6.25v12.8c3.15-.15 5.82.55 8 2 2.18-1.45 4.85-2.15 8-2V6.25"/>
</svg>`;

const TG_ICON=`<svg class="tgicon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path fill="currentColor" d="M21.35 3.32 18.2 18.18c-.24 1.05-.86 1.31-1.75.82l-4.8-3.54-2.31 2.23c-.26.25-.47.46-.97.46l.34-4.89 8.9-8.04c.39-.34-.08-.54-.6-.2L6.02 11.95l-4.73-1.48c-1.03-.32-1.05-1.03.22-1.52L19.99 1.83c.86-.32 1.61.2 1.36 1.49Z"/>
</svg>`;
const rule=()=>`<div class="rule"><i>◆ ◆ ◆</i></div>`;
