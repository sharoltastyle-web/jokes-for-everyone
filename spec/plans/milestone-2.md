# תוכנית — Milestone 2: בדיקת תוכן, שימוש חוזר אמין והשלמת ההגנות

מקורות: `MILESTONES.md` (Milestone 2), `ARCHITECTURE.md` סעיפים 3, 5, 6, 7, 9, `DESIGN.md` (מצבי המסך, UI Style), `PRD.md` (FR-06–FR-09, Edge Cases). נקודת המוצא היא הקוד הקיים מ־Milestone 1.

## מצב קיים (מה כבר עובד ולא צריך לבנות מחדש)

- `src/app/api/joke/route.ts` — POST, בדיקת JSON ו־topic, trim, `no-store`, מיפוי חלקי של שגיאות (503/504/502), Logs ללא תוכן.
- `src/lib/jokeService.ts` — קריאה ל־Responses API עם `store: false`, `max_output_tokens: 1024`, `reasoning.effort: "none"`; זורק שגיאה על incomplete / refusal / ריק. **אין עדיין Moderation ואין fallback.**
- `src/lib/openai.ts` — Client עם `maxRetries: 0` ו־Timeout של 10 שניות.
- `src/components/JokeForm.tsx` — ארבעת המצבים, שומר בקשה כפולה, `aria-live`, Timeout לקוח 30 שניות. ערך התיבה נקרא בזמן הלחיצה והבדיחה מוחלפת — כבר מתאים ל־FR-07; נדרש רק לאמת.

## 1. תשתית בדיקות עם Mock

- להוסיף את **Vitest** כ־devDependency (גרסה יציבה, נעולה ב־package-lock), עם `vitest.config.ts`:
  - סביבת `node`, alias של `@/` ל־`src/`.
  - alias של `server-only` למודול ריק (החבילה זורקת שגיאה מחוץ ל־Server Components).
- להוסיף סקריפט `"test": "vitest run"` ל־package.json.
- הבדיקות בתיקייה `tests/`. אין קריאות AI חיות בבדיקות; OpenAI מוחלף ב־Mock (`vi.mock("@/lib/openai")`).
- לעדכן ב־CLAUDE.md את שורת „בדיקות (test)” ל־`npm test`.
- לתעד ADR-4: בחירת Vitest (סיבה: תמיכה מובנית ב־TypeScript, ב־alias וב־Mock של מודולים, בלי הגדרות Babel/ts-jest).

## 2. Joke Service — Moderation, fallback ותקציב זמן

קובץ: `src/lib/jokeService.ts` (ושינוי קטן ב־`src/lib/openai.ts`).

**תקציב זמן:**
- `deadline = start + 25_000`. פונקציה `remaining()`.
- כל קריאת יצירה: `timeout = min(10_000, remaining())`; כל Moderation: `timeout = min(4_000, remaining())`. מועבר כאפשרות לבקשה עצמה (`client.responses.create(params, { timeout })`).
- אם `remaining() <= 0` לפני קריאה — שגיאת `BudgetExceeded` (→ 504).
- `maxRetries: 0` נשאר ב־Client. אין Retry אחר מלבד ה־fallback.

**זרימה:**
1. `generate(topic)` — יצירה כמו היום. incomplete / ריק → `GenerationError` (ללא fallback). refusal → `ContentRejected`.
2. `moderate(text)` — `client.moderations.create({ model: "omni-moderation-latest", input: text })`. אם `results.some(r => r.flagged)` → `ContentRejected`. כשל או Timeout של Moderation → שגיאה רגילה; הפלט **לא** מוחזר.
3. אם שלב 1 או 2 הסתיימו ב־`ContentRejected` — ניסיון fallback **אחד**: `generate("")` (בדיחה כללית) + `moderate`. אם גם הוא נדחה או נכשל — שגיאה. אין ניסיון שלישי.
4. כשל תקשורת, ספק או Timeout בניסיון הראשון — שגיאה מיידית, ללא fallback.
5. מוחזרת רק בדיחה שעברה Moderation. אין Streaming.

**מטא־דאטה ל־Logs:** הפונקציה מחזירה גם `usage` (סכום Tokens) ו־`fallbackUsed`, בלי טקסט.

**חיזוק הוראות היצירה:** אחרי הבדיקה הידנית (סעיף 7), לעדכן את `INSTRUCTIONS` לפי הצורך.

## 3. API Boundary — חוזה מלא

קובץ: `src/app/api/joke/route.ts`, וקובץ חדש `src/lib/origin.ts`.

סדר הבדיקות ב־POST:
1. **Origin** (`origin.ts`) — רשימת Origins מאושרים לפי סביבה:
   - `APP_ORIGIN` אם הוגדר.
   - `https://${VERCEL_URL}` ו־`https://${VERCEL_BRANCH_URL}` אם הוגדרו (Preview).
   - ב־`NODE_ENV === "development"`: `http://localhost:${PORT ?? 3000}`.
   - Origin חסר או לא ברשימה → **403** `FORBIDDEN_ORIGIN`.
2. **Content-Type** — חייב להתחיל ב־`application/json` → אחרת **415** `UNSUPPORTED_MEDIA_TYPE`.
3. **גודל גוף** — אם `Content-Length` > 8 KiB → **413** מיד; אחרת קריאת `request.text()` ובדיקת אורך ב־Bytes (‏`Buffer.byteLength`) → **413** `PAYLOAD_TOO_LARGE`.
4. **JSON** — `JSON.parse` → **400** `INVALID_JSON`; מבנה / טיפוס topic שגוי (כולל `null`) → **400** `INVALID_INPUT`. (קיים — נשמר.)
5. trim והפעלת Joke Service.

**שיטות אחרות:** ייצוא `GET`, `PUT`, `PATCH`, `DELETE` שמחזירים **405** `METHOD_NOT_ALLOWED` עם כותרת `Allow: POST`, באותו מבנה JSON ועם `no-store`.

**מיפוי שגיאות שירות:**

| שגיאה | HTTP | code |
|---|---|---|
| `ConfigError` | 503 | `SERVICE_UNAVAILABLE` |
| `APIConnectionTimeoutError` / `BudgetExceeded` | 504 | `TIMEOUT` |
| `RateLimitError` של OpenAI | 429 | `RATE_LIMITED` |
| `ContentRejected` (אחרי fallback), `GenerationError`, כל שגיאת ספק אחרת | 502 | `GENERATION_FAILED` |

לעולם לא מועברת הודעת שגיאה גולמית של OpenAI.

**Logs:** שורה אחת לכל בקשה: `requestId` (‏`crypto.randomUUID()`), status, ms, tokens, fallback, ומחלקת השגיאה. ללא topic, בדיחה, Prompt או מפתח.

**ADR-5:** קוד 403 לדחיית Origin (ARCHITECTURE מחייב דחייה אך הטבלה לא מגדירה קוד), ו־Origin חסר נדחה גם הוא (דפדפנים שולחים Origin בכל POST).

## 4. כותרות HTTP

קובץ: `next.config.ts` — `async headers()`:
- לכל הנתיבים (`/:path*`): `X-Content-Type-Options: nosniff`, `Content-Security-Policy: frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`.
- ל־`/api/:path*`: `Cache-Control: no-store` (גיבוי, כדי שגם תשובות אוטומטיות של Next.js יכוסו).
- לוודא בהרצת Build של Production (`npm run build` + `npm start`) שהכותרות קיימות.

## 5. Client — טיפול בתקלות ונגישות

- להעביר את `requestJoke` לקובץ `src/lib/jokeClient.ts` (Client בלבד) כדי שאפשר יהיה לבדוק אותו עם Mock של `fetch`.
- כל כשל ממופה ל־Error: ניתוק רשת, Timeout, סטטוס לא תקין, גוף שאינו JSON (HTML של WAF או תשתית), JSON בלי `joke` — כולם מציגים „לא הצלחנו ליצור בדיחה. נסו שוב” ומשחררים את הלחצן (קיים — נשמר ונבדק).
- `JokeForm.tsx`:
  - ה־Label כבר מקושר לתיבה; להוסיף `aria-busy` לאזור התוצאה בזמן המתנה.
  - אזור ה־`aria-live` נשאר תמיד ב־DOM (קיים).
  - אין שמירה ב־localStorage / sessionStorage (לוודא).
- CSS (`JokeForm.module.css`, `page.module.css`, `globals.css` לפי הצורך):
  - Focus נראה בתיבה (‏`:focus-visible` / הדגשה טורקיז קיימת) ובלחצן.
  - מצב Disabled לפי ה־Style Guide (קיים — לאמת).
  - מסך צר (320–375px): ללא גלילה אופקית, שוליים צדדיים, בדיחה ארוכה נשברת לשורות (‏`overflow-wrap` קיים).
  - מקלדת מובייל: התוכן לא נחתך כשהמקלדת פתוחה (גובה מינימלי ב־`dvh` ולא גובה קבוע).

## 6. בדיקות אוטומטיות (Mock)

`tests/jokeService.test.ts`:
- בדיחה תקינה שעוברת Moderation מוחזרת.
- פלט flagged אינו מוחזר; מופעל fallback אחד; fallback תקין מוחזר.
- fallback שגם הוא flagged → שגיאה; נבדק שהיו בדיוק 2 קריאות יצירה.
- refusal → fallback אחד.
- incomplete / פלט ריק → שגיאה ללא fallback.
- כשל ספק / Timeout ביצירה → שגיאה ללא fallback.
- כשל Moderation → שגיאה, והפלט אינו מוחזר.
- ה־timeout שנשלח לכל קריאה ≤ 10s / 4s ו־≤ הזמן שנותר בתקציב (עם שעון מדומה).

`tests/route.test.ts` (Joke Service ב־Mock):
- הצלחה עם נושא, בלי topic, topic ריק ו־topic של רווחים (נשלח `""` לשירות).
- JSON פגום → 400; topic מספר / `null` / מערך בגוף → 400.
- גוף מעל 8 KiB → 413; Content-Type ‏`text/plain` → 415; GET → 405.
- Origin זר / חסר → 403; Origin מאושר → 200.
- מיפוי שגיאות: Config → 503, Timeout → 504, RateLimit → 429, אחר → 502; גוף השגיאה אינו מכיל טקסט מהספק.
- כל תשובה כוללת `Cache-Control: no-store`.
- `console` לא מקבל את הנושא או את הבדיחה (‏spy על console).

`tests/jokeClient.test.ts` (‏`fetch` ב־Mock):
- ניתוק רשת, תשובת HTML (שאינה JSON) עם 502, 429 של WAF, JSON בלי `joke` — כולם זורקים שגיאה.

## 7. בדיקות חיות וידניות (מפתח הפיתוח, שרת Dev מקומי)

- **נושאים רגישים** (לפחות 8, רשימה קבועה): מוות, מלחמה, אלכוהול, דת, גוף האדם, מחלות, פוליטיקאי, קללה. כל נושא נשלח ל־API המקומי; כל תוצאה נבחנת ידנית: נקייה, מתאימה לילדים, בעברית. אם לא — לחזק את ההוראות ולהריץ שוב את כל הרשימה. הסקריפט להרצה הוא זמני (ב־scratchpad, לא בפרויקט). התוצאות מוצגות למשתמש בסיכום הבנייה.
- **שימוש חוזר בדפדפן:** שתי לחיצות עוקבות → שתי בקשות ברשת, הבדיחה מוחלפת; שינוי נושא משפיע על הבקשה הבאה; ריקון התיבה → בדיחה כללית.
- **תקלות בדפדפן:** ניתוק רשת (DevTools offline / חסימת הבקשה) ותשובה שאינה JSON → הודעת התקלה והלחצן חוזר לפעולה.
- **פלט דמוי HTML:** ב־Mock בלבד — מחרוזת כמו `<b>x</b><img src=x onerror=...>` מוצגת כטקסט (בבדיקת הדפדפן, באמצעות תשובה מדומה).
- **מובייל ומקלדת:** Viewport של 375px ו־320px; ניווט ב־Tab: תיבה → לחצן; Focus נראה; Enter שולח; בדיחה ארוכה ללא חיתוך וללא גלילה אופקית.
- **Regression של Milestone 1:** „חתולים”, תיבה ריקה, רווחים בלבד, נושא באנגלית, לחיצות מהירות — עם המודל החי.
- **Build:** `npm run lint`, `npm run build`, `npm test`; הרצת `npm start` עם `APP_ORIGIN=http://localhost:3000` (משתנה זמני בפקודה, בלי לגעת ב־`.env`) ובדיקת הכותרות והחוזה ב־Production build.

## 8. קבצים

| קובץ | פעולה |
|---|---|
| `package.json`, `package-lock.json` | Vitest + סקריפט `test` |
| `vitest.config.ts` | חדש |
| `src/lib/jokeService.ts` | Moderation, fallback, תקציב זמן, usage |
| `src/lib/openai.ts` | Timeout לפי קריאה (הסרת הקבוע הגלובלי או שמירתו כגבול עליון) |
| `src/lib/origin.ts` | חדש — רשימת Origins מאושרים |
| `src/lib/jokeClient.ts` | חדש — `requestJoke` שהועבר מהטופס |
| `src/app/api/joke/route.ts` | Origin, Content-Type, גודל, 405, מיפוי שגיאות, Logs עם requestId |
| `next.config.ts` | כותרות אבטחה ו־no-store |
| `src/components/JokeForm.tsx`, `*.module.css`, `globals.css` | נגישות ומובייל לפי הצורך |
| `tests/*.test.ts` | חדש |
| `spec/ARCHITECTURE.md` | ADR-4 (Vitest), ADR-5 (קוד ודחיית Origin); ADR נוסף רק אם זמני האמת חורגים מהגבולות |
| `CLAUDE.md` | פקודת בדיקות |
| `spec/MILESTONES.md` | 🟡 בסיום הבנייה |

אין משתני סביבה חדשים (‏`APP_ORIGIN` כבר קיים ב־`.env.example`). אין Database, אין שמירה בדפדפן, אין מסכים או שירותים חדשים.

## 9. Definition of Done — איך כל תנאי ייבדק

| תנאי | אופן הבדיקה |
|---|---|
| פלט שנפסל לא מוצג, fallback אחד לכל היותר, כשל Moderation לא חושף פלט | `jokeService.test.ts` (Mock) |
| נושאים רגישים נקיים | בדיקה חיה ידנית, תוצאות בסיכום |
| שתי שליחות → שתי בקשות, האחרונה מחליפה | דפדפן + רשת |
| שינוי נושא / ריקון התיבה | דפדפן (חי) + `route.test.ts` |
| Timeout, ריק, incomplete, refusal, כשל ספק, כשל Moderation | `jokeService.test.ts` (Mock) |
| ניתוק רשת ותשובה שאינה JSON | `jokeClient.test.ts` + דפדפן |
| חוזה API: JSON פגום, טיפוס, גודל, שיטה, Content-Type, Origin | `route.test.ts` + curl מול Build |
| גבולות זמן ופלט, ללא Retry נוסף | `jokeService.test.ts` + סקירת קוד (`maxRetries: 0`) |
| פלט HTML כטקסט, no-store | דפדפן עם תשובה מדומה + `route.test.ts` + curl |
| Logs ללא תוכן, אין שמירה בדפדפן | `route.test.ts` (spy) + חיפוש `localStorage` בקוד |
| מובייל ומקלדת | דפדפן ב־375/320px ו־Tab |
| כותרות אבטחה ב־Production build + Regression של Milestone 1 | `npm start` + curl, ובדיקות חיות של Milestone 1 |
