/* اختبارات المكتبة المشتركة: deno test --allow-env supabase/functions/_shared */
// مقارنة بسيطة دون مكتبات خارجية (الشبكة محدودة في بيئات البناء)
function assertEquals(actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`expected ${e}\n     got ${a}`);
}

Deno.env.set("TELEGRAM_BOT_TOKEN", "test-token");
Deno.env.set("SUPABASE_URL", "https://example.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-key");

const { appLink, codeFromUrl, navRows, readerLink } = await import("./links.ts");
const { sendMessage } = await import("./telegram.ts");
const { loginToken, rpc } = await import("./supabase.ts");
const { ar, esc, JUZ } = await import("./text.ts");

Deno.test("links: app, reader and the two message buttons", () => {
  assertEquals(appLink(), "https://zad-alkhair.net/");
  assertEquals(appLink(" ab12 ", "f".repeat(36)), `https://zad-alkhair.net/?login=${"f".repeat(36)}#AB12`);
  assertEquals(readerLink(), "https://zad-alkhair.net/quran-read/");
  assertEquals(readerLink("ab12", 7), "https://zad-alkhair.net/quran-read/?juz=7&code=AB12");
  assertEquals(readerLink("AB12", 31), "https://zad-alkhair.net/quran-read/?code=AB12");
  assertEquals(codeFromUrl(readerLink("ab12", 3)), "AB12");
  assertEquals(codeFromUrl("not a url"), "");
  assertEquals(navRows("AB12", "tok"), [[
    { text: "افتح زاد الخير", url: "https://zad-alkhair.net/?login=tok#AB12" },
    { text: "افتح المصحف", url: "https://zad-alkhair.net/quran-read/" },
  ]]);
  assertEquals(navRows()[0][0].url, "https://zad-alkhair.net/");
});

Deno.test("text: Arabic digits, HTML escaping, juz names", () => {
  assertEquals(ar(2026), "٢٠٢٦");
  assertEquals(esc("<b>a&b</b>"), "&lt;b&gt;a&amp;b&lt;/b&gt;");
  assertEquals(esc(undefined), "");
  assertEquals(JUZ.length, 30);
});

function mockFetch(handler: (url: string, body: Record<string, unknown>) => Response) {
  const original = globalThis.fetch;
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body ?? "{}"));
    calls.push({ url, body });
    return Promise.resolve(handler(url, body));
  }) as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}

Deno.test("sendMessage: HTML, buttons, and blocked users", async () => {
  let m = mockFetch(() => Response.json({ ok: true }));
  assertEquals(await sendMessage(5, "hi", [[{ text: "x", url: "https://a" }]]), { ok: true, blocked: false });
  assertEquals(m.calls[0].url, "https://api.telegram.org/bottest-token/sendMessage");
  assertEquals(m.calls[0].body, {
    chat_id: 5, text: "hi", parse_mode: "HTML", disable_web_page_preview: true,
    reply_markup: { inline_keyboard: [[{ text: "x", url: "https://a" }]] },
  });
  m.restore();

  m = mockFetch(() => Response.json({ ok: true }));
  await sendMessage(5, "hi");
  assertEquals("reply_markup" in m.calls[0].body, false);
  m.restore();

  m = mockFetch(() => Response.json({ description: "Forbidden: bot was blocked by the user" }, { status: 403 }));
  assertEquals(await sendMessage(5, "hi"), { ok: false, blocked: true, error: "Forbidden: bot was blocked by the user" });
  m.restore();

  m = mockFetch(() => Response.json({ description: "Bad Request: chat not found" }, { status: 400 }));
  assertEquals((await sendMessage(5, "hi")).blocked, true);
  m.restore();

  m = mockFetch(() => new Response("oops", { status: 502 }));
  assertEquals(await sendMessage(5, "hi"), { ok: false, blocked: false, error: "502" });
  m.restore();
});

Deno.test("rpc and loginToken", async () => {
  const token = "a".repeat(36);
  let m = mockFetch((url) => url.endsWith("/issue_login_link") ? Response.json(token) : Response.json({ ok: true }));
  assertEquals(await rpc("get_state", { p_code: "AB12" }), { ok: true });
  assertEquals(m.calls[0].url, "https://example.supabase.co/rest/v1/rpc/get_state");
  assertEquals(await loginToken(5), token);
  assertEquals(m.calls[1].body, { p_chat: 5 });
  m.restore();

  m = mockFetch(() => new Response("boom", { status: 500 }));
  assertEquals(await loginToken(5), "");
  m.restore();

  m = mockFetch(() => Response.json(null));
  assertEquals(await loginToken(5), "");
  m.restore();
});
