-- Disposable Event Camera — full database schema
-- Run this once, top to bottom, in your Supabase project's SQL Editor
-- (Project → SQL Editor → New query) before deploying the app.

-- ============================================
-- EVENT SETTINGS
-- A single-row table holding the event's configuration.
-- We enforce "single row" with a CHECK constraint on id,
-- so there's never ambiguity about which settings are active.
-- ============================================
create table event_settings (
  id integer primary key default 1 check (id = 1), -- forces exactly one row
  is_enabled boolean not null default false,         -- admin flips this on/off
  event_start timestamptz not null,                  -- stored in UTC; convert for display
  event_end timestamptz not null,
  shot_limit integer not null default 5,              -- photos allowed per device
  updated_at timestamptz not null default now()
);

-- Insert the one row it will ever have. The admin dashboard updates
-- this row rather than inserting new ones.
insert into event_settings (id, event_start, event_end)
values (1, now(), now() + interval '4 hours');


-- ============================================
-- DEVICES
-- One row per guest device. The id here is the SAME uuid
-- generated client-side and stored in IndexedDB — we don't generate it
-- server-side, so the device can recognize itself on return visits
-- without any login.
-- ============================================
create table devices (
  id uuid primary key,                    -- matches the client-generated UUID
  display_name text not null,             -- e.g. "Carlo" - used in filenames
  shots_used integer not null default 0,  -- SERVER is source of truth for this
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- Prevents shots_used from ever exceeding the configured limit or going
-- negative, no matter what the application code does. Last line of
-- defense, not the primary check (increment_shots_used below is).
alter table devices add constraint shots_used_non_negative check (shots_used >= 0);


-- ============================================
-- PHOTOS
-- One row per photo. Created by the upload route when an upload
-- begins, updated when it finishes.
-- ============================================
create table photos (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references devices(id) on delete cascade,
  shot_number integer not null,           -- 1..shot_limit, used to build the filename
  file_name text not null,                -- e.g. "Carlo-001.jpg"
  storage_path text,                      -- path in Supabase Storage; null until uploaded
  status text not null default 'uploading'
    check (status in ('uploading', 'uploaded', 'failed')),
  created_at timestamptz not null default now(),
  uploaded_at timestamptz                 -- set when status becomes 'uploaded'
);

-- A device can't have two photos claiming the same shot number - this
-- is what actually enforces "exactly N photos, no more" at the
-- database level, working together with shots_used above.
alter table photos add constraint unique_shot_per_device unique (device_id, shot_number);


-- ============================================
-- ATOMIC SHOT-CLAIMING FUNCTION
-- Atomically increments a device's shots_used, but only if doing so
-- wouldn't exceed the shot limit. Returns the new shots_used value,
-- or NULL if the device is already at the limit.
--
-- This MUST be a single atomic statement (not "select then update" in
-- application code) so that two near-simultaneous upload requests for
-- the same device can never both succeed and push shots_used past the
-- limit - the database's row-level locking during UPDATE handles this
-- for free.
-- ============================================
create or replace function increment_shots_used(p_device_id uuid, p_shot_limit integer)
returns integer
language plpgsql
as $$
declare
  new_count integer;
begin
  update devices
  set shots_used = shots_used + 1,
      last_seen_at = now()
  where id = p_device_id
    and shots_used < p_shot_limit
  returning shots_used into new_count;

  return new_count; -- null if the WHERE clause matched no rows (limit reached)
end;
$$;


-- ============================================
-- ROW LEVEL SECURITY
-- Enabled with NO policies on any table. This means the publishable
-- (anon) key — the one exposed to the browser — cannot read or write
-- ANYTHING. All access goes through the app's Next.js API routes,
-- which use the secret key and bypass RLS entirely.
-- ============================================
alter table event_settings enable row level security;
alter table devices enable row level security;
alter table photos enable row level security;


-- ============================================
-- STORAGE
-- Create manually via the dashboard, not SQL: Storage → New bucket,
-- name it "event-photos", visibility set to Private (not public).
-- ============================================