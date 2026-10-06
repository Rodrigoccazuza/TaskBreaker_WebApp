/* Task Breaker — Supabase configuration.
 *
 * SETUP (one time):
 * 1. Create a free project at https://supabase.com/dashboard
 * 2. In the Supabase dashboard, open the SQL editor and run
 *    supabase-migration.sql (ships with this repo).
 * 3. In the dashboard go to Project Settings → API, then paste the
 *    two values below.
 *
 * SECURITY: use the ANON (publishable) key ONLY. Never paste the
 * service_role key here — it bypasses all database security rules and
 * must never ship in client-side code. */

window.TB_SUPABASE = {
  url: "PASTE_YOUR_SUPABASE_URL_HERE",
  anonKey: "PASTE_YOUR_SUPABASE_ANON_KEY_HERE",
};
