// Skill labels summarize profile text, not verified qualifications or availability.
const skillRules = [
  ["Graphic design", /graphic design/i],
  ["Product & UX design", /product design|UI\/UX/i],
  [
    "Software development",
    /software engineering|software, cloud|full.stack|web and mobile|backend|embedded/i,
  ],
  ["Data & analytics", /data |data,|data\b|visualization|SQL|Databricks/i],
  ["AI & machine learning", /AI\b|machine learning|ML\b/i],
  ["Cloud & DevOps", /cloud|DevOps|Azure|deployment|hosting|Lightsail/i],
  ["Project management", /project management|program management/i],
  ["Business analysis", /business analys|process mapping/i],
  [
    "Operations & logistics",
    /operations|logistics|procurement|inventory|sourcing/i,
  ],
  [
    "Marketing & communications",
    /marketing|communications|brand building|keynote/i,
  ],
  ["Film & photography", /film|photography|cinematography|video|VFX/i],
  [
    "Arts & crafts",
    /beadwork|fibre arts|fashion|painting|macrame|music|sound engineering/i,
  ],
  [
    "Teaching & research",
    /teaching|psychology research|peer support, education/i,
  ],
  [
    "Community support",
    /peer support|customer service|Discord community|relationship/i,
  ],
  ["Business systems", /system management/i],
  ["Trades & practical work", /HVACR|solar|gardening|farming|food service/i],
  ["Governance & coordination", /governance|stakeholder|risk|vendor|teams/i],
];
function profileSkills(p) {
  return skillRules
    .filter(([, rule]) => rule.test(p.summary))
    .map(([name]) => name);
}
let peopleMode = "people",
  peopleSort = "name",
  peopleSkill = "",
  peopleOffers = false;
const skillEntries = () =>
  skillRules
    .map(([name]) => ({
      name,
      people: peopleItems().filter((p) => profileSkills(p).includes(name)),
    }))
    .filter((x) => x.people.length);
const hasSkillOffer = (p) => /^Offered\b/i.test(p.services);
function filteredPeople() {
  let rows = peopleItems().filter(
    (p) =>
      (peopleCategory === "All skills" || p.category === peopleCategory) &&
      (!peopleSkill || profileSkills(p).includes(peopleSkill)) &&
      (!peopleOffers || hasSkillOffer(p)) &&
      `${p.name} ${p.summary} ${p.services} ${profileSkills(p).join(" ")}`
        .toLowerCase()
        .includes(peopleSearch.toLowerCase()),
  );
  return rows.sort((a, b) =>
    peopleSort === "category"
      ? a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
      : peopleSort === "skills"
        ? profileSkills(b).length - profileSkills(a).length ||
          a.name.localeCompare(b.name)
        : a.name.localeCompare(b.name),
  );
}
function peopleChip(label, count, active, attribute, value) {
  return `<button class="filter-chip ${active ? "selected" : ""}" aria-pressed="${active}" ${attribute}="${esc(value)}">${esc(label)} <span>${count}</span></button>`;
}
renderPeople = function () {
  let all = peopleItems(),
    categories = [...new Set(all.map((p) => p.category))].sort(),
    skills = skillEntries(),
    max = Math.max(
      ...categories.map((c) => all.filter((p) => p.category === c).length),
      1,
    );
  $("#main").innerHTML =
    `<div class="board-head"><div><div class="eyebrow">OUR COMMUNITY TOOLBOX</div><h1>People & skills</h1><p class="muted">Find your people. Connect a skill to the next good idea.</p></div><button class="btn orange" id="my-skills">${state.mySkillProfile ? "Edit" : "Add"} my profile</button></div><section class="people-overview" aria-label="Community skills overview"><div class="people-stats"><div><strong>${all.length}</strong><span>people listed</span></div><div><strong>${skills.length}</strong><span>skill areas</span></div><div><strong>${all.filter(hasSkillOffer).length}</strong><span>recorded offers to help</span></div></div><div class="skill-chart"><h3>Where our experience is</h3><p class="small muted">Select a bar to explore that group. Counts include all listed profiles.</p><div class="skill-bars">${categories
      .map((c) => {
        let n = all.filter((p) => p.category === c).length;
        return `<button class="skill-bar ${peopleCategory === c ? "selected" : ""}" data-chart-category="${esc(c)}" aria-label="${esc(c)}: ${n} ${n === 1 ? "person" : "people"}" aria-pressed="${peopleCategory === c}"><span>${esc(c)}</span><span class="skill-bar-track"><span style="width:${(n / max) * 100}%"></span></span><strong>${n}</strong></button>`;
      })
      .join(
        "",
      )}</div></div></section><p class="source-note">Profiles and skill labels summarize members’ Discord posts and await member review. Offers are historical, not confirmation of current availability. Preview edits stay in this browser.</p><div id="people-category-buttons" class="filter-chips" aria-label="Filter people by field"></div><div class="people-explorer-tools"><div class="filter-chips" aria-label="Browse mode"><button class="filter-chip ${peopleMode === "people" ? "selected" : ""}" aria-pressed="${peopleMode === "people"}" data-people-mode="people">People directory</button><button class="filter-chip ${peopleMode === "skills" ? "selected" : ""}" aria-pressed="${peopleMode === "skills"}" data-people-mode="skills">Skills & people map</button></div><input id="people-search" type="search" aria-label="Search people and skills" placeholder="Search names, skills or services…" value="${esc(peopleSearch)}"><label>Sort <select id="people-sort"><option value="name" ${peopleSort === "name" ? "selected" : ""}>Name A to Z</option><option value="category" ${peopleSort === "category" ? "selected" : ""}>Field, then name</option><option value="skills" ${peopleSort === "skills" ? "selected" : ""}>Most skill areas</option></select></label></div><div class="filter-chips" id="people-skill-buttons" aria-label="Filter by specific skill"></div><div class="people-filter-status"><label><input id="people-offers" type="checkbox" ${peopleOffers ? "checked" : ""}> Recorded offers to help only</label><button class="btn link" id="people-clear">Clear filters</button><span id="people-count" aria-live="polite"></span></div><div id="people-results" class="request-list"></div>`;
  $("#my-skills").onclick = editMySkills;
  $("#people-search").oninput = (e) => {
    peopleSearch = e.target.value;
    renderPeopleResults();
  };
  $("#people-sort").onchange = (e) => {
    peopleSort = e.target.value;
    renderPeopleResults();
  };
  $("#people-offers").onchange = (e) => {
    peopleOffers = e.target.checked;
    renderPeopleResults();
  };
  $("#people-clear").onclick = () => {
    peopleSearch = "";
    peopleCategory = "All skills";
    peopleSkill = "";
    peopleOffers = false;
    renderPeople();
  };
  $$("[data-people-mode]").forEach(
    (b) =>
      (b.onclick = () => {
        peopleMode = b.dataset.peopleMode;
        renderPeople();
      }),
  );
  $$("[data-chart-category]").forEach(
    (b) =>
      (b.onclick = () => {
        peopleCategory =
          peopleCategory === b.dataset.chartCategory
            ? "All skills"
            : b.dataset.chartCategory;
        renderPeople();
      }),
  );
  renderPeopleResults();
};
renderPeopleResults = function () {
  let all = peopleItems(),
    rows = filteredPeople(),
    categories = [...new Set(all.map((p) => p.category))].sort();
  $("#people-category-buttons").innerHTML =
    peopleChip(
      "Everyone",
      all.length,
      peopleCategory === "All skills",
      "data-people-category",
      "All skills",
    ) +
    categories
      .map((c) =>
        peopleChip(
          c,
          all.filter((p) => p.category === c).length,
          peopleCategory === c,
          "data-people-category",
          c,
        ),
      )
      .join("");
  $("#people-skill-buttons").innerHTML = skillEntries()
    .map((s) =>
      peopleChip(
        s.name,
        s.people.length,
        peopleSkill === s.name,
        "data-skill-filter",
        s.name,
      ),
    )
    .join("");
  $("#people-count").textContent =
    `${rows.length} of ${all.length} people${peopleSkill ? " · " + peopleSkill : ""}`;
  $("#people-results").classList.toggle("skills-map", peopleMode === "skills");
  if (peopleMode === "skills") {
    let groups = skillEntries()
      .map((s) => ({
        ...s,
        people: s.people.filter((p) => rows.some((r) => r.id === p.id)),
      }))
      .filter(
        (s) => s.people.length && (!peopleSkill || s.name === peopleSkill),
      );
    if (peopleSort === "skills")
      groups.sort((a, b) => b.people.length - a.people.length);
    else groups.sort((a, b) => a.name.localeCompare(b.name));
    $("#people-results").innerHTML =
      groups
        .map(
          (s) =>
            `<article class="request-item skill-group"><div class="request-meta"><h3>${esc(s.name)}</h3><span class="tag">${s.people.length} ${s.people.length === 1 ? "person" : "people"}</span></div><div class="skill-person-links">${s.people
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(
                (p) =>
                  `<button data-person="${p.id}" class="person-link"><span class="avatar">${esc(initials(p.name))}</span>${memberName(p.name)}</button>`,
              )
              .join(
                "",
              )}</div><button class="btn link" data-skill-directory="${esc(s.name)}">See these people’s experience →</button></article>`,
        )
        .join("") ||
      '<div class="empty">No skills match these filters. Try clearing a filter.</div>';
  } else {
    $("#people-results").innerHTML =
      rows
        .map(
          (p) =>
            `<article class="request-item people-row"><span class="avatar">${esc(initials(p.name))}</span><div><div class="request-meta"><h3><button class="title-btn" data-person="${p.id}">${memberName(p.name)}</button></h3><span class="tag">${esc(p.category)}</span>${hasSkillOffer(p) ? '<span class="tag">Offered to help</span>' : ""}</div><p>${esc(p.summary)}</p><div class="filter-chips skill-tags">${profileSkills(
              p,
            )
              .map(
                (s) =>
                  `<button class="filter-chip ${s === peopleSkill ? "selected" : ""}" data-skill-filter="${esc(s)}">${esc(s)}</button>`,
              )
              .join(
                "",
              )}</div><div class="request-meta"><span>${p.sources.length ? "From Discord · awaiting review" : "Your local draft"}</span><button class="btn link" data-person="${p.id}">View skills & services →</button></div></div></article>`,
        )
        .join("") ||
      '<div class="empty">No people match these filters. Try clearing a filter.</div>';
  }
  $$("[data-person]").forEach(
    (b) => (b.onclick = () => openPerson(b.dataset.person)),
  );
  $$("[data-people-category]").forEach(
    (b) =>
      (b.onclick = () => {
        peopleCategory = b.dataset.peopleCategory;
        renderPeople();
      }),
  );
  $$("[data-skill-filter]").forEach(
    (b) =>
      (b.onclick = () => {
        peopleSkill =
          peopleSkill === b.dataset.skillFilter ? "" : b.dataset.skillFilter;
        renderPeopleResults();
      }),
  );
  $$("[data-skill-directory]").forEach(
    (b) =>
      (b.onclick = () => {
        peopleSkill = b.dataset.skillDirectory;
        peopleMode = "people";
        renderPeople();
      }),
  );
};
const personBeforeConnections = openPerson;
openPerson = function (id) {
  personBeforeConnections(id);
  let p = peopleItems().find((x) => x.id === id),
    skills = profileSkills(p),
    related = peopleItems()
      .filter(
        (x) => x.id !== id && profileSkills(x).some((s) => skills.includes(s)),
      )
      .sort(
        (a, b) =>
          profileSkills(b).filter((s) => skills.includes(s)).length -
          profileSkills(a).filter((s) => skills.includes(s)).length,
      )
      .slice(0, 6);
  personDialog
    .querySelector(".dialog-inner")
    .insertAdjacentHTML(
      "beforeend",
      `<h3>Explore shared skills</h3><p class="small muted">People whose profile summaries mention related experience.</p><div class="skill-person-links">${related.map((x) => `<button class="person-link" data-related-person="${x.id}">${memberName(x.name)}</button>`).join("") || "No related profiles listed yet."}</div>`,
    );
  personDialog
    .querySelectorAll("[data-related-person]")
    .forEach((b) => (b.onclick = () => openPerson(b.dataset.relatedPerson)));
};
