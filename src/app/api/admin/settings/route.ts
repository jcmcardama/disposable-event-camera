import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from('event_settings').select('*').eq('id', 1).single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const body = await request.json();
  // Only allow updating these specific fields - never let the request
  // body dictate arbitrary columns (e.g. accidentally overwriting id).
  const { is_enabled, event_start, event_end, shot_limit } = body;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('event_settings')
    .update({
      ...(is_enabled !== undefined && { is_enabled }),
      ...(event_start !== undefined && { event_start }),
      ...(event_end !== undefined && { event_end }),
      ...(shot_limit !== undefined && { shot_limit }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
  return NextResponse.json(data);
}