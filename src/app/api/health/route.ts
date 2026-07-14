// Verifies database connection, storage connection, and configuration -
// as required by the spec. No auth required on this one; it's meant to
// be usable as an external uptime check too, and reveals no sensitive data.

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const checks = {
    database: false,
    storage: false,
    configuration: false,
  };

  // Configuration: confirm required env vars are present.
  checks.configuration = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.ADMIN_PASSWORD
  );

  const supabase = createSupabaseServerClient();

  // Database: a trivial query that should always succeed if the
  // connection and credentials are valid.
  const { error: dbError } = await supabase.from('event_settings').select('id').eq('id', 1).single();
  checks.database = !dbError;

  // Storage: list (not upload) to confirm the bucket is reachable
  // without writing anything during a health check.
  const { error: storageError } = await supabase.storage.from('event-photos').list('', { limit: 1 });
  checks.storage = !storageError;

  const allHealthy = checks.database && checks.storage && checks.configuration;

  return NextResponse.json(
    { healthy: allHealthy, checks },
    { status: allHealthy ? 200 : 503 }
  );
}