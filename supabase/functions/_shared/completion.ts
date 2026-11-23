/* رسالة اكتمال الختمة: تُرسلها announce (من الواجهة) وsend-completions (من الطابور). */
import { ar, esc } from "./text.ts";

export type DoneInfo = {
  readers?: number;
  days?: number;
  dedication?: string;
};

export function doneText(result: DoneInfo) {
  const readers = Number(result.readers ?? 0);
  const who = readers === 1 ? "ختم واحد منّا"
    : readers === 2 ? "ختم اثنان منّا"
    : `ختم ${ar(readers)} منّا`;
  const countDays = Number(result.days ?? 1);
  const days = countDays === 1 ? "في يوم واحد"
    : countDays === 2 ? "في يومين"
    : `في ${ar(countDays)} أيام`;
  const dedication = result.dedication
    ? `، على نية: ${esc(result.dedication)}`
    : "";

  return `🕌 <b>زاد الخير</b>\n\n<b>تمّت الختمة والحمد لله، تقبّل الله منّا ومنكم</b>\n\n${who} كلام الباري عزّ وجلّ ${days}${dedication}.\n\nقال ﷺ:\n«يُقَالُ لِصَاحِبِ الْقُرْآنِ: اقْرَأْ وَارْتَقِ وَرَتِّلْ كَمَا كُنْتَ تُرَتِّلُ فِي الدُّنْيَا، فَإِنَّ مَنْزِلَتَكَ عِنْدَ آخِرِ آيَةٍ تَقْرَؤُهَا»\n— رواه أبو داود والترمذي وقال: حسن صحيح\n\nوقال عليه الصلاة والسلام:\n«الْمَاهِرُ بِالْقُرْآنِ مَعَ السَّفَرَةِ الْكِرَامِ الْبَرَرَةِ، وَالَّذِي يَقْرَأُ الْقُرْآنَ وَيَتَعْتَعُ فِيهِ وَهُوَ عَلَيْهِ شَاقٌّ لَهُ أَجْرَانِ»\n— متفق عليه\n\nاللهم ارحمنا بالقرآن، واجعله لنا إمامًا ونورًا وهدًى ورحمة.\n\nنلقاكم في الختمة القادمة بإذن الله، ولا تنسونا من صالح دعائكم.`;
}
