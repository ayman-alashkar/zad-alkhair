/* ============================================================
   report-notify — يرسل بلاغ خطأ المحتوى إلى محادثة المشرف في تيليغرام.
   المتصفح يكتب البلاغ بـ submit_content_report، ثم يستدعي هذه الوظيفة بمعرّفه.
   take_content_report لا تعيد البلاغ إلا مرة واحدة، فلا يتكرر الإشعار ولا يُرسل
   بلاغ لم يُكتب. المحادثة من السر REPORTS_CHAT_ID؛ إن لم يُضبط بقي البلاغ في القاعدة.
   ============================================================ */

import { APP_URL, CORS } from "../_shared/config.ts";
import { rpc } from "../_shared/supabase.ts";
import { sendMessage } from "../_shared/telegram.ts";
import { ar, esc } from "../_shared/text.ts";

const CHAT = Number(Deno.env.get("REPORTS_CHAT_ID") ?? "");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return Response.json({ ok: false }, { status: 405, headers: CORS });
  }
  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  if (!body.id || !UUID.test(body.id) || !Number.isFinite(CHAT) || !CHAT) {
    return Response.json({ ok: true, skipped: true }, { headers: CORS });
  }
  let r;
  try {
    r = await rpc("take_content_report", { p_id: body.id });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: CORS });
  }
  if (!r) return Response.json({ ok: true, skipped: true }, { headers: CORS });

  const link = new URL(`quran-read/${r.surah}/`, APP_URL);
  link.searchParams.set("ayah", String(r.ayah));
  const text = [
    "<b>بلاغ عن خطأ في المحتوى</b>",
    `${esc(r.location)} · ${esc(r.riwaya)}`,
    `السورة ${ar(r.surah)}، الآية ${ar(r.ayah)}، الصفحة ${ar(r.page)}${r.word != null ? `، الكلمة ${ar(r.word)}` : ""}`,
    "",
    `<blockquote>${esc(r.excerpt)}</blockquote>`,
    r.note ? `الملاحظة: ${esc(r.note)}` : "بلا ملاحظة",
    "",
    `<a href="${esc(link.href)}">فتح الآية</a>`,
  ].join("\n");
  const sent = await sendMessage(CHAT, text);
  return Response.json({ ok: sent.ok }, { headers: CORS });
});
