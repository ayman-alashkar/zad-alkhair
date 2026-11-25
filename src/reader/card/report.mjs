/* الإبلاغ عن خطأ في نص البطاقة.
   كل فقرة قابلة للإبلاغ تحمل data-report="<وصف المكان>". في وضع الإبلاغ تظهر بجانبها علامة،
   والضغط عليها يرسل البلاغ عبر reportTarget.send (يضبطه التطبيق: دالة Supabase).
   قبل ضبطه يُحفظ البلاغ في المتصفح فقط (zad:card-reports) ولا يضيع. */
import { icon } from "./card.mjs";

export const reportTarget = {
  async send(report) {
    try {
      const k = "zad:card-reports", list = JSON.parse(localStorage.getItem(k) || "[]");
      list.push(report);
      localStorage.setItem(k, JSON.stringify(list.slice(-50)));
      return true;
    } catch { return false; }
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
