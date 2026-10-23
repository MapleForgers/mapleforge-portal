// Related directories share navigation, while their existing URLs and data stay intact.
{
  const destinations = {people: 'People & skills', details: 'Member details', exchange: 'Available skills', resource: 'Available resources'};
  const before = render;
  function decoratePeopleHub() {
    if (!destinations[view]) return;
    const main = document.getElementById('main');
    if (main.querySelector('.people-hub')) return;
    main.querySelector('h1')?.classList.add('hub-view-title');
    const header = document.createElement('header');
    header.className = 'people-hub';
    header.innerHTML = '<h1>People & resources</h1><nav aria-label="People and resources sections" class="hub-tabs"></nav>';
    const tabs = header.querySelector('nav');
    Object.entries(destinations).forEach(([id, label]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.setAttribute('aria-current', id === view ? 'page' : 'false');
      button.onclick = () => switchSection(id);
      tabs.append(button);
    });
    main.prepend(header);
    document.querySelector('.nav [data-view="people"]')?.classList.add('active');
  };
  render = function () { before(); decoratePeopleHub(); };
  // Filters can redraw an individual directory without calling the global renderer.
  new MutationObserver(decoratePeopleHub).observe(document.getElementById('main'), {childList:true});
  const sidebar = document.querySelector('.sidebar');
  sidebar.id = 'portal-navigation';
  const mobile = window.matchMedia('(max-width: 900px)');
  const backdrop = document.createElement('button');
  backdrop.className = 'mobile-nav-backdrop';
  backdrop.setAttribute('aria-label', 'Close navigation');
  backdrop.hidden = true;
  document.body.append(backdrop);
  const close = document.createElement('button');
  close.className = 'mobile-menu-close';
  close.textContent = 'Close menu ×';
  sidebar.prepend(close);
  let opener;
  function setMenu(open) {
    const visible = open && mobile.matches;
    document.body.classList.toggle('mobile-menu-open', visible);
    backdrop.hidden = !visible;
    sidebar.inert = mobile.matches && !visible;
    document.querySelector('.mobile-menu-toggle')?.setAttribute('aria-expanded', String(visible));
    if (visible) { opener = document.activeElement; close.focus(); }
    else if (sidebar.contains(document.activeElement)) (opener?.isConnected ? opener : document.querySelector('.mobile-menu-toggle'))?.focus();
  }
  backdrop.onclick = close.onclick = () => setMenu(false);
  sidebar.addEventListener('click', event => {
    if (event.target.closest('[data-view]')) setMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (!document.body.classList.contains('mobile-menu-open')) return;
    if (event.key === 'Escape') { setMenu(false); return; }
    if (event.key !== 'Tab') return;
    const items = [...sidebar.querySelectorAll('button,a,summary,input,select,[tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  mobile.addEventListener('change', () => setMenu(false));
  const drawBefore = drawSectionTabs;
  drawSectionTabs = function () {
    drawBefore();
    const menu = document.createElement('button');
    menu.className = 'mobile-menu-toggle';
    menu.textContent = '☰ Menu';
    menu.setAttribute('aria-controls', sidebar.id);
    menu.setAttribute('aria-expanded', String(document.body.classList.contains('mobile-menu-open')));
    menu.onclick = () => setMenu(!document.body.classList.contains('mobile-menu-open'));
    sectionStrip.prepend(menu);
    const newTab = document.createElement('button');
    newTab.className = 'workspace-new-tab';
    newTab.innerHTML = '<span class="new-tab-full">Open next in new tab</span><span class="new-tab-short" aria-hidden="true">＋ Tab</span>';
    newTab.setAttribute('aria-label', 'Open next in new tab');
    newTab.title = 'Keep this view when opening the next section or item. You can also Ctrl-click or Command-click.';
    newTab.setAttribute('aria-pressed', String(openNextWorkspaceTab));
    newTab.onclick = () => {
      openNextWorkspaceTab = !openNextWorkspaceTab;
      newTab.setAttribute('aria-pressed', String(openNextWorkspaceTab));
    };
    menu.after(newTab);
  };
  setMenu(false);
  render();
}
