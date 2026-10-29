// A separate discussion draft. It does not change existing project stages or votes.
{
  sectionLabels.framework = "Project Framework";
  const link = document.createElement("button");
  link.dataset.view = "framework";
  link.textContent = "Project Framework";
  link.onclick = () => switchSection("framework");
  (
    document.querySelector('.nav [data-view="resource"]') ||
    document.querySelector('.nav [data-view="people"]')
  ).after(link);
  const phases = [
    [
      "Ideate",
      "Submission window to agree",
      "Anyone can pitch using the idea submission template. Collect proposals during a defined window before selecting a shortlist.",
      [
        "Project name and short idea",
        "Problem, audience and differentiation",
        "Resources needed, first step and references",
      ],
    ],
    [
      "Shortlist vote",
      "48 hours proposed",
      "Members rank their top three ideas, or two when only two exist. The top three advance. A single idea goes directly to Challenge.",
      [
        "Agree how ranked votes are counted",
        "Decide ties and treatment of small rounds",
        "Formal ballots are not enabled in this section",
      ],
    ],
    [
      "Challenge",
      "48 hours proposed",
      "Improve each shortlisted idea through research and constructive challenge. Organize contributions as a SWOT review.",
      [
        "Strengths: what gives it an edge?",
        "Weaknesses: where is it thin or risky?",
        "Opportunities: what could it tap into?",
        "Threats: what could stop it?",
      ],
    ],
    [
      "Refine and final vote",
      "24 hours to refine; vote window to agree",
      "Improve proposals using the challenge feedback, then select the leading concept. Second and third enter the concept backlog.",
      [
        "Keep the reasoning visible",
        "Other groups may pursue concepts in parallel",
        "Agree how many projects the community can support",
      ],
    ],
    [
      "Scope, team and test",
      "Sign-up target and deadline to agree",
      "Form an interested team, define the smallest useful product or service, then test demand with a landing page and expression-of-interest sign-up.",
      [
        "Audience and personas",
        "Problem and value proposition",
        "Base features, pricing and visual mockup",
        "People, missing skills and commitments",
        "Set the sign-up threshold and deadline before testing",
      ],
    ],
    [
      "Build MVP and iterate",
      "Sales target to agree",
      "When the demand test passes, form the necessary teams and build the minimum viable product or service. Learn from users and improve it.",
      [
        "Development and project coordination",
        "Implementation and operational leads",
        "Sales, marketing and ongoing support",
        "Proposed bootstrapping and contributor agreements",
        "Ownership measures and incorporation trigger remain open questions",
      ],
    ],
    [
      "Review",
      "Ongoing",
      "Review the concept and the process, including concepts that did not pass the demand test.",
      [
        "Continue, return to backlog or stop",
        "Document lessons and evidence",
        "Review roles, governance and issue handling",
        "Hear from every contributor and improve the next cycle",
      ],
    ],
  ];
  let selectedPhase = -1;
  window.openFrameworkDiscussion = function (id) {
    const phase = id.match(/-phase-([1-7])$/);
    selectedPhase = phase ? Number(phase[1]) - 1 : -1;
    switchSection("framework");
  };
  const questions = [
    "What would make submitting an idea easy? How long should submissions stay open?",
    "How should rankings and ties work? Is 48 hours enough for everyone to participate?",
    "How can we challenge an idea constructively? What evidence should we ask for?",
    "What should the final vote decide? How much parallel work can we realistically support?",
    "What counts as enough interest to build? Who sets the target and commits to the team?",
    "Which roles are essential? How should contributions, ownership and the sales target be agreed?",
    "How do we decide to continue, pause or stop? What lessons should every project share?",
  ];
  function renderFramework() {
    if (!window.MF?.framework) {
      $("#main").innerHTML = '<section class="framework-page"><h1>Project Framework</h1><p>No framework has been added to the portal.</p></section>';
      return;
    }
    const phase = phases[selectedPhase];
    const name = phase ? phase[0] : "The whole framework";
    const target =
      "Framework:project-framework-v01" +
      (phase ? "-phase-" + (selectedPhase + 1) : "");
    const source = window.MF?.framework?.source;
    const sourceLink =
      source && /^https:\/\/docs\.google\.com\/presentation\/d\//.test(source)
        ? `<a href="${esc(source)}" target="_blank" rel="noopener noreferrer">Source presentation ↗</a>`
        : "";
    const chooser = (index, label) =>
      `<button class="btn secondary ${selectedPhase === index ? "selected" : ""}" aria-pressed="${selectedPhase === index}" data-framework-phase="${index}">${esc(label)}</button>`;
    document.getElementById("main").innerHTML =
      `<section class="framework-page">
      <header class="framework-header"><h1>Project Framework</h1><span class="tag">Discussion draft · v0.1</span>${sourceLink}</header>
      <p class="small muted">These are proposals for discussion. Timings and decisions are not adopted or enforced yet.</p>
      <nav class="filter-chips framework-picker" aria-label="Framework phases">${chooser(-1, "Overview")}${phases.map(([label], i) => chooser(i, i + 1 + ". " + label)).join("")}</nav>
      <section class="panel framework-focus" aria-label="Selected framework phase">
        <h2 tabindex="-1" id="framework-focus-title">${phase ? selectedPhase + 1 + ". " : ""}${esc(name)}</h2>
        ${phase ? `<span class="tag">${esc(phase[1])}</span><p>${esc(phase[2])}</p><ul class="framework-points">${phase[3].map((point, i) => `<li><span>${esc(point)}</span><button class="btn secondary" data-framework-point="${i}">Discuss this point</button></li>`).join("")}</ul>` : `<p>Follow an idea from its first pitch through community review, a demand test and a working project. Open any phase to discuss its details.</p><div class="framework-overview">${phases.map(([label, timing, summary], i) => `<button class="panel" data-framework-phase="${i}"><strong>${i + 1}. ${esc(label)}</strong><span>${esc(summary)}</span><small>${esc(timing)} · Open discussion →</small></button>`).join("")}</div><p><strong>Demand test:</strong> reach the agreed target by the deadline to proceed to building. Otherwise, go to Review and decide whether to improve, backlog or stop.</p>`}
        <div class="framework-prompt"><strong>Start the discussion</strong><p>${esc(phase ? questions[selectedPhase] : "What should we keep, change or add? Is anything missing between these phases? Which decisions do we need to agree on first?")}</p></div>
        <div class="filter-chips">${["Keep", "Change", "Add", "Question"].map((type) => `<button class="btn secondary" data-framework-feedback="${type}">${type === "Question" ? "Ask a question" : type + " something"}</button>`).join("")}</div>
        <p class="small muted">Feedback is shared with everyone in this ${phase ? "phase" : "general"} conversation. Use “Discuss this point” to include the rule you mean.</p>
        <div id="framework-comments"></div>
      </section>
      <nav class="filter-chips" aria-label="Browse framework">${selectedPhase >= 0 ? chooser(selectedPhase - 1, "← " + (selectedPhase === 0 ? "Overview" : "Previous phase")) : ""}${selectedPhase < phases.length - 1 ? chooser(selectedPhase + 1, selectedPhase < 0 ? "Start with Ideate →" : "Next phase →") : ""}</nav>
    </section>`;
    document.querySelectorAll("[data-framework-phase]").forEach((button) => {
      button.onclick = () => {
        selectedPhase = Number(button.dataset.frameworkPhase);
        renderFramework();
        document
          .getElementById("framework-focus-title")
          .focus({ preventScroll: true });
      };
    });
    function feedback(type, pointIndex) {
      if (!window.MF?.requireAccount()) return;
      const point = pointIndex === undefined ? "" : phase[3][pointIndex];
      MF.formTab(
        "framework-feedback-" +
          selectedPhase +
          "-" +
          type +
          "-" +
          (pointIndex ?? "general"),
        type + ": " + name,
        `${point ? `<p><strong>Discussing:</strong> ${esc(point)}</p>` : ""}<label class="form-field">Your feedback<textarea name="body" required maxlength="3500" placeholder="Share your reasoning, suggest an alternative, or ask a question."></textarea></label>`,
        (f) =>
          MF.api("/api/comments", {
            target,
            body: type + (point ? " · " + point : "") + ":\n" + f.body,
          }),
      );
    }
    document
      .querySelectorAll("[data-framework-feedback]")
      .forEach(
        (button) =>
          (button.onclick = () => feedback(button.dataset.frameworkFeedback)),
      );
    document
      .querySelectorAll("[data-framework-point]")
      .forEach(
        (button) =>
          (button.onclick = () =>
            feedback("Discuss", Number(button.dataset.frameworkPoint))),
      );
    const host = document.getElementById("framework-comments");
    if (window.MF) MF.thread(target, host);
    else
      host.textContent =
        "Shared discussions are available in the hosted portal after signing in with Discord.";
  }
  const beforeFramework = render;
  render = function () {
    beforeFramework();
    if (view === "framework") renderFramework();
  };
}

// Restore a shared section link after all section renderers are registered.
if (
  requestedPortalSection &&
  Object.prototype.hasOwnProperty.call(sectionLabels, requestedPortalSection) &&
  requestedPortalSection !== "workspace"
) {
  portalTravel = true;
  try {
    switchSection(requestedPortalSection);
  } finally {
    portalTravel = false;
  }
  portalTrail.length = 0;
  portalTrailIndex = -1;
  drawSectionTabs();
}
