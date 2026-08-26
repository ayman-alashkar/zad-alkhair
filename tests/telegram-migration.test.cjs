"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

const schema=read("supabase/schema/telegram_domain_migration.sql");
const edge=read("supabase/functions/telegram-migration/index.ts");
const reminders=read("supabase/functions/send-reminders/index.ts");
const handoff=read("supabase/functions/migration-handoff/index.ts");
const transfer=read("telegram-transfer/index.html");
const ordinary=read("transfer/index.html");

assert.match(schema,/token_hash text primary key/,"only a token hash is persisted");
assert.doesNotMatch(schema,/\btoken text\b/,"raw migration tokens are never stored");
assert.match(schema,/device_hash text/,"the first redeeming device owns the token");
assert.match(schema,/unique \(kind, campaign_key, chat_id\)/,"campaigns and welcomes are exactly once per Telegram chat");
assert.match(schema,/for update skip locked/,"outbox delivery claims are concurrency safe");
assert.match(schema,/revoke all on function public\.redeem_telegram_migration_token/,"browser roles cannot call privileged migration RPCs");
assert.match(schema,/grant execute on function public\.redeem_telegram_migration_token\(text, text\) to service_role/);
assert.match(schema,/status = 'cancelled'/,"ordinary completion cancels an unsent Telegram campaign");

assert.match(edge,/CAMPAIGN_TEXT=`🕌 <b>زاد الخير<\/b>/);
assert.match(edge,/WELCOME_TEXT=`🕌 <b>زاد الخير<\/b>/);
assert.match(edge,/أهلًا بك في النسخة النهائية من زاد الخير/);
assert.match(edge,/claim_telegram_migration_deliveries/);
assert.match(edge,/finish_telegram_migration_delivery/);
assert.match(edge,/issued\?\.ok&&issued\.needed===false/,"a race with an ordinary migration does not send a stale campaign");

assert.match(reminders,/issue_telegram_migration_token/,"every unmigrated reminder receives a fresh authenticated token");
assert.match(reminders,/configured\.origin === FINAL_ORIGIN/,"a stale APP_URL cannot restore legacy-domain reminder links");
assert.match(reminders,/return `\$\{FINAL_ORIGIN\}\/`/,"the final domain is the safe reminder fallback");
assert.match(reminders,/guardedLink\(readerLink\(code, juz\), migrationToken\)/,"links embedded in reminder text are authenticated");
assert.match(reminders,/navigationRows\(url, migrationToken\)/,"Telegram buttons use the same authenticated path");
assert.match(reminders,/p_lifetime_seconds: 172800/,"reminder tokens expire");

assert.match(handoff,/complete_origin_domain_migration/,"the ordinary path records the same server-side completion");
assert.match(handoff,/dispatchWelcomes/,"ordinary Telegram-linked members receive the same one-time welcome");
assert.match(ordinary,/await callApi\("confirm",arrival\.token,true\)/,"legacy cleanup waits for server confirmation");

assert.match(transfer,/history\.replaceState\(null,"",location\.pathname\+location\.search\)/,"the personal token is removed from the address immediately");
assert.match(transfer,/pkg\.device!==device/,"a cached package cannot be applied on another device");
assert.match(transfer,/await callApi\("confirm",token,device\)/,"success waits for atomic server confirmation");
assert.doesNotMatch(transfer,/Authorization:"Bearer "\+SUPABASE_KEY/,"publishable keys are not misused as bearer JWTs");
assert.match(transfer,/تم ربط هذا الجهاز بختمتك نفسها في النسخة النهائية من زاد الخير\./);
assert.match(transfer,/وإذا كان التطبيق القديم مثبتًا لديك، فيرجى حذفه وتثبيت التطبيق الجديد\./);

console.log("TELEGRAM MIGRATION STATIC TESTS PASS");
