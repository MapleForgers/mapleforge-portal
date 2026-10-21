// Live boards use authenticated, transactional server writes. No shared writes use localStorage.
if (window.MF) {
  const M = window.MF;
  let sharedData = null,
    ready = false,
    refreshing = false,
    preferenceTimer;
  const localDrafts = JSON.parse(JSON.stringify(state));
  const draftKey = (form) => {
    const d = form.closest("dialog");
    return (
      "mapleforge-draft:" +
      String(M.account?.id || "guest") +
      ":" +
      (d?.id || "main") +
      ":" +
      (d?.dataset.recordId ||
        (d?.id === "detail-dialog"
          ? currentId
          : d?.id === "request-dialog"
            ? openRequestId
            : "")) +
      ":" +
      (form.id || "form")
    );
  };
  M.bindDraft = (form) => {
    const key = draftKey(form);
    form.dataset.draftKey = key;
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || "null");
      if (saved) {
        for (const [name, value] of Object.entries(saved)) {
          const input = form.elements.namedItem(name);
          if (input && input.type !== "hidden") input.value = value;
        }
        form.dataset.dirty = "true";
      }
    } catch (e) {}
    form.addEventListener("input", () => {
      form.dataset.dirty = "true";
      try {
        sessionStorage.setItem(
          key,
          JSON.stringify(Object.fromEntries(new FormData(form))),
        );
      } catch (e) {}
    });
  };
  M.clearDraft = (form) => {
    delete form.dataset.dirty;
    try {
      sessionStorage.removeItem(form.dataset.draftKey || draftKey(form));
    } catch (e) {}
  };

  const count = (section, id) => {
    let targets = [id];
    if (section === "Features") targets = requestFamily(id).map((r) => r.id);
    return new Set(
      (sharedData?.relations || [])
        .filter(
          (r) =>
            r.kind === "vote" &&
            targets.some((t) => r.target === section + ":" + t),
        )
        .map((r) => r.uid),
    ).size;
  };
  M.count = count;
  const commentsFor = (section, id) =>
    (sharedData?.comments || [])
      .filter((c) => c.target === section + ":" + id)
      .map((c) => ({
        ...c,
        text: c.body,
        date: new Date(c.created * 1000).toISOString(),
      }));
  const own = (relation, section) =>
    (sharedData?.relations || [])
      .filter(
        (r) =>
          r.uid === M.account?.id &&
          r.kind === relation &&
          r.target.startsWith(section + ":"),
      )
      .map((r) => r.target.slice(section.length + 1));
  M.hydrate = async () => {
    sharedData = await M.api("/api/shared");
    const records = sharedData.records;
    state.custom = [];
    state.mySkillProfile = null;
    state.exchange = records.filter((r) => r.board === "Skills exchange");
    state.resource = records.filter((r) => r.board === "Resource sharing");
    state.requests = records.filter((r) => r.board === "Features");
    state.tasks = records
      .filter((r) => r.board === "Tasks")
      .map((r) => ({
        ...r,
        comments: commentsFor("Tasks", r.id),
        following: own("follow", "Tasks").includes(r.id),
      }));
    state.governance = records.filter((r) => r.board === "Governance");
    state.votes = own("vote", "Ideas");
    state.requestVotes = own("vote", "Features");
    state.governanceVotes = own("vote", "Governance");
    state.saved = own("saved", "Ideas");
    state.requestFollows = own("follow", "Features");
    state.comments = {};
    state.requestComments = {};
    state.governanceComments = {};
    for (const [section, key] of [
      ["Ideas", "comments"],
      ["Features", "requestComments"],
      ["Governance", "governanceComments"],
    ])
      for (const c of sharedData.comments.filter((c) =>
        c.target.startsWith(section + ":"),
      )) {
        const id = c.target.slice(section.length + 1);
        (state[key][id] ??= []).push({
          ...c,
          text: c.body,
          date: new Date(c.created * 1000).toISOString(),
        });
      }
    state.ideaMembers = {};
    state.contributions = {};
    for (const r of sharedData.relations.filter((r) => r.kind === "join")) {
      const id = r.target.slice(6);
      (state.ideaMembers[id] ??= []).push({
        id: r.uid,
        name: r.name,
        ...r.data,
      });
      if (r.uid === M.account?.id) state.contributions[id] = r.data;
    }
    state.stages = Object.fromEntries(
      records
        .filter((r) => r.board === "Ideas" && r.status)
        .map((r) => [r.id, r.status]),
    );
    state.featureReleases = state.requests
      .flatMap((r) => r.releases || [])
      .sort((a, b) => b.date.localeCompare(a.date));
    state.activity = sharedData.activity;
    M.profiles = M.community.profiles.map((p) => ({
      ...p,
      category: p.category || "Other",
      summary: p.summary || "",
      services: p.services || "",
      sources: [],
      verified: true,
    }));
    if (!ready && sharedData.preferences) {
      state.preferences = { ...state.preferences, ...sharedData.preferences };
      sort = state.preferences.sort || sort;
    }
    ready = true;
  };
  // Preference writes are private to the signed-in member. The local backup retains old drafts.
  persist = function () {
    try {
      localStorage.setItem(
        "mapleforge-personal-preferences",
        JSON.stringify(state.preferences),
      );
    } catch (e) {}
    if (M.account && ready) {
      clearTimeout(preferenceTimer);
      preferenceTimer = setTimeout(
        () =>
          M.api("/api/shared", {
            op: "preferences",
            preferences: state.preferences,
          }).catch((e) => toast(e.message)),
        350,
      );
    }
  };
  try {
    Object.assign(
      state.preferences,
      JSON.parse(
        localStorage.getItem("mapleforge-personal-preferences") || "{}",
      ),
    );
  } catch (e) {}
  function requireReady() {
    if (!ready) {
      toast("Shared data is loading. Please try again.");
      return false;
    }
    return M.requireAccount();
  }
  async function change(data, after) {
    if (!requireReady()) return;
    try {
      await M.api("/api/shared", data);
      await M.refresh();
      render();
      if (after) after();
      toast("Saved for everyone");
    } catch (e) {
      toast(e.message);
    }
  }
  function relation(kind, id, type, enabled, extra = {}, after) {
    return change(
      { op: "relation", kind, id, relation: type, enabled, ...extra },
      after,
    );
  }
  function redrawIdea(id) {
    if ($("#detail-dialog").open && currentId === id) renderDetail();
    const d = document.getElementById("shared-idea-" + id);
    if (d?.open) openIdea(id);
  }
  toggleVote = (id) =>
    relation("Ideas", id, "vote", !state.votes.includes(id), {}, () =>
      redrawIdea(id),
    );
  joinIdea = (id) =>
    relation("Ideas", id, "join", true, {}, () => redrawIdea(id));
  leaveIdea = (id) =>
    relation("Ideas", id, "join", false, {}, () => redrawIdea(id));
  toggleFeatureVote = (id) =>
    relation("Features", id, "vote", !hasRequestVote(id), {}, () => {
      if (requestDialog.open) renderRequestDetail();
    });
  toggleFeatureFollow = (id) =>
    relation(
      "Features",
      id,
      "follow",
      !state.requestFollows.includes(id),
      {},
      () => {
        if (requestDialog.open) renderRequestDetail();
      },
    );
  updateTaskStatus = (id, status) =>
    change({ op: "status", kind: "Tasks", id, status }, () => {
      if (taskDialog.open) openTask(id);
    });
  toggleTaskFollow = (id) =>
    relation(
      "Tasks",
      id,
      "follow",
      !state.tasks.find((t) => t.id === id)?.following,
      {},
      () => {
        if (taskDialog.open) openTask(id);
      },
    );
  function formSubmit(form, save, after) {
    M.bindDraft(form);
    if (!M.account) {
      form
        .querySelectorAll("input,textarea,select,button")
        .forEach((x) => (x.disabled = true));
      const link = document.createElement("a");
      link.href = "/auth/discord";
      link.className = "btn";
      link.textContent = "Sign in with Discord to contribute";
      form.append(link);
      return;
    }
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (!requireReady()) return;
      const button = form.querySelector("[type=submit]");
      if (button) button.disabled = true;
      let error = form.querySelector("[role=alert]");
      if (!error) {
        error = document.createElement("p");
        error.setAttribute("role", "alert");
        error.className = "form-error";
        form.append(error);
      }
      error.textContent = "";
      try {
        let result = await save(Object.fromEntries(new FormData(form)));
        M.clearDraft(form);
        await M.refresh();
        render();
        after?.(result);
        toast("Saved for everyone");
      } catch (e) {
        error.textContent = e.message;
      } finally {
        if (button) button.disabled = false;
      }
    };
  }
  const oldRequestForm = openRequestForm;
  openRequestForm = function () {
    if (!requireReady()) return;
    oldRequestForm();
    requestFormDialog.querySelector(".form-actions span").textContent =
      "Posting as " + M.account.name;
    formSubmit(
      $("#request-form"),
      (fields) =>
        M.api("/api/shared", { op: "save", kind: "Features", fields }),
      (r) => {
        requestFormDialog.close();
        view = "requests";
        render();
        openRequest(r.id);
      },
    );
  };
  const oldTaskEdit = editTask;
  editTask = function (id) {
    if (!requireReady()) return;
    const t = state.tasks.find((t) => t.id === id);
    if (t && !t.canEdit) {
      toast("Only the author or a maintainer can edit this task.");
      return;
    }
    oldTaskEdit(id);
    const d = document.getElementById("task-editor-" + (id || "new"));
    formSubmit(
      d.querySelector("form"),
      (fields) =>
        M.api("/api/shared", {
          op: "save",
          kind: "Tasks",
          id: id || "",
          revision: t?.revision,
          fields,
        }),
      (r) => {
        d.close();
        openTask(r.id);
      },
    );
  };
  const oldGovForm = newGovernance;
  newGovernance = function () {
    if (!requireReady()) return;
    oldGovForm();
    const d = document.getElementById("new-governance");
    d.querySelector(".small.muted").textContent =
      "Posting as " + M.account.name + ". Proposals do not appoint anyone.";
    formSubmit(
      d.querySelector("form"),
      (fields) =>
        M.api("/api/shared", { op: "save", kind: "Governance", fields }),
      (r) => {
        d.close();
        openGovernance(r.id);
      },
    );
  };
  const oldTask = openTask;
  openTask = function (id) {
    oldTask(id);
    const t = state.tasks.find((t) => t.id === id);
    if (!t) return;
    $("#task-edit").disabled = !t.canEdit;
    $("#task-detail-status").disabled = !(
      t.canEdit || t.assignee === M.account?.id
    );
    const form = $("#task-comment");
    formSubmit(
      form,
      (f) => M.api("/api/comments", { target: "Tasks:" + id, body: f.text }),
      () => openTask(id),
    );
    cleanText(taskDialog);
  };
  const oldGov = openGovernance;
  openGovernance = function (id) {
    oldGov(id);
    $("#gov-support").textContent =
      "↑ " +
      count("Governance", id) +
      " supporters" +
      (state.governanceVotes.includes(id) ? " · Supported" : "");
    $("#gov-support").onclick = () =>
      relation(
        "Governance",
        id,
        "vote",
        !state.governanceVotes.includes(id),
        {},
        () => openGovernance(id),
      );
    formSubmit(
      $("#gov-comment"),
      (f) =>
        M.api("/api/comments", { target: "Governance:" + id, body: f.text }),
      () => openGovernance(id),
    );
    const r = state.governance.find((r) => r.id === id);
    if (r?.canEdit) {
      const b = document.createElement("button");
      b.className = "btn secondary";
      b.textContent = "Edit my proposal";
      b.onclick = () =>
        M.formTab(
          "gov-editor",
          "Edit proposal",
          `<label class="form-field">Title<input name="title" required maxlength="160" value="${esc(r.title)}"></label><label class="form-field">Topic<select name="category">${governanceCategories.map((c) => `<option ${c === r.category ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label><label class="form-field">Proposal<textarea name="summary" required maxlength="4000">${esc(r.summary)}</textarea></label>`,
          (fields) =>
            M.api("/api/shared", {
              op: "save",
              kind: "Governance",
              id,
              revision: r.revision,
              fields,
            }),
        );
      governanceDialog.querySelector(".dialog-inner").append(b);
    }
    cleanText(governanceDialog);
  };
  const oldFeatureDetail = renderRequestDetail;
  renderRequestDetail = function () {
    oldFeatureDetail();
    const r = state.requests.find((r) => r.id === openRequestId);
    if (!r) return;
    $("#support-request").textContent =
      "↑ " +
      count("Features", r.id) +
      " supporters" +
      (hasRequestVote(r.id) ? " · Supported" : "");
    $("#request-status").disabled = !r.canEdit;
    $("#request-status").onchange = (e) =>
      change(
        { op: "status", kind: "Features", id: r.id, status: e.target.value },
        renderRequestDetail,
      );
    const form = $("#feature-organize");
    if (!sharedData.admin) form.closest("section").hidden = true;
    $("#request-status").parentElement.firstChild.textContent = "Status ";
    form
      .querySelectorAll("input,select,button")
      .forEach((x) => (x.disabled = !sharedData.admin));
    formSubmit(
      form,
      (f) =>
        M.api("/api/shared", {
          op: "organize",
          kind: "Features",
          id: r.id,
          ...f,
        }),
      renderRequestDetail,
    );
    $("#publish-feature").disabled = !sharedData.admin;
    cleanText(requestDialog);
    if (r.canEdit) {
      const b = document.createElement("button");
      b.className = "btn secondary";
      b.textContent = "Edit request";
      b.onclick = () =>
        M.formTab(
          "feature-editor",
          "Edit request",
          `<label class="form-field">Title<input name="title" required maxlength="160" value="${esc(r.title)}"></label><label class="form-field">Details<textarea name="body" required maxlength="4000">${esc(r.body)}</textarea></label>`,
          (f) =>
            M.api("/api/shared", {
              op: "save",
              kind: "Features",
              id: r.id,
              revision: r.revision,
              fields: { ...r, ...f },
            }),
        );
      requestDialog.querySelector(".request-action").append(b);
    }
  };
  const oldActivation = activationForm;
  activationForm = function (r) {
    if (!requireReady()) return;
    oldActivation(r);
    const d = document.getElementById("activation-form");
    formSubmit(
      d.querySelector("form"),
      (f) =>
        M.api("/api/shared", {
          op: "release",
          kind: "Features",
          id: r.id,
          ...f,
        }),
      () => {
        d.close();
        renderRequestDetail();
      },
    );
    cleanText(d);
  };
  const oldDetail = renderDetail;
  renderDetail = function () {
    oldDetail();
    const id = currentId;
    const form = $("#contribute-form");
    if (form)
      formSubmit(
        form,
        (f) =>
          M.api("/api/shared", {
            op: "relation",
            kind: "Ideas",
            id,
            relation: "join",
            enabled: true,
            ...f,
          }),
        () => renderDetail(),
      );
    if ($("#withdraw")) $("#withdraw").onclick = () => leaveIdea(id);
    if ($("#detail-vote"))
      $("#detail-vote").textContent =
        "↑ " +
        count("Ideas", id) +
        " supporters" +
        (state.votes.includes(id) ? " · Supported" : "");
    if ($("#stage")) {
      const rec = sharedData?.records.find((r) => r.id === id);
      $("#stage").disabled = !rec?.canEdit;
      $("#stage").onchange = (e) =>
        change(
          { op: "status", kind: "Ideas", id, status: e.target.value },
          renderDetail,
        );
    }
    cleanText($("#detail-content"));
  };
  // New and imported ideas have the same participation actions.
  const oldOpen = openIdea;
  openIdea = function (id) {
    oldOpen(id);
    const d = document.getElementById("shared-idea-" + id);
    if (!d?.open) return;
    const block = document.createElement("section");
    block.className = "panel";
    block.innerHTML = `<div class="filter-chips"><button class="btn secondary" data-live-vote>↑ ${count("Ideas", id)} supporters${state.votes.includes(id) ? " · Supported" : ""}</button><button class="btn secondary" data-live-join>${state.contributions[id] ? "Leave idea" : "Join idea"}</button></div><p>${
      membersFor(id)
        .map((m) => memberName(m.name))
        .join(", ") || "Be the first to join."
    }</p><form><label class="form-field">How can you help?<input name="role" maxlength="100" required value="${esc(state.contributions[id]?.role || "")}"></label><label class="form-field">Availability<input name="capacity" maxlength="100" value="${esc(state.contributions[id]?.capacity || "")}"></label><button class="btn" type="submit">Save contribution</button></form>`;
    d.querySelector(".shared-thread").before(block);
    block.querySelector("[data-live-vote]").onclick = () => toggleVote(id);
    block.querySelector("[data-live-join]").onclick = () =>
      state.contributions[id] ? leaveIdea(id) : joinIdea(id);
    formSubmit(
      block.querySelector("form"),
      (f) =>
        M.api("/api/shared", {
          op: "relation",
          kind: "Ideas",
          id,
          relation: "join",
          enabled: true,
          ...f,
        }),
      () => openIdea(id),
    );
  };
  const oldCards = renderCards;
  renderCards = function () {
    oldCards();
    $$("[data-vote]").forEach(
      (b) =>
        (b.querySelector("b").textContent = count("Ideas", b.dataset.vote)),
    );
    $$("[data-save]").forEach(
      (b) =>
        (b.onclick = () =>
          relation(
            "Ideas",
            b.dataset.save,
            "saved",
            !state.saved.includes(b.dataset.save),
          )),
    );
    if (sort === "votes") {
      const cards = $$("#cards .card");
      cards
        .sort(
          (a, b) =>
            count("Ideas", b.querySelector("[data-open]").dataset.open) -
            count("Ideas", a.querySelector("[data-open]").dataset.open),
        )
        .forEach((c) => $("#cards").append(c));
    }
  };
  const oldRequestResults = renderRequestResults;
  renderRequestResults = function () {
    oldRequestResults();
    $$("[data-feature-vote]").forEach(
      (b) =>
        (b.textContent =
          "↑ " +
          count("Features", b.dataset.featureVote) +
          (hasRequestVote(b.dataset.featureVote) ? " · Upvoted" : " · Upvote")),
    );
    if (requestSort === "supported" && requestLayout === "list") {
      const rows = $$(
        "#request-results .request-item, #request-results .request-row",
      );
      rows
        .sort(
          (a, b) =>
            count(
              "Features",
              b.querySelector("[data-request-open]").dataset.requestOpen,
            ) -
            count(
              "Features",
              a.querySelector("[data-request-open]").dataset.requestOpen,
            ),
        )
        .forEach((r) => $("#request-results .request-list").append(r));
    }
  };
  const oldGovResults = renderGovernanceResults;
  renderGovernanceResults = function () {
    oldGovResults();
    $$("#gov-results .request-item").forEach((el) => {
      const id = el.querySelector("[data-gov]").dataset.gov;
      const span = [...el.querySelectorAll("span")].find((s) =>
        s.textContent.startsWith("↑"),
      );
      if (span)
        span.textContent = "↑ " + count("Governance", id) + " supporters";
    });
  };
  const oldPerson = openPerson;
  openPerson = function (id) {
    oldPerson(id);
    const p = peopleItems().find((p) => p.id === id);
    if (p?.verified) {
      const b = $("#edit-own-skills");
      if (b && id !== M.account?.id) b.remove();
    }
    cleanText(personDialog);
  };
  const oldRelease = showReleases;
  showReleases = function () {
    oldRelease();
    cleanText(releaseDialog);
  };
  function cleanText(root) {
    if (!root) return;
    root
      .querySelectorAll(
        ".source-note,.stats-origin,.footer-note,.detail-meta,.request-meta,.gov-summary,.small.muted",
      )
      .forEach((el) => {
        if (el.children.length) return;
        let t = el.textContent;
        if (
          /stay in this browser|saved only in this browser|Changes are a local preview|records actions made in this browser|submissions and comments stay|preview shows your demo identity|Live member names|Individual profile ownership|Prototype records in this browser|Demo member|Local demo proposal|Your local draft|Local preview profile|local release note|offline prototype’s release log|Demo maintainer controls|Status changes are a prototype control|prototype control|account-level preferences come/i.test(
            t,
          )
        )
          el.textContent = t.includes("notification")
            ? "Saved for the community. Follow-up dates do not send notifications yet."
            : "Shared with the community. Sign in with Discord to contribute.";
        else if (t.includes("this offline demo does not send notifications"))
          el.textContent =
            "Following is saved to your account. Notifications are not enabled yet.";
      });
  }
  const oldShare = shareRequest;
  shareRequest = function (r) {
    oldShare(r);
    shareDialog.querySelector(".small.muted").textContent =
      "Share this link within the community. The preview password is required.";
    const text = `${r.title}\n${location.origin}/portal1/#${encodeURIComponent(r.id)}`;
    shareDialog.querySelector("textarea").value = text;
    $("#copy-request").onclick = () =>
      navigator.clipboard
        .writeText(text)
        .then(() => toast("Link copied"))
        .catch(() => toast("Select and copy the link."));
  };
  const oldRender = render;
  render = function () {
    oldRender();
    cleanText($("#main"));
    $$("[data-task-status]").forEach((s) => {
      const t = state.tasks.find((t) => t.id === s.dataset.taskStatus);
      s.disabled = !(t?.canEdit || t?.assignee === M.account?.id);
    });
    if ($("#activity-refresh"))
      $("#activity-refresh").onclick = () => refresh(true);
    if ($("#app") && !$("#app").classList.contains("hidden")) {
      let status = document.getElementById("shared-status");
      if (!status) {
        status = document.createElement("small");
        status.id = "shared-status";
        status.setAttribute("role", "status");
        $(".member-account").append(status);
      }
      status.textContent = ready
        ? "Shared content saved on the server"
        : "Loading shared content…";
    }
  };
  async function refresh(force = false) {
    if (refreshing) return;
    refreshing = true;
    try {
      const before = JSON.stringify(sharedData);
      await M.refresh();
      if (force || JSON.stringify(sharedData) !== before) {
        const editing = !!paneTabs[activeSection]?.querySelector(
          "form[data-dirty=true]",
        );
        if (!editing) {
          render();
          if ($("#detail-dialog").open) renderDetail();
          const live = Object.entries(paneTabs).find(
            ([key, d]) =>
              key === activeSection && d.id.startsWith("shared-idea-"),
          );
          if (live) openIdea(live[1].id.slice(12));
          if (requestDialog.open) renderRequestDetail();
          if (taskDialog.open) openTask(taskDialog.dataset.recordId);
          if (governanceDialog.open)
            openGovernance(governanceDialog.dataset.recordId);
        }
      }
    } catch (e) {
      if (force) toast(e.message);
      const status = document.getElementById("shared-status");
      if (status)
        status.textContent =
          "Connection interrupted. Retry before leaving unsaved work.";
    } finally {
      refreshing = false;
    }
  }

  function oldDraftEntries() {
    const entries = [];
    for (const [key, kind] of [
      ["custom", "Ideas"],
      ["requests", "Features"],
      ["tasks", "Tasks"],
      ["governance", "Governance"],
    ])
      for (const r of localDrafts[key] || []) {
        if (
          (kind === "Features" && initialRequests.some((x) => x.id === r.id)) ||
          (kind === "Tasks" && taskSeeds.some((x) => x.id === r.id))
        )
          continue;
        entries.push({ key: kind + ":" + r.id, kind, r });
      }
    for (const [key, kind] of [
      ["comments", "Ideas"],
      ["requestComments", "Features"],
      ["governanceComments", "Governance"],
    ])
      for (const [id, list] of Object.entries(localDrafts[key] || {}))
        for (const [i, c] of list.entries())
          entries.push({
            key: kind + ":" + id + ":comment:" + i,
            kind,
            id,
            comment: c.text,
            r: { title: "Comment on " + (find(id)?.title || id), body: c.text },
          });
    return entries;
  }
  function recoverDrafts() {
    if (!requireReady()) return;
    const d =
      document.getElementById("recover-browser-drafts") ||
      createDialog("recover-browser-drafts", "Earlier browser drafts");
    const entries = oldDraftEntries();
    let done;
    try {
      done = JSON.parse(
        localStorage.getItem("mapleforge-recovered:" + M.account.id) || "[]",
      );
    } catch (e) {
      done = [];
    }
    d.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><h2>Earlier browser drafts</h2><button class="close">×</button></div><p>These were saved on this browser before shared storage. Review each one. Publish only your own real contributions. Nothing is uploaded automatically.</p>${
      entries
        .filter((x) => !done.includes(x.key))
        .map(
          (x, i) =>
            `<article class="panel"><h3>${esc(x.r.title)}</h3><p class="shared-text">${esc(x.comment || x.r.body || x.r.summary || x.r.description || "")}</p><button class="btn" data-recover="${esc(x.key)}">Publish as ${esc(M.account.name)}</button><p role="alert"></p></article>`,
        )
        .join("") || "<p>No unpublished browser drafts found.</p>"
    }</div>`;
    d.querySelector(".close").onclick = () => d.close();
    d.querySelectorAll("[data-recover]").forEach(
      (b) =>
        (b.onclick = async () => {
          const x = entries.find((x) => x.key === b.dataset.recover);
          b.disabled = true;
          try {
            if (x.comment)
              await M.api("/api/comments", {
                target: x.kind + ":" + x.id,
                body: x.comment,
              });
            else if (x.kind === "Ideas")
              await M.api("/api/posts", {
                title: x.r.title,
                body: [x.r.summary, x.r.problem, x.r.audience, x.r.firstStep]
                  .filter(Boolean)
                  .join("\n\n"),
                category: x.r.category,
              });
            else
              await M.api("/api/shared", {
                op: "save",
                kind: x.kind,
                fields: x.r,
              });
            done.push(x.key);
            localStorage.setItem(
              "mapleforge-recovered:" + M.account.id,
              JSON.stringify(done),
            );
            await M.refresh();
            recoverDrafts();
          } catch (e) {
            b.nextElementSibling.textContent = e.message;
            b.disabled = false;
          }
        }),
    );
    d.showModal();
  }
  const recoveryRender = render;
  render = function () {
    recoveryRender();
    if (oldDraftEntries().length && M.account) {
      const b = document.createElement("button");
      b.className = "btn link";
      b.textContent = "Review earlier browser drafts";
      b.onclick = recoverDrafts;
      $(".member-account").append(b);
    }
  };
  setInterval(() => {
    if (!document.hidden) refresh();
  }, 15000);
  window.addEventListener("focus", () => refresh());
}
