# ARCHITECTURE — אתר בדיחות בעברית

תאריך המחקר: 21 באוקטובר 2026. בסיס הדרישות: מסמך ה־PRD של אתר הבדיחות שנקרא לצורך תכנון זה.

## 1. Technology Stack שנבחר

| רכיב | בחירה | אחריות |
|---|---|---|
| Frontend | React עם Next.js App Router ו־TypeScript | מסך יחיד, ניהול מצב הטופס והצגת בדיחה |
| עיצוב | CSS Modules ו־CSS רגיל | Responsive UI, עברית ו־RTL |
| Backend | Next.js Route Handler ב־Node.js 24.x | API יחיד, אימות קלט, הפעלת AI וטיפול בשגיאות |
| יצירת בדיחות | מודל OpenAI נתמך (מוגדר ב־OPENAI_MODEL) באמצעות Responses API | יצירת בדיחה בעברית לפי כללי ה־PRD |
| חיבור ל־OpenAI | חבילת openai הרשמית ל־TypeScript | קריאות ל־Responses ול־Moderation מהשרת בלבד |
| בדיקת תוכן | OpenAI Moderation API, מודל omni-moderation-latest | בדיקת פלט לפני הצגתו; רכיב מימוש של דרישת התוכן הקיימת |
| PWA | Web App Manifest ו־HTTPS | התקנה באמצעות יכולות הדפדפן |
| Hosting | Vercel: CDN ו־Functions עם Fluid Compute | פריסה אחת של Frontend ו־Backend |
| הגנת שימוש | Vercel WAF Rate Limiting | צמצום ניצול לרעה של נקודת ה־API הציבורית |
| קוד ופריסה | Git, GitHub והאינטגרציה הישירה של Vercel | Version Control, Preview ו־Deployment אוטומטי |
| נתונים | זיכרון זמני בלבד | אין Database, אין Local Storage לנתוני משתמש ואין שירות אחסון קבצים |

### נימוקי הבחירה

נבחנו Next.js, React עם Vite ו־Astro עבור שכבת ה־Web; Route Handlers לעומת Functions נפרדות או Express עבור ה־Backend; ו־Vercel מול Netlify ו־Cloudflare עבור Hosting. נבחנו גם SDK רשמי, fetch ישיר ו־Vercel AI SDK לחיבור ל־AI. אין צורך להשוות מסדי נתונים או ספקי Authentication: שני התחומים אינם נדרשים במוצר.

Next.js נבחר משום שהוא מרכז את המסך ואת ה־API באותו פרויקט, עם סביבת פיתוח אחת ואותו Origin. Vite הוא חלופה טובה לממשק קטן, אך דורש לחבר בנפרד את סביבת ה־Backend; Astro מתאים גם הוא אך אינו מעניק יתרון מהותי לזרימת הטופס הזו. אין צורך בשרת Express נוסף. ההכרעה היא הנדסית בהתאם למוצר, ולא טענה שפתרון אחד תמיד מהיר או נפוץ מהאחרים. [1–4]

Vercel מתאים לבקשות Stateless קצרות יחסית ומספק חיבור ישיר ל־GitHub בהתאם להעדפה שניתנה. Netlify ו־Cloudflare מאפשרים אף הם פריסה מ־Git; אין במוצר דרישה המצדיקה סטייה מהעדפת Vercel. GitHub Pages לבדו אינו מספיק, משום שהמוצר מחייב Backend לשמירת הסוד. [5–7]

ה־SDK הרשמי נבחר עבור ספק AI אחד קבוע, ללא שכבת abstraction נוספת. אין צורך ב־Agents, ב־AI Gateway, ב־RAG, ב־Vector Database או בספריית Chat. CSS Modules מספיקים למסך אחד ואינם דורשים ספריית רכיבים או Framework לעיצוב. התיעוד הרשמי של Next.js ושל OpenAI כולל מדריכים ודוגמאות הרלוונטיים לפיתוח באמצעות AI. [1, 8, 9]

### גרסאות ותאימות

יש להשתמש בענף Stable נתמך של Next.js ובגרסת React הנתמכת על ידו, עם TypeScript וגרסת SDK יציבה תואמת. Next.js 16 הוא בסיס התכנון; אין להשתמש ב־Canary או ביכולות Experimental. Node.js יוגדר במפורש כ־24.x בפיתוח וב־Vercel. הגרסאות המדויקות יינעלו ב־package-lock.json; Build יבוצע באמצעות npm ci. אין לקבע במסמך מספר Patch שהופך במהירות למיושן. [10]

### בחירת המודל ומחזור החיים שלו

GPT-5 (gpt-5-2025-08-07) מסומן Deprecated, ודף Deprecations מציין את הסרתו ב־11 בדצמבר 2026. לכן אין להשתמש בו במוצר. [11, 12]

מזהה המודל ייקרא מתצורת השרת OPENAI_MODEL בלבד; הקוד אינו מכיר שם מודל קבוע. בתחילת Milestone 1 ייבחר המודל הראשוני לפי הכללים הבאים, והבחירה תוצג למשתמש לאישור ותתועד כ־ADR:

- מודל טקסט של OpenAI שנתמך ב־Responses API, זמין לחשבון ואינו מופיע בדף Deprecations.
- עדיפות למודל מהיר וזול המתאים לטקסט קצר, ולא למודל ה־Reasoning החזק ביותר.
- בדיקה מדגמית שהמודל מייצר בדיחות בעברית תקינה ונקייה.

אין מעבר אוטומטי למודל אחר בזמן ריצה. אם המודל המוגדר אינו זמין, יוצג כישלון היצירה הרגיל. החלפת מודל בעתיד היא שינוי של OPENAI_MODEL ו־Deployment חדש, ללא שינוי קוד; כדאי לבדוק את דף Deprecations מדי כמה חודשים.

## 2. מבנה המערכת ואחריות הרכיבים

האפליקציה תיפרס כיחידה אחת: מסך ראשי הניתן להגשה סטטית, ולצדו API דינמי. ה־Frontend אינו מכיר את פרטי OpenAI.

| Module | אחריות | תלות |
|---|---|---|
| Presentation | תיבת נושא, לחצן, תוצאה וחיווי מצב | API מקומי בלבד |
| Client Request | שליחת POST, נעילת בקשה וטיפול ב־Timeout | fetch ו־AbortController |
| API Boundary | אימות HTTP ו־JSON, נרמול קלט והחזרת חוזה אחיד | Joke Service |
| Joke Service | בניית הנחיות, יצירה, בדיקת תוכן ו־fallback | OpenAI Adapter |
| OpenAI Adapter | הפעלת SDK, סודות ו־Timeout של קריאות חיצוניות | OpenAI |
| Platform Configuration | HTTPS, תצורה, WAF ופריסה | Vercel ו־GitHub |

אלה גבולות לוגיים בתוך פרויקט אחד; אין Microservices, Queue, שרת קבוע, WebSocket או Background Job.

## 3. Frontend וחוויית המשתמש

- מסמך HTML יוגדר עם lang="he" ו־dir="rtl".
- רכיב Client יחיד ינהל topic, joke, error ואת מצב idle / loading / success / error בזיכרון React.
- אין יצירה בטעינת הדף. רק submit מפורש מפעיל בקשה.
- בזמן loading יש לנעול את הלחצן וגם להשתמש בשומר בקשה פנימי, כדי למנוע שליחה כפולה לפני שה־UI מתעדכן.
- בזמן ההמתנה יוצג „מכינים לך בדיחה…”. בכל כישלון יוצג „לא הצלחנו ליצור בדיחה. נסו שוב”.
- הבקשה משתמשת בערך התיבה בזמן הלחיצה. ה־Frontend לא ישנה את הנושא שהוזן; נרמול יתבצע גם בשרת.
- אזור תוצאה אחד (כרטיס הבדיחה) מציג בכל רגע מצב אחד: הודעת ההמתנה, הבדיחה או הודעת התקלה, לפי DESIGN. אחרי הצלחה, הבדיחה החדשה מחליפה את הקודמת; בכישלון, הודעת התקלה מחליפה את תוכן הכרטיס.
- התוצאה תוצג כטקסט רגיל, עם שמירת ירידות שורה, ללא HTML או Markdown Rendering מהמודל.
- התיבה תהיה בעלת label, ולמצב ההמתנה ולתוצאה יהיה אזור aria-live. העיצוב יתאים למסכים צרים ולמקלדת מובייל.
- אין Redux, ספריית ניהול Server State, היסטוריה או שמירה בין ביקורים.

## 4. Data Model ואחסון

אין ישויות מתמידות או קשרים רלציוניים. כל בקשת בדיחה עצמאית.

| מבנה | שדות | אורך חיים |
|---|---|---|
| JokeRequest | topic: string, שדה אופציונלי | בקשת HTTP אחת |
| JokeResult | joke: string | זיכרון הבקשה ובדיחה נוכחית בדפדפן |
| ApiError | code: string | תשובת שגיאה אחת |
| RequestMetadata | requestId, status, duration, token usage אם קיים | Logs תפעוליים ללא תוכן משתמש |

לא נשמרים נושאים או בדיחות ב־Database, ב־Local Storage, ב־IndexedDB או ב־Cache API. נכסי האפליקציה והאייקונים מנוהלים בקוד ומוגשים דרך Vercel. אין העלאת קבצים ולכן אין צורך ב־Object Storage. אין Database Migrations או פרויקטי Supabase.

## 5. API וזרימת המידע

### חוזה פנימי

POST /api/joke, באותו Origin, עם Content-Type: application/json.

בקשה לדוגמה:

```json
{"topic":"חתולים"}
```

השמטת topic או מחרוזת ריקה, לרבות רווחים בלבד לאחר trim, יפעילו בדיחה כללית. טיפוס שאינו string, לרבות null, יידחה. אין להעביר מהדפדפן model, prompt, API Key או הוראות מערכת.

תשובת הצלחה: HTTP 200.

```json
{"joke":"טקסט הבדיחה בעברית"}
```

תשובת שגיאה מהיישום:

```json
{"error":{"code":"GENERATION_FAILED"}}
```

| HTTP | משמעות |
|---|---|
| 400 | JSON או מבנה קלט לא תקינים |
| 413 | גוף בקשה גדול מהמותר |
| 405 / 415 | שיטה או Content-Type שאינם נתמכים |
| 429 | הגבלת בקשות בתשתית או בשירות החיצוני |
| 502 | כשל ספק, סירוב ללא תוצאה חלופית או פלט לא תקין |
| 504 | חריגה ממשך הבקשה |
| 503 | תצורת שרת חסרה או שירות שאינו זמין |

הלקוח ימפה כל כישלון להודעה שאושרה, גם כש־WAF או התשתית החזירו תשובה שאינה JSON. אין להעביר ללקוח הודעות שגיאה גולמיות של OpenAI. כל תשובה של /api/joke תישלח עם Cache-Control: no-store.

### Data Flow

1. המשתמש שולח את הטופס; הלקוח נועל שליחה נוספת.
2. Vercel WAF בודק הגבלת בקשות לפני הפעלת ה־Function.
3. השרת מאמת JSON, מגביל את גודל הגוף ומבצע trim לנושא.
4. Joke Service בונה הוראות קבועות ומשלב את הנושא כנתון משתמש.
5. OpenAI Adapter קורא ל־Responses API עם המודל המוגדר ב־OPENAI_MODEL.
6. השרת מוודא שהתקבל פלט מלא ולא ריק, ולאחר מכן בודק אותו ב־Moderation.
7. אם הפלט נדחה מטעמי תוכן, השרת מנסה פעם אחת יצירת בדיחה כללית נקייה ובודק גם אותה. אם גם היא נכשלת, מוחזרת שגיאה.
8. מוחזרת רק הבדיחה שאושרה; הלקוח מציג אותה ומשחרר את הלחצן.

אין Streaming: בדיקת התוכן מסתיימת לפני חשיפת הטקסט למשתמש.

## 6. הפעלת AI והתאמת תוכן

Responses API נבחר על פני Chat Completions הנתמך גם הוא, בהתאם להכוונת OpenAI לפיתוח חדש. כל בקשה תישלח ללא היסטוריית שיחה, ללא previous_response_id, עם store: false וללא כלים חיצוניים. [9]

הוראות השרת יחייבו בדיחה אחת בעברית, נקייה ומתאימה גם לילדים. יש להורות להימנע מתוכן מיני מפורש, השפלה והומור פוגעני. כאשר ניתן, הנושא יעובד בצורה נקייה; כשלא ניתן, תיכתב בדיחה כללית. כך למשל, אין לחסום אוטומטית כל נושא רגיש לפני מתן אפשרות לפרשנות נקייה.

נושא המשתמש יועבר בהודעת user נפרדת מהוראות השרת, כטקסט ולא כהוראה לשינוי ההתנהגות. בקשות „התעלם מההוראות” אינן יכולת של המוצר. המודל אינו מקבל סודות, אינו מפעיל Tools ואינו ניגש למקורות חיצוניים.

Moderation תופעל על הפלט באמצעות omni-moderation-latest. תוצאה flagged לא תוצג. השירות מוצע ללא תשלום לפי התיעוד שנבדק. בכשל של בדיקת התוכן לא חושפים פלט שלא נבדק. [13]

Moderation מזהה תוכן מזיק בבירור (אלימות, תוכן מיני, שנאה וכו'), אך אינו מסווג "מתאים לילדים". בדיחה גבולית או לא מנומסת עשויה לעבור אותו. לכן ההגנה העיקרית היא הוראות היצירה, ו־Moderation הוא שכבת ביטחון נוספת. יש לבדוק ידנית את התוצאות על רשימה קבועה של נושאים רגישים (ראה MILESTONES) ולחזק את ההוראות לפי הצורך.

**תצורה הנדסית התחלתית, שאינה דרישת מוצר:** max_output_tokens יהיה 1024 לכל יצירה. אם המודל שנבחר הוא מודל Reasoning, reasoning.effort יוגדר לרמה הנמוכה ביותר שהוא תומך בה, והמגבלה כוללת גם Reasoning Tokens. אין לשלוח פרמטרים (כגון temperature או reasoning) שהמודל שנבחר אינו תומך בהם. אם התשובה incomplete, ריקה או refusal — אין להציגה כבדיחה. סירוב יכול להפעיל את ניסיון הבדיחה הכללית; כשל תקשורת או פלט שנקטע יוחזרו כשגיאה. [11]

## 7. זמני בקשה, אמינות ויכולת צמיחה

**ברירות מחדל טכניות:** גוף בקשה עד 8 KiB; תקציב זמן כולל של 25 שניות בשרת; Timeout לכל קריאת יצירה עד 10 שניות ולכל Moderation עד 4 שניות, ובכל מקרה לא מעבר לזמן שנותר בתקציב. maxDuration של ה־Function יוגדר ל־30 שניות, ו־Timeout של הלקוח ל־30 שניות. בדיחה קצרה אמורה להגיע בתוך שניות ספורות; משתמש, ובמיוחד ילד, לא ימתין דקה ומעלה. אלה גבולות הגנה ולא SLA שהובטח למשתמש. אם בבדיקות במודל שנבחר הזמנים האמיתיים חורגים מהגבולות, יש לעדכן אותם ב־ADR.

הערכים נמוכים בהרבה ממגבלת ה־Function ב־Hobby עם Fluid Compute, ולכן אין צורך ב־Background Job. [14]

ה־SDK יוגדר עם maxRetries: 0 כדי למנוע ניסיונות חיוב חוזרים אוטומטיים. ניסיון תוכן חלופי יחיד הוא חריג מכוון ונכלל בתקציב הזמן. במקרה Timeout, ביטול בקשת הלקוח אינו מבטיח ביטול חיוב שכבר נוצר אצל הספק.

ה־Backend Stateless ויכול לשרת בקשות במופעים מקבילים; זיכרון Function אינו משמש לאחסון או למונה Rate Limit משותף. קיבולת המערכת תלויה גם ב־Rate Limits של חשבון OpenAI ובתוכנית Hosting, ולא רק ב־Scalability של Vercel.

## 8. PWA

יש להגדיר Manifest באמצעות התמיכה המובנית של Next.js: שם תצוגה בעברית, lang: he, dir: rtl, start_url: /, display: standalone ואייקונים 192×192 ו־512×512; יש להוסיף apple-touch-icon ולהגיש באמצעות HTTPS. שם המוצר ב־Manifest הוא „בדיחה לכל”.

אין צורך בתוסף PWA, ב־Service Worker או ב־Offline Cache בגרסה זו: Service Worker אינו תנאי כללי להתקנה בדפדפנים המודרניים, ויצירה ב־Offline הוצאה במפורש מהטווח. אין להוסיף Push Notifications או Background Sync מתוך דוגמאות התיעוד. [15, 16]

ההתקנה תיעשה באמצעות מנגנון הדפדפן. אין להניח שאירוע beforeinstallprompt קיים ב־Safari ב־iOS; שם ההתקנה זמינה דרך הוספה למסך הבית. האתר ימשיך לפעול בדפדפן גם ללא התקנה. בהיעדר חיבור לאחר טעינה, ניסיון יצירה ייכשל בהודעה הרגילה; פתיחה קרה ב־Offline עשויה להציג את הודעת הרשת של הדפדפן. [15, 16]

## 9. אבטחה, גישה ופרטיות

- אין Authentication או Authorization למשתמשי הקצה. ה־API ציבורי בכוונה; אין להוסיף התחברות סמויה או Session.
- מפתח OpenAI ייקרא רק ב־Module המסומן server-only. אין NEXT_PUBLIC_ למפתח, אין הכללתו ב־Bundle, ב־Git, ב־Logs או בתשובות.
- יש לקבל רק POST עם application/json ולדחות Origin שאינו מאושר. Origin מאושר לפי סביבה:
  - Production: הערך שב־APP_ORIGIN.
  - Preview: הכתובת של ה־Deployment הנוכחי, הנגזרת ממשתני המערכת של Vercel (VERCEL_URL ו־VERCEL_BRANCH_URL), כי לכל Preview כתובת שונה.
  - Development: http://localhost בפורט המקומי.
  בדיקת Origin אינה Authentication ואינה חוסמת לקוחות אוטומטיים.
- הפלט יוצג כטקסט; אין dangerouslySetInnerHTML. יש להגדיר את הכותרות X-Content-Type-Options: nosniff, Content-Security-Policy: frame-ancestors 'none' ו־Referrer-Policy: strict-origin-when-cross-origin. אין צורך ב־CSP מלא (עם Nonce לסקריפטים): האתר אינו מציג HTML מהמודל או מהמשתמש, ו־CSP מלא ב־Next.js מוסיף מורכבות ונטייה לתקלות שאינן מוצדקות במוצר זה.
- מומלץ כלל WAF אחד על POST /api/joke לפי IP, למשל 10 בקשות לדקה כברירת מחדל תפעולית. זה אינו חשבון משתמש או מכסת מוצר. IP משותף עלול להשפיע על כמה משתמשים; יש להתאים את הסף לפי שימוש אמיתי. WAF מספק מונים מחוץ לזיכרון ה־Function ללא Database באפליקציה. זמינות ותמחור הכלל כפופים לתוכנית. [17]
- אין לרשום נושאים, בדיחות, Prompts או מפתחות ב־Logs. ניטור יתמקד בסטטוס, משך, Request ID ושימוש Tokens. נתוני IP ו־Logs תשתיתיים עשויים להישמר אצל Vercel לפי תצורת השירות.
- store: false מצמצם שמירת Response State אך אינו Zero Data Retention. לפי OpenAI, נתוני API אינם משמשים לאימון כברירת מחדל, ו־Abuse Monitoring עשוי לשמור מידע עד 30 יום. היעדר Database באפליקציה אינו משמעו שאין עיבוד או שמירה אצל הספקים. [18]

## 10. GitHub, סביבות ו־Deployment

קוד המקור ינוהל ב־GitHub Repository אחד, רצוי פרטי, עם package-lock.json ו־.env.example ללא סודות. אין צורך ב־Monorepo, Docker או תשתית נפרדת.

| סביבה | הרצה | פרטי גישה |
|---|---|---|
| Development | Next.js מקומי | מפתח פיתוח נפרד ב־.env.local, המוחרג מ־Git |
| Preview | Vercel מענפי עבודה | מפתח פיתוח ב־Environment Variables של Preview; ללא מפתח Production |
| Production | Vercel מענף main | מפתח Production רק ב־Environment Variables של Production |

תצורת השרת תכלול OPENAI_API_KEY, OPENAI_MODEL (המודל שנבחר ואושר ב־Milestone 1) ו־APP_ORIGIN (נדרש ב־Production בלבד). גבולות זמן ופלט יוגדרו כתצורה פנימית עם ברירות המחדל שתוארו. Production ו־Preview לא ישתמשו באותו מפתח. שינוי Environment Variables יוחל באמצעות Deployment חדש. [19]

חיבור ה־Repository ל־Vercel ייצור Preview בעקבות Push לענף עבודה ו־Production Deployment בעקבות עדכון main. Vercel יבצע npm ci, בדיקות TypeScript ו־Lint, ואת next build; כישלון יכשיל את ה־Deployment. אין צורך לבצע קריאות AI אמיתיות בזמן Build. קוד המסך ונכסי PWA יופצו דרך CDN וה־Route Handler כ־Node.js Function. [5]

בדיקות חוזה וזרימה ישתמשו ב־Mock של OpenAI לכיסוי נושא, תיבה ריקה, נעילת שליחה, Timeout ו־fallback תוכן. בדיקות אינטגרציה חיות, ככל שנדרשות, ירוצו עם מפתח הפיתוח ולא כחלק אוטומטי מכל Build. זו מדיניות אימות טכנית, לא Milestones.

אין להפעיל הגנת כניסה של Vercel על Production הפתוח לקהל. ניתן להגן על Preview. Rollback יחזיר Deployment קודם, תוך בדיקת התאמת התצורה הפעילה; אין נתונים או Migrations לתאם.

## 11. עלויות ומגבלות

| רכיב | משמעות כלכלית |
|---|---|
| ספריות | Next.js, React, TypeScript ו־SDK רשמי אינם דורשים דמי רישוי לשימוש רגיל |
| Vercel Hobby | 0 דולר לחודש בגבולות התוכנית; מתאים לשימוש אישי ולא מסחרי בלבד. חריגה עשויה להשעות יכולת עד לחידוש המכסה |
| Vercel Pro | מחיר התחלתי מוצג של 20 דולר לחודש, עם חיובים אפשריים לפי שימוש ומושבי מפתחים |
| מודל ה־AI | לפי מחירון המודל שייבחר. לשם השוואה, GPT-5 תמחר 1.25 דולר Input ו־10 דולר Output לכל מיליון Tokens; מודלים קטנים ומהירים זולים בדרך כלל משמעותית. Reasoning Tokens, אם קיימים, נכללים בחיוב Output |
| Moderation | השירות מתועד כחינמי |
| WAF | יש לבדוק את החיוב לפי תוכנית והיקף בדף התמחור; אין להניח ש־Rate Limiting אינו עולה כסף |
| Database ו־Storage חיצוני | אינם נדרשים |

מחירי Hosting ו־AI נפרדים, בדולר ולפני מסים, ונכונים לבדיקה זו. לצורך שימוש אישי לא מסחרי אפשר להתחיל ב־Hobby; שימוש מסחרי מחייב תוכנית המתירה זאת. לא הוגדר אופי מסחרי או תקציב, ולכן אין התחייבות לעלות חודשית כוללת. [6, 11, 13, 20, 21]

**דוגמת חישוב בלבד, לפי מחירי GPT-5:** בקשת יצירה עם 300 Input Tokens ו־200 Output Tokens מחויבים עולה כ־0.002375 דולר; 1,000 בקשות כאלה כ־2.38 דולר. זה אינו אומדן לתעבורה צפויה: Reasoning, ניסיונות fallback ואורכי קלט שונים משנים את הסכום.

יש להגדיר התראות שימוש אצל OpenAI ו־Vercel. התראת תקציב אינה בהכרח חסימה קשיחה; אין להבטיח תקרת הוצאה אוטומטית שאינה נאכפת בתוכנית. מניעת הוצאות נשענת גם על Rate Limit, הגבלת Tokens ויכולת המפעיל להשבית את ה־API.

## 12. מקורות רשמיים

המקורות נבדקו ב־21 באוקטובר 2026. הנימוקים ההנדסיים הם מסקנות לתכנון המוצר; המחירים והמגבלות הם פרטי שירות שעשויים להשתנות.

1. [Next.js — Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
2. [Vite — Guide](https://vite.dev/guide/)
3. [Astro — On-demand rendering](https://docs.astro.build/en/guides/on-demand-rendering/)
4. [Express — Official documentation](https://expressjs.com/)
5. [Vercel — GitHub integration](https://vercel.com/docs/git/vercel-for-github)
6. [Vercel — Hobby plan](https://vercel.com/docs/plans/hobby)
7. [Netlify — Pricing](https://www.netlify.com/pricing/) ו־[Cloudflare — Developer Platform pricing](https://www.cloudflare.com/plans/developer-platform/)
8. [OpenAI — Official Node.js SDK](https://github.com/openai/openai-node) ו־[Vercel AI SDK](https://ai-sdk.dev/docs/introduction)
9. [OpenAI — Text generation](https://developers.openai.com/api/docs/guides/text)
10. [Vercel — Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
11. [OpenAI — GPT-5 model, capabilities and pricing (להשוואה)](https://developers.openai.com/api/docs/models/gpt-5)
12. [OpenAI — Deprecations](https://developers.openai.com/api/docs/deprecations)
13. [OpenAI — Moderation](https://developers.openai.com/api/docs/guides/moderation)
14. [Vercel — Functions limits](https://vercel.com/docs/functions/limitations)
15. [Next.js — PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
16. [MDN — Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
17. [Vercel — WAF Rate Limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
18. [OpenAI — Data controls](https://developers.openai.com/api/docs/guides/your-data)
19. [Vercel — Environment variables](https://vercel.com/docs/environment-variables)
20. [Vercel — Pricing](https://vercel.com/pricing)
21. [Vercel — WAF usage and pricing](https://vercel.com/docs/vercel-firewall/vercel-waf/usage-and-pricing)

## החלטות מרכזיות (ADRs)

### ADR-1: בחירת מודל ה־AI — gpt-5.6-luna
**הקשר:** ARCHITECTURE מחייב לבחור בתחילת Milestone 1 מודל טקסט נתמך ב־Responses API, שאינו ב־Deprecations, מהיר וזול. בבדיקה ב־21.10.2026 המודלים הקטנים הקודמים (gpt-5-mini, gpt-5-nano, gpt-4.1-mini, gpt-4o-mini, gpt-5.1) מסומנים Deprecated.
**החלטה:** `OPENAI_MODEL=gpt-5.6-luna` (אושר על ידי המשתמש). זהו מודל Reasoning; לכן נשלח `reasoning.effort: "none"` — הרמה הנמוכה ביותר שהוא תומך בה. לא נשלח `temperature`.
**השלכות:** עלות נמוכה (0.20$ / 1.20$ למיליון Tokens) וזמני תגובה של 2–4 שניות בבדיקה. ערך `reasoning.effort` קבוע בקוד; החלפה למודל שאינו תומך ב־`"none"` תחייב שינוי קטן בקוד. בבדיקה נצפו בדיחות חוזרות לאותו נושא — מותר לפי ה־PRD (אין התחייבות למניעת חזרות).

### ADR-2: קובץ סודות מקומי `.env`
**הקשר:** ARCHITECTURE מזכיר `.env.local`, וכללי העבודה בפרויקט מורים על `.env` שנוצר מ־`.env.example`.
**החלטה:** משתמשים ב־`.env`. Next.js טוען אותו באותו אופן, והוא מוחרג מ־Git ב־`.gitignore`.
**השלכות:** אין שינוי בהתנהגות או באבטחה. שינוי ב־`.env` מחייב הפעלה מחדש של שרת הפיתוח.

### ADR-3: Next.js 16 עם Cache Components
**הקשר:** תבנית `create-next-app` של Next.js 16.4 מפעילה `cacheComponents` כברירת מחדל, ובמצב זה אסור לייצא `runtime` מ־Route Handler.
**החלטה:** נשמרה ברירת המחדל; ה־Route Handler רץ ב־Node.js כברירת מחדל ללא `export const runtime`, עם `maxDuration = 30`.
**השלכות:** המסך מוגש כסטטי וה־API דינמי, כמתוכנן ב־ARCHITECTURE.

### ADR-4: Vitest לבדיקות עם Mock
**הקשר:** Milestone 2 מחייב בדיקות Mock לזרימת התוכן, ל־fallback, לתקציב הזמן, לחוזה ה־API ולטיפול בתקלות בלקוח. בפרויקט לא היה כלי בדיקות.
**החלטה:** Vitest כ־devDependency, עם `vitest.config.mts` ובדיקות בתיקייה `tests/`; מריצים עם `npm test`. OpenAI, ה־Joke Service ו־fetch מוחלפים ב־Mock; החבילה `server-only` ממופה למודול ריק בבדיקות.
**השלכות:** אין קריאות AI חיות בבדיקות האוטומטיות ואין השפעה על ה־Bundle. בדיקות אינטגרציה חיות נשארות ידניות, עם מפתח הפיתוח.

### ADR-5: דחיית Origin — קוד 403, ו־Origin חסר נדחה
**הקשר:** סעיף 9 מחייב לדחות Origin שאינו מאושר, אך טבלת הקודים בסעיף 5 אינה מגדירה קוד לכך.
**החלטה:** Origin שאינו ברשימה, או בקשה בלי Origin, מקבלים 403 עם `{"error":{"code":"FORBIDDEN_ORIGIN"}}`. הרשימה: `APP_ORIGIN`, ‏`https://` + `VERCEL_URL` / `VERCEL_BRANCH_URL`, וב־Development בלבד `http://localhost:<PORT או 3000>`. הבדיקה מתבצעת לפני כל בדיקה אחרת של הבקשה.
**השלכות:** דפדפנים שולחים Origin בכל POST, ולכן המסך אינו מושפע. כלים כמו curl חייבים לשלוח כותרת Origin מאושרת. בהרצת Production מקומית (`npm start`) יש להגדיר `APP_ORIGIN` לכתובת המקומית.
