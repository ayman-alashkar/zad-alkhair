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
