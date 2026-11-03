/* Install guide: the header menu on every guide page and the inline guide on /install/.
   Both render the same device chooser. "ثبّت الآن" appears only on the visitor's own
   device, and only when the browser has offered a direct install prompt. */
(()=>{
  'use strict';
  const INSTALLED_KEY='zad:pwa-installed';
  const ua=navigator.userAgent||'';
  const isIOS=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const myDevice=isIOS?'ios':/Android/i.test(ua)?'android':'desktop';
  const embedded=/FBAN|FBAV|Instagram|Line\/|; wv\)|Telegram/i.test(ua);
  const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  let installedFlag=false;try{installedFlag=localStorage.getItem(INSTALLED_KEY)==='1'}catch(_){}
  let promptEvent=null;
  const views=[];

  const svg=path=>`<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
  const icons={
    ios:'<path d="M15.5 3.5c-.9.1-2 .7-2.6 1.5-.6.7-1 1.7-.9 2.6 1 .1 2-.5 2.6-1.3.6-.7 1-1.7.9-2.8Z"/><path d="M16.8 12.6c0-2 1.6-3 1.7-3-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7-.7 0-1.6-.7-2.7-.7C8.4 8 7 8.9 6.3 10.2c-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.5 2.2 2.6 2.2 1 0 1.4-.7 2.7-.7 1.2 0 1.6.7 2.7.7s1.8-1 2.5-2c.8-1.2 1.1-2.3 1.1-2.4 0 0-2.2-.8-2.2-4Z"/>',
    android:'<path d="M5 16v-3a7 7 0 0 1 14 0v3Z"/><path d="m7.5 7.5-1.8-2.6M16.5 7.5l1.8-2.6"/><path d="M9 12.5h.01M15 12.5h.01"/>',
    desktop:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    open:'<path d="M14 4h6v6M10 14 20 4M10 4H4v16h16v-6"/>',
    share:'<path d="M12 15V3m-4 4 4-4 4 4M6 11H5v10h14V11h-1"/>',
    menu:'<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
    add:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8m-4-4h8"/>',
    check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    download:'<path d="M12 3v11m-4-4 4 4 4-4M5 17v3h14v-3"/>',
    chevron:'<path d="m14 6-6 6 6 6"/>',
    back:'<path d="m10 6 6 6-6 6"/>',
    close:'<path d="M6 6l12 12M18 6 6 18"/>'
  };
  const devices={
    ios:{name:'آيفون / آيباد',on:'على آيفون وآيباد',steps:[
      ['open','افتح زاد الخير في متصفح Safari.'],
      ['share','اضغط زر المشاركة في المتصفح.'],
      ['add','اختر «إضافة إلى الشاشة الرئيسية»، وقد تحتاج إلى تمرير القائمة أو فتح «المزيد».'],
      ['check','اضغط «إضافة» لتظهر أيقونة زاد الخير على شاشتك الرئيسية.']]},
    android:{name:'أندرويد',on:'على أندرويد',steps:[
      ['menu','افتح قائمة المتصفح ⋮، ويُفضّل استخدام Chrome.'],
      ['add','اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».'],
      ['check','أكّد الإضافة، ثم افتح زاد الخير من أيقونته على جهازك.']]},
    desktop:{name:'الحاسب',on:'على الحاسب',steps:[
      ['open','افتح زاد الخير في Chrome أو Edge.'],
      ['add','اضغط أيقونة التثبيت في شريط العنوان، أو اختر «تثبيت» من قائمة المتصفح.'],
      ['check','أكّد التثبيت ليفتح زاد الخير في نافذة خاصة به.']]}
  };

  function chooserHtml(){
    return `<p class="ip-question">ما جهازك؟</p><div class="ip-devices">${Object.entries(devices).map(([id,d])=>
      `<button class="ip-device" type="button" data-device="${id}"><span class="ip-icon">${svg(icons[id])}</span><span class="ip-name">${d.name}${id===myDevice?'<small>جهازك</small>':''}</span><span class="ip-chevron">${svg(icons.chevron)}</span></button>`).join('')}</div>`;
  }
  function stepsHtml(id){
    const d=devices[id];
    const direct=id===myDevice&&promptEvent;
    return `<button class="ip-back" type="button">${svg(icons.back)}<span>كل الأجهزة</span></button>
<h3 class="ip-title">خطوات التثبيت ${d.on}</h3>
<ol class="ip-steps">${d.steps.map(([icon,text])=>`<li><span class="ip-icon">${svg(icons[icon])}</span><span>${text}</span></li>`).join('')}</ol>
${direct?`<button class="btn primary ip-now" type="button">${svg(icons.download)}<span>ثبّت الآن</span></button>`:''}
${id===myDevice&&embedded?'<p class="ip-note">إذا فتحت الرابط داخل تطبيق مراسلة، افتحه أولًا في المتصفح من قائمة التطبيق، ثم اتبع الخطوات.</p>':''}`;
  }
  function render(view){
    const body=view.body;
    body.innerHTML=view.device?stepsHtml(view.device):chooserHtml();
    body.querySelectorAll('.ip-device').forEach(b=>b.addEventListener('click',()=>{view.device=b.dataset.device;render(view);body.querySelector('.ip-back')?.focus()}));
    body.querySelector('.ip-back')?.addEventListener('click',()=>{const from=view.device;view.device=null;render(view);body.querySelector(`[data-device="${from}"]`)?.focus()});
    body.querySelector('.ip-now')?.addEventListener('click',installNow);
  }
  function rerenderAll(){views.forEach(render)}

  async function installNow(){
    const pending=promptEvent;if(!pending)return;
    promptEvent=null;
    let choice=null;
    try{await pending.prompt();choice=await pending.userChoice}catch(_){}
    if(choice&&choice.outcome==='accepted')markInstalled();
    else rerenderAll();
  }

  /* Anonymous install analytics, unchanged from the former install page. */
  const ZK_SUPABASE_URL='https://webqpbcijjbawatykoxe.supabase.co';
  const ZK_SUPABASE_KEY='sb_publishable_51JPJ2XgwWW5l66bwqHN3Q_CJrEtyZv';
  function installId(){
    try{
      let id=localStorage.getItem('zad:pwa-install-id');
      if(id&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return id;
      if(!crypto.randomUUID)return null;
      id=crypto.randomUUID();localStorage.setItem('zad:pwa-install-id',id);return id;
    }catch(_){return null}
  }
  function recordInstallAccepted(){
    const id=installId();if(!id)return;
    fetch(`${ZK_SUPABASE_URL}/rest/v1/rpc/record_pwa_install`,{method:'POST',keepalive:true,
      headers:{'Content-Type':'application/json',apikey:ZK_SUPABASE_KEY,Authorization:`Bearer ${ZK_SUPABASE_KEY}`},
      body:JSON.stringify({p_device_id:id,p_platform:myDevice,p_event:'install_accepted',p_app_version:'v115'})}).catch(()=>{});
  }

  function markInstalled(){
    installedFlag=true;try{localStorage.setItem(INSTALLED_KEY,'1')}catch(_){}
    paint();
  }
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();promptEvent=event;
    /* The browser only offers this when the app is not installed, so an old flag is stale. */
    installedFlag=false;try{localStorage.removeItem(INSTALLED_KEY)}catch(_){}
    paint();rerenderAll();
  });
  window.addEventListener('appinstalled',()=>{promptEvent=null;recordInstallAccepted();markInstalled()});

  let menu,button,panel;
  function paint(){
    const installed=standalone()||installedFlag;
    if(menu){menu.hidden=installed;if(installed)closeMenu(false)}
    document.querySelectorAll('[data-install-link]').forEach(link=>{link.hidden=installed});
    const done=document.getElementById('installDone');if(done)done.hidden=!installed;
  }
  function openMenu(){
    panel.hidden=false;button.setAttribute('aria-expanded','true');
    (panel.querySelector('.ip-device,.ip-back')||panel).focus();
  }
  function closeMenu(returnFocus=true){
    if(!panel||panel.hidden)return;
    panel.hidden=true;button.setAttribute('aria-expanded','false');
    const view=views.find(v=>v.body.closest('#installPanel'));if(view){view.device=null;render(view)}
    if(returnFocus)button.focus();
  }

  {
    menu=document.getElementById('installMenu');
    button=document.getElementById('guideInstall');
    panel=document.getElementById('installPanel');
    if(menu&&button&&panel){
      const view={body:panel.querySelector('.ip-body'),device:null};views.push(view);render(view);
      button.addEventListener('click',()=>panel.hidden?openMenu():closeMenu());
      panel.querySelector('.ip-close')?.addEventListener('click',()=>closeMenu());
      // composedPath() is fixed at dispatch, so a click that re-renders the panel still counts as inside.
      document.addEventListener('click',event=>{if(!event.composedPath().includes(menu))closeMenu(false)});
      document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu()});
    }
    /* /install/ starts on the visitor's own device. */
    const inline=document.getElementById('installGuide');
    if(inline){const view={body:inline,device:myDevice};views.push(view);render(view)}
    /* /install/: share the canonical page so each recipient sees the steps for their own device. */
    const share=document.getElementById('installShare');
    if(share){
      const status=document.getElementById('installShareStatus');
      const url=document.querySelector('link[rel="canonical"]')?.href||location.origin+'/install/';
      const say=text=>{if(!status)return;status.textContent=text;clearTimeout(say.timer);say.timer=setTimeout(()=>{status.textContent=''},3000)};
      share.addEventListener('click',async()=>{
        if(navigator.share){
          try{await navigator.share({title:'تثبيت تطبيق زاد الخير',text:'ثبّت تطبيق زاد الخير على جهازك:',url});return}
          catch(error){if(error&&error.name==='AbortError')return}
        }
        try{await navigator.clipboard.writeText(url);say('تم نسخ الرابط')}
        catch(_){say(url)}
      });
    }
    paint();
  }
  try{window.matchMedia('(display-mode: standalone)').addEventListener('change',paint)}catch(_){}
})();
