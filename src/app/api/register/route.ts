// Registers a new device, or confirms an existing one, in the database.
// Called once per device - the first time the app is opened on it.

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { deviceId, displayName } = body;

  // Basic validation - the client should always send both, but
  // never trust client input on the server.
  if (!deviceId || typeof deviceId !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid deviceId' }, { status: 400 });
  }
  if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
    return NextResponse.json({ error: 'Missing or invalid displayName' }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  // upsert with onConflict on the primary key: if this deviceId somehow
  // already exists (e.g. the first request succeeded on the server but
  // the browser never got the response and retried),
  // leave the existing row as-is rather than overwriting the name.
  const { data, error } = await supabase
    .from('devices')
    .upsert(
      { id: deviceId, display_name: displayName.trim() },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    .select()
    .maybeSingle();

  if (error) {
    console.error('Device registration failed:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }

  // If ignoreDuplicates skipped the insert (device already existed),
  // `data` will be null - fetch the existing row instead so the client
  // still gets a confirmed device back either way.
  if (!data) {
    const { data: existing, error: fetchError } = await supabase
      .from('devices')
      .select()
      .eq('id', deviceId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }
    return NextResponse.json({ device: existing });
  }

  return NextResponse.json({ device: data });
}