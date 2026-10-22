# פריסה — בדיחה לכל

## כתובות

| סביבה | כתובת | מאיפה מתעדכנת |
|---|---|---|
| Production (האתר הציבורי) | https://jokes-for-everyone.vercel.app | כל עדכון של הענף `main` ב־GitHub |
| Preview (גרסאות בדיקה) | כתובת חדשה לכל עדכון, מופיעה ב־Vercel ← Deployments | כל ענף אחר (למשל `milestone-3`). מוגנת בהתחברות ל־Vercel |

פרויקט Vercel: `sharol/jokes-for-everyone`, תוכנית Hobby (חינמית, לשימוש אישי ולא מסחרי).

## תצורה

**משתני סביבה ב־Vercel** (Settings ← Environment Variables) — שמות בלבד, ללא ערכים:

| משתנה | סביבות | הערה |
|---|---|---|
| `OPENAI_API_KEY` | Production, Preview, Development | מפתח אחד לכל הסביבות (ADR-8). המפתח שייך לחשבון OpenAI של המורה |
| `OPENAI_MODEL` | — (לא מוגדר) | אופציונלי. ברירת המחדל בקוד: `gpt-5.6-luna` (ADR-7) |
| `APP_ORIGIN` | — (לא מוגדר) | אופציונלי. הכתובת הראשית נלקחת אוטומטית מ־Vercel (ADR-7) |

שינוי משתנה נכנס לתוקף רק אחרי Deployment חדש (Deployments ← ⋯ ← Redeploy).

**הגדרות פרויקט:** Node.js 24.x · Fluid Compute פעיל · Production Branch = `main` · ה־Build מוגדר ב־`vercel.json`: ‏`npm ci`, ואז Lint, בדיקות ו־Build. כשל באחד מהם עוצר את הפריסה.

**Firewall:** כלל `api-joke-rate-limit` — ‏POST ל־`/api/joke`, ‏10 בקשות לדקה לכל IP (Fixed Window), חריגה מקבלת 429 Too Many Requests.

**התראות עלות:** OpenAI — לא הוגדרה; המפתח שייך למורה, וההחלטה על תקציב או התראה היא שלו. Vercel Hobby — אין חיוב; בחריגה Vercel שולח מייל ועוצר זמנית את השירות. התראה אינה תקרת חיוב.

## Deployment תקין אחרון

| תאריך | Commit | ענף | נבדק |
|---|---|---|---|
| 22.10.2026 | `b62cf4a` | `main` | בדיחה עם נושא ובלי נושא, Manifest ואייקונים, כותרות אבטחה, דחיית Origin זר, הגבלת בקשות, התקנה ומצב טיסה ב־iPhone (Safari). **לא נבדק:** התקנה ב־Android (Chrome) |

## חזרה לגרסה קודמת (Rollback)

1. Vercel ← הפרויקט ← **Deployments**.
2. מצאי את ה־Deployment התקין (לפי ה־Commit בטבלה למעלה), לחצי **⋯** ← **Instant Rollback** (או **Promote to Production**).
3. ודאי שמשתני הסביבה עדיין מתאימים לגרסה הזו (אין Database או נתונים לתאם).
4. פתחי את האתר ונסי ליצור בדיחה.

## השבתה מהירה במקרה חירום

- הסרת `OPENAI_API_KEY` מ־Production ו־Redeploy — האתר יציג את הודעת התקלה הרגילה ולא יבצע קריאות AI.
- או ביטול המפתח בחשבון OpenAI (על ידי בעל החשבון) — משבית את כל הסביבות יחד.
