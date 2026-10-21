const peopleEnsure = ensureCommunity;
ensureCommunity = function () {
  peopleEnsure();
  state.mySkillProfile = state.mySkillProfile || null;
};
ensureCommunity();
let peopleSearch = "",
  peopleCategory = "All skills";
const peopleItems = () => [
  ...(window.MF?.profiles || []),
  ...(state.mySkillProfile ? [state.mySkillProfile] : []),
  ...peopleSeeds,
];
const peopleNav = document.createElement("button");
peopleNav.dataset.view = "people";
peopleNav.innerHTML = `<span>${icon("people")}</span><span>People & skills</span>`;
$(".nav").append(peopleNav);
const beforePeopleRender = render;
render = function () {
  ensureCommunity();
  if (view !== "people") {
    beforePeopleRender();
    return;
  }
  document.body.dataset.theme = state.preferences.theme;
  $$("[data-view]").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === view),
  );
  renderPeople();
  addPreferences();
};
function renderPeople() {
  $("#main").innerHTML =
    `<div class="board-head"><div><div class="eyebrow">OUR COMMUNITY TOOLBOX</div><h1>People & skills</h1><p class="muted">Find the people, talents and services that could help an idea grow.</p></div><button class="btn orange" id="my-skills">${state.mySkillProfile ? "Edit" : "Add"} my profile</button></div><p class="source-note">${peopleSeeds.length} profiles summarized from members’ own Discord posts, awaiting member review. Skills do not imply current availability. Verified members can maintain their own portal profiles.</p><div class="request-tools"><input id="people-search" type="search" aria-label="Search people and skills" placeholder="Search a member, skill or service…" value="${esc(peopleSearch)}"><select id="people-category" aria-label="Skill category">${["All skills", ...new Set(peopleSeeds.map((p) => p.category))].map((c) => `<option ${c === peopleCategory ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></div><div id="people-results" class="request-list"></div>`;
  $("#my-skills").onclick = editMySkills;
  $("#people-search").oninput = (e) => {
    peopleSearch = e.target.value;
    renderPeopleResults();
  };
  $("#people-category").onchange = (e) => {
    peopleCategory = e.target.value;
    renderPeopleResults();
  };
  renderPeopleResults();
}
function renderPeopleResults() {
  let rows = peopleItems().filter(
    (p) =>
      (peopleCategory === "All skills" || p.category === peopleCategory) &&
      `${p.name} ${p.summary} ${p.services}`
        .toLowerCase()
        .includes(peopleSearch.toLowerCase()),
  );
  $("#people-results").innerHTML =
    rows
      .map(
        (p) =>
          `<article class="request-item people-row"><span class="avatar">${esc(initials(p.name))}</span><div><div class="request-meta"><h3><button class="title-btn" data-person="${p.id}">${memberName(p.name)}</button></h3><span class="tag">${esc(p.category)}</span></div><p>${esc(p.summary)}</p><div class="request-meta"><span>${p.sources.length ? "From Discord · awaiting member review" : "Member profile"}</span><button class="btn link" data-person="${p.id}">View skills & services →</button></div></div></article>`,
      )
      .join("") || '<div class="empty">No matching people or skills.</div>';
  $$("[data-person]").forEach(
    (b) => (b.onclick = () => openPerson(b.dataset.person)),
  );
}
const personDialog = createDialog("person-detail", "Member skills");
function openPerson(id) {
  let p = peopleItems().find((p) => p.id === id);
  if (!p) return;
  personDialog.dataset.recordId = id;
  personDialog.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><span class="tag">${esc(p.category)}</span><button class="close" aria-label="Close member skills">×</button></div><h2>${memberName(p.name)}</h2><h3>Skills & experience</h3><p>${esc(p.summary)}</p><h3>Services & availability</h3><p>${esc(p.services)}</p>${p.sources.length ? `<p class="source-note">Summarized from this member’s own words. The member has not yet reviewed this profile in the portal.</p><h3>Sources</h3>${p.sources.map((s, i) => `<p><a href="${esc(s.url)}" target="_blank" rel="noopener">Discord post ${i + 1} ↗</a></p>`).join("")}` : '<button class="btn" id="edit-own-skills">Edit my profile</button><p class="source-note">Verified Discord profile.</p>'}</div>`;
  personDialog.querySelector(".close").onclick = () => personDialog.close();
  if ($("#edit-own-skills")) $("#edit-own-skills").onclick = editMySkills;
  personDialog.showModal();
}
function editMySkills() {
  let p = state.mySkillProfile || {
      name: "Demo member",
      category: "Technology",
      summary: "",
      services: "",
    },
    d = createDialog("my-skills-editor", "My skills profile");
  d.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><h2>My skills & services</h2><button class="close" aria-label="Close profile editor">×</button></div><p class="source-note">Try your own profile here. This preview cannot claim or edit another member’s Discord profile. Verified ownership will be connected later.</p><form><label class="form-field">Display name<input name="name" required maxlength="80" value="${esc(p.name)}"></label><label class="form-field">Category<select name="category">${[...new Set(peopleSeeds.map((p) => p.category))].map((c) => `<option ${p.category === c ? "selected" : ""}>${c}</option>`).join("")}</select></label><label class="form-field">Skills & experience<textarea name="summary" required maxlength="2000">${esc(p.summary)}</textarea></label><label class="form-field">Services & availability<textarea name="services" maxlength="2000" placeholder="What can you help with? Are you available now?">${esc(p.services)}</textarea></label><button type="submit" class="btn orange">Save my profile</button></form></div>`;
  d.querySelector(".close").onclick = () => d.close();
  d.onclose = () => d.remove();
  d.querySelector("form").onsubmit = (e) => {
    e.preventDefault();
    let f = Object.fromEntries(new FormData(e.target));
    for (let k in f) f[k] = f[k].trim();
    if (!f.name || !f.summary) return;
    let existed = !!state.mySkillProfile;
    state.mySkillProfile = { ...f, id: "my-local-skills", sources: [] };
    addActivity(
      "Profiles",
      "People & skills",
      "my-local-skills",
      existed ? "updated their skills profile" : "added a skills profile",
      "",
      f.name,
    );
    persist();
    d.close();
    render();
    toast("Profile saved in this browser");
  };
  d.showModal();
}
