// Compact summaries describe recorded content, not inferred participation.
function dashboardIdeas() {
  return allIdeas().map((x) => ({ category: x.category, author: x.proposer }));
}
function renderBoardStats() {
  document.querySelector(".board-statistics")?.remove();
  let items = [],
    title = "",
    groupKey = "",
    labels = [],
    select;
  if (view === "ideas") {
    items = dashboardIdeas();
    title = "Ideas";
    groupKey = "category";
    labels = categories.slice(1);
    select = (label) => {
      category = category === label ? "All themes" : label;
      render();
    };
    document.querySelector("#main .community-banner")?.remove();
    document.querySelector("#main .hero")?.remove();
  } else if (view === "requests") {
    items = state.requests;
    title = "Features";
    groupKey = "status";
    labels = requestStages;
  } else if (view === "governance") {
    items = govItems();
    title = "Governance proposals";
    groupKey = "category";
    labels = governanceCategories;
    select = (label) => {
      governanceCategory = governanceCategory === label ? "All topics" : label;
      render();
    };
  } else return;
  const counts = labels.map((label) => ({
    label,
    count: items.filter((x) => x[groupKey] === label).length,
  }));
  const max = Math.max(1, ...counts.map((x) => x.count));
  const authors = new Set(items.map((x) => x.author).filter(Boolean));
  const board = view === 'ideas' ? 'Ideas' : view === 'requests' ? 'Features' : 'Governance';
  const authorCount = window.MF?.bookmarkData?.boardContributorCounts?.[board] ?? authors.size;
  const section = document.createElement("section");
  section.className = "board-statistics";
  section.setAttribute("aria-label", title + " statistics");
  section.innerHTML = `<div class="stats-heading"><h1>${title === "Ideas" ? "Idea board" : title}</h1><div class="stats-totals"><strong>${items.length}</strong> ${title.toLowerCase()} <span>·</span> <strong>${authorCount}</strong> contributors</div>${view === "ideas" ? '<span class="stats-origin">Discord ideas + member posts</span>' : '<span class="stats-origin">Shared community records</span>'}</div><div class="board-stat-bars">${counts.map((x) => `<${select ? "button" : "div"} class="board-stat-bar" ${select ? `type="button" data-stat-group="${esc(x.label)}" aria-pressed="${(view === "ideas" ? category : governanceCategory) === x.label}"` : ""}><span>${esc(x.label)}</span><strong>${x.count}</strong><span class="board-stat-track" aria-hidden="true"><i style="width:${(100 * x.count) / max}%"></i></span></${select ? "button" : "div"}>`).join("")}</div>`;
  if (view === "ideas") $("#main").prepend(section);
  else {
    const head = $("#main .board-head") || $("#main .hero");
    if (head) head.after(section);
    else $("#main").prepend(section);
    section.querySelector("h1").remove();
  }
  section
    .querySelectorAll("[data-stat-group]")
    .forEach((b) => (b.onclick = () => select(b.dataset.statGroup)));
}
const beforeStatisticsRender = render;
render = function () {
  beforeStatisticsRender();
  renderBoardStats();
};
if (!$("#app").classList.contains("hidden")) renderBoardStats();
