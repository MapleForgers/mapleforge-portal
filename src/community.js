// Personal preferences and the community request board. All mutations stay local.
const requestStages = [
  "Open",
  "Under review",
  "Planned",
  "In progress",
  "Complete",
  "Closed",
];
const initialRequests = [];
function ensureCommunity() {
  state.preferences = {
    theme: "forest",
    layout: "feed",
    sort: "original",
    ...(state.preferences || {}),
  };
  if (!["forest", "maple", "night", "plain"].includes(state.preferences.theme))
    state.preferences.theme = "forest";
  if (!["feed", "cards", "compact", "lanes"].includes(state.preferences.layout))
    state.preferences.layout = "feed";
  state.requests =
    state.requests || JSON.parse(JSON.stringify(initialRequests));
  state.requestComments = state.requestComments || {};
  state.requestVotes = state.requestVotes || [];
}
ensureCommunity();
sort = state.preferences.sort;
document.body.dataset.theme = state.preferences.theme;
const canadaArt = `<svg class="community-art" viewBox="0 0 360 136" role="img" aria-label="Canadian mountains and lake, northern lights, and neighbours gathering at a glowing forge"><path class="art-aurora" d="M15 49Q90-10 155 24T340 8M55 57Q137 4 215 30T350 21" fill="none" stroke="#7fc9b0" stroke-width="10" opacity=".35"/><circle class="art-sun" cx="288" cy="31" r="20" fill="#e9b969"/><path d="M32 103 102 24l51 63 43-51 63 70" fill="#8da99d"/><path d="m77 52 25-28 27 33-14-7-12 7-10-12zM176 60l20-24 22 30-15-6-8 7-8-12z" fill="#f5f1dd"/><path d="M0 110q81-35 158-5t202-10v41H0" fill="#416e5b"/><path d="M39 118q78-15 135 1t126-3l-26 20H78z" fill="#88b7b2"/><path d="M102 128h53m46 1h36m-71-6h30" stroke="#e8f0dc" stroke-width="2" stroke-linecap="round"/><g fill="#244b3c"><path d="m35 45-18 31h10L9 103h52L43 76h10zM65 69l-14 24h8l-13 19h38L71 93h8zM323 49l-20 35h12l-20 30h57l-20-30h12z"/></g><path d="M234 111V76h50v35" fill="#bb6743"/><path d="m224 78 35-29 36 29z" fill="#243e34"/><path d="M249 111V86h20v25" fill="#f5d492"/><path d="m252 106 6-14 3 8 5-5v11z" fill="#e97537"/><path d="M277 54V41h7v19" fill="#bb6743"/><path d="M280 37q-10-8 0-14t0-13" stroke="#b1bba5" stroke-width="3" fill="none" stroke-linecap="round"/><g><circle cx="210" cy="94" r="5" fill="#805239"/><path d="M203 112v-9q7-9 14 0v9" fill="#e5b85e"/><circle cx="230" cy="101" r="4" fill="#d6a67e"/><path d="M224 118v-8q6-7 12 0v8" fill="#b6c8d2"/><circle cx="292" cy="100" r="5" fill="#b77753"/><path d="M285 119v-10q7-8 14 0v10" fill="#efe4c6"/></g><g transform="translate(162 88) scale(.08)"><path fill-rule="nonzero" fill="rgb(92.939758%, 10.978699%, 14.118958%)" fill-opacity="1" d="M 158.433594 324 C 158.433594 324 155.796875 259.550781 155.796875 253.160156 C 155.796875 246.71875 161.328125 244.539062 167.867188 245.902344 C 174.449219 247.351562 235.949219 259.550781 235.949219 259.550781 C 235.949219 259.550781 231.269531 246.535156 227.976562 236.875 C 224.730469 227.214844 228.996094 225.492188 231.269531 223.496094 L 300 165.214844 L 289.152344 160 C 282.574219 156.984375 283.59375 151.5625 284.613281 147.957031 L 296.570312 106.753906 C 296.570312 106.753906 267.929688 113.082031 261.207031 114.078125 C 255.878906 114.894531 254.023438 112.46875 252.355469 108.839844 L 243.78125 88.796875 L 207.863281 127.527344 C 201.097656 133.558594 194.5625 128.933594 195.765625 121.902344 C 196.925781 115.507812 213.792969 39.40625 213.792969 39.40625 C 213.792969 39.40625 195.164062 50.246094 189 53.871094 C 182.859375 57.476562 179.570312 56.863281 176.300781 51.0625 C 173.007812 45.230469 150 0 150 0 C 150 0 126.988281 45.230469 123.722656 51.0625 C 120.429688 56.863281 117.164062 57.476562 111 53.871094 C 104.835938 50.246094 86.203125 39.40625 86.203125 39.40625 C 86.203125 39.40625 103.121094 115.507812 104.234375 121.902344 C 105.460938 128.933594 98.902344 133.558594 92.136719 127.527344 L 56.21875 88.796875 L 47.621094 108.839844 C 45.976562 112.46875 44.144531 114.894531 38.792969 114.078125 C 32.09375 113.082031 2.273438 106.753906 2.273438 106.753906 L 15.386719 147.957031 C 16.40625 151.5625 17.425781 156.984375 10.871094 160 L 0 165.214844 L 68.730469 223.496094 C 71.003906 225.492188 75.3125 227.214844 72.023438 236.875 C 68.730469 246.535156 64.027344 259.550781 64.027344 259.550781 C 64.027344 259.550781 125.578125 247.351562 132.132812 245.902344 C 138.714844 244.539062 144.230469 246.71875 144.230469 253.160156 C 144.230469 259.550781 141.566406 324 141.566406 324 L 158.433594 324 "/></g></svg>`;
const oldRender = render,
  oldRenderCards = renderCards;
render = function () {
  ensureCommunity();
  document.body.dataset.theme = state.preferences.theme;
  if (view === "requests") {
    $("#crumb").textContent = "Community requests";
    $$("[data-view]").forEach((b) =>
      b.classList.toggle("active", b.dataset.view === view),
    );
    renderRequests();
  } else oldRender();
  addPreferences();
};
renderCards = function () {
  oldRenderCards();
  let grid = $("#cards");
  if (!grid) return;
  grid.className = "grid layout-" + state.preferences.layout;
  if (state.preferences.layout === "lanes" && grid.querySelector(".card")) {
    let cards = [...grid.querySelectorAll(".card")];
    grid.innerHTML = "";
    const stages = [
      "Idea",
      "Challenge",
      "Refine",
      "Vote",
      "Scope & build",
      "Review",
    ];
    // Keep proposals and any other server status visible in the stage view.
    for (const card of cards) {
      const stage = state.stages[card.querySelector("[data-open]").dataset.open] || "Idea";
      if (!stages.includes(stage)) stages.push(stage);
    }
    for (const stage of stages) {
      let column = document.createElement("section");
      column.className = "stage-column";
      let matching = cards.filter(
        (card) =>
          (state.stages[card.querySelector("[data-open]").dataset.open] ||
            "Idea") === stage,
      );
      column.innerHTML = `<h3>${stage} <span class="muted">${matching.length}</span></h3>`;
      matching.forEach((card) => column.append(card));
      if (!matching.length)
        column.insertAdjacentHTML(
          "beforeend",
          '<p class="small muted">Nothing here yet. Good things take a little kindling.</p>',
        );
      grid.append(column);
    }
  }
  if (!grid.closest(".feed-wrap")) {
    let wrap = document.createElement("div");
    wrap.className = "feed-wrap";
    grid.before(wrap);
    wrap.append(grid);
    wrap.insertAdjacentHTML("beforeend", railMarkup());
  }
};
function railMarkup() {
  let perks = [
    [
      "🍁",
      "First spark",
      state.custom.length
        ? "Earned: shared an idea"
        : "Share an idea to get started",
    ],
    [
      "🪵",
      "Good kindling",
      Object.values(state.comments).some((x) => x.length)
        ? "Earned: joined a discussion"
        : "Add a thoughtful comment",
    ],
    [
      "🛠",
      "Helping hands",
      Object.keys(state.contributions).length
        ? "Earned: offered to help"
        : "Volunteer for a project",
    ],
  ];
  return `<aside class="community-rail"><section class="panel"><span class="rail-label">r/oots & respect</span><h3 style="margin-top:12px">A tip of the toque to Reddit.</h3><p>We met in the comments. Now we’re giving those ideas somewhere to grow.</p><p>Same curiosity. A little more follow-through. Still allowed to lurk with a coffee.</p><div class="chatgpt-note"><strong>🤖 A note from ChatGPT</strong><p>“Let’s not let software slow us down.”</p><small>The ideas are yours. The buttons can catch up.</small></div><h3>Your view is yours.</h3><p>Old Reddit lists? A roomy feed? Cards? No need to win a layout debate. Choose what works for you.</p><p>Need another setting or a feature just for your workflow? Request it. We’ll explore it and improve this place together.</p></section><section class="panel"><span class="rail-label">WORKSHOP PERKS</span><h3 style="margin-top:12px">A little maple motivation.</h3>${perks.map(([e, n, d]) => `<div class="rail-perk"><span>${e}</span><div><strong>${n}</strong><small>${d}</small></div></div>`).join("")}<p style="font-size:16px;margin:10px 0 0">Playful local badges. No points, prizes or pecking order.</p></section><section class="panel"><h3>Notice something off?</h3><p>Feature idea? Tiny annoyance? Suspiciously un-Canadian button?</p><button class="btn secondary" data-rail-request>Request a feature →</button></section></aside>`;
}
function addPreferences() {
  document.body.dataset.density = state.preferences.density || "compact";
  document.body.style.setProperty(
    "--text-scale",
    (state.preferences.fontScale || 100) / 100,
  );
  let settings = $("#sidebar-settings");
  if (!settings) {
    settings = document.createElement("details");
    settings.id = "sidebar-settings";
    settings.className = "theme-settings";
    settings.open = false;
    $(".sidebar-bottom").prepend(settings);
  }
  const opened = settings.open;
  const appearanceSection = settings.dataset.section || 'menu';
  document.body.style.setProperty('--menu-font-size', Math.max(16, state.preferences.menuFontSize || 16) + 'px');
  document.body.style.setProperty('--menu-font-weight', state.preferences.menuFontWeight || '600');
  document.body.dataset.menuSpacing = state.preferences.menuSpacing || "compact";
  document.body.dataset.menuStyle = state.preferences.menuStyle || "soft";
  const group = (key, title, choices, fallback) => `<fieldset class="appearance-group"><legend>${title}</legend><div class="appearance-choices">${choices.map(([value,label]) => `<label><input type="radio" name="appearance-${key}" value="${value}" data-preference="${key}" ${String(state.preferences[key] ?? fallback) === String(value) ? "checked" : ""}><span>${label}</span></label>`).join("")}</div></fieldset>`;
  settings.innerHTML = `<summary>Appearance</summary><div class="settings-fields"><div class="appearance-panel-head"><strong>Appearance</strong><button type="button" class="appearance-done">Done</button></div><p class="appearance-help">Changes apply instantly. Only your view changes.</p><div class="appearance-sections" role="tablist" aria-label="Appearance sections"><button type="button" role="tab" data-appearance-section="content" aria-selected="${appearanceSection === 'content'}">Page content</button><button type="button" role="tab" data-appearance-section="menu" aria-selected="${appearanceSection === 'menu'}">Left menu</button></div><section class="appearance-section" ${appearanceSection !== 'content' ? 'hidden' : ''} data-appearance-pane="content" aria-label="Page content">${
    group("theme", "Colour theme", [["forest","MapleForge"],["maple","Cream"],["night","Night"],["plain","Plain"]], "forest") +
    group("layout", "Idea board layout", [["feed","Feed"],["cards","Cards"],["compact","List"],["lanes","Stages"]], "feed") +
    group("density", "Content spacing", [["compact","Tight"],["balanced","Balanced"],["roomy","Airy"]], "compact") +
    group("fontScale", "Text size", [[100,"100%"],[115,"115%"],[130,"130%"],[150,"150%"]], 100)
  }</section><section class="appearance-section" ${appearanceSection !== 'menu' ? 'hidden' : ''} data-appearance-pane="menu" aria-label="Left menu">${
    group("menuFontSize", "Menu text size", [[16,"16 px"],[18,"18 px"],[20,"20 px"],[22,"22 px"]], 16) +
    group("menuFontWeight", "Menu text weight", [["400","Regular"],["600","Semibold"],["700","Bold"]], "600") +
    group("menuSpacing", "Left menu spacing", [["compact","Compact"],["comfortable","Comfortable"],["spacious","Spacious"]], "compact") +
    group("menuStyle", "Left menu style", [["simple","Simple"],["soft","Soft blocks"],["outlined","Outlined"]], "soft")
  }</section></div>`;
  settings.querySelectorAll('[data-appearance-section]').forEach(button => button.onclick = () => {
    settings.dataset.section = button.dataset.appearanceSection;
    settings.querySelectorAll('[data-appearance-section]').forEach(b => b.setAttribute('aria-selected',String(b === button)));
    settings.querySelectorAll('[data-appearance-pane]').forEach(pane => pane.hidden = pane.dataset.appearancePane !== settings.dataset.section);
    window.positionAppearance?.();
  });
  settings.open = opened;
  settings.querySelector('.appearance-done').onclick = () => { settings.open = false; settings.querySelector('summary').focus(); };
  settings.querySelectorAll('[data-preference]').forEach(input => {
    input.onchange = () => {
      const key = input.dataset.preference;
      const value = input.value;
      state.preferences[key] = ['fontScale','menuFontSize'].includes(key) ? Number(value) : value;
      persist();
      render();
      window.positionAppearance?.();
      document.querySelector(`#sidebar-settings input[data-preference="${key}"][value="${value}"]`)?.focus({preventScroll:true});
    };
  });
  if (view === "ideas")
    $("#main").insertAdjacentHTML(
      "afterbegin",
      `<div class="community-banner"><div><h2>Born in the comments. Built by the community.</h2><p>Less doomscroll. More do-stuff. Respect to our Reddit roots.</p></div>${canadaArt}</div>`,
    );
  $$("[data-rail-request]").forEach(
    (b) => (b.onclick = () => openRequestForm()),
  );
}
const navRequest = document.createElement("button");
navRequest.dataset.view = "requests";
navRequest.setAttribute("aria-label", "Community requests");
navRequest.innerHTML = `<span data-icon="chat">${icon("chat")}</span><span>Community requests</span>`;
$(".nav").append(navRequest);
navRequest.onclick = () => {
  view = "requests";
  render();
  window.scrollTo(0, 0);
};
$(".sidebar-note").remove();
const requestButton = document.createElement("button");
requestButton.className = "sidebar-request";
requestButton.setAttribute("aria-label", "Request a feature");
requestButton.innerHTML = `<span data-icon="chat">${icon("chat")}</span><span>Request a feature</span>`;
$(".nav").append(requestButton);
requestButton.onclick = () => openRequestForm();
function createDialog(id, label) {
  let d = document.createElement("dialog");
  d.id = id;
  d.className = "dialog";
  d.setAttribute("aria-label", label);
  document.body.append(d);
  return d;
}
const requestFormDialog = createDialog(
  "request-form-dialog",
  "Submit a website request",
);
const requestDialog = createDialog(
  "request-dialog",
  "Community request details",
);
const shareDialog = createDialog("share-dialog", "Share request");
let requestQuery = "",
  requestFilter = "All statuses",
  requestSort = "newest",
  requestLayout = "list",
  openRequestId = null;
function openRequestForm() {
  ensureCommunity();
  const area =
    {
      ideas: "Idea board",
      contributions: "My contributions",
      process: "How we work",
      workspace: "Workspace notes",
      requests: "Community requests",
    }[view] || "General";
  requestFormDialog.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><span class="eyebrow">Make the workshop better</span><button class="close" id="close-request-form" aria-label="Close request form">×</button></div><h2>Add a feature request</h2><p class="muted small">A feature, a fix, a note, or a small thing that would make your day easier. Put it on the community board.</p><div class="request-context">You’re leaving feedback from: ${esc(area)}${currentId && $("#detail-dialog").open ? " · " + esc(find(currentId)?.title) : ""}</div><form id="request-form"><div class="form-grid"><label class="form-field">Type<select name="kind"><option>Feature</option><option>Change</option><option>Bug</option><option>Note</option></select></label><label class="form-field">Section<input name="area" value="${esc(area)}" required maxlength="100"></label><label class="form-field full">Who should this option affect?<select name="audience"><option>My personal view or workflow</option><option>Optional setting anyone can choose</option><option>Shared community behavior</option></select></label><label class="form-field full">Short title<input name="title" required maxlength="120" placeholder="What would you like to see?"></label><label class="form-field full">Tell us more<textarea name="body" required maxlength="4000" placeholder="What happens now? What would help? Who would benefit?" style="min-height:130px"></textarea></label></div><div class="form-actions"><span class="small muted">Posted as Demo member · local preview</span><button type="submit" class="btn orange">Post request →</button></div></form></div>`;
  $("#close-request-form").onclick = () => requestFormDialog.close();
  $("#request-form").onsubmit = (e) => {
    e.preventDefault();
    let f = Object.fromEntries(new FormData(e.target));
    for (let k in f) f[k] = f[k].trim();
    if (!f.title || !f.body || !f.area) return;
    let r = {
      ...f,
      id: "request-" + Date.now(),
      author: "Demo member",
      status: "Open",
      created: new Date().toISOString(),
      scope: "Local community request",
    };
    state.requests.unshift(r);
    persist();
    requestFormDialog.close();
    if ($("#detail-dialog").open) $("#detail-dialog").close();
    view = "requests";
    render();
    openRequest(r.id);
    toast("Request added to the community board on this device.");
  };
  requestFormDialog.showModal();
}
function requestCard(r) {
  return `<article class="request-item"><div class="request-meta"><span class="tag">${esc(r.kind)}</span><span>${esc(r.area)}</span><span class="request-status" data-status="${esc(r.status)}">${esc(r.status)}</span></div><h3><button class="title-btn" data-request-open="${esc(r.id)}">${esc(r.title)}</button></h3><p>${esc(r.body.slice(0, 230))}${r.body.length > 230 ? "…" : ""}</p><div class="request-meta"><strong>${memberName(r.author)}</strong><span>·</span><span>${(state.requestComments[r.id] || []).length} comments</span><span>·</span><span>${hasRequestVote(r.id) ? 1 : 0} supporters</span><button class="btn link" data-request-open="${esc(r.id)}" style="margin-left:auto;font-size:16px">Discuss →</button></div></article>`;
}
function renderRequests() {
  $("#main").innerHTML =
    `<div class="hero"><div><div class="eyebrow" style="color:var(--accent)">COMMUNITY REQUESTS</div><h1>Help shape this place.</h1><p>A shared board for features, fixes, changes and notes. Visible to everyone in the MapleForge community.</p></div></div><div class="board-head"><span class="small muted">${state.requests.length} requests · all voices welcome</span><button class="btn orange" id="new-request">＋ Add a request</button></div><div class="request-tools"><input type="search" id="request-search" aria-label="Search community requests" placeholder="Search requests, notes or people…" value="${esc(requestQuery)}"><select id="request-filter" aria-label="Filter requests by status">${["All statuses", ...requestStages].map((x) => `<option ${x === requestFilter ? "selected" : ""}>${x}</option>`).join("")}</select><select id="request-sort" aria-label="Sort requests">${[
      ["newest", "Newest"],
      ["supported", "Most supported"],
      ["comments", "Most discussed"],
      ["title", "A to Z"],
    ]
      .map(
        ([v, l]) =>
          `<option value="${v}" ${requestSort === v ? "selected" : ""}>${l}</option>`,
      )
      .join(
        "",
      )}</select><select id="request-layout" aria-label="Request board layout"><option value="list" ${requestLayout === "list" ? "selected" : ""}>Post feed</option><option value="board" ${requestLayout === "board" ? "selected" : ""}>Status board</option></select></div><div id="request-results"></div><p class="source-note" style="margin-top:20px">Shared board design for the private community. In this offline version, submissions and comments stay on this device. Seed requests reflect Mike’s requests, not invented community posts.</p>`;
  $("#new-request").onclick = openRequestForm;
  $("#request-search").oninput = (e) => {
    requestQuery = e.target.value;
    renderRequestResults();
  };
  $("#request-filter").onchange = (e) => {
    requestFilter = e.target.value;
    renderRequestResults();
  };
  $("#request-sort").onchange = (e) => {
    requestSort = e.target.value;
    renderRequestResults();
  };
  $("#request-layout").onchange = (e) => {
    requestLayout = e.target.value;
    renderRequestResults();
  };
  renderRequestResults();
}
function renderRequestResults() {
  let list = state.requests.filter(
    (r) =>
      (!groupFilter || r.group === groupFilter) &&
      (!tagFilter || r.tags.includes(tagFilter)) &&
      (!followFilter || state.requestFollows.includes(r.id)) &&
      (requestFilter === "All statuses" || requestFilter === r.status) &&
      `${r.title} ${r.body} ${r.author} ${r.area}`
        .toLowerCase()
        .includes(requestQuery.toLowerCase()),
  );
  list.sort((a, b) =>
    requestSort === "title"
      ? a.title.localeCompare(b.title)
      : requestSort === "supported"
        ? Number(hasRequestVote(b.id)) - Number(hasRequestVote(a.id))
        : requestSort === "comments"
          ? (state.requestComments[b.id] || []).length -
            (state.requestComments[a.id] || []).length
          : b.created.localeCompare(a.created),
  );
  $("#request-results").innerHTML =
    requestLayout === "list"
      ? `<div class="request-list">${list.map(requestCard).join("") || '<div class="empty">No matching requests. Try another filter.</div>'}</div>`
      : `<div class="request-columns">${requestStages
          .filter(
            (s) => requestFilter === "All statuses" || s === requestFilter,
          )
          .map(
            (s) =>
              `<section><h3>${s} · ${list.filter((r) => r.status === s).length}</h3>${
                list
                  .filter((r) => r.status === s)
                  .map(requestCard)
                  .join("") || '<p class="small muted">Nothing here yet.</p>'
              }</section>`,
          )
          .join("")}</div>`;
  $$("[data-request-open]").forEach(
    (b) => (b.onclick = () => openRequest(b.dataset.requestOpen)),
  );
}
function openRequest(id) {
  openRequestId = id;
  renderRequestDetail();
  requestDialog.showModal();
  history.replaceState(null, "", "#" + encodeURIComponent(id));
}
function renderRequestDetail() {
  let r = state.requests.find((x) => x.id === openRequestId);
  if (!r) return;
  let comments = state.requestComments[r.id] || [];
  requestDialog.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><span class="tag">${esc(r.kind)} · ${esc(r.area)}</span><button class="close" id="close-request" aria-label="Close request">×</button></div><h2 class="detail-title">${esc(r.title)}</h2><div class="request-meta"><strong>${memberName(r.author)}</strong><span class="request-status" data-status="${esc(r.status)}">${esc(r.status)}</span></div><p class="request-detail-text" style="margin-top:20px">${esc(r.body)}</p><p class="source-note">${esc(r.scope || "")} · ${esc(r.audience || "Optional setting or community feature")}</p><div class="request-action"><button class="btn secondary" id="support-request">↑ ${state.requestVotes.includes(r.id) ? "Supported · 1" : "Support · 0"}</button><button class="btn secondary" id="share-request">Share request ↗</button><label class="small muted">Status <select id="request-status" style="padding:8px;background:var(--white);color:var(--ink);border:1px solid var(--line);border-radius:6px">${requestStages.map((s) => `<option ${s === r.status ? "selected" : ""}>${s}</option>`).join("")}</select></label></div><p class="source-note">Status changes are a prototype control. The live board will reserve them for maintainers.</p><div class="thread"><h3>Community discussion · ${comments.length}</h3>${comments.map((c) => `<div class="request-comment"><strong class="small">${memberName(c.author)}</strong><p>${esc(c.text)}</p></div>`).join("")}<form id="request-comment-form" class="comment-form"><textarea name="text" required maxlength="2000" placeholder="Add context, a suggestion or a useful question…" aria-label="Request comment"></textarea><button class="btn" type="submit">Post comment</button></form></div></div>`;
  $("#close-request").onclick = () => requestDialog.close();
  $("#support-request").onclick = () => {
    state.requestVotes = state.requestVotes.includes(r.id)
      ? state.requestVotes.filter((x) => x !== r.id)
      : [...state.requestVotes, r.id];
    persist();
    renderRequestDetail();
    if (view === "requests") renderRequestResults();
  };
  $("#request-status").onchange = (e) => {
    r.status = e.target.value;
    persist();
    renderRequestDetail();
    if (view === "requests") renderRequestResults();
    toast("Request status updated locally.");
  };
  $("#request-comment-form").onsubmit = (e) => {
    e.preventDefault();
    let text = new FormData(e.target).get("text").trim();
    if (!text) return;
    state.requestComments[r.id] = [
      ...comments,
      { author: "Demo member", text, date: new Date().toISOString() },
    ];
    persist();
    renderRequestDetail();
    if (view === "requests") renderRequestResults();
    toast("Comment added.");
  };
  $("#share-request").onclick = () => shareRequest(r);
}
function shareRequest(r) {
  let url = location.href.split("#")[0] + "#" + encodeURIComponent(r.id);
  let text = `MapleForge request: ${r.title}\nType: ${r.kind}\nStatus: ${r.status}\nBy: ${r.author}\n\n${r.body}\n\nLocal preview link: ${url}\nThis offline link opens the request only where the same request data exists. Paste this summary to share the context.`;
  shareDialog.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><h2 style="font-size:25px;margin:0">Pass it around.</h2><button class="close" id="close-share" aria-label="Close share">×</button></div><p class="small muted">Copy a summary for Discord. New local requests are not uploaded anywhere; the link needs the same data on the other device.</p><textarea readonly class="share-text" aria-label="Shareable request summary">${esc(text)}</textarea><button class="btn" id="copy-request" style="margin-top:12px">Copy summary & link</button></div>`;
  $("#close-share").onclick = () => shareDialog.close();
  $("#copy-request").onclick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast("Request summary copied.");
    } catch (e) {
      let t = shareDialog.querySelector("textarea");
      t.focus();
      t.select();
      toast("Select and copy the summary with your keyboard.");
    }
  };
  shareDialog.showModal();
}
requestDialog.addEventListener("close", () => {
  history.replaceState(null, "", location.href.split("#")[0]);
  if (view === "requests") renderRequestResults();
});
const baseEnter = enter;
enter = function () {
  baseEnter();
  let id = decodeURIComponent(location.hash.slice(1));
  if (id && state.requests.some((r) => r.id === id)) {
    view = "requests";
    render();
    openRequest(id);
  }
};
$("#demo-entry").onclick = enter;

const baseDetail = renderDetail;
renderDetail = function () {
  baseDetail();
  let b = document.createElement("button");
  b.className = "btn link";
  b.style.fontSize = "12px";
  b.textContent = "Request a feature for this page";
  b.onclick = () => openRequestForm();
  $("#detail-content").append(b);
};

function showPersonalNote() {
  const d = createDialog("personal-note", "Personalize your experience");
  d.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><span class="eyebrow">No layout wars required</span><button class="close" aria-label="Close personalization note">×</button></div><h2>Your workshop. Your view.</h2><p>Old-school lists, a roomy feed, cards, or a project board: choose the way you like to browse. Your theme, layout and sort order are personal preferences.</p><div class="personal-callout"><p><strong>One community doesn’t need one identical screen.</strong></p><p>Need a different listing, an accessibility option, a shortcut, or a feature for your own workflow? Tell us. We can develop optional settings together without changing everyone else’s view.</p></div><p class="muted small">The options here are a starting point. Requests are discussed on the community board, where you can follow their progress and help shape the result. In this prototype your settings are saved on this device; account-level preferences come with the live portal.</p><button class="btn orange" id="request-personal-option">Request a personal option →</button></div>`;
  d.querySelector(".close").onclick = () => d.close();
  d.addEventListener("close", () => d.remove());
  d.querySelector("#request-personal-option").onclick = () => {
    d.close();
    openRequestForm();
  };
  d.showModal();
}
// Joining an idea is separate from taking on delivery work.
const originalEnsure = ensureCommunity;
ensureCommunity = function () {
  originalEnsure();
  state.ideaMembers = state.ideaMembers || {};
};
ensureCommunity();
const membersFor = (id) => state.ideaMembers[id] || [];
function joinIdea(id) {
  if (
    membersFor(id).some(
      (m) => m.id === (window.MF?.account?.id || "demo-member"),
    )
  )
    return;
  state.ideaMembers[id] = [
    ...membersFor(id),
    {
      id: "demo-member",
      name: "Demo member",
      role: "Joined the discussion",
      capacity: "",
    },
  ];
  if (!state.contributions[id])
    state.contributions[id] = {
      role: "Joined the discussion",
      capacity: "Availability not specified",
    };
  persist();
  render();
  if ($("#detail-dialog").open) renderDetail();
  toast("You joined this idea. Your name is now on its board.");
}
function leaveIdea(id) {
  state.ideaMembers[id] = membersFor(id).filter((m) => m.id !== "demo-member");
  delete state.contributions[id];
  persist();
  render();
  if ($("#detail-dialog").open) renderDetail();
  toast("You left this idea board.");
}
const cardsBeforeMembers = renderCards;
renderCards = function () {
  cardsBeforeMembers();
  $$("#cards .card").forEach((card) => {
    let id = card.querySelector("[data-open]").dataset.open;
    let members = membersFor(id);
    let mine = members.some(
      (m) => m.id === (window.MF?.account?.id || "demo-member"),
    );
    let row = document.createElement("div");
    row.className = "idea-members-row";
    row.innerHTML = `<div class="member-preview">${members.length ? members.map((m) => `<span class="avatar" title="${esc(m.name)}">${esc(initials(m.name))}</span>`).join("") : '<span class="small muted">Be the first to join</span>'}${members.length ? `<span class="small">${members.map((m) => memberName(m.name)).join(", ")}</span>` : ""}</div><button class="join-idea ${mine ? "joined" : ""}" aria-label="${mine ? "View members of" : "Join idea"} ${esc(find(id).title)}">${mine ? "Joined ✓" : "＋ Join idea"}</button>`;
    card.querySelector(".card-footer").before(row);
    row.querySelector("button").onclick = () =>
      mine ? openIdea(id) : joinIdea(id);
  });
};
const detailBeforeMembers = renderDetail;
renderDetail = function () {
  detailBeforeMembers();
  const id = currentId,
    members = membersFor(id),
    mine = members.some(
      (m) => m.id === (window.MF?.account?.id || "demo-member"),
    );
  let block = document.createElement("section");
  block.className = "idea-member-panel";
  block.innerHTML = `<div class="stack" style="justify-content:space-between;flex-wrap:wrap"><h3 style="margin:0">Around this idea · ${members.length}</h3><button class="btn secondary" id="join-detail">${mine ? "Leave this idea" : "＋ Join this idea"}</button></div><p class="small muted" style="margin-top:9px">Ask questions or comment below without joining. Join this idea only if you want to be listed as interested in taking part.</p>${members.length ? members.map((m) => `<div class="member-line"><span class="avatar">${esc(initials(m.name))}</span><div><strong>${memberName(m.name)}</strong><small>${esc(m.role || "Joined the discussion")}${m.capacity ? " · " + esc(m.capacity) : ""}</small></div></div>`).join("") : '<p class="small muted">No members have joined this idea yet.</p>'}<p class="source-note">Membership and contributions use verified Discord accounts.</p>`;
  $("#detail-content .detail-meta").after(block);
  $("#join-detail").onclick = () => (mine ? leaveIdea(id) : joinIdea(id));
  let form = $("#contribute-form");
  let previous = form.onsubmit;
  form.onsubmit = (e) => {
    let values = new FormData(form);
    previous(e);
    if (!state.contributions[id]) return;
    let member = {
      id: "demo-member",
      name: "Demo member",
      role: values.get("role"),
      capacity: values.get("capacity").trim(),
    };
    state.ideaMembers[id] = [
      ...membersFor(id).filter((m) => m.id !== "demo-member"),
      member,
    ];
    persist();
    renderDetail();
    if (view === "ideas") renderCards();
  };
  let withdraw = $("#withdraw");
  if (withdraw) {
    let previousWithdraw = withdraw.onclick;
    withdraw.onclick = () => {
      previousWithdraw();
      let m = membersFor(id).find(
        (m) => m.id === (window.MF?.account?.id || "demo-member"),
      );
      if (m) {
        m.role = "Joined the discussion";
        m.capacity = "";
        state.contributions[id] = {
          role: "Joined the discussion",
          capacity: "Availability not specified",
        };
        persist();
        renderDetail();
      }
    };
  }
};

// Stable member colours, with separate accessible palettes for light and dark surfaces.
function memberName(name) {
  const light = [
      "#8b2e16",
      "#235c91",
      "#68419a",
      "#147063",
      "#a02459",
      "#655215",
      "#3b6395",
      "#715039",
    ],
    dark = [
      "#ffb39c",
      "#a9ceff",
      "#d3b5ff",
      "#8fddd0",
      "#ffadd1",
      "#e2cf83",
      "#a7d2f5",
      "#e8bea1",
    ];
  let hash = 0;
  for (const c of String(name).trim().toLowerCase())
    hash = (Math.imul(hash, 31) + c.codePointAt(0)) >>> 0;
  let i = hash % light.length;
  return `<span class="member-name" style="--member-light:${light[i]};--member-dark:${dark[i]}">${esc(name)}</span>`;
}
