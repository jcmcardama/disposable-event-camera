import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, setAdminCookie } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (typeof password !== 'string' || !(await verifyPassword(password))) {
    // Deliberately vague error message - don't reveal whether the
    // failure was "wrong password" vs anything else.
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  await setAdminCookie();
  return NextResponse.json({ success: true });
}