// Handles admin authentication: verifying the submitted password against
// ADMIN_PASSWORD, and checking/setting the auth cookie. We store a fixed
// token (not the raw password) in the cookie, so the actual password
// never sits in the browser after the initial login request.

import { cookies } from 'next/headers';

const ADMIN_COOKIE_NAME = 'admin_session';

// The cookie's value is a hash of the password rather than the password
// itself - simple obfuscation, not real cryptographic security, but
// this matches the spec's "one password in an env var" simplicity goal
// rather than building a full session/JWT system for a one-day event.
async function getExpectedToken(): Promise<string> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error('ADMIN_PASSWORD is not configured');
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Buffer.from(hashBuffer).toString('hex');
}

export async function verifyPassword(submittedPassword: string): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD;
  return password !== undefined && submittedPassword === password;
}

export async function setAdminCookie() {
  const token = await getExpectedToken();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 8, // 8 hours - comfortably covers one event day
    path: '/',
  });
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookieValue) return false;

  const expected = await getExpectedToken();
  return cookieValue === expected;
}

export async function clearAdminCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}