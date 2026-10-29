// Keep everyday navigation together, followed by people and community planning.
{
  const navigation = document.querySelector(".nav");
  ["details", "exchange", "resource"].forEach(id => navigation.querySelector(`[data-view="${id}"]`)?.remove());
  const peopleLink = navigation.querySelector('[data-view="people"]');
  if (peopleLink) peopleLink.textContent = "People & resources";
  const groups = [
    ["bookmarks", "rules"],
    ["activity", "ideas", "tasks", "contributions"],
    ["people", "details", "exchange", "resource"],
    ["framework", "governance", "process", "requests"],
    ["map"],
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
  // Flatten the previously displayed favourites into the same ordered list.
  order = [...order.filter(id => favourites.has(id)), ...order.filter(id => !favourites.has(id))];
  const rows = new Map();
  let dragged = null;
  const regularZone = document.createElement('div');
  regularZone.className = 'nav-regular';
  nav.append(regularZone);
  function persist() {
    links.forEach(link => link.classList.remove('nav-group-start'));
    try { localStorage.setItem(key, JSON.stringify({order})); } catch (_) {}
  }
  function draw() {
    order.forEach(id => regularZone.append(rows.get(id)));
  }
  function move(id, target = null, after = false) {
    if (!ids.includes(id) || target === id) return;
    order = order.filter(item => item !== id);
    const index = target ? order.indexOf(target) : -1;
    order.splice(index < 0 ? order.length : index + Number(after), 0, id);
    persist(); draw();
  }
  [regularZone].forEach(zone => {
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
      move(dragged, target?.dataset.navId, after);
      zone.classList.remove('nav-drop-active');
    });
  });
  function registerLink(link) {
    const id = link.dataset.view;
    if (Array.isArray(saved.order)) link.classList.remove('nav-group-start');
    const row = document.createElement('div');
    row.className = 'personal-nav-row'; row.draggable = true; row.dataset.navId = id;
    link.title = 'Drag to reorder. Keyboard: Alt + Up/Down.';
    const grip = document.createElement('span');
    grip.className = 'nav-drag-grip';
    grip.textContent = '⠿';
    grip.setAttribute('aria-hidden', 'true');
    grip.title = 'Drag to reorder';
    link.addEventListener('keydown', event => {
      if (!event.altKey) return;
      if (!['ArrowUp','ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const group = order;
      const next = group[group.indexOf(id) + (event.key === 'ArrowUp' ? -1 : 1)];
      if (!next) return;
      move(id, next, event.key === 'ArrowDown'); link.focus();
    });
    row.addEventListener('dragstart', event => {
      dragged = id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', id);
      row.classList.add('nav-dragging');
    });
    row.addEventListener('dragend', () => {
      dragged = null; row.classList.remove('nav-dragging');
      regularZone.classList.remove('nav-drop-active');
    });
    row.append(grip, link); rows.set(id, row);
  }
  links.forEach(registerLink);
  MF.registerNav=function(link,after='bookmarks'){
    const id=link.dataset.view;if(rows.has(id))return;
    links.push(link);ids.push(id);registerLink(link);
    if(Array.isArray(saved.order)&&saved.order.includes(id))order=[...new Set([...saved.order.filter(x=>ids.includes(x)),...order,id])];
    else order.splice(Math.max(0,order.indexOf(after)+1),0,id);
    persist();draw();
  };
  MF.removeNav=function(id){rows.get(id)?.remove();rows.delete(id);order=order.filter(x=>x!==id);const i=ids.indexOf(id);if(i>=0)ids.splice(i,1);};
  draw();
}
