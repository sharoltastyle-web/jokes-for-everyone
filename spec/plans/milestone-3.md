# תוכנית — Milestone 3: אתר ציבורי ו־PWA עם פריסה אוטומטית

מקורות: `MILESTONES.md` (Milestone 3), `ARCHITECTURE.md` סעיפים 1, 7, 8, 9, 10, 11 ו־ADR-1–5, `PRD.md` (FR-11, Edge Cases), `DESIGN.md` (Color Palette, Icons). נקודת המוצא היא הקוד שאושר ב־Milestone 2.

## מצב קיים (לא צריך לבנות מחדש)

- `src/app/api/joke/route.ts` — `maxDuration = 30`, חוזה מלא, `no-store`, Logs ללא תוכן.
- `src/lib/origin.ts` — כבר מאשר `APP_ORIGIN`, ‏`https://` + `VERCEL_URL` / `VERCEL_BRANCH_URL`, ו־localhost ב־Development בלבד. מתאים ל־Preview ול־Production בלי שינוי.
- `src/lib/jokeClient.ts` — כל תשובה שאינה OK או שאינה JSON (כולל 429 מה־WAF) ממופה להודעת התקלה הרגילה. ניתוק רשת אחרי טעינה כבר מטופל.
- `next.config.ts` — כותרות האבטחה ו־`no-store` ל־`/api`.
- `package.json` — `engines.node: "24.x"`, ‏`.nvmrc` = 24. ‏`.vercel/` כבר ב־`.gitignore`.
- `layout.tsx` — `lang="he"`, ‏`dir="rtl"`, כותרת „בדיחה לכל”, ‏`themeColor: #FFF9ED`.
- GitHub מחובר (`origin` → `jokes-for-everyone`), ענף יחיד `main`. **Vercel עדיין לא מחובר**, ולכן שום גרסה לא פורסמה לציבור עד כה.

## 1. קוד — PWA

**אייקונים** (קבצי PNG סטטיים, נשמרים ב־Git):
- `public/icons/icon.svg` — קובץ מקור: חיוך בתוך בועת דיבור, Rounded Outline בעובי 2px (ביחס לגודל 24), בצבע Text ‏`#183849` על רקע Primary ‏`#FFB800`, עם שוליים בטוחים (~10%) כדי שלא ייחתך במסגרת עגולה. לפי שפת ה־Icons ב־DESIGN; **יוצג למשתמש לאישור לפני ההמשך.**
- `public/icons/icon-192.png` ו־`public/icons/icon-512.png` — המרה חד־פעמית מה־SVG באמצעות `sharp` (כבר מותקן כתלות של Next.js; לא מוסיפים חבילה). סקריפט ההמרה רץ מתיקייה זמנית ואינו חלק מהפרויקט.
- `src/app/apple-icon.png` — ‏180×180, באותו עיצוב; Next.js מוסיף אוטומטית `<link rel="apple-touch-icon">`.
- `src/app/favicon.ico` — נשאר כפי שהוא (מחוץ לטווח).

**Manifest** — קובץ חדש `src/app/manifest.ts` (התמיכה המובנית של Next.js, מוגש ב־`/manifest.webmanifest`):
- `name` ו־`short_name`: „בדיחה לכל”
- `lang: "he"`, ‏`dir: "rtl"`, ‏`start_url: "/"`, ‏`display: "standalone"`
- `background_color` ו־`theme_color`: ‏`#FFF9ED` (Background)
- `icons`: 192×192 ו־512×512, ‏`type: "image/png"`, ‏`purpose: "any"`
- בלי `description` מעבר למה שכבר ב־metadata, בלי Service Worker, בלי Offline Cache, בלי Push או Background Sync, בלי מסך התקנה.

**layout.tsx** — להוסיף ל־metadata ‏`appleWebApp: { title: "בדיחה לכל" }`, כדי שהשם במסך הבית ב־iOS יהיה נכון.

## 2. קוד — תצורת Vercel

קובץ חדש `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "npm ci",
  "buildCommand": "npm run lint && npm test && npm run build",
  "fluid": true
}
```

- `next build` ב־Next.js 16 בודק TypeScript אך **אינו** מריץ Lint — לכן Lint מופיע במפורש. בדיקות ה־Mock (`npm test`) נכללות כדי לקיים את כלל 7 ב־MILESTONES (כל שינוי עובר את בדיקותיו לפני Production); הן אינן מבצעות קריאות AI חיות. כישלון בכל שלב מכשיל את ה־Deployment.
- Node.js 24.x נקבע מ־`engines` ב־package.json; לוודא שזה גם הערך בהגדרות הפרויקט ב־Vercel.
- `maxDuration = 30` כבר מוגדר ב־Route Handler.
- ADR-6: הוספת `npm test` ל־Build ב־Vercel והגדרת התצורה ב־`vercel.json` (במקום הגדרות ידניות בלוח הבקרה).

## 3. בדיקה מקומית לפני כל פריסה

- `npm run lint`, ‏`npm test`, ‏`npm run build` עוברים.
- הרצת `npm start` (עם `APP_ORIGIN` מקומי, לפי ADR-5): `/manifest.webmanifest` מחזיר JSON תקין עם השם, ה־RTL והאייקונים; שלושת קובצי האייקונים נטענים (200); ב־HTML קיימים `<link rel="manifest">` ו־`apple-touch-icon`; כותרות האבטחה קיימות.
- סגירת ההרצה בסיום.

## 4. הגדרת Vercel — המשתמש מבצע, בהדרכה צעד אחר צעד

כל צעד בחשבונות נעשה על ידי המשתמש. Claude מסביר בשפה פשוטה ובודק את התוצאה. **אין להדביק מפתחות בשיחה.**

1. **תוכנית Hosting** — לשאול את המשתמש אם השימוש אישי ולא מסחרי. אם כן → Hobby (חינם). אם מסחרי → Pro (בתשלום) — החלטה של המשתמש. לבדוק בדף התמחור הנוכחי שכלל Rate Limiting זמין בתוכנית שנבחרה ומה עלותו.
2. **מפתח Production** — המשתמש יוצר ב־OpenAI מפתח חדש ונפרד (רצוי ב־Project נפרד) ל־Production. מפתח הפיתוח הקיים נשאר ל־Development ול־Preview.
3. **ייבוא הפרויקט** — Vercel → Add New → Project → בחירת `jokes-for-everyone`, ‏Framework: Next.js. (הערה: הייבוא מבצע מיד Deployment ראשון של `main` הנוכחי. בלי משתני סביבה הוא יחזיר את הודעת התקלה הרגילה — גרסת Milestone 2 המאושרת, לא גרסה חלקית. הכתובת לא תפורסם עד סיום הבדיקות.)
4. **Environment Variables** (Settings → Environment Variables):

   | משתנה | Production | Preview | Development |
   |---|---|---|---|
   | `OPENAI_API_KEY` | מפתח Production | מפתח פיתוח | מפתח פיתוח |
   | `OPENAI_MODEL` | `gpt-5.6-luna` | `gpt-5.6-luna` | `gpt-5.6-luna` |
   | `APP_ORIGIN` | `https://<שם-הפרויקט>.vercel.app` | — | — |

   המפתחות מסומנים Sensitive. לאחר ההגדרה — Redeploy, כי שינוי משתנים חל רק ב־Deployment חדש.
5. **הגדרות פרויקט** — לוודא: Node.js 24.x, ‏Fluid Compute פעיל, ‏Production Branch = `main`. ‏Deployment Protection: מותר על Preview בלבד; **אסור** על Production.
6. **WAF Rate Limiting** (Firewall → Add Rule): תנאי — Path שווה `/api/joke` ו־Method שווה `POST`; פעולה — Rate Limit לפי IP, ‏10 בקשות לדקה, תשובה 429. לפרסם את הכלל.
7. **התראות שימוש** — ב־OpenAI: תקציב והתראה ל־Project של Production. ב־Vercel: התראות/Spend Management לפי מה שהתוכנית מאפשרת. לציין למשתמש במפורש שהתראה אינה תקרת חיוב קשיחה.

## 5. זרימת Git ופריסה

לפי CLAUDE.md, כל Push דורש אישור מפורש של המשתמש — לעצור ולבקש לפני כל אחד מהשלבים:

1. ענף עבודה `milestone-3` עם קוד סעיפים 1–2 → **Push (באישור)** → Vercel יוצר Preview.
2. בדיקות Preview (סעיף 6).
3. מיזוג `milestone-3` ל־`main` → **Push (באישור)** → Production Deployment אוטומטי לאחר שה־Build עבר.
4. בדיקות Production (סעיף 6).
5. תיקונים, אם יידרשו, נעשים שוב בענף עבודה ועוברים Preview לפני `main`.

## 6. בדיקות מול ה־Definition of Done

| בדיקה | איך |
|---|---|
| Preview נוצר מענף עבודה; Production מ־`main` רק אחרי Build תקין | צפייה ברשימת ה־Deployments וב־Build Log (Lint, Tests, Build עברו) |
| יצירה ב־Production עם נושא ובלי נושא, בלי התחברות | דפדפן רגיל (חלון פרטי) בכתובת ה־Production |
| יצירה ב־Preview עובדת; Origin זר נדחה | דפדפן בכתובת ה־Preview; ‏`curl` עם `Origin: https://example.com` → ‏403 |
| מפתח Production לא נחשף | אין לו ערך ב־Preview / Development ב־Vercel, לא ב־`.env`, לא ב־Git; חיפוש ב־Bundle ובתשובות; בדיקה שה־Deployment האחרון נוצר אחרי שינוי התצורה |
| Manifest, אייקונים, HTTPS, standalone | `/manifest.webmanifest`; לשונית Application ב־DevTools ללא שגיאות; פתיחה מותקנת בלי שורת כתובת |
| Chrome ב־Android ו־Safari ב־iOS | המשתמש בודק במכשיר לפי הוראות פשוטות; מה שלא נבדק יסומן „לא נבדק” |
| ללא התקנה + Offline אחרי טעינה | מצב Offline ב־DevTools ולחיצה → „לא הצלחנו ליצור בדיחה. נסו שוב”, הלחצן חוזר לפעולה |
| WAF | ‏12 בקשות POST ברצף עם Origin מאושר (עלות של כמה סנטים בודדים לכל היותר) → מהבקשה ה־11 מתקבל 429; במסך מוצגת הודעת התקלה הרגילה, בלי פרטי ספק |
| תוכנית והתראות | צילום/תיאור של ההגדרה שבוצעה; התראה אינה מוצגת כתקרה |
| אבטחה, RTL והתנהגות בגרסה הפרוסה | `curl -I` לכותרות האבטחה ו־`no-store`; בדיקת מסך במובייל ובמחשב; פלט כטקסט |
| Rollback | תיעוד ה־Deployment התקין (מזהה, Commit, תאריך) והתצורה שלו ב־`DEPLOYMENT.md` |
| Regression | `npm run lint`, ‏`npm test`, ‏`npm run build` מקומית ובתוך ה־Build ב־Vercel |

## 7. תיעוד

- קובץ חדש `DEPLOYMENT.md` בשורש הפרויקט: כתובות Production ו־Preview, טבלת משתני הסביבה (שמות בלבד, בלי ערכים), כלל ה־WAF, התוכנית וההתראות, ה־Deployment התקין האחרון, ואיך מבצעים Rollback (Vercel → Deployments → Promote/Instant Rollback, ולוודא שהתצורה הפעילה מתאימה). פשוט ובשפה לא טכנית ככל האפשר.
- ADR-6 ב־ARCHITECTURE (סעיף 2). ADR נוסף רק אם תתקבל החלטה טכנית משמעותית נוספת (למשל סף WAF שונה מ־10 לדקה).
- `.env.example` — ללא שינוי (אין משתנה חדש).
- סימון 🟡 ליד Milestone 3 ב־MILESTONES.md בסיום הבנייה.

## נקודות שדורשות את המשתמש במהלך הבנייה

- אישור עיצוב האייקון.
- אופי השימוש (אישי / מסחרי) → בחירת תוכנית Vercel.
- יצירת מפתח Production ב־OpenAI והגדרת כל השירותים בחשבונות.
- אישור לכל Push (ענף עבודה, ואחר כך `main`).
- בדיקת התקנה במכשירי Android / iOS, אם זמינים.

## מחוץ לטווח

Service Worker, Offline Cache, מסך או כפתור התקנה, Push Notifications, דומיין מותאם אישית, Database, התחברות, ספק AI או מודל אחר.
