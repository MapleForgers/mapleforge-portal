// Shared service offers and requests, owned by verified members.
if (window.MF) {
  const BOARD = "Skills exchange";
  const X = window.MF;
  let exchangeMode = "All",
    exchangeQuery = "",
    exchangeArea = "All skills",
    exchangeStatus = "Open",
    exchangeSort = "newest";
  sectionLabels.exchange = "Available skills";
  const exchangeNav = document.createElement("button");
  exchangeNav.dataset.view = "exchange";
  exchangeNav.textContent = "Available skills";
  exchangeNav.onclick = () => switchSection("exchange");
  $('.nav [data-view="people"]').after(exchangeNav);
  const listings = () => state.exchange || [];
  function editExchange(id, type = "Offer") {
    if (!X.requireAccount()) return;
    const r = listings().find((x) => x.id === id);
    if (r && !r.canEdit) return;
    X.formTab(
      "exchange-editor-" + (id || type),
      r ? "Edit listing" : type === "Offer" ? "Offer a skill" : "Ask for help",
      `<p>Tell the group what you can offer or what you need. Keep personal contact details out of the listing; start with the comments.</p><label class="form-field">Listing type<select name="type">${["Offer", "Request"].map((t) => `<option ${(r?.type || type) === t ? "selected" : ""}>${t}</option>`).join("")}</select></label><label class="form-field">Title<input name="title" required maxlength="160" value="${esc(r?.title || "")}" placeholder="For example: Website accessibility reviews"></label><label class="form-field">Skill area<input name="category" required maxlength="80" value="${esc(r?.category || "")}" placeholder="Design, development, writing, gardening..."></label><label class="form-field">Details<textarea name="body" required maxlength="4000">${esc(r?.body || "")}</textarea></label><div class="form-grid"><label class="form-field">Availability or timing<input name="availability" maxlength="200" value="${esc(r?.availability || "")}" placeholder="Weekends, two hours a week, or needed by Friday"></label><label class="form-field">Location or remote<input name="location" maxlength="160" value="${esc(r?.location || "")}" placeholder="Remote or your general area"></label><label class="form-field">Terms<select name="terms">${["Discuss together", "Volunteer", "Paid", "Skill swap"].map((t) => `<option ${r?.terms === t ? "selected" : ""}>${t}</option>`).join("")}</select></label><label class="form-field">Status<select name="status">${["Open", "Paused", "Completed"].map((t) => `<option ${r?.status === t ? "selected" : ""}>${t}</option>`).join("")}</select></label></div>`,
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
  function openExchange(id) {
    const r = listings().find((x) => x.id === id);
    if (!r) return;
    const d =
      document.getElementById("exchange-detail-" + id) ||
      createDialog("exchange-detail-" + id, r.title);
    d.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><span class="tag">${r.type === "Offer" ? "I can help" : "Looking for help"} · ${esc(r.status)}</span><button class="close" aria-label="Close listing">×</button></div><h2>${esc(r.title)}</h2><p>${memberName(r.author)} · ${esc(r.category)}</p><p class="shared-text">${esc(r.body)}</p><div class="request-meta"><span>${esc(r.availability || "Timing to discuss")}</span><span>${esc(r.location || "Location to discuss")}</span><span>${esc(r.terms)}</span></div>${r.canEdit ? '<button class="btn secondary" data-edit-listing>Edit my listing</button>' : ""}${r.source && /^https:\/\/discord\.com\/channels\//.test(r.source) ? `<p class="small muted">Imported from ${esc(r.author)}’s explicit offer in Discord. Availability and terms should be confirmed with them. <a href="${esc(r.source)}" target="_blank" rel="noopener noreferrer">Original message ↗</a></p>` : ""}<section class="exchange-comments"></section></div>`;
    d.querySelector(".close").onclick = () => d.close();
    if (r.canEdit)
      d.querySelector("[data-edit-listing]").onclick = () => editExchange(id);
    d.showModal();
    X.thread(BOARD + ":" + id, d.querySelector(".exchange-comments"));
  }
  window.openExchange = openExchange;
  const exchangeRestore = restorePane;
  restorePane = function (id) {
    if (id.startsWith("pane-exchange-detail-"))
      openExchange(id.slice("pane-exchange-detail-".length));
    else exchangeRestore(id);
  };
  function renderExchange() {
    const rows = listings();
    $("#main").innerHTML =
      `<div class="board-head"><div><h1>Available skills</h1><p class="muted">Offer what you know. Find the help you need.</p></div><div class="filter-chips"><button class="btn" id="exchange-offer">＋ Offer a skill</button><button class="btn secondary" id="exchange-ask">＋ Ask for help</button></div></div><div class="filter-chips" aria-label="Listing types">${[
        ["All", "All listings"],
        ["Offer", "I can help"],
        ["Request", "Looking for help"],
      ]
        .map(
          ([v, l]) =>
            `<button class="btn ${exchangeMode === v ? "" : "secondary"}" aria-pressed="${exchangeMode === v}" data-exchange-type="${v}">${l} · ${rows.filter((r) => v === "All" || r.type === v).length}</button>`,
        )
        .join(
          "",
        )}</div><nav id="skill-index" aria-label="Jump to a skill group"></nav><div class="request-tools"><input type="search" id="exchange-search" aria-label="Search available skills" placeholder="Search skills, services or members" value="${esc(exchangeQuery)}"><label>Skill<select id="exchange-area">${["All skills", ...new Set(rows.map((r) => r.category))].map((v) => `<option ${exchangeArea === v ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></label><label>Status<select id="exchange-status">${["Open", "Paused", "Completed", "Any status"].map((v) => `<option ${exchangeStatus === v ? "selected" : ""}>${v}</option>`).join("")}</select></label><label>Sort within groups<select id="exchange-sort"><option value="newest">Newest first</option><option value="member" ${exchangeSort === "member" ? "selected" : ""}>By member</option><option value="title" ${exchangeSort === "title" ? "selected" : ""}>A to Z</option></select></label></div><div id="exchange-results"></div><p class="small muted">Already shared your background? Your People & skills profile is still there. Publish a listing here when you want to offer a service or ask for help.</p>`;
    $("#exchange-offer").onclick = () => editExchange(null, "Offer");
    $("#exchange-ask").onclick = () => editExchange(null, "Request");
    $$("[data-exchange-type]").forEach(
      (b) =>
        (b.onclick = () => {
          exchangeMode = b.dataset.exchangeType;
          renderExchange();
        }),
    );
    $("#exchange-search").oninput = (e) => {
      exchangeQuery = e.target.value;
      renderExchangeResults();
    };
    for (const [id, set] of [
      ["exchange-area", (v) => (exchangeArea = v)],
      ["exchange-status", (v) => (exchangeStatus = v)],
      ["exchange-sort", (v) => (exchangeSort = v)],
    ])
      $("#" + id).onchange = (e) => {
        set(e.target.value);
        renderExchangeResults();
      };
    renderExchangeResults();
  }
  const skillLabels = {
    "Websites & hosting": "Websites",
    "Online stores & ecommerce": "Online stores",
    "Phones & VoIP": "Phones & VoIP",
    "Networking & computers": "Networking",
    "IT & operations": "IT support",
    "Software & custom apps": "Apps & software",
    "Shipping & logistics": "Shipping",
    Cybersecurity: "Cybersecurity",
    DevOps: "DevOps",
    "Data engineering": "Data",
    "Project management": "Project management",
    "Community support": "Community support",
    "Teaching & languages": "Teaching",
  };
  function renderExchangeResults() {
    let rows = listings().filter(
      (r) =>
        (exchangeMode === "All" || r.type === exchangeMode) &&
        (exchangeArea === "All skills" || r.category === exchangeArea) &&
        (exchangeStatus === "Any status" || r.status === exchangeStatus) &&
        [r.title, r.body, r.author, r.category, r.location]
          .join(" ")
          .toLowerCase()
          .includes(exchangeQuery.toLowerCase()),
    );
    rows.sort((a, b) =>
      exchangeSort === "member"
        ? a.author.localeCompare(b.author)
        : exchangeSort === "title"
          ? a.title.localeCompare(b.title)
          : b.created.localeCompare(a.created),
    );
    const groups = new Map();
    for (const r of rows) {
      const name = skillLabels[r.category] || r.category || "Other";
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(r);
    }
    const ordered = [...groups].sort(([a], [b]) => a.localeCompare(b));
    $("#skill-index").innerHTML =
      `<p class="small muted">Jump to a skill · ${rows.length} matching ${rows.length === 1 ? "listing" : "listings"}</p><div class="filter-chips">${ordered.map(([name, items], index) => `<button class="btn secondary" data-skill-jump="skill-group-${index}">${esc(name)} <strong>${items.length}</strong></button>`).join("")}</div>`;
    $("#exchange-results").innerHTML =
      ordered
        .map(
          ([name, items], index) =>
            `<section class="skill-group" aria-labelledby="skill-group-${index}"><div class="skill-group-heading"><h2 id="skill-group-${index}" tabindex="-1">${esc(name)} <small>${items.length}</small></h2><button class="btn link" data-skill-top>Back to skill index ↑</button></div>${items.map((r) => `<article class="request-row"><div class="feature-row-main"><span class="tag">${r.type === "Offer" ? "I can help" : "Looking for help"}</span><h3><button class="title-btn" data-exchange-open="${esc(r.id)}">${esc(r.title)}</button></h3><p>${esc(r.body.slice(0, 180))}${r.body.length > 180 ? "…" : ""}</p><div class="request-meta">${memberName(r.author)}<span>${esc(r.category)}</span><span>${esc(r.availability || "Timing to discuss")}</span><span>${esc(r.terms)}</span><button class="btn link" data-exchange-open="${esc(r.id)}">Ask a question / comment →</button></div></div><span class="tag">${esc(r.status)}</span></article>`).join("")}</section>`,
        )
        .join("") ||
      '<div class="empty">No matching listings. Try another search or filter.</div>';
    $$("[data-exchange-open]").forEach(
      (b) => (b.onclick = () => openExchange(b.dataset.exchangeOpen)),
    );
    $$("[data-skill-jump]").forEach(
      (b) =>
        (b.onclick = () => {
          const heading = document.getElementById(b.dataset.skillJump);
          heading.focus({ preventScroll: true });
          heading.scrollIntoView({
            block: "start",
            behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "instant"
              : "smooth",
          });
        }),
    );
    $$("[data-skill-top]").forEach(
      (b) =>
        (b.onclick = () => {
          const top = $("#skill-index");
          top.scrollIntoView({ block: "start" });
          top.querySelector("button")?.focus({ preventScroll: true });
        }),
    );
  }
  const exchangeRender = render;
  render = function () {
    exchangeRender();
    if (view === "exchange") renderExchange();
  };
}
