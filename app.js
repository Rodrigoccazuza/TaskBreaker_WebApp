/* Task Breaker v4 — neumorphic edition.
   Dashboard, weekly routines, rewards (XP/medals/streaks), wishlist,
   notes, email digest, deadlines + calendar, voice input.
   Static app: everything persists in localStorage. */

const STORAGE_KEY = "taskbreaker-v4";
const PREV_KEY = "taskbreaker-v2";

const CATEGORIES = [
  { id: "career", icon: "briefcase", name: "Career" },
  { id: "health", icon: "activity", name: "Health" },
  { id: "personal", icon: "smile", name: "Personal" },
  { id: "private", icon: "lock", name: "Private" },
];

const DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const MEDALS = [
  { id: "first-step", icon: "flag", name: "First Step", desc: "Complete your first task" },
  { id: "spark", icon: "star", name: "Spark", desc: "Reach a 3-day streak" },
  { id: "goal-crusher", icon: "check-circle", name: "Goal Crusher", desc: "Complete a full goal" },
  { id: "on-fire", icon: "trending-up", name: "On Fire", desc: "Reach a 7-day streak" },
  { id: "balanced", icon: "sliders", name: "Balanced", desc: "Get every category above 50%" },
  { id: "routine-keeper", icon: "calendar", name: "Routine Keeper", desc: "Finish all routines in a week" },
  { id: "century", icon: "award", name: "Century", desc: "Complete 100 tasks" },
  { id: "deep-focus", icon: "crosshair", name: "Deep Focus", desc: "Finish 3 lock-in focus sessions" },
];

/* ================= utils ================= */

function uid() {
  /* UUIDs for all new records so cloud upserts are natural.
     Older local records keep their legacy string ids until their
     first cloud migration, which remaps them to fresh UUIDs. */
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function catOf(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[2];
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/* ============ project color coding ============
   Every goal carries a color tag: null = Auto (follows status:
   green done / red overdue / amber due soon / orange otherwise),
   or a manual palette pick to tell projects apart at a glance. */
const GOAL_COLORS = {
  orange: "#eb6c37",
  blue: "#4a90d9",
  green: "#3d9e58",
  purple: "#8b7cf0",
  pink: "#e5638f",
  teal: "#2aa198",
  red: "#df6b6b",
  amber: "#f0b429",
};
function goalAutoColor(goal) {
  const pct = goalProgress(goal);
  if (pct >= 100 && goal.tasks.length) return "var(--success)";
  const info = goal.deadline ? deadlineInfo(goal.deadline) : null;
  if (info) {
    if (info.cls === "due-over") return "var(--danger)";
    if (info.cls === "due-soon") return "var(--warning)";
  }
  return "var(--accent)";
}
function goalColorValue(goal) {
  if (goal.color && GOAL_COLORS[goal.color]) return GOAL_COLORS[goal.color];
  return goalAutoColor(goal);
}

/* bootstrap line icons (CDN font): <i> glyphs inherit text color */
const BI_MAP = {
 "zap": "lightning-charge",
 "bar-chart-2": "bar-chart-line",
 "calendar": "calendar",
 "award": "award",
 "star": "star",
 "file-text": "file-text",
 "mail": "envelope",
 "user": "person",
 "link": "link-45deg",
 "compass": "compass",
 "briefcase": "briefcase",
 "activity": "activity",
 "smile": "emoji-smile",
 "lock": "lock",
 "target": "bullseye",
 "film": "film",
 "home": "house",
 "heart": "heart",
 "flag": "flag",
 "check-circle": "check-circle",
 "trending-up": "graph-up-arrow",
 "sliders": "sliders",
 "crosshair": "crosshair",
 "moon": "moon",
 "sun": "sun",
 "bell": "bell",
 "x": "x",
 "plus": "plus",
 "mic": "mic",
 "pause": "pause",
 "play": "play",
 "square": "square",
 "clock": "clock",
 "inbox": "inbox",
 "map": "map",
 "clipboard": "clipboard",
 "file": "file-earmark",
 "database": "database",
 "map-pin": "geo-alt",
 "volume-2": "volume-up"
};
function icon(name, size) {
  const bi = BI_MAP[name] || name;
  return '<i class="bi bi-' + bi + '"></i>';
}
function setIcon(node, name, size) {
  node.innerHTML = icon(name, size);
  return node;
}

function dayKey(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function weekKey(d) {
  d = d || new Date();
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
  const fday = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - fday + 3);
  const week = 1 + Math.round((dt - firstThursday) / (7 * 86400000));
  return dt.getUTCFullYear() + "-W" + String(week).padStart(2, "0");
}

function parseDay(str) { /* "YYYY-MM-DD" -> local Date at midnight */
  const p = (str || "").split("-");
  if (p.length !== 3) return null;
  return new Date(+p[0], +p[1] - 1, +p[2]);
}

function toDayInput(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/* ================= seed / migrate ================= */

function seedGoals() {
  return [
    {
      id: uid(), icon: "target", title: "Land a full-time design job",
      timeline: "2 months", category: "career", deadline: null,
      tasks: [
        { id: uid(), text: "Polish LinkedIn profile", done: true, deadline: null, subtasks: [] },
        {
          id: uid(), text: "Build Behance portfolio", done: false, deadline: null,
          subtasks: [
            { id: uid(), text: "Finish email designs", done: false, deadline: null, subtasks: [] },
            {
              id: uid(), text: "Create case study layouts", done: false, deadline: null,
              subtasks: [
                { id: uid(), text: "Write project summaries", done: false, deadline: null, subtasks: [] },
                { id: uid(), text: "Export device mockups", done: false, deadline: null, subtasks: [] },
              ],
            },
            { id: uid(), text: "Publish 3 projects", done: false, deadline: null, subtasks: [] },
          ],
        },
        { id: uid(), text: "Post shots on Dribbble", done: false, deadline: null, subtasks: [] },
        { id: uid(), text: "Add projects to LandBook", done: false, deadline: null, subtasks: [] },
        { id: uid(), text: "Tweak rodrigocazuza.com", done: false, deadline: null, subtasks: [] },
        { id: uid(), text: "Create 2 new app concepts", done: false, deadline: null, subtasks: [] },
        { id: uid(), text: "Finish a design course", done: false, deadline: null, subtasks: [] },
        { id: uid(), text: "Apply to 5 jobs per week", done: false, deadline: null, subtasks: [] },
      ],
    },
    {
      id: uid(), icon: "film", title: "Learn motion design",
      timeline: "2 months", category: "career", deadline: null,
      tasks: [
        { id: uid(), text: "Pick a course and enroll", done: false, deadline: null, subtasks: [] },
        { id: uid(), text: "Finish the course modules", done: false, deadline: null, subtasks: [] },
        { id: uid(), text: "Build 3 practice pieces", done: false, deadline: null, subtasks: [] },
        { id: uid(), text: "Share work and get feedback", done: false, deadline: null, subtasks: [] },
      ],
    },
    {
      id: uid(), icon: "home", title: "Save money / Buy a house",
      timeline: "Ongoing", category: "personal", deadline: null,
      tasks: [
        { id: uid(), text: "Set a monthly savings target", done: false, deadline: null, subtasks: [] },
        { id: uid(), text: "Open a dedicated savings account", done: false, deadline: null, subtasks: [] },
        { id: uid(), text: "Track expenses every week", done: false, deadline: null, subtasks: [] },
        { id: uid(), text: "Cut one unused subscription", done: false, deadline: null, subtasks: [] },
      ],
    },
    {
      id: uid(), icon: "heart", title: "Move every day",
      timeline: "Ongoing", category: "health", deadline: null,
      tasks: [
        { id: uid(), text: "Work out 3x this week", done: false, deadline: null, subtasks: [] },
        { id: uid(), text: "Walk 8,000 steps daily", done: false, deadline: null, subtasks: [] },
        { id: uid(), text: "Drink 2L of water daily", done: false, deadline: null, subtasks: [] },
      ],
    },
  ];
}

function normalizeTask(t) {
  t = t || {};
  return {
    id: t.id || uid(),
    text: t.text || "",
    done: !!t.done,
    deadline: t.deadline || null,
    subtasks: (t.subtasks || []).map(normalizeTask),
  };
}

function normalizeGoal(g) {
  g = g || {};
  return {
    id: g.id || uid(),
    icon: g.icon || "target",
    title: g.title || "Untitled goal",
    timeline: g.timeline || "",
    deadline: g.deadline || null,
    category: catOf(g.category).id,
    tasks: (g.tasks || []).map(normalizeTask),
    color: g.color && GOAL_COLORS[g.color] ? g.color : null,
  };
}

function normalizeRoutine(r) {
  r = r || {};
  let days = Array.isArray(r.days) ? r.days.filter((d) => d >= 0 && d <= 6) : [1, 2, 3, 4, 5];
  if (!days.length) days = [1, 2, 3, 4, 5];
  return {
    id: r.id || uid(),
    text: r.text || "",
    days,
    done: r.done && typeof r.done === "object" ? r.done : {},
  };
}

function defaultDigest() {
  return { email: "", day: "1", time: "08:00", goals: true, routines: true, wishlist: true };
}

function blankState() {
  return {
    goals: seedGoals().map(normalizeGoal),
    wishlist: [],
    notes: [],
    routines: [],
    xp: 0,
    medals: [],
    activity: {},
    streak: 0,
    theme: "light",
    digest: defaultDigest(),
    voice: { celebrations: true },
    notify: { deadlines: false },
    focus: null,
    imports: [],
    focusSessions: 0,
    ui: { skipGoalDeleteConfirm: false },
  };
}

function normalize(data) {
  const b = blankState();
  return {
    goals: (data.goals || []).map(normalizeGoal),
    wishlist: (data.wishlist || []).map((w) => ({ id: w.id || uid(), text: w.text || "", done: !!w.done })),
    notes: (data.notes || []).map((n) => ({ id: n.id || uid(), title: n.title || "", body: n.body || "" })),
    routines: (data.routines || []).map(normalizeRoutine),
    xp: +data.xp || 0,
    medals: Array.isArray(data.medals) ? data.medals.filter((m) => MEDALS.some((d) => d.id === m)) : [],
    activity: data.activity && typeof data.activity === "object" ? data.activity : {},
    streak: +data.streak || 0,
    theme: data.theme === "dark" ? "dark" : "light",
    digest: { ...b.digest, ...(data.digest || {}) },
    voice: { celebrations: !(data.voice && data.voice.celebrations === false) },
    notify: { deadlines: !!(data.notify && data.notify.deadlines) },
    focus: normalizeFocus(data.focus),
    imports: (data.imports || []).map(normalizeImport),
    focusSessions: +data.focusSessions || 0,
    ui: { skipGoalDeleteConfirm: !!(data.ui && data.ui.skipGoalDeleteConfirm) },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.goals)) return normalize(data);
    }
    const prev = localStorage.getItem(PREV_KEY);
    if (prev) {
      const data = JSON.parse(prev);
      if (data && Array.isArray(data.goals)) return normalize(data);
    }
  } catch (e) { /* fall through */ }
  return blankState();
}

/* ============ undo / redo ============
   Every save() snapshots the pre-change state (coalesced per synchronous
   burst so one user action = one undo step). The live focus timer is kept
   out of snapshots so undo never kills a running session. */
const undoStack = [];
const redoStack = [];
const UNDO_LIMIT = 60;
let lastCommittedJson = null;
let burstBase = null;
let suppressSnapshot = false;

function stateSnapshotJson() {
  return JSON.stringify(state, (k, v) => (k === "focus" ? undefined : v));
}
function flushBurst() {
  const base = burstBase;
  burstBase = null;
  if (base != null && base !== lastCommittedJson) {
    undoStack.push(base);
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
    redoStack.length = 0;
  }
  updateUndoButtons();
}
function save() {
  const json = JSON.stringify(state);
  try { localStorage.setItem(STORAGE_KEY, json); } catch (e) {}
  const snap = stateSnapshotJson();
  if (suppressSnapshot) { lastCommittedJson = snap; return; }
  if (burstBase === null) {
    burstBase = lastCommittedJson;
    queueMicrotask(flushBurst);
  }
  lastCommittedJson = snap;
  scheduleCloudPush();
}
function restoreSnapshot(json) {
  const keepFocus = state.focus;
  const data = JSON.parse(json);
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, data);
  state.focus = keepFocus || null;
  suppressSnapshot = true;
  save();
  suppressSnapshot = false;
  renderAll();
  if (modalTaskId) renderTaskModal();
  updateUndoButtons();
}
function undo() {
  if (!undoStack.length) { toast("Nothing to undo"); return; }
  redoStack.push(stateSnapshotJson());
  restoreSnapshot(undoStack.pop());
  toast("Undone");
}
function redo() {
  if (!redoStack.length) { toast("Nothing to redo"); return; }
  undoStack.push(stateSnapshotJson());
  restoreSnapshot(redoStack.pop());
  toast("Redone");
}
function updateUndoButtons() {
  const u = document.getElementById("undoBtn");
  const r = document.getElementById("redoBtn");
  if (u) u.disabled = !undoStack.length;
  if (r) r.disabled = !redoStack.length;
}
function undoHint() {
  const mac = navigator.platform && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  return (mac ? "\u2318Z" : "Ctrl+Z") + " to undo";
}

const state = load();
if (!state.ui) state.ui = { skipGoalDeleteConfirm: false };

/* ================= task tree ================= */

function taskDone(t) {
  if (t.subtasks && t.subtasks.length) return t.subtasks.every(taskDone);
  return !!t.done;
}

function leavesOf(t) {
  if (t.subtasks && t.subtasks.length) return t.subtasks.flatMap(leavesOf);
  return [t];
}

/* toggles a task; returns number of leaves newly completed */
function toggleTask(t) {
  const ls = leavesOf(t);
  const toDone = !taskDone(t);
  let gained = 0;
  ls.forEach((l) => {
    if (l.done !== toDone) {
      l.done = toDone;
      if (toDone) gained++;
    }
  });
  return gained;
}

function leafStats(tasks) {
  let total = 0, done = 0;
  (tasks || []).forEach((t) => {
    if (t.subtasks && t.subtasks.length) {
      const s = leafStats(t.subtasks);
      total += s.total; done += s.done;
    } else {
      total++;
      if (t.done) done++;
    }
  });
  return { total, done };
}

function goalProgress(goal) {
  if (!goal.tasks.length) return 0;
  const done = goal.tasks.filter(taskDone).length;
  return Math.round((done / goal.tasks.length) * 100);
}

function categoryStats(catId) {
  const tasks = state.goals.filter((g) => g.category === catId).flatMap((g) => g.tasks);
  const done = tasks.filter(taskDone).length;
  return { total: tasks.length, done, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
}

/* all dated items across goals (recursive), for alerts */
function collectDeadlines() {
  const out = [];
  const walk = (t, goalTitle) => {
    if (t.deadline) out.push({ text: t.text, deadline: t.deadline, done: taskDone(t), goal: goalTitle });
    (t.subtasks || []).forEach((st) => walk(st, goalTitle));
  };
  state.goals.forEach((g) => {
    if (g.deadline) out.push({ text: g.title, deadline: g.deadline, done: goalProgress(g) === 100, goal: null });
    g.tasks.forEach((t) => walk(t, g.title));
  });
  return out;
}

function deadlineInfo(deadline) {
  if (!deadline) return null;
  const d = parseDay(deadline);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0) return { text: "overdue", cls: "due-over", diff };
  if (diff === 0) return { text: "due today", cls: "due-soon", diff };
  if (diff <= 2) return { text: "due in " + diff + "d", cls: "due-soon", diff };
  return { text: deadline, cls: "", diff };
}

/* ================= XP / streaks / medals ================= */

function recordActivity() {
  const k = dayKey(new Date());
  state.activity[k] = (state.activity[k] || 0) + 1;
  state.streak = computeStreak();
}

function computeStreak() {
  let s = 0;
  const d = new Date();
  if (!state.activity[dayKey(d)]) d.setDate(d.getDate() - 1);
  while (state.activity[dayKey(d)]) { s++; d.setDate(d.getDate() - 1); }
  return s;
}

function levelInfo() {
  const level = Math.floor(state.xp / 300) + 1;
  const into = state.xp % 300;
  return { level, into, pct: Math.round((into / 300) * 100) };
}

function awardXP(n) {
  if (!n) return;
  state.xp += n;
  recordActivity();
  checkMedals();
  save();
}

function medalEarned(id) {
  return state.medals.includes(id);
}

function checkMedals() {
  const leaves = leafStats(state.goals.flatMap((g) => g.tasks));
  const wk = weekKey();
  const newOnes = [];

  const conditions = {
    "first-step": leaves.done >= 1,
    "spark": state.streak >= 3,
    "goal-crusher": state.goals.some((g) => g.tasks.length && goalProgress(g) === 100),
    "on-fire": state.streak >= 7,
    "balanced": CATEGORIES.every((c) => {
      const s = categoryStats(c.id);
      const leafCount = leafStats(state.goals.filter((g) => g.category === c.id).flatMap((g) => g.tasks)).total;
      return leafCount > 0 && s.pct >= 50;
    }),
    "routine-keeper": state.routines.length > 0 && state.routines.every((r) => {
      const done = r.done[wk] || [];
      return r.days.every((d) => done[d]);
    }),
    "century": leaves.done >= 100,
    "deep-focus": state.focusSessions >= 3,
  };

  MEDALS.forEach((m) => {
    if (!medalEarned(m.id) && conditions[m.id]) {
      state.medals.push(m.id);
      state.xp += 25;
      newOnes.push(m);
    }
  });

  newOnes.forEach((m) => {
    toast("Medal earned: " + m.name + " (+25 XP)");
  });
  return newOnes;
}

/* ================= toast / voice ================= */

let toastTimer = null;

/* tasks whose subtask trees are expanded inline (default: collapsed) */
const expandedTasks = new Set();
function toast(msg, kind) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show" + (kind ? " " + kind : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

function speak(text) {
  if (!state.voice.celebrations) return;
  try {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  } catch (e) {}
}

function attachMic(btn, input) {
  btn.addEventListener("click", () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toast("Voice input isn't supported in this browser", "warning");
      return;
    }
    try {
      const rec = new SR();
      rec.lang = "en-US";
      rec.interimResults = false;
      btn.classList.add("listening");
      rec.onresult = (e) => {
        const text = e.results[0][0].transcript;
        input.value = (input.value ? input.value + " " : "") + text;
        input.focus();
      };
      rec.onend = () => btn.classList.remove("listening");
      rec.onerror = () => {
        btn.classList.remove("listening");
        toast("Couldn't hear that — try again");
      };
      rec.start();
    } catch (e) {
      btn.classList.remove("listening");
      toast("Voice input isn't available right now");
    }
  });
}

/* ================= theme ================= */

function applyTheme() {
  document.body.dataset.theme = state.theme;
  const toggle = document.getElementById("themeToggle");
  toggle.checked = state.theme === "dark";
  setIcon(document.querySelector(".theme-toggle .knob"), state.theme === "dark" ? "moon" : "sun", 16);
  document.getElementById("themeLabel").textContent = state.theme === "dark" ? "Dark mode" : "Light mode";
}

document.getElementById("themeToggle").addEventListener("change", (e) => {
  state.theme = e.target.checked ? "dark" : "light";
  save();
  applyTheme();
});

/* ================= navigation ================= */

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    document.getElementById("page-" + btn.dataset.page).classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

/* ================= dashboard ================= */

const RING_C = 2 * Math.PI * 52;

function renderWheels() {
  const row = document.getElementById("wheelsRow");
  row.innerHTML = "";
  CATEGORIES.forEach((cat) => {
    const s = categoryStats(cat.id);
    const off = RING_C - (RING_C * s.pct) / 100;

    const gauge = el("div", "gauge");
    const dial = el("div", "dial");
    const face = el("div", "dial-face");
    face.innerHTML =
      '<svg viewBox="0 0 120 120"><circle class="g-track" cx="60" cy="60" r="52"/>' +
      '<circle class="g-fill" cx="60" cy="60" r="52" stroke-dasharray="' + RING_C.toFixed(1) +
      '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg>';
    const center = el("div", "g-center");
    center.appendChild(el("strong", null, s.pct + "%"));
    center.appendChild(el("span", null, "done"));
    face.appendChild(center);
    dial.appendChild(face);
    gauge.appendChild(dial);
    const gl = el("p", "g-label");
  gl.innerHTML = icon(cat.icon, 14) + " " + cat.name;
  gauge.appendChild(gl);
    gauge.appendChild(el("p", "g-sub", s.done + "/" + s.total + " tasks"));
    row.appendChild(gauge);
  });
}

function renderAlerts() {
  const strip = document.getElementById("alertsStrip");
  strip.innerHTML = "";
  const items = collectDeadlines()
    .filter((d) => !d.done)
    .map((d) => ({ ...d, info: deadlineInfo(d.deadline) }))
    .filter((d) => d.info && d.info.diff <= 1)
    .sort((a, b) => a.info.diff - b.info.diff);
  if (!items.length) return;

  const card = el("div", "alert-card");
  const ah = el("h4");
  ah.innerHTML = icon("bell", 15) + " " + items.length + " urgent deadline" + (items.length > 1 ? "s" : "");
  card.appendChild(ah);
  const ul = el("ul");
  items.slice(0, 5).forEach((d) => {
    const li = el("li", null, (d.goal ? d.goal + " — " : "") + d.text + " (" + d.info.text + ")");
    ul.appendChild(li);
  });
  card.appendChild(ul);
  strip.appendChild(card);
}

/* --- calendar export --- */

function gcalUrl(title, dateStr) {
  const d = parseDay(dateStr);
  if (!d) return "#";
  const fmt = (x) => toDayInput(x).replace(/-/g, "");
  const end = new Date(d);
  end.setDate(end.getDate() + 1);
  return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" +
    encodeURIComponent(title) + "&dates=" + fmt(d) + "/" + fmt(end);
}

function downloadICS(title, dateStr) {
  const d = parseDay(dateStr);
  if (!d) return;
  const fmt = (x) => toDayInput(x).replace(/-/g, "");
  const end = new Date(d);
  end.setDate(end.getDate() + 1);
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TaskBreaker//EN",
    "BEGIN:VEVENT",
    "UID:" + uid() + "@taskbreaker",
    "DTSTART;VALUE=DATE:" + fmt(d),
    "DTEND;VALUE=DATE:" + fmt(end),
    "SUMMARY:" + title.replace(/[,;\\]/g, " "),
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = "taskbreaker-reminder.ics";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* --- deadline editor row --- */

function deadlineEditor(li, task, label) {
  const old = li.querySelector(":scope > .deadline-row");
  if (old) { old.remove(); return; }

  const row = el("div", "deadline-row");
  const input = el("input");
  input.type = "date";
  input.value = task.deadline || "";
  input.setAttribute("aria-label", "Deadline");
  input.addEventListener("change", () => {
    task.deadline = input.value || null;
    save(); renderAll();
    toast(task.deadline ? "Deadline set: " + task.deadline : "Deadline cleared");
  });
  row.appendChild(input);

  if (task.deadline) {
    const gcal = el("a", "cal-link", "Google Calendar");
    gcal.href = gcalUrl(label, task.deadline);
    gcal.target = "_blank";
    gcal.rel = "noopener";
    const ics = el("button", "cal-link", ".ics file");
    ics.type = "button";
    ics.addEventListener("click", () => downloadICS(label, task.deadline));
    row.append(gcal, ics);
  }
  li.appendChild(row);
  input.focus();
}

/* --- recursive task node --- */

function taskNode(task, removeTask, afterChange, goalTitle) {
  const li = el("li");
  li.dataset.taskId = task.id;
  const done = taskDone(task);
  if (done) li.classList.add("done");

  const row = el("div", "task-row");
  const grip = setIcon(el("span", "drag-handle"), "grip-vertical", 14);
  grip.title = "Drag to reorder";
  grip.setAttribute("aria-label", "Drag to reorder tasks");
  row.appendChild(grip);
  const check = el("input", "task-check");
  check.type = "checkbox";
  check.checked = done;
  check.setAttribute("aria-label", task.text);
  check.addEventListener("change", () => {
    const gained = toggleTask(task);
    if (gained) awardXP(gained * 10);
    else save();
    renderAll();
    if (afterChange) afterChange();
  });

  const span = el("span", "task-text task-open", task.text);
  span.title = "Open task details";
  span.setAttribute("role", "button");
  span.setAttribute("tabindex", "0");
  span.addEventListener("click", () => openTaskModal(task.id));
  span.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openTaskModal(task.id); } });

  const info = deadlineInfo(task.deadline);
  if (info) {
    const badge = el("span", "badge " + info.cls, info.text);
    row.append(check, span, badge);
  } else {
    row.append(check, span);
  }

  if (state.focus && state.focus.taskId === task.id) {
    li.classList.add("locked");
    row.appendChild(el("span", "lock-time", fmtClock(state.focus.remainingSec)));
  }

  const calBtn = setIcon(el("button", "task-cal-btn"), "calendar", 14);
  calBtn.type = "button";
  calBtn.title = "Deadline & calendar";
  calBtn.classList.add("tool");
  calBtn.setAttribute("aria-label", "Set deadline");
  calBtn.addEventListener("click", () => deadlineEditor(li, task, task.text));

  const subBtn = setIcon(el("button", "task-sub-btn"), "plus", 14);
  subBtn.type = "button";
  subBtn.title = "Break into subtasks";
  subBtn.setAttribute("aria-label", "Add subtask");
  subBtn.addEventListener("click", () => {
    expandedTasks.add(task.id);
    li.classList.remove("task-collapsed");
    showSubtaskForm(li, task);
  });

  const lockBtn = setIcon(el("button", "task-lock-btn"), "clock", 14);
  lockBtn.type = "button";
  lockBtn.title = "Lock in — focus timer";
  lockBtn.setAttribute("aria-label", "Lock in with a focus timer");
  lockBtn.addEventListener("click", () => toggleTimerPop(li, task, goalTitle));

  const x = setIcon(el("button", "task-del"), "x", 13);
  x.type = "button";
  x.setAttribute("aria-label", "Delete task");
  x.addEventListener("click", async () => {
    if (task.subtasks && task.subtasks.length) {
      const r = await confirmAction({
        title: "Delete this task?",
        message: "\u201C" + task.text + "\u201D and its " + task.subtasks.length + " subtask" + (task.subtasks.length === 1 ? "" : "s") + " will be permanently deleted.",
        confirmText: "Delete task",
      });
      if (!r.result) return;
    }
    removeTask(task);
  });

  const tools = el("div", "task-tools");
  tools.append(calBtn, lockBtn, subBtn, x);
  row.append(tools);
  li.appendChild(row);

  if (task.subtasks && task.subtasks.length) {
    const exp = setIcon(el("button", "task-expand"), "chevron-down", 14);
    exp.type = "button";
    exp.title = "Show/hide subtasks";
    exp.setAttribute("aria-label", "Show or hide subtasks");
    exp.addEventListener("click", () => {
      if (expandedTasks.has(task.id)) expandedTasks.delete(task.id);
      else expandedTasks.add(task.id);
      li.classList.toggle("task-collapsed", !expandedTasks.has(task.id));
    });
    row.prepend(exp);
    if (!expandedTasks.has(task.id)) li.classList.add("task-collapsed");
    const kids = task.subtasks;
    const kd = kids.filter(taskDone).length;
    const pct = Math.round((kd / kids.length) * 100);

    const miniRow = el("div", "mini-row");
    const mini = el("div", "mini-progress");
    const fill = el("div", "mini-fill");
    fill.style.width = pct + "%";
    if (pct >= 100) fill.classList.add("done");
    mini.appendChild(fill);
    miniRow.appendChild(mini);
    miniRow.appendChild(el("span", "mini-label", kd + "/" + kids.length + " subtasks"));
    li.appendChild(miniRow);

    const wrap = el("div", "subtask-wrap");
    const ul = el("ul", "task-list subtasks");
    kids.forEach((st) => ul.appendChild(taskNode(st, (child) => {
      maybeCancelFocus(child.id);
      task.subtasks = task.subtasks.filter((s) => s.id !== child.id);
      save(); renderAll();
    }, afterChange, goalTitle)));
    makeSortable(ul, task.subtasks);
    wrap.appendChild(ul);
    li.appendChild(wrap);
  }

  return li;
}

function showSubtaskForm(li, task) {
  let wrap = li.querySelector(":scope > .subtask-wrap");
  if (!wrap) {
    wrap = el("div", "subtask-wrap");
    wrap.appendChild(el("ul", "task-list subtasks"));
    li.appendChild(wrap);
  }
  if (wrap.querySelector(".subtask-form")) {
    wrap.querySelector(".subtask-form input").focus();
    return;
  }
  const ul = wrap.querySelector("ul");
  const form = el("form", "add-task subtask-form");
  const input = el("input");
  input.type = "text";
  input.placeholder = "Break it down further…";
  input.maxLength = 120;
  input.autocomplete = "off";
  const add = el("button", "btn btn-primary", "+");
  add.type = "submit";
  add.setAttribute("aria-label", "Add subtask");
  form.append(input, add);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    task.subtasks.push({ id: uid(), text, done: false, deadline: null, subtasks: [] });
    expandedTasks.add(task.id);
    save(); renderAll();
  });
  wrap.insertBefore(form, ul);
  input.focus();
}

function goalCard(goal) {
  const card = el("article", "card goal-card");
  card.dataset.goal = goal.id;
  card.style.setProperty("--goal-color", goalColorValue(goal));

  const top = el("div", "goal-top");
  const gic = el("span", "goal-icon");
  setIcon(gic, goal.icon, 22);
  top.appendChild(gic);
  const headings = el("div", "goal-headings");
  headings.appendChild(el("h3", "goal-title", goal.title));
  const badges = el("div", "badge-row");
  const cat = catOf(goal.category);
  const cb = el("span", "badge cat");
  cb.innerHTML = icon(cat.icon, 12) + " " + cat.name;
  badges.appendChild(cb);
  if (goal.timeline) {
    const tb = el("span", "badge");
    tb.innerHTML = icon("clock", 12) + " " + goal.timeline;
    badges.appendChild(tb);
  }
  const ginfo = deadlineInfo(goal.deadline);
  if (ginfo) {
    const db = el("span", "badge " + ginfo.cls);
    db.innerHTML = icon("calendar", 12) + " " + ginfo.text;
    badges.appendChild(db);
  }
  headings.appendChild(badges);
  top.appendChild(headings);

  const calBtn = setIcon(el("button", "icon-btn tool"), "calendar", 15);
  calBtn.title = "Goal deadline & calendar";
  calBtn.setAttribute("aria-label", "Set goal deadline");
  calBtn.addEventListener("click", () => deadlineEditor(card, goal, goal.title));
  const colorBtn = el("button", "icon-btn tool color-dot-btn");
  colorBtn.innerHTML = '<span class="color-dot"></span>';
  colorBtn.type = "button";
  colorBtn.title = "Color code this project";
  colorBtn.setAttribute("aria-label", "Color code this project");
  colorBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleColorPicker(colorBtn, goal); });
  const del = setIcon(el("button", "icon-btn"), "x", 14);
  del.title = "Delete goal";
  del.setAttribute("aria-label", "Delete goal");
    del.addEventListener("click", async () => {
    if (!state.ui.skipGoalDeleteConfirm) {
      const r = await confirmAction({
        title: "Delete this goal?",
        message: "\u201C" + goal.title + "\u201D and all of its tasks will be permanently deleted.",
        confirmText: "Delete goal",
        checkboxLabel: "Don't ask me again",
      });
      if (!r.result) return;
      if (r.dontAsk) state.ui.skipGoalDeleteConfirm = true;
    }
    state.goals = state.goals.filter((g) => g.id !== goal.id);
    save(); renderAll();
    toast("Goal deleted \u2014 " + undoHint(), "warning");
  });
  top.append(calBtn, colorBtn, del);
  card.appendChild(top);

  const pct = goalProgress(goal);
  const leaves = leafStats(goal.tasks);
  const prog = el("div", "progress");
  const bar = el("div", "progress-bar");
  const fill = el("div", "progress-fill");
  fill.style.width = pct + "%";
  if (pct >= 100) fill.classList.add("done");
  bar.appendChild(fill);
  prog.appendChild(bar);
  prog.appendChild(el("span", "progress-text", leaves.done + "/" + leaves.total + " done"));
  card.appendChild(prog);
  if (pct === 100 && goal.tasks.length) card.classList.add("complete");

  const list = el("ul", "task-list");
  const removeTop = (task) => {
    maybeCancelFocus(task.id);
    goal.tasks = goal.tasks.filter((t) => t.id !== task.id);
    save(); renderAll();
  };
  const celebrate = () => {
    if (goalProgress(goal) === 100 && goal.tasks.length) {
      awardXP(50);
      const node = document.querySelector('[data-goal="' + goal.id + '"]');
      if (node) { node.classList.add("celebrate"); setTimeout(() => node.classList.remove("celebrate"), 600); }
      toast("Goal complete: " + goal.title + " (+50 XP)", "success");
      speak("Goal complete. " + goal.title + ". Amazing work.");
      renderAll();
    }
  };
  goal.tasks.forEach((task) => list.appendChild(taskNode(task, removeTop, celebrate, goal.title)));
  makeSortable(list, goal.tasks);
  card.appendChild(list);

  const form = el("form", "add-task");
  const input = el("input");
  input.type = "text"; input.placeholder = "Add a task…"; input.maxLength = 120; input.autocomplete = "off";
  const mic = setIcon(el("button", "mic-btn"), "mic", 16);
  mic.type = "button"; mic.title = "Dictate task"; mic.style.width = "46px"; mic.style.fontSize = "18px";
  attachMic(mic, input);
  const add = el("button", "btn btn-primary", "+");
  add.type = "submit"; add.setAttribute("aria-label", "Add task");
  form.append(input, mic, add);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    goal.tasks.push({ id: uid(), text, done: false, deadline: null, subtasks: [] });
    save(); renderAll();
  });
  card.appendChild(form);

  return card;
}

function renderGoals() {
  const wrap = document.getElementById("goalsByCategory");
  wrap.innerHTML = "";
  CATEGORIES.forEach((cat) => {
    const section = el("div", "cat-section");
    const head = el("div", "cat-head");
    const h3 = el("h3");
    h3.innerHTML = icon(cat.icon) + " " + cat.name;
    head.appendChild(h3);
    const goals = state.goals.filter((g) => g.category === cat.id);
    head.appendChild(el("span", "cat-count", goals.length + (goals.length === 1 ? " goal" : " goals")));
    section.appendChild(head);

    if (goals.length) {
      const grid = el("div", "goal-grid");
      goals.forEach((g) => grid.appendChild(goalCard(g)));
      section.appendChild(grid);
    } else {
      section.appendChild(el("p", "empty-note", "No goals here yet — add one below."));
    }
    wrap.appendChild(section);
  });
}

document.getElementById("addGoalBtn").addEventListener("click", () => {
  const title = document.getElementById("newGoalTitle").value.trim();
  if (!title) { document.getElementById("newGoalTitle").focus(); return; }
  state.goals.push({
    id: uid(),
    icon: "target",
    title,
    timeline: document.getElementById("newGoalTimeline").value.trim(),
    deadline: document.getElementById("newGoalDeadline").value || null,
    category: document.getElementById("newGoalCategory").value,
    tasks: [],
  });
  document.getElementById("newGoalTitle").value = "";
  document.getElementById("newGoalTimeline").value = "";
  document.getElementById("newGoalDeadline").value = "";
  save(); renderAll();
  toast("New goal added", "success");
});

/* ================= weekly routines ================= */

function routineWeekDone(r) {
  const wk = weekKey();
  if (!r.done[wk]) r.done[wk] = [false, false, false, false, false, false, false];
  return r.done[wk];
}

function renderRoutines() {
  const wrap = document.getElementById("routineList");
  wrap.innerHTML = "";
  if (!state.routines.length) {
    const c = el("article", "card");
    c.appendChild(el("p", "empty-note", "No routines yet. Add one below — e.g. “Gym”, “Read 20 pages”, “Call mom”."));
    wrap.appendChild(c);
  }
  state.routines.forEach((r) => {
    const done = routineWeekDone(r);
    const allDone = r.days.every((d) => done[d]);
    const card = el("article", "card routine-card");
    const top = el("div", "routine-top" + (allDone ? " done" : ""));
    top.appendChild(el("h4", null, r.text));
    const x = setIcon(el("button", "icon-btn"), "x", 14);
    x.title = "Delete routine";
    x.setAttribute("aria-label", "Delete routine");
    x.addEventListener("click", () => {
      if (confirm('Delete the routine "' + r.text + '"?')) {
        state.routines = state.routines.filter((o) => o.id !== r.id);
        save(); renderRoutines(); renderRewards();
      }
    });
    top.appendChild(x);
    card.appendChild(top);

    const dots = el("div", "day-dots");
    for (let d = 0; d < 7; d++) {
      const assigned = r.days.includes(d);
      const b = el("button", "day-dot" + (assigned ? " active-day" : "") + (done[d] ? " done" : ""), DAY_NAMES[d]);
      b.type = "button";
      b.title = DAY_FULL[d];
      b.disabled = !assigned;
      b.style.opacity = assigned ? "1" : "0.35";
      b.addEventListener("click", () => {
        done[d] = !done[d];
        if (done[d]) { awardXP(5); toast("+5 XP"); }
        else save();
        checkMedals(); save();
        renderRoutines(); renderRewards();
      });
      dots.appendChild(b);
    }
    card.appendChild(dots);
    wrap.appendChild(card);
  });
}

const routineDaySel = new Set([1, 2, 3, 4, 5]);

function renderDayPicker() {
  const wrap = document.getElementById("routineDays");
  wrap.innerHTML = "";
  for (let d = 0; d < 7; d++) {
    const b = el("button", "day-pick" + (routineDaySel.has(d) ? " selected" : ""), DAY_NAMES[d]);
    b.type = "button";
    b.title = DAY_FULL[d];
    b.addEventListener("click", () => {
      if (routineDaySel.has(d)) routineDaySel.delete(d);
      else routineDaySel.add(d);
      renderDayPicker();
    });
    wrap.appendChild(b);
  }
}

document.getElementById("addRoutineBtn").addEventListener("click", () => {
  const input = document.getElementById("routineInput");
  const text = input.value.trim();
  if (!text) { input.focus(); return; }
  if (!routineDaySel.size) { toast("Pick at least one day", "warning"); return; }
  state.routines.push({ id: uid(), text, days: [...routineDaySel].sort(), done: {} });
  input.value = "";
  save(); renderRoutines();
  toast("Routine added — it resets every Monday");
});

/* ================= rewards ================= */

function renderRewards() {
  const li = levelInfo();
  document.getElementById("levelBadge").textContent = li.level;
  document.getElementById("levelTitle").textContent = "Level " + li.level;
  document.getElementById("xpFill").style.width = li.pct + "%";
  document.getElementById("xpText").textContent = state.xp + " XP total · " + li.into + "/300 to next level";
  document.getElementById("streakPill").innerHTML = icon("zap", 14) + " " + state.streak + "-day streak";

  const grid = document.getElementById("medalsGrid");
  grid.innerHTML = "";
  MEDALS.forEach((m) => {
    const earned = medalEarned(m.id);
    const card = el("div", "medal" + (earned ? " earned" : ""));
    const mi = el("div", "medal-icon");
  setIcon(mi, m.icon, 26);
  card.appendChild(mi);
    card.appendChild(el("h4", null, m.name));
    card.appendChild(el("p", null, (earned ? "Earned! " : "Locked — ") + m.desc));
    grid.appendChild(card);
  });
}

/* ================= wishlist ================= */

function renderWishlist() {
  const list = document.getElementById("wishlistList");
  list.innerHTML = "";
  if (!state.wishlist.length) {
    list.appendChild(el("p", "empty-note", "Nothing here yet. Add your first wish above."));
    return;
  }
  state.wishlist.forEach((item) => {
    const li = el("li");
    if (item.done) li.classList.add("done");
    const check = el("input", "task-check");
    check.type = "checkbox";
    check.checked = item.done;
    check.setAttribute("aria-label", item.text);
    check.addEventListener("change", () => {
      item.done = !item.done;
      if (item.done) { awardXP(10); toast("+10 XP — wish granted!"); }
      else save();
      renderWishlist(); renderProfile(); renderRewards();
    });
    li.append(check, el("span", null, item.text));
    const x = setIcon(el("button", "task-del"), "x", 13);
    x.setAttribute("aria-label", "Delete wish");
    x.addEventListener("click", () => {
      state.wishlist = state.wishlist.filter((w) => w.id !== item.id);
      save(); renderWishlist(); renderProfile();
    });
    li.appendChild(x);
    list.appendChild(li);
  });
}

document.getElementById("wishlistForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("wishlistInput");
  const text = input.value.trim();
  if (!text) return;
  state.wishlist.push({ id: uid(), text, done: false });
  input.value = "";
  save(); renderWishlist(); renderProfile();
});

/* ================= notes ================= */

function renderNotes() {
  const grid = document.getElementById("notesGrid");
  grid.innerHTML = "";
  if (!state.notes.length) {
    grid.appendChild(el("p", "empty-note", "No notes yet. Pin your first one above."));
    return;
  }
  state.notes.forEach((note) => {
    const card = el("article", "note-card");
    card.appendChild(el("h4", null, note.title || "Untitled"));
    if (note.body) card.appendChild(el("p", null, note.body));
    const x = setIcon(el("button", "task-del"), "x", 13);
    x.setAttribute("aria-label", "Delete note");
    x.addEventListener("click", () => {
      state.notes = state.notes.filter((n) => n.id !== note.id);
      save(); renderNotes();
    });
    card.appendChild(x);
    grid.appendChild(card);
  });
}

document.getElementById("addNoteBtn").addEventListener("click", () => {
  const title = document.getElementById("noteTitle").value.trim();
  const body = document.getElementById("noteBody").value.trim();
  if (!title && !body) return;
  state.notes.unshift({ id: uid(), title, body });
  document.getElementById("noteTitle").value = "";
  document.getElementById("noteBody").value = "";
  save(); renderNotes();
  toast("Note pinned");
});

/* ================= digest ================= */

function loadDigestForm() {
  const d = state.digest;
  document.getElementById("digestEmail").value = d.email || "";
  document.getElementById("digestDay").value = d.day;
  document.getElementById("digestTime").value = d.time || "08:00";
  document.getElementById("digestGoals").checked = !!d.goals;
  document.getElementById("digestRoutines").checked = !!d.routines;
  document.getElementById("digestWishlist").checked = !!d.wishlist;
}

document.getElementById("saveDigestBtn").addEventListener("click", () => {
  state.digest = {
    email: document.getElementById("digestEmail").value.trim(),
    day: document.getElementById("digestDay").value,
    time: document.getElementById("digestTime").value || "08:00",
    goals: document.getElementById("digestGoals").checked,
    routines: document.getElementById("digestRoutines").checked,
    wishlist: document.getElementById("digestWishlist").checked,
  };
  save(); renderDigestPreview();
  toast("Digest settings saved");
});

function buildDigest() {
  const d = state.digest;
  const lines = [];
  lines.push("Task Breaker — Weekly Digest");
  lines.push(new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }));
  lines.push("");

  if (d.goals) {
    lines.push("GOALS");
    state.goals.forEach((g) => {
      const leaves = leafStats(g.tasks);
      lines.push(`• ${g.title} — ${goalProgress(g)}% (${leaves.done}/${leaves.total} tasks)`);
    });
    if (!state.goals.length) lines.push("• No goals yet.");
    lines.push("");
  }
  if (d.routines) {
    const wk = weekKey();
    lines.push("WEEKLY ROUTINES");
    state.routines.forEach((r) => {
      const done = r.done[wk] || [];
      const n = r.days.filter((day) => done[day]).length;
      lines.push(`• ${r.text} — ${n}/${r.days.length} days`);
    });
    if (!state.routines.length) lines.push("• No routines yet.");
    lines.push("");
  }
  if (d.wishlist) {
    const open = state.wishlist.filter((w) => !w.done);
    lines.push("WISHLIST (" + open.length + " open)");
    open.slice(0, 8).forEach((w) => lines.push("• " + w.text));
    if (!open.length) lines.push("• All granted!");
    lines.push("");
  }
  lines.push(`Level ${levelInfo().level} · ${state.xp} XP · ${state.streak}-day streak`);
  lines.push("Keep breaking it down.");
  return lines.join("\n");
}

function renderDigestPreview() {
  document.getElementById("digestPreview").textContent = buildDigest();
}

document.getElementById("sendDigestBtn").addEventListener("click", () => {
  const to = (state.digest.email || "").trim();
  const subject = encodeURIComponent("My Task Breaker Weekly Digest");
  const body = encodeURIComponent(buildDigest());
  window.location.href = "mailto:" + encodeURIComponent(to) + "?subject=" + subject + "&body=" + body;
});

/* ================= profile ================= */

function renderProfile() {
  const stats = document.getElementById("profileStats");
  stats.innerHTML = "";
  const leaves = leafStats(state.goals.flatMap((g) => g.tasks));
  [
    [state.goals.length, "goals"],
    [leaves.done + "/" + leaves.total, "tasks done"],
    [state.xp + " XP", "level " + levelInfo().level],
    [state.wishlist.filter((w) => w.done).length + "/" + state.wishlist.length, "wishes granted"],
  ].forEach(([num, label]) => {
    const s = el("div", "stat");
    s.appendChild(el("strong", null, String(num)));
    s.appendChild(el("span", null, label));
    stats.appendChild(s);
  });

  document.getElementById("setVoice").checked = state.voice.celebrations;
  document.getElementById("setNotify").checked = state.notify.deadlines;
}

document.getElementById("setVoice").addEventListener("change", (e) => {
  state.voice.celebrations = e.target.checked;
  save();
  toast(e.target.checked ? "Spoken celebrations on" : "Spoken celebrations off");
});

document.getElementById("setNotify").addEventListener("change", async (e) => {
  if (e.target.checked) {
    if (!("Notification" in window)) {
      toast("Notifications aren't supported in this browser");
      e.target.checked = false;
      return;
    }
    let perm = Notification.permission;
    if (perm !== "granted") {
      try { perm = await Notification.requestPermission(); } catch (err) { perm = "denied"; }
    }
    if (perm !== "granted") {
      toast("Enable notifications in your browser to get alerts");
      e.target.checked = false;
      return;
    }
    state.notify.deadlines = true;
    save();
    toast("Deadline alerts on");
    fireDeadlineAlerts();
  } else {
    state.notify.deadlines = false;
    save();
    toast("Deadline alerts off");
  }
});

function fireDeadlineAlerts() {
  if (!state.notify.deadlines) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const urgent = collectDeadlines()
    .filter((d) => !d.done)
    .map((d) => ({ ...d, info: deadlineInfo(d.deadline) }))
    .filter((d) => d.info && d.info.diff <= 0);
  if (!urgent.length) return;
  try {
    new Notification("Task Breaker: " + urgent.length + " urgent deadline" + (urgent.length > 1 ? "s" : ""), {
      body: urgent.slice(0, 4).map((u) => "• " + u.text + " (" + u.info.text + ")").join("\n"),
    });
  } catch (e) {}
}

/* ================= boot ================= */

function renderAll() {
  document.getElementById("todayLabel").textContent =
    new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  renderAlerts();
  renderWheels();
  renderGoals();
  renderRoutines();
  renderRewards();
  renderWishlist();
  renderNotes();
  renderDigestPreview();
  renderProfile();
  renderImports();
  renderFocusBar();
}

let appBooted = false;
function bootApp() {
  if (appBooted) return;
  appBooted = true;
  attachMic(document.getElementById("noteMic"), document.getElementById("noteBody"));

  /* wishlist mic */
  (function () {
    const form = document.getElementById("wishlistForm");
    const input = document.getElementById("wishlistInput");
    const mic = setIcon(el("button", "mic-btn"), "mic", 16);
    mic.type = "button";
    mic.title = "Dictate wish";
    mic.style.width = "52px";
    attachMic(mic, input);
    form.insertBefore(mic, form.querySelector('button[type="submit"]'));
  })();

  applyTheme();
  loadDigestForm();
  state.streak = computeStreak();
  checkMedals();
  save();
  renderAll();
  fireDeadlineAlerts();
}

/* ================= v5: normalize helpers for new state ================= */

function normalizeFocus(f) {
  if (!f || typeof f !== "object") return null;
  return {
    taskId: f.taskId || null,
    taskText: String(f.taskText || ""),
    goal: String(f.goal || ""),
    totalSec: +f.totalSec || 0,
    remainingSec: +f.remainingSec || 0,
    running: !!f.running,
    endsAt: +f.endsAt || 0,
  };
}

function normalizeImport(i) {
  i = i || {};
  return {
    id: i.id || uid(),
    title: String(i.title || "").slice(0, 200),
    detail: String(i.detail || "").slice(0, 500),
    date: /^\d{4}-\d{2}-\d{2}$/.test(i.date || "") ? i.date : null,
    source: i.source || "import",
    added: !!i.added,
  };
}

function maybeCancelFocus(taskId) {
  if (state.focus && state.focus.taskId === taskId) stopFocus(true);
}

/* ================= v5: lock-in focus timer ================= */

let focusTimerId = null;

function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  return String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0");
}

async function ensureNotifyPerm() {
  if (!("Notification" in window)) { toast("Notifications aren't supported in this browser"); return false; }
  if (Notification.permission === "granted") return true;
  try {
    const p = await Notification.requestPermission();
    if (p === "granted") return true;
  } catch (e) {}
  toast("Timer started — keep this tab open, since notifications are blocked");
  return false;
}

function startFocus(taskId, taskText, goalTitle, minutes) {
  const totalSec = Math.round(minutes * 60);
  if (state.focus) stopFocus(true);
  state.focus = {
    taskId, taskText, goal: goalTitle || "",
    totalSec, remainingSec: totalSec, running: true,
    endsAt: Date.now() + totalSec * 1000,
  };
  save();
  clearInterval(focusTimerId);
  focusTimerId = setInterval(tickFocus, 1000);
  renderAll();
  toast("Locked in for " + minutes + "m: " + taskText);
}

function tickFocus() {
  const f = state.focus;
  if (!f || !f.running) return;
  const left = Math.max(0, Math.round((f.endsAt - Date.now()) / 1000));
  f.remainingSec = left;
  const timeEl = document.getElementById("focusTime");
  if (timeEl) timeEl.textContent = fmtClock(left);
  document.querySelectorAll(".lock-time").forEach((n) => { n.textContent = fmtClock(left); });
  if (left <= 0) completeFocus();
}

function pauseFocus() {
  const f = state.focus;
  if (!f) return;
  if (f.running) {
    f.remainingSec = Math.max(0, Math.round((f.endsAt - Date.now()) / 1000));
    f.running = false; f.endsAt = 0;
  } else {
    f.running = true;
    f.endsAt = Date.now() + f.remainingSec * 1000;
  }
  save(); renderFocusBar();
}

function stopFocus(silent) {
  state.focus = null;
  clearInterval(focusTimerId); focusTimerId = null;
  save(); renderAll();
  if (!silent) toast("Focus session ended");
}

function completeFocus() {
  const f = state.focus;
  clearInterval(focusTimerId); focusTimerId = null;
  state.focus = null;
  state.focusSessions = (state.focusSessions || 0) + 1;
  state.xp += 15;
  recordActivity(); checkMedals(); save();
  renderAll();
  chime();
  speak("Time is up. Great focus session.");
  toast("Time's up: " + (f ? f.taskText : "task") + " (+15 XP)", "success");
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Timer up — " + (f ? f.taskText : "task"), {
        body: "Your lock-in session is complete. +15 XP earned.",
      });
    }
  } catch (e) {}
}

function chime() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.55);
    });
  } catch (e) {}
}

function renderFocusBar() {
  const bar = document.getElementById("focusBar");
  const f = state.focus;
  if (!f) { bar.hidden = true; return; }
  bar.hidden = false;
  document.getElementById("focusTaskName").textContent = f.taskText;
  document.getElementById("focusGoalName").textContent = f.goal || "Focus session";
  document.getElementById("focusTime").textContent = fmtClock(f.remainingSec);
  document.getElementById("focusPauseBtn").textContent = f.running ? "⏸️" : "▶️";
}

function toggleTimerPop(li, task, goalTitle) {
  const old = li.querySelector(":scope > .timer-pop");
  if (old) { old.remove(); return; }
  const pop = el("div", "timer-pop");
  [15, 25, 45, 60].forEach((m) => {
    const b = el("button", "timer-chip", m + "m");
    b.type = "button";
    b.addEventListener("click", async () => {
      await ensureNotifyPerm();
      startFocus(task.id, task.text, goalTitle, m);
    });
    pop.appendChild(b);
  });
  const custom = el("div", "timer-custom");
  const inp = el("input");
  inp.type = "number"; inp.min = "1"; inp.max = "180"; inp.placeholder = "min";
  inp.setAttribute("aria-label", "Custom minutes");
  const go = el("button", "timer-chip", "Start");
  go.type = "button";
  go.addEventListener("click", async () => {
    const m = Math.min(180, Math.max(1, parseInt(inp.value, 10) || 0));
    if (!m) { toast("Enter minutes first"); return; }
    await ensureNotifyPerm();
    startFocus(task.id, task.text, goalTitle, m);
  });
  custom.append(inp, go);
  pop.appendChild(custom);
  li.appendChild(pop);
  inp.focus();
}

/* ================= v5: connections — imports ================= */

function extractDate(text) {
  text = String(text || "");
  let m = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + "-" + m[2] + "-" + m[3];
  m = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    let y = +m[3]; if (y < 100) y += 2000;
    return y + "-" + String(+m[1]).padStart(2, "0") + "-" + String(+m[2]).padStart(2, "0");
  }
  const months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  m = text.toLowerCase().match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})/);
  if (m) {
    const now = new Date();
    let y = now.getFullYear();
    if (new Date(y, months[m[1]] - 1, +m[2]) < new Date(now.getFullYear(), now.getMonth(), now.getDate())) y++;
    return y + "-" + String(months[m[1]]).padStart(2, "0") + "-" + String(+m[2]).padStart(2, "0");
  }
  if (/\btoday\b/i.test(text)) return toDayInput(new Date());
  if (/\btomorrow\b/i.test(text)) { const d = new Date(); d.setDate(d.getDate() + 1); return toDayInput(d); }
  return null;
}

function stripDateSuffix(s) {
  return s.replace(/\s*(due:?)?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}).*$/i, "").trim() || s;
}

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  row.push(field); rows.push(row);
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

function rowsToItems(rows) {
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (names) => head.findIndex((h) => names.some((n) => h.includes(n)));
  let ti = 0, di = -1, dti = -1, body = rows;
  if (head.some((h) => /task|title|name|todo|item/.test(h))) {
    ti = idx(["task", "title", "name", "todo", "item"]);
    if (ti < 0) ti = 0;
    di = idx(["detail", "note", "desc"]);
    dti = idx(["date", "due", "deadline"]);
    body = rows.slice(1);
  }
  return body.map((r) => {
    const rawTitle = (r[ti] || "").trim();
    return {
      title: stripDateSuffix(rawTitle),
      detail: di >= 0 ? (r[di] || "").trim() : "",
      date: dti >= 0 ? extractDate(r[dti] || "") : extractDate(rawTitle),
    };
  });
}

function addImports(items, source) {
  let n = 0;
  items.forEach((it) => {
    const title = String(it.title || "").trim();
    if (!title) return;
    state.imports.push(normalizeImport({ title, detail: it.detail, date: it.date, source }));
    n++;
  });
  save(); renderImports();
  toast(n ? "Imported " + n + " item" + (n > 1 ? "s" : "") + " from " + source : "Nothing to import");
}

function renderImports() {
  const list = document.getElementById("importList");
  if (!list) return;
  list.innerHTML = "";
  const items = state.imports.filter((i) => !i.added);
  document.getElementById("importCount").textContent = items.length;
  if (!items.length) {
    list.appendChild(el("li", "fine-print",
      state.imports.length ? "All imported items have been organized." : "Nothing imported yet — bring in a file, some pasted text, or a sheet link above."));
    return;
  }
  items.slice().reverse().forEach((it) => {
    const li = el("li", "import-row");
    li.appendChild(el("span", "src-badge", it.source));
    const wrap = el("span", "task-text", it.title);
    if (it.detail) wrap.title = it.detail;
    wrap.style.flex = "1";
    li.appendChild(wrap);
    if (it.date) {
      const info = deadlineInfo(it.date);
      li.appendChild(el("span", "import-date", info ? info.text : it.date));
    }
    const x = setIcon(el("button", "task-del"), "x", 13);
    x.type = "button"; x.setAttribute("aria-label", "Remove import");
    x.addEventListener("click", () => {
      state.imports = state.imports.filter((i) => i.id !== it.id);
      save(); renderImports();
    });
    li.appendChild(x);
    list.appendChild(li);
  });
}

document.getElementById("importFileBtn").addEventListener("click", () =>
  document.getElementById("importFile").click());

document.getElementById("importFile").addEventListener("change", (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const text = String(rd.result || "");
      let items;
      if (/\.json$/i.test(f.name)) {
        const arr = JSON.parse(text);
        const list = Array.isArray(arr) ? arr : [arr];
        items = list.map((o) => typeof o === "string"
          ? { title: stripDateSuffix(o), date: extractDate(o) }
          : { title: stripDateSuffix(String(o.title || o.task || o.name || "")), detail: String(o.detail || o.notes || o.description || ""), date: extractDate(o.date || o.due || o.deadline || o.title || "") });
      } else {
        items = rowsToItems(parseCSV(text));
      }
      addImports(items, f.name);
    } catch (err) { toast("Couldn't read that file", "danger"); }
    e.target.value = "";
  };
  rd.readAsText(f);
});

document.getElementById("pasteImportBtn").addEventListener("click", () => {
  const ta = document.getElementById("pasteImport");
  const lines = ta.value.split("\n").map((l) => l.trim()).filter(Boolean);
  const items = lines.map((l) => {
    const clean = l.replace(/^[-*•\d.)\]]\s+/, "");
    return { title: stripDateSuffix(clean), date: extractDate(clean) };
  });
  addImports(items, "pasted text");
  ta.value = "";
});

function sheetCsvUrl(url) {
  url = (url || "").trim();
  const m = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return "https://docs.google.com/spreadsheets/d/" + m[1] + "/gviz/tq?tqx=out:csv";
  return url;
}

document.getElementById("sheetImportBtn").addEventListener("click", async () => {
  const input = document.getElementById("sheetUrl");
  const raw = input.value.trim();
  if (!raw) { toast("Paste a sheet or CSV link first", "warning"); return; }
  toast("Fetching sheet…");
  try {
    const res = await fetch(sheetCsvUrl(raw));
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    if (!text || /<html/i.test(text.slice(0, 300))) throw new Error("not-csv");
    addImports(rowsToItems(parseCSV(text)), "google sheet");
    input.value = "";
  } catch (e) {
    toast("Couldn't fetch that sheet — publish it to the web as CSV and try again");
  }
});

/* ================= v5: pathfinder — on-device interpreter ================= */

const PATH_KEYWORDS = {
  career: ["job", "interview", "resume", "portfolio", "behance", "dribbble", "client", "meeting", "email", "project", "course", "learn", "study", "design", "code", "website", "linkedin", "application", "salary", "promotion", "work", "presentation", "freelance", "boss", "office"],
  health: ["gym", "workout", "run", "walk", "doctor", "dentist", "health", "sleep", "diet", "water", "yoga", "meditat", "vitamin", "exercise", "steps", "weight", "therapy", "checkup", "hospital", "clinic"],
  personal: ["money", "save", "savings", "rent", "house", "budget", "bill", "bank", "family", "mom", "dad", "friend", "birthday", "gift", "travel", "trip", "car", "home", "clean", "grocer", "shop", "flight", "hotel"],
  private: ["password", "secret", "private", "journal", "diary"],
};

function classifyItem(text) {
  const t = " " + String(text || "").toLowerCase() + " ";
  let best = null, bestScore = 0;
  for (const cat of Object.keys(PATH_KEYWORDS)) {
    let s = 0;
    PATH_KEYWORDS[cat].forEach((w) => { if (t.includes(w)) s += w.length > 5 ? 2 : 1; });
    if (s > bestScore) { bestScore = s; best = cat; }
  }
  return { category: best, score: bestScore };
}

function pathCandidates() {
  const out = [];
  state.goals.forEach((g) => {
    g.tasks.forEach((t) => {
      if (taskDone(t)) return;
      const open = leavesOf(t).filter((l) => !l.done).length;
      out.push({ kind: "task", ref: t, title: t.text, date: t.deadline, goal: g.title, category: g.category, size: Math.max(1, open) });
    });
  });
  state.imports.filter((i) => !i.added).forEach((i) => {
    const c = classifyItem(i.title + " " + i.detail);
    out.push({ kind: "import", ref: i, title: i.title, date: i.date || extractDate(i.title + " " + i.detail), goal: "Imported", category: c.category, score: c.score, size: 1 });
  });
  return out;
}

function ensureInboxGoal(catId) {
  const title = catOf(catId).name + " inbox";
  let g = state.goals.find((g) => g.title === title);
  if (!g) {
    g = normalizeGoal({ icon: "inbox", title, timeline: "", category: catId, tasks: [] });
    state.goals.push(g);
  }
  return g;
}

function analyzePath() {
  const cands = pathCandidates();
  cands.forEach((c) => {
    const info = c.date ? deadlineInfo(c.date) : null;
    c.urgency = info ? (info.diff < 0 ? 0 : info.diff === 0 ? 1 : info.diff <= 2 ? 2 : 3) : 4;
    c.xp = 10 * Math.max(1, c.size);
  });
  cands.sort((a, b) => a.urgency - b.urgency || b.size - a.size);

  const list = document.getElementById("pathList");
  list.innerHTML = "";
  const top = cands.slice(0, 8);
  if (!top.length) list.appendChild(el("li", "fine-print", "Nothing open — enjoy the calm."));
  top.forEach((c) => {
    const li = el("li", "path-step" + (c.urgency <= 1 ? " urgent" : ""));
    const body = el("div", "path-body");
    body.appendChild(el("strong", null, c.title));
    const meta = el("div", "path-meta");
    const cat = catOf(c.category || "personal");
    const cc = el("span", "cat-chip");
    cc.innerHTML = icon(cat.icon, 12) + " " + cat.name;
    meta.appendChild(cc);
    if (c.date) {
      const info = deadlineInfo(c.date);
      if (info) {
        const pd = el("span");
        pd.innerHTML = icon("calendar", 12) + " " + info.text;
        meta.appendChild(pd);
      }
    }
    meta.appendChild(el("span", null, c.kind === "import" ? "imported" : c.goal));
    meta.appendChild(el("span", "xp-chip", "+" + c.xp + " XP"));
    body.appendChild(meta);
    const acts = el("div", "path-actions");
    const lock = el("button", "path-lock");
    lock.innerHTML = icon("lock", 13) + " Lock in";
    lock.type = "button";
    lock.addEventListener("click", async () => {
      await ensureNotifyPerm();
      startFocus(c.kind === "task" ? c.ref.id : "import:" + c.ref.id, c.title, c.goal, 25);
    });
    acts.appendChild(lock);
    li.append(body, acts);
    list.appendChild(li);
  });

  const box = document.getElementById("suggestList");
  box.innerHTML = "";
  const suggs = cands.filter((c) => c.kind === "import").slice(0, 12);
  if (!suggs.length) {
    box.appendChild(el("p", "fine-print", "No imported items waiting — import something from Connections first."));
  }
  suggs.forEach((c) => {
    const catId = c.category || "personal";
    const cat = catOf(catId);
    const card = el("div", "suggest-card");
    card.appendChild(el("span", "src-badge", "import"));
    card.appendChild(el("span", "task-text", c.title));
    const sc = el("span", "cat-chip");
    sc.innerHTML = icon(cat.icon, 12) + " " + cat.name;
    card.appendChild(sc);
    if (!c.category) card.appendChild(el("span", "conf-tag", "best guess"));
    const add = el("button", "btn btn-tertiary btn-sm");
    add.innerHTML = icon("plus", 13) + " Add as quest";
    add.type = "button";
    add.addEventListener("click", () => {
      const item = state.imports.find((i) => i.id === c.ref.id);
      if (!item || item.added) return;
      const g = ensureInboxGoal(catId);
      g.tasks.push(normalizeTask({ text: item.title, deadline: item.date }));
      item.added = true;
      save(); renderAll();
      toast("Quest added to " + cat.name + " inbox", "success");
      analyzePath();
    });
    card.appendChild(add);
    box.appendChild(card);
  });

  document.getElementById("pathResults").hidden = false;
}

document.getElementById("analyzeBtn").addEventListener("click", analyzePath);

/* ================= v5: focus bar wiring + boot resume ================= */

document.getElementById("focusPauseBtn").addEventListener("click", pauseFocus);
document.getElementById("focusStopBtn").addEventListener("click", () => stopFocus());

(function resumeFocus() {
  const f = state.focus;
  if (!f) return;
  if (f.running && f.endsAt) {
    const left = Math.round((f.endsAt - Date.now()) / 1000);
    if (left <= 0) { completeFocus(); return; }
    f.remainingSec = left;
    focusTimerId = setInterval(tickFocus, 1000);
  } else if (f.running) {
    f.running = false;
  }
  renderFocusBar();
})();

/* ============ task detail overlay ============ */
let modalTaskId = null;

function findInTree(arr, id) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].id === id) return { task: arr[i], parent: arr, index: i };
    if (arr[i].subtasks && arr[i].subtasks.length) {
      const r = findInTree(arr[i].subtasks, id);
      if (r) return r;
    }
  }
  return null;
}
function findTask(id) {
  for (const g of state.goals) {
    const r = findInTree(g.tasks, id);
    if (r) return { task: r.task, parent: r.parent, index: r.index, goal: g };
  }
  return null;
}

function openTaskModal(id) {
  if (!findTask(id)) return;
  modalTaskId = id;
  renderTaskModal();
  document.getElementById("taskOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeTaskModal() {
  modalTaskId = null;
  document.getElementById("taskOverlay").classList.remove("open");
  document.body.style.overflow = "";
}

function detailNode(task) {
  const li = el("li", "detail-item");
  const row = el("div", "detail-row");
  const check = el("input", "task-check");
  check.type = "checkbox";
  check.checked = taskDone(task);
  check.setAttribute("aria-label", task.text);
  check.addEventListener("change", () => {
    toggleTask(task);
    save(); renderAll(); renderTaskModal();
  });
  const span = el("span", "task-text", task.text);
  if (taskDone(task)) li.classList.add("done");
  row.append(check, span);

  const addBtn = setIcon(el("button", "icon-btn"), "plus", 13);
  addBtn.type = "button";
  addBtn.title = "Add subtask";
  addBtn.setAttribute("aria-label", "Add subtask to " + task.text);
  addBtn.addEventListener("click", () => {
    if (row.nextElementSibling && row.nextElementSibling.classList.contains("detail-form")) {
      row.nextElementSibling.querySelector("input").focus();
      return;
    }
    const form = el("form", "detail-form");
    const input = el("input");
    input.type = "text";
    input.placeholder = "Break it down further…";
    input.maxLength = 120;
    input.autocomplete = "off";
    const go = setIcon(el("button", "btn btn-primary btn-sm"), "plus", 13);
    go.type = "submit";
    go.setAttribute("aria-label", "Add subtask");
    form.append(input, go);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      task.subtasks.push({ id: uid(), text, done: false, deadline: null, subtasks: [] });
      save(); renderAll(); renderTaskModal();
    });
    row.after(form);
    input.focus();
  });

  const del = setIcon(el("button", "icon-btn danger"), "x", 13);
  del.type = "button";
  del.setAttribute("aria-label", "Delete subtask");
  del.addEventListener("click", async () => {
    if (task.subtasks && task.subtasks.length) {
      const r = await confirmAction({
        title: "Delete this task?",
        message: "\u201C" + task.text + "\u201D and its " + task.subtasks.length + " subtask" + (task.subtasks.length === 1 ? "" : "s") + " will be permanently deleted.",
        confirmText: "Delete task",
      });
      if (!r.result) return;
    }
    const found = findTask(task.id);
    if (!found) return;
    maybeCancelFocus(task.id);
    found.parent.splice(found.index, 1);
    save(); renderAll(); renderTaskModal();
  });
  row.append(addBtn, del);
  li.appendChild(row);

  if (task.subtasks && task.subtasks.length) {
    const ul = el("ul", "detail-sub");
    task.subtasks.forEach((st) => ul.appendChild(detailNode(st)));
    li.appendChild(ul);
  }
  return li;
}

function renderTaskModal() {
  const found = findTask(modalTaskId);
  if (!found) { closeTaskModal(); return; }
  const { task, goal } = found;
  document.getElementById("taskModalTitle").textContent = task.text;

  const meta = document.getElementById("taskModalMeta");
  meta.innerHTML = "";
  const info = deadlineInfo(task.deadline);
  if (info) meta.appendChild(el("span", "badge " + info.cls, info.text));
  meta.appendChild(el("span", "badge cat", goal.title));

  const prog = document.getElementById("taskModalProgress");
  prog.innerHTML = "";
  const kids = task.subtasks || [];
  if (kids.length) {
    const kd = kids.filter(taskDone).length;
    const pct = Math.round((kd / kids.length) * 100);
    const bar = el("div", "progress-bar");
    const fill = el("div", "progress-fill");
    fill.style.width = pct + "%";
    if (pct >= 100) fill.classList.add("done");
    bar.appendChild(fill);
    prog.appendChild(bar);
    prog.appendChild(el("span", "progress-text", kd + "/" + kids.length + " done"));
  }

  const body = document.getElementById("taskModalBody");
  body.innerHTML = "";
  if (kids.length) {
    kids.forEach((st) => body.appendChild(detailNode(st)));
  } else {
    body.appendChild(el("p", "empty-note", "No subtasks yet — break it down below."));
  }
}

document.getElementById("taskModalClose").addEventListener("click", closeTaskModal);
document.getElementById("taskOverlay").addEventListener("click", (e) => {
  if (e.target.id === "taskOverlay") closeTaskModal();
});
/* standard shortcuts: Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z or Ctrl+Y redo.
   Skipped while typing so native text-field undo keeps working. */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (modalTaskId) closeTaskModal();
    else if (confirmResolver) confirmResolver(false);
    return;
  }
  if (confirmResolver) return;
  const t = e.target;
  const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
  if (typing) return;
  const mod = e.metaKey || e.ctrlKey;
  if (!mod) return;
  const key = e.key.toLowerCase();
  if (key === "z" && !e.shiftKey && !e.altKey) { e.preventDefault(); undo(); }
  else if ((key === "z" && e.shiftKey) || (key === "y" && e.ctrlKey && !e.metaKey)) { e.preventDefault(); redo(); }
});
document.getElementById("taskModalForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const found = findTask(modalTaskId);
  if (!found) return;
  const input = document.getElementById("taskModalInput");
  const text = input.value.trim();
  if (!text) return;
  found.task.subtasks.push({ id: uid(), text, done: false, deadline: null, subtasks: [] });
  input.value = "";
  save(); renderAll(); renderTaskModal();
  input.focus();
});

/* ============ confirm dialog (severe deletes) ============ */
let confirmResolver = null;
function confirmAction(opts) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("confirmOverlay");
    document.getElementById("confirmTitle").textContent = opts.title || "Are you sure?";
    document.getElementById("confirmMsg").textContent = opts.message || "";
    const yesBtn = document.getElementById("confirmYes");
    yesBtn.textContent = opts.confirmText || "Delete";
    const checkWrap = document.getElementById("confirmCheckWrap");
    const check = document.getElementById("confirmCheck");
    check.checked = false;
    if (opts.checkboxLabel) {
      checkWrap.style.display = "";
      document.getElementById("confirmCheckLabel").textContent = opts.checkboxLabel;
    } else {
      checkWrap.style.display = "none";
    }
    const finish = (result) => {
      confirmResolver = null;
      overlay.classList.remove("open");
      if (!modalTaskId) document.body.style.overflow = "";
      document.getElementById("confirmNo").removeEventListener("click", onNo);
      yesBtn.removeEventListener("click", onYes);
      overlay.removeEventListener("click", onBackdrop);
      resolve({ result, dontAsk: check.checked });
    };
    const onNo = () => finish(false);
    const onYes = () => finish(true);
    const onBackdrop = (e) => { if (e.target === overlay) finish(false); };
    confirmResolver = (v) => finish(!!v);
    document.getElementById("confirmNo").addEventListener("click", onNo);
    yesBtn.addEventListener("click", onYes);
    overlay.addEventListener("click", onBackdrop);
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
    yesBtn.focus();
  });
}

document.getElementById("undoBtn").addEventListener("click", undo);
document.getElementById("redoBtn").addEventListener("click", redo);
lastCommittedJson = stateSnapshotJson();
updateUndoButtons();

/* color picker popover */
let colorPopEl = null;
function closeColorPicker() {
  if (colorPopEl) { colorPopEl.remove(); colorPopEl = null; }
  document.removeEventListener("click", closeColorPicker);
}
function toggleColorPicker(anchorBtn, goal) {
  const wasOpen = !!colorPopEl;
  closeColorPicker();
  if (wasOpen) return;
  const pop = el("div", "color-pop");
  pop.setAttribute("role", "menu");
  const current = goal.color || "auto";
  ["auto", ...Object.keys(GOAL_COLORS)].forEach((k) => {
    const b = el("button", "swatch" + (current === k ? " sel" : ""));
    b.type = "button";
    if (k === "auto") {
      b.classList.add("auto");
      b.title = "Auto \u2014 color follows status (done / overdue / due soon)";
      b.setAttribute("aria-label", "Automatic color");
      b.innerHTML = '<i class="bi bi-palette"></i>';
    } else {
      b.style.background = GOAL_COLORS[k];
      b.title = k.charAt(0).toUpperCase() + k.slice(1);
      b.setAttribute("aria-label", "Color " + k);
    }
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      goal.color = k === "auto" ? null : k;
      closeColorPicker();
      save(); renderAll();
      toast(k === "auto" ? "Color set to Auto" : "Project color updated");
    });
    pop.appendChild(b);
  });
  document.body.appendChild(pop);
  const r = anchorBtn.getBoundingClientRect();
  pop.style.top = (r.bottom + window.scrollY + 8) + "px";
  pop.style.left = Math.max(8, Math.min(r.left + window.scrollX - 80, window.innerWidth - 220)) + "px";
  colorPopEl = pop;
  setTimeout(() => document.addEventListener("click", closeColorPicker), 0);
  pop.addEventListener("click", (e) => e.stopPropagation());
}

/* ============ drag to reorder tasks (pointer-based: mouse + touch) ============ */
function makeSortable(ul, items) {
  if (!ul || ul.dataset.sortable) return;
  ul.dataset.sortable = "1";
  ul.querySelectorAll(":scope > li").forEach((li) => {
    const handle = li.querySelector(":scope > .task-row > .drag-handle");
    if (handle) handle.addEventListener("pointerdown", (e) => startTaskDrag(e, li, ul, items));
  });
}

function startTaskDrag(e, li, ul, items) {
  if (e.button !== undefined && e.button > 0) return;
  e.preventDefault();
  const handle = e.currentTarget;
  try { handle.setPointerCapture(e.pointerId); } catch (_) {}
  const startY = e.clientY;
  let dragging = false;
  document.body.classList.add("dragging");

  const onMove = (ev) => {
    if (!dragging) {
      if (Math.abs(ev.clientY - startY) < 6) return;
      dragging = true;
      li.classList.add("drag-src");
    }
    if (ev.cancelable) ev.preventDefault();
    const edge = 70;
    if (ev.clientY < edge) window.scrollBy(0, -14);
    else if (ev.clientY > window.innerHeight - edge) window.scrollBy(0, 14);
    let over = document.elementFromPoint(ev.clientX, ev.clientY);
    over = over ? over.closest("li") : null;
    if (!over || over === li || over.parentElement !== ul) return;
    const r = over.getBoundingClientRect();
    const after = (ev.clientY - r.top) > r.height / 2;
    const ref = after ? over.nextSibling : over;
    if (ref !== li) ul.insertBefore(li, ref);
  };

  const cleanup = () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onCancel);
    document.removeEventListener("keydown", onKey, true);
    document.body.classList.remove("dragging");
    li.classList.remove("drag-src");
  };
  const commit = () => {
    const order = Array.from(ul.querySelectorAll(":scope > li"));
    const newOrder = order
      .map((node) => items.find((t) => t.id === node.dataset.taskId))
      .filter(Boolean);
    const changed = newOrder.length === items.length &&
      newOrder.some((t, i) => t.id !== items[i].id);
    if (changed) {
      items.length = 0;
      items.push(...newOrder);
      save();
      toast("Task moved");
    }
    renderAll();
  };
  const onUp = () => { cleanup(); commit(); };
  const onCancel = () => { cleanup(); renderAll(); };
  const onKey = (ev) => { if (ev.key === "Escape") { cleanup(); renderAll(); } };

  /* Listen on document (not just the 22px handle) so the drag survives
     the pointer leaving the handle, with or without pointer capture. */
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", onCancel);
  document.addEventListener("keydown", onKey, true);
}

/* ================= cloud sync + auth (Supabase) =================
   Optional layer on top of the local-first model. Everything still
   works offline in localStorage; when signed in, save() also pushes
   to Supabase (debounced), and login pulls the cloud copy down.
   Rewards + settings (xp, medals, activity, streak, theme, digest,
   voice, notify, focusSessions, ui) sync through the user_profile
   table. The live focus timer (focus) and the import staging area
   (imports) are ephemeral and stay on-device by design. */

let sbClient = null;
let cloudUser = null;
let cloudPushSuspended = false;
let pushTimer = null;
const lastSyncedIds = { goals: new Set(), tasks: new Set(), wishlist: new Set(), notes: new Set(), routines: new Set() };

function cloudConfigured() {
  const c = window.TB_SUPABASE || {};
  const ok = c.url && c.anonKey && c.url.indexOf("PASTE_YOUR") === -1 && c.anonKey.indexOf("PASTE_YOUR") === -1;
  return !!ok && typeof supabase !== "undefined" && !!supabase.createClient;
}

function makeClient(remember) {
  const c = window.TB_SUPABASE;
  return supabase.createClient(c.url, c.anonKey, {
    auth: { storage: remember ? window.localStorage : window.sessionStorage },
  });
}

function sb() {
  if (!sbClient && cloudConfigured()) {
    sbClient = makeClient(true);
  }
  return sbClient;
}

function resetClient(remember) {
  sbClient = cloudConfigured() ? makeClient(remember) : null;
}

/* ---------- sync status + user chip ---------- */

function setSyncStatus(s) {
  const dot = document.getElementById("syncDot");
  if (!dot) return;
  dot.className = "sync-dot " + s;
  dot.title = s === "synced" ? "All changes saved to the cloud"
    : s === "syncing" ? "Syncing…"
    : "Offline — changes are saved on this device";
}

function updateUserChip() {
  const emailEl = document.getElementById("userEmail");
  const logoutBtn = document.getElementById("logoutBtn");
  if (!emailEl || !logoutBtn) return;
  if (cloudUser && cloudUser.email) {
    emailEl.textContent = cloudUser.email;
    logoutBtn.hidden = false;
  } else {
    emailEl.textContent = "Local only";
    logoutBtn.hidden = true;
  }
}

/* ---------- flatten / nest the goal -> task tree ---------- */

function flattenTaskTree(goal) {
  const rows = [];
  (function walk(list, parentId, depth) {
    (list || []).forEach((t, i) => {
      rows.push({
        id: t.id, goal_id: goal.id, parent_id: parentId,
        text: t.text || "", done: !!t.done, deadline: t.deadline || null,
        position: i, _depth: depth,
      });
      if (t.subtasks && t.subtasks.length) walk(t.subtasks, t.id, depth + 1);
    });
  })(goal.tasks, null, 0);
  return rows;
}

function cloudGoalRows() {
  return state.goals.map((g) => ({
    id: g.id, user_id: cloudUser.id, title: g.title,
    timeline: g.timeline || null, deadline: g.deadline || null,
    category: g.category, color: g.color || null,
  }));
}

function cloudTaskRows() {
  const rows = [];
  state.goals.forEach((g) => {
    flattenTaskTree(g).forEach((r) => rows.push({
      id: r.id, user_id: cloudUser.id, goal_id: r.goal_id, parent_id: r.parent_id,
      text: r.text, done: r.done, deadline: r.deadline, position: r.position, _depth: r._depth,
    }));
  });
  rows.sort((a, b) => a._depth - b._depth); /* parents before children for the FK */
  return rows.map((r) => {
    const { _depth, ...rest } = r;
    return rest;
  });
}

/* ---------- user_profile: rewards + settings, one row per user ---------- */

function cloudProfileRow() {
  const a = state.activity && typeof state.activity === "object" ? state.activity : {};
  const recent = Object.keys(a).sort().slice(-120); /* dayKeys are YYYY-MM-DD: keep it small */
  const activity = {};
  recent.forEach((k) => { activity[k] = a[k]; });
  return {
    user_id: cloudUser.id,
    xp: +state.xp || 0,
    medals: Array.isArray(state.medals) ? state.medals : [],
    activity,
    streak: +state.streak || 0,
    theme: state.theme === "dark" ? "dark" : "light",
    digest: state.digest && typeof state.digest === "object" ? state.digest : {},
    voice: { celebrations: !(state.voice && state.voice.celebrations === false) },
    notify: { deadlines: !!(state.notify && state.notify.deadlines) },
    focus_sessions: +state.focusSessions || 0,
    ui: { skipGoalDeleteConfirm: !!(state.ui && state.ui.skipGoalDeleteConfirm) },
    updated_at: new Date().toISOString(),
  };
}

function applyCloudProfile(row) {
  if (!row) return;
  const b = blankState();
  state.xp = +row.xp || 0;
  state.medals = Array.isArray(row.medals)
    ? row.medals.filter((m) => MEDALS.some((d) => d.id === m))
    : [];
  state.activity = row.activity && typeof row.activity === "object" ? row.activity : {};
  state.streak = +row.streak || 0;
  state.theme = row.theme === "dark" ? "dark" : "light";
  state.digest = { ...b.digest, ...(row.digest && typeof row.digest === "object" ? row.digest : {}) };
  state.voice = { celebrations: !(row.voice && row.voice.celebrations === false) };
  state.notify = { deadlines: !!(row.notify && row.notify.deadlines) };
  state.focusSessions = +row.focus_sessions || 0;
  state.ui = { skipGoalDeleteConfirm: !!(row.ui && row.ui.skipGoalDeleteConfirm) };
}

function nestTasks(goalId, taskRows) {
  const byId = {};
  const roots = [];
  taskRows.forEach((r) => {
    if (r.goal_id !== goalId) return;
    byId[r.id] = {
      id: r.id, text: r.text || "", done: !!r.done, deadline: r.deadline || null,
      subtasks: [], _parent: r.parent_id, _pos: r.position || 0,
    };
  });
  Object.keys(byId).forEach((id) => {
    const t = byId[id];
    if (t._parent && byId[t._parent]) byId[t._parent].subtasks.push(t);
    else roots.push(t);
  });
  (function sortTree(list) {
    list.sort((a, b) => a._pos - b._pos);
    list.forEach((t) => { delete t._pos; delete t._parent; sortTree(t.subtasks); });
  })(roots);
  return roots;
}

function refreshShadows() {
  lastSyncedIds.goals = new Set(state.goals.map((g) => g.id));
  lastSyncedIds.tasks = new Set(cloudTaskRows().map((t) => t.id));
  lastSyncedIds.wishlist = new Set(state.wishlist.map((x) => x.id));
  lastSyncedIds.notes = new Set(state.notes.map((x) => x.id));
  lastSyncedIds.routines = new Set(state.routines.map((x) => x.id));
}

/* ---------- push (called debounced from save()) ---------- */

function scheduleCloudPush() {
  if (!cloudUser || !sb() || cloudPushSuspended || !appBooted) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushToCloud, 1500);
}

async function deleteMissing(client, table, currentIds) {
  const gone = Array.from(lastSyncedIds[table]).filter((id) => currentIds.indexOf(id) === -1);
  if (!gone.length) return;
  const { error } = await client.from(table).delete().in("id", gone);
  if (error) throw error;
}

async function pushToCloud() {
  const client = sb();
  if (!client || !cloudUser) return;
  setSyncStatus("syncing");
  try {
    const u = cloudUser.id;
    const g = cloudGoalRows();
    if (g.length) {
      const { error } = await client.from("goals").upsert(g);
      if (error) throw error;
    }
    const t = cloudTaskRows();
    if (t.length) {
      const { error } = await client.from("tasks").upsert(t);
      if (error) throw error;
    }
    const w = state.wishlist.map((x) => ({ id: x.id, user_id: u, text: x.text, done: !!x.done }));
    if (w.length) {
      const { error } = await client.from("wishlist").upsert(w);
      if (error) throw error;
    }
    const n = state.notes.map((x) => ({ id: x.id, user_id: u, title: x.title || null, body: x.body || "", pinned: false }));
    if (n.length) {
      const { error } = await client.from("notes").upsert(n);
      if (error) throw error;
    }
    const r = state.routines.map((x) => ({ id: x.id, user_id: u, text: x.text, days: x.days, done: x.done || {} }));
    if (r.length) {
      const { error } = await client.from("routines").upsert(r);
      if (error) throw error;
    }
    await deleteMissing(client, "goals", g.map((x) => x.id));
    await deleteMissing(client, "tasks", t.map((x) => x.id));
    await deleteMissing(client, "wishlist", w.map((x) => x.id));
    await deleteMissing(client, "notes", n.map((x) => x.id));
    await deleteMissing(client, "routines", r.map((x) => x.id));
    /* single-row upsert: no shadow set needed, one row per user */
    const { error: pErr } = await client.from("user_profile").upsert(cloudProfileRow(), { onConflict: "user_id" });
    if (pErr) throw pErr;
    refreshShadows();
    setSyncStatus("synced");
  } catch (e) {
    setSyncStatus("offline"); /* localStorage stays authoritative; retry on next save */
  }
}

/* ---------- pull + one-time migration (on login) ---------- */

async function syncFromCloud() {
  const client = sb();
  if (!client || !cloudUser) return;
  cloudPushSuspended = true;
  setSyncStatus("syncing");
  try {
    const names = ["goals", "tasks", "wishlist", "notes", "routines", "user_profile"];
    const res = await Promise.all(names.map((t) => client.from(t).select("*")));
    const failed = res.find((r) => r.error);
    if (failed) throw failed.error;
    const data = {};
    names.forEach((t, i) => { data[t] = res[i].data || []; });
    const dataTables = ["goals", "tasks", "wishlist", "notes", "routines"];
    const cloudHasData = dataTables.some((t) => data[t].length > 0);
    const cloudProfile = (data.user_profile || [])[0] || null;
    const localHas = state.goals.length > 0 || state.wishlist.length > 0 ||
      state.notes.length > 0 || state.routines.length > 0;
    if (!cloudHasData && localHas) {
      await migrateLocalToCloud();
      toast("Your local tasks are now saved to your cloud account", "success");
    } else if (cloudHasData) {
      applyCloudState(data);
    } else if (cloudProfile) {
      /* fresh device: no task data anywhere, but a profile row exists — pull rewards/settings */
      suppressSnapshot = true;
      applyCloudProfile(cloudProfile);
      state.streak = computeStreak();
      save();
      suppressSnapshot = false;
      applyTheme();
      renderAll();
    }
    refreshShadows();
    setSyncStatus("synced");
  } catch (e) {
    setSyncStatus("offline");
  } finally {
    cloudPushSuspended = false;
  }
}

async function migrateLocalToCloud() {
  /* Remap every legacy string id to a fresh UUID so the cloud PKs are canonical. */
  const map = new Map();
  const nid = (old) => {
    if (!map.has(old)) map.set(old, crypto.randomUUID());
    return map.get(old);
  };
  state.goals.forEach((g) => {
    g.id = nid(g.id);
    (function walk(list) {
      (list || []).forEach((t) => { t.id = nid(t.id); walk(t.subtasks); });
    })(g.tasks);
  });
  state.wishlist.forEach((x) => { x.id = nid(x.id); });
  state.notes.forEach((x) => { x.id = nid(x.id); });
  state.routines.forEach((x) => { x.id = nid(x.id); });
  if (state.focus && state.focus.taskId && map.has(state.focus.taskId)) {
    state.focus.taskId = map.get(state.focus.taskId);
  }
  suppressSnapshot = true;
  save();
  suppressSnapshot = false;
  await pushToCloud(); /* shadows are empty: pure upserts */
}

function applyCloudState(data) {
  const keep = { imports: state.imports, focus: state.focus };
  state.goals = (data.goals || []).map((g) => ({
    id: g.id, icon: "target", title: g.title || "Untitled goal", timeline: g.timeline || "",
    deadline: g.deadline || null, category: catOf(g.category).id,
    color: g.color && GOAL_COLORS[g.color] ? g.color : null,
    tasks: nestTasks(g.id, data.tasks || []),
  }));
  state.wishlist = (data.wishlist || []).map((x) => ({ id: x.id, text: x.text || "", done: !!x.done }));
  state.notes = (data.notes || []).map((x) => ({ id: x.id, title: x.title || "", body: x.body || "" }));
  state.routines = (data.routines || []).map((r) =>
    normalizeRoutine({ id: r.id, text: r.text, days: r.days, done: r.done }));
  const profile = (data.user_profile || [])[0] || null;
  if (profile) applyCloudProfile(profile);
  state.streak = computeStreak(); /* streak is derived from activity, like bootApp */
  Object.assign(state, keep);
  suppressSnapshot = true;
  save();
  suppressSnapshot = false;
  applyTheme();
  renderAll();
}

/* ================= auth UI ================= */

let authMode = "signin";
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setAuthMode(mode) {
  authMode = mode;
  document.querySelectorAll(".auth-tab").forEach((b) => {
    const on = b.dataset.mode === mode;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
  });
  document.getElementById("authSubmit").textContent = mode === "signup" ? "Create account" : "Sign in";
  document.getElementById("authPassword").setAttribute("autocomplete", mode === "signup" ? "new-password" : "current-password");
  clearAuthError();
}

function setHint(inputEl, hintEl, msg, ok) {
  hintEl.textContent = msg;
  hintEl.classList.toggle("ok", !!ok && !!msg);
  inputEl.classList.toggle("invalid", !!msg && !ok);
}

function validateAuthEmail() {
  const input = document.getElementById("authEmail");
  const hint = document.getElementById("authEmailHint");
  const v = input.value.trim();
  if (!v) { setHint(input, hint, "", false); return false; }
  if (!emailRe.test(v)) { setHint(input, hint, "Enter a valid email address.", false); return false; }
  setHint(input, hint, "Looks good.", true);
  return true;
}

function validateAuthPassword() {
  const input = document.getElementById("authPassword");
  const hint = document.getElementById("authPasswordHint");
  const v = input.value;
  if (!v) { setHint(input, hint, "", false); return false; }
  if (v.length < 8) { setHint(input, hint, "Use at least 8 characters.", false); return false; }
  setHint(input, hint, "", false);
  return true;
}

function pwScore(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

function updatePwStrength() {
  const v = document.getElementById("authPassword").value;
  const box = document.getElementById("pwStrength");
  if (!v) { box.hidden = true; return; }
  box.hidden = false;
  const s = pwScore(v);
  const bar = document.getElementById("pwBar");
  const label = document.getElementById("pwLabel");
  bar.style.width = Math.min(100, (s / 5) * 100) + "%";
  const lvl = s <= 2 ? ["Weak", "#df6b6b"] : s === 3 ? ["Fair", "#e8a83c"] : ["Strong", "#4cc06e"];
  label.textContent = lvl[0];
  bar.style.background = lvl[1];
}

function showAuthError(msg) {
  const p = document.getElementById("authFormError");
  p.textContent = msg;
  p.hidden = false;
}

function clearAuthError() {
  const p = document.getElementById("authFormError");
  p.textContent = "";
  p.hidden = true;
}

function friendlyAuthError(msg) {
  const m = String(msg || "").toLowerCase();
  if (m.indexOf("invalid login credentials") !== -1) {
    return "That email and password did not match. Double-check and try again.";
  }
  if (m.indexOf("user already registered") !== -1 || m.indexOf("already been registered") !== -1) {
    return "This email already has an account. Try signing in instead.";
  }
  if (m.indexOf("email not confirmed") !== -1) {
    return "Please confirm your email first. Check your inbox for the confirmation link.";
  }
  if (m.indexOf("password should be at least") !== -1 || m.indexOf("password is too short") !== -1) {
    return "Password needs to be at least 8 characters.";
  }
  if (m.indexOf("network") !== -1 || m.indexOf("fetch") !== -1) {
    return "Could not reach the server. Check your connection and try again.";
  }
  return msg || "Something went wrong. Please try again.";
}

function setAuthLoading(on) {
  const btn = document.getElementById("authSubmit");
  btn.classList.toggle("loading", on);
  btn.disabled = on;
  btn.textContent = on ? "Please wait…" : (authMode === "signup" ? "Create account" : "Sign in");
}

function showAuthView(name) {
  // name: "form" | "confirm" | "reset" | "newpw"
  document.getElementById("authForm").hidden = name !== "form";
  document.querySelector(".auth-tabs").style.display = name === "form" ? "" : "none";
  document.getElementById("authConfirm").hidden = name !== "confirm";
  document.getElementById("authReset").hidden = name !== "reset";
  document.getElementById("authNewPw").hidden = name !== "newpw";
}

function showConfirmState(email) {
  document.getElementById("authConfirmEmail").textContent = email;
  showAuthView("confirm");
}

function resetAuthForm() {
  showAuthView("form");
  document.getElementById("authEmail").value = "";
  document.getElementById("authPassword").value = "";
  document.getElementById("pwStrength").hidden = true;
  document.getElementById("resetEmail").value = "";
  const resetMsg = document.getElementById("resetMsg");
  resetMsg.textContent = "";
  resetMsg.hidden = true;
  resetMsg.classList.remove("error");
  document.getElementById("newPassword").value = "";
  const newPwMsg = document.getElementById("newPwMsg");
  newPwMsg.textContent = "";
  newPwMsg.hidden = true;
  newPwMsg.classList.remove("error");
  setHint(document.getElementById("authEmail"), document.getElementById("authEmailHint"), "", false);
  setHint(document.getElementById("authPassword"), document.getElementById("authPasswordHint"), "", false);
  clearAuthError();
}

function wireAuthUI() {
  document.querySelectorAll(".auth-tab").forEach((b) => {
    b.addEventListener("click", () => setAuthMode(b.dataset.mode));
  });
  document.getElementById("authEmail").addEventListener("input", validateAuthEmail);
  document.getElementById("authPassword").addEventListener("input", () => {
    validateAuthPassword();
    updatePwStrength();
  });
  document.getElementById("authForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const emailOk = validateAuthEmail();
    const pwOk = validateAuthPassword();
    if (!emailOk || !pwOk) return;
    if (!cloudConfigured()) {
      showAuthError("Cloud sync is not set up yet. Paste your Supabase URL and anon key into supabase-config.js, or continue offline for now.");
      return;
    }
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const remember = document.getElementById("authRemember").checked;
    clearAuthError();
    setAuthLoading(true);
    resetClient(remember);
    try {
      if (authMode === "signup") {
        const { data, error } = await sb().auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) enterApp(data.session.user);
        else showConfirmState(email);
      } else {
        const { data, error } = await sb().auth.signInWithPassword({ email, password });
        if (error) throw error;
        enterApp(data.user);
      }
    } catch (err) {
      showAuthError(friendlyAuthError(err && err.message));
    } finally {
      setAuthLoading(false);
    }
  });
  document.getElementById("authBackBtn").addEventListener("click", () => {
    resetAuthForm();
    setAuthMode("signin");
  });
  /* ---------- forgot password ---------- */
  document.getElementById("forgotBtn").addEventListener("click", () => {
    document.getElementById("resetEmail").value = document.getElementById("authEmail").value.trim();
    const msg = document.getElementById("resetMsg");
    msg.textContent = "";
    msg.hidden = true;
    msg.classList.remove("error");
    clearAuthError();
    showAuthView("reset");
  });
  document.getElementById("resetBack").addEventListener("click", () => {
    showAuthView("form");
  });
  document.getElementById("resetSend").addEventListener("click", async () => {
    const emailInput = document.getElementById("resetEmail");
    const msg = document.getElementById("resetMsg");
    const btn = document.getElementById("resetSend");
    const email = emailInput.value.trim();
    msg.classList.remove("error");
    if (!emailRe.test(email)) {
      msg.textContent = "Enter a valid email address.";
      msg.classList.add("error");
      msg.hidden = false;
      return;
    }
    if (!cloudConfigured()) {
      msg.textContent = "Cloud sync is not set up yet.";
      msg.classList.add("error");
      msg.hidden = false;
      return;
    }
    btn.disabled = true;
    try {
      const { error } = await sb().auth.resetPasswordForEmail(email, {
        redirectTo: location.origin + location.pathname,
      });
      if (error) throw error;
      msg.textContent = "If an account exists for this email, a reset link is on its way.";
      msg.hidden = false;
    } catch (err) {
      msg.textContent = friendlyAuthError(err && err.message);
      msg.classList.add("error");
      msg.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });
  /* ---------- set a new password (recovery landing) ---------- */
  document.getElementById("newPasswordSave").addEventListener("click", async () => {
    const input = document.getElementById("newPassword");
    const msg = document.getElementById("newPwMsg");
    const btn = document.getElementById("newPasswordSave");
    const v = input.value;
    msg.classList.remove("error");
    if (!v || v.length < 8) {
      msg.textContent = "Use at least 8 characters.";
      msg.classList.add("error");
      msg.hidden = false;
      return;
    }
    btn.disabled = true;
    try {
      const { error } = await sb().auth.updateUser({ password: v });
      if (error) throw error;
      msg.textContent = "Password updated. Taking you back to sign in…";
      msg.hidden = false;
      try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
      window.setTimeout(() => {
        showAuthView("form");
        setAuthMode("signin");
      }, 1500);
    } catch (err) {
      msg.textContent = friendlyAuthError(err && err.message);
      msg.classList.add("error");
      msg.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });
  document.getElementById("offlineBtn").addEventListener("click", () => {
    enterApp(null);
    toast("Offline mode. Your tasks stay on this device.");
  });
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    try {
      const client = sb();
      if (client) await client.auth.signOut();
    } catch (e) { /* fall through */ }
    cloudUser = null;
    clearTimeout(pushTimer);
    document.querySelector(".app").hidden = true;
    document.getElementById("authScreen").hidden = false;
    resetAuthForm();
    setAuthMode("signin");
    updateUserChip();
    setSyncStatus("offline");
    toast("Signed out. Your local copy stays on this device.");
  });
}

/* ---------- entering the app ---------- */

function enterApp(user) {
  cloudUser = user || null;
  cloudPushSuspended = true;
  document.getElementById("authScreen").hidden = true;
  document.querySelector(".app").hidden = false;
  bootApp();
  updateUserChip();
  cloudPushSuspended = false;
  if (cloudUser) syncFromCloud();
  else setSyncStatus("offline");
}

function showAuthScreen() {
  document.getElementById("authScreen").hidden = false;
}

async function initAuth() {
  wireAuthUI();
  applyTheme();
  updateUserChip();
  setSyncStatus("offline");
  if (!cloudConfigured()) { showAuthScreen(); return; }
  try {
    const { data, error } = await sb().auth.getSession();
    if (error) throw error;
    if (data && data.session) {
      // Password-recovery links land here with #...type=recovery — let the
      // user choose a new password instead of entering the app directly.
      if (location.hash.indexOf("type=recovery") !== -1) {
        showAuthScreen();
        showAuthView("newpw");
        document.getElementById("newPassword").focus();
        return;
      }
      enterApp(data.session.user);
    } else showAuthScreen();
  } catch (e) {
    showAuthScreen();
  }
}

/* ---------- PWA + connectivity ---------- */

if ("serviceWorker" in navigator && location.protocol.indexOf("http") === 0) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
window.addEventListener("online", () => {
  if (cloudUser) pushToCloud();
});

initAuth();
