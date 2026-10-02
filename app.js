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

  const x = el("button", "task-del", "✕");
  x.type = "button";
  x.setAttribute("aria-label", "Delete task");
  x.addEventListener("click", () => removeTask(task));

  row.append(calBtn, subBtn, x);
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
