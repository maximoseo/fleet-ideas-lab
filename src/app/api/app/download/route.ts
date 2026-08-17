import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Must track the `apkUrl` in `/api/app/version`.
 *
 * This pointed at v1.1.4 while the version endpoint already served v1.2.0. That is worse
 * than a stale link: the v1.1.4 signing key was lost, so anyone who took this fallback
 * installed an app that can never be updated in place and has to be uninstalled first.
 */
const APK_URL =
  "https://github.com/maximoseo/fleet-ideas-lab/releases/download/v1.2.9/fleet-ideas-lab-v1.2.9.apk";

export async function GET() {
  // Redirect to the GitHub Release artifact — Vercel keeps the stable /api/app/download URL
  return NextResponse.redirect(APK_URL, 302);
}
