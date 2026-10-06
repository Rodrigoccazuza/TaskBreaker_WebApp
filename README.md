# Task Breaker ⚡

**Break it down. Build it up.** — a personal progress tracker that turns big goals into small, checkable tasks.

**Live:** https://rodrigoccazuza.github.io/TaskBreaker_WebApp/

## What it is

A single-page web app (no build step, no backend). Add goals, break them into tasks, check them off, and watch your progress fill up. Everything saves automatically in your browser via `localStorage`.

## Run it

Just open `index.html` in a browser — or serve the folder:

```bash
npx serve .
# or
python3 -m http.server 8000
```

## Features (v4)

- **Neumorphic redesign** — soft-extruded UI in the style of the reference
  mockup, with light (default) and dark modes
- **Weekly Routines** — recurring tasks with per-day check dots that reset
  every Monday
- **Rewards** — XP for completions (+10 task, +5 routine day, +50 goal),
  levels, daily streaks, and 7 earnable medals (Duolingo-style)
- **Deadlines** — optional due dates on goals and tasks with overdue / due-soon
  badges, an urgent-alerts strip, and optional browser notifications
- **Add to calendar** — one tap exports a reminder to Google Calendar or
  downloads an `.ics` file
- **Weekly digest** — configure what goes in it and email it to yourself
  in one tap (fully automatic sending needs a backend — see note)
- **Voice input** — 🎤 dictation on tasks and notes (Web Speech API);
  optional spoken celebrations when you finish a goal
- **Subtasks** — every task breaks down into subtasks, as deep as you want.
  Each parent task shows a mini progress bar of its subtasks; tapping a
  parent's checkbox checks everything under it
- **Dashboard** — four category gauges (💼 Career, 💪 Health, 🌱 Personal, 🔒 Private)
  instead of one overall wheel, with goals grouped under each category
- **Wishlist** — things you want; check them off when they're yours
- **Notes** — pinned note cards for ideas and reminders
- **Profile** — about you, plus live stats (goals, tasks done, wishes granted)
- **Skeuomorphic skin** — brushed metal, brass, carved inputs, and a physical
  light/dark mode toggle in the sidebar
- Celebration pulse when a goal hits 100%
- Responsive — sidebar becomes a top bar on phones

## Notes

- Data from v1 (stored under `taskbreaker-v1`) is migrated automatically:
  job/motion goals become Career, the house goal becomes Personal.
- No backend. Your data never leaves your browser.

## Roadmap ideas

- Drag to reorder tasks
- Due dates and reminders
- Streaks and weekly summaries
- Cloud sync / accounts

- **☁️ Cloud sync + accounts (v6):** optional Supabase backend. Create an
  account or sign in from the login screen (email + password, with email
  confirmation) and your goals, tasks, wishlist, notes, and routines sync
  across devices. Everything still works offline first in `localStorage`;
  a status dot in the sidebar shows synced / syncing / offline. There is
  also a "Continue without an account (offline)" path that keeps the app
  fully local. XP, medals, streaks, and settings sync too, through the
  `user_profile` table (one row per user); only the live focus timer and
  the import staging area stay on-device by design.
- **📱 Installable (PWA):** manifest + service worker with an offline app
  shell, so you can Add to Home Screen on iPhone and launch it like an app.

## Cloud sync setup

The app works fully offline out of the box. To turn on cloud sync:

1. Create a free project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. In the Supabase dashboard, open the **SQL editor** and run the whole
   `supabase-migration.sql` file from this repo. It creates the `goals`,
   `tasks`, `wishlist`, `notes`, and `routines` tables with row-level
   security so each user only ever sees their own rows. Then run
   `supabase-migration-2.sql` — it adds the `user_profile` table (one row
   per user) for XP, medals, activity, streak, theme, and settings.
3. Go to **Project Settings → API** in the dashboard and copy:
   - **Project URL** → paste as `url` in `supabase-config.js`
   - **anon / publishable key** → paste as `anonKey` in `supabase-config.js`
   
   Use the **anon key only**. Never put the `service_role` key in this
   file or anywhere in client-side code — it bypasses all database
   security rules.
4. Deploy as usual (e.g. push to `main` for GitHub Pages).

Email confirmation is **on by default**: after creating an account the user
clicks the link in their inbox, then signs in. To turn it off, go to
Dashboard → Authentication → Providers → Email and disable
"Confirm email".

## v5 — Lock-in timer, Connections, Pathfinder (Oct 2026)

- **🔒 Lock-in focus timer:** every task has a timer button. Pick 15/25/45/60 minutes or a custom
  length, and a floating focus bar counts down. Pause/resume, and when time is up you get a browser
  notification, a chime, and +15 XP. The timer survives page reloads.
- **🔗 Connections:** import tasks from your other tools — upload a CSV/JSON file (Google Sheets:
  File → Download → CSV; Notion: Export → CSV), paste a list, or fetch a published Google Sheet
  link. Items land in an import inbox with source labels and date detection.
- **🧭 Pathfinder:** an on-device interpreter. One tap analyzes open tasks + imports, sorts each
  into your Career/Health/Personal/Private categories by keyword, and builds "Today's quest path"
  ordered by urgency and impact. Suggestions can be sent into per-category inbox goals with one tap.
  Note: live two-way sync (Notion/Google OAuth) isn't possible on a static page with no server —
  import is the viable path, and everything stays on your device.

## Native iOS app (Capacitor)

The web app is wrapped with [Capacitor](https://capacitorjs.com/) so it can run
as a native iPhone app and, later, be submitted to the App Store. No rewrite:
the same HTML/CSS/JS runs inside a native shell.

**One-time setup (on a Mac with Xcode installed):**

1. `npm install`
2. `npx cap add ios` — creates the native `ios/` project (gitignored)
3. `npm run sync:ios` — copies the web app into `www/` and syncs it into the
   native project. Re-run after every web change.
4. Open `ios/App/App.xcworkspace` in Xcode, pick your iPhone as the target,
   and press Run. (A free Apple ID works for running on your own device;
   the $99/year Apple Developer Program is only needed for TestFlight /
   App Store distribution.)

**Notes**

- Bundle id: `com.rodrigocazuza.taskbreaker` (change in `capacitor.config.ts`
  and Xcode before App Store submission).
- The service worker intentionally does not register inside the native
  WebView (`capacitor://` protocol); the app shell is bundled with the app.
- Supabase Auth works in the WebView. Email confirmation / password-reset
  links still open the web URL — confirm there, then sign in inside the app.
