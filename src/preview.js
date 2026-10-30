// Static previews share the navigation interface without impersonating a member
// or connecting to production APIs. Live identity is still provided by members.js.
if (location.hostname !== 'maple-forge.ca' && !window.MF) {
  const message = 'Local preview: shared accounts, posts and chat require the configured backend.';
  const unavailable = () => { toast(message); return false; };
  window.MF = {
    preview: true,
    account: null,
    community: { posts: [], profiles: [] },
    async api() { throw new Error(message); },
    async refresh() { await window.MF.hydrate?.(); },
    requireAccount: unavailable,
    formTab: unavailable,
    editPost: unavailable,
    editProfile: unavailable,
    thread(target, host) { host.textContent = message; },
  };
  const notice = document.createElement('p');
  notice.className = 'small muted';
  notice.textContent = 'Local preview · shared services offline';
  document.querySelector('.sidebar-bottom').prepend(notice);
  // Hydration is installed by later modules in the same script bundle.
  queueMicrotask(async () => { await window.MF.refresh(); render(); });
}
