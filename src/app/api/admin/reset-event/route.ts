import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = createSupabaseServerClient();

  // Deletes every device (cascades to every photo). Storage files
  // themselves are NOT deleted here deliberately - wiping Storage is
  // a separate, more destructive action we don't want bundled silently
  // into "reset the event"; admin can clear the bucket manually via
  // the Supabase dashboard if they actually want that.
  const { error } = await supabase.from('devices').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    return NextResponse.json({ error: 'Failed to reset event' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}