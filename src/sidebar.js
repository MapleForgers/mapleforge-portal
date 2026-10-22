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

// Menu order is a personal browser preference, never shared community content.
{
  const nav = document.querySelector('.sidebar .nav');
  const links = [...nav.querySelectorAll('[data-view]')];
  const ids = links.map(link => link.dataset.view);
  const key = 'mapleforge-navigation-v1';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key)) || {}; } catch (_) {}
  let order = [...new Set([...(Array.isArray(saved.order) ? saved.order : []), ...ids])].filter(id => ids.includes(id));
  const favourites = new Set((Array.isArray(saved.favourites) ? saved.favourites : []).filter(id => ids.includes(id)));
  const rows = new Map();
  let dragged = null;
  const favouriteZone = document.createElement('div');
  favouriteZone.className = 'nav-favourites';
  const heading = document.createElement('div');
  heading.className = 'nav-favourites-heading';
  heading.textContent = 'Favourites';
  const hint = document.createElement('div');
  hint.className = 'nav-drop-hint';
  hint.textContent = 'Drag links here';
  const regularZone = document.createElement('div');
  regularZone.className = 'nav-regular';
  favouriteZone.append(heading, hint);
  nav.append(favouriteZone, regularZone);
  function persist() {
    links.forEach(link => link.classList.remove('nav-group-start'));
    try { localStorage.setItem(key, JSON.stringify({order, favourites:[...favourites]})); } catch (_) {}
  }
  function draw() {
    hint.hidden = favourites.size > 0;
    order.forEach(id => (favourites.has(id) ? favouriteZone : regularZone).append(rows.get(id)));
  }
  function move(id, pinned, target = null, after = false) {
    if (!ids.includes(id) || target === id) return;
    pinned ? favourites.add(id) : favourites.delete(id);
    order = order.filter(item => item !== id);
    const index = target ? order.indexOf(target) : -1;
    order.splice(index < 0 ? order.length : index + Number(after), 0, id);
    persist(); draw();
  }
  [[favouriteZone, true], [regularZone, false]].forEach(([zone, pinned]) => {
    zone.addEventListener('dragover', event => {
      if (!dragged) return;
      event.preventDefault(); event.dataTransfer.dropEffect = 'move';
      zone.classList.add('nav-drop-active');
    });
    zone.addEventListener('dragleave', event => { if (!zone.contains(event.relatedTarget)) zone.classList.remove('nav-drop-active'); });
    zone.addEventListener('drop', event => {
      if (!dragged) return;
      event.preventDefault();
      const target = event.target.closest('[data-nav-id]');
      const after = target ? event.clientY > target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2 : false;
      move(dragged, pinned, target?.dataset.navId, after);
      zone.classList.remove('nav-drop-active');
    });
  });
  links.forEach(link => {
    const id = link.dataset.view;
    if (Array.isArray(saved.order)) link.classList.remove('nav-group-start');
    const row = document.createElement('div');
    row.className = 'personal-nav-row'; row.draggable = true; row.dataset.navId = id;
    link.title = 'Drag to reorder or move into Favourites. Keyboard: Alt + Up/Down to reorder, Alt + F to move in or out of Favourites.';
    link.addEventListener('keydown', event => {
      if (!event.altKey) return;
      if (event.key.toLowerCase() === 'f') {
        event.preventDefault(); move(id, !favourites.has(id)); link.focus(); return;
      }
      if (!['ArrowUp','ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const group = order.filter(item => favourites.has(item) === favourites.has(id));
      const next = group[group.indexOf(id) + (event.key === 'ArrowUp' ? -1 : 1)];
      if (!next) return;
      move(id, favourites.has(id), next, event.key === 'ArrowDown'); link.focus();
    });
    row.addEventListener('dragstart', event => {
      dragged = id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', id);
      row.classList.add('nav-dragging');
    });
    row.addEventListener('dragend', () => {
      dragged = null; row.classList.remove('nav-dragging');
      favouriteZone.classList.remove('nav-drop-active'); regularZone.classList.remove('nav-drop-active');
    });
    row.append(link); rows.set(id, row);
  });
  draw();
}
