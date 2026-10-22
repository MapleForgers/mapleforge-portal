// A per-browser display preference. Stored timestamps are never changed.
function portalTimeZone() {
  try { const zone=localStorage.getItem('mapleforge-timezone') || ''; if(zone) new Intl.DateTimeFormat('en',{timeZone:zone}); return zone; } catch (_) { return ''; }
}
function portalFormatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const zone = portalTimeZone();
  const options = {year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'};
  if (zone) options.timeZone = zone;
  return date.toLocaleString(document.documentElement.lang || 'en-CA', options);
}
function portalTimeHtml(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `<span data-portal-time="${date.toISOString()}">${esc(portalFormatTime(value))}</span>`;
}
(function () {
  function refresh() {
    document.querySelectorAll('[data-portal-time]').forEach(node => {
      const text = portalFormatTime(node.dataset.portalTime);
      if (node.textContent !== text) node.textContent = text;
    });
    const langs = document.querySelector('.language-toggle');
    if (!langs || document.getElementById('timezone-toggle')) return;
    const button = document.createElement('button');
    button.id = 'timezone-toggle'; button.type = 'button';
    const french = document.documentElement.lang.startsWith('fr');
    button.textContent = french ? 'Heure' : 'Time';
    button.setAttribute('aria-label', french ? 'Fuseau horaire' : 'Time zone');
    button.setAttribute('aria-expanded','false');
    const panel = document.createElement('div');
    panel.id = 'timezone-panel'; panel.hidden = true;
    panel.innerHTML = `<label for="timezone-choice">${french ? 'Fuseau horaire' : 'Time zone'}</label><select id="timezone-choice"></select><small>${french ? 'Change seulement votre affichage.' : 'Changes only your display.'}</small>`;
    const select = panel.querySelector('select');
    const auto = document.createElement('option'); auto.value='';
    auto.textContent = (french ? 'Automatique' : 'Automatic') + ' (' + Intl.DateTimeFormat().resolvedOptions().timeZone + ')';
    select.append(auto);
    const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['America/St_Johns','America/Halifax','America/Toronto','America/Winnipeg','America/Regina','America/Edmonton','America/Vancouver','America/Whitehorse','UTC'];
    [...new Set(['UTC', ...zones])].forEach(zone => { const option=document.createElement('option'); option.value=zone; option.textContent=zone.replaceAll('_',' '); select.append(option); });
    select.value=portalTimeZone();
    select.onchange=()=>{ try { localStorage.setItem('mapleforge-timezone',select.value); } catch (_) {} refresh(); };
    button.onclick=()=>{const rect=langs.getBoundingClientRect(); panel.style.left=Math.max(8,Math.min(rect.right+8,innerWidth-310))+'px'; panel.style.bottom=Math.max(8,innerHeight-rect.bottom)+'px'; panel.hidden=!panel.hidden; button.setAttribute('aria-expanded',String(!panel.hidden));};
    panel.addEventListener('keydown',e=>{if(e.key==='Escape'){panel.hidden=true;button.setAttribute('aria-expanded','false');button.focus();}});
    langs.append(button); document.body.append(panel);
  }
  let pending=false;
  new MutationObserver(()=>{if(!pending){pending=true;queueMicrotask(()=>{pending=false;refresh();});}}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['lang']});
  refresh();
})();
