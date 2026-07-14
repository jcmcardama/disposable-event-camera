import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { deviceId } = await request.json();
  if (typeof deviceId !== 'string' || !deviceId) {
    return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  // Deleting the device row cascades to its photos (per the `on delete
  // cascade` set up in Milestone 2's schema) - one call handles both.
  const { error } = await supabase.from('devices').delete().eq('id', deviceId);

  if (error) {
    return NextResponse.json({ error: 'Failed to reset device' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}