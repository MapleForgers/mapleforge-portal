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
      <p>With your permission, we may copy your ideas, offers of help, profile introductions and replies from #welcome, #company-direction-suggestions, #lobby-chat and #mapleforge-announcements into the portal, credited to your Discord name. Anyone in the MapleForge Discord who has passed server screening and has the preview word can see them. Members are not individually vetted.</p>
      <p>This does not include direct messages or private channels. You can decline and still use the portal.</p>
      <label style="display:block;margin:16px 0"><input type="checkbox" name="existing"> Allow my existing contributions to be included.</label>
      <label style="display:block;margin:16px 0"><input type="checkbox" name="future"> Allow future relevant contributions to be included.</label>
      <p>Change your choices in My content &amp; privacy. Withdrawing a permission automatically hides the imports covered by that choice. Hidden entries keep anonymous placeholders and counts. Older imports stay hidden until their author is linked to a verified Discord ID and has opted in. Contact a portal administrator to request permanent removal. Server recovery backups expire within 30 days; unconsented originals are deleted after 30 days of being hidden, leaving anonymous counts.</p>
      <p role="alert" data-error></p><button type="submit" class="btn">Save my choices</button> <button type="button" class="btn secondary" data-decline>Decline both</button>
      <p><small>Notice version: 2026-10-22-v2</small></p></form>`;
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
        await M.refresh(); render();
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
