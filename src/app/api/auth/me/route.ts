import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * Public by design: it is how the client discovers whether it is signed in.
 * It returns 401 rather than redirecting, and never leaks anything beyond the
 * username already known to the session holder.
 */
export async function GET() {
  const jar = await cookies();
  const user = verifySessionToken(jar.get('dl_session')?.value);
  const res = user
    ? NextResponse.json({ user })
    : NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
