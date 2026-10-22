// The displayed revision identifies the source used to build this page.
{
  const release = document.createElement('div');
  release.className = 'portal-version';
  release.innerHTML = `<a href="https://github.com/GnMohareb/MapleForge/tree/${PORTAL_BUILD.commit}" target="_blank" rel="noopener noreferrer" title="View this version on GitHub">Version ${PORTAL_BUILD.short}</a><button type="button" hidden>Update available · Reload</button>`;
  document.querySelector('.sidebar-bottom').append(release);
  release.querySelector('button').onclick = () => location.reload();
  async function checkVersion() {
    if (document.hidden) return;
    try {
      const response = await fetch('/portal1/version.json', {cache:'no-store', credentials:'same-origin'});
      if (!response.ok) return;
      const latest = await response.json();
      release.querySelector('button').hidden = !latest.commit || latest.commit === PORTAL_BUILD.commit;
    } catch (_) { /* A failed version check must not interrupt the portal. */ }
  }
  checkVersion();
  setInterval(checkVersion, 300000);
  window.addEventListener('focus', checkVersion);
}
