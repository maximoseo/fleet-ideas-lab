import { NextResponse } from "next/server";

export const runtime = "nodejs";

const APK_URL = "https://github.com/maximoseo/fleet-ideas-lab/releases/download/v1.0.9/app-release.apk";

export async function GET() {
  // Redirect to the GitHub Release artifact — Vercel keeps the stable /api/app/download URL
  return NextResponse.redirect(APK_URL, 302);
}
