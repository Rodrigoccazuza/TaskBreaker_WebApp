/* Task Breaker v2 — dashboard with category gauges, wishlist, notes, profile.
   Skeuomorphic skin with light/dark mode. Data persists in localStorage. */

const STORAGE_KEY = "taskbreaker-v2";
const V1_KEY = "taskbreaker-v1";

const CATEGORIES = [
  { id: "career", icon: "💼", name: "Career" },
  { id: "health", icon: "💪", name: "Health" },
  { id: "personal", icon: "🌱", name: "Personal" },
  { id: "private", icon: "🔒", name: "Private" },
];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function catOf(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[2];
}

/* ---------- seed & migrate ---------- */

function seedGoals() {
  return [
    {
      id: uid(), icon: "🎯", title: "Land a full-time design job",
      timeline: "2 months", category: "career",
      tasks: [
        { id: uid(), text: "Polish LinkedIn profile", done: true },
        {
          id: uid(), text: "Build Behance portfolio", done: false,
          subtasks: [
            { id: uid(), text: "Finish email designs", done: false, subtasks: [] },
            {
              id: uid(), text: "Create case study layouts", done: false,
              subtasks: [
                { id: uid(), text: "Write project summaries", done: false, subtasks: [] },
                { id: uid(), text: "Export device mockups", done: false, subtasks: [] },
              ],
            },
            { id: uid(), text: "Publish 3 projects", done: false, subtasks: [] },
          ],
        },
        { id: uid(), text: "Post shots on Dribbble", done: false },
        { id: uid(), text: "Add projects to LandBook", done: false },
        { id: uid(), text: "Tweak rodrigocazuza.com", done: false },
        { id: uid(), text: "Create 2 new app concepts", done: false },
        { id: uid(), text: "Finish a design course", done: false },
        { id: uid(), text: "Apply to 5 jobs per week", done: false },
      ],
    },
    {
      id: uid(), icon: "✨", title: "Learn motion design",
      timeline: "2 months", category: "career",
      tasks: [
        { id: uid(), text: "Pick a course and enroll", done: false },
        { id: uid(), text: "Finish the course modules", done: false },
        { id: uid(), text: "Build 3 practice pieces", done: false },
        { id: uid(), text: "Share work and get feedback", done: false },
      ],
    },
    {
      id: uid(), icon: "🏠", title: "Save money / Buy a house",
      timeline: "Ongoing", category: "personal",
      tasks: [
        { id: uid(), text: "Set a monthly savings target", done: false },
        { id: uid(), text: "Open a dedicated savings account", done: false },
        { id: uid(), text: "Track expenses every week", done: false },
        { id: uid(), text: "Cut one unused subscription", done: false },
      ],
    },
    {
      id: uid(), icon: "🏃", title: "Move every day",
      timeline: "Ongoing", category: "health",
      tasks: [
        { id: uid(), text: "Work out 3x this week", done: false },
        { id: uid(), text: "Walk 8,000 steps daily", done: false },
        { id: uid(), text: "Drink 2L of water daily", done: false },
      ],
    },
  ];
}

function migrateV1(old) {
  return old.map((g) => {
    const t = (g.title || "").toLowerCase();
    let category = "personal";
    if (t.includes("job") || t.includes("motion") || t.includes("design") || t.includes("portfolio")) category = "career";
    if (t.includes("house") || t.includes("money") || t.includes("sav")) category = "personal";
    return {
      id: g.id || uid(),
      icon: g.icon || "🎯",
      title: g.title || "Untitled goal",
      timeline: g.timeline || "",
      category,
      tasks: (g.tasks || []).map(normalizeTask),
    };
  });
}

function normalizeTask(t) {
  t = t || {};
  return {
    id: t.id || uid(),
    text: t.text || "",
    done: !!t.done,
    subtasks: (t.subtasks || []).map(normalizeTask),
  };
}

/* A parent task is done when all of its subtasks are done (recursively). */
function taskDone(t) {
  if (t.subtasks && t.subtasks.length) return t.subtasks.every(taskDone);
  return !!t.done;
}

function setTaskDone(t, val) {
  if (t.subtasks && t.subtasks.length) t.subtasks.forEach((st) => setTaskDone(st, val));
  else t.done = val;
}

function toggleTask(t) {
  setTaskDone(t, !taskDone(t));
}

/* leaf-level stats across a task tree */
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

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.goals)) return normalize(data);
    }
    const v1raw = localStorage.getItem(V1_KEY);
    if (v1raw) {
      const v1 = JSON.parse(v1raw);
      if (Array.isArray(v1) && v1.length) {
        return { goals: migrateV1(v1), wishlist: [], notes: [], theme: "dark" };
      }
    }
  } catch (e) { /* fall through to seed */ }
  const seeded = seedGoals().map((g) => ({ ...g, tasks: g.tasks.map(normalizeTask) }));
  return { goals: seeded, wishlist: [], notes: [], theme: "dark" };
}

function normalize(data) {
  return {
    goals: data.goals.map((g) => ({
      id: g.id || uid(),
      icon: g.icon || "🎯",
      title: g.title || "Untitled goal",
      timeline: g.timeline || "",
      category: catOf(g.category).id,
      tasks: (g.tasks || []).map(normalizeTask),
    })),
    wishlist: (data.wishlist || []).map((w) => ({ id: w.id || uid(), text: w.text || "", done: !!w.done })),
    notes: (data.notes || []).map((n) => ({ id: n.id || uid(), title: n.title || "", body: n.body || "" })),
    theme: data.theme === "light" ? "light" : "dark",
  };
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

const state = load();

/* ---------- helpers ---------- */

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

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/* ---------- theme ---------- */

function applyTheme() {
  document.body.dataset.theme = state.theme;
  const toggle = document.getElementById("themeToggle");
  toggle.checked = state.theme === "light";
  document.querySelector(".theme-toggle .knob").textContent = state.theme === "light" ? "☀️" : "🌙";
  document.getElementById("themeLabel").textContent = state.theme === "light" ? "Light mode" : "Dark mode";
}

document.getElementById("themeToggle").addEventListener("change", (e) => {
  state.theme = e.target.checked ? "light" : "dark";
  save();
  applyTheme();
});

/* ---------- navigation ---------- */

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    document.getElementById("page-" + btn.dataset.page).classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

/* ---------- dashboard : gauges ---------- */

const RING_C = 2 * Math.PI * 52;

function renderWheels() {
  const row = document.getElementById("wheelsRow");
  row.innerHTML =
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
    '<linearGradient id="brassGrad" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#f6c86a"/><stop offset="0.55" stop-color="#e2a63d"/><stop offset="1" stop-color="#a96f1c"/>' +
    "</linearGradient></defs></svg>";

  CATEGORIES.forEach((cat) => {
    const s = categoryStats(cat.id);
    const off = RING_C - (RING_C * s.pct) / 100;

    const gauge = el("div", "gauge");
    const bezel = el("div", "bezel");
    const face = el("div", "gauge-face");
    face.innerHTML =
      '<svg viewBox="0 0 120 120"><circle class="g-track" cx="60" cy="60" r="52"/>' +
      '<circle class="g-fill" cx="60" cy="60" r="52" stroke-dasharray="' + RING_C.toFixed(1) +
      '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg>';
    const center = el("div", "g-center");
    center.appendChild(el("strong", null, s.pct + "%"));
    center.appendChild(el("span", null, "done"));
    face.appendChild(center);
    bezel.appendChild(face);
    gauge.appendChild(bezel);
    gauge.appendChild(el("p", "g-label", cat.icon + " " + cat.name));
    gauge.appendChild(el("p", "g-sub", s.done + "/" + s.total + " tasks"));
    row.appendChild(gauge);
  });
}

/* ---------- dashboard : goals ---------- */

/* Recursive task node: a task can hold subtasks, which can hold subtasks… */
function taskNode(task, removeTask, afterChange) {
  const li = el("li");
  const done = taskDone(task);
  if (done) li.classList.add("done");

  const row = el("div", "task-row");
  const check = el("input", "task-check");
  check.type = "checkbox";
  check.checked = done;
  check.setAttribute("aria-label", task.text);
  check.addEventListener("change", () => {
    toggleTask(task); /* parent toggle flips all descendants */
    save(); renderAll();
    if (afterChange) afterChange();
  });

  const span = el("span", "task-text", task.text);

  const subBtn = el("button", "task-sub-btn", "+");
  subBtn.type = "button";
  subBtn.title = "Break into subtasks";
  subBtn.setAttribute("aria-label", "Add subtask");
  subBtn.addEventListener("click", () => showSubtaskForm(li, task));

  const x = el("button", "task-del", "✕");
  x.type = "button";
  x.setAttribute("aria-label", "Delete task");
  x.addEventListener("click", () => removeTask(task));

  row.append(check, span, subBtn, x);
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
    }, afterChange)));
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
  const add = el("button", "btn-brass", "+");
  add.type = "submit";
  add.setAttribute("aria-label", "Add subtask");
  form.append(input, add);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    task.subtasks.push({ id: uid(), text, done: false, subtasks: [] });
    save(); renderAll();
  });
  wrap.insertBefore(form, ul);
  input.focus();
}

function goalCard(goal) {
  const card = el("article", "card goal-card");

  const top = el("div", "goal-top");
  top.appendChild(el("span", "goal-icon", goal.icon));
  const headings = el("div", "goal-headings");
  headings.appendChild(el("h3", "goal-title", goal.title));
  const badges = el("div", "badge-row");
  const cat = catOf(goal.category);
  badges.appendChild(el("span", "badge cat", cat.icon + " " + cat.name));
  if (goal.timeline) badges.appendChild(el("span", "badge", "⏳ " + goal.timeline));
  headings.appendChild(badges);
  top.appendChild(headings);
  const del = el("button", "icon-btn", "✕");
  del.title = "Delete goal";
  del.setAttribute("aria-label", "Delete goal");
  del.addEventListener("click", () => {
    if (confirm('Delete the goal "' + goal.title + '"?')) {
      state.goals = state.goals.filter((g) => g.id !== goal.id);
      save(); renderAll();
    }
  });
  top.appendChild(del);
  card.appendChild(top);

  const pct = goalProgress(goal);
  const doneCount = goal.tasks.filter((t) => t.done).length;
  const prog = el("div", "progress");
  const bar = el("div", "progress-bar");
  const fill = el("div", "progress-fill");
  fill.style.width = pct + "%";
  bar.appendChild(fill);
  prog.appendChild(bar);
  prog.appendChild(el("span", "progress-text", doneCount + "/" + goal.tasks.length + " done"));
  card.appendChild(prog);
  if (pct === 100 && goal.tasks.length) card.classList.add("complete");

  const list = el("ul", "task-list");
  const removeTop = (task) => {
    goal.tasks = goal.tasks.filter((t) => t.id !== task.id);
    save(); renderAll();
  };
  const celebrate = () => {
    if (goalProgress(goal) === 100 && goal.tasks.length) {
      const node = document.querySelector('[data-goal="' + goal.id + '"]');
      if (node) { node.classList.add("celebrate"); setTimeout(() => node.classList.remove("celebrate"), 600); }
    }
  };
  goal.tasks.forEach((task) => list.appendChild(taskNode(task, removeTop, celebrate)));
  card.appendChild(list);

  const form = el("form", "add-task");
  const input = el("input");
  input.type = "text"; input.placeholder = "Add a task…"; input.maxLength = 120; input.autocomplete = "off";
  const add = el("button", "btn-brass", "+");
  add.type = "submit"; add.setAttribute("aria-label", "Add task");
  form.append(input, add);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    goal.tasks.push({ id: uid(), text, done: false, subtasks: [] });
    save(); renderAll();
  });
  card.appendChild(form);

  card.dataset.goal = goal.id;
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
    category: document.getElementById("newGoalCategory").value,
    tasks: [],
  });
  document.getElementById("newGoalTitle").value = "";
  document.getElementById("newGoalTimeline").value = "";
  save(); renderAll();
});

/* ---------- wishlist ---------- */

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
    check.addEventListener("change", () => { item.done = !item.done; save(); renderWishlist(); renderProfile(); });
    li.append(check, el("span", null, item.text));
    const x = el("button", "task-del", "✕");
    x.style.opacity = "1";
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

/* ---------- notes ---------- */

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
});

/* ---------- profile ---------- */

function renderProfile() {
  const stats = document.getElementById("profileStats");
  stats.innerHTML = "";
  const leaves = leafStats(state.goals.flatMap((g) => g.tasks));
  [
    [state.goals.length, "goals"],
    [leaves.done + "/" + leaves.total, "tasks done"],
    [state.wishlist.filter((w) => w.done).length + "/" + state.wishlist.length, "wishes granted"],
    [state.notes.length, "notes"],
  ].forEach(([num, label]) => {
    const s = el("div", "stat");
    s.appendChild(el("strong", null, String(num)));
    s.appendChild(el("span", null, label));
    stats.appendChild(s);
  });
}

/* ---------- boot ---------- */

function renderAll() {
  document.getElementById("todayLabel").textContent =
    new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  renderWheels();
  renderGoals();
  renderWishlist();
  renderNotes();
  renderProfile();
}

applyTheme();
renderAll();
