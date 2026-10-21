// Workspace tabs for sections, forms, details, and editing screens.
requestButton.remove();
$(".profile").remove();
navRequest.setAttribute("aria-label", "Features");
navRequest.querySelector("span:last-child").textContent = "Features";
const sectionLabels = {
  tasks: "Tasks",
  people: "People & skills",
  activity: "Activity",
  ideas: "Idea board",
  requests: "Features",
  governance: "Community governance",
  contributions: "My contributions",
  process: "How we work",
  workspace: "Workspace notes",
};
let openSections = ["ideas"],
  lastSection = "ideas",
  activeSection = "ideas";
const sectionScroll = {},
  paneTabs = {},
  paneParents = {},
  paneRecords = {},
  paneTitles = {};
const sectionStrip = document.createElement("nav");
sectionStrip.className = "section-tabs";
sectionStrip.setAttribute("aria-label", "Open sections");
$(".topbar").after(sectionStrip);
$(".topbar").replaceWith(
  Object.assign(document.createElement("span"), { id: "crumb", hidden: true }),
);
const paneHost = document.createElement("div");
paneHost.className = "workspace-pane-host";
$("#main").after(paneHost);
function tabLabel(id) {
  return (
    paneTitles[id] ||
    paneTabs[id]?.querySelector("h2")?.textContent ||
    paneTabs[id]?.getAttribute("aria-label") ||
    sectionLabels[id] ||
    "Details"
  );
}
function showActivePane() {
  let pane = paneTabs[activeSection];
  $("#main").hidden = !!pane;
  new Set(Object.values(paneTabs)).forEach((d) => {
    d.hidden = d !== pane;
    d.open = d === pane;
  });
  paneHost.hidden = !pane;
}
function restorePane(id) {
  let r = paneRecords[id];
  if (!r) return;
  if (r.kind === "task") openTask(r.id);
  if (r.kind === "person") openPerson(r.id);
  if (r.kind === "idea") {
    currentId = r.id;
    renderDetail();
  }
  if (r.kind === "request") {
    openRequestId = r.id;
    renderRequestDetail();
  }
  if (r.kind === "governance") {
    governanceDialog.open = true;
    openGovernance(r.id);
  }
}
function switchSection(id) {
  sectionScroll[activeSection] = window.scrollY;
  activeSection = id;
  if (paneTabs[id]) {
    restorePane(id);
    showActivePane();
    drawSectionTabs();
    window.scrollTo(0, sectionScroll[id] || 0);
  } else {
    view = id;
    render();
  }
}
function closeWorkspaceTab(id) {
  if (paneTabs[id]) {
    if (id !== activeSection) {
      delete paneTabs[id];
      delete paneRecords[id];
      delete paneTitles[id];
      delete paneParents[id];
      openSections = openSections.filter((x) => x !== id);
      drawSectionTabs();
      return;
    }
    paneTabs[id].close();
    return;
  }
  let index = openSections.indexOf(id);
  openSections = openSections.filter((x) => x !== id);
  if (activeSection === id)
    switchSection(openSections[Math.max(0, index - 1)] || "ideas");
  else drawSectionTabs();
}
function drawSectionTabs() {
  sectionStrip.innerHTML = `<div role="tablist" aria-label="Workspace tabs">${openSections.map((id) => `<div class="section-tab ${activeSection === id ? "selected" : ""}"><button role="tab" aria-selected="${activeSection === id}" aria-controls="${paneTabs[id] ? paneTabs[id].id : "main"}" data-section-tab="${id}" title="${esc(tabLabel(id))}">${esc(tabLabel(id))}</button>${openSections.length > 1 ? `<button class="tab-close" aria-label="Close ${esc(tabLabel(id))} tab" data-close-section="${id}">×</button>` : ""}</div>`).join("")}</div>`;
  sectionStrip.querySelectorAll("[data-section-tab]").forEach((b) => {
    b.onclick = () => switchSection(b.dataset.sectionTab);
    b.onkeydown = (e) => {
      let index = openSections.indexOf(b.dataset.sectionTab),
        next;
      if (e.key === "ArrowRight")
        next = openSections[(index + 1) % openSections.length];
      if (e.key === "ArrowLeft")
        next =
          openSections[(index + openSections.length - 1) % openSections.length];
      if (e.key === "Home") next = openSections[0];
      if (e.key === "End") next = openSections.at(-1);
      if (next) {
        e.preventDefault();
        switchSection(next);
        sectionStrip.querySelector(`[data-section-tab="${next}"]`).focus();
      }
    };
  });
  sectionStrip
    .querySelectorAll("[data-close-section]")
    .forEach(
      (b) => (b.onclick = () => closeWorkspaceTab(b.dataset.closeSection)),
    );
}
const renderBeforeSectionTabs = render;
render = function () {
  let changed = view !== lastSection;
  if (changed) {
    sectionScroll[lastSection] = window.scrollY;
    activeSection = view;
  }
  if (!openSections.includes(view)) openSections.push(view);
  renderBeforeSectionTabs();
  $("#crumb").textContent = sectionLabels[view];
  drawSectionTabs();
  showActivePane();
  if (changed) window.scrollTo(0, sectionScroll[view] || 0);
  lastSection = view;
};
$$(".nav [data-view]").forEach(
  (b) => (b.onclick = () => switchSection(b.dataset.view)),
);
HTMLDialogElement.prototype.showModal = function () {
  let record =
    this.id === "task-detail"
      ? { kind: "task", id: this.dataset.recordId }
      : this.id === "person-detail"
        ? { kind: "person", id: this.dataset.recordId }
        : this.id === "detail-dialog"
          ? { kind: "idea", id: currentId }
          : this.id === "request-dialog"
            ? { kind: "request", id: openRequestId }
            : this.id === "governance-detail"
              ? { kind: "governance", id: this.dataset.recordId }
              : null;
  let id = "pane-" + this.id + (record ? "-" + record.id : "");
  if (record) paneRecords[id] = record;
  paneTitles[id] =
    this.querySelector("h2")?.textContent || this.getAttribute("aria-label");
  sectionScroll[activeSection] = window.scrollY;
  if (!paneTabs[id]) paneParents[id] = activeSection;
  paneTabs[id] = this;
  this.classList.add("workspace-page");
  this.setAttribute("role", "region");
  this.removeAttribute("aria-modal");
  paneHost.append(this);
  this.open = true;
  if (!openSections.includes(id)) openSections.push(id);
  activeSection = id;
  showActivePane();
  drawSectionTabs();
  window.scrollTo(0, 0);
};
HTMLDialogElement.prototype.close = function () {
  let id =
    paneTabs[activeSection] === this
      ? activeSection
      : Object.keys(paneTabs).find((k) => paneTabs[k] === this);
  this.open = false;
  this.hidden = true;
  delete paneTabs[id];
  delete paneRecords[id];
  delete paneTitles[id];
  openSections = openSections.filter((x) => x !== id);
  if (activeSection === id) {
    let parent = paneParents[id];
    activeSection = openSections.includes(parent)
      ? parent
      : openSections.at(-1) || "ideas";
    if (!paneTabs[activeSection]) view = activeSection;
  }
  delete paneParents[id];
  this.dispatchEvent(new Event("close"));
  if (!openSections.length) openSections = ["ideas"];
  if (paneTabs[activeSection]) {
    restorePane(activeSection);
    showActivePane();
    drawSectionTabs();
  } else render();
  window.scrollTo(0, sectionScroll[activeSection] || 0);
};
const cardBeforeFeatureList = requestCard;
requestCard = function (r) {
  if (requestLayout !== "list") return cardBeforeFeatureList(r);
  let root = canonicalRequest(r.id);
  return `<article class="request-row"><button class="feature-vote ${hasRequestVote(r.id) ? "selected" : ""}" aria-label="${hasRequestVote(r.id) ? "Remove upvote from" : "Upvote"} ${esc(r.title)}" data-feature-vote="${esc(r.id)}">↑ <strong>${hasRequestVote(r.id) ? 1 : 0}</strong></button><div class="feature-row-main"><h3><button class="title-btn" data-request-open="${esc(r.id)}">${esc(r.title)}</button></h3><div class="request-meta"><span>${esc(r.kind)}</span><strong>${memberName(r.author)}</strong><span>${esc(r.area)}</span><button class="btn link" data-request-open="${esc(r.id)}">${(state.requestComments[r.id] || []).length} comments</button>${r.group ? `<span class="tag">${esc(r.group)}</span>` : ""}${r.tags.map((t) => `<span>#${esc(t)}</span>`).join("")}${r.duplicateOf ? `<button class="btn link" data-request-open="${esc(root.id)}">Duplicate of ${esc(root.title)}</button>` : ""}</div></div><span class="request-status" data-status="${esc(r.status)}">${esc(r.status)}</span><button class="btn secondary feature-follow" data-feature-follow="${esc(r.id)}">${state.requestFollows.includes(r.id) ? "Following ✓" : "Follow"}</button></article>`;
};
const boardBeforeFeatureList = renderRequests;
renderRequests = function () {
  boardBeforeFeatureList();
  $("#main h1").textContent = "Features";
  $("#main .eyebrow").textContent = "COMMUNITY ROADMAP";
  $("#main .hero p").textContent =
    "All feature requests, progress, and discussions in one place.";
  $("#new-request").textContent = "＋ Add a feature request";
  $('#request-layout option[value="list"]').textContent = "List";
  $("#request-layout").setAttribute("aria-label", "Feature request layout");
};
// Technical preview notes stay out of member navigation.
document.querySelector('.nav [data-view="workspace"]')?.remove();
// Keep the primary community destinations first in DOM and keyboard order.
$(".nav").prepend(
  ...["activity", "ideas", "tasks"].map((id) =>
    document.querySelector(`.nav [data-view="${id}"]`),
  ),
);
// Shared MapleForge branding for the portal.
$$(".brand .mark").forEach((mark) => {
  mark.innerHTML =
    '<img src="./mapleforge-icon.png" alt="MapleForge maple leaf and anvil" width="36" height="36">';
});
// Hosted preview has already passed the shared-word gate.
if (location.pathname.startsWith("/portal1/")) enter();
