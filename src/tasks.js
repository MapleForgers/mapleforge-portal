const taskStatuses = [
  "To do",
  "In progress",
  "Needs review",
  "Blocked",
  "Done",
];
const taskTypes = [
  "Development",
  "Design",
  "Research",
  "Community",
  "Operations",
  "Documentation",
];
const taskPriorities = ["Urgent", "High", "Normal", "Low"];
const taskSeeds = [];
const ensureBeforeTasks = ensureCommunity;
ensureCommunity = function () {
  ensureBeforeTasks();
  state.tasks = state.tasks || JSON.parse(JSON.stringify(taskSeeds));
};
ensureCommunity();
let taskQuery = "",
  taskStatus = "All statuses",
  taskType = "All types",
  taskPriority = "All priorities",
  taskAssignee = "Everyone",
  taskSort = "priority",
  taskMode = "list",
  taskFollowing = false;
const taskNav = document.createElement("button");
taskNav.dataset.view = "tasks";
taskNav.innerHTML = `<span>${icon("path")}</span><span>Tasks</span>`;
$(".nav").append(taskNav);
const renderBeforeTasks = render;
render = function () {
  ensureCommunity();
  if (view !== "tasks") {
    renderBeforeTasks();
    return;
  }
  document.body.dataset.theme = state.preferences.theme;
  $$("[data-view]").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === view),
  );
  renderTasks();
  addPreferences();
};
const titleBeforeTasks = activityTitle;
activityTitle = function (section, id) {
  return section === "Tasks"
    ? state.tasks.find((t) => t.id === id)?.title || "Task"
    : titleBeforeTasks(section, id);
};
function taskName(id) {
  return peopleItems().find((p) => p.id === id)?.name || "Unassigned";
}
function taskDate(date) {
  return date
    ? new Date(date + "T12:00:00").toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not set";
}
function filteredTasks() {
  return state.tasks
    .filter(
      (t) =>
        (taskStatus === "All statuses" || t.status === taskStatus) &&
        (taskType === "All types" || t.type === taskType) &&
        (taskPriority === "All priorities" || t.priority === taskPriority) &&
        (taskAssignee === "Everyone" ||
          (taskAssignee === "unassigned"
            ? !t.assignee
            : t.assignee === taskAssignee)) &&
        (!taskFollowing || t.following) &&
        `${t.title} ${t.description} ${taskName(t.assignee)}`
          .toLowerCase()
          .includes(taskQuery.toLowerCase()),
    )
    .sort((a, b) =>
      taskSort === "title"
        ? a.title.localeCompare(b.title)
        : taskSort === "due"
          ? (a.due || "9999").localeCompare(b.due || "9999")
          : taskSort === "followup"
            ? (a.followUp || "9999").localeCompare(b.followUp || "9999")
            : taskSort === "assignee"
              ? taskName(a.assignee).localeCompare(taskName(b.assignee))
              : taskPriorities.indexOf(a.priority) -
                  taskPriorities.indexOf(b.priority) ||
                a.title.localeCompare(b.title),
    );
}
function taskChoices(values, current) {
  return values
    .map((v) => `<option ${v === current ? "selected" : ""}>${esc(v)}</option>`)
    .join("");
}
function renderTasks() {
  let tasks = state.tasks;
  $("#main").innerHTML =
    `<div class="board-head"><div><div class="eyebrow">MAKE IT HAPPEN</div><h1>Tasks</h1><p class="muted">Small next steps. Clear owners. Room to help each other.</p></div><button class="btn orange" id="new-task">＋ Add task</button></div><div class="people-stats"><div><strong>${tasks.filter((t) => t.status !== "Done").length}</strong><span>open tasks</span></div><div><strong>${tasks.filter((t) => t.status === "In progress").length}</strong><span>in progress</span></div><div><strong>${tasks.filter((t) => t.status === "Done").length}</strong><span>done</span></div><div><strong>${tasks.filter((t) => t.followUp && t.status !== "Done").length}</strong><span>with follow-up dates</span></div></div><p class="source-note">Starter tasks come from portal planning. Assignees are suggestions, not accepted commitments. Changes and comments stay in this browser for now. Follow-up dates are visible here; notifications are not connected.</p><div id="task-status-buttons" class="filter-chips" aria-label="Task status filters"></div><div class="request-tools task-tools"><input id="task-search" type="search" aria-label="Search tasks" placeholder="Search tasks or people…" value="${esc(taskQuery)}"><label>Type<select id="task-type">${taskChoices(["All types", ...taskTypes], taskType)}</select></label><label>Priority<select id="task-priority">${taskChoices(["All priorities", ...taskPriorities], taskPriority)}</select></label><label>Assignee<select id="task-assignee"><option value="Everyone">Everyone</option><option value="unassigned" ${taskAssignee === "unassigned" ? "selected" : ""}>Unassigned</option>${peopleItems()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(
        (p) =>
          `<option value="${p.id}" ${taskAssignee === p.id ? "selected" : ""}>${esc(p.name)}</option>`,
      )
      .join("")}</select></label><label>Sort<select id="task-sort">${[
      ["priority", "Priority"],
      ["due", "Due date"],
      ["followup", "Follow-up date"],
      ["assignee", "Assignee"],
      ["title", "Title A to Z"],
    ]
      .map(
        ([v, n]) =>
          `<option value="${v}" ${taskSort === v ? "selected" : ""}>${n}</option>`,
      )
      .join(
        "",
      )}</select></label></div><div class="people-filter-status"><div class="filter-chips"><button class="filter-chip ${taskMode === "list" ? "selected" : ""}" data-task-mode="list" aria-pressed="${taskMode === "list"}">Task list</button><button class="filter-chip ${taskMode === "board" ? "selected" : ""}" data-task-mode="board" aria-pressed="${taskMode === "board"}">Status board</button></div><label><input type="checkbox" id="task-following" ${taskFollowing ? "checked" : ""}> Following only</label><button class="btn link" id="task-clear">Clear filters</button><span id="task-count" aria-live="polite"></span></div><div id="task-results"></div>`;
  $("#new-task").onclick = () => editTask();
  $("#task-search").oninput = (e) => {
    taskQuery = e.target.value;
    renderTaskResults();
  };
  for (let [id, assign] of [
    ["task-type", (v) => (taskType = v)],
    ["task-priority", (v) => (taskPriority = v)],
    ["task-assignee", (v) => (taskAssignee = v)],
    ["task-sort", (v) => (taskSort = v)],
  ])
    $("#" + id).onchange = (e) => {
      assign(e.target.value);
      renderTaskResults();
    };
  $("#task-following").onchange = (e) => {
    taskFollowing = e.target.checked;
    renderTaskResults();
  };
  $("#task-clear").onclick = () => {
    taskQuery = "";
    taskStatus = "All statuses";
    taskType = "All types";
    taskPriority = "All priorities";
    taskAssignee = "Everyone";
    taskFollowing = false;
    renderTasks();
  };
  $$("[data-task-mode]").forEach(
    (b) =>
      (b.onclick = () => {
        taskMode = b.dataset.taskMode;
        renderTasks();
      }),
  );
  renderTaskResults();
}
function taskCard(t) {
  return `<article class="request-item task-row"><div><div class="request-meta"><span class="tag task-priority" data-priority="${t.priority}">${t.priority}</span><span>${esc(t.type)}</span></div><h3><button class="title-btn" data-task-open="${t.id}">${esc(t.title)}</button></h3><div class="request-meta"><span>${t.assignee ? "Suggested: " + esc(taskName(t.assignee)) : "Unassigned"}</span>${t.due ? `<span>Due ${taskDate(t.due)}</span>` : ""}${t.followUp ? `<span>Follow up ${taskDate(t.followUp)}</span>` : ""}<button class="btn link" data-task-open="${t.id}">${t.comments.length} comments</button></div></div><div class="task-row-actions"><label class="sr-only" for="status-${t.id}">Status for ${esc(t.title)}</label><select id="status-${t.id}" data-task-status="${t.id}" aria-label="Status for ${esc(t.title)}">${taskChoices(taskStatuses, t.status)}</select><button class="btn secondary" data-task-follow="${t.id}" aria-pressed="${t.following}">${t.following ? "Following ✓" : "Follow"}</button></div></article>`;
}
function renderTaskResults() {
  if (!$("#task-results")) return;
  let rows = filteredTasks();
  $("#task-status-buttons").innerHTML = ["All statuses", ...taskStatuses]
    .map((s) =>
      peopleChip(
        s,
        s === "All statuses"
          ? state.tasks.length
          : state.tasks.filter((t) => t.status === s).length,
        taskStatus === s,
        "data-task-filter",
        s,
      ),
    )
    .join("");
  $("#task-count").textContent =
    `${rows.length} of ${state.tasks.length} tasks`;
  $("#task-results").innerHTML =
    taskMode === "board"
      ? `<div class="task-board">${taskStatuses
          .map(
            (s) =>
              `<section class="task-lane"><h3>${s} <span>${rows.filter((t) => t.status === s).length}</span></h3>${
                rows
                  .filter((t) => t.status === s)
                  .map(taskCard)
                  .join("") || '<p class="small muted">No matching tasks</p>'
              }</section>`,
          )
          .join("")}</div>`
      : `<div class="request-list">${rows.map(taskCard).join("") || '<div class="empty">No tasks match. Clear a filter or add the next step.</div>'}</div>`;
  $$("[data-task-filter]").forEach(
    (b) =>
      (b.onclick = () => {
        taskStatus = b.dataset.taskFilter;
        renderTaskResults();
      }),
  );
  $$("[data-task-open]").forEach(
    (b) => (b.onclick = () => openTask(b.dataset.taskOpen)),
  );
  $$("[data-task-status]").forEach(
    (s) => (s.onchange = () => updateTaskStatus(s.dataset.taskStatus, s.value)),
  );
  $$("[data-task-follow]").forEach(
    (b) => (b.onclick = () => toggleTaskFollow(b.dataset.taskFollow)),
  );
}
function updateTaskStatus(id, status) {
  let t = state.tasks.find((t) => t.id === id),
    old = t.status;
  if (old === status) return;
  t.status = status;
  addActivity(
    "Status",
    "Tasks",
    id,
    "changed task status",
    old + " → " + status,
  );
  persist();
  if (view === "tasks") renderTasks();
}
function toggleTaskFollow(id) {
  let t = state.tasks.find((t) => t.id === id);
  t.following = !t.following;
  addActivity(
    "Following",
    "Tasks",
    id,
    t.following ? "followed a task" : "unfollowed a task",
  );
  persist();
  if (view === "tasks") renderTasks();
}
const taskDialog = createDialog("task-detail", "Task details");
function openTask(id) {
  let t = state.tasks.find((t) => t.id === id);
  if (!t) return;
  taskDialog.dataset.recordId = id;
  taskDialog.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><span class="tag">${esc(t.type)} · ${t.priority}</span><button class="close" aria-label="Close task">×</button></div><h2>${esc(t.title)}</h2><p class="request-detail-text">${esc(t.description)}</p><div class="task-detail-fields"><label>Status<select id="task-detail-status">${taskChoices(taskStatuses, t.status)}</select></label><div><strong>Suggested assignee</strong><p>${t.assignee ? `<button class="btn link" id="task-person">${t.assignee ? memberName(taskName(t.assignee)) : esc(taskName(t.assignee))} →</button>` : "Unassigned"}</p></div><div><strong>Due date</strong><p>${taskDate(t.due)}</p></div><div><strong>Follow up</strong><p>${taskDate(t.followUp)}</p></div></div><div class="filter-chips"><button class="btn secondary" id="task-edit">Edit task</button><button class="btn secondary" id="task-detail-follow">${t.following ? "Following ✓" : "Follow task"}</button></div><p class="source-note">${esc(t.source)}. Changes are a local preview. No assignment or notification is sent.</p><h3>Discussion · ${t.comments.length}</h3>${t.comments.map((c) => `<div class="request-comment"><strong>${memberName(c.author)}</strong><p>${esc(c.text)}</p><time class="small muted">${esc(new Date(c.date).toLocaleString())}</time></div>`).join("")}<form id="task-comment"><label class="form-field">Comment or follow-up note<textarea name="text" required maxlength="2000" placeholder="Share progress, a question or the next step…"></textarea></label><button type="submit" class="btn">Add comment</button></form></div>`;
  taskDialog.querySelector(".close").onclick = () => taskDialog.close();
  $("#task-edit").onclick = () => editTask(id);
  $("#task-detail-status").onchange = (e) => {
    updateTaskStatus(id, e.target.value);
    openTask(id);
  };
  $("#task-detail-follow").onclick = () => {
    toggleTaskFollow(id);
    openTask(id);
  };
  if ($("#task-person"))
    $("#task-person").onclick = () => openPerson(t.assignee);
  $("#task-comment").onsubmit = (e) => {
    e.preventDefault();
    let text = new FormData(e.target).get("text").trim();
    if (!text) return;
    let c = { author: "Demo member", text, date: new Date().toISOString() };
    t.comments.push(c);
    addActivity("Comments", "Tasks", id, "commented on a task", text);
    persist();
    openTask(id);
  };
  taskDialog.showModal();
}
function editTask(id) {
  let t = state.tasks.find((t) => t.id === id) || {
    title: "",
    description: "",
    type: "Development",
    priority: "Normal",
    status: "To do",
    assignee: "",
    due: "",
    followUp: "",
  };
  let d = createDialog("task-editor-" + (id || "new"), "Task editor");
  d.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><h2>${id ? "Edit task" : "Add a task"}</h2><button class="close" aria-label="Close task editor">×</button></div><form><label class="form-field">Task title<input name="title" required maxlength="160" value="${esc(t.title)}"></label><label class="form-field">What needs doing?<textarea name="description" required maxlength="4000">${esc(t.description)}</textarea></label><div class="task-detail-fields"><label class="form-field">Task type<select name="type">${taskChoices(taskTypes, t.type)}</select></label><label class="form-field">Priority<select name="priority">${taskChoices(taskPriorities, t.priority)}</select></label><label class="form-field">Status<select name="status">${taskChoices(taskStatuses, t.status)}</select></label><label class="form-field">Suggested assignee<select name="assignee"><option value="">Unassigned</option>${peopleItems()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (p) =>
        `<option value="${p.id}" ${p.id === t.assignee ? "selected" : ""}>${esc(p.name)} · ${esc(p.category)}</option>`,
    )
    .join(
      "",
    )}</select></label><label class="form-field">Due date<input type="date" name="due" value="${t.due}"></label><label class="form-field">Follow-up date<input type="date" name="followUp" value="${t.followUp}"></label></div><p class="source-note">A suggested assignee is not a confirmed commitment. No notifications are sent in this preview.</p><button type="submit" class="btn orange">${id ? "Save task" : "Create task"}</button></form></div>`;
  d.querySelector(".close").onclick = () => d.close();
  d.onclose = () => d.remove();
  d.querySelector("form").onsubmit = (e) => {
    e.preventDefault();
    let f = Object.fromEntries(new FormData(e.target));
    f.title = f.title.trim();
    f.description = f.description.trim();
    if (!f.title || !f.description) return;
    if (id) {
      Object.assign(t, f);
      addActivity("Organization", "Tasks", id, "updated a task");
    } else {
      id = "task-local-" + Date.now();
      state.tasks.unshift({
        ...f,
        id,
        comments: [],
        following: false,
        source: "Community preview task",
        created: new Date().toISOString(),
      });
      addActivity("Posts", "Tasks", id, "created a task");
    }
    persist();
    d.close();
    openTask(id);
  };
  d.showModal();
}
