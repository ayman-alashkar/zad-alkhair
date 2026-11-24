import { appState } from "./app-state.mjs";
import { JUZ, MOTIV } from "./content.mjs";
import { AR, MONTHS, WEEKDAYS, ar, araNorm, dayWord, daysLeft, esc, fmtClockG, fmtClockH, fmtG, fmtH, fmtTime, hourOptions, isoParts, keyOf, norm, plusDays, todayISO } from "./format.mjs";
import { KUNYA, NEAR, coreTokens, jaro, jw, nameScore, similarTo, tokensOf } from "./name-matching.mjs";
import { ZA_LISTS, ZA_TEXT } from "./adhkar-data.mjs";
import { zuDeviceId, zuPackFresh, zuPlatform, zuSurface, zuTrackAudio } from "../shared/usage.mjs";
import { JUZ_PAGES, SURAH_NAMES, SURAH_START_PAGES, surahForPage } from "./quran-map.mjs";


/* ===================== الإعدادات ===================== */
const SUPABASE_URL = "https://webqpbcijjbawatykoxe.supabase.co";
const SUPABASE_KEY = "sb_publishable_51JPJ2XgwWW5l66bwqHN3Q_CJrEtyZv";
const BOT_USERNAME = "ZadAlkhair_Bot";


/* @include install-navigation.js */



/* @include prayer.js */

/* @include api.js */

/* @include formatting-clock.js */

/* @include session.js */
/* @include notification-outbox.js */

/* @include account.js */

/* @include views.js */

/* @include dialogs.js */

/* @include state-sync.js */
/* @include live-sync.js */

/* @include telegram.js */

/* @include organizer.js */

/* @include actions.js */

/* @include ui-bindings.js */

/* @include today.js */
/* @include prayer-screen.js */
/* @include friday-wird.js */
/* @include adhkar.js */

/* @include bootstrap.js */
