/* Task Breaker v4 — neumorphic edition.
   Dashboard, weekly routines, rewards (XP/medals/streaks), wishlist,
   notes, email digest, deadlines + calendar, voice input.
   Static app: everything persists in localStorage. */

const STORAGE_KEY = "taskbreaker-v4";
const PREV_KEY = "taskbreaker-v2";

const CATEGORIES = [
  { id: "career", icon: "💼", name: "Career" },
  { id: "health", icon: "💪", name: "Health" },
  { id: "personal", icon: "🌱", name: "Personal" },
  { id: "private", icon: "🔒", name: "Private" },
];

const DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const MEDALS = [
  { id: "first-step", icon: "🌱", name: "First Step", desc: "Complete your first task" },
  { id: "spark", icon: "✨", name: "Spark", desc: "Reach a 3-day streak" },
  { id: "goal-crusher", icon: "🥈", name: "Goal Crusher", desc: "Complete a full goal" },
  { id: "on-fire", icon: "🔥", name: "On Fire", desc: "Reach a 7-day streak" },
  { id: "balanced", icon: "⚖️", name: "Balanced", desc: "Get every category above 50%" },
  { id: "routine-keeper", icon: "📅", name: "Routine Keeper", desc: "Finish all routines in a week" },
  { id: "century", icon: "🥇", name: "Century", desc: "Complete 100 tasks" },
  { id: "deep-focus", icon: "🧘", name: "Deep Focus", desc: "Finish 3 lock-in focus sessions" },
];

/* ================= utils ================= */

function uid() {
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
      id: uid(), icon: "🎯", title: "Land a full-time design job",
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
      id: uid(), icon: "✨", title: "Learn motion design",
      timeline: "2 months", category: "career", deadline: null,
      tasks: [
        { id: uid(), text: "Pick a course and enroll", done: false, deadline: null, subtasks: [] },
        { id: uid(), text: "Finish the course modules", done: false, deadline: null, subtasks: [] },
        { id: uid(), text: "Build 3 practice pieces", done: false, deadline: null, subtasks: [] },
        { id: uid(), text: "Share work and get feedback", done: false, deadline: null, subtasks: [] },
      ],
    },
    {
      id: uid(), icon: "🏠", title: "Save money / Buy a house",
      timeline: "Ongoing", category: "personal", deadline: null,
      tasks: [
        { id: uid(), text: "Set a monthly savings target", done: false, deadline: null, subtasks: [] },
        { id: uid(), text: "Open a dedicated savings account", done: false, deadline: null, subtasks: [] },
        { id: uid(), text: "Track expenses every week", done: false, deadline: null, subtasks: [] },
        { id: uid(), text: "Cut one unused subscription", done: false, deadline: null, subtasks: [] },
      ],
    },
    {
      id: uid(), icon: "🏃", title: "Move every day",
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
    icon: g.icon || "🎯",
    title: g.title || "Untitled goal",
    timeline: g.timeline || "",
    deadline: g.deadline || null,
    category: catOf(g.category).id,
    tasks: (g.tasks || []).map(normalizeTask),
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

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

const state = load();

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
    toast("🏅 Medal earned: " + m.name + " (+25 XP)");
  });
  return newOnes;
}

/* ================= toast / voice ================= */

let toastTimer = null;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
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
      toast("Voice input isn't supported in this browser");
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
  document.querySelector(".theme-toggle .knob").textContent = state.theme === "dark" ? "🌙" : "☀️";
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
    gauge.appendChild(el("p", "g-label", cat.icon + " " + cat.name));
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
  card.appendChild(el("h4", null, "⏰ " + items.length + " urgent deadline" + (items.length > 1 ? "s" : "")));
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
  const done = taskDone(task);
  if (done) li.classList.add("done");

  const row = el("div", "task-row");
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

  const span = el("span", "task-text", task.text);

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

  const calBtn = el("button", "task-cal-btn", "📅");
  calBtn.type = "button";
  calBtn.title = "Deadline & calendar";
  calBtn.classList.add("tool");
  calBtn.setAttribute("aria-label", "Set deadline");
  calBtn.addEventListener("click", () => deadlineEditor(li, task, task.text));

  const subBtn = el("button", "task-sub-btn", "+");
  subBtn.type = "button";
  subBtn.title = "Break into subtasks";
  subBtn.setAttribute("aria-label", "Add subtask");
  subBtn.addEventListener("click", () => showSubtaskForm(li, task));

  const lockBtn = el("button", "task-lock-btn", "⏱️");
  lockBtn.type = "button";
  lockBtn.title = "Lock in — focus timer";
  lockBtn.setAttribute("aria-label", "Lock in with a focus timer");
  lockBtn.addEventListener("click", () => toggleTimerPop(li, task, goalTitle));

  const x = el("button", "task-del", "✕");
  x.type = "button";
  x.setAttribute("aria-label", "Delete task");
  x.addEventListener("click", () => removeTask(task));

  row.append(calBtn, lockBtn, subBtn, x);
  li.appendChild(row);

  if (task.subtasks && task.subtasks.length) {
    const kids = task.subtasks;
    const kd = kids.filter(taskDone).length;
    const pct = Math.round((kd / kids.length) * 100);

    const miniRow = el("div", "mini-row");
    const mini = el("div", "mini-progress");
    const fill = el("div", "mini-fill");
    fill.style.width = pct + "%";
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
  const add = el("button", "btn-primary", "+");
  add.type = "submit";
  add.setAttribute("aria-label", "Add subtask");
  form.append(input, add);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    task.subtasks.push({ id: uid(), text, done: false, deadline: null, subtasks: [] });
    save(); renderAll();
  });
  wrap.insertBefore(form, ul);
  input.focus();
}

function goalCard(goal) {
  const card = el("article", "card goal-card");
  card.dataset.goal = goal.id;

  const top = el("div", "goal-top");
  top.appendChild(el("span", "goal-icon", goal.icon));
  const headings = el("div", "goal-headings");
  headings.appendChild(el("h3", "goal-title", goal.title));
  const badges = el("div", "badge-row");
  const cat = catOf(goal.category);
  badges.appendChild(el("span", "badge cat", cat.icon + " " + cat.name));
  if (goal.timeline) badges.appendChild(el("span", "badge", "⏳ " + goal.timeline));
  const ginfo = deadlineInfo(goal.deadline);
  if (ginfo) badges.appendChild(el("span", "badge " + ginfo.cls, "📅 " + ginfo.text));
  headings.appendChild(badges);
  top.appendChild(headings);

  const calBtn = el("button", "icon-btn tool", "📅");
  calBtn.title = "Goal deadline & calendar";
  calBtn.setAttribute("aria-label", "Set goal deadline");
  calBtn.addEventListener("click", () => deadlineEditor(card, goal, goal.title));
  const del = el("button", "icon-btn", "✕");
  del.title = "Delete goal";
  del.setAttribute("aria-label", "Delete goal");
  del.addEventListener("click", () => {
    if (confirm('Delete the goal "' + goal.title + '"?')) {
      state.goals = state.goals.filter((g) => g.id !== goal.id);
      save(); renderAll();
    }
  });
  top.append(calBtn, del);
  card.appendChild(top);

  const pct = goalProgress(goal);
  const leaves = leafStats(goal.tasks);
  const prog = el("div", "progress");
  const bar = el("div", "progress-bar");
  const fill = el("div", "progress-fill");
  fill.style.width = pct + "%";
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
      toast("🎉 Goal complete: " + goal.title + " (+50 XP)");
      speak("Goal complete. " + goal.title + ". Amazing work.");
      renderAll();
    }
  };
  goal.tasks.forEach((task) => list.appendChild(taskNode(task, removeTop, celebrate, goal.title)));
  card.appendChild(list);

  const form = el("form", "add-task");
  const input = el("input");
  input.type = "text"; input.placeholder = "Add a task…"; input.maxLength = 120; input.autocomplete = "off";
  const mic = el("button", "mic-btn", "🎤");
  mic.type = "button"; mic.title = "Dictate task"; mic.style.width = "46px"; mic.style.fontSize = "18px";
  attachMic(mic, input);
  const add = el("button", "btn-primary", "+");
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
    head.appendChild(el("h3", null, cat.icon + " " + cat.name));
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
    icon: "🎯",
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
  toast("New goal added");
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
    const x = el("button", "icon-btn", "✕");
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
  if (!routineDaySel.size) { toast("Pick at least one day"); return; }
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
  document.getElementById("streakPill").textContent = "🔥 " + state.streak + "-day streak";

  const grid = document.getElementById("medalsGrid");
  grid.innerHTML = "";
  MEDALS.forEach((m) => {
    const earned = medalEarned(m.id);
    const card = el("div", "medal" + (earned ? " earned" : ""));
    card.appendChild(el("div", "medal-icon", m.icon));
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
    const x = el("button", "task-del", "✕");
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
    const x = el("button", "task-del", "✕");
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
  lines.push("⚡ Task Breaker — Weekly Digest");
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
    if (!open.length) lines.push("• All granted! 🎉");
    lines.push("");
  }
  lines.push(`Level ${levelInfo().level} · ${state.xp} XP · 🔥 ${state.streak}-day streak`);
  lines.push("Keep breaking it down. 💪");
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

attachMic(document.getElementById("noteMic"), document.getElementById("noteBody"));

/* wishlist mic */
(function () {
  const form = document.getElementById("wishlistForm");
  const input = document.getElementById("wishlistInput");
  const mic = el("button", "mic-btn", "🎤");
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
  toast("🔒 Locked in for " + minutes + "m: " + taskText);
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
  toast("⏱️ Time's up: " + (f ? f.taskText : "task") + " (+15 XP)");
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("⏱️ Timer up — " + (f ? f.taskText : "task"), {
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
      state.imports.length ? "All imported items have been organized. 🎉" : "Nothing imported yet — bring in a file, some pasted text, or a sheet link above."));
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
    const x = el("button", "task-del", "✕");
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
    } catch (err) { toast("Couldn't read that file"); }
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
  if (!raw) { toast("Paste a sheet or CSV link first"); return; }
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
  const title = "📥 " + catOf(catId).name + " inbox";
  let g = state.goals.find((g) => g.title === title);
  if (!g) {
    g = normalizeGoal({ icon: "📥", title, timeline: "", category: catId, tasks: [] });
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
  if (!top.length) list.appendChild(el("li", "fine-print", "Nothing open — enjoy the calm. ✨"));
  top.forEach((c) => {
    const li = el("li", "path-step" + (c.urgency <= 1 ? " urgent" : ""));
    const body = el("div", "path-body");
    body.appendChild(el("strong", null, c.title));
    const meta = el("div", "path-meta");
    const cat = catOf(c.category || "personal");
    meta.appendChild(el("span", "cat-chip", cat.icon + " " + cat.name));
    if (c.date) { const info = deadlineInfo(c.date); if (info) meta.appendChild(el("span", null, "📅 " + info.text)); }
    meta.appendChild(el("span", null, c.kind === "import" ? "📥 imported" : "🎯 " + c.goal));
    meta.appendChild(el("span", "xp-chip", "+" + c.xp + " XP"));
    body.appendChild(meta);
    const acts = el("div", "path-actions");
    const lock = el("button", "path-lock", "🔒 Lock in");
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
    card.appendChild(el("span", "cat-chip", cat.icon + " " + cat.name));
    if (!c.category) card.appendChild(el("span", "conf-tag", "best guess"));
    const add = el("button", "suggest-add", "＋ Add as quest");
    add.type = "button";
    add.addEventListener("click", () => {
      const item = state.imports.find((i) => i.id === c.ref.id);
      if (!item || item.added) return;
      const g = ensureInboxGoal(catId);
      g.tasks.push(normalizeTask({ text: item.title, deadline: item.date }));
      item.added = true;
      save(); renderAll();
      toast("Quest added to " + cat.name + " inbox 🎯");
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
