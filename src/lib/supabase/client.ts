// This file creates the Supabase client used in the BROWSER (client components).
// It only has permission to do what our Row Level Security policies allow —
// which is intentional. Guests' devices should never have more access than they need.

import { createClient } from '@supabase/supabase-js';

// These env vars are prefixed with NEXT_PUBLIC_, which tells Next.js it's
// safe to bundle them into the browser JavaScript. They are NOT secret.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// A single shared client instance for the whole browser session.
// We export it so every component/hook that needs to talk to Supabase
// imports the same instance instead of creating a new connection each time.
export const supabaseBrowserClient = createClient(supabaseUrl, supabaseAnonKey);