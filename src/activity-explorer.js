const activityBeforeExplorer = renderActivity;
renderActivity = function () {
  activityBeforeExplorer();
  let events = state.activity,
    day = events.filter((e) => Date.parse(e.date) >= Date.now() - 86400000),
    members = new Set(events.map((e) => e.actor));
  $("#main .board-head").insertAdjacentHTML(
    "afterend",
    `<div class="people-stats activity-stats"><div><strong>${events.length}</strong><span>recorded activities</span></div><div><strong>${day.length}</strong><span>in the past 24 hours</span></div><div><strong>${members.size}</strong><span>participating members</span></div></div><div id="activity-quick-filters" class="filter-chips" aria-label="Activity quick filters"></div>`,
  );
  renderActivityQuickFilters();
};
function renderActivityQuickFilters() {
  let host = $("#activity-quick-filters");
  if (!host) return;
  let kinds = [
    "All activity",
    "Posts",
    "Comments",
    "Votes",
    "Membership",
    "Profiles",
    "Status",
    "Contributions",
    "Organization",
    "Following",
    "Releases",
  ];
  host.innerHTML = kinds
    .map((k) =>
      peopleChip(
        k,
        k === "All activity"
          ? state.activity.length
          : state.activity.filter((e) => e.type === k).length,
        activityType === k,
        "data-activity-kind",
        k,
      ),
    )
    .join("");
  host.querySelectorAll("[data-activity-kind]").forEach(
    (b) =>
      (b.onclick = () => {
        activityType = b.dataset.activityKind;
        $("#activity-type").value = activityType;
        renderActivityRows();
      }),
  );
}
const activityRowsBeforeExplorer = renderActivityRows;
renderActivityRows = function () {
  activityRowsBeforeExplorer();
  renderActivityQuickFilters();
};
renderWorkspace = function () {
  $("#main").innerHTML =
    header(
      "WORKSPACE NOTES",
      "Our workshop, taking shape.",
      "What is ready to explore, and what we are building next.",
    ) +
    `<div class="people-stats"><div><strong>${allIdeas().length}</strong><span>ideas to explore</span></div><div><strong>${peopleItems().length}</strong><span>people & skills profiles</span></div><div><strong>${state.requests.length}</strong><span>feature requests</span></div></div><section class="panel"><h2>Ready to explore</h2><p>The MapleForge preview is online. Use the shared community password to step inside, explore ideas, discover skills and try the different layouts.</p><div class="filter-chips"><button class="filter-chip" data-workspace-go="ideas">Explore ideas →</button><button class="filter-chip" data-workspace-go="people">Find people & skills →</button><button class="filter-chip" data-workspace-go="requests">See feature requests →</button></div></section><section class="panel"><h2>What comes next</h2><p>Discord sign-in, verified member profiles and shared posts are being prepared. For now, trial changes stay in your browser and are not shared with other members. Keep feedback and conversations in Discord.</p></section><section class="panel"><h2>Built together, in the open</h2><p>Ideas and skills are credited to their original contributors, with links back to Discord. The setup record and source are being kept for community review. GitHub publication is still to come.</p><p>Something missing or confusing? Add it to Features so we can improve this together.</p><button class="btn secondary" data-workspace-go="requests">Features →</button></section>`;
  $$("[data-workspace-go]").forEach(
    (b) => (b.onclick = () => switchSection(b.dataset.workspaceGo)),
  );
};
