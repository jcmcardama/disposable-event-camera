// Lets the client ask "how many shots has this device actually used,
// according to the server" - the authoritative number CameraScreen's
// remaining-shots display and capture gating are based on, rather than
// deriving it from the local gallery's photo count (which incorrectly
// drops when a photo is deleted).

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const deviceId = request.nextUrl.searchParams.get('deviceId');
  if (!deviceId) {
    return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('devices')
    .select('shots_used')
    .eq('id', deviceId)
    .single();

  if (error || !data) {
    return NextResponse.json({ shotsUsed: 0 });
  }

  return NextResponse.json({ shotsUsed: data.shots_used });
}