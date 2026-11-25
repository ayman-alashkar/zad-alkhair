/* الإبلاغ عن خطأ في نص البطاقة.
   كل فقرة قابلة للإبلاغ تحمل data-report="<وصف المكان>". في وضع الإبلاغ تظهر بجانبها علامة،
   والضغط عليها يفتح حقل ملاحظة ثم يرسل البلاغ:
   submit_content_report في القاعدة (تحدّ عدد البلاغات من الجهاز)، ثم report-notify
   التي ترسله إلى المشرف في تيليغرام. إن فشل الإرسال يُحفظ في المتصفح ويُعاد لاحقًا. */
import { icon } from "./card.mjs";
import { SUPABASE_URL, SUPABASE_KEY } from "../../home/config.mjs";
import { zuDeviceId } from "../../shared/usage.mjs";

const PENDING = "zad:card-reports";
const headers = { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY };

async function post(report) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_content_report`, {
    method: "POST", headers,
    body: JSON.stringify({
      p_device: zuDeviceId() || "unknown-device", p_section: report.section, p_location: report.where,
      p_page: report.page, p_word: report.gi, p_surah: report.surah, p_ayah: report.ayah,
      p_riwaya: report.riwaya, p_excerpt: report.text, p_note: report.note,
    }),
  });
  if (!r.ok) throw new Error(String(r.status));
  const id = await r.json();
  if (!id) return false;   // رُفض (تجاوز الحد أو مدخلات غير صالحة): لا يُعاد
  fetch(`${SUPABASE_URL}/functions/v1/report-notify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => {});
  return true;
}
const loadPending = () => { try { return JSON.parse(localStorage.getItem(PENDING) || "[]"); } catch { return []; } };
const savePending = list => { try { localStorage.setItem(PENDING, JSON.stringify(list.slice(-50))); } catch {} };

export const reportTarget = {
  async send(report) {
    try { return await post(report); }
    catch { savePending(loadPending().concat(report)); return true; }   // بلا اتصال: يُرسل لاحقًا
  },
  /** إعادة ما لم يُرسل (يستدعيها القارئ عند عودة الاتصال). */
  async flush() {
    const list = loadPending(), left = [];
    for (const r of list) { try { await post(r); } catch { left.push(r); } }
    savePending(left);
  },
};

export function reportButton(ctx, section, target) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "zc-rep";
  b.setAttribute("aria-label", "الإبلاغ عن خطأ في هذا النص");
  b.innerHTML = icon("warn", 16);
  b.onclick = e => {
    e.stopPropagation();
    if (target.querySelector(".zc-repform")) return;
    const form = document.createElement("form");
    form.className = "zc-repform";
    form.innerHTML = '<label>ما الخطأ؟ (اختياري)<textarea maxlength="500" rows="2"></textarea></label><button type="submit">إرسال البلاغ</button>';
    form.onsubmit = async ev => {
      ev.preventDefault();
      const ok = await reportTarget.send({
        at: new Date().toISOString(),
        section: section.id,
        where: target.dataset.report,
        page: ctx.page, gi: ctx.gi, surah: ctx.surah, ayah: ctx.ayah, riwaya: ctx.riwaya,
        text: target.textContent.slice(0, 500),
        note: form.querySelector("textarea").value.trim().slice(0, 500),
      });
      form.replaceWith(Object.assign(document.createElement("div"), { className: "zc-repdone", textContent: ok ? "شكرًا، وصل البلاغ" : "تعذّر الإرسال الآن" }));
      if (ok) { b.classList.add("sent"); b.disabled = true; }
    };
    target.appendChild(form);
    form.querySelector("textarea").focus();
  };
  return b;
}
