// Keep everyday navigation together, followed by people and community planning.
{
  const navigation = document.querySelector(".nav");
  const groups = [
    ["bookmarks", "rules"],
    ["activity", "ideas", "tasks", "contributions"],
    ["people", "exchange", "resource"],
    ["framework", "debate", "governance", "process", "requests"],
  ];
  groups.forEach((group, groupIndex) =>
    group.forEach((section, index) => {
      const link = navigation.querySelector(`[data-view="${section}"]`);
      if (!link) return;
      link.classList.toggle("nav-group-start", groupIndex > 0 && index === 0);
      link
        .querySelectorAll("svg, [data-icon]")
        .forEach((icon) => icon.remove());
      link.querySelectorAll("span").forEach((span) => {
        if (!span.textContent.trim() && !span.children.length) span.remove();
      });
      navigation.append(link);
    }),
  );
}

document.querySelectorAll(".sidebar .brand").forEach((brand) => {
  brand.innerHTML =
    '<img class="brand-wordmark" src="/mapleforge-wordmark-transparent.png" alt="MapleForge" width="2170" height="725">';
});

// Appearance floats above its trigger and never changes sidebar height.
{
  const settings = () => document.getElementById('sidebar-settings');
  const close = () => { if (settings()) settings().open = false; };
  window.positionAppearance = () => {
    const current = settings();
    if (!current?.open) return;
    const box = current.querySelector('summary').getBoundingClientRect();
    const panel = current.querySelector('.settings-fields');
    const width = Math.min(360, window.innerWidth - 24);
    panel.style.width = width + 'px';
    const sidebarRight = document.querySelector('.sidebar').getBoundingClientRect().right;
    panel.style.left = Math.max(12, Math.min(sidebarRight + 12, window.innerWidth - width - 12)) + 'px';
    panel.style.top = Math.max(12, Math.min(box.top - panel.getBoundingClientRect().height - 8, window.innerHeight - panel.getBoundingClientRect().height - 12)) + 'px';
  };
  document.addEventListener('toggle', event => {
    if (event.target.id === 'sidebar-settings') window.positionAppearance();
  }, true);
  document.addEventListener('click', event => {
    if (settings()?.open && !settings().contains(event.target)) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && settings()?.open) {
      close(); settings().querySelector('summary').focus();
    }
  });
  window.addEventListener('resize', close);
}
