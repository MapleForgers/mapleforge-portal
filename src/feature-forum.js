// Feature requests use the same compact forum hierarchy as Rules & agreements.
{
 const t=(a,b)=>document.documentElement.lang.startsWith('fr')?b:a;
 const style=document.createElement('style');style.textContent=`
.features-forum{font:18px/1.5 Arial,Helvetica,sans-serif;--feature-link:#245f9d;--feature-strip:#dceaf7}
body[data-theme=night] .features-forum{--feature-link:#9bcaff;--feature-strip:#253b50}
.features-forum .feature-heading{display:flex;align-items:baseline;flex-wrap:wrap;gap:16px;padding:12px 16px;background:var(--feature-strip)}
body #main .features-forum h1{font:700 28px Arial,Helvetica,sans-serif!important;margin:0!important}
body #main .features-forum :is(p,button,label,input,select,span,strong){font-size:18px!important}
.features-forum button{background:transparent!important;border:0!important;box-shadow:none!important;border-radius:0!important;color:var(--feature-link);padding:4px 6px!important;cursor:pointer}
.features-forum button:hover{text-decoration:underline}
body #main .features-forum #new-request{font-size:22px!important;font-weight:700;text-decoration:underline}
.features-forum .feature-tools{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:12px 0}.features-forum .feature-tools input[type=search]{flex:1;min-width:180px}.features-forum input,.features-forum select{padding:7px;max-width:100%;color:inherit;background:var(--surface,#fff);border:1px solid var(--line,#ccc)}
.features-forum .request-item{display:grid!important;grid-template-columns:44px minmax(0,1fr);gap:10px;padding:14px 0!important;border:0!important;border-bottom:1px solid var(--line,#ddd)!important;border-radius:0!important;box-shadow:none!important;background:transparent!important}
.features-forum .feature-vote{display:flex;align-items:center;flex-direction:column}.features-forum .feature-vote button[aria-pressed=true]{color:#bd4300;font-weight:700}
body #main .features-forum .feature-title{font-size:22px!important;text-align:left;padding:0!important}.features-forum .feature-meta{display:flex;flex-wrap:wrap;gap:8px;color:var(--muted,#555)}.features-forum .feature-body{margin:6px 0}.features-forum .feature-status{background:var(--feature-strip);padding:0 6px}.features-forum .feature-actions{display:flex;flex-wrap:wrap;gap:8px}
#request-dialog.feature-inline{position:static;grid-column:2;width:100%;max-width:none;max-height:none;margin:8px 0 0 20px;padding:0;width:calc(100% - 20px);border:0;box-shadow:none;background:transparent;color:inherit;overflow:visible}#request-dialog.feature-inline .dialog-inner{padding:0}#request-dialog.feature-inline .dialog-inner>:not(.thread){display:none}#request-dialog.feature-inline .thread>h3{display:none}#request-dialog.feature-inline .request-comment{border:0;border-left:1px solid var(--line,#ddd);padding:8px 0 8px 16px;margin:8px 0}#request-dialog.feature-inline textarea{min-height:20rem;width:100%;font:18px/1.5 Arial,Helvetica,sans-serif}
body #main .features-forum .feature-vote button{font-size:28px!important;min-width:40px;min-height:40px;line-height:1}
.features-forum .post-collapse-top,.features-forum .post-collapse-bottom{display:none}.features-forum .request-item:has(>#request-dialog[open]) .post-collapse-top,.features-forum .request-item:has(>#request-dialog[open]) .post-collapse-bottom{display:block}.features-forum .post-collapse-bottom{grid-column:2;justify-self:start}
.features-forum .feature-full-body{display:none;margin:12px 0}.features-forum .request-item:has(>#request-dialog[open]) .feature-full-body{display:block}.features-forum .request-item:has(>#request-dialog[open]) .feature-body{display:none}
@media(max-width:600px){.features-forum .request-item{grid-template-columns:32px minmax(0,1fr);gap:6px}}
`;document.head.append(style);
 let expanded=null;
 const voteCount=id=>MF.forumBallots?MF.forumBallots('Features',id).reduce((n,v)=>n+(v.choice==='agree'?1:v.choice==='disagree'?-1:0),0):(MF.bookmarkData?.relations||[]).filter(r=>r.kind==='vote'&&r.target==='Features:'+id).length;
 requestCard=r=>`<article class="request-item" data-feature-row="${esc(r.id)}"><div class="feature-vote"><button data-feature-vote="${esc(r.id)}" aria-pressed="${hasRequestVote(r.id)}" aria-label="${t('Upvote','Voter pour')} ${esc(r.title)}">▲</button><strong>${voteCount(r.id)}</strong></div><div><button class="feature-title" data-request-open="${esc(r.id)}">${esc(r.title)}</button><div class="feature-meta"><span class="feature-status">${esc(r.status)}</span><span>${memberName(r.author)}</span><span>${r.created?portalTimeHtml(r.created):''}</span><span>${esc(r.area||'')}</span></div><button class="post-collapse-top" data-request-open="${esc(r.id)}">${t('▾ Collapse','▾ Réduire')}</button>${MF.proposalImages?.(r)||''}<p class="feature-body">${esc(MF.postPreview(r.body))}</p><div class="feature-full-body">${MF.formatComment(r.body)}${MF.proposalImages?.(r,true)||''}</div><div class="feature-actions"><button data-feature-toggle data-request-open="${esc(r.id)}">${t('▸ Expand','▸ Développer')}</button><button data-request-open="${esc(r.id)}">${(state.requestComments[r.id]||[]).length} ${t('comments','commentaires')}</button><button data-feature-follow="${esc(r.id)}">${state.requestFollows.includes(r.id)?t('Following','Suivi'):t('Follow','Suivre')}</button></div></div></article>`;
 const oldResults=renderRequestResults;
 function mount(){const row=[...document.querySelectorAll('[data-feature-row]')].find(el=>el.dataset.featureRow===expanded);if(row){requestDialog.classList.add('feature-inline');requestDialog.setAttribute('open','');requestDialog.hidden=false;row.append(requestDialog);let bottom=row.querySelector('.post-collapse-bottom');if(!bottom){bottom=document.createElement('button');bottom.type='button';bottom.className='post-collapse-bottom';bottom.textContent=t('▾ Collapse','▾ Réduire');bottom.onclick=()=>{requestDialog.close();if(row.getBoundingClientRect().top<0)row.scrollIntoView({block:'start'});};}row.append(bottom);document.querySelectorAll('[data-feature-toggle]').forEach(b=>{const open=b.dataset.requestOpen===expanded;b.textContent=open?t('▾ Collapse','▾ Réduire'):t('▸ Expand','▸ Développer');b.setAttribute('aria-expanded',String(open));});}else if(expanded)requestDialog.close();}
 renderRequestResults=function(){oldResults();document.querySelectorAll('.feature-vote [data-feature-vote]').forEach(b=>b.textContent='▲');if(expanded)mount();};
 renderRequests=function(){ensureCommunity();requestLayout='list';$('#main').innerHTML=`<section class="features-forum"><header class="feature-heading"><h1>${t('Features','Fonctionnalités')}</h1><button id="new-request">+ ${t('Add feature request','Ajouter une demande')}</button></header><p>${t('Suggest a feature or a fix. Vote for requests and discuss them below.','Proposez une fonctionnalité ou une correction. Votez pour les demandes et discutez ci-dessous.')}</p><div class="feature-tools"><input type="search" id="request-search" aria-label="${t('Search features','Rechercher des fonctionnalités')}" placeholder="${t('Search features…','Rechercher…')}" value="${esc(requestQuery)}"><select id="request-filter" aria-label="${t('Status','Statut')}">${['All statuses',...requestStages].map(x=>`<option ${requestFilter===x?'selected':''}>${esc(x)}</option>`).join('')}</select><select id="request-sort" aria-label="${t('Sort requests','Trier les demandes')}">${[['newest',t('New','Nouveau')],['supported',t('Top','Meilleur')],['comments',t('Most discussed','Plus discutés')]].map(([v,l])=>`<option value="${v}" ${requestSort===v?'selected':''}>${l}</option>`).join('')}</select><label><input id="followed-only" type="checkbox" ${followFilter?'checked':''}> ${t('Following only','Suivis seulement')}</label></div><div id="request-results"></div></section>`;groupFilter='';tagFilter='';$('#new-request').onclick=openRequestForm;$('#request-search').oninput=e=>{requestQuery=e.target.value;renderRequestResults();};$('#request-filter').onchange=e=>{requestFilter=e.target.value;renderRequestResults();};$('#request-sort').onchange=e=>{requestSort=e.target.value;renderRequestResults();};$('#followed-only').onchange=e=>{followFilter=e.target.checked;renderRequestResults();};renderRequestResults();};
 requestDialog.showModal=function(){expanded=openRequestId;mount();};
 requestDialog.close=function(){expanded=null;this.removeAttribute('open');document.body.append(this);document.querySelectorAll('[data-feature-toggle]').forEach(b=>{b.textContent=t('▸ Expand','▸ Développer');b.setAttribute('aria-expanded','false');});};
 const oldOpen=openRequest;openRequest=function(id){if(expanded===id){requestDialog.close();return;}oldOpen(id);};
 const oldFeatureForm=openRequestForm;openRequestForm=function(){oldFeatureForm();document.querySelectorAll('textarea[name=body]').forEach(ta=>{if(ta.dataset.formatted)return;ta.dataset.formatted='true';const tools=document.createElement('div');tools.className='rich-editor-tools';ta.before(tools);MF.addFormatting(ta,tools);});};
 const oldDetail=renderRequestDetail;renderRequestDetail=function(){oldDetail();const oldThread=requestDialog.querySelector('.thread'),thread=document.createElement('div');thread.className='thread';const comments=(MF.bookmarkData?.comments||[]).filter(c=>c.target==='Features:'+openRequestId);thread.innerHTML=comments.map(c=>`<div class="request-comment"><strong>${memberName(c.author)}</strong> <span class="comment-timestamp">${portalTimeHtml(c.created*1000)}</span><p style="white-space:pre-wrap">${MF.formatComment(c.body)}</p></div>`).join('')+`<form id="request-comment-form"><textarea name="text" required maxlength="12000" aria-label="${t('Comment','Commentaire')}"></textarea><button type="submit">${t('Post comment','Publier')}</button></form>`;oldThread.replaceWith(thread);const form=thread.querySelector('form');const id=openRequestId,key='mapleforge-feature-draft:'+String(MF.account?.id||'guest')+':'+id,ta=form.querySelector('textarea');try{ta.value=localStorage.getItem(key)||'';}catch(_){}ta.oninput=()=>{try{localStorage.setItem(key,ta.value);}catch(_){}};const submit=form.querySelector('[type=submit]');const tools=document.createElement('div');tools.className='rich-editor-tools';form.prepend(tools);MF.addFormatting(ta,tools);tools.append(submit);submit.textContent=t('Post comment','Publier');form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;try{await MF.api('/api/comments',{target:'Features:'+id,body:ta.value});try{localStorage.removeItem(key);}catch(_){}await MF.refresh();renderRequestDetail();}catch(err){toast(err.message);submit.disabled=false;}};};
 const previousRender=render;render=function(){if(view!=='requests'&&!((view==='rules'||view==='governance')&&['All topics','Features'].includes(governanceCategory))&&expanded)requestDialog.close();previousRender();};
}

// Keep feature records, votes and discussions in their original store within the combined forum.
{
 const title='Rules, structure, agreements, features, projects & proposals';
 sectionLabels.rules=title;sectionLabels.governance=title;sectionLabels.requests=title;
 const nav=document.querySelector('[data-view="rules"]');if(nav)nav.textContent=title;
 MF.removeNav?.('requests');
 document.querySelector('.personal-nav-row[data-nav-id="requests"]')?.remove();
 document.querySelector('.sidebar [data-view="requests"]')?.remove();
 let assembling=false;
 const originalResults=renderRequestResults;
 renderRequestResults=function(){if(!assembling&&(view==='rules'||view==='governance')&&governanceCategory==='All topics'){renderGovernance();return;}originalResults();};
 MF.renderForumFeatures=function(only,order='new'){
   const main=$('#main'),saved=[...main.childNodes];
   const filtersBefore=[requestQuery,requestFilter,followFilter,groupFilter,tagFilter];
   if(!only){requestQuery='';requestFilter='All statuses';followFilter=false;groupFilter='';tagFilter='';}
   assembling=true;
   let features;
   try{renderRequests();features=main.querySelector('.features-forum');}finally{assembling=false;main.replaceChildren(...saved);if(!only)[requestQuery,requestFilter,followFilter,groupFilter,tagFilter]=filtersBefore;}
   const filters=main.querySelector('.rules-filters'),list=filters.nextElementSibling;
   if(only){list.replaceChildren(features);features.querySelector('.feature-heading')?.remove();features.querySelector(':scope>p')?.remove();return;}
   const featureRows=[...features.querySelectorAll('[data-feature-row]')];
   if(featureRows.length)list.querySelector(':scope>p')?.remove();
   list.classList.add('features-forum');
   featureRows.forEach(row=>{const label=document.createElement('span');label.className='feature-status';label.textContent='Feature';row.querySelector('.feature-meta').prepend(label);list.append(row);});
   const records=new Map([...state.governance,...state.requests].map(r=>[r.id,r]));
   const all=[...list.querySelectorAll(':scope>article')];
   const record=row=>records.get(row.dataset.featureRow||row.querySelector('[data-rule]')?.dataset.rule);
   const score=row=>Number(row.querySelector('.rule-arrows strong,.feature-vote strong')?.textContent||0);
   all.sort((a,b)=>order==='top'?score(b)-score(a):String(record(b)?.created||'').localeCompare(String(record(a)?.created||''))).forEach(row=>list.append(row));
 };
 const previousSwitch=switchSection;switchSection=function(id){if(id==='requests'){governanceCategory='Features';id='rules';}previousSwitch(id);};
}
