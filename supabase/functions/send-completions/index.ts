/* ============================================================
   send-completions — عامل طابور إشعارات اكتمال الختمة. يستدعيه cron
   (وتستدعيه القاعدة فور الاكتمال)، فيرسل ما حُجز في notification_deliveries.
   ============================================================ */

import { CRON_SECRET } from "../_shared/config.ts";
import { doneText } from "../_shared/completion.ts";
import { navRows } from "../_shared/links.ts";
import { loginToken, rpc } from "../_shared/supabase.ts";
import { pause, sendMessage } from "../_shared/telegram.ts";

/* رسالة بزرّي «افتح زاد الخير» (على الختمة) و«افتح المصحف» */
async function send(chat: number, text: string, code?: string) {
  return sendMessage(chat, text, navRows(code, await loginToken(chat)));
}

Deno.serve(async (req) => {
  if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET)
    return new Response("forbidden", { status: 403 });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  let jobs;
  try { jobs = await rpc("claim_completion_notifications"); }
  catch (error) {
    console.error("completion claim failed", String(error));
    return Response.json({ok:false,error:"claim failed"}, {status:503});
  }
  let sent=0, blocked=0, failed=0;
  for (const job of jobs ?? []) {
    let result;
    try { result = await send(job.chatId, doneText(job), job.code); }
    catch { result = {ok:false,blocked:false,error:"network failure"}; }
    if (result.ok) sent++;
    else if (result.blocked) {
      blocked++;
      await rpc("unlink_by_chat", {p_chat:job.chatId}).catch(()=>null);
    } else failed++;
    try {
      await rpc("notification_finish", {
        p_delivery:job.deliveryId, p_ok:result.ok, p_permanent:result.blocked
      });
    } catch { failed++; }
    await pause(60);
  }
  console.log("completion deliveries", {sent,blocked,failed});
  return Response.json({ok:failed===0,sent,blocked,failed}, {status:failed?503:200});
});
