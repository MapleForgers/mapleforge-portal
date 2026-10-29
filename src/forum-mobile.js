// Responsive forum layout, scoped to the portal's proposal and feature boards.
{
 const style=document.createElement('style');style.textContent=`
.forum-mobile-info>summary{display:none}.mobile-board-controls{display:none}
@media(max-width:800px){
 .mobile-board-controls{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;margin:12px 0 0;padding:10px;background:var(--surface-subtle);border:1px solid var(--border-default);border-radius:6px}.mobile-board-controls label{display:flex;flex-direction:column;gap:4px;min-width:0;font-size:14px;font-weight:bold}.mobile-board-controls select{width:100%;min-width:0;min-height:46px;font-size:16px;padding:8px;color:var(--text-primary);background:var(--surface-page);border:1px solid var(--border-default);border-radius:4px}
 body:not([data-mobile-layout=tabs]) .rules-filters .mobile-topic-button{display:none}
 body[data-mobile-layout=compact] #main .rules-row{padding-top:10px;padding-bottom:10px}body[data-mobile-layout=compact] .rule-excerpt,body[data-mobile-layout=compact] .demo-summary{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;margin:4px 0}
 #main input,#main select,#main textarea,.workspace-page input,.workspace-page select,.workspace-page textarea{font-size: max(16px,1em);max-width:100%;min-width:0}
 .irc-compose{display:grid!important;grid-template-columns:44px minmax(0,1fr) auto;gap:8px}.irc-compose textarea{grid-column:1/-1;grid-row:1;width:100%;min-height:72px}.irc-compose #irc-attach{grid-column:1;grid-row:2;min-width:44px;min-height:44px}.irc-compose #irc-send{grid-column:3;grid-row:2;min-height:44px;min-width:76px;padding:8px 14px}.irc-compose #irc-cancel-edit{grid-column:2;grid-row:2;min-height:44px}.irc-controls button,.irc-channel-heading button,.irc-message-options button{min-height:44px!important}.irc-help summary{min-height:44px;padding:8px 0}
 .sidebar .personal-nav-row{min-height:46px}.sidebar .nav [data-view]{padding-top:10px!important;padding-bottom:10px!important}

 body #main .rules-forum,body #main .features-forum{min-width:0;overflow-wrap:anywhere}
 body #main .rules-forum .rules-heading{gap:8px;padding:12px}body #main .rules-forum h1{font-size:23px!important;line-height:1.25}body #main .rules-forum #new-rule{min-height:48px;width:100%;text-align:left;font-size:20px!important}.rules-text-control{font-size:16px!important}
 .forum-mobile-info{background:var(--surface-subtle);border:1px solid var(--border-default);margin:12px 0;border-radius:6px}.forum-mobile-info>summary{display:list-item;cursor:pointer;padding:12px;min-height:44px;font-size:17px;font-weight:bold}.rules-overview{margin:0;gap:8px}.rules-baseline,.rules-forum .rules-notice{padding:12px}
 .rules-forum .rules-filters{flex-wrap:nowrap;overflow-x:auto;overscroll-behavior-x:contain;gap:4px}.rules-forum .rules-filters button{flex:0 0 auto;white-space:nowrap;min-height:46px;padding:8px 12px!important}
 body #main .rules-row,body #main .request-item,body #main .rules-row:has(>.post-history-panel),body #main .request-item:has(>.post-history-panel){grid-template-columns:44px minmax(0,1fr)!important;gap:8px}
 .rules-row>div,.request-item>div{min-width:0}body #main .rule-arrows button,body #main .feature-vote button{min-width:44px!important;min-height:44px!important}
 body #main .rules-forum h2 button,body #main .features-forum .feature-title{font-size:21px!important;line-height:1.3;overflow-wrap:anywhere}.rule-meta button,.feature-actions button{min-height:44px!important}.rule-meta,.feature-meta{gap:6px 10px}
 body #main #governance-detail.rules-inline-discussion,body #main #request-dialog.feature-inline{grid-column:1/-1;margin:8px 0 0;width:100%;min-width:0;padding:0}body #main .post-history-panel{grid-column:1/-1;width:100%;max-width:none;max-height:240px;overflow:auto;justify-self:stretch}.post-history-panel .history-tabs{position:sticky;top:-12px;background:var(--surface-subtle);margin:-12px -12px 8px;padding:4px 8px;z-index:1}.history-tabs button{min-height:44px!important}
 #governance-detail .rule-replies{margin-left:8px;padding-left:8px}#governance-detail .rule-replies .rule-replies .rule-replies{margin-left:4px;padding-left:5px}#governance-detail .rule-comment-actions{display:flex;flex-wrap:wrap;gap:8px}#governance-detail .rule-comment-actions button{min-height:44px!important;min-width:44px}#governance-detail textarea,#request-dialog textarea{min-height:180px!important;width:100%;font-size:18px!important}.rich-editor-tools,.rule-editor-tools{flex-wrap:wrap}.rich-editor-tools button,.rule-editor-tools button{min-height:44px!important}.rules-row img,.request-item img{max-width:100%}.demo-expanded{grid-column:1/-1!important}
}
`;document.head.append(style);

function mobileBoardControls(nav, categorySelector, orderSelector){
 if(nav.previousElementSibling?.classList.contains('mobile-board-controls'))return;
 const french=document.documentElement.lang.startsWith('fr'),t=(a,b)=>french?b:a;
 const bar=document.createElement('div');bar.className='mobile-board-controls';
 const make=(title,values)=>{const label=document.createElement('label');label.append(document.createTextNode(title));const select=document.createElement('select');select.setAttribute('aria-label',title);values.forEach(([value,text])=>select.add(new Option(text,value)));label.append(select);bar.append(label);return select;};
 const topic=make(t('Topic','Sujet'),[]);
 const view=make(t('Mobile layout','Affichage mobile'),[['comfortable',t('Comfortable','Confortable')],['compact',t('Compact','Compact')],['tabs',t('Category tabs','Onglets')]]);
 function apply(){let value='comfortable';try{value=localStorage.getItem('mapleforge-mobile-layout')||value;}catch(_){}view.value=['comfortable','compact','tabs'].includes(value)?value:'comfortable';document.body.dataset.mobileLayout=view.value;}
 apply();view.onchange=()=>{document.body.dataset.mobileLayout=view.value;try{localStorage.setItem('mapleforge-mobile-layout',view.value);}catch(_){}};
 function sync(){const buttons=[...nav.querySelectorAll(categorySelector)],signature=buttons.map(b=>b.textContent).join('|');if(topic.dataset.signature!==signature){topic.replaceChildren(...buttons.map((b,i)=>new Option(b.textContent.trim(),String(i))));topic.dataset.signature=signature;}topic.value=String(Math.max(0,buttons.findIndex(b=>b.getAttribute('aria-pressed')==='true')));}
 topic.onchange=()=>nav.querySelectorAll(categorySelector)[Number(topic.value)]?.click();
 nav.before(bar);nav.classList.add('mobile-category-source');nav.querySelectorAll(categorySelector).forEach(b=>b.classList.add('mobile-topic-button'));
 const observer=new MutationObserver(()=>{nav.querySelectorAll(categorySelector).forEach(b=>{if(!b.classList.contains('mobile-topic-button'))b.classList.add('mobile-topic-button');});sync();});observer.observe(nav,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-pressed']});sync();
}

 const mq=matchMedia('(max-width:800px)');
 function decorate(){document.querySelectorAll(".rules-filters").forEach(nav=>mobileBoardControls(nav,"[data-category],[data-demo-category]"));document.querySelectorAll('.rules-overview').forEach(overview=>{if(overview.parentElement.classList.contains('forum-mobile-info'))return;const details=document.createElement('details');details.className='forum-mobile-info';details.open=!mq.matches;const summary=document.createElement('summary');summary.textContent=document.documentElement.lang.startsWith('fr')?'Règles de conduite et informations':'Conduct rules & community information';details.append(summary);overview.before(details);details.append(overview);});}
 new MutationObserver(decorate).observe(document.querySelector('#main'),{childList:true,subtree:true});mq.addEventListener('change',()=>document.querySelectorAll('.forum-mobile-info').forEach(d=>d.open=!mq.matches));decorate();
}
