// The displayed revision identifies the source used to build this page.
{
  const release = document.createElement('div');
  release.className = 'portal-version';
  release.innerHTML = `<span title="Build ${PORTAL_BUILD.commit}">Version ${PORTAL_BUILD.short}</span><button type="button" hidden>Update available · Reload</button>`;
  document.querySelector('.section-tabs').append(release);
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
