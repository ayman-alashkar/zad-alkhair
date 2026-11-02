const RECITERS=[
  {
    id:"Ayman_Sowaid_64kbps",name:"فضيلة الشيخ أيمن سويد",
    provider:"ayah",everyAyahId:"Ayman_Sowaid_64kbps",
    ayahBasmalaPrelude:true
  },
  {
    id:"AbdulRashidSufi_Hafs",name:"فضيلة الشيخ عبد الرشيد الصوفي",
    provider:"mp3quran-timed",
    timedNames:["عبدالرشيد صوفي","عبد الرشيد صوفي","عبدالرشيد الصوفي","عبد الرشيد الصوفي"],
    timedPrefer:["حفص","عاصم"],timedRequireAny:["حفص","عاصم"],
    timedReject:["السوسي","الدوري","شعبة","خلف","ورش","قالون"]
  },
  {
    id:"Hudhaify_128kbps",name:"فضيلة الشيخ علي بن عبد الرحمن الحذيفي",
    provider:"ayah",everyAyahId:"Hudhaify_128kbps",ayahBasmalaPrelude:true
  },
  {
    id:"AliJaber_Hafs",name:"فضيلة الشيخ علي جابر",
    provider:"mp3quran-timed",timedNames:["علي جابر"],
    timedPrefer:["حفص","عاصم"],timedRequireAny:["حفص","عاصم"]
  },
  {
    id:"MaherAlMuaiqly128kbps",name:"فضيلة الشيخ ماهر المعيقلي",
    provider:"qul-maher"
  },
  {
    id:"MahmoudAlHamoud_Surah",name:"فضيلة الشيخ محمود الحمود — السور كاملة",
    provider:"surah",audioBase:"https://media.way2quran.com/mahmoud-fayyad-al-hamoud/hafs-an-asim/"
  },
  {
    id:"Minshawy_Mujawwad_192kbps",name:"فضيلة الشيخ محمد صديق المنشاوي — مجود",
    provider:"ayah",everyAyahId:"Minshawy_Mujawwad_192kbps",
    ayahBasmalaPrelude:true
  },
  {
    id:"Minshawy_Murattal_128kbps",name:"فضيلة الشيخ محمد صديق المنشاوي — مرتل",
    provider:"mp3quran-timed",
    timedNames:["محمد صديق المنشاوي","المنشاوي"],
    timedPrefer:["حفص","عاصم"],timedReject:["مجود","معلم"]
  },
  {
    id:"Husary_128kbps",name:"فضيلة الشيخ محمود خليل الحصري",
    provider:"mp3quran-timed",
    fatihaEveryAyahId:"Husary_128kbps",
    timedNames:["محمود خليل الحصري","محمود خليل الحصری","الحصري"],
    timedPrefer:["حفص","عاصم"],timedReject:["مجود","معلم","ورش"]
  },
  {
    id:"MisharyAlafasy_Hafs",name:"فضيلة الشيخ مشاري راشد العفاسي",
    provider:"mp3quran-timed",timedNames:["مشاري العفاسي","مشاري راشد العفاسي"],
    timedPrefer:["حفص","عاصم"],timedRequireAny:["حفص","عاصم"],
    timedReject:["ورش","قالون","شعبة"]
  }
];
const DEFAULT_RECITER_ID="Husary_128kbps";
const SURAH_ONLY_HINT="هذا القارئ متاح للاستماع إلى السور كاملة، دون متابعة أو تحديد الآيات.";
function isSurahOnly(r=reciter){return r.provider==="surah"}
function wholeSurahAudioUrl(s,r=reciter){
  if(!isSurahOnly(r)||!r.audioBase)throw new Error("whole-surah provider unavailable");
  return r.audioBase+pad3(Math.max(1,Math.min(114,Number(s)||1)))+".mp3";
}
function normalizeWholeSurahPlayback(){
  play.current=play.from=play.to=1;
  play.repeatAyah=play.repeatAyahLeft=play.repeatGroup=play.repeatGroupLeft=play.repeatSurah=play.repeatSurahLeft=1;
  continuousStopRef=null;clearSurahBasmalaPrelude();
}
function defaultReciter(){
  return RECITERS.find(r=>r.id===DEFAULT_RECITER_ID)||RECITERS[0];
}
function validateReciterConfig(){
  const allowed=new Set(["ayah","mp3quran-timed","qul-maher","surah"]);
  if(RECITERS.length!==10)throw new Error("reciter config count");
  const ids=new Set(),names=new Set();
  for(const r of RECITERS){
    if(!r?.id||!r?.name||!allowed.has(r.provider))throw new Error("reciter config shape");
    if(ids.has(r.id)||names.has(r.name))throw new Error("duplicate reciter config");
    ids.add(r.id);names.add(r.name);
    if(isSurahOnly(r)&&!/^https:\/\//.test(r.audioBase||""))throw new Error("whole-surah reciter source");
    if(r.provider==="ayah"&&!r.everyAyahId)throw new Error("ayah reciter source");
    if(r.fatihaEveryAyahId&&r.id!=="Husary_128kbps")throw new Error("unexpected Fatiha ayah override");
    if(r.provider==="mp3quran-timed"&&(!Array.isArray(r.timedNames)||!r.timedNames.length))throw new Error("timed reciter matcher");
  }
  if(!ids.has(DEFAULT_RECITER_ID))throw new Error("default reciter missing");
}
