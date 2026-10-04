import type { Bi } from "@/components/i18n";

/**
 * Release notes for the WEB app, newest first. The "What's new" popup shows the
 * entries a visitor has not seen yet, so every user-visible change ships with an
 * entry here (OPERATIONS.md §3). The Android release has its own number in
 * appVersion.ts; the two are independent.
 *
 * Order matters, not the version string: "unseen" means "listed above the last
 * version this browser acknowledged".
 */
export interface ReleaseNote {
  version: string;
  date: string; // YYYY-MM-DD
  title: Bi;
  changes: Bi[];
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "1.6.1",
    date: "2026-10-04",
    title: { en: "Complete inventory, faster sign-in, Android 1.5.1", he: "מלאי מלא, כניסה מהירה יותר ואנדרואיד 1.5.1" },
    changes: [
      {
        en: "The inventory now lists 9 more dashboards found in the registry (45 in total). Dashboards nobody has probed yet are labelled \"not probed\" instead of being guessed.",
        he: "המלאי כולל עכשיו 9 דשבורדים נוספים מהרישום (45 בסך הכול). דשבורדים שעדיין לא נבדקו מסומנים \"לא נבדק\" ולא מנוחשים.",
      },
      {
        en: "The sign-in security check now loads when you start typing, so the page opens faster.",
        he: "בדיקת האבטחה בכניסה נטענת עכשיו כשמתחילים להקליד, כך שהדף נפתח מהר יותר.",
      },
      {
        en: "Shared links show a clear preview title. Android 1.5.1 replaces the arbitrary gap matrix with one derived from each dashboard's primary domain.",
        he: "קישורי שיתוף מציגים כותרת תצוגה מקדימה ברורה. אנדרואיד 1.5.1 מחליף את מטריצת הפערים השרירותית במטריצה שנגזרת מהתחום הראשי של כל דשבורד.",
      },
    ],
  },
  {
    version: "1.6.0",
    date: "2026-10-04",
    title: { en: "English first, Hebrew on every screen", he: "אנגלית כשפה ראשית, עברית בכל מסך" },
    changes: [
      {
        en: "Every menu and screen can be switched between English and Hebrew with the EN / עב control, including the sign-in page. English is the default.",
        he: "אפשר להחליף כל תפריט וכל מסך בין אנגלית לעברית עם הכפתור EN / עב, כולל דף הכניסה. אנגלית היא ברירת המחדל.",
      },
      {
        en: "Hebrew switches the layout to right-to-left. Dashboard names, URLs and probe data stay as they are.",
        he: "בעברית הפריסה מתהפכת לימין לשמאל. שמות הדשבורדים, כתובות ונתוני הבדיקות נשארים כפי שהם.",
      },
      {
        en: "New: this window. After each update you see the version number and what changed, once per browser.",
        he: "חדש: החלון הזה. אחרי כל עדכון מוצגים מספר הגרסה ומה השתנה, פעם אחת בכל דפדפן.",
      },
    ],
  },
  {
    version: "1.5.1",
    date: "2026-10-04",
    title: { en: "Honest scores, readable light theme, safer sign-in", he: "ציונים כנים, ערכה בהירה קריאה, כניסה בטוחה יותר" },
    changes: [
      {
        en: "Light theme: the sign-in page and the backgrounds that stayed dark are now readable (contrast of at least 4.5:1).",
        he: "ערכה בהירה: דף הכניסה והרקעים שנשארו כהים קריאים עכשיו (ניגודיות של לפחות 4.5:1).",
      },
      {
        en: "Audit scores no longer contain random noise; freshness now follows the clock, and the API says it is a heuristic over the inventory snapshot.",
        he: "ציוני הביקורת כבר לא כוללים רעש אקראי; הטריות עוקבת אחרי השעון, וה-API מציין שמדובר בהערכה על בסיס צילום המלאי.",
      },
      {
        en: "Idea status now comes from the board, so the app and the agent API agree.",
        he: "סטטוס הרעיונות נלקח עכשיו מהלוח, כך שהאפליקציה וה-API של הסוכנים מסכימים.",
      },
      {
        en: "Sign-in is stricter: the captcha is required in production and sessions were reset once, so you need to sign in again.",
        he: "הכניסה מחמירה יותר: ה-captcha חובה בייצור והסשנים אופסו פעם אחת, ולכן צריך להיכנס מחדש.",
      },
    ],
  },
];

export const WEB_VERSION = RELEASE_NOTES[0].version;
export const WHATS_NEW_STORAGE_KEY = "fil-whatsnew-seen";

/**
 * The entries to show for a browser that last acknowledged `lastSeen`.
 * Never seen anything, or an unknown version: just the latest entry (a full
 * history dump would be noise). Otherwise everything newer, capped.
 */
export function unseenNotes(lastSeen: string | null, notes: ReleaseNote[] = RELEASE_NOTES, max = 4): ReleaseNote[] {
  if (!notes.length) return [];
  const idx = lastSeen ? notes.findIndex((n) => n.version === lastSeen) : -1;
  if (idx === 0) return [];
  if (idx < 0) return [notes[0]];
  return notes.slice(0, Math.min(idx, max));
}
