// Consent is saved on the server, independently of the Discord OAuth grant.
if (window.MF) {
  const M = window.MF;
  let choice = null, dialog = null, prompted = false;
  M.openDiscordConsent = () => {
    if (!M.account || !choice || dialog) return;
    dialog = document.createElement('dialog');
    dialog.setAttribute('aria-labelledby', 'discord-consent-title');
    dialog.style.cssText = 'max-width:620px;width:calc(100% - 32px);padding:24px;font-size:16px;line-height:1.5';
    dialog.innerHTML = `<form><h2 id="discord-consent-title">Sharing Discord contributions with MapleForge</h2>
      <p>With your permission, we may copy your relevant ideas, offers of help, and replies from designated MapleForge Discord channels into the portal, credited to your Discord name. These contributions will be visible to members with portal access.</p>
      <p>This does not include direct messages or private channels. You can decline and still use the portal.</p>
      <label style="display:block;margin:16px 0"><input type="checkbox" name="existing"> Allow my existing contributions to be included.</label>
      <label style="display:block;margin:16px 0"><input type="checkbox" name="future"> Allow future relevant contributions to be included.</label>
      <p>Change your choices in My content &amp; privacy. Withdrawing permission stops permission for further imports. Contact a portal administrator to request removal of earlier imports, which may need to be matched manually. Restricted recovery backups may retain earlier copies until they expire.</p>
      <p role="alert" data-error></p><button type="submit" class="btn">Save my choices</button> <button type="button" class="btn secondary" data-decline>Decline both</button>
      <p><small>Notice version: 2026-10-22-v1</small></p></form>`;
    const form = dialog.querySelector('form');
    form.elements.existing.checked = choice.answered && choice.existing;
    form.elements.future.checked = choice.answered && choice.future;
    async function save(existing, future) {
      const buttons = [...form.querySelectorAll('button')];
      buttons.forEach(b => b.disabled = true);
      try {
        const result = await M.api('/api/shared', {op:'discord_consent', version:choice.version, existing, future});
        choice = result.discordConsent;
        dialog.close(); dialog.remove(); dialog = null;
      } catch (error) {
        form.querySelector('[data-error]').textContent = error.message;
        buttons.forEach(b => b.disabled = false);
      }
    }
    form.onsubmit = e => { e.preventDefault(); save(form.elements.existing.checked, form.elements.future.checked); };
    form.querySelector('[data-decline]').onclick = () => save(false, false);
    // Escape defers the prompt, without granting permission or blocking portal use.
    dialog.oncancel = () => { const old = dialog; dialog = null; setTimeout(() => old.remove(), 0); };
    document.body.append(dialog); dialog.showModal();
  };
  const hydrate = M.hydrate;
  M.hydrate = async function (...args) {
    await hydrate.apply(this, args);
    choice = M.bookmarkData?.discordConsent;
    if (M.account && choice && !choice.answered && !prompted) {
      prompted = true;
      M.openDiscordConsent();
    }
  };
}
