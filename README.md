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
