
const JUZ=[
 "الفاتحة ١ – البقرة ١٤١","البقرة ١٤٢ – ٢٥٢","البقرة ٢٥٣ – آل عمران ٩٢","آل عمران ٩٣ – النساء ٢٣",
 "النساء ٢٤ – ١٤٧","النساء ١٤٨ – المائدة ٨١","المائدة ٨٢ – الأنعام ١١٠","الأنعام ١١١ – الأعراف ٨٧",
 "الأعراف ٨٨ – الأنفال ٤٠","الأنفال ٤١ – التوبة ٩٢","التوبة ٩٣ – هود ٥","هود ٦ – يوسف ٥٢",
 "يوسف ٥٣ – إبراهيم ٥٢","الحجر ١ – النحل ١٢٨","الإسراء ١ – الكهف ٧٤","الكهف ٧٥ – طه ١٣٥",
 "الأنبياء ١ – الحج ٧٨","المؤمنون ١ – الفرقان ٢٠","الفرقان ٢١ – النمل ٥٥","النمل ٥٦ – العنكبوت ٤٥",
 "العنكبوت ٤٦ – الأحزاب ٣٠","الأحزاب ٣١ – يس ٢٧","يس ٢٨ – الزمر ٣١","الزمر ٣٢ – فصلت ٤٦",
 "فصلت ٤٧ – الجاثية ٣٧","الأحقاف ١ – الذاريات ٣٠","الذاريات ٣١ – الحديد ٢٩","المجادلة ١ – التحريم ١٢",
 "الملك ١ – المرسلات ٥٠","النبأ ١ – الناس ٦"];

const MOTIV=[
 {t:"تذكّر أن كل حرف تقرؤه سيقف عنك يوم القيامة شافعًا.",
  q:"اقْرَؤُوا الْقُرْآنَ؛ فَإِنَّهُ يَأْتِي يَوْمَ الْقِيَامَةِ شَفِيعًا لِأَصْحَابِهِ",s:"رواه مسلم",k:"h"},
 {t:"في هذه السورة بركة لا يعرفها إلا من لازمها.",
  q:"اقْرَؤُوا سُورَةَ الْبَقَرَةِ؛ فَإِنَّ أَخْذَهَا بَرَكَةٌ، وَتَرْكَهَا حَسْرَةٌ",s:"رواه مسلم",k:"h"},
 {t:"في جزئك خاتمة البقرة، فلا تمرّ عليها مرورًا عابرًا.",
  q:"الْآيَتَانِ مِنْ آخِرِ سُورَةِ الْبَقَرَةِ، مَنْ قَرَأَهُمَا فِي لَيْلَةٍ كَفَتَاهُ",s:"متفق عليه",k:"h"},
 {t:"هذه واحدة من منزلتين تُغبَط عليهما.",
  q:"لَا حَسَدَ إِلَّا فِي اثْنَتَيْنِ: رَجُلٌ آتَاهُ اللَّهُ الْقُرْآنَ فَهُوَ يَقُومُ بِهِ آنَاءَ اللَّيْلِ وَآنَاءَ النَّهَارِ",
  s:"متفق عليه",k:"h"},
 {t:"لا تستصغر آية، فالحساب بالحروف لا بالصفحات.",
  q:"مَنْ قَرَأَ حَرْفًا مِنْ كِتَابِ اللَّهِ فَلَهُ بِهِ حَسَنَةٌ، وَالْحَسَنَةُ بِعَشْرِ أَمْثَالِهَا",
  s:"رواه الترمذي وقال: حسن صحيح",k:"h"},
 {t:"ما بين يديك نور، وما تقرؤه اليوم يستبين به طريقك.",
  q:"قَدْ جَاءَكُمْ مِنَ اللَّهِ نُورٌ وَكِتَابٌ مُبِينٌ",s:"المائدة: ١٥",k:"a"},
 {t:"القرآن يترك في صاحبه أثرًا يُشمّ كما تُشمّ الرائحة الطيبة.",
  q:"مَثَلُ الْمُؤْمِنِ الَّذِي يَقْرَأُ الْقُرْآنَ كَمَثَلِ الْأُتْرُجَّةِ: رِيحُهَا طَيِّبٌ وَطَعْمُهَا طَيِّبٌ",
  s:"متفق عليه",k:"h"},
 {t:"بركة هذا الكتاب في اتّباعه، لا في تلاوته وحدها.",
  q:"وَهَذَا كِتَابٌ أَنْزَلْنَاهُ مُبَارَكٌ فَاتَّبِعُوهُ وَاتَّقُوا لَعَلَّكُمْ تُرْحَمُونَ",s:"الأنعام: ١٥٥",k:"a"},
 {t:"مما ستقرؤه في هذا الجزء، أنّ الله يحول بين المرء وقلبه، فما أشدّ قربه عزّ وجلّ.",
  q:"يَا أَيُّهَا الَّذِينَ آمَنُوا اسْتَجِيبُوا لِلَّهِ وَلِلرَّسُولِ إِذَا دَعَاكُمْ لِمَا يُحْيِيكُمْ وَاعْلَمُوا أَنَّ اللَّهَ يَحُولُ بَيْنَ الْمَرْءِ وَقَلْبِهِ وَأَنَّهُ إِلَيْهِ تُحْشَرُونَ",
  s:"الأنفال: ٢٤",k:"a"},
 {t:"هذا الكتاب يرفع أهله، فاجعل لك منه نصيبًا.",
  q:"إِنَّ اللَّهَ يَرْفَعُ بِهَذَا الْكِتَابِ أَقْوَامًا وَيَضَعُ بِهِ آخَرِينَ",s:"رواه مسلم",k:"h"},
 {t:"إن كان في صدرك ضيق، فدواؤه بين يديك.",
  q:"يَا أَيُّهَا النَّاسُ قَدْ جَاءَتْكُمْ مَوْعِظَةٌ مِنْ رَبِّكُمْ وَشِفَاءٌ لِمَا فِي الصُّدُورِ",s:"يونس: ٥٧",k:"a"},
 {t:"تقرأ اليوم أحسن ما قُصّ على البشر.",
  q:"نَحْنُ نَقُصُّ عَلَيْكَ أَحْسَنَ الْقَصَصِ بِمَا أَوْحَيْنَا إِلَيْكَ هَذَا الْقُرْآنَ",s:"يوسف: ٣",k:"a"},
 {t:"كل آية تزيدها اليوم ترفعك درجة هناك.",
  q:"يُقَالُ لِصَاحِبِ الْقُرْآنِ: اقْرَأْ وَارْتَقِ وَرَتِّلْ كَمَا كُنْتَ تُرَتِّلُ فِي الدُّنْيَا، فَإِنَّ مَنْزِلَتَكَ عِنْدَ آخِرِ آيَةٍ تَقْرَؤُهَا",
  s:"رواه أبو داود والترمذي وقال: حسن صحيح",k:"h"},
 {t:"احفظه في قلبك، يحفظك الله بمعيّته.",
  q:"إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ",s:"الحجر: ٩",k:"a"},
 {t:"في أول جزئك عصمة، فاحرص على حفظ أوائل الكهف.",
  q:"مَنْ حَفِظَ عَشْرَ آيَاتٍ مِنْ أَوَّلِ سُورَةِ الْكَهْفِ عُصِمَ مِنَ الدَّجَّالِ",s:"رواه مسلم",k:"h"},
 {t:"لم يُؤمر النبيّ ﷺ بالاستزادة من شيء إلا من العلم.",
  q:"وَقُلْ رَبِّ زِدْنِي عِلْمًا",s:"طه: ١١٤",k:"a"},
 {t:"فلنعمل بما فيه، فبه شرفنا وفخرنا.",
  q:"لَقَدْ أَنْزَلْنَا إِلَيْكُمْ كِتَابًا فِيهِ ذِكْرُكُمْ",s:"الأنبياء: ١٠",k:"a"},
 {t:"أنت اليوم في جماعة تتدارس كتاب الله، وهذا موعدها.",
  q:"مَا اجْتَمَعَ قَوْمٌ فِي بَيْتٍ مِنْ بُيُوتِ اللَّهِ يَتْلُونَ كِتَابَ اللَّهِ وَيَتَدَارَسُونَهُ بَيْنَهُمْ إِلَّا نَزَلَتْ عَلَيْهِمُ السَّكِينَةُ وَغَشِيَتْهُمُ الرَّحْمَةُ",
  s:"رواه مسلم",k:"h"},
 {t:"هجر القرآن شكوى يرفعها النبيّ ﷺ، فلا تكن ممّن يُشكى.",
  q:"وَقَالَ الرَّسُولُ يَا رَبِّ إِنَّ قَوْمِي اتَّخَذُوا هَذَا الْقُرْآنَ مَهْجُورًا",s:"الفرقان: ٣٠",k:"a"},
 {t:"ادعُه، يسمعك ويستجيب.",
  q:"أَمَّنْ يُجِيبُ الْمُضْطَرَّ إِذَا دَعَاهُ وَيَكْشِفُ السُّوءَ وَيَجْعَلُكُمْ خُلَفَاءَ الْأَرْضِ أَإِلَهٌ مَعَ اللَّهِ قَلِيلًا مَا تَذَكَّرُونَ",
  s:"النمل: ٦٢",k:"a"},
 {t:"موضع هذا الكتاب الصدور، لا الرفوف.",
  q:"بَلْ هُوَ آيَاتٌ بَيِّنَاتٌ فِي صُدُورِ الَّذِينَ أُوتُوا الْعِلْمَ",s:"العنكبوت: ٤٩",k:"a"},
 {t:"اللهم اجعلنا ممّن يذاكر كتابك ويداوم عليه.",
  q:"تَعَاهَدُوا هَذَا الْقُرْآنَ، فَوَالَّذِي نَفْسُ مُحَمَّدٍ بِيَدِهِ لَهُوَ أَشَدُّ تَفَلُّتًا مِنَ الْإِبِلِ فِي عُقُلِهَا",
  s:"متفق عليه",k:"h"},
 {t:"ذكرٌ يُحيي القلب، وبيانٌ لا لبس فيه.",
  q:"إِنْ هُوَ إِلَّا ذِكْرٌ وَقُرْآنٌ مُبِينٌ",s:"يس: ٦٩",k:"a"},
 {t:"أبشِر، وتذكّر أنه: سلِّم لنا تسلَم.",
  q:"إِنَّ الَّذِينَ قَالُوا رَبُّنَا اللَّهُ ثُمَّ اسْتَقَامُوا تَتَنَزَّلُ عَلَيْهِمُ الْمَلَائِكَةُ أَلَّا تَخَافُوا وَلَا تَحْزَنُوا وَأَبْشِرُوا بِالْجَنَّةِ الَّتِي كُنْتُمْ تُوعَدُونَ",
  s:"فصلت: ٣٠",k:"a"},
 {t:"يا تُرى، ما حجّتنا أمام من لغته ليست العربية؟",
  q:"إِنَّا جَعَلْنَاهُ قُرْآنًا عَرَبِيًّا لَعَلَّكُمْ تَعْقِلُونَ",s:"الزخرف: ٣",k:"a"},
 {t:"اقرأ بقلب منشرح، إلى الباري مُقبِل.",
  q:"أَفَلَا يَتَدَبَّرُونَ الْقُرْآنَ أَمْ عَلَى قُلُوبٍ أَقْفَالُهَا",s:"محمد: ٢٤",k:"a"},
 {t:"سبحان من يسّره لنا، فلنُقبِل.",
  q:"وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِنْ مُدَّكِرٍ",s:"القمر: ١٧",k:"a"},
 {t:"الجبل خشع وتصدّع، وقلبك أولى بذلك.",
  q:"لَوْ أَنْزَلْنَا هَذَا الْقُرْآنَ عَلَى جَبَلٍ لَرَأَيْتَهُ خَاشِعًا مُتَصَدِّعًا مِنْ خَشْيَةِ اللَّهِ",s:"الحشر: ٢١",k:"a"},
 {t:"سبحان الله، لا إله إلا هو.",
  q:"وَاذْكُرِ اسْمَ رَبِّكَ وَتَبَتَّلْ إِلَيْهِ تَبْتِيلًا. رَبُّ الْمَشْرِقِ وَالْمَغْرِبِ لَا إِلَهَ إِلَّا هُوَ فَاتَّخِذْهُ وَكِيلًا",
  s:"المزمل: ٨-٩",k:"a"},
 {t:"في خاتمة جزئك سورة تعدل ثلث القرآن.",
  q:"قُلْ هُوَ اللَّهُ أَحَدٌ تَعْدِلُ ثُلُثَ الْقُرْآنِ",s:"رواه مسلم",k:"h"}
];

/* ===================== الإعدادات ===================== */
const SUPABASE_URL = "https://webqpbcijjbawatykoxe.supabase.co";
const SUPABASE_KEY = "sb_publishable_51JPJ2XgwWW5l66bwqHN3Q_CJrEtyZv";
const BOT_USERNAME = "ZadAlkhair_Bot";


/* ═══════════ PWA install analytics · v108 ═══════════
   Supabase is the source of truth. The client persists only one anonymous UUID.
   An installed app UPSERTs its own row on each real app launch. If offline, the
   request simply fails harmlessly and the next launch / online event retries it.
   Normal browser visits are never counted. */
const PWA_INSTALL_ID_KEY="zad:pwa-install-id";
const PWA_APP_VERSION="v115";
let pwaInstallReportBusy=false;
let pwaInstallReportedThisPage=false;

function pwaIsStandalone(){
  return window.matchMedia("(display-mode: standalone)").matches ||
         window.navigator.standalone===true;
}
let pwaInstallPrompt=null;
const pwaInstallButton=document.getElementById("zk-launch-install");
function pwaPaintInstallButton(){
  if(pwaInstallButton)pwaInstallButton.hidden=pwaIsStandalone();
}
window.addEventListener("beforeinstallprompt",event=>{
  event.preventDefault();pwaInstallPrompt=event;pwaPaintInstallButton();
});
window.addEventListener("appinstalled",()=>{
  pwaInstallPrompt=null;if(pwaInstallButton)pwaInstallButton.hidden=true;
});
try{
  window.matchMedia("(display-mode: standalone)").addEventListener("change",pwaPaintInstallButton);
}catch(_){ }
pwaInstallButton?.addEventListener("click",async event=>{
  if(pwaIsStandalone()){event.preventDefault();pwaInstallButton.hidden=true;return}
  if(!pwaInstallPrompt)return;
  event.preventDefault();
  const prompt=pwaInstallPrompt;pwaInstallPrompt=null;
  await prompt.prompt();
  const choice=await prompt.userChoice.catch(()=>null);
  if(choice&&choice.outcome==="accepted")pwaInstallButton.hidden=true;
  else pwaPaintInstallButton();
});
pwaPaintInstallButton();
function pwaInstallPlatform(){
  const ua=navigator.userAgent||"";
  const uaPlatform=navigator.userAgentData&&navigator.userAgentData.platform||"";
  if(/Android/i.test(ua)||/Android/i.test(uaPlatform)) return "android";
  if(/iPad|iPhone|iPod/i.test(ua)||
     /iPad|iPhone|iPod|iOS/i.test(uaPlatform)||
     (navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1)) return "ios";
  if(/Windows|Macintosh|MacIntel|Linux|CrOS/i.test(`${ua} ${uaPlatform} ${navigator.platform||""}`)) return "desktop";
  return "other";
}
function pwaInstallId(){
  try{
    let id=localStorage.getItem(PWA_INSTALL_ID_KEY);
    const valid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if(id&&valid.test(id)) return id;
    if(crypto.randomUUID) id=crypto.randomUUID();
    else{
      const b=new Uint8Array(16);crypto.getRandomValues(b);
      b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;
      const h=[...b].map(v=>v.toString(16).padStart(2,"0")).join("");
      id=`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
    }
    localStorage.setItem(PWA_INSTALL_ID_KEY,id);
    return id;
  }catch(_){ return null; }
}
function pwaClearLegacyAnalyticsFlags(){
  try{
    [
      "zad:pwa-standalone-reported-v1",
      "zad:pwa-standalone-reported-v2",
      "zad:pwa-standalone-pending-v1",
      "zad:pwa-standalone-pending-v2",
      "zad:pwa-install-accepted-reported-v1"
    ].forEach(k=>localStorage.removeItem(k));
  }catch(_){ }
}
async function pwaReportStandalone(){
  if(!pwaIsStandalone()||pwaInstallReportBusy||pwaInstallReportedThisPage) return;
  const id=pwaInstallId();
  if(!id) return;

  pwaInstallReportBusy=true;
  try{
    const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/record_pwa_install`,{
      method:"POST",keepalive:true,
      headers:{"Content-Type":"application/json",apikey:SUPABASE_KEY,Authorization:"Bearer "+SUPABASE_KEY},
      body:JSON.stringify({
        p_device_id:id,
        p_platform:pwaInstallPlatform(),
        p_event:"standalone_open",
        p_app_version:PWA_APP_VERSION
      })
    });
    if(r.ok) pwaInstallReportedThisPage=true;
  }catch(_){
    /* Analytics must never interfere with app startup or offline use. */
  }finally{
    pwaInstallReportBusy=false;
  }
}

pwaClearLegacyAnalyticsFlags();
pwaReportStandalone();
window.addEventListener("online",pwaReportStandalone,{passive:true});

/* موضع بدء كل جزء: رقم السورة ورقم الآية.
   منه يُبنى رابط القراءة، فيفتح المصحف عند أول الجزء لا أول السورة. */
const JUZ_START=[
  [1,1],   [2,142], [2,253], [3,93],  [4,24],  [4,148], [5,82],  [6,111],
  [7,88],  [8,41],  [9,93],  [11,6],  [12,53], [15,1],  [17,1],  [18,75],
  [21,1],  [23,1],  [25,21], [27,56], [29,46], [33,31], [36,28], [39,32],
  [41,47], [46,1],  [51,31], [58,1],  [67,1],  [78,1],
];
function readerLink(j=null,khatmahCode=code){
  const q=new URLSearchParams();
  const n=Number(j);
  if(n>=1&&n<=30) q.set("juz",String(n));
  else q.set("home","1");
  const c=String(khatmahCode||"").trim().toUpperCase();
  if(c) q.set("code",c);
  const tail=q.toString();
  return "reader.html"+(tail?"?"+tail:"");
}
function sharedJuzLink(j,khatmahCode=code){
  const n=Number(j);
  if(!(n>=1&&n<=30)) return readerLink(j,khatmahCode);
  const q=new URLSearchParams();
  const c=String(khatmahCode||"").trim().toUpperCase();
  if(c) q.set("code",c);
  const tail=q.toString();
  return `juz/${n}/`+(tail?`?${tail}`:"");
}
const readLink=j=>sharedJuzLink(j);



/* ═══════════ مواقيت الصلاة ═══════════
   الحساب يجري على جهاز القارئ بمكتبة adhan، بلا نداء شبكة.
   البلدان: [الاسم، المنطقة الزمنية، طريقة الحساب المعتادة، [المدن]]
   المدينة: [الاسم، خط العرض، خط الطول، منطقة زمنية خاصة (اختيارية)] */
const PT_KEY="zad:prayer";
const PRAYER_ICON=`<svg class="zk-icon" viewBox="0 0 25 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M9.15309 9C5.68214 5.5 11.0125 3.75 12.5 2C13.9875 3.75 19.3179 5.5 15.8469 9H9.15309Z"/>
  <path d="M18.5 12V11C18.5 10.0572 18.5 9.58579 18.2071 9.29289C17.9142 9 17.4428 9 16.5 9H8.5C7.55719 9 7.08579 9 6.79289 9.29289C6.5 9.58579 6.5 10.0572 6.5 11V12"/>
  <path d="M17.5 12H7.5C6.08579 12 5.37868 12 4.93934 12.4393C4.5 12.8787 4.5 13.5858 4.5 15V19C4.5 20.4142 4.5 21.1213 4.93934 21.5607C5.37868 22 6.08579 22 7.5 22H17.5C18.9142 22 19.6213 22 20.0607 21.5607C20.5 21.1213 20.5 20.4142 20.5 19V15C20.5 13.5858 20.5 12.8787 20.0607 12.4393C19.6213 12 18.9142 12 17.5 12Z"/>
  <path d="M10.0001 22V19C9.98279 16 12.5 15 12.5 15C12.5 15 15.0172 16 14.9999 19V22"/>
</svg>`;

const PT_NAMES={fajr:"الفجر",sunrise:"الشروق",dhuhr:"الظهر",asr:"العصر",maghrib:"المغرب",isha:"العشاء"};
const PT_ORDER=["fajr","sunrise","dhuhr","asr","maghrib","isha"];
const PT_METHODS={
  MuslimWorldLeague:"رابطة العالم الإسلامي",
  UmmAlQura:"أم القرى — مكة المكرمة",
  Egyptian:"الهيئة المصرية العامة للمساحة",
  Karachi:"جامعة العلوم الإسلامية — كراتشي",
  Dubai:"دائرة الشؤون الإسلامية — دبي",
  Qatar:"مؤسسة قطر",
  Kuwait:"وزارة الأوقاف — الكويت",
  Turkey:"رئاسة الشؤون الدينية — تركيا",
  Tehran:"معهد الجيوفيزياء — طهران",
  NorthAmerica:"الجمعية الإسلامية لأمريكا الشمالية",
  Singapore:"المجلس الإسلامي — سنغافورة",
  MoonsightingCommittee:"لجنة رؤية الهلال",
};

const PT_LANDS=[
["سوريا","Asia/Damascus","MuslimWorldLeague",[["دمشق",33.5138,36.2765],["حلب",36.2021,37.1343],["حمص",34.7308,36.7090],["حماة",35.1318,36.7578],["اللاذقية",35.5196,35.7915],["طرطوس",34.8890,35.8866],["دير الزور",35.3359,40.1408],["الرقة",35.9594,39.0079],["إدلب",35.9306,36.6339],["درعا",32.6189,36.1021],["السويداء",32.7094,36.5694],["الحسكة",36.5024,40.7477],["القامشلي",37.0521,41.2314]]],
["لبنان","Asia/Beirut","MuslimWorldLeague",[["بيروت",33.8938,35.5018],["طرابلس",34.4367,35.8497],["صيدا",33.5571,35.3729],["صور",33.2704,35.2038],["زحلة",33.8463,35.9019],["بعلبك",34.0058,36.2181],["النبطية",33.3789,35.4839]]],
["الأردن","Asia/Amman","MuslimWorldLeague",[["عمّان",31.9539,35.9106],["الزرقاء",32.0728,36.0880],["إربد",32.5556,35.8500],["العقبة",29.5321,35.0063],["المفرق",32.3430,36.2080],["الكرك",31.1854,35.7047],["مادبا",31.7160,35.7950]]],
["فلسطين","Asia/Hebron","MuslimWorldLeague",[["القدس",31.7683,35.2137],["غزة",31.5017,34.4668],["رام الله",31.9038,35.2034],["نابلس",32.2211,35.2544],["الخليل",31.5326,35.0998],["بيت لحم",31.7054,35.2024],["جنين",32.4597,35.3000],["طولكرم",32.3104,35.0286],["أريحا",31.8667,35.4500],["خان يونس",31.3400,34.3060]]],
["العراق","Asia/Baghdad","MuslimWorldLeague",[["بغداد",33.3152,44.3661],["البصرة",30.5085,47.7804],["الموصل",36.3350,43.1189],["أربيل",36.1911,44.0092],["النجف",31.9990,44.3148],["كربلاء",32.6160,44.0249],["السليمانية",35.5556,45.4351],["كركوك",35.4681,44.3922],["الرمادي",33.4258,43.3089],["الناصرية",31.0540,46.2570]]],
["السعودية","Asia/Riyadh","UmmAlQura",[["مكة المكرمة",21.4225,39.8262],["المدينة المنورة",24.4672,39.6111],["الرياض",24.7136,46.6753],["جدة",21.4858,39.1925],["الدمام",26.4207,50.0888],["الخبر",26.2794,50.2083],["الطائف",21.2703,40.4158],["تبوك",28.3835,36.5662],["أبها",18.2164,42.5053],["بريدة",26.3260,43.9750],["حائل",27.5219,41.6907],["جازان",16.8892,42.5511],["نجران",17.4917,44.1322],["الأحساء",25.3833,49.5833]]],
["مصر","Africa/Cairo","Egyptian",[["القاهرة",30.0444,31.2357],["الإسكندرية",31.2001,29.9187],["الجيزة",30.0131,31.2089],["بورسعيد",31.2653,32.3019],["السويس",29.9668,32.5498],["المنصورة",31.0409,31.3785],["طنطا",30.7865,31.0004],["أسيوط",27.1809,31.1837],["الأقصر",25.6872,32.6396],["أسوان",24.0889,32.8998],["الإسماعيلية",30.5965,32.2715],["دمياط",31.4165,31.8133],["المنيا",28.1099,30.7503],["سوهاج",26.5569,31.6948]]],
["الإمارات","Asia/Dubai","Dubai",[["دبي",25.2048,55.2708],["أبوظبي",24.4539,54.3773],["الشارقة",25.3463,55.4209],["العين",24.2075,55.7447],["عجمان",25.4052,55.5136],["رأس الخيمة",25.7895,55.9432],["الفجيرة",25.1288,56.3265],["أم القيوين",25.5647,55.5532]]],
["الكويت","Asia/Kuwait","Kuwait",[["مدينة الكويت",29.3759,47.9774],["حولي",29.3328,48.0289],["الأحمدي",29.0769,48.0838],["الجهراء",29.3375,47.6581],["الفروانية",29.2775,47.9589],["السالمية",29.3394,48.0758]]],
["قطر","Asia/Qatar","Qatar",[["الدوحة",25.2854,51.5310],["الريان",25.2919,51.4244],["الوكرة",25.1715,51.6034],["أم صلال",25.4111,51.4028],["الخور",25.6804,51.4969]]],
["البحرين","Asia/Bahrain","Qatar",[["المنامة",26.2285,50.5860],["المحرق",26.2572,50.6119],["الرفاع",26.1300,50.5550],["مدينة عيسى",26.1736,50.5478]]],
["عُمان","Asia/Muscat","MuslimWorldLeague",[["مسقط",23.5880,58.3829],["صلالة",17.0151,54.0924],["صحار",24.3470,56.7094],["نزوى",22.9333,57.5333],["صور",22.5667,59.5289],["إبري",23.2254,56.5158]]],
["اليمن","Asia/Aden","MuslimWorldLeague",[["صنعاء",15.3694,44.1910],["عدن",12.7855,45.0187],["تعز",13.5789,44.0219],["الحديدة",14.7978,42.9545],["المكلا",14.5425,49.1242],["إب",13.9667,44.1833],["سيئون",15.9430,48.7876]]],
["السودان","Africa/Khartoum","Egyptian",[["الخرطوم",15.5007,32.5599],["أم درمان",15.6445,32.4777],["بورتسودان",19.6158,37.2164],["كسلا",15.4510,36.4000],["نيالا",12.0500,24.8833],["الأبيض",13.1833,30.2167],["ود مدني",14.4012,33.5199]]],
["ليبيا","Africa/Tripoli","Egyptian",[["طرابلس",32.8872,13.1913],["بنغازي",32.1167,20.0667],["مصراتة",32.3754,15.0925],["سبها",27.0377,14.4283],["البيضاء",32.7627,21.7551],["الزاوية",32.7571,12.7278]]],
["تونس","Africa/Tunis","MuslimWorldLeague",[["تونس",36.8065,10.1815],["صفاقس",34.7406,10.7603],["سوسة",35.8256,10.6084],["القيروان",35.6781,10.0963],["بنزرت",37.2744,9.8739],["قابس",33.8815,10.0982],["نابل",36.4561,10.7376]]],
["الجزائر","Africa/Algiers","MuslimWorldLeague",[["الجزائر",36.7538,3.0588],["وهران",35.6971,-0.6308],["قسنطينة",36.3650,6.6147],["عنابة",36.9000,7.7667],["باتنة",35.5559,6.1741],["سطيف",36.1898,5.4108],["تلمسان",34.8828,-1.3167],["بجاية",36.7509,5.0567],["ورقلة",31.9539,5.3350]]],
["المغرب","Africa/Casablanca","MuslimWorldLeague",[["الدار البيضاء",33.5731,-7.5898],["الرباط",34.0209,-6.8416],["مراكش",31.6295,-7.9811],["فاس",34.0331,-5.0003],["طنجة",35.7595,-5.8340],["أكادير",30.4278,-9.5981],["مكناس",33.8935,-5.5473],["وجدة",34.6867,-1.9114],["تطوان",35.5785,-5.3684],["العيون",27.1536,-13.2033]]],
["موريتانيا","Africa/Nouakchott","MuslimWorldLeague",[["نواكشوط",18.0735,-15.9582],["نواذيبو",20.9310,-17.0347]]],
["الصومال","Africa/Mogadishu","MuslimWorldLeague",[["مقديشو",2.0469,45.3182],["هرجيسا",9.5600,44.0650],["بوصاصو",11.2842,49.1816]]],
["جيبوتي","Africa/Djibouti","MuslimWorldLeague",[["جيبوتي",11.5721,43.1456]]],
["تركيا","Europe/Istanbul","Turkey",[["إسطنبول",41.0082,28.9784],["أنقرة",39.9334,32.8597],["إزمير",38.4237,27.1428],["بورصة",40.1826,29.0665],["أنطاليا",36.8969,30.7133],["غازي عنتاب",37.0662,37.3833],["قونيا",37.8746,32.4932],["أضنة",37.0000,35.3213],["ترابزون",41.0027,39.7168],["مرسين",36.8000,34.6333],["قيصري",38.7312,35.4787],["أورفا",37.1591,38.7969]]],
["إيران","Asia/Tehran","Tehran",[["طهران",35.6892,51.3890],["مشهد",36.2605,59.6168],["أصفهان",32.6539,51.6660],["شيراز",29.5918,52.5837],["تبريز",38.0800,46.2919],["الأهواز",31.3183,48.6706]]],
["باكستان","Asia/Karachi","Karachi",[["كراتشي",24.8607,67.0011],["لاهور",31.5204,74.3587],["إسلام آباد",33.6844,73.0479],["فيصل آباد",31.4187,73.0791],["بيشاور",34.0151,71.5249],["كويتا",30.1798,66.9750],["ملتان",30.1575,71.5249]]],
["أفغانستان","Asia/Kabul","Karachi",[["كابل",34.5553,69.2075],["قندهار",31.6289,65.7372],["هرات",34.3529,62.2040],["مزار شريف",36.7090,67.1109]]],
["الهند","Asia/Kolkata","Karachi",[["دلهي",28.6139,77.2090],["مومباي",19.0760,72.8777],["حيدر آباد",17.3850,78.4867],["بنغالور",12.9716,77.5946],["كولكاتا",22.5726,88.3639],["تشيناي",13.0827,80.2707],["لكناو",26.8467,80.9462]]],
["بنغلاديش","Asia/Dhaka","Karachi",[["دكا",23.8103,90.4125],["شيتاغونغ",22.3569,91.7832],["سيلهت",24.8949,91.8687]]],
["ماليزيا","Asia/Kuala_Lumpur","Singapore",[["كوالالمبور",3.1390,101.6869],["جوهور بهرو",1.4927,103.7414],["بينانغ",5.4141,100.3288],["كوتا كينابالو",5.9804,116.0735]]],
["إندونيسيا","Asia/Jakarta","Singapore",[["جاكرتا",-6.2088,106.8456],["سورابايا",-7.2575,112.7521],["باندونغ",-6.9175,107.6191],["ميدان",3.5952,98.6722],["مكاسر",-5.1477,119.4327,"Asia/Makassar"],["دنباسار",-8.6500,115.2167,"Asia/Makassar"]]],
["سنغافورة","Asia/Singapore","Singapore",[["سنغافورة",1.3521,103.8198]]],
["بريطانيا","Europe/London","MuslimWorldLeague",[["لندن",51.5074,-0.1278],["مانشستر",53.4808,-2.2426],["برمنغهام",52.4862,-1.8904],["ليدز",53.8008,-1.5491],["غلاسكو",55.8642,-4.2518],["ليفربول",53.4084,-2.9916],["بريستول",51.4545,-2.5879],["إدنبرة",55.9533,-3.1883]]],
["ألمانيا","Europe/Berlin","MuslimWorldLeague",[["برلين",52.5200,13.4050],["هامبورغ",53.5511,9.9937],["ميونخ",48.1351,11.5820],["فرانكفورت",50.1109,8.6821],["كولونيا",50.9375,6.9603],["شتوتغارت",48.7758,9.1829],["دوسلدورف",51.2277,6.7735]]],
["فرنسا","Europe/Paris","MuslimWorldLeague",[["باريس",48.8566,2.3522],["مرسيليا",43.2965,5.3698],["ليون",45.7640,4.8357],["تولوز",43.6047,1.4442],["ليل",50.6292,3.0573],["نيس",43.7102,7.2620],["ستراسبورغ",48.5734,7.7521]]],
["هولندا","Europe/Amsterdam","MuslimWorldLeague",[["أمستردام",52.3676,4.9041],["روتردام",51.9244,4.4777],["لاهاي",52.0705,4.3007],["أوترخت",52.0907,5.1214]]],
["بلجيكا","Europe/Brussels","MuslimWorldLeague",[["بروكسل",50.8503,4.3517],["أنتويرب",51.2194,4.4025],["لييج",50.6326,5.5797]]],
["السويد","Europe/Stockholm","MuslimWorldLeague",[["ستوكهولم",59.3293,18.0686],["غوتنبرغ",57.7089,11.9746],["مالمو",55.6050,13.0038]]],
["النرويج","Europe/Oslo","MuslimWorldLeague",[["أوسلو",59.9139,10.7522],["بيرغن",60.3913,5.3221]]],
["الدنمارك","Europe/Copenhagen","MuslimWorldLeague",[["كوبنهاغن",55.6761,12.5683],["آرهوس",56.1629,10.2039]]],
["إسبانيا","Europe/Madrid","MuslimWorldLeague",[["مدريد",40.4168,-3.7038],["برشلونة",41.3851,2.1734],["إشبيلية",37.3891,-5.9845],["فالنسيا",39.4699,-0.3763],["مالقة",36.7213,-4.4213]]],
["إيطاليا","Europe/Rome","MuslimWorldLeague",[["روما",41.9028,12.4964],["ميلانو",45.4642,9.1900],["نابولي",40.8518,14.2681],["تورينو",45.0703,7.6869]]],
["النمسا","Europe/Vienna","MuslimWorldLeague",[["فيينا",48.2082,16.3738],["غراتس",47.0707,15.4395],["لينتس",48.3069,14.2858]]],
["سويسرا","Europe/Zurich","MuslimWorldLeague",[["زيورخ",47.3769,8.5417],["جنيف",46.2044,6.1432],["بازل",47.5596,7.5886]]],
["روسيا","Europe/Moscow","MuslimWorldLeague",[["موسكو",55.7558,37.6173],["سان بطرسبرغ",59.9311,30.3609],["قازان",55.7963,49.1088],["غروزني",43.3169,45.6981]]],
["أمريكا","America/New_York","NorthAmerica",[["نيويورك",40.7128,-74.0060],["شيكاغو",41.8781,-87.6298,"America/Chicago"],["ديترويت",42.3314,-83.0458,"America/Detroit"],["هيوستن",29.7604,-95.3698,"America/Chicago"],["دالاس",32.7767,-96.7970,"America/Chicago"],["لوس أنجلوس",34.0522,-118.2437,"America/Los_Angeles"],["سان فرانسيسكو",37.7749,-122.4194,"America/Los_Angeles"],["سياتل",47.6062,-122.3321,"America/Los_Angeles"],["واشنطن",38.9072,-77.0369],["فيلادلفيا",39.9526,-75.1652],["بوسطن",42.3601,-71.0589],["أتلانتا",33.7490,-84.3880],["ميامي",25.7617,-80.1918],["مينيابوليس",44.9778,-93.2650,"America/Chicago"],["دنفر",39.7392,-104.9903,"America/Denver"],["فينكس",33.4484,-112.0740,"America/Phoenix"]]],
["كندا","America/Toronto","NorthAmerica",[["تورونتو",43.6532,-79.3832],["مونتريال",45.5017,-73.5673],["أوتاوا",45.4215,-75.6972],["فانكوفر",49.2827,-123.1207,"America/Vancouver"],["كالغاري",51.0447,-114.0719,"America/Edmonton"],["إدمونتون",53.5461,-113.4938,"America/Edmonton"],["وينيبيغ",49.8951,-97.1384,"America/Winnipeg"]]],
["أستراليا","Australia/Sydney","MuslimWorldLeague",[["سيدني",-33.8688,151.2093],["ملبورن",-37.8136,144.9631,"Australia/Melbourne"],["بريزبن",-27.4698,153.0251,"Australia/Brisbane"],["بيرث",-31.9505,115.8605,"Australia/Perth"],["أديلايد",-34.9285,138.6007,"Australia/Adelaide"]]],
["اليابان","Asia/Tokyo","MuslimWorldLeague",[["طوكيو",35.6762,139.6503],["أوساكا",34.6937,135.5023],["ناغويا",35.1815,136.9066],["فوكوكا",33.5904,130.4017],["سابورو",43.0618,141.3545],["ناها",26.2124,127.6809]]],
["كوريا الجنوبية","Asia/Seoul","MuslimWorldLeague",[["سيول",37.5665,126.9780],["بوسان",35.1796,129.0756]]],
["الصين","Asia/Shanghai","MuslimWorldLeague",[["بكين",39.9042,116.4074],["شنغهاي",31.2304,121.4737],["غوانزو",23.1291,113.2644],["أورومتشي",43.8256,87.6168]]],
["تركمانستان وآسيا الوسطى","Asia/Tashkent","MuslimWorldLeague",[["طشقند",41.2995,69.2401],["سمرقند",39.6270,66.9750],["بشكيك",42.8746,74.5698,"Asia/Bishkek"],["ألماتي",43.2220,76.8512,"Asia/Almaty"],["دوشنبه",38.5598,68.7870,"Asia/Dushanbe"]]],
["أذربيجان","Asia/Baku","MuslimWorldLeague",[["باكو",40.4093,49.8671],["غنجة",40.6828,46.3606]]],
["نيجيريا","Africa/Lagos","MuslimWorldLeague",[["لاغوس",6.5244,3.3792],["كانو",12.0022,8.5920],["أبوجا",9.0765,7.3986]]],
["كينيا","Africa/Nairobi","MuslimWorldLeague",[["نيروبي",-1.2921,36.8219],["مومباسا",-4.0435,39.6682]]],
["جنوب أفريقيا","Africa/Johannesburg","MuslimWorldLeague",[["جوهانسبرغ",-26.2041,28.0473],["كيب تاون",-33.9249,18.4241],["ديربان",-29.8587,31.0218]]],
["البرازيل","America/Sao_Paulo","MuslimWorldLeague",[["ساو باولو",-23.5505,-46.6333],["ريو دي جانيرو",-22.9068,-43.1729]]],
];

const ptReady=()=>typeof adhan!=="undefined";
function ptGet(){try{const v=JSON.parse(localStorage.getItem(PT_KEY));return v&&v.lat!=null?v:null;}catch(e){return null;}}
function ptSave(v){try{localStorage.setItem(PT_KEY,JSON.stringify(v));}catch(e){}}

/* نبني تاريخ الحساب في المنطقة المختارة، لا في منطقة جهاز المستخدم. */
function dateISOInZone(date,tz){
  const parts=new Intl.DateTimeFormat("en-CA",{
    timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"
  }).formatToParts(date||new Date());
  const values=Object.fromEntries(parts
    .filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
const dateForZone=(date,tz)=>new Date(dateISOInZone(date||new Date(),tz)+"T12:00:00");

function ptTimes(cfg,when){
  const p=adhan.CalculationMethod[cfg.method]();
  p.madhab=adhan.Madhab[cfg.madhab==="Hanafi"?"Hanafi":"Shafi"];
  return new adhan.PrayerTimes(
    new adhan.Coordinates(cfg.lat,cfg.lng),dateForZone(when,cfg.tz),p);
}
/* التوقيت يُعرض بساعة المدينة المختارة لا بساعة الجهاز */
function ptFmt(d,tz){
  const s=new Intl.DateTimeFormat("en-GB",
    {timeZone:tz,hour:"2-digit",minute:"2-digit",hour12:false}).format(d);
  const [h,m]=s.split(":").map(Number);
  return fmtTime(h,m);
}
/* الصلاة القادمة: إن مضى العشاء فهي فجر الغد */
function ptNext(cfg){
  const t=ptTimes(cfg), now=Date.now();
  for(const k of PT_ORDER) if(t[k].getTime()>now) return {key:k,at:t[k],today:true};
  const tm=ptTimes(cfg,new Date(Date.now()+864e5));
  return {key:"fajr",at:tm.fajr,today:false};
}

/* ── الوقت المتبقّي بصيغة عربية سليمة (تثنية وجمع) ── */
function arCount(n,one,two,few,many){
  return n===1?one : n===2?two : (n>=3&&n<=10)?`${ar(n)} ${few}` : `${ar(n)} ${many}`;
}
function arDur(mins,tight){
  mins=Math.max(0,Math.round(mins));
  const h=Math.floor(mins/60), m=mins%60;
  const M=()=>arCount(m,"دقيقة","دقيقتين","دقائق","دقيقة");
  const H=()=>arCount(h,"ساعة","ساعتين","ساعات","ساعة");
  if(!h) return m?M():"أقلّ من دقيقة";
  /* الدقائق تُذكر ما دام الوقت قريبًا، فإذا بَعُد كفت الساعات */
  if(h<2&&m) return `${H()} و${M()}`;
  if(!tight&&m) return `${H()} و${M()}`;
  return H();
}
/* دقائق اليوم بساعة المدينة المختارة لا بساعة الجهاز */
/* الصلاة القائم وقتها الآن. بين الشروق والظهر لا فريضة، فلا تعليم. */
function ptCurrent(cfg){
  const t=ptTimes(cfg), now=Date.now();
  for(const k of ["isha","maghrib","asr","dhuhr","sunrise","fajr"])
    if(t[k].getTime()<=now) return k==="sunrise"?null:k;
  return "isha";   /* قبل الفجر: وقت العشاء ممتدّ من ليلة أمس */
}
const ptNextLabel=cfg=>{
  const n=ptNext(cfg);
  return `${PT_NAMES[n.key]} بعد ${arDur((n.at-Date.now())/6e4,true)}`;
};

function ptLine(){
  if(!ptReady()) return "";
  return `<button class="prayer-fab" id="btn-prayer">
    <span class="pt-icon">${PRAYER_ICON}</span>
    <span class="pt-label">مواقيت الصلاة</span></button>`;
}

function ptNextLine(){
  if(!ptReady()) return "";
  const cfg=ptGet();
  let tail=`<span class="pt-next pt-ask">حدّد مدينتك</span>`;
  if(cfg){ try{ tail=`<span class="pt-next">${ptNextLabel(cfg)}</span>`; }catch(e){ tail=""; } }
  return `<div class="next-prayer">${PRAYER_ICON}${tail}</div>`;
}

function prayerDialog(){
  if(!ptReady()) return toast("تعذّر تحميل حاسبة المواقيت");
  const cfg=ptGet();
  if(!cfg) return ptSetupDialog();
  let t,cur;
  try{ t=ptTimes(cfg); cur=ptCurrent(cfg); }
  catch(e){ return ptSetupDialog(); }
  const rows=PT_ORDER.map(k=>{
    const cls=(k==="sunrise"?" sun":"")+(k===cur?" now":"");
    return `<div class="ptrow${cls}">
      <span class="pn">${PT_NAMES[k]}${k===cur?'<span class="tag j">وقتها الآن</span>':""}</span>
      <span class="pv">${ptFmt(t[k],cfg.tz)}</span></div>`;
  }).join("");
  const today=dateISOInZone(new Date(),cfg.tz);
  modal(`<section class="prayer-panel" role="dialog" aria-modal="true" aria-label="مواقيت الصلاة">
    <header class="prayer-modal-head">
      <div class="prayer-emblem">${PRAYER_ICON}</div>
      <div class="display" style="font-size:1.45rem">مواقيت الصلاة</div>
      <div class="prayer-head">
        <p class="ptcity">${esc(cfg.city)}</p>
        <div class="prayer-date">
          <span class="prayer-date-g">${esc(fmtClockG(today))}</span>
          <span class="prayer-date-h">${esc(fmtClockH(today))}</span>
        </div>
      </div>
    </header>
    <div class="prayer-modal-body">
      <div class="ptable">${rows}</div>
      <div class="actions">
        <button class="btn" id="pt-edit">الإعدادات</button>
        <button class="btn quiet spacer" id="pt-close">إغلاق</button>
      </div>
    </div>
  </section>`,"prayer-times-modal");
  document.getElementById("pt-edit").onclick=ptSetupDialog;
  document.getElementById("pt-close").onclick=closeLayer;
}

/* نبضة كل نصف دقيقة: تُحدَّث الأرقام والعقرب وحدها بلا إعادة رسم */
function ptTick(){
  const cfg=ptGet(); if(!cfg||!ptReady()) return;
  try{
    const el=document.querySelector(".next-prayer .pt-next");
    if(el&&!el.classList.contains("pt-ask")) el.textContent=ptNextLabel(cfg);
  }catch(e){}
}

function ptSetupDialog(){
  const cur=ptGet();
  let li=cur?PT_LANDS.findIndex(L=>L[0]===cur.land):-1;
  if(li<0) li=0;
  let ci=cur?PT_LANDS[li][3].findIndex(c=>c[0]===cur.city):-1;
  if(ci<0) ci=0;
  let method=cur?cur.method:PT_LANDS[li][2];
  let madhab=cur&&cur.madhab==="Hanafi"?"Hanafi":"Shafi";
  /* لا تُبدَّل الطريقة تلقائيًّا إن كان القارئ قد اختارها بنفسه */
  let touched=!!(cur&&cur.method!==PT_LANDS[li][2]), adv=false;

  const draw=()=>{
    const L=PT_LANDS[li];
    const lands=PT_LANDS.map((x,i)=>`<option value="${i}"${i===li?" selected":""}>${x[0]}</option>`).join("");
    const cities=L[3].map((c,i)=>`<option value="${i}"${i===ci?" selected":""}>${c[0]}</option>`).join("");
    const meths=Object.keys(PT_METHODS).map(k=>
      `<option value="${k}"${k===method?" selected":""}>${PT_METHODS[k]}</option>`).join("");
    modal(`<div class="display" style="font-size:1.45rem">مواقيت الصلاة</div>
      <p class="hint" style="text-align:center;margin:.3rem 0 1.1rem">
        اختر مدينتك، فتُحسب المواقيت على جهازك.</p>
      <div class="field-row"><label>البلد</label>
        <select class="field" id="pt-land">${lands}</select></div>
      <div class="field-row"><label>المدينة</label>
        <select class="field" id="pt-city">${cities}</select></div>
      <div class="field-row"><label>المذهب — يؤثّر في وقت العصر وحده</label>
        <select class="field" id="pt-madhab">
          <option value="Shafi"${madhab==="Shafi"?" selected":""}>الجمهور: الشافعي والمالكي والحنبلي</option>
          <option value="Hanafi"${madhab==="Hanafi"?" selected":""}>الحنفي</option>
        </select></div>
      <details class="ptadv"${adv?" open":""}><summary>إعدادات متقدمة</summary>
        <div class="field-row" style="margin:.5rem 0 0"><label>طريقة الحساب</label>
          <select class="field" id="pt-method">${meths}</select>
          <p class="hint">تُختار تلقائيًّا بحسب البلد، ولا حاجة لتغييرها في الغالب.</p>
        </div>
      </details>
      <div class="actions">
        <button class="btn gold" id="pt-ok">احفظ</button>
        ${cur?'<button class="btn quiet" id="pt-del">أزل المواقيت</button>':""}
        <button class="btn quiet spacer" id="pt-cancel">إلغاء</button>
      </div>`);
    const $=id=>document.getElementById(id);
    $("pt-land").onchange=e=>{
      li=+e.target.value; ci=0;
      if(!touched) method=PT_LANDS[li][2];
      adv=document.querySelector(".ptadv").open;
      draw();
    };
    $("pt-city").onchange=e=>{ci=+e.target.value;};
    $("pt-madhab").onchange=e=>{madhab=e.target.value;};
    $("pt-method").onchange=e=>{method=e.target.value;touched=true;};
    $("pt-ok").onclick=()=>{
      const L2=PT_LANDS[li], c=L2[3][ci];
      ptSave({land:L2[0],city:c[0],lat:c[1],lng:c[2],tz:c[3]||L2[1],method,madhab});
      render(); prayerDialog();
    };
    if($("pt-del")) $("pt-del").onclick=()=>{
      localStorage.removeItem(PT_KEY); closeLayer(); render();
    };
    $("pt-cancel").onclick=closeLayer;
  };
  draw();
}

/* ===================== نداء قاعدة البيانات ===================== */
const pendingRequests=new Map();

async function postJSON(url,payload,options={}){
  const key=options.key||"";
  if(key&&pendingRequests.has(key)) return pendingRequests.get(key);

  const task=(async()=>{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),options.timeout||15000);
    try{
      const r=await fetch(url,{
        method:"POST",
        headers:{"Content-Type":"application/json",...(options.headers||{})},
        body:JSON.stringify(payload||{}),
        signal:controller.signal,
        keepalive:!!options.keepalive
      });
      const text=await r.text();
      let data=null;
      if(text){
        try{ data=JSON.parse(text); }
        catch(e){ if(r.ok) throw new Error("Invalid JSON"); }
      }
      if(!r.ok){
        const err=new Error((data&&data.error)||text||("HTTP "+r.status));
        err.status=r.status;
        /* إن طلب الخادم الانتظار (خصوصًا 429) نحترم Retry-After. */
        const retryAfter=r.headers&&r.headers.get?r.headers.get("Retry-After"):null;
        if(retryAfter){
          const seconds=Number(retryAfter),at=Date.parse(retryAfter);
          err.retryAfter=Number.isFinite(seconds)
            ?Math.max(0,seconds*1000)
            :Number.isFinite(at)?Math.max(0,at-Date.now()):0;
        }
        throw err;
      }
      return data;
    }finally{ clearTimeout(timer); }
  })();

  if(key) pendingRequests.set(key,task);
  try{ return await task; }
  finally{ if(key&&pendingRequests.get(key)===task) pendingRequests.delete(key); }
}

const RPC_HEADERS={apikey:SUPABASE_KEY,Authorization:"Bearer "+SUPABASE_KEY};
const DEVICE_LOCK_ERRS=["مقفول على جهاز صاحبه","هذا السجل لصاحب الحساب فقط"];
let rebinding=null;

/* من دخل قبل ترحيل قفل الجهاز يبقى جهازه غير مسجَّل في القاعدة،
   فتُردّ أفعاله كلّها. نربط الجهاز مرّة ثم نعيد الفعل، فلا يُضطرّ
   القارئ إلى الخروج والعودة. وإن كان الاسم مقفولًا على جهاز آخر
   حقًّا، أخفق التسجيل وبقي الرفض على حاله. */
async function rebindDevice(){
  if(rebinding) return rebinding;
  rebinding=(async()=>{
    try{
      const r=await postJSON(`${SUPABASE_URL}/rest/v1/rpc/sign_in`,
        {p_code:code,p_id:viewer.id,p_name:viewer.name,
         p_device:deviceId(),p_org_code:orgCode()},
        {headers:RPC_HEADERS});
      return !!(r&&r.ok);
    }catch(e){ return false; }
  })();
  const out=await rebinding;
  rebinding=null;
  return out;
}

async function rpc(fn, args){
  const body=args||{};
  const call=()=>postJSON(`${SUPABASE_URL}/rest/v1/rpc/${fn}`,body,{
    headers:RPC_HEADERS,
    key:`rpc:${fn}:${JSON.stringify(body)}`
  });
  const r=await call();
  const locked=r&&r.ok===false&&typeof r.error==="string"
    &&DEVICE_LOCK_ERRS.some(m=>r.error.indexOf(m)!==-1);
  if(locked&&fn!=="sign_in"&&viewer&&code&&await rebindDevice()) return call();
  return r;
}

const edge=(fn,body,options={})=>postJSON(
  `${SUPABASE_URL}/functions/v1/${fn}`,body,
  {...options,key:options.key||`edge:${fn}:${JSON.stringify(body||{})}`});

/* ===================== أدوات ===================== */
const AR="٠١٢٣٤٥٦٧٨٩";
const ar=n=>String(n).replace(/\d/g,d=>AR[+d]);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const norm=s=>String(s||"").normalize("NFC").trim().replace(/\s+/g," ");
/* تطبيع الحروف مع إبقاء المسافات، ليمكن تفكيك الاسم إلى كلمات.
   المدى \u064B-\u0652 للتشكيل وحده ولا يمسّ الحروف. */
const araNorm=s=>norm(s)
  .replace(/[\u064B-\u0652\u0670\u0640]/g,"")   /* تشكيل وتطويل */
  .replace(/[أإآٱ]/g,"ا")                        /* الهمزات على الألف */
  .replace(/ؤ/g,"و").replace(/ئ/g,"ي")           /* تُبدَّل لا تُحذف، فلا يقصر الاسم */
  .replace(/ء/g,"")
  .replace(/ى/g,"ي").replace(/ة/g,"ه")
  .toLowerCase();

/* مفتاح الهوية: بلا مسافات */
const keyOf=s=>araNorm(s).replace(/\s+/g,"");
const MONTHS=["كانون الثاني","شباط","آذار","نيسان","أيار","حزيران","تموز","آب","أيلول","تشرين الأول","تشرين الثاني","كانون الأول"];
const daysLeft=e=>Math.max(0,Math.ceil((new Date(e+"T23:59:59")-new Date())/864e5));
const isoParts=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const todayISO=()=>isoParts(new Date());
const plusDays=n=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return isoParts(d);};
const fmtG=iso=>{const d=new Date(iso+"T12:00:00");return `${ar(d.getDate())} ${MONTHS[d.getMonth()]}`;};
const fmtTime=(h,m)=>{
  const per = h<12 ? "صباحًا" : h<18 ? "عصرًا" : "مساءً";
  const h12 = h%12===0 ? 12 : h%12;
  return `${ar(h12)}:${ar(String(m).padStart(2,"0"))} ${per}`;
};
const hourOptions=sel=>Array.from({length:24},(_,h)=>
  `<option value="${h}" ${h===sel?"selected":""}>${fmtTime(h,0)}</option>`).join("");
const fmtH=iso=>{try{return new Date(iso+"T12:00:00")
  .toLocaleDateString("ar-SA-u-ca-islamic-umalqura",{day:"numeric",month:"long"});}catch(e){return "";}};

/* ═══════════ الساعة والعدّاد ═══════════
   قرصها من قرص الشمسة نفسه: الحلقتان الذهبيتان بمقاسيهما،
   والقلب المضيء بنصف قطره، فتقرأ العين الاثنتين أختين.
   العقرب الثاني يمضي بزاوية متزايدة أبدًا، فلا يرتدّ عند الدقيقة. */
const WEEKDAYS=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
const fmtClockG=iso=>{const d=new Date(iso+"T12:00:00");return `${WEEKDAYS[d.getDay()]} ${ar(d.getDate())} ${MONTHS[d.getMonth()]} ${ar(d.getFullYear())}`;};
const fmtClockH=iso=>{try{return new Date(iso+"T12:00:00")
  .toLocaleDateString("ar-SA-u-ca-islamic-umalqura",{day:"numeric",month:"long",year:"numeric"});}catch(e){return "";}};
const ZEP=Math.floor(Date.now()/1000), ZEPS=new Date().getSeconds();
const zSecDeg=()=>((Math.floor(Date.now()/1000)-ZEP)+ZEPS)*6;

function zClock(){
  const C=160, pt=(r,d)=>{const a=(d-90)*Math.PI/180;
    return[(C+r*Math.cos(a)).toFixed(1),(C+r*Math.sin(a)).toFixed(1)];};

  let ticks="";
  for(let i=0;i<60;i++){
    const big=i%5===0, [x1,y1]=pt(big?112:120,i*6), [x2,y2]=pt(126,i*6);
    ticks+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-linecap="round"
      stroke="${big?"#C08A2B":"#DCCBA8"}" stroke-width="${big?2.4:1}"/>`;
  }
  let nums="";
  for(let i=1;i<=12;i++){
    const [x,y]=pt(96,i*30);
    nums+=`<text x="${x}" y="${(+y+7.5).toFixed(1)}" text-anchor="middle"
      font-family="Amiri,serif" font-size="21" fill="#8C5A2E">${ar(i)}</text>`;
  }
  return `<svg class="zclock" id="zclock" viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label="الساعة الآن">
    <circle cx="160" cy="160" r="142" fill="none" stroke="#C08A2B" stroke-opacity=".45"/>
    <circle cx="160" cy="160" r="136" fill="none" stroke="#C08A2B" stroke-opacity=".22"/>
    <circle cx="160" cy="160" r="130" fill="#FFFCF4"/>
    ${ticks}${nums}
    <circle cx="160" cy="160" r="68" fill="none" stroke="#C08A2B" stroke-opacity=".2"/>
    <g id="zh"><path d="M160 84 L165.5 104 L163 182 L157 182 L154.5 104 Z" fill="#33291B"/></g>
    <g id="zm"><path d="M160 50 L164 74 L162.2 186 L157.8 186 L156 74 Z" fill="#33291B"/></g>
    <g id="zs">
      <line x1="160" y1="192" x2="160" y2="40" stroke="#B4574E" stroke-width="1.7" stroke-linecap="round"/>
      <circle cx="160" cy="181" r="6.5" fill="none" stroke="#B4574E" stroke-width="1.7"/>
    </g>
    <circle cx="160" cy="160" r="7.5" fill="#C08A2B"/>
    <circle cx="160" cy="160" r="3.2" fill="#FFFCF4"/>
  </svg>`;
}

function zOrb(){
  return `<div class="zcol">
    <div class="cdown">
      <button class="cd-lab deadline-trigger" id="deadline-trigger" type="button"
        aria-haspopup="dialog">الوقت المتبقّي لقراءة جزءك</button>
      <div class="cd-cells">
        <span class="cd-cell"><b id="cd-d">—</b><em>يوم</em></span>
        <span class="cd-cell"><b id="cd-h">—</b><em>ساعة</em></span>
        <span class="cd-cell"><b id="cd-m">—</b><em>دقيقة</em></span>
        <span class="cd-cell"><b id="cd-s">—</b><em>ثانية</em></span>
      </div>
    </div>
    ${zClock()}
    <div class="cdate">
      <span class="cd-g" id="cd-greg"></span>
      <span class="cd-hij" id="cd-hij"></span>
    </div>
    ${ptNextLine()}
  </div>`;
}

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

let zDay="";
function zTick(){
  const face=document.getElementById("zclock");
  if(!face) return;
  const n=new Date(), s=n.getSeconds(), m=n.getMinutes(), h=n.getHours()%12;
  const turn=(id,deg)=>{const e=document.getElementById(id);
    if(e) e.setAttribute("transform",`rotate(${deg.toFixed(3)} 160 160)`);};
  turn("zh",(h+m/60)*30);
  turn("zm",(m+s/60)*6);
  turn("zs",zSecDeg());

  /* التاريخ يُعاد بناؤه عند تبدّل اليوم وحده */
  const iso=todayISO(), g=document.getElementById("cd-greg"), hj=document.getElementById("cd-hij");
  if(g&&(iso!==zDay||!g.textContent)){
    zDay=iso;
    g.textContent=fmtClockG(iso);
    if(hj) hj.textContent=fmtClockH(iso);
  }

  /* العدّاد ينبض مع العقرب الثاني، إذ ينبعان من نبضة واحدة */
  if(!state||!state.endDate) return;
  const put=(id,v)=>{const e=document.getElementById(id); if(e) e.textContent=v;};
  let left=new Date(state.endDate+"T23:59:59").getTime()-Date.now();
  const lab=document.getElementById("deadline-trigger");   /* الصنف cd-lab، والمعرّف هذا */
  if(left<=0){
    if(lab) lab.textContent="انقضى وقت الختمة";
    put("cd-d",ar(0));put("cd-h",ar(0));put("cd-m",ar(0));put("cd-s",ar(0));
    return;
  }
  if(lab&&lab.textContent!=="الوقت المتبقّي لقراءة جزءك") lab.textContent="الوقت المتبقّي لقراءة جزءك";
  const t=Math.floor(left/1000);
  const p=v=>ar(String(v).padStart(2,"0"));
  put("cd-d",ar(Math.floor(t/86400)));
  put("cd-h",p(Math.floor(t/3600)%24));
  put("cd-m",p(Math.floor(t/60)%60));
  put("cd-s",p(t%60));
}
/* حلقة تُصحّح انحرافها، فتقع كل نبضة على رأس الثانية */
function zLoop(){ zTick(); setTimeout(zLoop, 1000-(Date.now()%1000)); }

/* ═══════════ مطابقة الأسماء ═══════════
   المنهج المعتمد لأسماء الأشخاص: Jaro-Winkler لا مسافة التحرير،
   لأنها تكافئ تطابق أوائل الحروف وتتسامح مع تبادل موضعين،
   وأكثر اختلاف الأسماء العربية يقع في آخرها (ة/ا، ى/ي).
   ويُضاف إليها تفكيك الاسم إلى كلمات، لأن الكنية تُزاد وتُنقص. */

function jaro(a,b){
  if(a===b) return 1;
  const la=a.length, lb=b.length;
  if(!la||!lb) return 0;
  const win=Math.max(0,Math.floor(Math.max(la,lb)/2)-1);
  const ma=new Array(la).fill(false), mb=new Array(lb).fill(false);
  let m=0;
  for(let i=0;i<la;i++){
    const lo=Math.max(0,i-win), hi=Math.min(i+win+1,lb);
    for(let j=lo;j<hi;j++){
      if(mb[j]||a[i]!==b[j]) continue;
      ma[i]=mb[j]=true; m++; break;
    }
  }
  if(!m) return 0;
  let t=0, k=0;
  for(let i=0;i<la;i++){
    if(!ma[i]) continue;
    while(!mb[k]) k++;
    if(a[i]!==b[k]) t++;
    k++;
  }
  t/=2;
  return (m/la + m/lb + (m-t)/m)/3;
}

/* مكافأة البادئة، بحدّ أربعة أحرف كما في الصيغة المعتمدة */
function jw(a,b){
  const j=jaro(a,b);
  if(j<0.7) return j;
  let p=0;
  while(p<4 && p<a.length && p<b.length && a[p]===b[p]) p++;
  return j + p*0.1*(1-j);
}

/* كلمات لا تميّز صاحبها، فلا يُبنى عليها تشابه */
const KUNYA=new Set(["ام","ابو","ابن","بنت","بن","ابي","عبد","ال","الحاج","الحاجه","الشيخ","دكتور"]);

const tokensOf=s=>araNorm(s).split(/\s+/).filter(t=>t.length>=2);
const coreTokens=s=>tokensOf(s).filter(t=>!KUNYA.has(t));

/* درجة التشابه بين اسمين: صفر إلى واحد */
function nameScore(a,b){
  const ka=keyOf(a), kb=keyOf(b);
  if(ka===kb) return 1;

  /* كلمة مميّزة مشتركة: «محمد» و«أم محمد»، «رضوان» و«رضوان أحمد» */
  const ta=coreTokens(a), tb=coreTokens(b);
  for(const x of ta) for(const y of tb)
    if(x.length>=3 && x===y) return 0.95;

  /* وإلا فمقارنة الاسم كاملًا، ثم أقرب كلمتين فيه */
  let best=jw(ka,kb);
  for(const x of ta) for(const y of tb)
    if(x.length>=3&&y.length>=3) best=Math.max(best, jw(x,y)*0.96);
  return best;
}

/* العتبة: العتبات الشائعة بين ٠٫٨٠ و٠٫٩٠، واخترنا ٠٫٨٧
   لأن الاقتراح يُعرض ولا يُفرض، فالتساهل اليسير أهون من التفويت */
const NEAR=0.87;

function similarTo(typed,members){
  return (members||[])
    .map(m=>({m,s:nameScore(typed,m.name)}))
    .filter(x=>x.s>=NEAR && x.m.id!==keyOf(typed))
    .sort((x,y)=>y.s-x.s)
    .slice(0,3)
    .map(x=>x.m);
}

let justCreated=false;
let publicKhatmahs=[],publicKhatmahsLoaded=false,publicKhatmahsLoading=false,publicKhatmahsError=false;
let code="", state=null, viewer=null, selected=null, gateName="",
    screen="boot";   /* boot | home | create | share | gate | main | notfound */

const hashCode=()=>(location.hash||"").replace(/^#/,"").trim().toUpperCase().slice(0,4);
function zkReplaceHash(value=""){
  try{
    const url=new URL(location.href);url.hash=value?String(value):"";
    history.replaceState(history.state,"",url.href);
  }catch(_){location.hash=value?String(value):""}
}
/* الختمة النشطة:
   - LAST: آخر ختمة مؤكدة لهذا الجهاز، وتبقى بعد إغلاق التطبيق.
   - ACTIVE_SESSION: سياق الرابط/الاختيار الحالي في هذا التبويب.
   عند وجود الاثنين، سياق الجلسة هو الأحدث والأولى بالفتح. */
const LAST="zad:last";
const ACTIVE_SESSION="zad:active-khatmah-session";
function cleanKhatmahCode(value){
  return String(value||"").trim().toUpperCase().slice(0,4);
}
function activeSessionGet(){
  try{return cleanKhatmahCode(sessionStorage.getItem(ACTIVE_SESSION));}catch(_){return ""}
}
function activeKhatmahGet(){
  const session=activeSessionGet();
  if(session)return session;
  try{return cleanKhatmahCode(localStorage.getItem(LAST));}catch(_){return ""}
}
function activeKhatmahSet(value,persist=false){
  const c=cleanKhatmahCode(value);if(!c)return "";
  try{sessionStorage.setItem(ACTIVE_SESSION,c);}catch(_){ }
  if(persist){try{localStorage.setItem(LAST,c);}catch(_){ }}
  return c;
}
function activeKhatmahForget(value=""){
  const c=cleanKhatmahCode(value),session=activeSessionGet();
  try{if(!c||session===c)sessionStorage.removeItem(ACTIVE_SESSION);}catch(_){ }
  try{const last=cleanKhatmahCode(localStorage.getItem(LAST));if(!c||last===c)localStorage.removeItem(LAST);}catch(_){ }
}
const linkFor=c=>location.origin+location.pathname+"#"+c;
const vKey=()=>"zad:viewer:"+code;

/* ختمات هذا الجهاز: يُبنى منها شريط «ختماتي» في الرئيسية،
   فيعود القارئ إلى ختمته بضغطة، بلا رمز ولا اسم. */
const MINE="zad:mine";
function mineGet(){
  try{ const v=JSON.parse(localStorage.getItem(MINE)); return Array.isArray(v)?v:[]; }
  catch(e){ return []; }
}
function minePut(list){
  try{ localStorage.setItem(MINE,JSON.stringify(list.slice(0,12))); }catch(e){}
}
function mineRemember(){
  if(!code||!viewer||!state) return;
  activeKhatmahSet(code,true);
  const rest=mineGet().filter(x=>x.code!==code);
  rest.unshift({code,name:viewer.name,title:state.title||"",
                publicId:state.publicId||null,at:Date.now()});
  minePut(rest);
}
function mineForget(c){ minePut(mineGet().filter(x=>x.code!==c)); }

/* Remove legacy entries whose khatmahs were cancelled on another session.
   A network/RPC failure always keeps the entry; only an authoritative null
   response from get_state is allowed to remove it. */
let minePrunePromise=null;
function minePruneMissing(){
  if(minePrunePromise||!navigator.onLine) return minePrunePromise||Promise.resolve(false);
  const snapshot=mineGet();
  if(!snapshot.length) return Promise.resolve(false);
  minePrunePromise=(async()=>{
    const checks=await Promise.all(snapshot.map(async item=>{
      try{
        const remote=await rpc("get_state",{p_code:item.code});
        return {code:item.code,missing:remote===null};
      }catch(_){ return {code:item.code,missing:false}; }
    }));
    const missing=new Set(checks.filter(x=>x.missing).map(x=>x.code));
    if(!missing.size) return false;
    minePut(mineGet().filter(item=>!missing.has(item.code)));
    if(screen==="home") render();
    return true;
  })().finally(()=>{minePrunePromise=null});
  return minePrunePromise;
}
const cKey=()=>"zad:orgcode:"+code;
const orgCode=()=>localStorage.getItem(cKey())||null;
const OUTBOX="zad:notification-outbox";
let outboxBusy=false;

function outboxGet(){
  try{
    const jobs=JSON.parse(localStorage.getItem(OUTBOX)||"[]");
    return Array.isArray(jobs)?jobs:[];
  }catch(e){ return []; }
}
function outboxPut(jobs){
  try{
    if(jobs.length) localStorage.setItem(OUTBOX,JSON.stringify(jobs));
    else localStorage.removeItem(OUTBOX);
  }catch(e){}
}
function enqueueEdge(fn,body,id){
  const jobs=outboxGet();
  if(!jobs.some(job=>job.id===id)){
    jobs.push({id,fn,body,createdAt:Date.now()});
    outboxPut(jobs);
  }
  flushOutbox();
}
const OUTBOX_TTL=7*864e5;             /* وبعد أسبوع يسقط العمل مهما كان */
const OUTBOX_BASE_DELAY=30000;
const OUTBOX_MAX_DELAY=6*3600000;

function outboxDrop(id){
  const rest=outboxGet().filter(j=>j.id!==id);
  outboxPut(rest);
}
function outboxRetryable(status){
  if(!Number.isFinite(status)) return true;       /* شبكة، مهلة، أو رفض منطقي */
  if(status>=500) return true;
  return status===408||status===409||status===425||status===429;
}
function outboxDelay(tries,retryAfter){
  const exp=Math.min(OUTBOX_MAX_DELAY,
    OUTBOX_BASE_DELAY*Math.pow(2,Math.min(Math.max(0,tries-1),10)));
  const jitter=Math.round(exp*(.85+Math.random()*.3));
  return Math.max(Number(retryAfter)||0,jitter);
}
function outboxPostpone(id,error){
  const list=outboxGet(),item=list.find(j=>j.id===id);
  if(!item) return;
  item.tries=(item.tries||0)+1;
  item.nextAttemptAt=Date.now()+outboxDelay(item.tries,error&&error.retryAfter);
  outboxPut(list);
}
async function flushOutbox(){
  if(outboxBusy||navigator.onLine===false) return;
  outboxBusy=true;
  try{
    const now=Date.now();
    let jobs=outboxGet();
    const fresh=jobs.filter(j=>now-(j.createdAt||now)<OUTBOX_TTL);
    if(fresh.length!==jobs.length) outboxPut(fresh);   /* أُسقط ما شاخ */

    for(const job of fresh){
      if((job.nextAttemptAt||0)>Date.now()) continue;
      try{
        const result=await edge(job.fn,job.body,
          {key:`outbox:${job.id}`,keepalive:true});
        /* وظائف Edge الحالية قد تعيد HTTP 200 مع ok:false؛
           نجاح النقل ليس نجاح العملية نفسها. */
        if(!result||result.ok!==true){
          const err=new Error((result&&result.error)||"Edge operation failed");
          if(result&&Number.isFinite(Number(result.status))) err.status=Number(result.status);
          throw err;
        }
        /* نجاح الطلب لا يكفي إذا بقي مستقبِل لم تصله الرسالة. */
        if(Number(result.failed)>0){
          const err=new Error("بقيت رسائل لم تصل");
          err.status=503;
          throw err;
        }
        outboxDrop(job.id);
      }catch(e){
        const status=Number(e&&e.status);
        if(!outboxRetryable(status)){ outboxDrop(job.id); continue; }
        outboxPostpone(job.id,e);
        /* انقطاع الشبكة غالبًا يصيب كل الأعمال؛ لا نطرقها كلها في النبضة نفسها. */
        if(!Number.isFinite(status)) break;
      }
    }
  }finally{ outboxBusy=false; }
}

/* عودة الشبكة سبب كافٍ لإسقاط تأجيل المحاولة السابق وإيقاظ الطابور فورًا. */
function outboxWake(){
  const list=outboxGet();
  if(list.length){
    list.forEach(job=>{job.nextAttemptAt=0;job.tries=0;});
    outboxPut(list);
  }
  flushOutbox();
}

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

/* ===================== الشمسة ===================== */
function shamsa(){
  const cx=160,cy=160,r1=76,r2=126,n=30,step=360/n,gap=1.5;
  const pt=(r,d)=>{const a=d*Math.PI/180;return[cx+r*Math.cos(a),cy+r*Math.sin(a)];};
  let w="";
  for(let i=0;i<n;i++){
    const a1=-90+i*step+gap/2,a2=-90+(i+1)*step-gap/2;
    const[x1,y1]=pt(r2,a1),[x2,y2]=pt(r2,a2),[x3,y3]=pt(r1,a2),[x4,y4]=pt(r1,a1);
    const s=state.juz[i].status;
    const fill=s==="done"?"url(#g)":s==="taken"?"#B9DED2":"#DCEDF3";
    const st=s==="done"?"#C99A45":s==="taken"?"#287A65":"#2E7C97";
    w+=`<path class="wedge" data-i="${i}" style="animation-delay:${i*18}ms"
      d="M${x1} ${y1}A${r2} ${r2} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 0 0 ${x4} ${y4}Z"
      fill="${fill}" stroke="${st}" stroke-width="1.1"><title>الجزء ${i+1}</title></path>`;
  }
  const done=state.juz.filter(j=>j.status==="done").length;
  return `<svg class="shamsa" viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg" role="img"
      aria-label="تمّت قراءة ${done} من ثلاثين جزءًا">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F8E9C4"/><stop offset="1" stop-color="#E5C06B"/></linearGradient></defs>
    <circle cx="160" cy="160" r="142" fill="none" stroke="#C99A45" stroke-opacity=".42"/>
    <circle cx="160" cy="160" r="136" fill="none" stroke="#C99A45" stroke-opacity=".2"/>
    ${w}
    <circle cx="160" cy="160" r="68" fill="#FFFCF4" stroke="#C99A45" stroke-opacity=".5"/>
    <circle cx="160" cy="160" r="62" fill="none" stroke="#C99A45" stroke-opacity=".27"/>
    <text x="160" y="152" text-anchor="middle" font-family="Amiri,serif" font-size="50" fill="#C99A45">${ar(done)}</text>
    <text x="160" y="184" text-anchor="middle" font-family="Amiri,serif" font-size="19" fill="#8A7657">من ٣٠ جزءًا</text>
  </svg>`;
}

function cardShamsa(done,reserved){
  let rays="";
  for(let i=0;i<30;i++){
    const color=i<done?"#C59A4A":i<reserved?"#2C8B6C":"#8CB5C0";
    const opacity=i<reserved?1:.42;
    rays+=`<path d="M60 10V24" transform="rotate(${i*12} 60 60)"
      stroke="${color}" stroke-opacity="${opacity}" stroke-width="4.2" stroke-linecap="round"/>`;
  }
  return `<svg class="card-shamsa" viewBox="0 0 120 120" aria-hidden="true">
    <circle cx="60" cy="60" r="55" fill="#FFFCF4" stroke="#C59A4A" stroke-opacity=".26"/>
    ${rays}
    <circle cx="60" cy="60" r="27" fill="#0A473E" stroke="#E4C980" stroke-width="1.4"/>
    <text x="60" y="66" text-anchor="middle" font-family="Amiri,serif" font-size="23" fill="#FFF9EA">${ar(done)}</text>
  </svg>`;
}

function participantWord(n){
  if(n===1) return "مشارك";
  if(n===2) return "مشاركان";
  if(n>=3&&n<=10) return "مشاركين";
  return "مشاركًا";
}

const pct=n=>Math.max(0,Math.min(100,(Number(n)||0)/30*100));
/* ختمات هذا الجهاز: كلمة مركزية تفتح قائمة العودة إلى الختمات */
function mineStrip(){
  const list=mineGet();
  if(!list.length) return "";
  return `<details class="mine-strip">
    <summary class="mine-toggle">ختماتي</summary>
    <div class="mine-row">${list.map(x=>`
      <button class="mine-card" data-mine="${esc(x.code)}">
        <b>${esc(x.title||"ختمة")}</b>
        <span>${esc(x.name)}</span>
      </button>`).join("")}</div>
  </details>`;
}

function khatmahCardsGroup(accessType,title,note){
  const items=publicKhatmahs.filter(k=>
    (k.accessType==="public"?"public":"private")===accessType);
  const cards=items.length?`<div class="khatmah-cards">${items.map(k=>{
    const done=Number(k.doneCount)||0,reserved=Number(k.reservedCount)||0;
    const people=Number(k.participantCount)||0,overdue=daysLeft(k.endDate)<0;
    const isPublic=accessType==="public";
    return `<article class="khatmah-card">
      ${cardShamsa(done,reserved)}
      <div class="card-khatmah-body">
        <h3 class="card-khatmah-title">${esc(k.title||"زاد الخير")}</h3>
        <div class="card-khatmah-stats">
          <span><b>${ar(people)}</b> ${participantWord(people)}</span>
          <span><b>${ar(done)}</b> من ٣٠ مقروء${overdue?" · تجاوزت الموعد":""}</span>
        </div>
        <div class="card-progress" role="img"
             aria-label="محجوز ${reserved} من 30، ومقروء ${done}">
          <i class="p-res" style="width:${pct(reserved)}%"></i>
          <i class="p-done" style="width:${pct(done)}%"></i>
        </div>
        <p class="card-slots ${reserved>=30?"full":""}">${reserved>=30
          ? "جميع الأجزاء الثلاثين محجوزة"
          : `<b>${ar(30-reserved)}</b> ${30-reserved===1?"جزء متاح":"جزءًا متاحًا"} · محجوز ${ar(reserved)} من ٣٠`}</p>
        <button class="btn gold card-join" data-khatmah-card="${esc(k.publicId)}">${isPublic?"انضم الآن":"أدخل الرمز"}</button>
      </div>
    </article>`;
  }).join("")}</div>`:
    `<div class="cards-empty">${accessType==="public"
      ?"لا توجد ختمة عامة جارية الآن."
      :"لا توجد ختمة خاصة جارية الآن."}</div>`;
  return `<section class="khatmah-kind" aria-label="${esc(title)}">
    <div class="khatmah-kind-head">
      <h3 class="khatmah-kind-title">${esc(title)}</h3>
      <span class="khatmah-kind-note">${esc(note)}</span>
    </div>
    ${cards}
  </section>`;
}

function publicCardsMarkup(){
  if(publicKhatmahsLoading&&!publicKhatmahsLoaded){
    return `<div class="khatmah-cards cards-loading">${Array.from({length:4},()=>'<div class="khatmah-card" aria-hidden="true"></div>').join("")}</div>`;
  }
  if(publicKhatmahsError&&!publicKhatmahs.length){
    return `<div class="cards-empty">تعذّر تحميل الختمات الجارية الآن.</div>`;
  }
  return `<div class="khatmah-kinds">
    ${khatmahCardsGroup("public","الختمات العامة","مفتوحة لكل من يرغب في المشاركة")}
    ${khatmahCardsGroup("private","الختمات الخاصة","تحتاج إلى رمز الختمة من منظّمها")}
  </div>`;
}

/* ===================== الشاشات ===================== */
let topUserObserver=null,topUserResizeFrame=0;
function closeTopMenu(){
  const menu=document.getElementById("tb-popover"),btn=document.getElementById("tb-user");
  if(menu){menu.hidden=true;menu.innerHTML="";}
  if(btn) btn.setAttribute("aria-expanded","false");
}
function topMineMarkup(withBack=false){
  const list=mineGet();
  return `${withBack?'<button class="tb-menu-item tb-menu-back" data-top-action="account">‹ رجوع</button>':""}
    ${list.length?list.map(x=>`<button class="tb-menu-item" data-top-mine="${esc(x.code)}">
      <span>${esc(x.title||"ختمة")}</span><small>${esc(x.name||"")}</small></button>`).join(""):
      '<div class="tb-menu-empty">لا توجد ختمات محفوظة على هذا الجهاز.</div>'}`;
}
function topAccountMarkup(){
  return `<button class="tb-menu-item" data-top-action="mine">ختماتي</button>
    <button class="tb-menu-item" data-top-action="history">سجلي</button>
    <button class="tb-menu-item" data-top-action="reminder">أعد تفعيل التذكير</button>
    <button class="tb-menu-item" data-top-action="logout">خروج</button>
    ${viewer&&state&&!isOrganizer()?'<button class="tb-menu-item danger" data-top-action="leave">مغادرة الختمة</button>':""}`;
}
function showTopMenu(kind,mineBack=(kind==="mine"&&screen==="main")){
  const menu=document.getElementById("tb-popover"),btn=document.getElementById("tb-user");
  if(!menu||!btn) return;
  menu.innerHTML=kind==="mine"?topMineMarkup(mineBack):topAccountMarkup();
  menu.hidden=false;btn.setAttribute("aria-expanded","true");
}
function toggleTopMenu(){
  const menu=document.getElementById("tb-popover"),btn=document.getElementById("tb-user");
  if(!menu||!btn||!btn.textContent.trim()) return;
  if(!menu.hidden){closeTopMenu();return;}
  showTopMenu(screen==="home"?"mine":"account");
}
function syncTopUser(){
  const topUser=document.getElementById("tb-user");
  if(!topUser) return;
  closeTopMenu();
  if(topUserObserver){topUserObserver.disconnect();topUserObserver=null;}
  document.body.classList.remove("show-top-user","show-home-mine");
  topUser.textContent="";
  topUser.disabled=true;

  if(screen==="home"){
    if(mineGet().length){
      topUser.textContent="ختماتي";topUser.disabled=false;
      document.body.classList.add("show-home-mine");
    }
    return;
  }
  if(!(viewer&&screen==="main")) return;
  topUser.textContent=viewer.name;topUser.disabled=false;
  const bar=document.getElementById("main-userbar");
  if(!bar) return;
  topUserObserver=new IntersectionObserver(entries=>{
    const entry=entries[0];
    const show=!entry.isIntersecting&&entry.boundingClientRect.top<64;
    document.body.classList.toggle("show-top-user",show);
    if(!show) closeTopMenu();
  },{root:null,rootMargin:"-64px 0px 0px 0px",threshold:0});
  topUserObserver.observe(bar);
}
function queueTopUserSync(){
  cancelAnimationFrame(topUserResizeFrame);
  topUserResizeFrame=requestAnimationFrame(syncTopUser);
}

function render(){
  const v={boot:viewBoot,home:viewHome,create:viewSetup,share:viewShare,
           gate:viewGate,main:viewMain,notfound:viewNotFound,linking:viewLinking}[screen]||viewBoot;
  document.getElementById("app").innerHTML=v();
  bind();
  requestAnimationFrame(syncTopUser);
}

const viewBoot=()=>`<div class="gate"><p class="lede">جارٍ التحميل…</p></div>`;

function viewLinking(){
  const org = justCreated || (state && viewer && state.organizerId===viewer.id);
  return `<div class="gate">
    <div class="display">${esc(state&&state.title?state.title:"زاد الخير")}</div>
    ${rule()}
    <div class="frame card">
      <div class="tgbig">${TG_ICON}</div>
      <p class="lede" style="margin:.4rem 0 0">جارٍ فتح تلغرام لتفعيل بوت زاد الخير المرتبط بهذه الختمة…</p>
      <div id="lk-fallback" class="lk-hidden">
        <div class="rule" style="margin:1.2rem 0 .9rem"><i>◆</i></div>
        <p class="hint" style="margin:0 0 .8rem">لم يفتح تلغرام؟</p>
        <button class="btn gold wide" id="lk-retry">أعد المحاولة</button>
        <p class="hint" style="margin-top:.9rem;line-height:1.9">${org
          ? "نعتذر عن أي إزعاج قد يسببه هذا، لكن الختمة لن تُنشأ قبل ربط بوت تلغرام التطبيق بحساب المشرف — حيث به يصلك التذكير، وتُدار بعض صلاحياتك."
          : "وإن لم يكن تلغرام على هاتفك، أخبر مشرف الختمة ليأذن لك بالدخول."}</p>
      </div>
    </div>
  </div>`;
}

function viewHome(){
  return `<div class="gate home-gate">
    <div class="brand">كلام الباري يجمعنا</div>
    ${rule()}
    <p class="lede">بتوفيق الله وهمّة بعضنا البعض، نبقى على تماس مع كلام الرحمن.</p>
    <div class="frame card" style="margin-top:1.7rem">
      <button class="btn gold wide" id="btn-new">نظّم ختمة جديدة</button>
      <div class="rule" style="margin:1.3rem 0 1.1rem"><i>أو</i></div>
      <div class="field-row" style="margin-bottom:.7rem">
        <label for="f-join">انضم إلى ختمة برمزها</label>
        <input id="f-join" class="field codebox" maxlength="4" autocomplete="off"
               placeholder="ABCD" inputmode="text"></div>
      <button class="btn wide" id="btn-join">انضمام</button>
      <p class="hint">الرمز أربعة محارف يعطيك إياها منظّم الختمة.</p>
    </div>
    <section class="public-khatmahs" aria-labelledby="active-khatmahs-title">
      <div class="public-khatmahs-head">
        <h2 id="active-khatmahs-title">الختمات الجارية</h2>
      </div>
      ${publicCardsMarkup()}
    </section>
  </div>`;
}

function viewNotFound(){
  return `<div class="gate">
    <div class="display">لا توجد ختمة بهذا الرمز</div>
    ${rule()}
    <p class="lede">تأكّد من الرمز <b>${esc(code)}</b>، أو اطلبه من المنظّم من جديد.</p>
    <button class="btn gold wide" data-home style="margin-top:1.2rem">رجوع</button>
  </div>`;
}

function viewSetup(){
  return `<div class="gate" style="max-width:46ch">
    <div class="display">ابدأ الختمة</div>
    ${rule()}
    <div class="frame card">
      <div class="field-row"><label for="f-org">اسمك (المنظّم)</label>
        <input id="f-org" class="field" autocomplete="name"></div>
      <div class="field-row"><label for="f-title">اسم الختمة</label>
        <input id="f-title" class="field" value="زاد الخير"></div>
      <div class="field-row"><label for="f-ded">على نية:</label>
        <input id="f-ded" class="field"></div>
      <fieldset class="access-picker">
        <legend>نوع الختمة</legend>
        <div class="access-options">
          <label class="access-option">
            <input type="radio" name="f-access" value="private" checked>
            <span class="access-option-body"><b>خاصة</b>
              <small>تظهر بطاقتها، ولا يدخلها القارئ إلا برمز الختمة.</small></span>
          </label>
          <label class="access-option">
            <input type="radio" name="f-access" value="public">
            <span class="access-option-body"><b>عامة</b>
              <small>مفتوحة، وينضم إليها أي قارئ مباشرة.</small></span>
          </label>
        </div>
      </fieldset>
      <div class="dtgrid">
        <div class="dtcell"><label for="f-end">تنتهي في</label>
          <input id="f-end" class="field" type="date" value="${plusDays(7)}" min="${todayISO()}">
          <p class="dtprev" id="p-fend"></p></div>
        <div class="dtcell"><label for="f-hour">التذكير عند</label>
          <select id="f-hour" class="field">${hourOptions(20)}</select>
          <p class="dtprev">كل يوم</p></div>
      </div>
      <div class="field-row"><label for="f-code2">رمز المنظّم</label>
        <input id="f-code2" class="field" placeholder="رمز تحفظه لنفسك">
        <p class="hint">هذا الرمز لضمان وجود منظّم واحد للختمة، وتجنّب الأخطاء.</p></div>
      <button class="btn gold wide" id="btn-create">ابدأ الختمة</button>
      <button class="btn quiet wide" data-home style="margin-top:.5rem">رجوع</button>
    </div>
  </div>`;
}

function viewShare(){
  const isPublic=state&&state.accessType==="public";
  return `<div class="gate" style="max-width:44ch">
    <div class="display">بدأت الختمة</div>
    ${rule()}
    <p class="lede">${isPublic
      ?"ختمتك عامة؛ يستطيع أي قارئ الانضمام إليها من الصفحة الرئيسية، ويمكنك أيضًا مشاركة رابطها."
      :"شارك هذا الرابط مع المجموعة. من يفتحه يكتب اسمه ويحجز جزءه مباشرة."}</p>
    <div class="frame card">
      ${isPublic?'<span class="access-badge public">ختمة عامة</span>':`
        <div class="codebig">${esc(code)}</div>
        <p class="hint" style="margin:0 0 1.1rem">رمز الختمة، لمن أراد الانضمام يدويًا</p>`}
      <div class="linkbox">${esc(linkFor(code))}</div>
      <button class="btn gold wide" id="btn-copy" style="margin-top:.9rem">نسخ رابط الدعوة</button>
      <button class="btn wide" id="btn-enter" style="margin-top:.5rem">ادخل إلى الختمة</button>
      <p class="hint">احفظ رمز المنظّم الذي اخترته، فهو ما يثبت أنك مشرف الختمة.</p>
    </div>
  </div>`;
}

function viewGate(){
  const asks=!!gateName;
  const org=memberOf(state.organizerId);
  const isPublic=state.accessType==="public";
  return `<div class="gate">
    <p class="joining">انضمامك إلى ختمة</p>
    <div class="display">${esc(state.title)}</div>
    ${state.dedication?`<p class="lede" style="margin-top:.2rem">على نية: ${esc(state.dedication)}</p>`:""}
    <p class="joining">بإشراف ${esc(org?org.name:"—")} · ${isPublic
      ?'<span class="access-badge public">ختمة عامة</span>'
      :`رمز الختمة <b>${esc(code)}</b>`}</p>
    ${rule()}
    <div class="frame card">
    ${asks?`
      <div class="field-row"><label for="f-code">رمز المنظّم</label>
        <input id="f-code" class="field" type="password" autocomplete="off" placeholder="الرمز الذي اخترته">
        <p class="hint">اسم «${esc(gateName)}» هو منظّم الختمة، ورمزه يضمن أن يبقى منظّمًا واحدًا.</p></div>
      <button class="btn gold wide" id="btn-code">تأكيد</button>
      <button class="btn quiet wide" id="btn-back" style="margin-top:.5rem">رجوع</button>`
    :`
      <div class="field-row"><input id="f-name" class="field" placeholder="أدخل اسمك لو سمحت" autocomplete="name"></div>
      <button class="btn gold wide" id="btn-login">دخول</button>
      <p class="hint">اسمك هو هويتك هنا. ادخل بالاسم نفسه في كل مرة لتجد أجزاءك.</p>`}
    </div>
    ${asks?"":`<p class="hint" style="margin-top:1.1rem">
      أتريد ختمة أخرى؟
      <button class="btn quiet sm" data-home>الصفحة الرئيسية</button></p>`}
  </div>`;
}

function viewMain(){
  const done=state.juz.filter(j=>j.status==="done").length;
  const taken=state.juz.filter(j=>j.status!=="free").length;
  const dl=daysLeft(state.endDate);
  const me=memberOf(viewer.id)||{};

  const cells=state.juz.map((j,i)=>{
    const cls=j.status==="done"?"done":j.status==="taken"?"taken":"";
    const mine=j.ownerId===viewer.id?" mine":"";
    const o=j.ownerId?memberOf(j.ownerId):null;
    return `<button class="cell ${cls}${mine}" data-i="${i}" style="animation-delay:${i*14}ms" aria-label="الجزء ${i+1}">
      <span class="num">${ar(i+1)}</span>
      <span class="range">${JUZ[i]}</span>
      <span class="who">${o?esc(o.name):(j.status==="done"?"مقروء":"متاح")}</span></button>`;
  }).join("");

  const sortedMembers=[...(state.members||[])].sort((a,b)=>
    norm(a.name).localeCompare(norm(b.name),"ar",{sensitivity:"base"}));
  const roster=sortedMembers.map(m=>{
    const n=state.juz.filter(j=>j.ownerId===m.id).length;
    const d=state.juz.filter(j=>j.ownerId===m.id&&j.status==="done").length;
    return `<div class="roster-row">
      <span class="avatar">${esc(norm(m.name).charAt(0)||"؟")}</span>
      <span class="rwho">
        <span class="rname">${esc(m.name)}</span>
        ${m.id===state.organizerId?'<span class="tag">المنظّم</span>':""}
      </span>
      <span class="rtag">
        ${m.linked?'<span class="tag j">التذكير مفعّل</span>':(!m.linked&&m.exempt?'<span class="tag ex">بلا تذكير</span>':"")}
      </span>
      <span class="n">${n?`${ar(d)} / ${ar(n)}`:"—"}</span>
      ${isOrganizer()
        ? (m.id!==viewer.id
            ? `<button class="btn quiet sm dots" data-member="${esc(m.id)}" aria-label="خيارات">⋯</button>`
            : `<span class="dots-gap" aria-hidden="true"></span>`)
        : ""}
    </div>`;
  }).join("");
  return `<div class="khatma-shell">
  <div class="userbar" id="main-userbar">
    <span class="avatar">${esc(norm(viewer.name).charAt(0)||"؟")}</span>
    <span class="user-name">${esc(viewer.name)}</span>
    ${isOrganizer()?'<span class="tag">المنظّم</span>':""}
    ${me.linked?'<span class="tag j">التذكير مفعّل</span>':""}
    <span class="spacer"></span>
    <button class="btn quiet sm" id="btn-mine">ختماتي</button>
    <button class="btn quiet sm" id="btn-history">سجلي</button>
    <button class="btn quiet sm" id="btn-link">${me.linked?"أعد تفعيل التذكير":"فعّل التذكير"}</button>
    <button class="btn quiet sm" id="btn-logout">خروج</button>
  </div>

  <div class="frame hero">
    <div class="hero-intro">
      <div class="display">${esc(state.title)}</div>
      ${state.dedication?`<div class="dedication">على نية: ${esc(state.dedication)}</div>`:""}
    </div>
    <div class="orbs">
      <div class="shamsa-col">
        ${shamsa()}
        <div class="shamsa-meta"><em>محجوز</em><b>${ar(taken)} من ٣٠</b></div>
      </div>
      ${zOrb()}
    </div>
  </div>
  ${ptLine()}

  ${me.linked?"":viewLinkCall()}
  ${done===30?viewKhatm():dl===0?viewOverdue():""}

  <div class="main-layout">
    <section class="juz-panel">
      <div class="sec-head"><h2 class="sec">الأجزاء الثلاثون</h2>
        <div class="legend"><b class="lg-free">متاح</b><b class="lg-take">محجوز</b><b class="lg-done">تمّت قراءته</b></div>
      </div>
      <div class="grid">${cells}</div>
    </section>

    <aside class="people-panel">
      <div class="sec-head"><h2 class="sec">المشاركون</h2>
        <span style="color:var(--muted);font-size:.78rem">${ar((state.members||[]).length)}</span></div>
      <div class="frame roster-list">${roster}</div>
    </aside>
  </div>

  <div class="toolbar">
    <button class="btn quiet" data-home>الصفحة الرئيسية</button>
    <button class="btn" id="btn-share">نسخ رابط الدعوة</button>
    <span class="codechip">رمز الختمة <b>${esc(code)}</b></span>
    ${isOrganizer()?`<button class="btn quiet" id="btn-broadcast">رسالة للمجموعة</button>`:""}
    ${isOrganizer()?`<button class="btn quiet" id="btn-settings">إعدادات الختمة</button>`:""}
    ${isOrganizer()?`<button class="btn danger" id="btn-reset">إلغاء الختمة</button>`:""}
    ${isOrganizer()?"":`<button class="btn danger spacer" id="btn-leave">مغادرة الختمة</button>`}
  </div>
  ${state.accessType==="public"
    ? (me.linked?`<p class="hint">موعد تذكيرك اليومي: ${fmtTime(me.reminderHour??state.reminderHour,me.reminderMinute??0)}.</p>`:"")
    : `<p class="hint">يصل التذكير يوميًا في ${fmtTime(state.reminderHour,state.reminderMinute??0)} إلى كل من فعّل التذكير وحجز جزءًا ولم يُتمّه.</p>`}
  </div>`;
}

function viewLinkCall(){
  return `<div class="frame linkcall">
    <div class="lc-text">
      <h3>فعّل التذكير في تلغرام ${TG_ICON}</h3>
      <p>يصلك جزؤك ووردك اليومي برسالة تذكيرية لطيفة في وقتها كل يوم، إن شاء الله.</p>
    </div>
    <button class="btn green lc-btn" id="btn-link-big">فعّل الآن</button>
  </div>`;
}

function viewOverdue(){
  const left=state.juz.filter(j=>j.status!=="done").length;
  return `<div class="frame overdue">
    <h2>انقضى الموعد</h2>
    <p>بقي ${ar(left)} ${left===1?"جزء لم يُقرأ":"أجزاء لم تُقرأ"}. لا يُلغى شيء، والتذكير يستمر أسبوعًا بعد الموعد.</p>
    ${isOrganizer()
      ?`<button class="btn gold" id="btn-extend">مدّد الموعد</button>
        <p class="hint">أو ابدأ ختمة جديدة من الإعدادات.</p>`
      :`<p class="hint">باب الخير مفتوح، فأتمّ جزءك متى تيسّر.</p>`}
  </div>`;
}

function viewKhatm(){
  return `<div class="frame khatm">
    <h2>تمّت الختمة</h2>
    <p>اللهم ارحمنا بالقرآن، واجعله لنا إمامًا ونورًا وهدًى ورحمة.</p>
    ${isOrganizer()
      ?`<button class="btn gold" id="btn-next">ابدأ ختمة جديدة</button>
        <p class="hint">يبقى المشاركون كما هم، وتُفتح الأجزاء الثلاثون من جديد.</p>`
      :`<p class="hint">ينتظر المشاركون أن يفتح المنظّم ختمة جديدة.</p>`}
  </div>`;
}

/* ===================== لوح الجزء ===================== */
function openSheet(i){
  selected=i;
  const j=state.juz[i];
  const o=j.ownerId?memberOf(j.ownerId):null, mine=j.ownerId===viewer.id;
  let acts="", note="";
  if(j.status==="free") acts=`<button class="btn green" data-act="take" data-i="${i}">احجز هذا الجزء</button>`
    + (isOrganizer()?`<button class="btn" id="s-assign" data-i="${i}">أسنده إلى مشارك</button>`:"");
  else if(mine&&j.status==="taken") acts=`<button class="btn gold" data-act="done" data-i="${i}">أتممت قراءته</button>
    <button class="btn quiet" data-act="free" data-i="${i}">تراجع عن الحجز</button>`;
  else if(mine) acts=`<button class="btn quiet" data-act="undone" data-i="${i}">تراجع عن الإتمام</button>`;
  else{ note=j.status==="done"&&!o
      ? "هذا الجزء مقروء، وقد غادر قارئه الختمة."
      : `محجوز باسم ${esc(o?o.name:"—")}${j.status==="done"?"، وقد أتمّه.":"."}`;
    if(isOrganizer()&&j.status==="taken")
      acts=`<button class="btn gold" data-act="done" data-i="${i}">علّمه مقروءًا نيابةً عنه</button>
            <button class="btn" id="s-assign" data-i="${i}">أسنده إلى غيره</button>
            <button class="btn" data-act="free" data-i="${i}">حرِّر الجزء للجميع</button>`;
    else if(isOrganizer()&&j.status==="done")
      acts=`<button class="btn quiet" data-act="undone" data-i="${i}">تراجع عن الإتمام</button>`; }
  document.getElementById("layer").innerHTML=`
    <div class="scrim" id="scrim"></div>
    <div class="frame sheet">
      <div class="grip"></div>
      <h3>الجزء ${ar(i+1)}</h3>
      <div class="range">${JUZ[i]}</div>
      <a class="readbtn" href="${readLink(i+1)}">
        <span class="rb-icon">${BOOK_ICON}</span>
        <span class="rb-text">اقرأ الجزء</span>
        <span class="rb-src">قارئ زاد الخير</span>
        <span class="rb-fill"></span>
      </a>
      <div class="ward">
        <p class="motiv">${MOTIV[i].t}</p>
        <p class="quote ${MOTIV[i].k==="a"?"ayah":"hadith"}">${MOTIV[i].k==="a"
          ? "﴿ "+MOTIV[i].q+" ﴾" : "قال ﷺ: «"+MOTIV[i].q+"»"}</p>
        <p class="src">${MOTIV[i].s}</p>
      </div>
      ${note?`<p class="hint">${note}</p>`:""}
      <div class="actions">${acts}<button class="btn quiet spacer" id="s-close">إغلاق</button></div>
    </div>`;
  document.getElementById("scrim").onclick=closeLayer;
  document.getElementById("s-close").onclick=closeLayer;
  const asg=document.getElementById("s-assign");
  if(asg) asg.onclick=()=>assignDialog(i);
  document.querySelectorAll("[data-act]").forEach(b=>b.onclick=()=>act(b.dataset.act,+b.dataset.i));
}
function closeLayer(){document.getElementById("layer").innerHTML="";document.body.classList.remove("zk-launch-prayer");selected=null;}
function modal(html,kind=""){
  document.getElementById("layer").innerHTML=`<div class="modal${kind?` ${kind}`:""}" id="m-back"><div class="frame">${html}</div></div>`;
  document.getElementById("m-back").onclick=e=>{if(e.target.id==="m-back")closeLayer();};
}


/* نافذة تأكيد موحّدة: نفس modal/frame والعناوين والأزرار المستعملة في التطبيق. */
function appConfirm(message,{title="تأكيد",ok="متابعة",cancel="إلغاء",danger=false}={}){
  return new Promise(resolve=>{
    const host=document.createElement("div");
    host.className="modal app-confirm-overlay";
    host.setAttribute("role","presentation");
    host.innerHTML=`<div class="frame app-confirm-card" role="dialog" aria-modal="true" aria-labelledby="app-confirm-title">
      <div class="display" id="app-confirm-title" style="font-size:1.4rem">${esc(title)}</div>
      <p class="hint app-confirm-copy" style="margin:.7rem 0 1.1rem;line-height:2">${esc(message)}</p>
      <div class="actions">
        <button class="btn ${danger?"danger":"gold"}" data-confirm-ok>${esc(ok)}</button>
        <button class="btn quiet" data-confirm-cancel>${esc(cancel)}</button>
      </div>
    </div>`;
    document.body.appendChild(host);
    const okBtn=host.querySelector("[data-confirm-ok]");
    const cancelBtn=host.querySelector("[data-confirm-cancel]");
    let settled=false;
    const done=value=>{
      if(settled) return;
      settled=true;
      document.removeEventListener("keydown",onKey,true);
      host.remove();
      resolve(value);
    };
    const onKey=e=>{
      if(e.key==="Escape"){e.preventDefault();done(false);}
    };
    okBtn.onclick=()=>done(true);
    cancelBtn.onclick=()=>done(false);
    host.onclick=e=>{if(e.target===host)done(false);};
    document.addEventListener("keydown",onKey,true);
    requestAnimationFrame(()=>okBtn.focus({preventScroll:true}));
  });
}

/* بديل داخلي لـ prompt، بنفس نافذة التطبيق القياسية. */
function appCopyFallback(title,value){
  return new Promise(resolve=>{
    const host=document.createElement("div");
    host.className="modal app-confirm-overlay";
    host.innerHTML=`<div class="frame app-confirm-card" role="dialog" aria-modal="true" aria-labelledby="app-copy-title">
      <div class="display" id="app-copy-title" style="font-size:1.4rem">${esc(title)}</div>
      <p class="hint" style="margin:.7rem 0 .9rem;line-height:2">تعذّر النسخ التلقائي. حدّد النص وانسخه من هنا.</p>
      <textarea class="app-copy-box" readonly>${esc(value)}</textarea>
      <div class="actions" style="margin-top:1rem">
        <button class="btn gold" data-copy-close>حسنًا</button>
      </div>
    </div>`;
    document.body.appendChild(host);
    const ta=host.querySelector("textarea");
    const close=()=>{host.remove();resolve();};
    host.querySelector("[data-copy-close]").onclick=close;
    host.onclick=e=>{if(e.target===host)close();};
    requestAnimationFrame(()=>{ta.focus({preventScroll:true});ta.select();});
  });
}

async function loadPublicKhatmahs(force=false){
  if(publicKhatmahsLoading||(!force&&publicKhatmahsLoaded)) return;
  publicKhatmahsLoading=true;publicKhatmahsError=false;
  if(screen==="home") render();
  try{
    const rows=await rpc("list_active_khatmahs",{});
    publicKhatmahs=Array.isArray(rows)?rows:[];
    publicKhatmahsLoaded=true;
  }catch(e){
    /* بيانات عرض داخل بيئة المعاينة وحدها؛ لا تُستعمل على الموقع الحقيقي. */
    if(location.hostname==="terminal.local"){
      publicKhatmahs=[
        {publicId:"preview-1",title:"ختمة أهل القرآن",accessType:"public",participantCount:12,reservedCount:23,doneCount:14,endDate:plusDays(5)},
        {publicId:"preview-2",title:"ختمة المحبة",accessType:"public",participantCount:8,reservedCount:17,doneCount:9,endDate:plusDays(8)},
        {publicId:"preview-3",title:"رفقة النور",accessType:"private",participantCount:21,reservedCount:30,doneCount:26,endDate:plusDays(2)},
        {publicId:"preview-4",title:"ختمة العائلة",accessType:"private",participantCount:6,reservedCount:11,doneCount:4,endDate:plusDays(10)}
      ];
      publicKhatmahsLoaded=true;
    }else publicKhatmahsError=true;
  }
  finally{
    publicKhatmahsLoading=false;
    if(screen==="home") render();
  }
}

async function joinKhatmahCard(publicId){
  const item=publicKhatmahs.find(k=>k.publicId===publicId);
  if(!item) return;
  if(item.accessType==="public"){
    toast("جارٍ فتح الختمة…");
    let publicCode;
    try{publicCode=await rpc("open_public_khatmah",{p_public_id:publicId});}
    catch(e){return toast("تعذّر فتح الختمة الآن");}
    if(!publicCode) return toast("لم تعد هذه الختمة متاحة");
    zkReplaceHash(String(publicCode).toUpperCase());boot();return;
  }
  modal(`<div class="display" style="font-size:1.35rem">${esc(item.title)}</div>
    <p class="hint" style="margin:.55rem 0 1rem">أدخل رمز هذه الختمة للانضمام إليها.</p>
    <div class="field-row"><input id="card-code" class="field codebox" maxlength="4"
      autocomplete="off" inputmode="text" placeholder="ABCD"></div>
    <div class="actions"><button class="btn gold" id="card-go">انضمام</button>
      <button class="btn quiet" id="card-no">إلغاء</button></div>`);
  const field=document.getElementById("card-code");
  const go=async()=>{
    const c=norm(field.value).toUpperCase();
    if(c.length!==4) return toast("الرمز أربعة محارف");
    let matches=false;
    try{matches=await rpc("match_khatmah_code",{p_public_id:publicId,p_code:c});}
    catch(e){return toast("تعذّر التحقق من الرمز");}
    if(!matches) return toast("هذا الرمز لا يخصّ الختمة المختارة");
    closeLayer();zkReplaceHash(c);boot();
  };
  document.getElementById("card-go").onclick=go;
  document.getElementById("card-no").onclick=closeLayer;
  field.onkeydown=e=>{if(e.key==="Enter")go();};
  field.focus();
}

async function historyDialog(){
  modal(`<div class="display" style="font-size:1.4rem">سجلي في هذه الختمة</div>
    <p class="hint" style="margin:.8rem 0">جارٍ جمع ما قرأت عبر دورات هذه الختمة…</p>`);
  let result;
  try{
    result=await rpc("get_my_history",{
      p_code:code,p_id:viewer.id,p_device:deviceId()
    });
  }catch(e){
    modal(`<div class="display" style="font-size:1.35rem">سجلي في هذه الختمة</div>
      <p class="hint" style="margin:.8rem 0 1rem">تعذّر تحميل السجل الآن.</p>
      <div class="actions"><button class="btn quiet" id="history-close">إغلاق</button></div>`);
    document.getElementById("history-close").onclick=closeLayer;
    return;
  }
  if(!result||!result.ok){
    modal(`<div class="display" style="font-size:1.35rem">سجلي في هذه الختمة</div>
      <p class="hint" style="margin:.8rem 0 1rem">${esc(result&&result.error||"تعذّر تحميل السجل")}</p>
      <div class="actions"><button class="btn quiet" id="history-close">إغلاق</button></div>`);
    document.getElementById("history-close").onclick=closeLayer;return;
  }
  const rows=Array.isArray(result.history)?result.history:[];
  const groups=new Map();
  rows.forEach(row=>{
    const round=Number(row.roundNo)||1;
    if(!groups.has(round)) groups.set(round,[]);
    groups.get(round).push(Number(row.number));
  });
  const rounds=[...groups.entries()].sort((a,b)=>b[0]-a[0]);
  const body=rounds.length?rounds.map(([round,parts])=>`
    <section class="history-round">
      <h4>الختمة ${ar(round)}</h4>
      <div class="history-parts">${parts.sort((a,b)=>a-b).map(n=>`<span class="history-part" title="الجزء ${n}">${ar(n)}</span>`).join("")}</div>
    </section>`).join(""):
    `<p class="hint" style="padding:1rem 0">لم يُسجّل لك جزء مقروء بعد.</p>`;
  modal(`<div class="display" style="font-size:1.4rem">سجلي في هذه الختمة</div>
    <p class="hint" style="margin:.5rem 0 .2rem">الأجزاء التي قرأتها، لتختار غيرها.</p>
    <div class="history-rounds">${body}</div>
    <div class="actions"><button class="btn quiet" id="history-close">إغلاق</button></div>`);
  document.getElementById("history-close").onclick=closeLayer;
}

/* ===================== البيانات ===================== */
let refreshSeq=0;
async function refresh(silent=false){
  if(!code) return false;
  const seq=++refreshSeq;
  let nextState;
  try{ nextState=await rpc("get_state",{p_code:code}); }
  catch(e){
    if(seq===refreshSeq&&!silent) toast("تعذّر الاتصال بقاعدة البيانات");
    return false;
  }
  /* لا تسمح لاستجابة أقدم أن تمحو حالة جلب أحدث. */
  if(seq!==refreshSeq) return false;
  state=nextState;
  if(!state){ mineForget(code); activeKhatmahForget(code); screen="notfound"; if(!silent) render(); return true; }
  if(viewer && !memberOf(viewer.id)){ /* حُذف أو دُمج */ viewer=null; localStorage.removeItem(vKey()); }
  if(screen!=="linking"){
    const me=viewer?memberOf(viewer.id):null;
    /* الربط شرط للدخول، ويُستثنى المنظّم ومن أُذن له */
    /* الربط شرط للدخول، ويلزم المشرف كما يلزم غيره */
    if(me && !me.linked && !me.exempt){
      /* في الختمة العامة لا يعرف القارئ مشرفها ليأذن له،
         فيُسأل بنفسه بدل أن يُساق إلى تلغرام سوقًا. */
      if(!silent){
        if(state.accessType==="public" && !isOrganizer()) askReminder();
        else startLinking();
        return;
      }
      screen="main";
    } else {
      screen = viewer ? "main" : "gate";
    }
  }
  if(viewer&&state) mineRemember();
  if(!silent) render();
  return true;
}

async function doSignIn(id,name,ocode){
  let r;
  try{ r=await rpc("sign_in",{p_code:code,p_id:id,p_name:name,
        p_device:deviceId(),p_org_code:ocode}); }
  catch(e){ return toast("تعذّر الاتصال"); }
  if(!r||!r.ok){
    if(r&&r.needCode){ gateName=name; screen="gate"; render(); return; }
    if(r&&r.taken) return nameTaken(r.name);
    return toast((r&&r.error)||"تعذّر الدخول");
  }
  viewer={id:r.id,name:r.name};
  localStorage.setItem(vKey(),JSON.stringify(viewer));
  activeKhatmahSet(code,true);
  if(ocode) localStorage.setItem(cKey(),ocode);
  gateName="";
  if(!await refresh(true)){
    screen="gate"; render(); toast("تعذّر الاتصال بقاعدة البيانات"); return;
  }
  const me=memberOf(viewer.id);
  if(me&&!me.linked&&!me.exempt){
    if(state.accessType==="public"&&!isOrganizer()) askReminder();
    else startLinking();
    return;
  }
  render();
  toast("أهلًا بك");
}

function nameTaken(name){
  modal(`<div class="display" style="font-size:1.4rem">هذا الاسم لصاحبه</div>
    <p class="hint" style="margin:.7rem 0 1.1rem;line-height:2">
      اسم «${esc(name)}» مسجَّل من جهاز آخر، فلا يُدخل به من هنا.<br>
      إن كان اسمك أنت وغيّرت هاتفك، فاطلب من المنظّم فتحه لك.<br>
      وإلا فادخل باسم يميّزك عنه.</p>
    <div class="actions"><button class="btn gold" id="nt-ok">حسنًا</button></div>`);
  document.getElementById("nt-ok").onclick=closeLayer;
}

function askSimilar(list,typed){
  const rows=list.map(m=>{
    const n=state.juz.filter(j=>j.ownerId===m.id).length;
    return `<button class="asg-row" data-pick="${esc(m.id)}">
      <span class="avatar">${esc(norm(m.name).charAt(0)||"؟")}</span>
      <span class="asg-name">${esc(m.name)}</span>
      <span class="asg-n">${n?`${ar(n)} ${n===1?"جزء":"أجزاء"}`:"لم يحجز"}</span>
    </button>`;
  }).join("");

  modal(`<div class="display" style="font-size:1.35rem">هل أنت أحد هؤلاء؟</div>
    <p class="hint" style="margin:.6rem 0 1rem">
      كتبت «${esc(typed)}»، ويوجد في الختمة اسم يشبهه.
      إن كان أحدهم اسمك فاختره لتجد أجزاءك وتذكيرك كما تركتها.</p>
    <div class="asg-list">${rows}</div>
    <div class="actions" style="margin-top:1rem">
      <button class="btn quiet" id="sim-no">لا، أنا شخص آخر</button></div>`);

  document.querySelectorAll("[data-pick]").forEach(b=>b.onclick=async()=>{
    const m=list.find(x=>x.id===b.dataset.pick);
    closeLayer();
    if(m.id===state.organizerId){ gateName=m.name; screen="gate"; render(); return; }
    await doSignIn(m.id,m.name,null);
  });

  document.getElementById("sim-no").onclick=async()=>{
    closeLayer();
    const id=keyOf(typed);
    if(id===state.organizerId){ gateName=typed; screen="gate"; render(); return; }
    await doSignIn(id,typed,null);
  };
}

/* ===================== تلغرام ===================== */
let lkTimer=null;

/* يفتح البوت ويظلّ يراقب حتى يتمّ التفعيل */
let linking=false;   /* حارس: عملية ربط جارية، فلا يُولَّد رمز ثانٍ */

async function startLinking(force){
  /* كل رمز جديد يمحو ما قبله، فتولّد رمزين على ضغطة واحدة
     يُفشل الربط ويُظهر اعتذارًا بلا سبب. */
  if(linking && !force){ if(screen!=="linking"){ screen="linking"; render(); } return; }
  linking=true;
  screen="linking"; render();
  const opened=await openBot();
  if(!opened) showFallback();
  /* بعد ثوانٍ نعرض المخرج على كل حال، فقد يفشل الفتح صامتًا */
  setTimeout(showFallback,5000);
  clearInterval(lkTimer);
  let tries=0,checking=false;
  lkTimer=setInterval(async()=>{
    if(screen!=="linking"||!viewer){ clearInterval(lkTimer); lkTimer=null; linking=false; return; }
    if(checking) return;
    checking=true;
    tries++;
    try{
      if(!await refresh(true)) return;
      if(!state){ clearInterval(lkTimer); lkTimer=null; linking=false; render(); return; }
      const m=memberOf(viewer.id);
      if(m&&(m.linked||m.exempt)){
        clearInterval(lkTimer); lkTimer=null; linking=false;
        if(justCreated){ justCreated=false; screen="share"; render(); toast("بدأت الختمة"); return; }
        screen="main"; render();
        toast(m.linked?"تم تفعيل التذكير، تقبّل الله":"أذن لك المنظّم بالدخول");
      } else if(tries>=100){ clearInterval(lkTimer); lkTimer=null; linking=false; showFallback(); }
    }finally{ checking=false; }
  },3000);
}

function showFallback(){
  const el=document.getElementById("lk-fallback");
  if(el) el.classList.remove("lk-hidden");
}

/* يولّد رمز ربط ويفتح محادثة البوت. يعيد false إن منع المتصفح الفتح */
async function openBot(){
  /* فتح النافذة داخل ضغطة المستخدم يمنع حاجب النوافذ من رفضها بعد انتظار الشبكة. */
  const w=window.open("about:blank","_blank");
  if(w) w.opener=null;
  let lc;
  try{ lc=await rpc("make_link_code",{p_code:code,p_id:viewer.id,p_device:deviceId()}); }
  catch(e){ if(w) w.close(); return false; }
  if(!lc){ if(w) w.close(); return false; }
  const url=`https://t.me/${BOT_USERNAME}?start=${lc}`;
  if(w){ w.location.replace(url); return true; }
  return false;
}

/* الزر الظاهر في الختمة لمن لم يفعّل، أو لمن حذف البوت */
let linkBusy=false;
async function linkTelegram(){
  if(linkBusy) return;
  linkBusy=true;
  const ok=await openBot();
  toast(ok?"اضغط زر البدء في تلغرام ثم عد إلى هنا":"تعذّر فتح تلغرام");
  if(!ok){ linkBusy=false; return; }
  let n=0,checking=false;
  const t=setInterval(async()=>{
    if(checking) return;
    checking=true;
    n++;
    try{
      if(!await refresh(true)) return;
      if(!state){ clearInterval(t); linkBusy=false; render(); return; }
      const m=memberOf(viewer.id);
      if(m&&m.linked){
        clearInterval(t); linkBusy=false; render(); toast("تم تفعيل التذكير");
      }else if(n>=20){ clearInterval(t); linkBusy=false; }
    }finally{ checking=false; }
  },3000);
}

/* ===================== إسناد الأجزاء ===================== */
function assignDialog(i){
  const num=i+1;
  const cur=state.juz[i].ownerId;
  const rows=(state.members||[]).map(m=>{
    const n=state.juz.filter(j=>j.ownerId===m.id).length;
    return `<button class="asg-row${m.id===cur?" cur":""}" data-to="${esc(m.id)}">
      <span class="avatar">${esc(norm(m.name).charAt(0)||"؟")}</span>
      <span class="asg-name">${esc(m.name)}</span>
      ${m.linked?'<span class="tag j">تذكير</span>':'<span class="tag warn">بلا تذكير</span>'}
      <span class="asg-n">${n?`${ar(n)} ${n===1?"جزء":"أجزاء"}`:"لم يحجز"}</span>
    </button>`;
  }).join("");

  modal(`<div class="display" style="font-size:1.4rem">إسناد الجزء ${ar(num)}</div>
    <p class="hint" style="margin:.6rem 0 1rem">${esc(JUZ[i])}</p>
    <div class="asg-list">${rows}</div>
    <div class="rule" style="margin:1rem 0 .8rem"><i>◆</i></div>
    <p class="seclabel">مشارك جديد</p>
    <div class="field-row" style="margin-bottom:.7rem">
      <input id="asg-new" class="field" placeholder="اسم من لا يملك تلغرام"></div>
    <div class="actions">
      <button class="btn" id="asg-add">أضفه وأسنده</button>
      <button class="btn quiet" id="asg-no">إغلاق</button></div>
    <p class="hint">من تضيفه هنا لن يصله تذكير، فبلّغه بنفسك.</p>`);

  document.getElementById("asg-no").onclick=closeLayer;

  document.querySelectorAll("[data-to]").forEach(b=>b.onclick=async()=>{
    const m=memberOf(b.dataset.to);
    if(!await appConfirm(`سيُسنَد الجزء ${ar(num)} إلى ${m?m.name:""}.`,{title:"إسناد الجزء",ok:"نعم، أسنده"})) return;
    await doAssign(num,b.dataset.to);
  });

  document.getElementById("asg-add").onclick=async()=>{
    const nm=norm(document.getElementById("asg-new").value);
    if(!nm) return toast("اكتب الاسم");
    const id=keyOf(nm);
    if(memberOf(id)) return toast("الاسم مسجَّل، اختره من القائمة");
    if(!await appConfirm(`سيُضاف ${nm} إلى المشاركين ويُسنَد إليه الجزء ${ar(num)}.\nلن يصله تذكير حتى يدخل بنفسه ويفعّله.`,{title:"إضافة مشارك",ok:"أضفه وأسنده"})) return;
    try{
      const r=await rpc("add_member",{p_code:code,p_org_code:orgCode(),p_id:id,p_name:nm,p_device:deviceId()});
      if(!r.ok) return toast(r.error||"تعذّر الإضافة");
      await doAssign(num,id);
    }catch(e){ toast("تعذّر الاتصال"); }
  };
}

async function doAssign(num,to){
  try{
    const r=await rpc("assign_juz",{p_code:code,p_org_code:orgCode(),p_num:num,p_to:to,p_device:deviceId()});
    if(!r.ok) return toast(r.error||"تعذّر الإسناد");
    closeLayer(); await refresh();
    toast(r.linked?`أُسنِد إلى ${r.name}`:`أُسنِد إلى ${r.name} — بلّغه بنفسك`);
  }catch(e){ toast("تعذّر الاتصال"); }
}

/* ===================== الدمج ===================== */
function mergeDialog(fromId){
  const from=memberOf(fromId); if(!from) return;
  const others=(state.members||[]).filter(m=>m.id!==fromId);
  modal(`<div class="display" style="font-size:1.4rem">دمج مشارك</div>
    <p class="hint" style="margin:.6rem 0 1rem">
      ستُنقل أجزاء «${esc(from.name)}» وربط تلغرامه إلى الاسم الذي تختاره، ثم يُحذف اسمه.</p>
    <div class="field-row"><label for="f-to">ادمجه في</label>
      <select id="f-to" class="field">
        ${others.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join("")}
      </select></div>
    <div class="actions">
      <button class="btn gold" id="mg-go">دمج</button>
      <button class="btn quiet" id="mg-no">إلغاء</button></div>`);
  document.getElementById("mg-no").onclick=closeLayer;
  document.getElementById("mg-go").onclick=async()=>{
    const to=document.getElementById("f-to").value;
    try{
      const r=await rpc("merge_members",{p_code:code,p_org_code:orgCode(),p_from:fromId,p_to:to,p_device:deviceId()});
      if(!r.ok) return toast(r.error||"تعذّر الدمج");
      closeLayer(); await refresh();
      toast(`نُقلت ${ar(r.moved)} أجزاء إلى ${r.name}`);
    }catch(e){ toast("تعذّر الاتصال"); }
  };
}

/* ===================== التعليمات ===================== */
const HELP_ORG=[
 {t:"قبل أن تبدأ",
 b:["شارك رابط الدعوة مع المجموعة، فمن يفتحه يكتب اسمه ويحجز جزءه مباشرة.",
     "<b>اختر نوع الختمة:</b> <b>العامة</b> تظهر في الصفحة الرئيسية ويدخلها أي قارئ بضغطة، فاخترها إن أردت أن يشاركك من لا تعرفه. و<b>الخاصة</b> لا يدخلها أحد من بطاقتها إلا برمز الختمة، فاخترها لجماعة بعينها: أهل بيت أو حلقة مسجد.",
     "ولك تغيير النوع متى شئت من «إعدادات الختمة»، فما حُجز يبقى كما هو.",
     "احفظ رمز المنظّم في مكان آمن. هو ما يثبت أنك مشرف الختمة، ولا يمكن استعادته إن ضاع.",
     "تفعيل التذكير في تلغرام يلزمك كما يلزم غيرك، ولا يظهر رمز الختمة ولا رابط الدعوة قبله.",
     "رمز الختمة يظهر في أسفل الصفحة، ويصلح لمن أراد الانضمام يدويًا بلا رابط."]},
 {t:"كيف يدخل المشاركون",
 b:["يكتب كلٌّ اسمه. في الختمة العامة يختار إن كان يريد تذكيرًا، وفي الخاصة يفعّله أو يأذن له المشرف بالدخول بلا تذكير.",
     "الختمة العامة تُفتح مباشرة من بطاقتها، أما الخاصة فتطلب رمز الختمة.",
     "بعد فتح تلغرام، عليه ضغط زر «start» في أسفل الشاشة.",
     "الاسم يُقفل على جهاز صاحبه، فلا يدخل به غيره."]},
 {t:"من لا يملك تلغرام",
  b:["في الختمة العامة يختار المشارك بنفسه عند الدخول: تذكير في تلغرام أو متابعة بلا تذكير، فلا يحتاج إلى إذن المشرف.",
     "في الختمة الخاصة، إن كان المشارك لا يملك تلغرام، افتح نافذته من زر ⋯ واختر «ائذن له بالدخول بلا تلغرام».",
     "سيدخل ويحجز كالجميع، لكن لن يصله تذكير.",
     "ولا يصحّ هذا الإذن لك أنت، فالمشرف يلزمه التفعيل.",
     "ويظهر أمام اسمه وسم «بلا تذكير»."]},
 {t:"توزيع الأجزاء",
  b:["الأصل أن يحجز كلٌّ جزءه بنفسه.",
     "ولمن يصعب عليه، افتح الجزء واضغط «أسنده إلى مشارك» واختره من القائمة.",
     "وتستطيع إضافة اسم جديد من النافذة نفسها لمن ليس في القائمة بعد.",
     "وإن نسي أحدهم تعليم جزئه، افتح الجزء واضغط «علّمه مقروءًا نيابةً عنه»، وستصله رسالة شكر."]},
 {t:"نافذة المشارك — زر ⋯",
  b:["<b>أرسل له رسالة</b>: تصله في تلغرام تحت عنوان الختمة.",
     "<b>افتح الاسم</b>: افتحه لمرة واحدة أو دائماً، ويمكنك إلغاء الفتح الدائم لاحقاً.",
     "<b>ادمجه في اسم آخر</b>: لمن دخل باسمين مختلفين، فتنتقل أجزاؤه وتذكيره إلى اسم واحد.",
     "<b>احذفه</b>: في حال إنشاء حساب بالخطأ وتركه مثلًا. وتعود أجزاؤه متاحة ويُفقد تذكيره."]},
 {t:"الإعدادات وما بعد الختمة",
  b:["في الختمة الخاصة يكون وقت التذكير موحّدًا وتضبطه من الإعدادات. أمّا في الختمة العامة فيختار كل مشارك ساعته بنفسه.",
     "<b>ابدأ ختمة جديدة</b> من الإعدادات: تُفرَّغ الأجزاء الثلاثون، ويبقى المشاركون وتذكيراتهم والرابط كما هي.",
     "<b>سلّم الإشراف</b>: تختار من يخلفك من المشاركين وتضع له رمزًا، فتصير أنت مشاركًا عاديًّا وتبقى أجزاؤك وتذكيرك كما هي. والمشرف لا يغادر ختمته، فإن أردت الخروج منها فسلّم الإشراف أوّلًا ثم غادر.",
     "<b>غيّر رمز المشرف</b>: لمن تسرّب رمزه أو أراد تبديله. القديم يبطل فورًا.",
     "<b>إلغاء الختمة</b>: يمحو كل شيء نهائيًا ويُبطل الرابط، وتصل المجموعة رسالة بالإلغاء. لا تستعمله إلا للتخلّص من ختمة أنشئت بالخطأ.",
     "إن انقضى الموعد ولم تكتمل، فالتذكير يستمر أسبوعًا عبر تلغرام، ولك أن تمدّد الموعد بضغطة."]}
];

const HELP_ONE=[
 {t:"الختمات العامة والخاصة",
  b:["في الصفحة الرئيسية بطاقتان: <b>الختمات العامة</b> و<b>الختمات الخاصة</b>، وفي كل بطاقة اسم الختمة وعدد المشاركين وشريط يبيّن كم جزءًا حُجز.",
     "<b>العامة</b> مفتوحة لكل من يرغب في المشاركة، تدخلها بضغطة «انضم الآن» بلا رمز.",
     "<b>الخاصة</b> لجماعة بعينها، فلا تدخلها إلا برمز الختمة الذي يعطيك إياه منظّمها.",
     "في الختمة العامة يُسألُ القارئ: أتريد تذكيرًا يوميًّا في تلغرام؟ فإن قال نعم اختار ساعته وربط حسابه، وإن قال لا دخل وحجز جزءه وتابع من التطبيق.",
     "وقبل أن تدخل، انظر إلى شريط الحجز: إن قال «جميع الأجزاء الثلاثين محجوزة» فلا جزء متاحًا فيها، وإلا فالشريط يخبرك كم بقي."]},
 {t:"كيف تشارك",
  b:["اختر جزءًا متاحًا واضغطه، ثم «احجز هذا الجزء».",
     "تستطيع حجز أكثر من جزء إن أردت.",
     "وإن غيّرت رأيك، افتح جزءك واضغط «تراجع عن الحجز»، فيعود متاحًا لغيرك."]},
 {t:"إذا أتممت جزءك",
  b:["افتحه واضغط «أتممت قراءته»، فيصير ذهبيًا.",
     "عندها يتوقف تذكيرك به، وتصلك رسالة شكر في تلغرام.",
     "فإن نسيت، بقي التذكير يصلك حتى تعلّمه."]},
 {t:"التذكير",
  b:["يصلك في تلغرام مرة كل يوم، فيه جزؤك ووردك اليومي وآية أو حديث.",
     "ولا يصلك شيء إن لم يبق لك جزء غير مقروء."]},
 {t:"إن أردت المغادرة",
  b:["في أسفل صفحة الختمة زرّ <b>مغادرة الختمة</b>.",
     "ما لم تُتمّه من أجزاء يعود متاحًا لغيرك، <b>وما أتممتَه يبقى محسوبًا للختمة باسمك</b> — القراءة لا تُلغى بالمغادرة.",
     "ويتوقّف تذكيرك، ويُرفع اسمك من قائمة المشاركين.",
     "ولك أن تعود متى شئت بالاسم نفسه."]}
];

function helpDialog(){
  const inside = !!(state && viewer && screen==="main");
  const org = inside && isOrganizer();

  const block=(secs)=>secs.map(x=>`<section class="hsec">
      <h4>${x.t}</h4>
      <ul>${x.b.map(li=>`<li>${li}</li>`).join("")}</ul>
    </section>`).join("");

  let title, body;
  if(!inside){
    title="التعليمات";
    body=`<p class="hgroup">للمشارك</p>${block(HELP_ONE)}
          <p class="hgroup">لمشرف الختمة</p>${block(HELP_ORG)}`;
  } else if(org){
    title="دليل المشرف"; body=block(HELP_ORG);
  } else {
    title="كيف تشارك"; body=block(HELP_ONE);
  }

  modal(`<div class="display" style="font-size:1.4rem;margin-bottom:1rem">${title}</div>
    <div class="hbody">${body}</div>
    <div class="actions" style="margin-top:1rem;justify-content:center">
      <button class="btn gold" id="h-close">حسنًا</button></div>`);
  document.getElementById("h-close").onclick=closeLayer;
}

/* ===================== نافذة المشارك ===================== */
function nameAccessDialog(id){
  const m=memberOf(id); if(!m) return;
  modal(`<div class="display" style="font-size:1.4rem">فتح اسم «${esc(m.name)}»</div>
    <p class="hint" style="line-height:2;margin:.7rem 0">اختر طريقة الدخول المناسبة للمشارك.</p>
    <div class="mlist">
      <button class="mact" id="access-once"><b>فتح لمرة واحدة</b>
        <span>أول متصفح يدخل بالاسم يصبح الجهاز المسموح له، ثم يُقفل الاسم مجدداً.</span></button>
      ${m.openPermanently
        ? `<button class="mact" id="access-lock"><b>إلغاء الفتح الدائم</b><span>تعود الحماية للأجهزة المسموح لها قبل الفتح الدائم.</span></button>`
        : `<button class="mact" id="access-open"><b>فتح دائم</b><span>يمكن الدخول بالاسم من أي متصفح حتى تلغي الفتح.</span></button>`}
    </div>
    <p class="hint" style="line-height:1.9;margin:.8rem 0">عند الفتح الدائم يستطيع أي شخص يعرف الاسم ورابط الختمة الدخول به.</p>
    <div class="actions"><button class="btn quiet" id="access-back">رجوع</button></div>`);
  document.getElementById("access-back").onclick=()=>memberDialog(id);
  async function setAccess(mode){
    const message=mode==="open"
      ? `سيستطيع أي شخص يعرف اسم «${m.name}» ورابط الختمة الدخول به من أي متصفح حتى تلغي الفتح. هل تريد المتابعة؟`
      : mode==="once"
        ? `سيتمكن أول متصفح يدخل باسم «${m.name}» من استخدامه، ثم يُقفل الاسم عليه. تأكد أن صاحبه سيدخل فوراً.`
        : `ستعود حماية اسم «${m.name}» للأجهزة التي كانت مسموحة قبل الفتح الدائم.`;
    if(!await appConfirm(message,{title:"فتح الاسم",ok:mode==="lock"?"ألغِ الفتح":"تأكيد"})) return;
    try{
      const r=await rpc("set_name_access",{p_code:code,p_org_code:orgCode(),p_id:id,p_device:deviceId(),p_mode:mode});
      if(!r?.ok) return toast(r?.error||"تعذّر التنفيذ");
      closeLayer(); await refresh(); toast(mode==="open"?"فُتح الاسم دائماً":mode==="once"?"فُتح الاسم لمرة واحدة":"أُلغي الفتح الدائم");
    }catch(e){toast("تعذّر الاتصال");}
  }
  document.getElementById("access-once").onclick=()=>setAccess("once");
  document.getElementById("access-open")?.addEventListener("click",()=>setAccess("open"));
  document.getElementById("access-lock")?.addEventListener("click",()=>setAccess("lock"));
}

function memberDialog(id){
  const m=memberOf(id); if(!m) return;
  const n=state.juz.filter(j=>j.ownerId===id).length;
  const d=state.juz.filter(j=>j.ownerId===id&&j.status==="done").length;

  modal(`<div class="mhead">
      <span class="avatar big">${esc(norm(m.name).charAt(0)||"؟")}</span>
      <div>
        <div class="display" style="font-size:1.35rem">${esc(m.name)}</div>
        <p class="hint" style="margin:0">
          ${n?`${ar(d)} من ${ar(n)} ${n===1?"جزء":"أجزاء"} أتمّها`:"لم يحجز جزءًا بعد"}
          · ${m.linked?"التذكير مفعّل":"بلا تذكير"}
          ${m.exempt?(state.accessType==="public"?"· اختار المتابعة بلا تذكير":"· يدخل بلا تذكير بإذن منك"):""}
        </p>
      </div></div>

    <div class="mlist">
      ${m.linked?`<button class="mact" id="m-msg"><b>أرسل له رسالة</b>
        <span>تصله في تلغرام من البوت</span></button>`:""}
      ${(state.accessType!=="public"&&!m.linked&&m.id!==state.organizerId)?`<button class="mact" id="m-exempt">
        <b>${m.exempt?"اسحب إذن الدخول":"ائذن له بالدخول بلا تلغرام"}</b>
        <span>${m.exempt
          ?"سيُطلب منه تفعيل تلغرام في المرة القادمة"
          :"لمن لا تلغرام على هاتفه، فيدخل ويحجز بنفسه"}</span></button>`:""}
      ${m.id!==state.organizerId?`<button class="mact" id="m-release"><b>${m.openPermanently?"إدارة فتح الاسم":"افتح الاسم"}</b>
        <span>${m.openPermanently?"الاسم مفتوح على جميع الأجهزة":"فتح لمرة واحدة أو فتح دائم"}</span></button>`:""}
      <button class="mact" id="m-merge"><b>ادمجه في اسم آخر</b>
        <span>تنتقل أجزاؤه وتذكيره، ويُحذف هذا الاسم</span></button>
      <button class="mact danger" id="m-remove"><b>احذفه</b>
        <span>تعود أجزاؤه متاحة، ويُفقد تذكيره</span></button>
    </div>
    <div class="actions" style="margin-top:1rem">
      <button class="btn quiet" id="m-close">إغلاق</button></div>`);

  document.getElementById("m-close").onclick=closeLayer;
  const msgBtn=document.getElementById("m-msg");
  if(msgBtn) msgBtn.onclick=()=>messageDialog(id,m.name);
  const rel=document.getElementById("m-release");
  if(rel) rel.onclick=()=>nameAccessDialog(id);
  const ex=document.getElementById("m-exempt");
  if(ex) ex.onclick=async()=>{
    const on=!m.exempt;
    if(on&&!await appConfirm(`سيدخل «${m.name}» ويحجز بلا تفعيل تلغرام، ولن يصله تذكير.`,{title:"الدخول بلا تذكير",ok:"ائذن له"})) return;
    try{
      const r=await rpc("set_exempt",{p_code:code,p_org_code:orgCode(),p_id:id,p_on:on,p_device:deviceId()});
      if(!r.ok) return toast(r.error||"تعذّر التنفيذ");
      closeLayer(); await refresh(); toast(on?"أُذِن له بالدخول":"سُحب الإذن");
    }catch(e){ toast("تعذّر الاتصال"); }
  };
  document.getElementById("m-merge").onclick=()=>mergeDialog(id);
  document.getElementById("m-remove").onclick=()=>removeDialog(id);
}

/* ═══════════ التذكير في الختمة العامة ═══════════
   سؤالان لا سوق: أتريد تذكيرًا؟ فمتى؟ ثم تلغرام. */
function askReminder(){
  closeLayer();
  modal(`<div class="display" style="font-size:1.4rem">هل تفضّل أن يصلك تذكير يومي؟</div>
    <p class="hint" style="margin:.7rem 0 1.2rem;line-height:2">
      يصلك في تلغرام كل يوم: جزؤك ووردك ورابط لقراءته.
      لك أن تشارك بلا تذكير، فتتابع من التطبيق متى شئت.</p>
    <div class="mlist">
      <button class="mact" id="rm-yes"><b>نعم، عندي تلغرام</b>
        <span>أختار ساعة التذكير ثم أربط حسابي</span></button>
      <button class="mact" id="rm-no"><b>لا، بلا تذكير</b>
        <span>أدخل الآن وأحجز جزئي، وأتابع من التطبيق</span></button>
    </div>`);
  document.getElementById("rm-yes").onclick=askReminderHour;
  document.getElementById("rm-no").onclick=async()=>{
    try{
      const r=await rpc("set_my_reminder",{p_code:code,p_id:viewer.id,
        p_device:deviceId(),p_wants:false,p_hour:null,p_minute:null});
      if(!r||!r.ok) return toast((r&&r.error)||"تعذّر التنفيذ");
      closeLayer(); await refresh(); toast("أهلًا بك");
    }catch(e){ toast("تعذّر الاتصال"); }
  };
}

function askReminderHour(){
  const me=viewer?memberOf(viewer.id):null;
  const h=me&&me.reminderHour!=null
    ? me.reminderHour
    : (state&&state.reminderHour!=null?state.reminderHour:20);
  modal(`<div class="display" style="font-size:1.4rem">متى يصلك التذكير؟</div>
    <p class="hint" style="margin:.7rem 0 1rem">اختر ساعة تناسب قراءتك. ولك تغييرها لاحقًا.</p>
    <div class="field-row"><label for="rm-hour">ساعة التذكير</label>
      <select id="rm-hour" class="field">${hourOptions(h)}</select></div>
    <div class="actions">
      <button class="btn gold" id="rm-go">تابِع إلى تلغرام</button>
      <button class="btn quiet spacer" id="rm-back">رجوع</button></div>`);
  document.getElementById("rm-back").onclick=askReminder;
  document.getElementById("rm-go").onclick=async()=>{
    const hh=+document.getElementById("rm-hour").value;
    try{
      const r=await rpc("set_my_reminder",{p_code:code,p_id:viewer.id,
        p_device:deviceId(),p_wants:true,p_hour:hh,p_minute:0});
      if(!r||!r.ok) return toast((r&&r.error)||"تعذّر التنفيذ");
    }catch(e){ return toast("تعذّر الاتصال"); }
    closeLayer(); startLinking();
  };
}

/* ═══════════ مغادرة الختمة ═══════════ */
function leaveDialog(){
  const mine=state.juz.filter(j=>j.ownerId===viewer.id);
  const done=mine.filter(j=>j.status==="done").length;
  const open=mine.length-done;
  modal(`<div class="display" style="font-size:1.4rem">مغادرة الختمة</div>
    <p class="hint" style="margin:.7rem 0 .9rem;line-height:2">
      ستخرج من «${esc(state.title)}» ويُرفع اسمك من المشاركين، ويتوقّف تذكيرك.</p>
    ${open?`<p class="warnbox">${arCount(open,"جزء لم تُتمّه سيعود متاحًا","جزءان لم تُتمّهما سيعودان متاحين","أجزاء لم تُتمّها ستعود متاحة","جزءًا لم تُتمّها ستعود متاحة")} لغيرك.</p>`:""}
    ${done?`<p class="hint" style="margin:0 0 .9rem">وما أتممتَه (${ar(done)} ${done===1?"جزء":"أجزاء"}) يبقى محسوبًا للختمة باسمك — القراءة لا تُلغى بالمغادرة.</p>`:""}
    <p class="hint" style="margin:0 0 1.1rem">ولك أن تعود متى شئت بالاسم نفسه.</p>
    <div class="actions">
      <button class="btn danger" id="lv-go">غادر الختمة</button>
      <button class="btn quiet spacer" id="lv-no">بقاء</button></div>`);
  document.getElementById("lv-no").onclick=closeLayer;
  document.getElementById("lv-go").onclick=async()=>{
    try{
      const r=await rpc("leave_khatmah",{p_code:code,p_id:viewer.id,p_device:deviceId()});
      if(!r||!r.ok) return toast((r&&r.error)||"تعذّر التنفيذ");
      mineForget(code);
      localStorage.removeItem(vKey()); localStorage.removeItem(cKey());
      activeKhatmahForget(code);
      toast(r.freed?`غادرتَ الختمة، وتحرّرت ${ar(r.freed)} ${r.freed===1?"جزء":"أجزاء"}`:"غادرتَ الختمة");
      goHome();
    }catch(e){ toast("تعذّر الاتصال"); }
  };
}

/* ═══════════ تسليم الإشراف ═══════════
   ينتقل الإشراف وحده. لا تُنقل أجزاء ولا روابط تلغرام. */
function transferDialog(){
  const others=(state.members||[]).filter(m=>m.id!==state.organizerId);
  if(!others.length) return toast("لا يوجد مشارك آخر لتسلّمه الإشراف");
  modal(`<div class="display" style="font-size:1.4rem">تسليم الإشراف</div>
    <p class="hint" style="margin:.7rem 0 1rem;line-height:2">
      اختر من يخلفك، وضع له رمزًا يدخل به. وتصير أنت مشاركًا عاديًّا،
      وتبقى أجزاؤك وتذكيرك كما هي.</p>
    <div class="field-row"><label for="tr-to">المشرف الجديد</label>
      <select id="tr-to" class="field">
        ${others.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join("")}
      </select></div>
    <div class="field-row"><label for="tr-code">رمز المشرف الجديد</label>
      <input id="tr-code" class="field" autocomplete="off" placeholder="أربعة محارف فأكثر">
      <p class="hint">أبلغه به بنفسك، فلا سبيل لاستعادته إن ضاع.</p></div>
    <div class="actions">
      <button class="btn gold" id="tr-go">سلّم الإشراف</button>
      <button class="btn quiet spacer" id="tr-no">إلغاء</button></div>`);
  document.getElementById("tr-no").onclick=settings;
  document.getElementById("tr-go").onclick=async()=>{
    const to=document.getElementById("tr-to").value;
    const nc=norm(document.getElementById("tr-code").value);
    const who=memberOf(to);
    if(nc.length<4) return toast("الرمز أربعة محارف فأكثر");
    if(!await appConfirm(`سيصير ${who?who.name:""} مشرف الختمة، وتفقد أنت صلاحيات الإشراف.`,{title:"تسليم الإشراف",ok:"سلّم الإشراف",danger:true})) return;
    try{
      const r=await rpc("transfer_organizer",{p_code:code,p_org_code:orgCode(),
        p_device:deviceId(),p_to:to,p_new_code:nc});
      if(!r||!r.ok) return toast((r&&r.error)||"تعذّر التسليم");
      localStorage.removeItem(cKey());
      closeLayer(); await refresh(); toast(`صار ${r.name} مشرف الختمة`);
    }catch(e){ toast("تعذّر الاتصال"); }
  };
}

/* ═══════════ تغيير رمز المشرف ═══════════ */
function orgCodeDialog(){
  modal(`<div class="display" style="font-size:1.4rem">تغيير رمز المشرف</div>
    <p class="hint" style="margin:.7rem 0 1rem">لمن تسرّب رمزه أو أراد تبديله. الرمز القديم يبطل فورًا.</p>
    <div class="field-row"><label for="oc-new">الرمز الجديد</label>
      <input id="oc-new" class="field" autocomplete="off" placeholder="أربعة محارف فأكثر"></div>
    <div class="actions">
      <button class="btn gold" id="oc-go">غيّر الرمز</button>
      <button class="btn quiet spacer" id="oc-no">إلغاء</button></div>`);
  document.getElementById("oc-no").onclick=settings;
  document.getElementById("oc-go").onclick=async()=>{
    const nc=norm(document.getElementById("oc-new").value);
    if(nc.length<4) return toast("الرمز أربعة محارف فأكثر");
    try{
      const r=await rpc("change_organizer_code",{p_code:code,p_org_code:orgCode(),
        p_device:deviceId(),p_new_code:nc});
      if(!r||!r.ok) return toast((r&&r.error)||"تعذّر التغيير");
      localStorage.setItem(cKey(),nc);
      closeLayer(); toast("تغيّر رمز المشرف، فاحفظه");
    }catch(e){ toast("تعذّر الاتصال"); }
  };
}

/* ===================== الرسائل ===================== */
function messageDialog(id,name){
  const all=!id;
  const n=(state.members||[]).filter(m=>m.linked).length;
  modal(`<div class="display" style="font-size:1.4rem">${all?"رسالة للمجموعة":"رسالة إلى "+esc(name)}</div>
    <p class="hint" style="margin:.6rem 0 .9rem">${all
      ?`تصل ${ar(n)} ${n===1?"مشاركًا فعّل":"مشاركين فعّلوا"} التذكير. ومن لم يفعّل لا يصله شيء.`
      :"تصله في تلغرام من البوت، تحت عنوان الختمة."}</p>
    <div class="field-row">
      <textarea id="msg-text" class="field msgbox" rows="6"
        placeholder="اكتب رسالتك…"></textarea></div>
    <div class="actions">
      <button class="btn gold" id="msg-go">أرسل</button>
      <button class="btn quiet" id="msg-no">إلغاء</button></div>`);

  const ta=document.getElementById("msg-text"); ta.focus();
  document.getElementById("msg-no").onclick=closeLayer;
  document.getElementById("msg-go").onclick=async()=>{
    const t=ta.value.trim();
    if(!t) return toast("اكتب الرسالة");
    if(all&&!await appConfirm(`ستُرسل هذه الرسالة إلى ${ar(n)} من المشاركين.`,{title:"رسالة للمجموعة",ok:"أرسل"})) return;
    toast("جارٍ الإرسال…");
    try{
      const body={code,orgCode:orgCode(),device:deviceId(),to:id||null,text:t};
      const r=await edge("send-message",body,
        {key:`message:${code}:${id||"all"}:${t}`});
      if(!r.ok) return toast(r.error||"تعذّر الإرسال");
      closeLayer();
      toast(r.sent?`وصلت ${ar(r.sent)} ${r.sent===1?"رسالة":"رسائل"}`:"لم تصل أي رسالة");
    }catch(e){ toast("تعذّر الاتصال"); }
  };
}

/* ===================== حذف مشارك ===================== */
function removeDialog(id){
  const m=memberOf(id); if(!m) return;
  const n=state.juz.filter(j=>j.ownerId===id).length;
  const d=state.juz.filter(j=>j.ownerId===id&&j.status==="done").length;

  const warn = n
    ? `<p class="warnbox">يحمل ${ar(n)} ${n===1?"جزءًا":"أجزاء"}${d?`، أتمّ منها ${ar(d)}`:""}.
       ستعود كلها متاحة للجميع.</p>` : "";
  const tg = m.linked
    ? `<p class="warnbox">تذكيره في تلغرام مفعّل، وسيُفقد. فإن عاد فعليه تفعيله من جديد.</p>` : "";

  modal(`<div class="display" style="font-size:1.4rem">حذف مشارك</div>
    <p class="hint" style="margin:.7rem 0 .9rem">سيُحذف «${esc(m.name)}» من قائمة المشاركين.</p>
    ${warn}${tg}
    <p class="hint" style="margin:.9rem 0 1.1rem">
      وإن كان يريد تغيير اسمه لا حذفه، فالأفضل أن يدخل بالاسم الجديد ثم تدمج القديم فيه،
      فتنتقل أجزاؤه وتذكيره معه.</p>
    <div class="actions">
      <button class="btn danger" id="rm-go">احذفه</button>
      <button class="btn quiet" id="rm-no">إلغاء</button></div>`);

  document.getElementById("rm-no").onclick=closeLayer;
  document.getElementById("rm-go").onclick=async()=>{
    try{
      const r=await rpc("remove_member",{p_code:code,p_org_code:orgCode(),p_id:id,p_device:deviceId()});
      if(!r.ok) return toast(r.error||"تعذّر الحذف");
      closeLayer(); await refresh();
      toast(r.freed?`حُذف ${r.name}، وتحرّرت ${ar(r.freed)} أجزاء`:`حُذف ${r.name}`);
    }catch(e){ toast("تعذّر الاتصال"); }
  };
}

/* ===================== الأفعال ===================== */
let actionBusy=false;
async function act(a,i){
  const num=i+1;
  const j=state.juz[i];
  const mine=j.ownerId===viewer.id;
  const o=j.ownerId?memberOf(j.ownerId):null;

  /* حين يتصرّف المنظّم في جزء غيره، يُسأل باسم صاحبه صراحةً */
  if(!mine&&o){
    if(a==="done"&&!await appConfirm(`هل أتمّ ${o.name} الجزء ${ar(num)} فعلًا؟\nسيتوقف تذكيره به، وتصله رسالة شكر.`,{title:"تأكيد القراءة",ok:"نعم، أتمّه"})) return;
    if(a==="undone"&&!await appConfirm(`سيعود الجزء ${ar(num)} إلى «لم يُتمّ» باسم ${o.name}، ويعود تذكيره به.`,{title:"إعادة حالة الجزء",ok:"أعده"})) return;
    if(a==="free"&&!await appConfirm(`سيُحرَّر الجزء ${ar(num)} من ${o.name} ويعود متاحًا للجميع.`,{title:"تحرير الجزء",ok:"حرّر الجزء",danger:true})) return;
  }

  if(actionBusy) return;
  actionBusy=true;
  let ownerId=j.ownerId;
  const unreadBefore=state.juz.filter(x=>x.status!=="done").length;
  try{
    try{
      let r;
      if(a==="take")        r=await rpc("claim_juz",{p_code:code,p_id:viewer.id,p_num:num,p_device:deviceId()});
      else if(a==="free")   r=await rpc("release_juz",{p_code:code,p_id:viewer.id,p_num:num,p_org_code:orgCode(),p_device:deviceId()});
      else if(a==="done")   r=await rpc("set_done",{p_code:code,p_id:viewer.id,p_num:num,p_done:true,p_org_code:orgCode(),p_device:deviceId()});
      else if(a==="undone") r=await rpc("set_done",{p_code:code,p_id:viewer.id,p_num:num,p_done:false,p_org_code:orgCode(),p_device:deviceId()});
      if(r&&!r.ok){ await refresh(); return toast(r.error||"تعذّر التنفيذ"); }
      if(r&&r.ownerId) ownerId=r.ownerId;
    }catch(e){ return toast("تعذّر الاتصال"); }

    closeLayer();
    const loaded=await refresh();

    if(a==="done"){
      /* تحفظ الرسالة محليًا إن انقطع الاتصال، ثم تُعاد محاولتها تلقائيًا. */
      enqueueEdge("notify-done",{code,id:ownerId,num},
        `notify:${code}:${state.roundNo||1}:${ownerId}:${num}:done`);
      const left=loaded&&state
        ?state.juz.filter(x=>x.status!=="done").length
        :Math.max(0,unreadBefore-1);
      if(left===0){
        /* اكتملت الثلاثون، فيُبلَّغ الجميع تلقائيًا. */
        enqueueEdge("announce",{kind:"done",code},
          `announce:${code}:${state.roundNo||1}:done`);
      }
      toast(left===0?"تمّت الختمة، تقبّل الله"
        :mine?`تقبّل الله. بقي ${ar(left)} جزءًا`:`سُجّل جزء ${o?o.name:""}`);
    }
  }finally{ actionBusy=false; }
}

function copyLink(){
  const url=linkFor(code);
  navigator.clipboard.writeText(url).then(()=>toast("نُسخ الرابط"))
    .catch(()=>appCopyFallback("نسخ رابط الدعوة",url));
}

function shareText(){
  const free=state.juz.map((j,i)=>j.status==="free"?i+1:null).filter(Boolean);
  const done=state.juz.filter(j=>j.status==="done").length;
  const msg=`${state.title}${state.dedication?"\nعلى نية: "+state.dedication:""}
تنتهي: ${fmtG(state.endDate)} — ${fmtH(state.endDate)}
تمّت قراءة ${done} من 30 جزءًا.
${free.length?"الأجزاء المتاحة: "+free.join("، "):"اكتملت الحجوزات، بارك الله فيكم."}
ادخل واحجز جزءك: ${linkFor(code)}`;
  navigator.clipboard.writeText(msg).then(()=>toast("نُسخت الرسالة، أرسلها للمجموعة"))
    .catch(()=>appCopyFallback("نسخ رسالة الدعوة",msg));
}

function logoutCurrent(){
  localStorage.removeItem(vKey()); localStorage.removeItem(cKey());
  activeKhatmahForget(code);
  clearInterval(lkTimer); lkTimer=null; linking=false;
  viewer=null;gateName="";closeTopMenu();closeLayer();screen="gate";render();
}
function reminderFromAccountMenu(){
  /* في الختمة العامة لكل مشارك ساعة تذكير خاصة به؛
     لذلك يبدأ التفعيل وإعادة التفعيل دائمًا باختيار الساعة. */
  if(state&&state.accessType==="public") askReminderHour();
  else linkTelegram();
}
function handleTopMenuClick(e){
  const mine=e.target.closest("[data-top-mine]");
  if(mine){closeTopMenu();zkReplaceHash(mine.dataset.topMine);boot();return;}
  const action=e.target.closest("[data-top-action]")?.dataset.topAction;
  if(!action) return;
  if(action==="mine"){showTopMenu("mine");return;}
  if(action==="account"){showTopMenu("account");return;}
  closeTopMenu();
  if(action==="history") historyDialog();
  else if(action==="reminder") reminderFromAccountMenu();
  else if(action==="logout") logoutCurrent();
  else if(action==="leave") leaveDialog();
}

/* ===================== الربط بالواجهة ===================== */
function bind(){
  const $=id=>document.getElementById(id);

  if($("lk-retry")) $("lk-retry").onclick=async()=>{
    /* طلب صريح من المستخدم، فيُرفع الحارس ويُولَّد رمز جديد */
    const ok=await openBot();
    if(!ok) toast("تعذّر فتح تلغرام، تأكّد أنه مثبَّت");
  };
  if($("zclock")) zTick();
  if($("deadline-trigger")) $("deadline-trigger").onclick=deadlineDialog;
  if($("btn-prayer")) $("btn-prayer").onclick=prayerDialog;
  if($("btn-leave")) $("btn-leave").onclick=leaveDialog;
  document.querySelectorAll("[data-mine]").forEach(b=>b.onclick=()=>{
    zkReplaceHash(b.dataset.mine); boot();
  });
  if($("btn-new")) $("btn-new").onclick=()=>{screen="create";render();};
  document.querySelectorAll("[data-khatmah-card]").forEach(button=>
    button.onclick=()=>joinKhatmahCard(button.dataset.khatmahCard));
  /* ثلاث شاشات فيها زرّ الرئيسية، فالربط بالسمة لا بمعرّف يتكرّر */
  document.querySelectorAll("[data-home]").forEach(b=>b.onclick=goHome);

  if($("btn-join")){
    const go=()=>{
      const c=norm($("f-join").value).toUpperCase();
      if(c.length!==4) return toast("الرمز أربعة محارف");
      zkReplaceHash(c); boot();
    };
    $("btn-join").onclick=go;
    $("f-join").onkeydown=e=>{if(e.key==="Enter")go();};
  }

  if($("f-end")){
    const u=()=>{$("p-fend").textContent=
      $("f-end").value?`${fmtG($("f-end").value)} · ${fmtH($("f-end").value)}`:"";};
    $("f-end").oninput=u; u();
  }

  if($("btn-create")) $("btn-create").onclick=async()=>{
    const org=norm($("f-org").value), end=$("f-end").value, oc=norm($("f-code2").value);
    const access=document.querySelector('input[name="f-access"]:checked')?.value||"private";
    if(!org) return toast("اكتب اسمك");
    if(!end) return toast("اختر تاريخ الانتهاء");
    if(!oc)  return toast("اختر رمزًا للمنظّم");
    try{
      const r=await rpc("create_khatmah",{
        p_title:norm($("f-title").value)||"زاد الخير", p_dedication:norm($("f-ded").value),
        p_end:end, p_hour:+$("f-hour").value, p_minute:0,
        p_org_id:keyOf(org), p_org_name:org, p_org_code:oc, p_device:deviceId(),
        p_access_type:access});
      if(!r.ok) return toast(r.error||"تعذّر الإنشاء");
      code=r.code;
      zkReplaceHash(code);
      viewer={id:keyOf(org),name:org};
      localStorage.setItem(vKey(),JSON.stringify(viewer));
      activeKhatmahSet(code,true);
      localStorage.setItem(cKey(),oc);
      /* لا يرى الرمز ولا الرابط حتى يربط تذكيره، فلا تُستعمل ختمة بلا مشرف مربوط */
      await refresh(true);
      justCreated=true;
      startLinking();
    }catch(e){ toast("تعذّر الاتصال"); }
  };

  if($("btn-copy"))  $("btn-copy").onclick=copyLink;
  if($("btn-enter")) $("btn-enter").onclick=()=>refresh();

  if($("btn-login")){
    const go=async()=>{
      const name=norm($("f-name").value);
      if(!name) return toast("اكتب اسمك أولًا");
      await refresh(true);
      if(!state) return;
      const id=keyOf(name);
      const exact=(state.members||[]).find(m=>m.id===id);
      if(!exact){
        const near=similarTo(name,state.members);
        if(near.length) return askSimilar(near,name);
      }
      if(id===state.organizerId){ gateName=name; render(); return; }
      await doSignIn(id,name,null);
    };
    $("btn-login").onclick=go;
    $("f-name").onkeydown=e=>{if(e.key==="Enter")go();};
    $("f-name").focus();
  }

  if($("btn-code")){
    const go=async()=>{
      const c=norm($("f-code").value);
      if(!c) return toast("أدخل الرمز");
      const before=gateName;
      await doSignIn(keyOf(before),before,c);
      if(gateName) toast("الرمز غير صحيح");
    };
    $("btn-code").onclick=go;
    $("f-code").onkeydown=e=>{if(e.key==="Enter")go();};
    $("f-code").focus();
    $("btn-back").onclick=()=>{gateName="";render();};
  }

  if($("btn-logout")) $("btn-logout").onclick=logoutCurrent;

  document.querySelectorAll(".cell,.wedge").forEach(el=>el.onclick=()=>openSheet(+el.dataset.i));
  document.querySelectorAll("[data-member]").forEach(b=>b.onclick=()=>memberDialog(b.dataset.member));


  if($("btn-link")) $("btn-link").onclick=reminderFromAccountMenu;
  if($("btn-link-big")) $("btn-link-big").onclick=()=>{
    if(state&&state.accessType==="public") askReminderHour();
    else linkTelegram();
  };
  if($("btn-mine")) $("btn-mine").onclick=e=>{e.stopPropagation();showTopMenu("mine",false);};
  if($("btn-history"))  $("btn-history").onclick=historyDialog;


  if($("btn-share")) $("btn-share").onclick=shareText;
  if($("btn-next")) $("btn-next").onclick=settings;
  if($("btn-extend")) $("btn-extend").onclick=()=>datePicker(
    "تمديد الموعد","تبقى الحجوزات كما هي، ويعود التذكير إلى العمل.","مدّد",
    async(d)=>{
      const r=await rpc("update_settings",{p_code:code,p_org_code:orgCode(),
        p_title:state.title,p_dedication:state.dedication||"",
        p_end:d,p_hour:state.reminderHour,p_minute:0,p_device:deviceId(),
        p_access_type:state.accessType||"private"});
      if(!r.ok) return toast("تعذّر التمديد");
      closeLayer(); await refresh(); toast("مُدّد الموعد");
    });
  if($("btn-broadcast")) $("btn-broadcast").onclick=()=>messageDialog(null,"");
  if($("btn-settings")) $("btn-settings").onclick=settings;
  if($("btn-reset")) $("btn-reset").onclick=cancelKhatmah;
}

function settings(){
  modal(`<div class="display" style="font-size:1.4rem">إعدادات الختمة</div>

    <div class="field-row" style="margin-top:1rem;margin-bottom:.7rem">
      <label for="s-title">اسم الختمة</label>
      <input id="s-title" class="field" value="${esc(state.title)}"></div>
    <div class="field-row" style="margin-bottom:.9rem">
      <label for="s-ded">على نية:</label>
      <input id="s-ded" class="field" value="${esc(state.dedication||"")}"></div>

    <fieldset class="access-picker">
      <legend>نوع الختمة</legend>
      <div class="access-options">
        <label class="access-option">
          <input type="radio" name="s-access" value="private"${state.accessType==="public"?"":" checked"}>
          <span class="access-option-body"><b>خاصة</b>
            <small>تتطلب رمز الختمة عند الدخول من بطاقتها.</small></span>
        </label>
        <label class="access-option">
          <input type="radio" name="s-access" value="public"${state.accessType==="public"?" checked":""}>
          <span class="access-option-body"><b>عامة</b>
            <small>مفتوحة للانضمام مباشرة من الصفحة الرئيسية.</small></span>
        </label>
      </div>
    </fieldset>

    <div class="dtgrid">
      <div class="dtcell"><label for="s-end">تنتهي في</label>
        <input id="s-end" class="field" type="date" value="${state.endDate}">
        <p class="dtprev" id="p-end"></p></div>
      <div class="dtcell"><label for="s-hour">التذكير عند</label>
        <select id="s-hour" class="field">${hourOptions(state.reminderHour)}</select>
        <p class="dtprev">كل يوم</p></div>
    </div>

    <div class="pairbtn" style="margin-top:.3rem">
      <button class="btn sm" id="s-transfer">سلّم الإشراف</button>
      <button class="btn sm" id="s-orgcode">غيّر رمز المشرف</button></div>
    <div class="pairbtn" style="margin-top:.5rem">
      <button class="btn sm" id="s-next">ابدأ ختمة جديدة</button>
      <button class="btn danger sm" id="s-del">إلغاء الختمة</button></div>

    <div class="rule" style="margin:1.1rem 0 .8rem"><i>◆</i></div>
    <div class="pairbtn">
      <button class="btn gold sm" id="s-save">حفظ</button>
      <button class="btn quiet sm" id="s-close2">إغلاق</button></div>`);

  const eEnd=document.getElementById("s-end");
  const upd=()=>{document.getElementById("p-end").textContent=
    eEnd.value?`${fmtG(eEnd.value)} · ${fmtH(eEnd.value)}`:"";};
  eEnd.oninput=upd; upd();

  document.getElementById("s-close2").onclick=closeLayer;

  document.getElementById("s-save").onclick=async()=>{
    if(!eEnd.value) return toast("اختر تاريخ الانتهاء");
    try{
      const r=await rpc("update_settings",{p_code:code,p_org_code:orgCode(),
        p_title:norm(document.getElementById("s-title").value),
        p_dedication:norm(document.getElementById("s-ded").value),
        p_end:eEnd.value,p_hour:+document.getElementById("s-hour").value,p_minute:0,
        p_device:deviceId(),
        p_access_type:document.querySelector('input[name="s-access"]:checked')?.value||"private"});
      if(!r.ok) return toast("تعذّر الحفظ");
      closeLayer(); await refresh(); toast("حُفظت الإعدادات");
    }catch(e){ toast("تعذّر الاتصال"); }
  };

  document.getElementById("s-next").onclick=()=>datePicker(
    "ختمة جديدة","تُفرَّغ الأجزاء الثلاثون، ويبقى المشاركون وتذكيراتهم. ويصلهم إشعار بالبداية.","ابدأ",
    async(d)=>{
      const requestId=`${code}:${state.roundNo||1}:${d}`;
      const body={kind:"round",code,orgCode:orgCode(),device:deviceId(),end:d,requestId};
      const r=await edge("announce",body,{key:`round:${requestId}`});
      if(!r.ok) return toast(r.error||"تعذّر البدء");
      if(r.failed) enqueueEdge("announce",body,`round-notify:${requestId}`);
      closeLayer(); await refresh();
      toast(r.sent?`بدأت ختمة جديدة، وأُبلغ ${ar(r.sent)}`:"بدأت ختمة جديدة");
    });

  document.getElementById("s-transfer").onclick=transferDialog;
  document.getElementById("s-orgcode").onclick=orgCodeDialog;
  document.getElementById("s-del").onclick=cancelKhatmah;
}

/* نافذة اختيار تاريخ، تُستعمل للختمة الجديدة وللتمديد */
function datePicker(title,note,okLabel,onOk){
  modal(`<div class="display" style="font-size:1.4rem">${title}</div>
    <p class="hint" style="margin:.6rem 0 1.1rem">${note}</p>
    <div class="dtcell" style="margin-bottom:1.1rem"><label for="d-end">التاريخ</label>
      <input id="d-end" class="field" type="date" value="${plusDays(7)}" min="${todayISO()}">
      <p class="dtprev" id="p-dend"></p></div>
    <div class="actions">
      <button class="btn gold" id="d-go">${okLabel}</button>
      <button class="btn quiet" id="d-no">إلغاء</button></div>`);
  const e=document.getElementById("d-end");
  const u=()=>{document.getElementById("p-dend").textContent=
    e.value?`${fmtG(e.value)} · ${fmtH(e.value)}`:"";};
  e.oninput=u; u();
  document.getElementById("d-no").onclick=closeLayer;
  document.getElementById("d-go").onclick=async()=>{
    if(!e.value) return toast("اختر التاريخ");
    try{ await onOk(e.value); }catch(err){ toast("تعذّر الاتصال"); }
  };
}

async function cancelKhatmah(){
  if(!await appConfirm(`سيُحذف كل شيء نهائيًا: المشاركون وتذكيراتهم ورمز الختمة، ويتعطّل الرابط الذي شاركته، وتصل المجموعة رسالة بالإلغاء.

لبدء ختمة جديدة بنفس المجموعة استعمل «ابدأ ختمة جديدة» بدلًا من هذا.`,{title:"إلغاء الختمة",ok:"نعم، ألغِ الختمة",danger:true})) return;
  try{
    const body={code,orgCode:orgCode(),device:deviceId()};
    const r=await edge("cancel-khatmah",body,{key:`cancel:${code}`});
    if(!r.ok) return toast(r.error||"الرمز غير صحيح");
    mineForget(code);
    localStorage.removeItem(vKey()); localStorage.removeItem(cKey());
    activeKhatmahForget(code);
    zkReplaceHash(""); code=""; state=null; viewer=null; screen="home"; closeLayer(); render();
    loadPublicKhatmahs(true);
    toast("أُلغيت الختمة");
  }catch(e){ toast("تعذّر الاتصال"); }
}

/* ===================== الإقلاع ===================== */
async function boot(){
  flushOutbox();
  minePruneMissing();
  code=hashCode();
  closeLayer();
  clearInterval(lkTimer); lkTimer=null; linking=false;

  if(!code){
    /* زر «الختمات الجماعية» يفتح سياق الجلسة أولًا، ثم آخر ختمة محفوظة
       على الجهاز. إن لم توجد ختمة نشطة أصلًا نعرض صفحة الختمات المعتادة. */
    const active=activeKhatmahGet();
    if(active){zkReplaceHash(active);code=active;}
    else{state=null;viewer=null;screen="home";render();loadPublicKhatmahs();return;}
  }

  activeKhatmahSet(code,false);
  loadViewer();
  if(viewer) activeKhatmahSet(code,true);
  screen="boot"; render();
  await refresh();
}
document.getElementById("btn-help").onclick=helpDialog;
const tbHome=document.getElementById("tb-home");
if(tbHome) tbHome.onclick=goHome;
const tbReader=document.getElementById("tb-reader");
if(tbReader) tbReader.onclick=()=>{ location.href=readerLink(null,code); };
const tbUser=document.getElementById("tb-user");
if(tbUser) tbUser.onclick=e=>{e.stopPropagation();toggleTopMenu();};
const tbPopover=document.getElementById("tb-popover");
if(tbPopover) tbPopover.onclick=e=>{e.stopPropagation();handleTopMenuClick(e);};
document.addEventListener("click",e=>{
  if(!e.target.closest("#tb-user,#tb-popover")) closeTopMenu();
});
document.addEventListener("keydown",e=>{if(e.key==="Escape") closeTopMenu();});
/* يمنع الضغطة المزدوجة العرضية مع إبقاء أثر اللمس المرئي كما هو. */
document.addEventListener("click",e=>{
  const target=e.target.closest("button,a,[role='button']");
  if(!target||target.disabled) return;
  const now=Date.now(),lockedUntil=Number(target.dataset.tapLock||0);
  if(now<lockedUntil){ e.preventDefault(); e.stopImmediatePropagation(); return; }
  target.dataset.tapLock=String(now+700);
},true);
const zkLaunch=document.getElementById("zk-launch");
const zkOfflineStatus=document.getElementById("zk-offline-status");

/* v111 · critical home assets gate.
   The launcher canvas is revealed only after its actual Arabic display font
   and local mark are ready, so the browser never paints fallback typography
   and then reflows it a fraction of a second later. */
let zkHomeReady=false;
function zkRevealHome(){
  if(zkHomeReady)return;
  zkHomeReady=true;
  zkLaunch?.classList.add("zk-home-ready");
}
async function zkPrepareHome(){
  const jobs=[];
  try{
    if(document.fonts?.load){
      jobs.push(document.fonts.load('700 67px "Aref Ruqaa"',"زاد الخير اقرأ وارتق القرآن العظيم الختمات الجماعية مواقيت الصلاة"));
    }
  }catch(_){ }
  try{
    const mark=zkLaunch?.querySelector(".zk-launch-mark");
    if(mark?.decode) jobs.push(mark.decode());
  }catch(_){ }
  try{ await Promise.allSettled(jobs); }catch(_){ }
  zkRevealHome();
}
/* Safety only: never leave navigation inaccessible because of a broken
   browser font API. Normal cached/PWA launches resolve far earlier. */
const zkHomeReadyFallback=setTimeout(zkRevealHome,1800);
zkPrepareHome().finally(()=>clearTimeout(zkHomeReadyFallback));

const ZK_HOME_BASE_W=500,ZK_HOME_BASE_H=780,ZK_HOME_GUTTER=24;
function zkFitLaunch(){
  if(!zkLaunch)return;
  const vv=window.visualViewport;
  const w=vv?.width||window.innerWidth||ZK_HOME_BASE_W;
  const h=vv?.height||window.innerHeight||ZK_HOME_BASE_H;
  const x=(vv?.offsetLeft||0)+(w/2);
  const y=(vv?.offsetTop||0)+(h/2);
  const scale=Math.max(.1,Math.min(1,(w-ZK_HOME_GUTTER)/ZK_HOME_BASE_W,(h-ZK_HOME_GUTTER)/ZK_HOME_BASE_H));
  zkLaunch.style.setProperty("--zk-home-scale",String(scale));
  zkLaunch.style.setProperty("--zk-home-cx",x+"px");
  zkLaunch.style.setProperty("--zk-home-cy",y+"px");
}

function zkCaptureIncomingKhatmah(){
  const incoming=hashCode();
  if(!incoming)return "";
  /* الرابط يحدد سياق هذه الجلسة حتى لو كان المستخدم جديدًا في الختمة.
     لا نجعله دائمًا إلا إن كان هذا الجهاز مسجّلًا فيها بالفعل. */
  const known=!!localStorage.getItem("zad:viewer:"+incoming);
  activeKhatmahSet(incoming,known);
  zkReplaceHash("");
  return incoming;
}
function zkShowLaunch(){
  if(!zkLaunch)return;
  closeTopMenu();closeLayer();
  zkFitLaunch();
  document.documentElement.classList.add("zk-launch-open");
  document.body.classList.add("zk-launch-open");
  zkLaunch.classList.add("show");
  zkLaunch.setAttribute("aria-hidden","false");
}
function zkHideLaunch(){
  if(!zkLaunch)return;
  zkLaunch.classList.remove("show");
  zkLaunch.setAttribute("aria-hidden","true");
  document.documentElement.classList.remove("zk-launch-open");
  document.body.classList.remove("zk-launch-open");
}
const zkRootGuardToken=`${Date.now()}-${Math.random().toString(36).slice(2)}`;
let zkExitPressedAt=0,zkExitRearmTimer=null;
function zkArmRootGuard(){
  clearTimeout(zkExitRearmTimer);
  try{
    if(history.state?.zkRootGuard===zkRootGuardToken)return;
    history.pushState({...history.state,zkRootGuard:zkRootGuardToken},"",location.href);
  }catch(_){ }
}
function zkLaunchVisible(){return !!zkLaunch?.classList.contains("show")}
function zkConfirmNativeExit(){
  zkExitPressedAt=Date.now();
  toast("اضغط الرجوع مرة أخرى للخروج");
  clearTimeout(zkExitRearmTimer);
  /* Keep the guard removed briefly. A second physical Back now belongs to
     Android/Chrome. If the user stays, restore the guard automatically. */
  zkExitRearmTimer=setTimeout(()=>{zkExitPressedAt=0;zkArmRootGuard()},2200);
}
function zkRootBack(){
  if(document.getElementById("layer")?.innerHTML){closeLayer();zkArmRootGuard();return}
  const topMenu=document.getElementById("tb-popover");
  if(topMenu&&!topMenu.hidden){closeTopMenu();zkArmRootGuard();return}
  if(!zkLaunchVisible()){
    zkShowLaunch();zkArmRootGuard();return;
  }
  zkConfirmNativeExit();
}
window.addEventListener("popstate",()=>zkRootBack());
document.getElementById("zk-launch-quran")?.addEventListener("click",event=>{
  event.preventDefault();
  location.href="reader.html?home=1&from=zad";
});
document.getElementById("zk-launch-zad")?.addEventListener("click",event=>{event.preventDefault();zkHideLaunch();boot()});
document.getElementById("zk-launch-prayer")?.addEventListener("click",()=>{document.body.classList.add("zk-launch-prayer");prayerDialog()});
window.addEventListener("hashchange",()=>{
  const incoming=hashCode();
  if(incoming){
    const known=!!localStorage.getItem("zad:viewer:"+incoming);
    activeKhatmahSet(incoming,known);zkReplaceHash("");zkHideLaunch();boot();return;
  }
  if(!zkLaunchVisible())boot();
});
window.addEventListener("resize",queueTopUserSync,{passive:true});
window.addEventListener("resize",zkFitLaunch,{passive:true});
window.visualViewport?.addEventListener("resize",zkFitLaunch,{passive:true});
window.visualViewport?.addEventListener("scroll",zkFitLaunch,{passive:true});
window.addEventListener("online",outboxWake);
const zkIncomingKhatmah=zkCaptureIncomingKhatmah();
if(zkIncomingKhatmah||new URLSearchParams(location.search).get("section")==="khatmahs"){zkHideLaunch();boot()}
else zkShowLaunch();
zkArmRootGuard()

/* PWA shell + offline Quran/Tafsir library. The index checks status only;
   entering reader.html is the opt-in that starts a missing full download. */
const ZK_OFFLINE_LIBRARY_KEY="zad:offline-library-v1";
function zkRememberOfflineLibrary(ready){
  try{
    if(ready)localStorage.setItem(ZK_OFFLINE_LIBRARY_KEY,"1");
    else localStorage.removeItem(ZK_OFFLINE_LIBRARY_KEY);
    localStorage.removeItem("zad:quran-offline-v1");
  }catch(_){ }
}
function zkPaintOfflineStatus(ready){
  if(!zkOfflineStatus)return;
  zkOfflineStatus.classList.toggle("ready",!!ready);
  const label=zkOfflineStatus.querySelector("span:last-child");
  if(label)label.textContent="";
}
if("serviceWorker" in navigator){
  navigator.serviceWorker.addEventListener("message",event=>{
    const data=event.data||{};
    if(data.type==="OFFLINE_LIBRARY_READY"){
      zkRememberOfflineLibrary(true);zkPaintOfflineStatus(true);
    }else if(data.type==="OFFLINE_LIBRARY_INCOMPLETE"){
      zkRememberOfflineLibrary(false);zkPaintOfflineStatus(false);
    }
  });
  const zkPrepareServiceWorker=()=>navigator.serviceWorker.register("sw.js",{updateViaCache:"none"})
    .then(reg=>Promise.allSettled([reg.update(),navigator.serviceWorker.ready]))
    .then(()=>navigator.serviceWorker.ready)
    .then(reg=>{
      const worker=reg.active||reg.waiting||reg.installing;
      worker?.postMessage({type:"CHECK_OFFLINE_LIBRARY"});
      if(navigator.onLine)worker?.postMessage({type:"ENSURE_OFFLINE_SHELL"});
      return reg;
    }).catch(()=>null);
  zkPrepareServiceWorker();
  window.addEventListener("online",zkPrepareServiceWorker);
  navigator.serviceWorker.addEventListener("controllerchange",()=>navigator.serviceWorker.ready.then(reg=>(reg.active||reg.waiting||reg.installing)?.postMessage({type:"CHECK_OFFLINE_LIBRARY"})).catch(()=>{}));
}
let ptTimer=setInterval(ptTick,30000);
let outboxTimer=setInterval(flushOutbox,30000);
zLoop();
let syncBusy=false;
async function syncState(){
  if(syncBusy) return;
  if(screen!=="main") return;
  if(selected!==null || document.getElementById("layer").innerHTML) return;
  syncBusy=true;
  const before=JSON.stringify(state);
  try{
    const loaded=await refresh(true);
    if(loaded&&JSON.stringify(state)!==before) render();
  }finally{ syncBusy=false; }
}
let syncTimer=setInterval(syncState,15000);
