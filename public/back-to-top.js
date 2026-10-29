(() => {
  'use strict';
  if (new URLSearchParams(location.search).get('embedded') === '1' || document.getElementById('mf-back-to-top')) return;
  const style = document.createElement('style');
  style.textContent = `
    #mf-back-to-top{position:fixed;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));z-index:80;display:flex;align-items:center;gap:7px;min-height:44px;padding:11px 16px;border:1px solid #e3ebdf;border-radius:24px;background:#244d40;color:#fff;box-shadow:0 3px 14px #172e3030;font:700 14px/1.3 system-ui,sans-serif;cursor:pointer}
    #mf-back-to-top:hover{background:#173d32}
    #mf-back-to-top:focus-visible{outline:3px solid #cf6e37;outline-offset:3px}
    #mf-back-to-top[hidden]{display:none!important}
    @media(max-width:600px){#mf-back-to-top{right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));padding:10px 14px}}
    @media print{#mf-back-to-top{display:none!important}}
  `;
  document.head.append(style);
  const button = document.createElement('button');
  button.id = 'mf-back-to-top';
  button.type = 'button';
  button.hidden = true;
  button.setAttribute('aria-label', 'Scroll to top');
  const arrow = document.createElement('span');
  arrow.textContent = '↑';
  arrow.setAttribute('aria-hidden', 'true');
  button.append(arrow, document.createTextNode('To top'));
  document.body.append(button);
  const update = () => { button.hidden = window.scrollY < 250; };
  window.addEventListener('scroll', update, {passive:true});
  window.addEventListener('resize', update, {passive:true});
  window.addEventListener('pageshow', update);
  button.addEventListener('click', () => {
    window.scrollTo({top:0, behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
  });
  update();
})();
