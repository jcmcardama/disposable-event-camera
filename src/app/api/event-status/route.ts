// Lets the client ask "is the event open, and what's the shot limit"
// without needing direct database access (client never talks to
// Supabase directly, per our Milestone 2 architecture decision).

import { NextResponse } from 'next/server';
import { getEventStatus } from '@/lib/eventStatus';

export async function GET() {
  const status = await getEventStatus();
  return NextResponse.json(status);
}