/* الضغطات على كلمات الصفحة: تعلن ما حدث ولا تقرّر ما يُفعل به.
   onGesture(نوع، دالة) يسجّل من يستجيب. الأنواع:
     tap        ضغطة قصيرة
     doubleTap  ضغطتان سريعتان على الآية نفسها (لا تُعلن إلا إن سُجّل لها مستجيب؛
                وإلا فالثانية ضغطة قصيرة كما كانت)
     longPress  ضغطة مطوّلة
   تصل كل دالة بـ {ayah, gi, anchor, word, point, event}. ayah «سورة:آية»، وgi رقم
   الكلمة الثابت أو null، وanchor عنصر الآية للتظليل وتموضع الأدوات (ayah-marks.mjs). */
import { ayahAt } from "./ayah-marks.mjs";

const LONG_PRESS_MS=520;
const DOUBLE_TAP_MS=350;
const MOVE_TOLERANCE=10;

const listeners={tap:[],doubleTap:[],longPress:[]};
export function onGesture(type,fn){
  if(!listeners[type])throw new Error("unknown gesture "+type);
  listeners[type].push(fn);
}
function emit(type,detail){ for(const fn of listeners[type])fn(detail); }

/* يربط الضغطات بعنصر يحوي الصفحات (المسار)، مرة واحدة. */
export function bindGestures(root){
  let start=null,moved=false,longTriggered=false,longTimer=null,lastTap=null;
  const hit=(e,point)=>{const at=ayahAt(e.target);return at&&{...at,point,event:e}};
  root.addEventListener("pointerdown",e=>{
    const at=hit(e,{x:e.clientX,y:e.clientY});
    clearTimeout(longTimer);moved=false;longTriggered=false;start=at&&at.point;
    if(!at)return;
    longTimer=setTimeout(()=>{
      if(moved)return;
      longTriggered=true;emit("longPress",at);
    },LONG_PRESS_MS);
  });
  root.addEventListener("pointermove",e=>{
    if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>MOVE_TOLERANCE){moved=true;clearTimeout(longTimer)}
  });
  root.addEventListener("pointerup",()=>clearTimeout(longTimer));
  root.addEventListener("pointercancel",()=>clearTimeout(longTimer));
  root.addEventListener("click",e=>{
    // هدف الضغطة ثابت قبل ظهور الأدوات، فلا تصير الضغطة التي تحدد الآية ضغطًا على أداة جديدة.
    if(moved||longTriggered)return;
    const at=hit(e,{x:e.clientX,y:e.clientY});
    if(!at)return;
    const now=Date.now();
    if(listeners.doubleTap.length&&lastTap&&lastTap.ayah===at.ayah&&now-lastTap.at<DOUBLE_TAP_MS){
      lastTap=null;emit("doubleTap",at);return;
    }
    lastTap={ayah:at.ayah,at:now};
    emit("tap",at);
  });
}
