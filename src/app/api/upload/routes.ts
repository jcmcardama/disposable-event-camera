// Placeholder — the real upload handler (receives compressed photos from
// guest devices, uploads to Supabase Storage, writes metadata to the
// database) is built in Milestone 6. This stub exists only so the route
// file is a valid module with an exported HTTP method handler.

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { message: 'Upload endpoint not yet implemented.' },
    { status: 501 } // 501 = Not Implemented, an honest status for a placeholder
  );
}