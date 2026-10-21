// A separate discussion draft. It does not change existing project stages or votes.
{
  sectionLabels.framework = "Project Framework";
  const link = document.createElement("button");
  link.dataset.view = "framework";
  link.textContent = "Project Framework";
  link.onclick = () => switchSection("framework");
  document.querySelector('.nav [data-view="resource"]').after(link);
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
  function renderFramework() {
    const source = window.MF?.framework?.source;
    const sourceLink =
      source && /^https:\/\/docs\.google\.com\/presentation\/d\//.test(source)
        ? `<p><a href="${esc(source)}" target="_blank" rel="noopener noreferrer">Read the source presentation ↗</a></p>`
        : "";
    document.getElementById("main").innerHTML =
      `<section class="framework-page"><div class="board-head"><div><span class="tag">Discussion draft · v0.1 · October 2026</span><h1>Project Framework</h1><p class="muted">From an idea to a working project, with room to learn and improve together.</p></div></div><p>This is a separate preview of the proposed framework. Its timings and decision rules are open for discussion. Existing idea stages and support votes continue to work as before.</p>${sourceLink}<nav class="filter-chips" aria-label="Framework phases">${phases.map(([name], i) => `<button class="btn secondary" data-framework-phase="${i}">${i + 1}. ${esc(name)}</button>`).join("")}</nav><div class="framework-phases">${phases.map(([name, timing, summary, points], i) => `<section class="panel framework-phase" id="framework-phase-${i}"><span class="small muted">PHASE ${i + 1} · ${esc(timing)}</span><h2 tabindex="-1">${esc(name)}</h2><p>${esc(summary)}</p><ul>${points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></section>`).join("")}</div><section class="panel"><h2>The demand-test decision</h2><p><strong>Target reached by the deadline:</strong> proceed to Build MVP and iterate.</p><p><strong>Target not reached:</strong> skip the build and go to Review. Decide whether to improve the concept, return it to the backlog or stop.</p><p class="small muted">This is the proposed path, not an automatic gate currently enforced by the portal.</p></section><section class="panel"><h2>Decisions still open</h2><p>Submission window and calendar, cycle cadence, ranked-vote counting and ties, final vote duration, small rounds, parallel project capacity, demand-test targets, sales targets, ownership arrangements, issue management and shared templates.</p><p>The draft calls for group input and legal advice on contributor protection and ownership before those arrangements are finalized.</p></section><section class="panel"><h2>Keep, change or add</h2><p>What should stay? What would you change? What is missing? Feedback here is saved for the community.</p><div class="filter-chips">${["Keep", "Change", "Add"].map((t) => `<button class="btn secondary" data-framework-feedback="${t}">${t}</button>`).join("")}</div><div id="framework-comments"></div></section></section>`;
    document.querySelectorAll("[data-framework-phase]").forEach(
      (b) =>
        (b.onclick = () => {
          const h = document.querySelector(
            "#framework-phase-" + b.dataset.frameworkPhase + " h2",
          );
          h.focus({ preventScroll: true });
          h.scrollIntoView({
            block: "start",
            behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "instant"
              : "smooth",
          });
        }),
    );
    document.querySelectorAll("[data-framework-feedback]").forEach(
      (b) =>
        (b.onclick = () => {
          if (!window.MF?.requireAccount()) return;
          const type = b.dataset.frameworkFeedback;
          MF.formTab(
            "framework-feedback-" + type,
            type + " feedback",
            `<label class="form-field">Your feedback<textarea name="body" required maxlength="3800" placeholder="Which phase or rule are you commenting on?"></textarea></label>`,
            (f) =>
              MF.api("/api/comments", {
                target: "Framework:project-framework-v01",
                body: type + ": " + f.body,
              }),
          );
        }),
    );
    if (window.MF)
      MF.thread(
        "Framework:project-framework-v01",
        document.getElementById("framework-comments"),
      );
    else
      document.getElementById("framework-comments").textContent =
        "Shared feedback is available in the hosted portal after signing in with Discord.";
  }
  const beforeFramework = render;
  render = function () {
    beforeFramework();
    if (view === "framework") renderFramework();
  };
}
