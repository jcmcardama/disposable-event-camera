// Lets the client ask "is my admin cookie still valid" on page load,
// without needing to submit the password again. Reuses the same
// requireAdmin() guard every other admin route already uses.

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';

export async function GET() {
  const authError = await requireAdmin();
  if (authError) {
    return NextResponse.json({ authenticated: false }, { status: 200 }); // 200, not 401 - this endpoint's whole job is to report the status, not enforce it
  }
  return NextResponse.json({ authenticated: true });
}