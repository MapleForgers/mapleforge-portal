// Request organization and activity, local prototype data only.
const beforeFeatureEnsure = ensureCommunity;
ensureCommunity = function () {
  beforeFeatureEnsure();
  state.requestFollows = state.requestFollows || [];
  state.featureReleases = state.featureReleases || [];
  state.requests.forEach((r) => {
    r.tags = r.tags || [];
    r.group = r.group || "";
    r.history = r.history || [];
  });
};
ensureCommunity();
function canonicalRequest(id) {
  let seen = new Set();
  let r = state.requests.find((x) => x.id === id);
  while (r && r.duplicateOf && !seen.has(r.id)) {
    seen.add(r.id);
    r = state.requests.find((x) => x.id === r.duplicateOf);
  }
  return r;
}
function requestFamily(id) {
  let root = canonicalRequest(id);
  return root
    ? state.requests.filter((x) => canonicalRequest(x.id)?.id === root.id)
    : [];
}
function hasRequestVote(id) {
  return requestFamily(id).some((r) => state.requestVotes.includes(r.id));
}
function featureEvent(r, text) {
  r.history.unshift({ text, date: new Date().toISOString() });
}
let groupFilter = "",
  tagFilter = "",
  followFilter = false;
const beforeFeatureBoard = renderRequests;
renderRequests = function () {
  ensureCommunity();
  beforeFeatureBoard();
  let panel = document.createElement("section");
  panel.className = "panel";
  panel.style.marginBottom = "18px";
  panel.innerHTML = `<div class="request-tools"><label>Feature group <select id="feature-group-filter"><option value="">All groups</option>${[
    ...new Set(state.requests.map((r) => r.group).filter(Boolean)),
  ]
    .sort()
    .map(
      (g) =>
        `<option ${g === groupFilter ? "selected" : ""}>${esc(g)}</option>`,
    )
    .join(
      "",
    )}</select></label><label>Tag <select id="feature-tag-filter"><option value="">All tags</option>${[
    ...new Set(state.requests.flatMap((r) => r.tags)),
  ]
    .sort()
    .map(
      (t) => `<option ${t === tagFilter ? "selected" : ""}>${esc(t)}</option>`,
    )
    .join(
      "",
    )}</select></label><label><input type="checkbox" id="followed-only" ${followFilter ? "checked" : ""}> Following only</label><button class="btn secondary" id="release-log">What’s new · ${state.featureReleases.length}</button></div><p class="small muted">Upvote requests, follow their progress, and organize related features. Duplicate requests keep their original discussion and point to one main feature.</p>`;
  $("#request-results").before(panel);
  $("#feature-group-filter").onchange = (e) => {
    groupFilter = e.target.value;
    renderRequestResults();
  };
  $("#feature-tag-filter").onchange = (e) => {
    tagFilter = e.target.value;
    renderRequestResults();
  };
  $("#followed-only").onchange = (e) => {
    followFilter = e.target.checked;
    renderRequestResults();
  };
  $("#release-log").onclick = showReleases;
  renderRequestResults();
};
const beforeFeatureCard = requestCard;
requestCard = function (r) {
  let html = beforeFeatureCard(r);
  let root = canonicalRequest(r.id);
  let extra = `<div class="request-meta" style="margin-top:12px">${r.group ? `<span class="tag">Group: ${esc(r.group)}</span>` : ""}${r.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join("")}${r.duplicateOf ? `<button class="btn link" data-request-open="${esc(root.id)}">Duplicate of: ${esc(root.title)}</button>` : ""}<button class="btn secondary" data-feature-vote="${esc(r.id)}">↑ ${hasRequestVote(r.id) ? "Upvoted · 1" : "Upvote · 0"}</button><button class="btn secondary" data-feature-follow="${esc(r.id)}">${state.requestFollows.includes(r.id) ? "Following ✓" : "Follow"}</button></div>`;
  return html.replace("</article>", extra + "</article>");
};
const beforeFeatureResults = renderRequestResults;
renderRequestResults = function () {
  beforeFeatureResults();
  $$("[data-feature-vote]").forEach(
    (b) => (b.onclick = () => toggleFeatureVote(b.dataset.featureVote)),
  );
  $$("[data-feature-follow]").forEach(
    (b) => (b.onclick = () => toggleFeatureFollow(b.dataset.featureFollow)),
  );
};
function toggleFeatureVote(id) {
  let family = requestFamily(id).map((r) => r.id),
    root = canonicalRequest(id);
  let was = hasRequestVote(id);
  state.requestVotes = state.requestVotes.filter((x) => !family.includes(x));
  if (!was) state.requestVotes.push(root.id);
  persist();
  if (view === "requests") renderRequestResults();
  if (requestDialog.open) renderRequestDetail();
}
function toggleFeatureFollow(id) {
  state.requestFollows = state.requestFollows.includes(id)
    ? state.requestFollows.filter((x) => x !== id)
    : [...state.requestFollows, id];
  persist();
  if (view === "requests") renderRequestResults();
  if (requestDialog.open) renderRequestDetail();
}
const beforeFeatureDetail = renderRequestDetail;
renderRequestDetail = function () {
  ensureCommunity();
  beforeFeatureDetail();
  let r = state.requests.find((x) => x.id === openRequestId);
  if (!r) return;
  $("#support-request").textContent =
    "↑ " + (hasRequestVote(r.id) ? "Upvoted · 1" : "Upvote · 0");
  $("#support-request").onclick = () => toggleFeatureVote(r.id);
  let button = document.createElement("button");
  button.className = "btn secondary";
  button.textContent = state.requestFollows.includes(r.id)
    ? "Following ✓"
    : "Follow feature";
  button.onclick = () => toggleFeatureFollow(r.id);
  $(".request-action").append(button);
  let box = document.createElement("section");
  box.className = "panel";
  box.style.marginTop = "20px";
  let candidates = state.requests.filter(
    (x) =>
      x.id !== r.id &&
      !requestFamily(r.id).some((y) => y.id === x.id) &&
      !x.duplicateOf,
  );
  box.innerHTML = `<h3>Organize this feature</h3><p class="small muted">Maintainer controls. Group related work without merging it, or link a duplicate to one main request. Comments and attribution stay on their original requests. Upvotes count once per member across duplicates.</p><form id="feature-organize" class="form-grid"><label class="form-field">Feature group<input name="group" maxlength="80" value="${esc(r.group)}" placeholder="For example: Accessibility"></label><label class="form-field">Tags, separated by commas<input name="tags" maxlength="240" value="${esc(r.tags.join(", "))}" placeholder="mobile, navigation, personal settings"></label><label class="form-field full">Same feature as<select name="duplicate"><option value="">Independent request</option>${r.duplicateOf ? `<option value="${esc(r.duplicateOf)}" selected>${esc(canonicalRequest(r.id).title)}</option>` : ""}${candidates.map((x) => `<option value="${esc(x.id)}">${esc(x.title)}</option>`).join("")}</select></label><button class="btn" type="submit">Save organization</button></form><h3 style="margin-top:22px">Related duplicate requests</h3>${
    requestFamily(r.id)
      .filter((x) => x.id !== r.id)
      .map(
        (x) =>
          `<p><button class="btn link" data-related-request="${esc(x.id)}">${esc(x.title)} · ${(state.requestComments[x.id] || []).length} comments</button></p>`,
      )
      .join("") || '<p class="small muted">No duplicates linked.</p>'
  }<h3 style="margin-top:22px">Activity</h3>${r.history.map((h) => `<p class="small"><time>${portalTimeHtml(h.date)}</time><br>${esc(h.text)}</p>`).join("") || '<p class="small muted">Updates will appear here.</p>'}<p class="source-note">Following adds this request to your Following filter. Updates are recorded here; this offline demo does not send notifications.</p><button class="btn secondary" id="publish-feature">Record an activated feature</button>`;
  requestDialog.querySelector(".thread").before(box);
  $("#feature-organize").onsubmit = (e) => {
    e.preventDefault();
    let f = new FormData(e.target),
      target = f.get("duplicate");
    r.group = f.get("group").trim();
    r.tags = [
      ...new Set(
        f
          .get("tags")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    ].slice(0, 12);
    if (target) {
      let root = canonicalRequest(target);
      if (!root || root.id === r.id) return;
      r.duplicateOf = root.id;
    } else delete r.duplicateOf;
    let family = requestFamily(r.id).map((x) => x.id);
    if (family.some((id) => state.requestVotes.includes(id))) {
      state.requestVotes = state.requestVotes.filter(
        (id) => !family.includes(id),
      );
      state.requestVotes.push(canonicalRequest(r.id).id);
    }
    featureEvent(
      r,
      "Organization updated by Demo member" +
        (r.duplicateOf ? ". Linked as a duplicate." : "."),
    );
    persist();
    renderRequestDetail();
    if (view === "requests") render();
  };
  $$("[data-related-request]").forEach(
    (b) => (b.onclick = () => openRequest(b.dataset.relatedRequest)),
  );
  $("#request-status").onchange = (e) => {
    let previous = r.status;
    r.status = e.target.value;
    featureEvent(
      r,
      `Status changed from ${previous} to ${r.status} by Demo member.`,
    );
    persist();
    renderRequestDetail();
    if (view === "requests") renderRequestResults();
  };
  $("#publish-feature").onclick = () => activationForm(r);
};
const releaseDialog = createDialog("feature-releases", "Activated features");
function showReleases() {
  releaseDialog.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><span class="eyebrow">WHAT’S NEW</span><button class="close" aria-label="Close activated features">×</button></div><h2>Fresh from the forge.</h2><p class="muted">Activated features and what changed, in newest-first order.</p><p class="source-note">Shared release notes. Recording a note does not deploy software.</p>${state.featureReleases.map((x) => `<article class="panel" style="margin-top:14px"><span class="tag">${esc(x.version || "Prototype update")}</span><h3>${esc(x.title)}</h3><p class="request-detail-text">${esc(x.notes)}</p><small>${portalTimeHtml(x.date)} · ${memberName(x.author)}</small></article>`).join("") || '<div class="empty">No activations recorded yet. Completed requests can be recorded here when their feature is available.</div>'}</div>`;
  releaseDialog.querySelector(".close").onclick = () => releaseDialog.close();
  releaseDialog.showModal();
}
function activationForm(r) {
  let d = createDialog("activation-form", "Record feature activation");
  d.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><h2>Record an activation</h2><button class="close" aria-label="Close activation form">×</button></div><p>${esc(r.title)}</p><form class="form-grid"><label class="form-field full">Version or release label<input name="version" maxlength="80" placeholder="Offline preview v2"></label><label class="form-field full">What is available now?<textarea name="notes" required maxlength="2000"></textarea></label><p class="source-note">Records a shared release note and marks the request Complete. Maintainers only.</p><button class="btn" type="submit">Record activation</button></form></div>`;
  d.querySelector(".close").onclick = () => d.close();
  d.onclose = () => d.remove();
  d.querySelector("form").onsubmit = (e) => {
    e.preventDefault();
    let f = new FormData(e.target),
      notes = f.get("notes").trim();
    if (!notes) return;
    state.featureReleases.unshift({
      id: "release-" + Date.now(),
      requestId: r.id,
      title: r.title,
      notes,
      version: f.get("version").trim(),
      date: new Date().toISOString(),
      author: "Demo member",
    });
    r.status = "Complete";
    featureEvent(r, "Activation recorded by Demo member: " + notes);
    persist();
    d.close();
    renderRequestDetail();
    if (view === "requests") render();
    toast("Activation added to What’s new.");
  };
  d.showModal();
}
