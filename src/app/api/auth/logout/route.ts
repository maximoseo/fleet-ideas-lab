import { NextResponse } from 'next/server';
import { clearAuthCookieOptions } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(clearAuthCookieOptions());
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
