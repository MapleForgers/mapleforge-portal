// Shared service offers and requests, owned by verified members.
if (window.MF) {
  const BOARD = "Resource sharing";
  const X = window.MF;
  let resourceMode = "All",
    resourceQuery = "",
    resourceArea = "All resources",
    resourceStatus = "Open",
    resourceSort = "newest";
  sectionLabels.resource = "Available resources";
  const resourceNav = document.createElement("button");
  resourceNav.dataset.view = "resource";
  resourceNav.textContent = "Available resources";
  resourceNav.onclick = () => switchSection("resource");
  $('.nav [data-view="exchange"]').after(resourceNav);
  const listings = () => state.resource || [];
  function editResource(id, type = "Offer") {
    if (!X.requireAccount()) return;
    const r = listings().find((x) => x.id === id);
    if (r && !r.canEdit) return;
    X.formTab(
      "resource-editor-" + (id || type),
      r
        ? "Edit listing"
        : type === "Offer"
          ? "Share a resource"
          : "Request a resource",
      `<p>Tell the group what you can offer or what you need. Keep personal contact details out of the listing; start with the comments.</p><label class="form-field">Listing type<select name="type">${["Offer", "Request"].map((t) => `<option ${(r?.type || type) === t ? "selected" : ""}>${t}</option>`).join("")}</select></label><label class="form-field">Title<input name="title" required maxlength="160" value="${esc(r?.title || "")}" placeholder="For example: Workshop space, truck or trailer"></label><label class="form-field">Resource type<input name="category" required maxlength="80" value="${esc(r?.category || "")}" placeholder="Tools, vehicles, trailers, workshops, storage..."></label><label class="form-field">Details<textarea name="body" required maxlength="4000">${esc(r?.body || "")}</textarea></label><div class="form-grid"><label class="form-field">Availability or timing<input name="availability" maxlength="200" value="${esc(r?.availability || "")}" placeholder="Weekends, two hours a week, or needed by Friday"></label><label class="form-field">General location<input name="location" maxlength="160" value="${esc(r?.location || "")}" placeholder="Town or general area"></label><label class="form-field">Terms<select name="terms">${["Discuss together", "Free to use", "Rental", "Swap"].map((t) => `<option ${r?.terms === t ? "selected" : ""}>${t}</option>`).join("")}</select></label><label class="form-field">Status<select name="status">${["Open", "Paused", "Completed"].map((t) => `<option ${r?.status === t ? "selected" : ""}>${t}</option>`).join("")}</select></label></div>`,
      (fields) =>
        X.api("/api/shared", {
          op: "save",
          kind: BOARD,
          id: id || "",
          revision: r?.revision,
          fields,
        }),
    );
  }
  function openResource(id) {
    const r = listings().find((x) => x.id === id);
    if (!r) return;
    const d =
      document.getElementById("resource-detail-" + id) ||
      createDialog("resource-detail-" + id, r.title);
    d.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><span class="tag">${r.type === "Offer" ? "Available to share" : "Resource wanted"} · ${esc(r.status)}</span><button class="close" aria-label="Close listing">×</button></div><h2>${esc(r.title)}</h2><p>${memberName(r.author)} · ${esc(r.category)}</p><p class="shared-text">${esc(r.body)}</p><div class="request-meta"><span>${esc(r.availability || "Timing to discuss")}</span><span>${esc(r.location || "Location to discuss")}</span><span>${esc(r.terms)}</span></div>${r.canEdit ? '<button class="btn secondary" data-edit-listing>Edit my listing</button>' : ""}${r.source && /^https:\/\/discord\.com\/channels\//.test(r.source) ? `<p class="small muted">Imported from ${esc(r.author)}’s explicit offer in Discord. Availability and terms should be confirmed with them. <a href="${esc(r.source)}" target="_blank" rel="noopener noreferrer">Original message ↗</a></p>` : ""}<section class="resource-comments"></section></div>`;
    d.querySelector(".close").onclick = () => d.close();
    if (r.canEdit)
      d.querySelector("[data-edit-listing]").onclick = () => editResource(id);
    d.showModal();
    X.thread(BOARD + ":" + id, d.querySelector(".resource-comments"));
  }
  window.openResource = openResource;
  const resourceRestore = restorePane;
  restorePane = function (id) {
    if (id.startsWith("pane-resource-detail-"))
      openResource(id.slice("pane-resource-detail-".length));
    else resourceRestore(id);
  };
  function renderResource() {
    const rows = listings();
    $("#main").innerHTML =
      `<div class="board-head"><div><h1>Available resources</h1><p class="muted">Share tools, vehicles, workshops and space. Find what your project needs.</p></div><div class="filter-chips"><button class="btn" id="resource-offer">＋ Share a resource</button><button class="btn secondary" id="resource-ask">＋ Request a resource</button></div></div><div class="filter-chips" aria-label="Listing types">${[
        ["All", "All listings"],
        ["Offer", "Available to share"],
        ["Request", "Resource wanted"],
      ]
        .map(
          ([v, l]) =>
            `<button class="btn ${resourceMode === v ? "" : "secondary"}" aria-pressed="${resourceMode === v}" data-resource-type="${v}">${l} · ${rows.filter((r) => v === "All" || r.type === v).length}</button>`,
        )
        .join(
          "",
        )}</div><div class="request-tools"><input type="search" id="resource-search" aria-label="Search available resources" placeholder="Search resources, equipment or members" value="${esc(resourceQuery)}"><label>Resource<select id="resource-area">${["All resources", ...new Set(rows.map((r) => r.category))].map((v) => `<option ${resourceArea === v ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></label><label>Status<select id="resource-status">${["Open", "Paused", "Completed", "Any status"].map((v) => `<option ${resourceStatus === v ? "selected" : ""}>${v}</option>`).join("")}</select></label><label>Sort<select id="resource-sort"><option value="newest">Newest first</option><option value="member" ${resourceSort === "member" ? "selected" : ""}>By member</option><option value="title" ${resourceSort === "title" ? "selected" : ""}>A to Z</option></select></label></div><div id="resource-results"></div><p class="small muted">Share availability and any conditions, such as pickup, delivery or whether you need to be present. Arrange details in the comments.</p>`;
    $("#resource-offer").onclick = () => editResource(null, "Offer");
    $("#resource-ask").onclick = () => editResource(null, "Request");
    $$("[data-resource-type]").forEach(
      (b) =>
        (b.onclick = () => {
          resourceMode = b.dataset.resourceType;
          renderResource();
        }),
    );
    $("#resource-search").oninput = (e) => {
      resourceQuery = e.target.value;
      renderResourceResults();
    };
    for (const [id, set] of [
      ["resource-area", (v) => (resourceArea = v)],
      ["resource-status", (v) => (resourceStatus = v)],
      ["resource-sort", (v) => (resourceSort = v)],
    ])
      $("#" + id).onchange = (e) => {
        set(e.target.value);
        renderResourceResults();
      };
    renderResourceResults();
  }
  function renderResourceResults() {
    let rows = listings().filter(
      (r) =>
        (resourceMode === "All" || r.type === resourceMode) &&
        (resourceArea === "All resources" || r.category === resourceArea) &&
        (resourceStatus === "Any status" || r.status === resourceStatus) &&
        [r.title, r.body, r.author, r.category, r.location]
          .join(" ")
          .toLowerCase()
          .includes(resourceQuery.toLowerCase()),
    );
    rows.sort((a, b) =>
      resourceSort === "member"
        ? a.author.localeCompare(b.author)
        : resourceSort === "title"
          ? a.title.localeCompare(b.title)
          : b.created.localeCompare(a.created),
    );
    $("#resource-results").innerHTML =
      rows
        .map(
          (r) =>
            `<article class="request-row"><div class="feature-row-main"><span class="tag">${r.type === "Offer" ? "Available to share" : "Resource wanted"}</span><h3><button class="title-btn" data-resource-open="${esc(r.id)}">${esc(r.title)}</button></h3><p>${esc(r.body.slice(0, 180))}${r.body.length > 180 ? "…" : ""}</p><div class="request-meta">${memberName(r.author)}<span>${esc(r.category)}</span><span>${esc(r.availability || "Timing to discuss")}</span><span>${esc(r.terms)}</span></div></div><span class="tag">${esc(r.status)}</span></article>`,
        )
        .join("") ||
      '<div class="empty">No matching listings yet. Share a resource or ask the community for help.</div>';
    $$("[data-resource-open]").forEach(
      (b) => (b.onclick = () => openResource(b.dataset.resourceOpen)),
    );
  }
  const resourceRender = render;
  render = function () {
    resourceRender();
    if (view === "resource") renderResource();
  };
}
