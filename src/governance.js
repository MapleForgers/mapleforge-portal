const ensureBeforeGovernance = ensureCommunity;
ensureCommunity = function () {
  ensureBeforeGovernance();
  state.governance = state.governance || [];
  state.governanceVotes = state.governanceVotes || [];
  state.governanceComments = state.governanceComments || {};
};
ensureCommunity();
const governanceCategories = [
  "Decision-making",
  "Roles & teams",
  "Project process",
  "Ownership & credit",
  "Offers to help",
];
let governanceCategory = "All topics",
  governanceQuery = "";
const govItems = () => [
  ...state.governance,
  ...governanceSeeds.filter(
    (x) => !state.governance.some((y) => y.id === x.id),
  ),
];
const govNav = document.createElement("button");
govNav.dataset.view = "governance";
govNav.innerHTML = `<span data-icon="people">${icon("people")}</span><span>Community governance</span>`;
$(".nav").append(govNav);
govNav.onclick = () => {
  view = "governance";
  render();
  window.scrollTo(0, 0);
};
const renderBeforeGovernance = render;
render = function () {
  ensureCommunity();
  if (view !== "governance") {
    renderBeforeGovernance();
    return;
  }
  document.body.dataset.theme = state.preferences.theme;
  $("#crumb").textContent = "Community governance";
  $$("[data-view]").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === view),
  );
  renderGovernance();
  addPreferences();
};
function renderGovernance() {
  $("#main").innerHTML =
    `<div class="board-head"><div><div class="eyebrow">COMMUNITY GOVERNANCE</div><h1>How we work together.</h1><p class="muted small">Our roles, responsibilities, and ways of making decisions. Shaped by the people here.</p></div><button class="btn orange" id="new-gov">＋ Make a proposal</button></div><div class="governance-note"><strong>Proposals, not settled rules.</strong> These attributed summaries come from our Discord discussions. Different approaches are preserved for debate. Support here is advisory, not a binding vote or a role appointment.</div><div class="request-tools"><input id="gov-search" type="search" aria-label="Search governance proposals" placeholder="Search proposals, people, or roles…" value="${esc(governanceQuery)}"><select id="gov-category" aria-label="Governance topic">${["All topics", ...governanceCategories].map((c) => `<option ${c === governanceCategory ? "selected" : ""}>${c}</option>`).join("")}</select></div><div class="gov-summary"><span><strong>${govItems().filter((x) => x.category !== "Offers to help").length}</strong> proposals</span><span><strong>${govItems().filter((x) => x.category === "Offers to help").length}</strong> offers to help</span><span>Proposals do not confirm appointments or governance rules</span></div><div id="gov-results" class="request-list"></div>`;
  $("#new-gov").onclick = newGovernance;
  $("#gov-search").oninput = (e) => {
    governanceQuery = e.target.value;
    renderGovernanceResults();
  };
  $("#gov-category").onchange = (e) => {
    governanceCategory = e.target.value;
    renderGovernanceResults();
  };
  renderGovernanceResults();
}
function renderGovernanceResults() {
  let items = govItems().filter(
    (x) =>
      (governanceCategory === "All topics" ||
        x.category === governanceCategory) &&
      `${x.title} ${x.summary} ${x.author}`
        .toLowerCase()
        .includes(governanceQuery.toLowerCase()),
  );
  $("#gov-results").innerHTML =
    items
      .map(
        (x) =>
          `<article class="request-item"><div class="request-meta"><span class="tag">${esc(x.category)}</span><span>${esc(x.status)}</span><strong>${memberName(x.author)}</strong></div><h3><button class="title-btn" data-gov="${x.id}">${esc(x.title)}</button></h3><p>${esc(x.summary)}</p><div class="request-meta"><button class="btn link" data-gov="${x.id}">Discuss · ${(state.governanceComments[x.id] || []).length} comments</button><span>↑ ${state.governanceVotes.includes(x.id) ? 1 : 0} support</span>${x.source ? `<a href="${esc(x.source)}" target="_blank" rel="noopener">Original Discord post ↗</a>` : "<span>Community proposal</span>"}</div></article>`,
      )
      .join("") || '<div class="empty">No matching proposals.</div>';
  $$("[data-gov]").forEach(
    (b) => (b.onclick = () => openGovernance(b.dataset.gov)),
  );
}
const governanceDialog = createDialog(
  "governance-detail",
  "Governance proposal",
);
function openGovernance(id) {
  governanceDialog.dataset.recordId = id;
  let x = govItems().find((x) => x.id === id),
    comments = state.governanceComments[id] || [];
  governanceDialog.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><span class="tag">${esc(x.category)}</span><button class="close" aria-label="Close governance proposal">×</button></div><h2>${esc(x.title)}</h2><p class="small"><strong>${memberName(x.author)}</strong> · ${esc(x.status)}</p><p>${esc(x.summary)}</p><p class="source-note">Summary of a proposal or contribution offer. It does not establish community policy or appoint anyone.</p>${x.source ? `<details><summary>Read the original message</summary><blockquote class="request-detail-text">${esc(x.quote)}</blockquote><a href="${esc(x.source)}" target="_blank" rel="noopener">${esc(x.channel)} · ${esc(x.date.slice(0, 10))} · Open in Discord ↗</a></details>` : ""}<button class="btn secondary" id="gov-support" style="margin-top:16px">↑ ${state.governanceVotes.includes(id) ? "Supported · 1" : "Support proposal · 0"}</button><h3 style="margin-top:22px">Discussion · ${comments.length}</h3>${comments.map((c) => `<div class="request-comment" ${c.id ? `data-comment-id="${esc(c.id)}"` : ""}><strong>${memberName(c.author)}</strong><p>${esc(c.text)}</p></div>`).join("")}<form id="gov-comment"><label class="form-field">Add a perspective<textarea name="text" required maxlength="2000"></textarea></label><button class="btn" type="submit">Post comment</button></form><p class="source-note">Demo member · saved only in this browser.</p></div>`;
  governanceDialog.querySelector(".close").onclick = () =>
    governanceDialog.close();
  $("#gov-support").onclick = () => {
    state.governanceVotes = state.governanceVotes.includes(id)
      ? state.governanceVotes.filter((v) => v !== id)
      : [...state.governanceVotes, id];
    persist();
    openGovernance(id);
    renderGovernanceResults();
  };
  $("#gov-comment").onsubmit = (e) => {
    e.preventDefault();
    let text = new FormData(e.target).get("text").trim();
    if (!text) return;
    state.governanceComments[id] = [
      ...comments,
      { author: "Demo member", text, date: new Date().toISOString() },
    ];
    persist();
    openGovernance(id);
    renderGovernanceResults();
  };
  governanceDialog.showModal();
}
function newGovernance() {
  let d = createDialog("new-governance", "New governance proposal");
  d.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><h2>Shape how we work.</h2><button class="close" aria-label="Close new proposal">×</button></div><form><label class="form-field">Topic<select name="category">${governanceCategories.map((c) => `<option>${c}</option>`).join("")}</select></label><label class="form-field">Proposal title<input name="title" required maxlength="120"></label><label class="form-field">What do you propose?<textarea name="summary" required maxlength="4000" placeholder="Describe the role, responsibility, or decision process and why it would help."></textarea></label><p class="small muted">Posted as Demo member. A proposal does not assign anyone a role.</p><button type="submit" class="btn">Add proposal</button></form></div>`;
  d.querySelector(".close").onclick = () => d.close();
  d.onclose = () => d.remove();
  d.querySelector("form").onsubmit = (e) => {
    e.preventDefault();
    let f = Object.fromEntries(new FormData(e.target));
    f.title = f.title.trim();
    f.summary = f.summary.trim();
    if (!f.title || !f.summary) return;
    state.governance.unshift({
      ...f,
      id: "gov-local-" + Date.now(),
      author: "Demo member",
      status:
        f.category === "Offers to help" ? "Offer to help" : "For discussion",
    });
    persist();
    d.close();
    render();
  };
  d.showModal();
}
