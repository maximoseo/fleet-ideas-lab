/**
 * Hebrew overlay for the STATIC English prose in the fleet data (fleet.ts, ideas-engine.ts).
 *
 * This file only adds translations; it never edits the English source. Slugs, dashboard and
 * product names, URLs, domain tags, numbers and technical terms (GA4, GSC, WHM, cPanel, SERP,
 * CWV, n8n, Slack, PDF ...) stay in Latin. `prompt` fields on ideas are agent-facing build
 * prompts and are intentionally left in English (no overlay entry).
 *
 * Use the localize* helpers: they return the input unchanged for "en" or when no overlay entry
 * exists, and a shallow copy with the Hebrew fields applied for "he".
 */
import { statusExplainer, statusLabel } from "./fleet";
import type { FleetStatus } from "./fleet";
import { AUDIT_BASIS } from "./ideas-engine";

export type Lang = "en" | "he";

export interface HeProject {
  description?: string;
  plainExplainer?: string;
}

export interface HeIdea {
  title?: string;
  whyNow?: string;
  description?: string;
  problem?: string;
  solution?: string;
  benefit?: string;
  dataNeeded?: string;
  feasibility?: string;
  nextStep?: string;
  evidence?: string;
  widgets?: string[];
  iaSketch?: string[];
  dataSources?: string[];
}

// ───────────────────────── FLEET_INVENTORY ─────────────────────────
export const HE_PROJECTS: Record<string, HeProject> = {
  "fleet-hub": {
    description: "Fleet Hub — שליטה וניווט מרכזיים בצי",
    plainExplainer: "הכניסה הראשית לצי שלכם — כל הדשבורדים במקום אחד, וקפיצה לכל אחד מהם בלחיצה אחת.",
  },
  "fleet-ideas-lab": {
    description: "Fleet Ideas Lab — מלאי, מכ״ם פערים ומנוע רעיונות (האפליקציה הזו)",
    plainExplainer: "מכ״ם הרעיונות והפערים של כל הצי — מאתר מה חסר והופך את זה לבריף בנייה שאפשר להדביק לסוכן.",
  },
  "schema-studio": {
    description: "Schema Studio — עורך JSON-LD, מאמת ותצוגה מקדימה של תוצאות עשירות",
    plainExplainer: "תקנו את הנתונים המובנים שלכם לפני שגוגל יזהה בעיות — ערכו, אמתו וצפו בתצוגה מקדימה של תוצאות עשירות.",
  },
  "content-automation": {
    description: "Content Automation — צינור תוכן מקצה לקצה",
    plainExplainer: "הופך מילות מפתח לטיוטות באופן אוטומטי — בריף, מבנה ופרסום בלי שלבים ידניים.",
  },
  "report-engine": {
    description: "Report Engine — דוחות SEO ותפעול אוטומטיים",
    plainExplainer: "בונה ללקוחות דוחות SEO ותפעול לפי לוח זמנים — בלי להתעסק עם גיליונות אלקטרוניים.",
  },
  sitewatch: {
    description: "SiteWatch — ניטור זמינות ושינויים",
    plainExplainer: "עוקב אחרי זמינות ושינויים באתרים שלכם — ומתריע לפני שהלקוחות מבחינים.",
  },
  sitewatch2: {
    description: "SiteWatch 2 — ניטור אתרים מהדור הבא",
    plainExplainer: "SiteWatch חדש יותר — אותו מעקב אחר זמינות ושינויים, עם בדיקות עדכניות יותר.",
  },
  "site-intel-dashboard": {
    description: "Site Intel Dashboard — מודיעין ליבה על סריקה, אינדוקס ו-SERP",
    plainExplainer: "מראה איך האתר שלכם נסרק, נאנדקס ומדורג — מקום אחד לסריקה, אינדוקס ו-SERP.",
  },
  "fleet-command-center": {
    description: "Fleet Command Center — פיקוד וניתוב תפעוליים",
    plainExplainer: "לוח פיקוד תפעולי — ניתוב משימות וסטטוס הצי במבט אחד.",
  },
  "seo-analytics-hub": {
    description: "SEO Analytics Hub — אנליטיקה מאוחדת של GA4 ו-GSC",
    plainExplainer: "משלב GA4 ו-GSC בתצוגה אחת — תנועה, שאילתות ועמודים זה לצד זה.",
  },
  "seo-dashboard": {
    description: "SEO Dashboard — סקירת SEO קלילה",
    plainExplainer: "סקירת SEO קלילה — תמונת מצב מהירה על התקינות, בלי צלילה לעומק.",
  },
  "prompt-forge-code": {
    description: "Prompt Forge Code — יצירת קוד וכלי פרומפטים",
    plainExplainer: "בונה ובודק פרומפטים לבינה מלאכותית וקטעי קוד — ניהול גרסאות, הרצה והשוואה.",
  },
  "loop-engineering-dashboard": {
    description: "Loop Engineering — לולאות אוטומציה ומשוב",
    plainExplainer: "מתכנן ומנטר לולאות אוטומציה — משוב וניסיונות חוזרים בזמן אמת.",
  },
  "prompt-forge": {
    description: "Prompt Forge — ספריית פרומפטים ויצירתם",
    plainExplainer: "ספריית הפרומפטים שלכם — שמירה, ניהול גרסאות ושימוש חוזר בפרומפטים בכל הצי.",
  },
  "github-repos-radar": {
    description: "GitHub Repos Radar — תקינות ופעילות של מאגרי קוד",
    plainExplainer: "עוקב אחרי מאגרי ה-GitHub שלכם — פעילות, תקינות ומה שהתיישן.",
  },
  "dashboards-panel": {
    description: "Dashboards Panel — פורטפוליו של כל דשבורדי Maximo",
    plainExplainer: "גלריה של כל דשבורדי Maximo — תצוגת פורטפוליו עם תקינות.",
  },
  "design-lab": {
    description: "Design Lab — Style Arena, Slop Detector ומוקאפים (Premium Editorial)",
    plainExplainer: "מגרש משחקים לעיצוב — טוקנים, מוקאפים ו-Slop Detector למראה עריכתי פרימיום.",
  },
  "local-seo-dashboard": {
    description: "Local SEO Dashboard — GBP, ציטוטים ו-Local Pack",
    plainExplainer: "Local Pack, GBP וציטוטים במקום אחד — דעו איפה אתם עומדים מקומית.",
  },
  "competitor-intelligence-dashboard": {
    description: "Competitor Intelligence Dashboard — מודיעין תחרותי (קנוני)",
    plainExplainer: "אותו מודיעין כמו למעלה, בתצוגה הקנונית — נשמר כפרויקט נפרד עם כינוי (alias) משלו.",
  },
  "ai-visibility-dashboard": {
    description: "AI Visibility — נראות GEO/AEO ונראות בתשובות AI",
    plainExplainer: "עוקב אחרי האופן שבו תשובות בינה מלאכותית רואות אתכם — נראות GEO/AEO מעבר לדירוג הקלאסי.",
  },
  "central-brain-dashboard": {
    description: "Central Brain — המוח האנליטי המרכזי",
    plainExplainer: "המוח האנליטי המרכזי — מאגד אותות מכל רחבי הצי.",
  },
  "brain-dashboard-maximo-seo": {
    description: "Brain Dashboard — המוח של Maximo (כינוי brain.maximo-seo.ai)",
    plainExplainer: "אותו מוח, כינוי אחר — המרכז הראשי תחת brain.maximo-seo.ai.",
  },
  "agent-fleet": {
    description: "Agent Fleet — צי של סוכני AI",
    plainExplainer: "מנהל את סוכני ה-AI שלכם — מי רץ איפה ועל מה.",
  },
  "seo-dashboard-work": {
    description: "SEO Dashboard Work — דשבורד SEO בעבודה",
    plainExplainer: "דשבורד SEO עובד — בנייה איטרטיבית לפני שהוא הופך לקנוני.",
  },
  "subscription-quota-hq": {
    description: "Subscription Quota HQ — בקרת מכסות ומנויים",
    plainExplainer: "שולט במנויים ובמכסות — ראו את המגבלות לפני שאתם פוגעים בהן.",
  },
  "traffic-sim-dashboard": {
    description: "Traffic Sim — מעבדת הדמיית תנועה",
    plainExplainer: "מדמה תנועה — בדקו איך שינויים מתנהגים לפני שהם עולים לאוויר.",
  },
  "indexer-dashboard": {
    description: "Indexer — אינדוקס ו-Crawl Budget",
    plainExplainer: "מנהל אינדוקס ו-Crawl Budget — מה מאונדקס ומה תקוע.",
  },
  "agentic-os-dashboard": {
    description: "Agentic OS — מערכת הפעלה אג׳נטית",
    plainExplainer: "מערכת ההפעלה לסוכנים שלכם — מריצה ומנטרת זרימות עבודה של סוכנים.",
  },
  "rep-center": {
    description: "Rep Center — מרכז מוניטין וביקורות",
    plainExplainer: "מרכז מוניטין — ביקורות ו-NAP בכל הספריות העסקיות במקום אחד.",
  },
  "content-decay-dashboard": {
    description: "Content Decay — זיהוי דעיכה ותור רענון",
    plainExplainer: "מאתר תוכן שדועך — מה איבד תנועה ומה לרענן קודם.",
  },
  "service-vault": {
    description: "Workspace Hub — סביבת עבודה של Smartsheet וכלים מחוברים",
    plainExplainer: "גיליונות, דשבורדים, דוחות ותיקיות של Smartsheet, עם כלים מחוברים.",
  },
  "status-page": {
    description: "Status Page — תקינות וסטטוס הצי",
    plainExplainer: "סטטוס ציבורי של הצי — זמינות במבט אחד ללקוחות ולתפעול.",
  },
  "clients-automation-dashboard": {
    description: "Clients Automation — אוטומציות ללקוחות (automations.maximo-seo.ai)",
    plainExplainer: "מבצע אוטומציה לתפעול לקוחות — משימות חוזרות בלי הרצות ידניות.",
  },
  "wp-command-center": {
    description: "WP Command Center — פיקוד על צי WordPress",
    plainExplainer: "מפקד על צי הוורדפרס שלכם — פעולות המוניות מלוח אחד.",
  },
  "site-vault": {
    description: "Site Vault — מלאי אתרים וכספת",
    plainExplainer: "כספת מלאי האתרים שלכם — כל אתר, סטאק ומצב תקינות ברשימה אחת.",
  },
  "n8n-dashboard-v3": {
    description: "n8n Dashboard — אוטומציית תהליכי עבודה (n8n.maximo-seo.ai)",
    plainExplainer: "תהליכי ה-n8n שלכם — הרצות, כשלים וטריגרים בדשבורד אחד.",
  },
};

// ───────────────────────── IDEAS (FLEET_IDEAS + FLEET_GENERATED_POOL + IDEA_POOL) ─────────────────────────
export const HE_IDEAS: Record<string, HeIdea> = {
  // ── FLEET_IDEAS: white-space ──
  "anomaly-explain-engine": {
    title: "מנוע הסברת אנומליות",
    whyNow: "לקוחות מתעלמים מהתראות שהם לא מבינים — פער בהסברתיות.",
    widgets: ["ציר זמן אנומליות", "סיבת שורש", "הערכת השפעה", "פעולה מוצעת"],
    description: "הופך אנומליות ב-GA4/GSC להסברים בשפה פשוטה, עם השפעה ותיקון.",
    problem: "לקוחות מתעלמים מהתראות שהם לא מבינים — אנומליה בלי הסבר היא רעש.",
    solution: "מנוע: ציר זמן אנומליות + סיבת שורש באמצעות LLM + הערכת השפעה (תנועה/הכנסות) + פעולה מוצעת בלחיצה אחת.",
    benefit: "התראות הופכות להחלטות — MTTR קצר יותר ופחות הסלמות.",
    dataNeeded: "זרם אנומליות מ-GA4 + GSC ו-LLM לזיהוי סיבת שורש (כספת: יוגדר בהמשך)",
    feasibility: "גדול — LLM וזיהוי אנומליות הם החלקים הקשים",
    nextStep: "להקים שלד ← לשלוח קודם ציר זמן והשפעה, וזיהוי סיבת שורש ב-LLM בשלב 2",
    evidence: "נבדק בביקורת מ-2026-08-15 (37 דשבורדים): analytics×alerts = 1/6 (17% כיסוי) — רק report-engine מכסה התראות באופן דל. ב-5 מתוך 6 דשבורדי האנליטיקה אין התראות.",
  },
  "outreach-inbox-commander": {
    title: "מפקד תיבת Outreach",
    whyNow: "תגובות נקברות בתיבת Gmail משותפת — ל-outreach נדרשת תיבה ייעודית.",
    widgets: ["רשימת שרשורים", "ציון תגובה", "טיימר מעקב", "הזרקת תבנית"],
    description: "תיבת outreach מסונכרנת ל-Gmail עם ניבוי תגובות ומעקבים אוטומטיים.",
    problem: "בוני קישורים מאבדים תגובות ברעש של Gmail — אין תיבת outreach ייעודית עם תעדוף.",
    solution: "Inbox Commander: רשימת שרשורים עם ציון סבירות תגובה + טיימר מעקב + הזרקת תבנית.",
    benefit: "להחזיר תגובות שאבדו ולחתוך בחצי את עבודת המעקב המיותרת.",
    dataNeeded: "סנכרון Gmail API + מודל ניבוי תגובות (כספת: יוגדר בהמשך)",
    feasibility: "בינוני — סנכרון Gmail פשוט, הדירוג הוא P2",
    nextStep: "להקים שלד לדשבורד חדש outreach-inbox-commander (outreach×automation הוא 0% מרחב לבן) ← קודם סנכרון Gmail",
    evidence: "נבדק בביקורת מ-2026-08-15 (37 דשבורדים): outreach×automation = 0/2 (8% נגזר) — שני דשבורדי ה-outreach הם אנליטיקה בלבד (competitor-intel, competitor-intelligence-dashboard). אין אוטומציה.",
  },
  // title intentionally omitted: "Schema Studio" is the shipped dashboard name and stays in Latin.
  "schema-studio": {
    whyNow: "זכאות לתוצאות עשירות מניעה CTR — שגיאות סכמה הן דליפות הכנסה בלתי נראות.",
    widgets: ["מאמת סכמה", "תצוגה מקדימה של תוצאה עשירה", "מפת כיסוי", "Diff תיקון"],
    description: "עורך סכמה חזותי עם אימות, תצוגה מקדימה ו-diff לפריסה.",
    problem: "שגיאות סכמה הורגות בשקט את הזכאות לתוצאות עשירות — אובדן CTR בלתי נראה.",
    solution: "Studio: עורך JSON-LD + מאמת + תצוגה מקדימה של תוצאות עשירות בגוגל + Fix Diff / שער פריסה.",
    benefit: "להחזיר זכאות לתוצאות עשירות ו-CTR עם רשת ביטחון חזותית.",
    dataNeeded: "מאמת schema.org + בדיקת Rich Results של גוגל (בלי סימון מומצא)",
    feasibility: "קל — עורך ומאמת הם מוצרי מדף, התצוגה המקדימה היא הערך המוסף",
    nextStep: "נשלח ב-2026-08-16 ב-https://schema-studio.maximo-seo.ai — אין להקים שלד שוב. הבא: כיסוי תצוגה מקדימה של תוצאות עשירות לסוגים שהמאמת עדיין לא מכסה",
    evidence: "הביקורת מ-2026-08-15 מצאה technical×visualization = 0/7 (8% נגזר): כל 7 הדשבורדים הטכניים היו דוחות/התראות בלי ויזואליזציה. נסגר עם שיגור הדשבורד הזה ב-2026-08-16.",
  },
  "design-token-pipeline": {
    title: "צינור Design Tokens",
    whyNow: "ה-tokens של Design Lab ידניים — הזרקה אוטומטית ל-WP פותחת יכולת הרחבה.",
    widgets: ["עורך Tokens", "סטטוס סנכרון WP", "מסגרת תצוגה מקדימה", "היסטוריית גרסאות"],
    description: "עורך design tokens עם צינור הזרקה לוורדפרס בלחיצה אחת.",
    problem: "ה-tokens של Design Lab עדיין ידניים — אין צינור אוטומטי לוורדפרס.",
    solution: "Pipeline: עורך Tokens + סטטוס סנכרון WP + מסגרת תצוגה מקדימה חיה + היסטוריית גרסאות עם הזרקה בלחיצה אחת.",
    benefit: "לשגר שינויי מערכת עיצוב לוורדפרס בלחיצה אחת במקום העתק-הדבק ידני.",
    dataNeeded: "קיימים /api/wp/inject + /api/wp/theme-css (כבר באוויר, כספת: יוגדר בהמשך)",
    feasibility: "בינוני — נקודות הקצה של WP קיימות, מסגרת התצוגה המקדימה היא החלק החדש",
    nextStep: "להקים שלד לדשבורד חדש design-token-pipeline (design×automation הוא 0% מרחב לבן; design-lab הוא ויזואליזציה בלבד) ← קודם עורך והזרקה",
    evidence: "נבדק בביקורת מ-2026-08-15 (37 דשבורדים): design×automation = 0/1 (8%) — design-lab הוא דשבורד העיצוב היחיד והוא ויזואליזציה בלבד. אין אוטומציה.",
  },
  "fleet-cron-observatory": {
    title: "תצפית Crons של הצי",
    whyNow: "בצי יש 50+ crons — כשלים שקטים עולים שעות בכל שבוע.",
    widgets: ["ציר זמן Cron", "מפת חום כשלים", "יומני הרצה", "בקרת ניסיון חוזר"],
    description: "כל ה-crons של הצי בציר זמן אחד עם מפת חום כשלים ובקרות ניסיון חוזר.",
    problem: "הצי מריץ 50+ crons — כשלים שקטים עולים שעות בכל שבוע ואין תצוגה אחת.",
    solution: "Observatory: ציר זמן Cron + מפת חום כשלים לפי שעה + יומני הרצה + בקרת ניסיון חוזר (איגום יומני n8n + Vercel).",
    benefit: "אפס כשלים שקטים — החזרת שעות תפעול שבועיות.",
    dataNeeded: "איגום יומני cron של n8n + Vercel (כספת: יוגדר בהמשך)",
    feasibility: "קל — איגום יומנים פשוט, ניסיון חוזר הוא P2",
    nextStep: "להקים שלד לדשבורד חדש fleet-cron-observatory (automation×alerts הוא 18% מרחב לבן) ← קודם לאגם יומנים",
    evidence: "נבדק בביקורת מ-2026-08-15 (37 דשבורדים): automation×alerts = 2/11 (18%) — ב-9 מתוך 11 דשבורדי אוטומציה אין התראות (רשימת הפרויקטים אינה ניתנת לשחזור מהמלאי המוצהר). הפער אומת.",
  },
  // ── FLEET_IDEAS: enhancements ──
  "serp-volatility-war-room": {
    title: "שדרוג Site Intel: חדר מלחמה לתנודתיות SERP",
    whyNow: "עדכון הליבה של אוגוסט העלה את התנודתיות — ל-Site Intel אין תצוגת חדר מלחמה ייעודית.",
    widgets: ["מדד תנודתיות", "מנצחים/מפסידים", "תכונות SERP", "פיד התראות"],
    description: "הוספת לשונית חדר מלחמה בתוך Site Intel Dashboard — לא פרויקט עצמאי.",
    problem: "Site Intel מכסה מודיעין סריקה/אינדוקס/SERP אך אין בו חדר מלחמה בזמן אמת לתנודתיות (מדד תנודתיות + מנצחים/מפסידים + נתח תכונות SERP).",
    solution: "להוסיף לשונית War-Room ל-site-intel-dashboard: מדד תנודתיות חי + טבלת מנצחים/מפסידים + נתח תכונות SERP + פיד התראות עם drill-down ל-URL.",
    benefit: "מיון תפעולי בדקות בתוך Site Intel הקיים, בלי דשבורד חדש לתחזק.",
    dataNeeded: "Site Intel הקיים + GSC + SERP API של צד שלישי (כספת: יוגדר בהמשך) + Vercel cron כל שעה",
    feasibility: "בינוני — מכסת SERP API ו-GSC OAuth הם החסמים",
    nextStep: "אין להקים פרויקט חדש — להוסיף לשונית /serp בתוך site-intel-dashboard ← לשלוח קודם את מדד התנודתיות",
    evidence: "נבדק בביקורת מ-2026-08-15 (37 דשבורדים): seo×analytics = 4/4 (96% חזק) — תחום ה-seo רווי. site-intel-dashboard כבר מחזיק בתחום וביכולת הזו.",
  },
  "gbp-health-monitor": {
    title: "שדרוג Local SEO: מוניטור תקינות GBP",
    whyNow: "ל-Local SEO Dashboard אין לשונית תקינות GBP (סיכון השעיה, שלמות, רעננות תמונות).",
    widgets: ["סיכון השעיה", "שלמות רישום", "רעננות תמונות", "קצב ביקורות"],
    description: "הוספת לשונית תקינות GBP בתוך Local SEO Dashboard.",
    problem: "Local SEO Dashboard קיים (local-seo.maximo-seo.ai) אך חסר בו ניטור של סיכון השעיה, שלמות ורעננות תמונות.",
    solution: "להוסיף לשונית Health ל-local-seo-dashboard: סיכון השעיה + צ׳קליסט שלמות רישום + רעננות תמונות + גרף קצב ביקורות, בשאיבה יומית.",
    benefit: "מונע השעיות ומשפר זכאות ל-Local Pack — בתוך הדשבורד שהצוותים כבר פותחים.",
    dataNeeded: "שאיבות יומיות מ-GBP API (כספת: יוגדר בהמשך) + חותמות זמן של תמונות — שימוש חוזר בסטאק של local-seo-dashboard",
    feasibility: "קל — GBP API יציב, בלי NAP מומצא",
    nextStep: "אין להקים פרויקט חדש — להוסיף לשונית /health בתוך local-seo-dashboard",
    evidence: "נבדק בביקורת מ-2026-08-15 (37 דשבורדים): local×analytics = 2/3 (67% סביר) — בתחום local כבר יש local-seo-dashboard + ai-visibility + rep-center. הפער הוא פיצ׳ר, לא דשבורד חסר.",
  },
  "content-brief-autopilot": {
    title: "שדרוג Content Automation: טייס אוטומטי לבריפים",
    whyNow: "יצירת בריפים היא צוואר הבקבוק מספר 1 — ל-Content Automation אין בריפים מבוססי SERP.",
    widgets: ["בריף SERP", "בונה מבנה", "מפת ישויות", "פער מתחרים"],
    description: "הוספת לשונית Brief Autopilot בתוך Content Automation.",
    problem: "Content Automation קיים (content-automation.maximo-seo.ai) אך אינו מייצר אוטומטית בריפים מבוססי SERP עם ישויות וניתוח פערים.",
    solution: "להוסיף לשונית Brief Autopilot ל-content-automation: קלט מילת מפתח ← בריף SERP + בונה מבנה + מפת ישויות + טבלת פערי מתחרים.",
    benefit: "פי 10 תפוקת בריפים בתוך הצינור הקיים — בלי דשבורד חדש.",
    dataNeeded: "SERP API + LLM למבנה/ישויות (כספת: יוגדר בהמשך, בלי נפחים מומצאים) — חיבור ל-content-automation",
    feasibility: "גדול — SERP ו-LLM הם העבודה הכבדה",
    nextStep: "אין להקים פרויקט חדש — להוסיף לשונית בתוך content-automation (content×automation הוא 67% סביר — הצינור כבר קיים)",
    evidence: "נבדק בביקורת מ-2026-08-15 (37 דשבורדים): content×automation = 2/3 (67% סביר) — content-automation + prompt-forge כבר מכסים אוטומציה. בריפים הם שדרוג, לא מרחב לבן.",
  },
  "local-citation-pulse": {
    title: "שדרוג Local SEO: Citation Pulse",
    whyNow: "אי-עקביות NAP עדיין מפילה 1 מכל 5 חבילות Local Pack — ל-Local SEO אין השוואת ציטוטים.",
    widgets: ["מפת ציטוטים", "השוואת NAP", "תור תיקונים", "ציון סמכות"],
    description: "הוספת לשונית Citation Pulse בתוך Local SEO Dashboard.",
    problem: "ל-Local SEO Dashboard אין מעקב עקביות ציטוטים ב-40+ ספריות עם השוואת NAP.",
    solution: "להוסיף לשונית Citation Pulse ל-local-seo-dashboard: מפת ציטוטים + מדגיש NAP Diff + תור תיקונים + ציון סמכות.",
    benefit: "לתקן באופן שיטתי את הזכאות ל-Local Pack — ניתן למדידה תוך שבועות, בתוך המרכז המקומי הקיים.",
    dataNeeded: "ציטוטים מ-Whitespark / BrightLocal (כספת: יוגדר בהמשך, בלי NAP מומצא) — הרחבת local-seo-dashboard",
    feasibility: "בינוני — ה-API של הציטוטים הוא התלות",
    nextStep: "אין להקים פרויקט חדש — להוסיף לשונית בתוך local-seo-dashboard (local×reporting הוא 33% פער — שדרוג, לא דשבורד חסר)",
    evidence: "נבדק בביקורת מ-2026-08-15 (37 דשבורדים): local×reporting = 1/3 (33% פער) — רק ai-visibility-dashboard מכסה דיווח ב-local. פער הציטוטים הוא ברמת פיצ׳ר, לא דשבורד חסר.",
  },
  "link-velocity-tracker": {
    title: "שדרוג Competitor Intel: מעקב קצב קישורים",
    whyNow: "קצב קישורים הוא מדד מוביל — ל-Competitor Intel אין תצוגת קצב.",
    widgets: ["גרף קצב", "קישורים חדשים/אבודים", "תמהיל אנקורים", "דגל סיכון"],
    description: "הוספת לשונית Link Velocity בתוך Competitor Intelligence.",
    problem: "Competitor Intelligence קיים (2 דשבורדים: competitor-intel + competitor-intelligence-dashboard) אך אף אחד מהם לא מציג קצב רכישת קישורים, תמהיל אנקורים או סיכון רעיל.",
    solution: "להוסיף לשונית Link Velocity ל-competitor-intelligence: גרף קצב ל-90 ימים + טבלת קישורים חדשים/אבודים + תמהיל אנקורים + דגל סיכון רעיל.",
    benefit: "לזהות האצה של מתחרים מוקדם ולכייל את קצב ה-outreach — בתוך מרכז המודיעין שהצוותים כבר משתמשים בו.",
    dataNeeded: "היסטוריית קישורים מ-Ahrefs / Majestic (כספת: יוגדר בהמשך, בלי קישורים מומצאים) — הרחבת competitor-intelligence",
    feasibility: "בינוני — ה-API של הקישורים מצד שלישי הוא החסם",
    nextStep: "אין להקים פרויקט חדש — להוסיף לשונית בתוך competitor-intelligence (outreach×analytics הוא 100% חזק — התחום רווי, הפער הוא פיצ׳ר)",
    evidence: "נבדק בביקורת מ-2026-08-15 (37 דשבורדים): outreach×analytics = 2/2 (96% חזק) — תחום ה-outreach רווי באנליטיקה. שני דשבורדי competitor-intel כבר מחזיקים בזה.",
  },
  "cwv-budget-guard": {
    title: "שדרוג SiteWatch: CWV Budget Guard",
    whyNow: "נסיגות CWV נשלחות בשקט — ל-SiteWatch אין שער תקציב.",
    widgets: ["מדי CWV", "פס תקציב", "Diff נסיגה", "שער פריסה"],
    description: "הוספת לשונית CWV Budget Guard בתוך SiteWatch.",
    problem: "SiteWatch / SiteWatch2 מנטרים זמינות ושינויים אך לא אוכפים תקציבי Core Web Vitals ולא חוסמים פריסות בעת נסיגה.",
    solution: "להוסיף לשונית CWV Guard ל-sitewatch: מדי LCP/CLS/INP + פס תקציב + Diff נסיגה מול הפריסה האחרונה + שער פריסה שחוסם שיגור בחריגה.",
    benefit: "לחסום נסיגות לפני שהן מגיעות למשתמשים — ביצועים כשער ולא כתקווה, בתוך מרכז הניטור.",
    dataNeeded: "Lighthouse CI + diff פריסה (בלי ציונים מומצאים) — הרחבת sitewatch",
    feasibility: "קל — Lighthouse CI מוכר היטב, השער הוא המוצר",
    nextStep: "אין להקים פרויקט חדש — להוסיף לשונית בתוך sitewatch (technical×alerts הוא 86% חזק — התראות כבר רוויות, ה-guard הוא שדרוג)",
    evidence: "נבדק בביקורת מ-2026-08-15 (37 דשבורדים): technical×alerts = 6/7 (86% חזק) — תחום ה-technical רווי בהתראות (sitewatch, sitewatch2, github-repos-radar, indexer). CWV guard הוא פיצ׳ר, לא מרחב לבן.",
  },

  // ── FLEET_GENERATED_POOL: derived ideas ──
  "seo-crawl-budget-sentinel": {
    title: "זקיף Crawl Budget ל-SEO",
    whyNow: "Crawl Budget מבוזבז על URLs דלי ערך.",
    widgets: ["מד תקציב", "רשימת בזבוז", "תור עדיפויות", "Diff תיקון"],
    description: "מנטר את הקצאת ה-Crawl Budget.",
    problem: "Crawl Budget מבוזבז על URLs דלים/כפולים.",
    solution: "Sentinel: מד + רשימת בזבוז + תור + Diff.",
    benefit: "להחזיר תקציב לעמודי הכסף.",
    dataNeeded: "סטטיסטיקות סריקה מ-GSC (כספת: יוגדר בהמשך)",
    feasibility: "בינוני",
    nextStep: "להקים שלד ל-seo-crawl-budget-sentinel",
    evidence: "נגזר: seo reporting — פער של 22%.",
  },
  "content-freshness-radar": {
    title: "מכ״ם רעננות תוכן",
    whyNow: "תוכן ישן דועך בשקט.",
    widgets: ["מפת חום רעננות", "התראות דעיכה", "תור רענון", "תצוגת השפעה"],
    description: "מכ״ם לרעננות תוכן.",
    problem: "תוכן דועך בלי אות.",
    solution: "Radar: מפת חום + התראות + תור + תצוגה.",
    benefit: "לרענן לפני שהתנועה יורדת.",
    dataNeeded: "CMS + GA4 (כספת: יוגדר בהמשך)",
    feasibility: "קל",
    nextStep: "להקים שלד ל-content-freshness-radar",
    evidence: "נגזר: content alerts — 18% מרחב לבן.",
  },
  "local-rank-pulse": {
    title: "דופק דירוג מקומי",
    whyNow: "דירוג ה-Local Pack מתנודד מדי שעה.",
    widgets: ["מעקב Pack", "תנודתיות דירוג", "שכבת מתחרים", "פיד התראות"],
    description: "דופק שעתי של ה-Local Pack.",
    problem: "דירוג ה-Pack משתנה מדי שעה.",
    solution: "Pulse: מעקב + תנודתיות + שכבה + פיד.",
    benefit: "לתפוס ירידות תוך שעות.",
    dataNeeded: "API לדירוג מקומי (כספת: יוגדר בהמשך)",
    feasibility: "בינוני",
    nextStep: "להקים שלד ל-local-rank-pulse",
    evidence: "נגזר: local alerts — פער של 28%.",
  },
  "analytics-cohort-explorer": {
    title: "חוקר Cohorts באנליטיקה",
    whyNow: "ה-cohorts של GA4 קבורים.",
    widgets: ["טבלת Cohorts", "עקומת שימור", "בונה סגמנטים", "ייצוא"],
    description: "חוקר cohorts ל-GA4.",
    problem: "ה-cohorts של GA4 מוסתרים.",
    solution: "Explorer: טבלה + עקומה + בונה + ייצוא.",
    benefit: "שימור בלי מבוך.",
    dataNeeded: "GA4 Data API (כספת: יוגדר בהמשך)",
    feasibility: "בינוני",
    nextStep: "להקים שלד ל-analytics-cohort-explorer",
    evidence: "נגזר: analytics visualization — פער של 22%.",
  },
  "automation-webhook-health": {
    title: "תקינות Webhooks באוטומציה",
    whyNow: "Webhooks נכשלים בשקט.",
    widgets: ["ציר זמן Webhooks", "שיעור כשלים", "תור ניסיונות חוזרים", "השוואת Payload"],
    description: "לוח תקינות ל-webhooks.",
    problem: "Webhooks נכשלים בשקט.",
    solution: "Board: ציר זמן + שיעור כשלים + ניסיון חוזר + Diff.",
    benefit: "אפס כשלים שקטים.",
    dataNeeded: "יומני n8n (כספת: יוגדר בהמשך)",
    feasibility: "קל",
    nextStep: "להקים שלד ל-automation-webhook-health",
    evidence: "נגזר: automation alerts — 18%.",
  },
  "design-system-diff": {
    title: "Diff למערכת עיצוב",
    whyNow: "Tokens נסחפים.",
    widgets: ["השוואת Tokens", "Diff ויזואלי", "תור אישורים", "שער שיגור"],
    description: "Diff ל-design tokens.",
    problem: "Tokens נסחפים.",
    solution: "Diff: Diff Tokens + Diff ויזואלי + תור + שער.",
    benefit: "לשגר שינויים מכוונים.",
    dataNeeded: "Tokens מ-Figma (כספת: יוגדר בהמשך)",
    feasibility: "קל",
    nextStep: "להקים שלד ל-design-system-diff",
    evidence: "נגזר: design reporting — פער של 32%.",
  },
  "outreach-reply-predictor": {
    title: "מנבא תגובות Outreach",
    whyNow: "ציון תגובה משפר ROI.",
    widgets: ["ציון תגובה", "טיימר מעקב", "הצעת תבנית", "תקינות תיבה"],
    description: "מנבא סבירות תגובה.",
    problem: "אין ניבוי.",
    solution: "Predictor: ציון + טיימר + הצעה + תקינות.",
    benefit: "לעקוב רק כשזה משנה.",
    dataNeeded: "Gmail + LLM (כספת: יוגדר בהמשך)",
    feasibility: "בינוני",
    nextStep: "להקים שלד ל-outreach-reply-predictor",
    evidence: "נגזר: outreach automation — 8%.",
  },
  "technical-dependency-map": {
    title: "מפת תלויות טכנית",
    whyNow: "חוב טכני בלתי נראה.",
    widgets: ["גרף תלויות", "נקודות סיכון", "השפעת שינוי", "מפת בעלים"],
    description: "גרף של תלויות.",
    problem: "תלויות בלתי נראות.",
    solution: "Map: גרף + נקודות סיכון + השפעה + בעלים.",
    benefit: "להקטין סיכון בשינויים.",
    dataNeeded: "מאגרי GitHub (כספת: יוגדר בהמשך)",
    feasibility: "גדול",
    nextStep: "להקים שלד ל-technical-dependency-map",
    evidence: "נגזר: technical visualization — 8%.",
  },
  "geo-answer-share-tracker": {
    title: "מעקב נתח תשובות GEO",
    whyNow: "נתח תשובות AI הוא הדירוג החדש.",
    widgets: ["נתח תשובות", "כיסוי פרומפטים", "מפת ציטוטים", "מגמה"],
    description: "עוקב אחר נתח התשובות.",
    problem: "אין מעקב GEO.",
    solution: "Tracker: נתח + כיסוי + ציטוטים + מגמה.",
    benefit: "לשלוט ב-GEO.",
    dataNeeded: "GEO API (כספת: יוגדר בהמשך)",
    feasibility: "בינוני",
    nextStep: "להקים שלד ל-geo-answer-share-tracker",
    evidence: "נגזר: local analytics — פער של 28%.",
  },
  "client-ops-health-board": {
    title: "לוח תקינות תפעול לקוחות",
    whyNow: "תקינות הלקוחות מפוזרת.",
    widgets: ["ציון תקינות", "רשימת סיכונים", "מד שימוש", "טיימר חידוש"],
    description: "לוח תקינות לתפעול לקוחות.",
    problem: "התקינות מפוזרת.",
    solution: "Board: ציון + סיכון + שימוש + חידוש.",
    benefit: "הצלות פרואקטיביות.",
    dataNeeded: "CRM + חיוב (כספת: יוגדר בהמשך)",
    feasibility: "קל",
    nextStep: "להקים שלד ל-client-ops-health-board",
    evidence: "נגזר: analytics automation — 18%.",
  },

  // ── FLEET_GENERATED_POOL: web research 2026-08-16 ──
  "ai-search-health-gate": {
    title: "שער תקינות חיפוש AI",
    whyNow: "Semrush הוסיפה ב-2025 בדיקות הרשאת בוטים של AI — אין שער ברמת הצי.",
    widgets: ["מטריצת הרשאת בוטים", "תקינות llms.txt", "ציון מוכנות AI", "Diff תיקון חסימות"],
    description: "שער ברמת הצי לגישת בוטים של AI ולתקינות llms.txt.",
    problem: "אתרים עוברים סריקה של גוגל אך חוסמים בוטים של AI — Semrush בודקת עכשיו את שניהם.",
    solution: "Gate: מטריצת הרשאת בוטים לכל אתר + תקינות llms.txt + ציון מוכנות AI + Fix Diff.",
    benefit: "לתפוס בלתי-נראות ל-AI לפני אובדן נתח GEO.",
    dataNeeded: "סריקת הצי + robots.txt + llms.txt (כספת: יוגדר בהמשך)",
    feasibility: "בינוני",
    nextStep: "להקים שלד ל-ai-search-health-gate — מקור מ-2026-08-16 מ-semrush.com",
    evidence: "מחקר 2026-08-16: semrush.com/solutions/technical-seo — 140+ בדיקות + תקינות חיפוש AI עבור ChatGPT-User/Perplexity-User/Claude-SearchBot; פער 17%.",
  },
  "health-score-timeline": {
    title: "ציר זמן ציון תקינות",
    whyNow: "SE Ranking מוכיחה שמגמת תקינות 0-100 עדיפה על תמונת מצב.",
    widgets: ["ציון תקינות", "Sparkline מגמה", "5 הבעיות המובילות", "השוואת ביקורות"],
    description: "ציר זמן של ציון תקינות עם השוואת ביקורות.",
    problem: "ביקורות הן נקודתיות בזמן — אין מגמה או השוואה.",
    solution: "Timeline: ציון 0-100 + sparkline + 5 מובילות + Diff השוואה.",
    benefit: "להוכיח שלתיקונים הייתה השפעה.",
    dataNeeded: "היסטוריית ביקורות (כספת: יוגדר בהמשך)",
    feasibility: "קל",
    nextStep: "להקים שלד ל-health-score-timeline בתוך seo-audit-dashboard — מקור: seranking.com",
    evidence: "מחקר 2026-08-16: seranking.com/website-audit.html — ציון תקינות + השוואת ביקורות; פער 42%.",
  },
  "gbp-health-benchmark": {
    title: "תקינות GBP ובנצ׳מרק מתחרים",
    whyNow: "BrightLocal ו-SearchOps מדרגות 30+ אותות GBP עם בנצ׳מרק.",
    widgets: ["ציון GBP 0-100", "פירוט אותות", "דירוג מתחרים", "תור תיקונים"],
    description: "ביקורת GBP על 30+ אותות + בנצ׳מרק מתחרים באותה סקאלה.",
    problem: "תקינות ה-GBP נאמדת בניחוש — ביקורת מדורגת + בנצ׳מרק מובילים לתיקונים.",
    solution: "Audit: ציון GBP + פירוט + בנצ׳מרק (5 מתחרים) + תור תיקונים לפי השפעה.",
    benefit: "לתקן רק את מה שמזיז דירוגים.",
    dataNeeded: "GBP API + רשת דירוג (כספת: יוגדר בהמשך)",
    feasibility: "בינוני",
    nextStep: "להקים שלד ל-gbp-health-benchmark בתוך local-seo-dashboard — מקור: brightlocal + searchops",
    evidence: "מחקר 2026-08-16: brightlocal.com/local-seo-tools + searchops.co.uk/features/gbp-audit — 30+ אותות 0-100, 5 מתחרים; פער 33%.",
  },
  "aeo-answer-share-tracker": {
    title: "מעקב נתח תשובות AEO",
    whyNow: "HubSpot AEO ו-AEO Table מוכיחים שנתח תשובות הוא הדירוג החדש.",
    widgets: ["ציון נראות מותג", "נתח קול (Share of Voice)", "מעקב פרומפטים", "מפת ציטוטים"],
    description: "עוקב אחר אזכורי המותג בתשובות AI מול מתחרים + פרומפטים + ציטוטים.",
    problem: "אין תצוגה ברמת הצי של נתח תשובות AI.",
    solution: "Tracker: ציון נראות + Share of Voice + מעקב פרומפטים + מפת ציטוטים.",
    benefit: "לדעת באילו פרומפטים אתם מנצחים או מפסידים.",
    dataNeeded: "דגימת ChatGPT/Gemini/Perplexity (כספת: יוגדר בהמשך)",
    feasibility: "בינוני",
    nextStep: "להקים שלד ל-aeo-answer-share-tracker — מקור: hubspot.com + aeotable.com",
    evidence: "מחקר 2026-08-16: hubspot.com/products/aeo + aeotable.com — נראות + נתח + פרומפט + ציטוט; פער 28%.",
  },
  "geo-monitor-audit": {
    title: "GEO Monitor וביקורת 10 נקודות",
    whyNow: "GEO Monitor ו-ViAudit מספקות ביקורות של 10-25 גורמים עם סריקת מנועים.",
    widgets: ["סריקת מנועים (6-7)", "שיעור אזכורים", "ביקורת 10 נקודות", "המלצות תיקון"],
    description: "סורק 6-7 מנועי AI + ביקורת GEO של 10 נקודות + המלצות תיקון.",
    problem: "אין סריקה ברמת הצי של 6 מנועי AI עם ביקורת.",
    solution: "Monitor: סריקת 6 מנועים + Mention Analytics + ביקורת 10 נקודות + המלצות תיקון.",
    benefit: "מקום אחד לנראות AI ולתיקונים.",
    dataNeeded: "שאילתות מנועים + צ׳קליסט ביקורת (כספת: יוגדר בהמשך)",
    feasibility: "בינוני",
    nextStep: "להקים שלד ל-geo-monitor-audit בתוך ai-visibility-dashboard — מקור: geomonitor.app + viaudit.com",
    evidence: "מחקר 2026-08-16: geomonitor.app + viaudit.com + apexgeo.app — 6-7 מנועים, ביקורת של 25 גורמים;",
  },
  "content-decay-recovery-queue": {
    title: "תור התאוששות מדעיכת תוכן",
    whyNow: "דעיכת תוכן מתבטאת בירידה מתמשכת בתנועה — שווה אות ייעודי.",
    widgets: ["רשימת דעיכה", "ציון דחיפות", "פעולת רענון/איחוד", "ציר זמן התאוששות"],
    description: "תור דעיכה מ-GSC: דלתא ל-90 יום, דחיפות, תור רענון.",
    problem: "דעיכה מתגלה רק בביקורת רבעונית — התיקון דורש שכתוב.",
    solution: "Queue: דגל דלתא של GSC ל-90 יום >20% + דחיפות + רענון/איחוד + טיפול בפיגור של 3 ימים.",
    benefit: "לתקן כשהרענון זול.",
    dataNeeded: "GSC לפי URL ל-90 יום (כספת: יוגדר בהמשך)",
    feasibility: "קל",
    nextStep: "להקים שלד ל-content-decay-recovery-queue — מקור: refreshagent.com + seobolt.io",
    evidence: "מחקר 2026-08-16: refreshagent.com + seobolt.io + prorank.io — ירידה של 20% ב-90 יום + 7v7/14v14/30v30 + פיגור של 3 ימים;",
  },
  "white-label-client-reports": {
    title: "דוחות White-Label ללקוחות",
    whyNow: "SE Ranking ו-BrightLocal מנצחות עם קישורי אורח White-Label.",
    widgets: ["קישור אורח", "ערכת מותג", "שליחה מתוזמנת", "השוואה בין לקוחות"],
    description: "קישורי אורח White-Label + ערכת מותג + שליחות מתוזמנות.",
    problem: "דוחות דורשים התחברות — קישורי אורח ו-White-Label סוגרים עסקאות.",
    solution: "Reports: קישור אורח (בלי התחברות) + ערכת מותג + שליחה מתוזמנת + השוואה.",
    benefit: "לשתף נתונים חיים תחת המותג שלכם.",
    dataNeeded: "report-engine + מאגר מותג (כספת: יוגדר בהמשך)",
    feasibility: "קל",
    nextStep: "להקים שלד ל-white-label-client-reports בתוך report-engine — מקור: seranking.com + brightlocal",
    evidence: "מחקר 2026-08-16: seranking.com/seo-dashboard — קישורי אורח + White-Label ב-$69 לחודש;",
  },
  "cwv-budget-gate-lhci": {
    title: "שער תקציב CWV (Lighthouse CI)",
    whyNow: "Lighthouse CI הוא השער לחסימת שיגור בעת נסיגה.",
    widgets: ["שער LHCI", "פס תקציב (KB)", "Diff נסיגה", "שער פריסה"],
    description: "אוכף תקציבי ביצועים ב-CI וחוסם שיגור בחריגה.",
    problem: "נסיגות CWV נשלחות בשקט.",
    solution: "Gate: lighthouserc.js + budget.json + חציון של 3 + שער fail-closed.",
    benefit: "גידול של 5% בבאנדל או חריגת LCP מכשילים PR.",
    dataNeeded: "Lighthouse CI מחובר (כספת: יוגדר בהמשך)",
    feasibility: "קל",
    nextStep: "להקים שלד ל-cwv-budget-gate-lhci בתוך sitewatch2 — מקור: web.dev + qaskills.sh",
    evidence: "מחקר 2026-08-16: web.dev/articles/lighthouse-ci + qaskills.sh — collect->assert->upload + חציון של 3;",
  },

  // ── IDEA_POOL (ideas-engine.ts) ──
  "local-geo-presence-radar": {
    title: "מכ״ם נוכחות גיאו-מקומית",
    whyNow: "ציטוטי Map Pack מופיעים כעת אחרת ב-AI Overviews",
    dataSources: ["יוגדר בהמשך (כספת: GBP API, מריץ פרומפטים גיאוגרפיים) — ללא NAP מומצא"],
    widgets: ["נתח Map Pack", "סחף ציטוטים", "נראות בפרומפטים גיאוגרפיים", "עקביות NAP"],
    iaSketch: ["סקירה", "רשת מפה", "ציטוטים", "פרומפטים גיאוגרפיים", "התראות"],
  },
  "whm-fleet-health": {
    title: "תקינות צי WHM",
    whyNow: "פערי SSL/דיסק הם הרחבים ביותר בצי",
    dataSources: ["יוגדר בהמשך (כספת: WHM/cPanel UAPI) — ללא ערכים מומצאים"],
    widgets: ["ציר זמן פקיעת SSL", "מדי דיסק/inodes", "תקינות חשבונות", "יומן פתיחת קריאות אוטומטית"],
    iaSketch: ["סקירת צי", "שרתים", "חשבונות", "SSL ו-DNS", "אוטומציה"],
  },
  "competitor-share-of-voice": {
    title: "מעבדת Share-of-Voice מול מתחרים",
    whyNow: "פערי SOV מכתיבים את סדר העדיפויות בתוכן",
    dataSources: ["יוגדר בהמשך (כספת: SERP/Backlink API) — נתונים מאומתים בלבד"],
    widgets: ["מגמת SOV", "מטריצת פערי תוכן", "שינוי בקישורים נכנסים", "תכונות SERP"],
    iaSketch: ["סקירה", "נתח קול (SOV)", "פערי תוכן", "קישורים נכנסים", "פעולות"],
  },
  "geo-ai-visibility-ops": {
    title: "תפעול נראות AI ב-GEO",
    whyNow: "תוצאות גנרטיביות דורשות מעקב ייעודי",
    dataSources: ["יוגדר בהמשך (כספת: סורק AI Overview) — ללא ציטוטים מומצאים"],
    widgets: ["שיעור פגיעה ב-AI", "תרשים עוגה של ציטוטים", "כיסוי פרומפטים", "תור תיקונים"],
    iaSketch: ["סקירה", "פרומפטים", "ציטוטים", "תור", "דוחות"],
  },
  "client-ops-command": {
    title: "מרכז פיקוד תפעול לקוחות",
    whyNow: "שימור לקוחות דורש שקיפות ב-SLA",
    dataSources: ["יוגדר בהמשך (כספת: CRM/מערכת קריאות) — ללא סכומי $ מומצאים"],
    widgets: ["גרף burn-down של SLA", "העברת משימות", "תקינות לקוח", "תיבת הסלמות"],
    iaSketch: ["פורטפוליו", "פרטי לקוח", "משימות", "SLA והתראות", "דוחות"],
  },
  "content-decay-revival": {
    title: "סטודיו דעיכה והחייאה של תוכן",
    whyNow: "זיהוי דעיכה מניע את התשואה מהחייאת תוכן",
    dataSources: ["יוגדר בהמשך (כספת: GSC/אנליטיקס) — נתונים מאומתים בלבד"],
    widgets: ["עקומת דעיכה", "עמודים יתומים", "גרף קישורים", "תור החייאה"],
    iaSketch: ["סקירה", "דעיכה", "יתומים", "תור", "יומן פרסום"],
  },
  "automation-orchestrator": {
    title: "מתזמר אוטומציות",
    whyNow: "מתכונים צריכים קנבס חזותי",
    dataSources: ["יוגדר בהמשך (כספת: n8n/webhooks)"],
    widgets: ["קנבס זרימות", "היסטוריית הרצות", "מיון שגיאות", "גלריית מתכונים"],
    iaSketch: ["קנבס", "הרצות", "שגיאות", "מתכונים", "הגדרות"],
  },
  "local-listings-ops": {
    title: "תפעול רישומים מקומיים",
    whyNow: "סחף ברישומים פוגע ב-Local Pack",
    dataSources: ["יוגדר בהמשך (כספת: GBP/מאגדי רישומים) — ללא רישומים מומצאים"],
    widgets: ["שלמות", "מזהה כפילויות", "תור תמונות", "תיבת ביקורות"],
    iaSketch: ["סקירה", "רישומים", "כפילויות", "תור מדיה", "תיבת נכנסות"],
  },
  "seo-forecast-lab": {
    title: "מעבדת תחזיות SEO",
    whyNow: "תכנון תרחישים מצדיק הימורי תוכן",
    dataSources: ["יוגדר בהמשך (כספת: GSC/דירוגים) — נתונים היסטוריים בלבד"],
    widgets: ["תחזית תנועה", "מחוון תרחישים", "תיק מילות מפתח", "ספר הימורים"],
    iaSketch: ["תחזית", "תרחישים", "תיק", "הימורים", "דוחות"],
  },
  "whm-security-posture": {
    title: "מצב האבטחה של WHM",
    whyNow: "סחף במצב האבטחה שקט עד שמתרחשת פריצה",
    dataSources: ["יוגדר בהמשך (כספת: WHM/Imunify/חומת אש)"],
    widgets: ["ציון מצב אבטחה", "תור עדכונים", "יומן תוכנות זדוניות", "חריגות גישה"],
    iaSketch: ["ציון", "עדכונים", "סריקות", "גישה", "ספר הפעלה"],
  },
  "competitor-content-velocity": {
    title: "קצב התוכן של מתחרים",
    whyNow: "קצב מתורגם לתדירות פעולה ישימה",
    dataSources: ["יוגדר בהמשך (כספת: מעקב אחר סריקה/Sitemap)"],
    widgets: ["גרף קצב", "התפרצויות נושאים", "שכבת לוח שנה", "התראות פערים"],
    iaSketch: ["קצב", "נושאים", "לוח שנה", "פערים", "התראות"],
  },
  "reporting-white-label-studio": {
    title: "סטודיו דוחות White-Label",
    whyNow: "קצב White-Label בלי מצגות ידניות",
    dataSources: ["יוגדר בהמשך (כספת: תבניות/ערכת מותג)"],
    widgets: ["גלריית תבניות", "לוח תזמונים", "ערכת מותג", "יומן משלוחים"],
    iaSketch: ["תבניות", "תזמונים", "מותג", "משלוחים", "הגדרות"],
  },
  "geo-local-bridge": {
    title: "גשר גיאו-מקומי (גיבוי)",
    whyNow: "פער משולש: geo × local × automation",
    dataSources: ["יוגדר בהמשך (כספת: פרומפטים גיאוגרפיים + GBP)"],
    widgets: ["פער בין Geo ל-Local", "מתאם בין פרומפט ל-Pack", "תור פעולות"],
    iaSketch: ["סקירה", "פער", "פרומפטים", "פעולות"],
  },
  "whm-automation-runbook": {
    title: "ספר הפעלה אוטומטי של WHM (גיבוי)",
    whyNow: "מכסה whm × automation × alerts",
    dataSources: ["יוגדר בהמשך (כספת: WHM + n8n)"],
    widgets: ["רשימת ספרי הפעלה", "יומן ביצועים", "ניתוב התראות"],
    iaSketch: ["ספרי הפעלה", "הרצות", "התראות"],
  },
};

// ───────────────────────── IMPROVEMENT_POOL (keyed by exact English string) ─────────────────────────
export const HE_IMPROVEMENTS: Record<string, string> = {
  "Add keyword-to-page mapping & SERP delta tracking": "הוסיפו מיפוי מילת מפתח לעמוד ומעקב אחר שינויי SERP",
  "Add NAP consistency checks (vault TBD — no invented data)": "הוסיפו בדיקות עקביות NAP (כספת: יוגדר בהמשך — ללא נתונים מומצאים)",
  "Wire unified analytics events (GA4/GSC) with vault DSN TBD": "חברו אירועי אנליטיקה מאוחדים (GA4/GSC) עם DSN מהכספת (יוגדר בהמשך)",
  "Add n8n/webhook triggers for stale metrics": "הוסיפו טריגרים של n8n/webhook למדדים שהתיישנו",
  "Add content freshness decay & orphan scan": "הוסיפו זיהוי דעיכת רעננות תוכן וסריקת עמודים יתומים",
  "Add crawl budget & Core Web Vitals guard": "הוסיפו מנגנון שמירה על Crawl Budget ועל Core Web Vitals",
  "Add prospect scoring & reply prediction": "הוסיפו דירוג פרוספקטים וניבוי תגובות",
  "Adopt fleet design-tokens for chart parity": "אמצו את ה-design tokens של הצי כדי ליישר קו בין הגרפים",
  "Add AI-overview citation tracking per geo prompt set": "הוסיפו מעקב ציטוטים ב-AI Overview לכל סט פרומפטים גיאוגרפי",
  "Add WHM/cPanel health & SSL expiry alerts (vault TBD)": "הוסיפו התראות על תקינות WHM/cPanel ופקיעת SSL (כספת: יוגדר בהמשך)",
  "Add competitor gap table (share-of-voice vs top 3)": "הוסיפו טבלת פערים מול מתחרים (share-of-voice מול 3 המובילים)",
  "Add scheduled PDF export with vault branding": "הוסיפו ייצוא PDF מתוזמן עם מיתוג מהכספת",
  "Add client portal SSO + task handoff log": "הוסיפו SSO לפורטל לקוחות ויומן מסירת משימות",
  "Refresh stale data-source bindings (vault TBD)": "רעננו את חיבורי מקורות הנתונים שהתיישנו (כספת: יוגדר בהמשך)",
  "Investigate degraded health: uptime & error logs": "בררו מדוע התקינות לקויה: זמינות (uptime) ויומני שגיאות",
  "Add threshold alerts (Slack/email) via vault": "הוסיפו התראות סף (Slack/אימייל) דרך הכספת",
};

// ───────────────────────── generic text produced by fleet.ts / ideas-engine.ts ─────────────────────────
export const HE_STATUS_LABEL: Record<FleetStatus, string> = {
  live: "פעיל",
  beta: "בטא",
  build: "בבנייה",
  concept: "קונספט",
};

/** Hebrew counterpart of statusExplainer() in fleet.ts (same inputs, same meaning). */
export function heStatusExplainer(s: FleetStatus, updated: string): string {
  if (s === "live") return `פעיל בביקורת האחרונה · פריסה אחרונה שתועדה ${updated}`;
  if (s === "beta") return `בטא בביקורת האחרונה · פריסה אחרונה שתועדה ${updated} — התיישנות קלה אז, עדיין נגיש`;
  if (s === "build") return `בבנייה בביקורת האחרונה · מעל 7 ימים בלי פריסה או שנדרשה תשומת לב`;
  return `קונספט · עדיין לא באוויר`;
}

export const HE_AUDIT_BASIS =
  "היוריסטיקה: יכולות מוצהרות, גיל תמונת המצב של המלאי ותווית תקינות סטטית. לא שימוש או איכות שנמדדו.";

// ───────────────────────── helpers ─────────────────────────
export function localizeProject<T extends { slug: string; description?: string; plainExplainer?: string }>(p: T, lang: "en" | "he"): T {
  if (lang !== "he") return p;
  const o = HE_PROJECTS[p.slug];
  if (!o) return p;
  const out = { ...p };
  if (o.description !== undefined) out.description = o.description;
  if (o.plainExplainer !== undefined) out.plainExplainer = o.plainExplainer;
  return out;
}

export function localizeIdea<T extends { slug: string }>(i: T, lang: "en" | "he"): T {
  if (lang !== "he") return i;
  const o = HE_IDEAS[i.slug];
  if (!o) return i;
  const src = i as Record<string, unknown>;
  const out: Record<string, unknown> = { ...src };
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || !(k in src)) continue; // only overlay fields the item actually has
    const cur = src[k];
    if (Array.isArray(v) && Array.isArray(cur) && v.length !== cur.length) continue; // never break array shape
    out[k] = v;
  }
  return out as T;
}

export function localizeImprovement(s: string, lang: "en" | "he"): string {
  if (lang !== "he") return s;
  return HE_IMPROVEMENTS[s] ?? s;
}

export function localizeStatusLabel(s: FleetStatus, lang: "en" | "he"): string {
  return lang === "he" ? HE_STATUS_LABEL[s] : statusLabel(s);
}

export function localizeStatusExplainer(s: FleetStatus, updated: string, lang: "en" | "he"): string {
  return lang === "he" ? heStatusExplainer(s, updated) : statusExplainer(s, updated);
}

export function localizeAuditBasis(lang: "en" | "he"): string {
  return lang === "he" ? HE_AUDIT_BASIS : AUDIT_BASIS;
}
