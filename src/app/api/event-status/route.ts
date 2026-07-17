// Lets the client ask "is the event open, and what's the shot limit"
// without needing direct database access.

import { NextResponse } from 'next/server';
import { getEventStatus } from '@/lib/eventStatus';

export async function GET() {
  const status = await getEventStatus();
  return NextResponse.json(status);
}