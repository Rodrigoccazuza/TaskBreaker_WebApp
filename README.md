# Task Breaker ⚡

**Break it down. Build it up.** — a personal progress tracker that turns big goals into small, checkable tasks.

## What it is

A single-page web app (no build step, no backend). Add goals, break them into tasks, check them off, and watch your progress bars fill up. Progress saves automatically in your browser via `localStorage`.

## Run it

Just open `index.html` in a browser — or serve the folder:

```bash
npx serve .
# or
python3 -m http.server 8000
```

## Features (v1)

- Goal cards with emoji icon, timeline badge, and animated progress bar
- Task checklists: add, check off, and delete tasks
- Overall progress ring in the hero
- Add new goals, reset to demo data
- Celebration pulse when a goal hits 100%
- Dark, responsive design — works on phone and desktop

## Roadmap ideas

- Drag to reorder tasks
- Due dates and reminders
- Streaks and weekly summaries
- Cloud sync / accounts
