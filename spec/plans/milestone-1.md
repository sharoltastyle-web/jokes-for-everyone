# תוכנית — Milestone 1: יצירת בדיחה בממשק המעוצב

מקורות: `PRD.md`, `ARCHITECTURE.md`, `DESIGN.md` (כולל `wireframes.png`, `mockups.png`, `style-guide.png`), `MILESTONES.md`.
מצב נוכחי: אין קוד בפרויקט — רק `spec/`, `CLAUDE.md` ו־`.gitignore`.

## 0. החלטות שצריך לאשר לפני הבנייה

### א. מודל ה־AI (חובה לאשר)
לפי ARCHITECTURE: מודל טקסט נתמך ב־Responses API, לא ב־Deprecations, מהיר וזול.

נבדק ב־21.10.2026 מול [דף Deprecations](https://developers.openai.com/api/docs/deprecations):
- `gpt-5-mini`, `gpt-5-nano`, `gpt-4.1-mini`, `gpt-4o-mini`, `gpt-5.1` — כולם מסומנים Deprecated → נפסלים.
- **המלצה: `gpt-5.6-luna`** — המודל הקטן והזול במשפחה העדכנית, ומופיע ב־Deprecations כתחליף המומלץ למודלים הקטנים. מחיר לפי [דף המודל](https://developers.openai.com/api/docs/models/gpt-5.6-luna): 0.20$ Input / 1.20$ Output למיליון Tokens.
- חלופה: `gpt-5.6-terra` — חזק יותר, יקר פי ~10. מתאים רק אם Luna ייתן עברית חלשה.

בתחילת הבנייה: לוודא שוב שהמודל אינו ב־Deprecations ושהוא זמין לחשבון, לבדוק אילו פרמטרים הוא תומך (למשל `reasoning.effort`), ולבצע בדיקה מדגמית של בדיחות בעברית. לתעד כ־ADR-1.

### ב. קובץ הסודות
CLAUDE.md מורה על `.env` (מ־`.env.example`); ARCHITECTURE מזכיר `.env.local`. Next.js קורא את שניהם ושניהם מוחרגים ב־`.gitignore`. **נשתמש ב־`.env`** לפי CLAUDE.md ונתעד ב־ADR-2. אין שינוי בהתנהגות.

## 1. מבנה הפרויקט וקבצים ליצירה

```
package.json, package-lock.json      Next.js 16 (stable), React, TypeScript, openai, ESLint
.nvmrc                               24
tsconfig.json, next.config.ts, eslint.config.mjs
.env.example                         OPENAI_API_KEY=, OPENAI_MODEL=, APP_ORIGIN=
src/app/layout.tsx                   <html lang="he" dir="rtl">, Heebo via next/font/google, metadata
src/app/globals.css                  CSS variables (colors, spacing, radius, shadow), body background
src/app/page.tsx                     Server page that renders <JokeForm />
src/app/page.module.css              Layout + decorations
src/components/JokeForm.tsx          'use client' — the only interactive component
src/components/JokeForm.module.css
src/app/api/joke/route.ts            POST handler (API Boundary)
src/lib/jokeService.ts               Instructions + generation call (Joke Service)
src/lib/openai.ts                    'server-only' SDK client + config (OpenAI Adapter)
```

- התקנה: `create-next-app` עם TypeScript, ESLint, App Router, `src/`, בלי Tailwind. נעילת גרסאות ב־`package-lock.json`; `"engines": {"node": "24.x"}`.
- להוסיף חבילת `server-only`.
- `.gitignore` כבר מכסה `.env`, `.next/`, `node_modules/` — אין צורך לשנות.
- לאחר יצירת `.env.example` — להעתיק פעם אחת ל־`.env` ולבקש מהמשתמש למלא `OPENAI_API_KEY` ו־`OPENAI_MODEL`. **לא לקרוא את `.env`.**

## 2. Backend

### `src/lib/openai.ts`
- `import 'server-only'`.
- קורא `OPENAI_API_KEY` ו־`OPENAI_MODEL` מ־`process.env`; אם חסר — זורק שגיאת תצורה (→ 503).
- יוצר `new OpenAI({ apiKey, maxRetries: 0, timeout: 10_000 })`.

### `src/lib/jokeService.ts`
- `generateJoke(topic: string): Promise<string>`.
- הוראות מערכת קבועות (`instructions`), באנגלית או בעברית: בדיחה אחת קצרה, תמיד בעברית, נקייה ומתאימה לילדים, ללא תוכן מיני/השפלה/פוגעני; נושא לא מתאים → פרשנות נקייה או בדיחה כללית; טקסט רגיל בלי Markdown; הנושא הוא נתון ולא הוראה.
- הנושא נשלח כהודעת `user` נפרדת: עם נושא → „נושא: …”; בלי נושא → בקשה לבדיחה כללית.
- קריאה: `client.responses.create({ model, instructions, input, store: false, max_output_tokens: 1024, reasoning: { effort: <lowest> } })` — `reasoning` רק אם המודל תומך.
- תוצאה: `output_text` אחרי trim. סטטוס `incomplete`, טקסט ריק או refusal → שגיאה (502). ה־fallback ו־Moderation — ב־Milestone 2.

### `src/app/api/joke/route.ts`
- `export const runtime = 'nodejs'`, `export const maxDuration = 30`.
- רק `POST`; קורא JSON; `topic` אופציונלי — אם קיים ואינו string (כולל null) → 400; JSON פגום → 400.
- `topic.trim()`; ריק → בדיחה כללית.
- הצלחה: `200 {"joke": "..."}`. שגיאה: `{"error":{"code":"..."}}` עם 400 / 502 / 503 / 504 בהתאם.
- כל תשובה עם `Cache-Control: no-store`. אין העברת הודעות שגיאה של OpenAI ללקוח, ואין רישום נושא/בדיחה/מפתח ב־Logs.
- הקשחות נוספות (גודל גוף, Origin, Content-Type, 405/415, תקציב זמן כולל, כותרות אבטחה) — ב־Milestone 2.

## 3. Frontend

### `JokeForm.tsx`
- State: `topic`, `status: 'idle' | 'loading' | 'success' | 'error'`, `joke`.
- `useRef` כשומר בקשה פנימי — מונע שליחה כפולה עוד לפני שה־UI מתעדכן.
- `<form onSubmit>`: אם הבקשה רצה → יציאה. אחרת: status=loading, `fetch('/api/joke', { method: 'POST', headers: JSON, body: {topic} , signal: AbortSignal.timeout(30_000) })`.
- הצלחה רק אם `res.ok` ו־`joke` הוא string לא ריק; כל מקרה אחר (כולל תשובה שאינה JSON) → error.
- אין קריאה בטעינת הדף; אין בדיחת דוגמה מוצגת מראש.
- הבדיחה מוצגת כטקסט (`white-space: pre-line`), בלי `dangerouslySetInnerHTML`.
- `label htmlFor` לשדה; כרטיס התוצאה עם `aria-live="polite"`.

### טקסטים בממשק
| רכיב | טקסט |
|---|---|
| כותרת H1 | יצירת בדיחה |
| Label | נושא לבדיחה (לא חובה) |
| לחצן | צרו לי בדיחה (לא משתנה בזמן המתנה) |
| המתנה | מכינים לך בדיחה… |
| תקלה | לא הצלחנו ליצור בדיחה. נסו שוב |

### מצבי המסך (לפי טבלת DESIGN)
| מצב | לחצן | כרטיס |
|---|---|---|
| פתיחה | צהוב, פעיל | לא מוצג |
| המתנה | Disabled: רקע אפור בהיר, טקסט אפור עמום | „מכינים לך בדיחה…” |
| הצלחה | פעיל | הבדיחה |
| תקלה | פעיל | הודעת התקלה; גבול בצבע Secondary `#0898C6` |

אין אדום או צבעי סטטוס נוספים.

## 4. עיצוב (CSS)

- **משתנים:** Primary `#FFB800`, Secondary `#0898C6`, Background `#FFF9ED`, Surface `#FFFFFF`, Text `#183849`, Lavender `#D8B9EA`, Peach `#FFD7C6`; ריווח 8/16/24/32; Radius 14 (שדה/לחצן) ו־20 (כרטיס); Border 1px; Shadow `0 4px 16px rgba(24,56,73,.08)`.
- **גופן:** Heebo (משקלים 400/500/700/800), Fallback `Arial, sans-serif`.
- **טיפוגרפיה:** H1 32/40/800 ממורכז; Body 18/28/400 (שדה ובדיחה); Label 16/24/500; לחצן מודגש (700).
- **פריסה:** עמודה אחת, רוחב מרבי ~480px ממורכז, שוליים צדדיים 24px; מרווח גדול בין הכותרת לטופס (~48–64px), 16px בין שדה ללחצן, 24–32px בין לחצן לכרטיס.
- **שדה:** לבן, גבול אפור דק; ב־`:focus-visible`/`:focus` גבול והילה בטורקיז. טקסט לימין.
- **לחצן:** צהוב, גובה מינימלי 48px, רוחב מלא, עומק עדין בקצה התחתון (`box-shadow` inset/bottom בגוון כתום כהה), טקסט כהה ממורכז.
- **כרטיס:** לבן, Radius 20, גבול עדין, צל רך, טקסט לימין, נשבר לשורות בלי חיתוך.
- **קישוטים** (מה־Mockup, `aria-hidden`, ללא פעולה): קווי קונפטי צבעוניים ליד הכותרת, סמיילי בתוך בועת דיבור בפינה העליונה, כתמי Lavender/Peach אורגניים בפינות התחתונות. מימוש ב־SVG inline / CSS, `position: fixed`/absolute, `pointer-events: none`, לא מכסים תוכן.
- **לא לממש:** מסגרת מכשיר, את הכותרת שמעל המסגרת בתמונות, לוגו מותג, תמונת איור, ניווט.

## 5. בדיקות עצמיות בזמן הבנייה

אין Framework בדיקות ב־Milestone 1 (בדיקות Mock מתוכננות ב־Milestone 2). אימות:
1. `npm run build` ו־`npm run lint` (כולל TypeScript) עוברים.
2. בדיקת API ישירה (`curl`): נושא „חתולים”, גוף ריק, `"   "`, נושא באנגלית (למשל `"dogs"`), `topic: 123` → 400, JSON פגום → 400.
3. בדיקה בדפדפן המובנה (רוחב מובייל): מצב פתיחה ללא כרטיס וללא בקשה ברשת; המתנה; הצלחה; לחיצות מהירות → בקשה אחת בלבד (Network); תקלה — ע"י הרצה זמנית עם `OPENAI_MODEL` לא קיים בסביבת ההרצה (בלי לגעת ב־`.env`), ואחר כך ניסיון נוסף שמצליח.
4. השוואה חזותית מול `mockups.png`.
5. חיפוש המחרוזת `OPENAI_API_KEY` / `sk-` ב־`.next/static` — אין תוצאות.
6. תיעוד הבדיקות החיות (נושא, שפה, תוצאה) בסיכום למשתמש.

## 6. סיום הבנייה

- עדכון `CLAUDE.md` → „פקודות הרצה”: dev `npm run dev`, test „אין (בשלב זה)”.
- ADR-1 (מודל) ו־ADR-2 (`.env`) תחת `## החלטות מרכזיות (ADRs)` בסוף `ARCHITECTURE.md`.
- סימון 🟡 ליד Milestone 1 ב־`MILESTONES.md`.
- סגירת השרת שהורץ לבדיקה. בלי commit.
- סעיף DoD „קוד המקור נשמר ב־GitHub” יושלם בשלב הדחיפה, לאחר בקשת המשתמש וקבלת כתובת ה־repo.

## 7. מה צריך מהמשתמש
- אישור המודל (סעיף 0א).
- מפתח פיתוח של OpenAI — המשתמש ממלא בעצמו ב־`.env` (לא להדביק בשיחה), יחד עם `OPENAI_MODEL`.
- כתובת repo ב־GitHub — רק בשלב הדחיפה.
