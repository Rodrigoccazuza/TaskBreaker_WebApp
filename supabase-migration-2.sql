-- Task Breaker -> Supabase migration #2: per-user profile (2026-10-06)
-- Run AFTER supabase-migration.sql. Paste into the Supabase SQL editor.
--
-- WHY THIS LOOKS THE WAY IT DOES (Oct 30, 2026 Supabase change):
-- * New projects already ship WITHOUT auto-grants on new tables
--   (default since the May 30, 2026 rollout; hits all existing projects Oct 30, 2026).
-- * Any table created without an explicit GRANT answers the Data API with
--   "42501 permission denied for table" -- even for service_role.
-- * So: the table below gets an explicit GRANT to `authenticated`, plus an RLS
--   policy scoped to the logged-in user. Nothing is granted to `anon`,
--   because a grant to anon + no RLS = anyone with the anon key reads all rows.
-- * Do NOT "fix" a 42501 with `grant all on all tables in schema public to anon`
--   -- that re-opens the hole this change is meant to close.
-- * The static GitHub Pages frontend must use the ANON (publishable) key only.
--   Never embed the service_role key in client-side JS.
--
-- WHAT THIS STORES: one row per user with their rewards + settings state
-- (xp, medals, activity, streak, theme, digest, voice, notify, focusSessions, ui).
-- The live focus timer (focus) and the import staging area (imports) are
-- ephemeral by design and are intentionally NOT synced.

-- ---------------------------------------------------------------- user_profile
create table public.user_profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  xp integer not null default 0,
  medals text[] not null default '{}',
  activity jsonb not null default '{}',
  streak integer not null default 0,
  theme text not null default 'light',
  digest jsonb not null default '{}',
  voice jsonb not null default '{"celebrations":true}',
  notify jsonb not null default '{"deadlines":false}',
  focus_sessions integer not null default 0,
  ui jsonb not null default '{"skipGoalDeleteConfirm":false}',
  updated_at timestamptz not null default now()
);
alter table public.user_profile enable row level security;
create policy "own profile only" on public.user_profile
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
grant select, insert, update, delete on public.user_profile to authenticated;
grant select, insert, update, delete on public.user_profile to service_role;

-- ---------------------------------------------------------------- sanity check
-- Run after the above. Every row should be 't'. If a first query against
-- user_profile ever returns 42501, re-run the grants for that table name.
select
  grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'user_profile'
  and grantee in ('anon', 'authenticated', 'service_role');
