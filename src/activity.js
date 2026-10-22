// Activity records actual local changes, never fabricated imported history.
const activityEnsure = ensureCommunity;
ensureCommunity = function () {
  activityEnsure();
  state.activity = state.activity || [];
};
ensureCommunity();
let activityBaseline = JSON.parse(JSON.stringify(state));
const activityPersist = persist;
function activityTitle(section, id) {
  if (section === "People & skills")
    return peopleItems().find((p) => p.id === id)?.name || "Member profile";
  if (section === "Ideas") return find(id)?.title || "Idea";
  if (section === "Features")
    return state.requests?.find((r) => r.id === id)?.title || "Feature request";
  return govItems().find((r) => r.id === id)?.title || "Governance proposal";
}
function addActivity(
  type,
  section,
  target,
  action,
  detail = "",
  actor = "Demo member",
) {
  state.activity.unshift({
    id: "activity-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    date: new Date().toISOString(),
    actor,
    type,
    section,
    target,
    title: activityTitle(section, target),
    action,
    detail,
  });
}
persist = function () {
  if (!state.activity) {
    state.activity = [];
    activityBaseline = JSON.parse(JSON.stringify(state));
    activityPersist();
    return;
  }
  let before = activityBaseline;
  for (let [key, section] of [
    ["custom", "Ideas"],
    ["requests", "Features"],
    ["governance", "Governance"],
  ]) {
    let previous = new Set((before[key] || []).map((x) => x.id));
    for (let item of state[key] || [])
      if (
        !previous.has(item.id) &&
        !(
          key === "requests" &&
          initialRequests.some((seed) => seed.id === item.id)
        )
      )
        addActivity(
          "Posts",
          section,
          item.id,
          "posted a new " +
            (section === "Ideas"
              ? "idea"
              : section === "Features"
                ? "feature request"
                : "governance proposal"),
          "",
          item.author || "Demo member",
        );
  }
  for (let [key, section] of [
    ["comments", "Ideas"],
    ["requestComments", "Features"],
    ["governanceComments", "Governance"],
  ])
    for (let [id, comments] of Object.entries(state[key] || {})) {
      let count = (before[key]?.[id] || []).length;
      for (let c of comments.slice(count))
        addActivity(
          "Comments",
          section,
          id,
          "commented",
          c.text,
          c.author || "Demo member",
        );
    }
  for (let [key, section] of [
    ["votes", "Ideas"],
    ["requestVotes", "Features"],
    ["governanceVotes", "Governance"],
  ]) {
    let old = before[key] || [],
      now = state[key] || [];
    for (let id of now.filter((x) => !old.includes(x)))
      addActivity("Votes", section, id, "added support");
    for (let id of old.filter((x) => !now.includes(x)))
      addActivity("Votes", section, id, "withdrew support");
  }
  for (let id of new Set([
    ...Object.keys(before.ideaMembers || {}),
    ...Object.keys(state.ideaMembers || {}),
  ])) {
    let old = before.ideaMembers?.[id] || [],
      now = state.ideaMembers?.[id] || [];
    for (let m of now) {
      let prev = old.find((x) => x.id === m.id);
      if (!prev)
        addActivity("Membership", "Ideas", id, "joined the idea", "", m.name);
      else if (JSON.stringify(prev) !== JSON.stringify(m))
        addActivity(
          "Contributions",
          "Ideas",
          id,
          "updated their contribution",
          [m.role, m.capacity].filter(Boolean).join(" · "),
          m.name,
        );
    }
    for (let m of old)
      if (!now.some((x) => x.id === m.id))
        addActivity("Membership", "Ideas", id, "left the idea", "", m.name);
  }
  for (let [id, stage] of Object.entries(state.stages || {}))
    if (stage !== before.stages?.[id])
      addActivity("Status", "Ideas", id, "changed the stage", stage);
  for (let r of state.requests || []) {
    let old = before.requests?.find((x) => x.id === r.id);
    if (!old) continue;
    if (r.status !== old.status)
      addActivity(
        "Status",
        "Features",
        r.id,
        "changed the status",
        `${old.status} → ${r.status}`,
      );
    if (
      JSON.stringify(r.tags) !== JSON.stringify(old.tags) ||
      r.group !== old.group ||
      r.duplicateOf !== old.duplicateOf
    )
      addActivity(
        "Organization",
        "Features",
        r.id,
        "updated groups, tags, or duplicate links",
        [r.group, ...r.tags, r.duplicateOf ? "Linked duplicate" : ""]
          .filter(Boolean)
          .join(" · "),
      );
  }
  for (let r of state.featureReleases || [])
    if (!(before.featureReleases || []).some((x) => x.id === r.id))
      addActivity(
        "Releases",
        "Features",
        r.requestId,
        "recorded a feature activation",
        r.notes,
        r.author,
      );
  for (let id of (state.requestFollows || []).filter(
    (x) => !(before.requestFollows || []).includes(x),
  ))
    addActivity("Following", "Features", id, "followed the feature");
  for (let id of (before.requestFollows || []).filter(
    (x) => !(state.requestFollows || []).includes(x),
  ))
    addActivity("Following", "Features", id, "unfollowed the feature");
  activityBaseline = JSON.parse(JSON.stringify(state));
  activityPersist();
};
const activityNav = document.createElement("button");
activityNav.dataset.view = "activity";
activityNav.setAttribute("aria-label", "Activity");
activityNav.innerHTML = `<span data-icon="path">${icon("path")}</span><span>Activity</span>`;
$(".nav").append(activityNav);
let activityMember = "Everyone",
  activityType = "All activity",
  activityArea = "Every section",
  activityOrder = "newest",
  activitySearch = "",
  activityPeriod = "all";
const beforeActivityRender = render;
render = function () {
  ensureCommunity();
  if (view !== "activity") {
    beforeActivityRender();
    return;
  }
  document.body.dataset.theme = state.preferences.theme;
  $$("[data-view]").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === view),
  );
  renderActivity();
  addPreferences();
};
function renderActivity() {
  let members = [...new Set(state.activity.map((x) => x.actor))].sort();
  $("#main").innerHTML =
    `<div class="board-head"><div><div class="eyebrow">COMMUNITY ACTIVITY</div><h1>What’s happening.</h1><p class="muted">Posts, conversations, people joining in, and progress across the workshop.</p></div><button id="activity-refresh" class="btn secondary">Refresh</button></div><div class="request-tools activity-filters"><input type="search" id="activity-search" aria-label="Search activity" placeholder="Search people, projects, or comments…" value="${esc(activitySearch)}"><label>Member<select id="activity-member">${["Everyone", ...members].map((x) => `<option ${x === activityMember ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></label><label>Activity<select id="activity-type">${["All activity", "Posts", "Comments", "Votes", "Membership", "Contributions", "Status", "Organization", "Following", "Releases", "Profiles"].map((x) => `<option ${x === activityType ? "selected" : ""}>${x}</option>`).join("")}</select></label><label>Section<select id="activity-area">${["Every section", "Ideas", "Features", "Governance", "People & skills", "Tasks", "Skills exchange", "Resource sharing"].map((x) => `<option value="${x}" ${x === activityArea ? "selected" : ""}>${x === "Skills exchange" ? "Available skills" : x === "Resource sharing" ? "Available resources" : x}</option>`).join("")}</select></label><label>When<select id="activity-period">${[
      ["all", "All time"],
      ["day", "Past 24 hours"],
      ["week", "Past 7 days"],
    ]
      .map(
        ([v, l]) =>
          `<option value="${v}" ${activityPeriod === v ? "selected" : ""}>${l}</option>`,
      )
      .join("")}</select></label><label>Sort<select id="activity-order">${[
      ["newest", "Newest first"],
      ["oldest", "Oldest first"],
      ["member", "By member"],
    ]
      .map(
        ([v, l]) =>
          `<option value="${v}" ${activityOrder === v ? "selected" : ""}>${l}</option>`,
      )
      .join(
        "",
      )}</select></label></div><p class="source-note">Shared activity from member posts, comments, contributions and board updates. Imported history is not presented as new activity.</p><div id="activity-count" class="small muted"></div><div id="activity-results" class="activity-list"></div>`;
  $("#activity-refresh").onclick = renderActivity;
  $("#activity-search").oninput = (e) => {
    activitySearch = e.target.value;
    renderActivityRows();
  };
  $("#activity-member").onchange = (e) => {
    activityMember = e.target.value;
    renderActivityRows();
  };
  $("#activity-type").onchange = (e) => {
    activityType = e.target.value;
    renderActivityRows();
  };
  $("#activity-area").onchange = (e) => {
    activityArea = e.target.value;
    renderActivityRows();
  };
  $("#activity-period").onchange = (e) => {
    activityPeriod = e.target.value;
    renderActivityRows();
  };
  $("#activity-order").onchange = (e) => {
    activityOrder = e.target.value;
    renderActivityRows();
  };
  renderActivityRows();
}
function renderActivityRows() {
  let cutoff =
    activityPeriod === "day"
      ? Date.now() - 86400000
      : activityPeriod === "week"
        ? Date.now() - 604800000
        : 0;
  let rows = state.activity.filter(
    (x) =>
      (activityMember === "Everyone" || x.actor === activityMember) &&
      (activityType === "All activity" || x.type === activityType) &&
      (activityArea === "Every section" || x.section === activityArea) &&
      Date.parse(x.date) >= cutoff &&
      `${x.actor} ${x.title} ${x.action} ${x.detail}`
        .toLowerCase()
        .includes(activitySearch.toLowerCase()),
  );
  rows.sort((a, b) =>
    activityOrder === "member"
      ? a.actor.localeCompare(b.actor) || b.date.localeCompare(a.date)
      : activityOrder === "oldest"
        ? a.date.localeCompare(b.date)
        : b.date.localeCompare(a.date),
  );
  $("#activity-count").textContent =
    `${rows.length} matching events · ${state.activity.length} recorded`;
  $("#activity-results").innerHTML =
    rows
      .map(
        (x) =>
          `<article class="activity-row"><span class="avatar">${esc(initials(x.actor))}</span><div><p><strong>${memberName(x.actor)}</strong> ${esc(x.action)} <button class="btn link" data-activity-target="${esc(x.id)}">${esc(x.title)}</button></p>${x.detail ? `<p class="activity-excerpt">${esc(x.detail)}</p>` : ""}<div class="request-meta"><span>${esc(x.section === "Skills exchange" ? "Available skills" : x.section === "Resource sharing" ? "Available resources" : x.section)}</span><span>${esc(x.type)}</span><time datetime="${x.date}">${portalTimeHtml(x.date)}</time></div></div></article>`,
      )
      .join("") ||
    '<div class="empty">No activity matches yet. Join an idea, add a comment, or post a request to start the conversation.</div>';
  $$("[data-activity-target]").forEach(
    (b) =>
      (b.onclick = () => {
        let event = state.activity.find(
          (x) => x.id === b.dataset.activityTarget,
        );
        if (event.section === "Ideas") openIdea(event.target);
        else if (event.section === "Features") openRequest(event.target);
        else if (event.section === "People & skills") openPerson(event.target);
        else if (event.section === "Tasks") openTask(event.target);
        else if (event.section === "Skills exchange")
          openExchange(event.target);
        else if (event.section === "Resource sharing")
          openResource(event.target);
        else if (event.section === "Framework") switchSection("framework");
        else openGovernance(event.target);
      }),
  );
}
