/* Share the reader's appearance preference; run before the stylesheet to avoid a theme flash. */
(()=>{
  'use strict';
  const key='zad:qcf4:theme',root=document.documentElement;
  const moon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.4A8.6 8.6 0 0 1 8.6 3.8a8.8 8.8 0 1 0 11.6 11.6Z"/></svg>';
  const sun='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>';
  function apply(value){
    const dark=value==='dark';root.dataset.theme=dark?'dark':'light';
    const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=dark?'#061F1D':'#F5F0E4';
    const button=document.getElementById('guideTheme');
    if(button){button.hidden=false;button.innerHTML=dark?sun:moon;button.setAttribute('aria-pressed',String(dark));button.setAttribute('aria-label',dark?'تفعيل الوضع النهاري':'تفعيل الوضع الليلي');button.title=button.getAttribute('aria-label')}
  }
  let initial='light';try{initial=localStorage.getItem(key)||'light'}catch(_){}apply(initial);
  document.addEventListener('DOMContentLoaded',()=>{
    apply(root.dataset.theme);
    document.getElementById('guideTheme')?.addEventListener('click',()=>{const next=root.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem(key,next)}catch(_){}apply(next)});
  },{once:true});
  window.addEventListener('storage',event=>{if(event.key===key)apply(event.newValue)});
})();
