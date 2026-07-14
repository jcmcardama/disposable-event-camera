// Small helper every admin API route calls first. Returns null if the
// request is authenticated (caller proceeds normally), or a 401
// response to return immediately if not - keeps the auth check as a
// one-line guard rather than repeating cookie logic in every route.

import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from './adminAuth';

export async function requireAdmin(): Promise<NextResponse | null> {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return null;
}