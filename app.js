/* Task Breaker v1 — goal progress tracker. Data persists in localStorage. */

const STORAGE_KEY = "taskbreaker-v1";

const seedData = () => ([
  {
    id: uid(),
    icon: "🎯",
    title: "Land a full-time design job",
    timeline: "2 months",
    tasks: [
      { id: uid(), text: "Polish LinkedIn profile", done: true },
      { id: uid(), text: "Build Behance portfolio", done: false },
      { id: uid(), text: "Post shots on Dribbble", done: false },
      { id: uid(), text: "Add projects to LandBook", done: false },
      { id: uid(), text: "Tweak rodrigocazuza.com", done: false },
      { id: uid(), text: "Create 2 new app concepts", done: false },
      { id: uid(), text: "Finish a design course", done: false },
      { id: uid(), text: "Apply to 5 jobs per week", done: false },
    ],
  },
  {
    id: uid(),
    icon: "🏠",
    title: "Save money / Buy a house",
    timeline: "Ongoing",
    tasks: [
      { id: uid(), text: "Set a monthly savings target", done: false },
      { id: uid(), text: "Open a dedicated savings account", done: false },
      { id: uid(), text: "Track expenses every week", done: false },
      { id: uid(), text: "Cut one unused subscription", done: false },
    ],
  },
  {
    id: uid(),
    icon: "🎓",
    title: "Learn motion design",
    timeline: "2 months",
    tasks: [
      { id: uid(), text: "Pick a course and enroll", done: false },
      { id: uid(), text: "Finish the course modules", done: false },
      { id: uid(), text: "Build 3 practice pieces", done: false },
      { id: uid(), text: "Share work and get feedback", done: false },
    ],
  },
]);

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length) return data;
    }
  } catch (e) { /* fall through to seed */ }
  return seedData();
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.goals));
}

const state = { goals: load() };

/* ---------- rendering ---------- */

const grid = document.getElementById("goalsGrid");
const template = document.getElementById("goalCardTemplate");

function goalProgress(goal) {
  if (!goal.tasks.length) return 0;
  const done = goal.tasks.filter((t) => t.done).length;
  return Math.round((done / goal.tasks.length) * 100);
}

function overallProgress() {
  const all = state.goals.flatMap((g) => g.tasks);
  if (!all.length) return 0;
  const done = all.filter((t) => t.done).length;
  return Math.round((done / all.length) * 100);
}

function render() {
  document.getElementById("todayLabel").textContent =
    new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  grid.innerHTML = "";
  state.goals.forEach((goal) => grid.appendChild(goalCard(goal)));

  const pct = overallProgress();
  document.getElementById("overallPct").textContent = pct + "%";
  const ring = document.getElementById("overallRing");
  const circumference = 326.7;
  ring.style.strokeDashoffset = String(circumference - (circumference * pct) / 100);
}

function goalCard(goal) {
  const node = template.content.cloneNode(true);
  const card = node.querySelector(".goal-card");
  card.dataset.goalId = goal.id;

  node.querySelector(".goal-icon").textContent = goal.icon;
  node.querySelector(".goal-title").textContent = goal.title;
  node.querySelector(".goal-timeline").textContent = "⏳ " + goal.timeline;

  const pct = goalProgress(goal);
  node.querySelector(".progress-fill").style.width = pct + "%";
  const doneCount = goal.tasks.filter((t) => t.done).length;
  node.querySelector(".progress-text").textContent = doneCount + "/" + goal.tasks.length + " done";
  if (pct === 100 && goal.tasks.length) card.classList.add("complete");

  const list = node.querySelector(".task-list");
  goal.tasks.forEach((task) => {
    const li = document.createElement("li");
    if (task.done) li.classList.add("done");

    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "task-check";
    check.checked = task.done;
    check.setAttribute("aria-label", task.text);
    check.addEventListener("change", () => toggleTask(goal.id, task.id, card));

    const span = document.createElement("span");
    span.className = "task-text";
    span.textContent = task.text;

    const del = document.createElement("button");
    del.type = "button";
    del.className = "task-del";
    del.textContent = "✕";
    del.setAttribute("aria-label", "Delete task");
    del.addEventListener("click", () => deleteTask(goal.id, task.id));

    li.append(check, span, del);
    list.appendChild(li);
  });

  node.querySelector(".add-task").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = e.target.elements.taskText;
    const text = input.value.trim();
    if (!text) return;
    goal.tasks.push({ id: uid(), text, done: false });
    save();
    render();
  });

  node.querySelector(".goal-delete").addEventListener("click", () => {
    if (confirm('Delete the goal "' + goal.title + '"?')) {
      state.goals = state.goals.filter((g) => g.id !== goal.id);
      save();
      render();
    }
  });

  return node;
}

/* ---------- actions ---------- */

function toggleTask(goalId, taskId, cardEl) {
  const goal = state.goals.find((g) => g.id === goalId);
  const task = goal.tasks.find((t) => t.id === taskId);
  const wasComplete = goalProgress(goal) === 100;
  task.done = !task.done;
  save();
  render();
  if (!wasComplete && goalProgress(goal) === 100 && goal.tasks.length) {
    const el = grid.querySelector('[data-goal-id="' + goalId + '"]');
    if (el) {
      el.classList.add("celebrate");
      setTimeout(() => el.classList.remove("celebrate"), 600);
    }
  }
}

function deleteTask(goalId, taskId) {
  const goal = state.goals.find((g) => g.id === goalId);
  goal.tasks = goal.tasks.filter((t) => t.id !== taskId);
  save();
  render();
}

document.getElementById("addGoalBtn").addEventListener("click", () => {
  const title = prompt("Goal name:");
  if (!title || !title.trim()) return;
  const timeline = prompt("Timeline (e.g. 2 months):", "1 month") || "";
  const icon = prompt("Pick an emoji icon for it:", "🚀") || "🚀";
  state.goals.push({ id: uid(), icon: icon.trim(), title: title.trim(), timeline: timeline.trim(), tasks: [] });
  save();
  render();
});

document.getElementById("resetBtn").addEventListener("click", () => {
  if (confirm("Reset to the demo goals and tasks?")) {
    state.goals = seedData();
    save();
    render();
  }
});

render();
