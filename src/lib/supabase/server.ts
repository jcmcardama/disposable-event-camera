// This file creates the Supabase client used on the SERVER (API routes only).
// It uses the service role key, which bypasses Row Level Security entirely.
// This is powerful and dangerous — never import this file into a client component.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// We create a NEW client per call rather than a shared singleton, because
// this runs in serverless functions — each invocation is a fresh environment,
// and there's no long-lived process to share a client across.
export function createSupabaseServerClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}