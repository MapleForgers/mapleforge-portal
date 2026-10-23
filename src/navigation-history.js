// Session navigation history for sections, details and editor tabs.
// Retired proposal links return to the existing framework page.
if (new URL(location.href).searchParams.get("section") === "debate") {
  const route = new URL(location.href);
  route.searchParams.set("section", "framework");
  history.replaceState(null, "", route);
}
const requestedPortalSection = new URL(location.href).searchParams.get(
  "section",
);
const portalHistorySession =
  Date.now().toString(36) + Math.random().toString(36).slice(2);
const portalTrail = [];
let portalTrailIndex = -1,
  portalTravel = false;
function rememberPortalPlace() {
  const id = activeSection;
  const entry = {
    id,
    pane: paneTabs[id],
    record: paneRecords[id],
    title: paneTitles[id],
    parent: paneParents[id],
    section: view,
  };
  if (portalTravel) return;
  if (portalTrail[portalTrailIndex]?.id === id) {
    portalTrail[portalTrailIndex] = entry;
    return;
  }
  portalTrail.splice(portalTrailIndex + 1);
  portalTrail.push(entry);
  portalTrailIndex = portalTrail.length - 1;
  const browserEntry = {
    mapleforgeNavigation: true,
    session: portalHistorySession,
    index: portalTrailIndex,
    section: view,
  };
  if (portalTrailIndex === 0) history.replaceState(browserEntry, "");
  else {
    const route = new URL(location.href);
    route.searchParams.set("section", view);
    history.pushState(browserEntry, "", route);
  }
}
function travelPortal(direction) {
  const next = portalTrailIndex + direction;
  if (next < 0 || next >= portalTrail.length) return;
  history.go(direction);
}
window.addEventListener("popstate", (event) => {
  const state = event.state;
  if (!state?.mapleforgeNavigation) return;
  const place =
    state.session === portalHistorySession ? portalTrail[state.index] : null;
  portalTravel = true;
  if (place) portalTrailIndex = state.index;
  else portalTrailIndex = -1;
  try {
    if (!place) {
      switchSection(sectionLabels[state.section] ? state.section : "ideas");
      return;
    }
    if (place.pane) {
      paneTabs[place.id] = place.pane;
      if (place.record) paneRecords[place.id] = place.record;
      paneTitles[place.id] = place.title;
      paneParents[place.id] = place.parent;
    }
    openNextWorkspaceTab = false;
    switchSection(place.id);
  } finally {
    // Redrawing while restoring must not add a new browser history entry.
    drawSectionTabs();
    portalTravel = false;
  }
});
const tabsBeforeHistory = drawSectionTabs;
drawSectionTabs = function () {
  rememberPortalPlace();
  tabsBeforeHistory();
  document.title = tabLabel(activeSection) + " · MapleForge";
  const controls = document.createElement("div");
  controls.className = "portal-history";
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "Navigation history");
  for (const [direction, label, symbol] of [
    [-1, "Back", "←"],
    [1, "Forward", "→"],
  ]) {
    const button = document.createElement("button");
    button.className = "btn secondary";
    button.type = "button";
    button.textContent = symbol;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.disabled =
      direction < 0
        ? portalTrailIndex <= 0
        : portalTrailIndex >= portalTrail.length - 1;
    button.onclick = () => travelPortal(direction);
    controls.append(button);
  }
  sectionStrip.prepend(controls);
};
drawSectionTabs();
