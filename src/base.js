"use strict";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const esc = (x) =>
  String(x ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const leaf =
  '<svg role="img" aria-label="Canadian maple leaf" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 300 324">\n<path fill-rule="nonzero" fill="rgb(92.939758%, 10.978699%, 14.118958%)" fill-opacity="1" d="M 158.433594 324 C 158.433594 324 155.796875 259.550781 155.796875 253.160156 C 155.796875 246.71875 161.328125 244.539062 167.867188 245.902344 C 174.449219 247.351562 235.949219 259.550781 235.949219 259.550781 C 235.949219 259.550781 231.269531 246.535156 227.976562 236.875 C 224.730469 227.214844 228.996094 225.492188 231.269531 223.496094 L 300 165.214844 L 289.152344 160 C 282.574219 156.984375 283.59375 151.5625 284.613281 147.957031 L 296.570312 106.753906 C 296.570312 106.753906 267.929688 113.082031 261.207031 114.078125 C 255.878906 114.894531 254.023438 112.46875 252.355469 108.839844 L 243.78125 88.796875 L 207.863281 127.527344 C 201.097656 133.558594 194.5625 128.933594 195.765625 121.902344 C 196.925781 115.507812 213.792969 39.40625 213.792969 39.40625 C 213.792969 39.40625 195.164062 50.246094 189 53.871094 C 182.859375 57.476562 179.570312 56.863281 176.300781 51.0625 C 173.007812 45.230469 150 0 150 0 C 150 0 126.988281 45.230469 123.722656 51.0625 C 120.429688 56.863281 117.164062 57.476562 111 53.871094 C 104.835938 50.246094 86.203125 39.40625 86.203125 39.40625 C 86.203125 39.40625 103.121094 115.507812 104.234375 121.902344 C 105.460938 128.933594 98.902344 133.558594 92.136719 127.527344 L 56.21875 88.796875 L 47.621094 108.839844 C 45.976562 112.46875 44.144531 114.894531 38.792969 114.078125 C 32.09375 113.082031 2.273438 106.753906 2.273438 106.753906 L 15.386719 147.957031 C 16.40625 151.5625 17.425781 156.984375 10.871094 160 L 0 165.214844 L 68.730469 223.496094 C 71.003906 225.492188 75.3125 227.214844 72.023438 236.875 C 68.730469 246.535156 64.027344 259.550781 64.027344 259.550781 C 64.027344 259.550781 125.578125 247.351562 132.132812 245.902344 C 138.714844 244.539062 144.230469 246.71875 144.230469 253.160156 C 144.230469 259.550781 141.566406 324 141.566406 324 L 158.433594 324 "/>\n</svg>\n';
const paths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  people:
    '<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4M17 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 2 4v3"/>',
  path: '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h8a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h8"/>',
  book: '<path d="M4 3h13a3 3 0 0 1 3 3v15H6a3 3 0 0 1-3-3V4a1 1 0 0 1 1-1zM3 17h17M7 7h9M7 11h6"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>',
  save: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  chat: '<path d="M4 4h16v12H9l-5 4z"/>',
};
function icon(n) {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[n] || paths.grid}</svg>`;
}
$$("[data-leaf]").forEach((e) => (e.innerHTML = leaf));
$$("[data-icon]").forEach((e) => (e.innerHTML = icon(e.dataset.icon)));
const categories = [
  "All themes",
  "Community & care",
  "Work & careers",
  "Climate & resources",
  "Business & technology",
];
const catById = [2, 2, 0, 3, 3, 1, 3, 2, 0, 0, 0, 1, 0, 1, 3, 1, 3];
const seed = JSON.parse($("#seed").textContent).map((x, i) => ({
  ...x,
  category: categories[catById[i] + 1],
  stage: "Idea",
  imported: true,
}));
const KEY = "mapleforge-offline-v1";
let storageOK = true;
let state = {
  votes: [],
  saved: [],
  comments: {},
  contributions: {},
  custom: [],
  stages: {},
};
try {
  let x = JSON.parse(localStorage.getItem(KEY) || "null");
  if (x && Array.isArray(x.votes) && Array.isArray(x.custom))
    state = { ...state, ...x };
} catch (e) {
  storageOK = false;
}
let view = "ideas",
  tab = "all",
  query = "",
  category = "All themes",
  sort = "original",
  currentId = null;
let remoteIdeas = [];
const allIdeas = () => [...seed, ...state.custom, ...remoteIdeas];
const find = (id) => allIdeas().find((x) => x.id === id);
const initials = (n) =>
  n
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    storageOK = false;
    toast(
      "This browser cannot save changes. Changes cannot be saved on this device.",
    );
  }
}
let toastTimer;
function toast(t) {
  $("#toast").textContent = t;
  $("#toast").classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.add("hidden"), 3400);
}
function enter() {
  $("#entry").classList.add("hidden");
  $("#app").classList.remove("hidden");
  render();
  if (!storageOK) toast("Changes cannot be saved on this device.");
}
$("#demo-entry").onclick = enter;
$("#discord-entry").onclick = () =>
  $("#access-status").classList.toggle("hidden");
$("#exit").onclick = () => {
  $("#app").classList.add("hidden");
  $("#entry").classList.remove("hidden");
};
$$("[data-view]").forEach(
  (b) =>
    (b.onclick = () => {
      view = b.dataset.view;
      render();
      window.scrollTo(0, 0);
    }),
);
$$("[data-close]").forEach(
  (b) => (b.onclick = () => document.getElementById(b.dataset.close).close()),
);
function header(kicker, title, sub) {
  return `<div class="hero"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${sub}</p></div><div class="hero-aside"><div class="stack"><div><div class="number">${allIdeas().length}</div><div class="small muted">ideas to explore</div></div><div><div class="number">${new Set(seed.map((x) => x.proposer)).size}</div><div class="small muted">original voices</div></div></div><p>Gathered from our Discord.<br>Ready for the next conversation.</p></div></div>`;
}
function render() {
  const labels = {
    ideas: "Idea board",
    contributions: "My contributions",
    process: "How we work",
    workspace: "Workspace notes",
  };
  $("#crumb").textContent = labels[view];
  $("#nav-count").textContent = allIdeas().length;
  $$("[data-view]").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === view),
  );
  if (view === "ideas") renderBoard();
  else if (view === "process") renderProcess();
  else if (view === "contributions") renderContributions();
  else renderWorkspace();
}
function renderBoard() {
  $("#main").innerHTML =
    header(
      "THE COMMUNITY IDEA BOARD",
      "What could we build together?",
      "A place for the ideas already taking shape, and the ones we haven’t thought of yet. Find something that sparks your curiosity.",
    ) +
    `<div class="phase-banner"><span class="icon">✦</span><div><strong style="font-size:13px">Every project starts with a conversation.</strong><p>Explore an idea. Ask a good question. Put your hand up to help.</p></div><button id="process-link">See how we work →</button></div><div class="board-head"><div class="tabs" role="tablist" aria-label="Idea lists"><button data-tab="all" role="tab" class="${tab === "all" ? "active" : ""}">All ideas <span>${allIdeas().length}</span></button><button data-tab="saved" role="tab" class="${tab === "saved" ? "active" : ""}">Saved <span>${state.saved.length}</span></button><button data-tab="involved" role="tab" class="${tab === "involved" ? "active" : ""}">I’m involved <span>${Object.keys(state.contributions).length}</span></button></div><button class="btn orange" id="new-idea">＋ Share an idea</button></div><div class="filters"><div class="search">${icon("search")}<input id="search" type="search" aria-label="Search ideas" placeholder="Search ideas, people or possibilities…" value="${esc(query)}"></div><select id="category" aria-label="Filter by theme">${categories.map((c) => `<option ${c === category ? "selected" : ""}>${esc(c)}</option>`).join("")}</select><select id="sort" aria-label="Sort ideas"><option value="original" ${sort === "original" ? "selected" : ""}>Original order</option><option value="votes" ${sort === "votes" ? "selected" : ""}>Most supported</option><option value="newest" ${sort === "newest" ? "selected" : ""}>Newest first</option></select></div><div class="grid" id="cards"></div><div class="footer-note"><span id="result-count"></span><span>Original ideas credited to their authors · Demo votes start at zero</span></div>`;
  $("#new-idea").onclick = () => $("#submit-dialog").showModal();
  $("#process-link").onclick = () => {
    view = "process";
    render();
  };
  $$("[data-tab]").forEach((b) => {
    b.setAttribute("aria-selected", b.dataset.tab === tab);
    b.onclick = () => {
      tab = b.dataset.tab;
      render();
    };
  });
  $("#search").oninput = (e) => {
    query = e.target.value;
    renderCards();
  };
  $("#category").onchange = (e) => {
    category = e.target.value;
    renderCards();
  };
  $("#sort").onchange = (e) => {
    sort = e.target.value;
    state.preferences.sort = sort;
    persist();
    renderCards();
  };
  renderCards();
}
function renderCards() {
  let list = allIdeas().filter(
    (i) =>
      (tab !== "saved" || state.saved.includes(i.id)) &&
      (tab !== "involved" || state.contributions[i.id]) &&
      (category === "All themes" || i.category === category) &&
      `${i.title} ${i.summary} ${i.proposer}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  if (sort === "votes")
    list.sort(
      (a, b) =>
        Number(state.votes.includes(b.id)) - Number(state.votes.includes(a.id)),
    );
  if (sort === "newest") list.reverse();
  if (sort === "alphabetical")
    list.sort((a, b) => a.title.localeCompare(b.title));
  if (sort === "author")
    list.sort((a, b) => a.proposer.localeCompare(b.proposer));
  if (sort === "comments")
    list.sort(
      (a, b) =>
        (state.comments[b.id] || []).length -
        (state.comments[a.id] || []).length,
    );
  $("#cards").innerHTML = list.length
    ? list
        .map(
          (i) =>
            `<article class="card"><div class="card-top"><span class="tag ${i.category === "Climate & resources" ? "ochre" : ""}">${esc(i.category)}</span><button class="save ${state.saved.includes(i.id) ? "selected" : ""}" data-save="${i.id}" aria-label="${state.saved.includes(i.id) ? "Unsave" : "Save"} ${esc(i.title)}" aria-pressed="${state.saved.includes(i.id)}">${icon("save")}</button></div><h3><button class="title-btn" data-open="${i.id}">${esc(i.title)}</button></h3><p>${esc(i.summary)}</p><div class="author"><span class="avatar">${esc(initials(i.proposer))}</span><strong>${memberName(i.proposer)}</strong><span>${esc(state.stages[i.id] || "Idea")}</span></div><div class="card-footer"><button class="vote ${state.votes.includes(i.id) ? "selected" : ""}" data-vote="${i.id}" aria-label="Support ${esc(i.title)}" aria-pressed="${state.votes.includes(i.id)}">↑ <b>${state.votes.includes(i.id) ? 1 : 0}</b></button><button class="comment-link" data-open="${i.id}">${icon("chat")} ${(state.comments[i.id] || []).length}</button><button class="open" data-open="${i.id}">Discuss →</button></div></article>`,
        )
        .join("")
    : '<div class="empty"><h2>Room for a possibility.</h2><p class="muted">No ideas match this view. Try another theme or save an idea that interests you.</p></div>';
  $("#result-count").textContent =
    `Showing ${list.length} of ${allIdeas().length} ideas`;
  $$("[data-open]").forEach(
    (b) => (b.onclick = () => openIdea(b.dataset.open)),
  );
  $$("[data-vote]").forEach(
    (b) => (b.onclick = () => toggleVote(b.dataset.vote)),
  );
  $$("[data-save]").forEach(
    (b) =>
      (b.onclick = () => {
        let id = b.dataset.save;
        state.saved = state.saved.includes(id)
          ? state.saved.filter((x) => x !== id)
          : [...state.saved, id];
        persist();
        render();
      }),
  );
}
function toggleVote(id) {
  state.votes = state.votes.includes(id)
    ? state.votes.filter((x) => x !== id)
    : [...state.votes, id];
  persist();
  if (view === "ideas") renderCards();
  if ($("#detail-dialog").open) renderDetail();
  toast(
    state.votes.includes(id)
      ? "Your demo support was added."
      : "Your demo support was removed.",
  );
}
function openIdea(id) {
  currentId = id;
  renderDetail();
  $("#detail-dialog").showModal();
}
function renderDetail() {
  const i = find(currentId);
  if (!i) return;
  let comments = state.comments[i.id] || [];
  const c = state.contributions[i.id];
  $("#detail-content").innerHTML =
    `<div class="dialog-top"><span class="tag">${esc(i.category)}</span><button class="close" id="detail-close" aria-label="Close idea">×</button></div><h2 class="detail-title" id="detail-heading">${esc(i.title)}</h2><div class="detail-meta"><span class="avatar">${esc(initials(i.proposer))}</span><span>Proposed by <strong>${memberName(i.proposer)}</strong></span><span>· ${i.imported ? "From Discord" : "Local demo idea"}</span></div><div class="detail-body"><div><h3>The idea</h3><p>${esc(i.summary)}</p>${i.detail ? `<h3>From the original discussion</h3><p>${esc(i.detail)}</p>` : ""}${[
      ["problem", "Problem or opportunity"],
      ["audience", "Who it is for"],
      ["difference", "What makes it different"],
      ["resources", "What we would need"],
      ["firstStep", "The first step"],
    ]
      .filter(([k]) => i[k])
      .map(([k, l]) => `<h3>${l}</h3><p>${esc(i[k])}</p>`)
      .join(
        "",
      )}${i.source ? `<a class="small" href="${esc(i.source)}" target="_blank" rel="noopener noreferrer">Read the original Discord message ↗</a>` : ""}${i.reference ? `<p><a href="${esc(i.reference)}" target="_blank" rel="noopener noreferrer">Reference ↗</a></p>` : ""}<div style="margin-top:22px"><button class="btn secondary" id="detail-vote">↑ ${state.votes.includes(i.id) ? "Supported · 1" : "Support this idea · 0"}</button></div><div class="thread"><h3>Build on the idea <span class="muted">(${comments.length})</span></h3><p class="small">A question, a concern, a useful connection. It all helps.</p>${comments.map((x) => `<div class="comment"><strong class="small">Demo member</strong> <small>· local comment</small><p>${esc(x.text)}</p></div>`).join("")}<form class="comment-form" id="comment-form"><textarea name="comment" required maxlength="2000" aria-label="Your comment" placeholder="What would make this idea stronger?"></textarea><button class="btn" type="submit">Add comment</button></form></div></div><aside class="detail-aside"><h3>Put your hand up</h3><p class="small">Tell the group how you’d like to help.</p><form id="contribute-form"><label for="role">Contribution</label><select id="role" name="role">${["Research & validation", "Design & experience", "Development", "Marketing & outreach", "Operations", "Project coordination", "Testing & feedback", "Other"].map((r) => `<option ${c?.role === r ? "selected" : ""}>${r}</option>`).join("")}</select><label for="capacity">Availability</label><input id="capacity" name="capacity" maxlength="100" placeholder="e.g. 2 hours a week" value="${esc(c?.capacity || "")}" required><button class="btn" type="submit">${c ? "Update my interest" : "I’d like to help"}</button></form>${c ? '<button class="btn link" id="withdraw">Withdraw my interest</button>' : ""}<hr style="border:0;border-top:1px solid #cfdac2;margin:23px 0"><label for="stage">Preview a project stage</label><select id="stage">${["Idea", "Challenge", "Refine", "Vote", "Scope & build", "Review"].map((s) => `<option ${s === (state.stages[i.id] || "Idea") ? "selected" : ""}>${s}</option>`).join("")}</select><p class="small">Prototype control. All imported ideas begin as proposals, with no recorded approval.</p></aside></div>`;
  $("#detail-close").onclick = () => $("#detail-dialog").close();
  $("#detail-vote").onclick = () => toggleVote(i.id);
  $("#comment-form").onsubmit = (e) => {
    e.preventDefault();
    let text = new FormData(e.target).get("comment").trim();
    if (!text) return;
    state.comments[i.id] = [
      ...comments,
      { text, date: new Date().toISOString() },
    ];
    persist();
    renderDetail();
    if (view === "ideas") renderCards();
    toast("Comment saved in this browser.");
  };
  $("#contribute-form").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    if (!f.get("capacity").trim()) return;
    state.contributions[i.id] = {
      role: f.get("role"),
      capacity: f.get("capacity").trim(),
    };
    persist();
    renderDetail();
    toast("Your interest is saved locally.");
  };
  if ($("#withdraw"))
    $("#withdraw").onclick = () => {
      delete state.contributions[i.id];
      persist();
      renderDetail();
      toast("Interest withdrawn.");
    };
  $("#stage").onchange = (e) => {
    state.stages[i.id] = e.target.value;
    persist();
    if (view === "ideas") renderCards();
    toast("Demo stage updated.");
  };
}
$("#detail-dialog").addEventListener("close", () => render());
$("#new-category").innerHTML = categories
  .slice(1)
  .map((x) => `<option>${x}</option>`)
  .join("");
$("#idea-form").onsubmit = (e) => {
  e.preventDefault();
  let f = Object.fromEntries(new FormData(e.target));
  for (let k in f) f[k] = f[k].trim();
  if (!f.title || !f.summary || !f.problem || !f.audience || !f.firstStep)
    return;
  if (f.reference && !/^https?:\/\//i.test(f.reference)) {
    toast("Use an http or https reference link.");
    return;
  }
  let i = {
    ...f,
    id: "local-" + Date.now(),
    proposer: "Demo member",
    stage: "Idea",
    imported: false,
  };
  state.custom.push(i);
  persist();
  e.target.reset();
  $("#submit-dialog").close();
  view = "ideas";
  tab = "all";
  query = "";
  category = "All themes";
  sort = "newest";
  render();
  toast("Your idea is on the local board.");
};
function renderProcess() {
  let steps = [
    [
      "Ideate",
      "Share a short proposal. Early and unfinished ideas are welcome.",
    ],
    [
      "Challenge",
      "Explore the need, alternatives, risks and technical questions.",
    ],
    ["Refine", "Use the discussion to make the proposal clearer and stronger."],
    ["Vote", "Compare promising ideas and express community interest."],
    [
      "Scope & build",
      "Agree on ownership and credit, test demand, then define a small first build.",
    ],
    [
      "Review",
      "Look at evidence, learn from the result and decide what happens next.",
    ],
  ];
  $("#main").innerHTML =
    header(
      "A SHARED STARTING POINT",
      "Give good ideas a fair chance.",
      "A suggested process for community collaboration. Clear steps, space for questions, and room for different kinds of contribution.",
    ) +
    `<div class="steps">${steps.map(([t, p], i) => `<section class="panel step"><div class="step-num">0${i + 1}</div><h3>${t}</h3><p>${p}</p></section>`).join("")}</div><div class="notice">This process is a proposal for community review. Voting rules, deadlines and advancement decisions still need agreement.</div><section class="panel"><h2 style="font-size:25px">Contribution comes in many forms.</h2><p class="muted">Research, customer conversations, design, testing, operations and coordination all matter. Registering interest is a conversation starter, not a commitment to unpaid work.</p></section>`;
}
function renderContributions() {
  let entries = Object.entries(state.contributions);
  $("#main").innerHTML =
    header(
      "FIND YOUR PLACE",
      "What would you like to help with?",
      "Your interests, availability and local contributions in one place. Start with an idea that feels worthwhile.",
    ) +
    `<section class="panel"><h2 style="font-size:25px">My interests</h2>${entries.length ? entries.map(([id, c]) => `<div class="contribution-row"><div><strong>${esc(find(id)?.title || "Idea")}</strong><p>${esc(c.role)} · ${esc(c.capacity)}</p></div><button class="btn secondary" data-contribution="${id}">View idea →</button></div>`).join("") : '<p class="muted">You haven’t put your hand up yet. Open an idea and choose how you would like to contribute.</p><button class="btn" id="browse">Explore ideas →</button>'}</section><section class="panel"><h3>Your preview activity</h3><p class="muted">${state.votes.length} supported ideas · ${Object.values(state.comments).reduce((n, x) => n + x.length, 0)} comments · ${state.custom.length} new ideas</p></section>`;
  $$("[data-contribution]").forEach(
    (b) => (b.onclick = () => openIdea(b.dataset.contribution)),
  );
  if ($("#browse"))
    $("#browse").onclick = () => {
      view = "ideas";
      render();
    };
}
function renderWorkspace() {}
