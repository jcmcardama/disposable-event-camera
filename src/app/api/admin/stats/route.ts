import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = createSupabaseServerClient();

  const [devicesResult, photosResult] = await Promise.all([
    supabase.from('devices').select('id', { count: 'exact', head: true }),
    supabase.from('photos').select('status'),
  ]);

  const totalDevices = devicesResult.count ?? 0;
  const photos = photosResult.data ?? [];

  const uploaded = photos.filter((p) => p.status === 'uploaded').length;
  const failed = photos.filter((p) => p.status === 'failed').length;
  const pending = photos.filter((p) => p.status === 'uploading').length;

  // Storage usage: sum of file sizes isn't tracked in our schema
  // (only store paths, not sizes), so report photo count as a proxy
  // rather than fetching every file's metadata individually, which
  // would be a lot of API calls for a number that's "nice to have."
  return NextResponse.json({
    totalDevices,
    totalPhotos: photos.length,
    uploaded,
    failed,
    pending,
  });
}