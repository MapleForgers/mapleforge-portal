// Keep everyday navigation together, followed by people and community planning.
{
  const navigation = document.querySelector(".nav");
  const groups = [
    ["bookmarks", "rules"],
    ["activity", "ideas", "tasks", "contributions"],
    ["people", "exchange", "resource"],
    ["framework", "governance", "process", "requests"],
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
  document.addEventListener('toggle', event => {
    if (event.target.id !== 'sidebar-settings' || !event.target.open) return;
    const box = event.target.querySelector('summary').getBoundingClientRect();
    const panel = event.target.querySelector('.settings-fields');
    const width = Math.min(300, window.innerWidth - 24);
    panel.style.width = width + 'px';
    panel.style.left = Math.max(12, Math.min(box.left, window.innerWidth - width - 12)) + 'px';
    panel.style.top = Math.max(12, box.top - panel.getBoundingClientRect().height - 8) + 'px';
  }, true);
  document.addEventListener('click', event => {
    if (settings()?.open && !settings().contains(event.target)) close();
  });
  document.addEventListener('change', event => {
    if (event.target.closest('#sidebar-settings')) close();
  }, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && settings()?.open) {
      close(); settings().querySelector('summary').focus();
    }
  });
  window.addEventListener('resize', close);
}
