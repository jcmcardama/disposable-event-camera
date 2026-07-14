// Placeholder — the real health check (verifies database connection,
// storage connection, and configuration) is built in Milestone 9.
// This stub exists only so the route file is a valid module with an
// exported HTTP method handler.

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { message: 'Health check endpoint not yet implemented.' },
    { status: 501 }
  );
}