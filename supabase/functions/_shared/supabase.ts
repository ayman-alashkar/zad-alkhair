/* استدعاء دوال القاعدة بمفتاح الخدمة. */
import { SB_KEY, SB_URL } from "./config.ts";

// deno-lint-ignore no-explicit-any
export async function rpc(fn: string, args: unknown = {}): Promise<any> {
  const response = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`${fn}: ${response.status} ${raw}`);
  return raw ? JSON.parse(raw) : null;
}

/* رابط دخول شخصي في زر «افتح زاد الخير»: يضيف المتصفح الذي يُفتح منه الزر
   إلى أجهزة صاحب الرسالة، فلا يُطلب منه اسمه من جديد. إن تعذّر إصداره يبقى
   الزر رابطًا عاديًا كما كان. */
export async function loginToken(chat: number) {
  try {
    const token = await rpc("issue_login_link", { p_chat: chat });
    return typeof token === "string" && /^[0-9a-f]{36}$/.test(token) ? token : "";
  } catch {
    return "";
  }
}
