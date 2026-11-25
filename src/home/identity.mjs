/* من يستعمل التطبيق في هذا المتصفح: معرّف الجهاز، والمشاهد المحفوظ لكل ختمة،
   ورمز المنظّم المحفوظ. كلها في localStorage، مفتاحها رمز الختمة المفتوحة. */
import { appState } from "./app-state.mjs";

/* معرّف عشوائي ثابت لهذا المتصفح، به يُقفل الاسم على صاحبه */
export function deviceId(){
  let d=localStorage.getItem("zad:device");
  if(!d){
    d=(crypto.randomUUID?crypto.randomUUID():
       Date.now().toString(36)+Math.random().toString(36).slice(2,12));
    localStorage.setItem("zad:device",d);
  }
  return d;
}

/* مفتاح المشاهد المحفوظ للختمة المفتوحة */
export const vKey=()=>"zad:viewer:"+appState.code;

/* رمز المنظّم المحفوظ للختمة المفتوحة، أو null */
export const cKey=()=>"zad:orgcode:"+appState.code;
export const orgCode=()=>localStorage.getItem(cKey())||null;

export const isOrganizer=()=>!!(appState.viewer&&appState.state&&appState.state.organizerId===appState.viewer.id);
export const memberOf=id=>((appState.state&&appState.state.members)||[]).find(m=>m.id===id);
