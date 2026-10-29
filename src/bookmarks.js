// Private, account-owned bookmarks. Existing saved ideas appear here too.
if (window.MF) {
  const M = window.MF;
  const sections = {
    Ideas: "ideas",
    Features: "requests",
    Tasks: "tasks",
    Governance: "governance",
    "Skills exchange": "exchange",
    "Resource sharing": "resource",
    People: "people",
    Framework: "framework",
  };
  const labels = {
    Ideas: "Ideas",
    Features: "Features",
    Tasks: "Tasks",
    Governance: "Governance",
    "Skills exchange": "Skills",
    "Resource sharing": "Resources",
    People: "People",
    Comments: "Comments",
    Activity: "Activity",
    Framework: "Framework",
  };
  let filter = "All",
    query = "";
  sectionLabels.bookmarks = "Bookmarks";
  const nav = document.createElement("button");
  nav.dataset.view = "bookmarks";
  nav.className = "bookmarks-nav";
  nav.innerHTML =
    icon("save") +
    '<span>Bookmarks</span><span class="bookmark-count">0</span>';
  nav.onclick = () => switchSection("bookmarks");
  document.querySelector(".nav").prepend(nav);
  const saved = () =>
    (M.bookmarkData?.relations || []).filter(
      (r) => r.kind === "saved" && r.uid === M.account?.id && !r.target.startsWith("Boards:"),
    );
  const picks = () =>
    (M.bookmarkData?.relations || []).filter((r) => r.kind === "pick");
  const isSaved = (target, shared = false) =>
    (shared ? picks().filter((r) => r.uid === M.account?.id) : saved()).some(
      (r) => r.target === target,
    );
  function split(target) {
    const i = target.indexOf(":");
    return [target.slice(0, i), target.slice(i + 1)];
  }
  function item(target) {
    const [kind, id] = split(target);
    if (kind === "Boards")
      return sectionLabels[id]
        ? { title: sectionLabels[id], body: "Open this board", author: "" }
        : null;
    if (kind === "Activity") {
      const a = M.bookmarkData?.activity.find((a) => a.id === id);
      return a
        ? {
            title: a.actor + " " + a.action,
            body: a.detail,
            author: a.actor,
            parent:
              (a.section === "People & skills" ? "People" : a.section) +
              ":" +
              a.target,
          }
        : (M.bookmarkData?.relations || []).find((r) => r.target === target)
            ?.data.item || null;
    }
    if (kind === "Comments") {
      const c = M.bookmarkData?.comments.find((c) => c.id === id);
      return c
        ? {
            title: "Comment by " + c.author,
            body: c.body,
            author: c.author,
            parent: c.target,
          }
        : null;
    }
    if (kind === "People") {
      const p = peopleItems().find((p) => p.id === id);
      return p ? { title: p.name, body: p.summary, author: p.name } : null;
    }
    if (kind === "Ideas") {
      const p = allIdeas().find((p) => p.id === id);
      return p ? { title: p.title, body: p.summary, author: p.proposer } : null;
    }
    const r = M.bookmarkData?.records.find(
      (r) => r.id === id && r.board === kind,
    );
    return r
      ? {
          title: r.title,
          body: r.body || r.description || r.summary || "",
          author: r.author,
        }
      : null;
  }
  async function toggle(target, title, button, shared = false) {
    if (!M.account) {
      toast("Sign in with Discord using the sidebar to save items.");
      return;
    }
    button.disabled = true;
    try {
      const [kind, id] = split(target);
      await M.api("/api/shared", {
        op: shared ? "community_pick" : "bookmark",
        kind,
        id,
        title: title || "Member",
        enabled: !isSaved(target, shared),
      });
      await M.refresh();
      if (view === "bookmarks") render();
      else decorate();
      toast(shared ? "Updated Community Picks" : "Updated your Bookmarks");
    } catch (e) {
      toast(e.message);
    } finally {
      if (button.isConnected) button.disabled = false;
    }
  }
  function addButton(host, target, title, shared = false) {
    let b = Array.from(host.children).find(
      (e) =>
        e.dataset?.bookmarkTarget === target &&
        (e.dataset.pick === "true") === shared,
    );
    if (!b) {
      b = document.createElement("button");
      b.type = "button";
      b.className = "btn secondary bookmark-toggle";
      b.dataset.bookmarkTarget = target;
      b.dataset.pick = String(shared);
      b.onclick = () => toggle(target, title, b, shared);
      host.append(b);
    }
    const active = isSaved(target, shared),
      label =
        (shared
          ? active
            ? "Remove my community pick: "
            : "Share in Community Picks: "
          : active
            ? "Remove bookmark: "
            : "Bookmark: ") + (title || "item");
    if (b.getAttribute("aria-label") !== label) {
      b.innerHTML =
        icon("save") +
        "<span>" +
        (shared
          ? active
            ? "Picked ✓"
            : "Community pick"
          : active
            ? "Saved ✓"
            : "Save") +
        "</span>";
      b.setAttribute("aria-label", label);
      b.setAttribute("aria-pressed", String(active));
      b.title = shared
        ? "Visible to the community"
        : "Private, find it in Bookmarks";
    }
  }
  function addControls(host, target, title) {
    addButton(host, target, title);

  }
  function openTarget(target) {
    const [kind, id] = split(target),
      r = item(target);
    if (!r) {
      toast("This item is no longer available. You can remove its bookmark.");
      return;
    }
    if (kind === "Boards") {
      switchSection(id);
      return;
    }
    if (kind === "Comments" || kind === "Activity") {
      const d =
        document.getElementById("saved-comment-" + id) ||
        createDialog("saved-comment-" + id, "Saved comment");
      d.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><h2>${esc(r.title)}</h2><button class="close" aria-label="Close saved comment">×</button></div><p class="shared-text">${esc(r.body)}</p><button class="btn" data-open-conversation>Open conversation →</button></div>`;
      d.querySelector(".close").onclick = () => d.close();
      d.querySelector("[data-open-conversation]").onclick = () =>
        openTarget(r.parent);
      d.showModal();
      return;
    }
    switchSection(sections[kind] || "ideas");
    if (kind === "Ideas") openIdea(id);
    if (kind === "Features") openRequest(id);
    if (kind === "Tasks") openTask(id);
    if (kind === "Governance") openGovernance(id);
    if (kind === "Skills exchange") openExchange(id);
    if (kind === "Resource sharing") openResource(id);
    if (kind === "People") openPerson(id);
    if (kind === "Framework") window.openFrameworkDiscussion?.(id);
  }
  function renderBookmarks() {
    const shared = view === "picks";
    const entries = shared
      ? [...new Map(picks().map((r) => [r.target, r])).values()]
      : saved();
    const rows = entries.map((s) => ({
      ...s,
      kind: split(s.target)[0],
      item: item(s.target),
    }));
    const shown = rows
      .filter(
        (r) =>
          (filter === "All" || r.kind === filter) &&
          `${r.item?.title || r.data.title || ""} ${r.item?.body || ""} ${r.item?.author || ""}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      )
      .sort((a, b) => (b.data.savedAt || 0) - (a.data.savedAt || 0));
    $("#main").innerHTML =
      `<div class="board-head"><div><h1>${shared ? "Community Picks" : "Bookmarks"}</h1><p>${shared ? "Useful finds shared by members. Add your picks for everyone to discover." : "Your private collection of saved items. Only you can see it."}</p></div></div><div class="filter-chips">${["All", ...Object.keys(labels)].map((k) => `<button class="btn ${filter === k ? "" : "secondary"}" data-bookmark-filter="${esc(k)}" aria-pressed="${filter === k}">${esc(k === "All" ? "All" : labels[k])} · ${rows.filter((r) => k === "All" || r.kind === k).length}</button>`).join("")}</div><input type="search" id="bookmark-search" aria-label="${shared ? "Search Community Picks" : "Search bookmarks"}" placeholder="${shared ? "Search Community Picks…" : "Search your bookmarks…"}" value="${esc(query)}"><div class="bookmark-results">${
        shown
          .map(
            (r) =>
              `<article class="panel bookmark-result" data-saved-item="${esc(r.target)}"><span class="tag">${esc(labels[r.kind] || r.kind)}</span><h3>${r.item ? `<button class="title-btn" data-bookmark-open="${esc(r.target)}">${esc(r.item.title)}</button>` : esc(r.data.title || "Item no longer available")}</h3>${r.item ? `<p class="shared-text">${esc(r.item.body.slice(0, 260))}${r.item.body.length > 260 ? "…" : ""}</p>${r.item.author ? `<p>${memberName(r.item.author)}</p>` : ""}` : "<p>You can remove this bookmark.</p>"}${
                shared
                  ? `<p class="small">Picked by ${picks()
                      .filter((p) => p.target === r.target)
                      .map((p) => memberName(p.name))
                      .join(", ")}</p>`
                  : ""
              }<div class="bookmark-actions"></div></article>`,
          )
          .join("") ||
        '<p class="empty">' +
          (M.account
            ? "Save something using its bookmark button, then find it here."
            : "Sign in with Discord using the sidebar to save your own collection.") +
          "</p>"
      }</div>`;
    $('[id="bookmark-search"]').oninput = (e) => {
      const pos = e.target.selectionStart;
      query = e.target.value;
      renderBookmarks();
      const input = $("#bookmark-search");
      input.focus();
      input.setSelectionRange(pos, pos);
    };
    $$("[data-bookmark-filter]").forEach(
      (b) =>
        (b.onclick = () => {
          filter = b.dataset.bookmarkFilter;
          renderBookmarks();
        }),
    );
    $$("[data-bookmark-open]").forEach(
      (b) => (b.onclick = () => openTarget(b.dataset.bookmarkOpen)),
    );
    $$("[data-saved-item]").forEach((row) =>
      addControls(
        row.querySelector(".bookmark-actions"),
        row.dataset.savedItem,
        item(row.dataset.savedItem)?.title || "Unavailable item",
      ),
    );
  }
  const previous = render;
  render = function () {
    previous();
    if (view === "bookmarks") renderBookmarks();
    decorate();
  };
  function decorate() {
    const count = String(saved().length);
    if (nav.querySelector(".bookmark-count").textContent !== count)
      nav.querySelector(".bookmark-count").textContent = count;
    document.querySelectorAll("#cards [data-save]").forEach((b) => {
      const active = state.saved.includes(b.dataset.save);
      b.classList.toggle("bookmark-active", active);
      b.setAttribute("aria-pressed", String(active));
      const title = find(b.dataset.save)?.title || "Idea";
      let host = b.closest(".card")?.querySelector(".card-footer");

    });
    const maps = [
      ["[data-exchange-open]", "Skills exchange"],
      ["[data-resource-open]", "Resource sharing"],
      ["[data-task-open]", "Tasks"],
      ["[data-person]", "People"],
      ["[data-request-open]", "Features"],
      ["[data-gov]", "Governance"],
      ["[data-activity-target]", "Activity"],
    ];
    for (const [selector, kind] of maps)
      document.querySelectorAll(selector).forEach((link) => {
        const row = link.closest("article");
        if (!row) return;
        const id = link.getAttribute(selector.slice(1, -1)),
          target = kind + ":" + id;
        const host =
          row.querySelector(".request-meta") ||
          row.querySelector("h3")?.parentElement ||
          row;
        addControls(host, target, item(target)?.title || link.textContent);
      });
    document.querySelectorAll("[data-comment-id]").forEach((row) => {
      const id = row.dataset.commentId;
      if (id)
        addControls(
          row.querySelector(':scope > .rule-comment-actions') || row,
          "Comments:" + id,
          item("Comments:" + id)?.title || "item",
        );
    });
    document.querySelectorAll(".bookmark-toggle").forEach((b) => {
      const title = item(b.dataset.bookmarkTarget)?.title || "item";
      addButton(
        b.parentElement,
        b.dataset.bookmarkTarget,
        title,
        b.dataset.pick === "true",
      );
    });
  }
  // Board filters and asynchronous comment loads replace subtrees independently of render().
  let queued = false;
  new MutationObserver((records) => {
    if (records.every((r) => r.target.closest?.(".bookmark-toggle"))) return;
    if (!queued) {
      queued = true;
      queueMicrotask(() => {
        queued = false;
        decorate();
      });
    }
  }).observe(document.getElementById("app"), {
    childList: true,
    subtree: true,
  });
}
