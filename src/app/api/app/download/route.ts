import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/appVersion";

export const runtime = "nodejs";

/**
 * Stable download URL — redirects to the current GitHub Release artifact.
 *
 * This route used to hold its own copy of the APK URL, and that copy drifted
 * twice. Once it pointed at v1.1.4 whose signing key is lost, so anyone taking
 * the fallback installed an app that can never be updated in place. It drifted
 * again at 1.3.7, which is why it now reads the single source in
 * `src/lib/appVersion.ts` and cannot go stale on its own.
 */
export async function GET() {
  return NextResponse.redirect(APP_VERSION.apkUrl, 302);
}
