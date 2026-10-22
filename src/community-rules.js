// Community rules transcribed from MapleForge's published server-rules image.
{
  sectionLabels.rules = "Community Rules";
  const rules = [
    "BE KIND OR BE BANNED",
    "No hate speech or discrimination",
    "No Politics or Religion",
    "No immigration/Temporary Foreign Worker/Labour Market Impact Assessment Related Posts/Comments",
    "No Inflammatory / Divisive Posts",
    "Bring Your Struggle, Not Your Grievance",
    "No Spam/Bots/Advertising",
  ];
  const nav = document.createElement("button");
  nav.dataset.view = "rules";
  nav.textContent = "Community Rules";
  nav.onclick = () => switchSection("rules");
  document.querySelector('.nav [data-view="process"]').after(nav);
  const previousRender = render;
  render = function () {
    previousRender();
    if (view !== "rules") return;
    document.getElementById("main").innerHTML =
      `<section class="framework-page"><div class="board-head"><div><span class="tag">Our community</span><h1>Community Rules</h1><p>Keep our culture focused on productive solutions and concept development.</p></div></div><section class="panel"><p>MapleForge uses the rules shared in its Discord server, adapted from r/CanadaJobs. Difficulties and constructive criticism have a place here. The aim is to avoid division and unnecessary friction, without toxic positivity or ignoring real problems.</p><ol class="community-rules-list">${rules.map((rule) => `<li>${esc(rule)}</li>`).join("")}</ol></section><p class="small muted">Transcribed from the rules image posted in MapleForge’s #server-rules on October 21, 2026. The post labels these rules “subject to change.” This is a dated copy, not an automatic sync.</p><p><a href="https://discord.com/channels/1562193716423430334/1562545172351291503/1562545380829302804" target="_blank" rel="noopener noreferrer">View the original server rules ↗</a></p></section>`;
  };
  function reminder(host) {
    if (!host || host.querySelector(".community-rules-reminder")) return;
    const note = document.createElement("p");
    note.className = "small muted community-rules-reminder";
    note.append("Keep it kind and constructive. ");
    const button = document.createElement("button");
    button.className = "btn link";
    button.type = "button";
    button.textContent = "Community Rules";
    button.onclick = () => switchSection("rules");
    note.append(button);
    host.append(note);
  }
  if (window.MF) MF.rulesReminder = reminder;
}
