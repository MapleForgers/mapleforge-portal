// Live member features use server-authoritative Discord identity and ownership.
if (location.hostname === "maple-forge.ca") {
  let account = null,
    csrf = "",
    community = { posts: [], profiles: [] };
  async function api(path, data) {
    const r = await fetch(path, {
      credentials: "same-origin",
      headers: data
        ? { "Content-Type": "application/json", "X-CSRF-Token": csrf }
        : {},
      method: data ? "POST" : "GET",
      body: data ? JSON.stringify(data) : undefined,
    });
    let value = await r.json();
    if (!r.ok) throw Error(value.error || "Could not save. Please try again.");
    return value;
  }
  const accountBox = document.createElement("div");
  accountBox.className = "member-account";
  $(".sidebar-bottom").prepend(accountBox);
  function accountUI() {
    accountBox.innerHTML = account
      ? `<strong>${memberName(account.name)}</strong><small>@${esc(account.username)} · Discord</small><div><button class="btn secondary" id="member-profile">My profile</button><button class="btn secondary" id="member-logout">Sign out</button></div>`
      : '<a class="btn" href="/auth/discord">Sign in with Discord</a>';
    if (account) {
      $("#member-profile").onclick = editProfile;
      $("#member-logout").onclick = async () => {
        try {
          await api("/api/logout", {});
          location.reload();
        } catch (e) {
          toast(e.message);
        }
      };
    }
  }
  async function refreshMembers() {
    let me = await api("/api/me");
    account = me.user;
    csrf = me.csrf;
    community = await api("/api/community");
    remoteIdeas = community.posts.map((p) => ({
      ...p.details,
      id: p.id,
      title: p.title,
      summary: p.body,
      category: p.category,
      proposer: p.author,
      imported: false,
      live: true,
    }));
    accountUI();
    if (window.MF?.hydrate) await window.MF.hydrate();
  }
  function requireAccount() {
    if (account) return true;
    location.href = "/auth/discord";
    return false;
  }
  function formTab(id, title, html, submit) {
    let d = document.getElementById(id) || createDialog(id, title);
    d.setAttribute("aria-label", title);
    d.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><h2>${esc(title)}</h2><button class="close" aria-label="Close">×</button></div><form>${html}<p role="alert" class="form-error"></p><button class="btn orange" type="submit">Save</button></form></div>`;
    d.querySelector(".close").onclick = () => d.close();
    window.MF?.bindDraft?.(d.querySelector("form"));
    d.querySelector("form").onsubmit = async (e) => {
      e.preventDefault();
      let b = e.target.querySelector("[type=submit]");
      b.disabled = true;
      try {
        await submit(Object.fromEntries(new FormData(e.target)));
        window.MF?.clearDraft?.(e.target);
        await refreshMembers();
        d.close();
        render();
        toast("Saved for the community");
      } catch (err) {
        d.querySelector(".form-error").textContent = err.message;
      } finally {
        b.disabled = false;
      }
    };
    d.showModal();
  }
  function editProfile() {
    if (!requireAccount()) return;
    let p = account.profile || {};
    formTab(
      "member-profile-editor",
      "My profile",
      `<p>Connected as @${esc(account.username)}. Your Discord account keeps ownership of this profile.</p><label class="form-field">Display name<input name="name" required maxlength="80" value="${esc(account.name)}"></label><label class="form-field">Main skill area<input name="category" required maxlength="80" value="${esc(p.category || "Technology")}"></label><label class="form-field">Skills and experience<textarea name="summary" maxlength="2000">${esc(p.summary || "")}</textarea></label><label class="form-field">Services and availability<textarea name="services" maxlength="2000">${esc(p.services || "")}</textarea></label><p class="small muted">This changes your portal display name. Your Discord username stays linked to your account.</p>`,
      (f) => api("/api/profile", f),
    );
  }
  const proposalFields = [
    ["problem", "Problem or opportunity", "What could this solve or improve?"],
    ["audience", "Who is it for?", "Who would use it or benefit?"],
    [
      "difference",
      "What makes it different?",
      "Alternatives, advantages or open questions",
    ],
    [
      "resources",
      "What would we need?",
      "Skills, collaborators, resources or tools",
    ],
    ["firstStep", "The first step", "The simplest way to test the idea"],
    ["reference", "References and inspiration", "Links, examples or notes"],
  ];
  function proposalDetails(values) {
    return proposalFields
      .map(
        ([key, label]) =>
          `<h3>${esc(label)}</h3><p class="shared-text${values[key] ? "" : " muted"}">${esc(values[key] || "Not provided yet.")}</p>`,
      )
      .join("");
  }
  function editPost(id) {
    if (!requireAccount()) return;
    let p = community.posts.find((x) => x.id === id) || {};
    formTab(
      "member-post-editor-" + (id || "new"),
      id ? "Edit my idea" : "Share an idea",
      `<p class="small muted">Based on the community proposal template. Keep it brief, ideally around 200 words. A rough idea is welcome; the extra fields are optional.</p><label class="form-field">Project name<input name="title" required maxlength="120" value="${esc(p.title || "")}"></label><label class="form-field">Theme<select name="category">${categories
        .slice(1)
        .map(
          (c) =>
            `<option ${c === p.category ? "selected" : ""}>${esc(c)}</option>`,
        )
        .join(
          "",
        )}</select></label><label class="form-field">The idea<textarea name="body" required maxlength="8000" placeholder="Explain it in two or three sentences">${esc(p.body || "")}</textarea></label><div class="form-grid">${proposalFields.map(([key, label, prompt]) => `<label class="form-field">${esc(label)}<textarea name="${key}" maxlength="2000" placeholder="${esc(prompt)}">${esc(p.details?.[key] || "")}</textarea></label>`).join("")}</div>`,
      (f) => api("/api/posts", { ...f, id: id || "" }),
    );
  }
  async function thread(target, host) {
    host.innerHTML = '<p class="muted">Loading community comments…</p>';
    try {
      let data = await api(
        "/api/comments?target=" + encodeURIComponent(target),
      );
      if (!host.isConnected) return;
      host.innerHTML = `<h3>Community comments · ${data.comments.length}</h3>${data.comments.map((c) => `<div class="request-comment"><strong>${memberName(c.author)}</strong><small> · ${esc(new Date(c.created * 1000).toLocaleString())}</small><p class="shared-text">${esc(c.body)}</p></div>`).join("") || '<p class="muted">Start the conversation.</p>'}${account ? '<form><label class="form-field">Add a comment<textarea name="body" required maxlength="4000"></textarea></label><p class="form-error" role="alert"></p><button class="btn" type="submit">Post comment</button></form>' : ""}`;
      window.MF?.rulesReminder?.(host);
      let form = host.querySelector("form");
      if (form) {
        form.id = "comments-" + target;
        window.MF?.bindDraft?.(form);
      }
      if (form)
        form.onsubmit = async (e) => {
          e.preventDefault();
          const b = form.querySelector("button");
          b.disabled = true;
          try {
            await api("/api/comments", {
              target,
              body: new FormData(form).get("body"),
            });
            window.MF?.clearDraft?.(form);
            await refreshMembers();
            await thread(target, host);
          } catch (err) {
            form.querySelector(".form-error").textContent = err.message;
            b.disabled = false;
          }
        };
    } catch (err) {
      host.textContent = err.message;
    }
  }
  function openShared(id) {
    let p = community.posts.find((x) => x.id === id);
    if (!p) return;
    let d =
      document.getElementById("shared-idea-" + id) ||
      createDialog("shared-idea-" + id, p.title);
    d.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><span class="tag">${esc(p.category)}</span><button class="close" aria-label="Close idea">×</button></div><h2>${esc(p.title)}</h2><p>${memberName(p.author)} · ${esc(new Date(p.created * 1000).toLocaleDateString())}</p><h3>The idea</h3><p class="shared-text">${esc(p.body)}</p>${proposalDetails(p.details || {})}${account?.id === p.uid ? '<button class="btn secondary" data-edit-shared>Edit my idea</button>' : ""}<section class="shared-thread"></section></div>`;
    d.querySelector(".close").onclick = () => d.close();
    if (d.querySelector("[data-edit-shared]"))
      d.querySelector("[data-edit-shared]").onclick = () => editPost(id);
    d.showModal();
    thread("Ideas:" + id, d.querySelector(".shared-thread"));
  }
  const openOriginalIdea = openIdea;
  openIdea = function (id) {
    if (community.posts.some((p) => p.id === id)) {
      openShared(id);
      return;
    }
    openOriginalIdea(id);
  };
  const board = renderBoard;
  renderBoard = function () {
    board();
    $("#new-idea").onclick = () => editPost();
  };
  const restoreMemberPane = restorePane;
  restorePane = function (id) {
    let match = id.match(/^pane-shared-idea-(live-[a-f0-9]+)$/);
    if (match) {
      openShared(match[1]);
      return;
    }
    restoreMemberPane(id);
  };
  const detail = renderDetail;
  renderDetail = function () {
    detail();
    let host = $("#detail-content .thread");
    if (host) thread("Ideas:" + currentId, host);
  };
  const featureDetail = renderRequestDetail;
  renderRequestDetail = function () {
    featureDetail();
    let host = requestDialog.querySelector(".thread");
    if (host) thread("Features:" + openRequestId, host);
  };
  editMySkills = editProfile;
  // Imported historical profiles remain attributed summaries; live accounts cannot claim them by name.
  window.MF = {
    api,
    refresh: refreshMembers,
    thread,
    formTab,
    requireAccount,
    editPost,
    editProfile,
    get account() {
      return account;
    },
    get community() {
      return community;
    },
  };
  refreshMembers()
    .then(() => render())
    .catch((e) => {
      accountBox.textContent =
        "Member services unavailable. Refresh to try again.";
    });
}
