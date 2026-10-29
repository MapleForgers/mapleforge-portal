// Member-authored portal proposals. Votes do not invent an adoption threshold.
{
  const fr = () => document.documentElement.lang.startsWith('fr');
  const label = (en, french) => fr() ? french : en;
  governanceCategories.splice(0, governanceCategories.length, 'Rules', 'Structure', 'Agreements');
  const title = () => label('Rules & agreements', 'Règles et accords');
  sectionLabels.rules = 'Rules & agreements';
  sectionLabels.governance = 'Rules & agreements';
  const nav = document.querySelector('[data-view="rules"]');
  if (nav) nav.textContent = title();
  const duplicate = document.querySelector('.nav [data-view="governance"]');
  if (duplicate) duplicate.remove();
  function ballots(id) {
    const proposal = state.governance.find(r => r.id === id);
    return (MF.bookmarkData?.relations || []).filter(r => r.kind === 'ballot' && r.target === 'Governance:'+id && r.data?.revision === proposal?.revision);
  }
  function totals(id) {
    const b = ballots(id);
    return `${label('Agree','Pour')}: ${b.filter(r=>r.data.choice==='agree').length} · ${label('Disagree','Contre')}: ${b.filter(r=>r.data.choice==='disagree').length} · ${label('Abstain','Abstention')}: ${b.filter(r=>r.data.choice==='abstain').length}`;
  }
  renderGovernance = function () {
    $('#main').innerHTML = `<section><div class="board-head"><div><h1>${title()}</h1><p>${label('No portal rules have been adopted. Members can propose rules, structure and shared agreements, then discuss and vote.','Aucune règle du portail n’a été adoptée. Les membres peuvent proposer des règles, une structure et des accords, puis en discuter et voter.')}</p></div><button class="btn" id="new-rule">${label('Make a proposal','Faire une proposition')}</button></div><p>${label('One vote per signed-in member. Change or withdraw your vote at any time. Results are visible to members. Adoption criteria must be agreed together; a vote count alone does not make a proposal a rule.','Un vote par membre connecté, modifiable ou retirable à tout moment. Les résultats sont visibles aux membres. Les critères d’adoption restent à définir ensemble.')}</p><div class="filter-chips" id="rule-filters"></div><div id="rule-items" class="request-list"></div></section>`;
    $('#new-rule').onclick = newGovernance;
    for (const cat of ['All topics',...governanceCategories]) {
      const b = document.createElement('button');b.className='filter-chip';b.textContent=cat;b.setAttribute('aria-pressed',String(governanceCategory===cat));
      b.onclick=()=>{governanceCategory=cat;renderGovernance();};$('#rule-filters').append(b);
    }
    const rows=state.governance.filter(r=>governanceCategory==='All topics'||r.category===governanceCategory);
    $('#rule-items').innerHTML=rows.map(r=>`<article class="request-item"><span class="tag">${esc(r.category)}</span><h2><button class="title-btn" data-rule="${esc(r.id)}">${esc(r.title)}</button></h2><p>${esc(r.summary)}</p><p>${memberName(r.author)} · ${label('Proposal','Proposition')}</p><p>${totals(r.id)}</p><button class="btn link" data-rule="${esc(r.id)}">${label('Discuss and vote','Discuter et voter')} · ${(state.governanceComments[r.id]||[]).length} ${label('comments','commentaires')}</button></article>`).join('')||`<p>${label('No proposals yet. Add the first one.','Aucune proposition. Ajoutez la première.')}</p>`;
    document.querySelectorAll('[data-rule]').forEach(b=>b.onclick=()=>openGovernance(b.dataset.rule));
  };
  const previousOpen = openGovernance;
  openGovernance = function(id) {
    previousOpen(id);
    const support=governanceDialog.querySelector('#gov-support');
    const group=document.createElement('fieldset');group.style.marginTop='1rem';
    const own=ballots(id).find(r=>r.uid===MF.account?.id)?.data.choice;
    group.innerHTML=`<legend>${label('Your vote','Votre vote')}</legend><p>${totals(id)}</p><p>${label('Editing a proposal clears its votes so members can vote on the revised text.','Modifier une proposition efface ses votes pour permettre un nouveau vote sur le texte révisé.')}</p>`;
    for(const [choice,en,french] of [['agree','Agree','Pour'],['disagree','Disagree','Contre'],['abstain','Abstain','Abstention'],['remove','Withdraw vote','Retirer mon vote']]) {
      const b=document.createElement('button');b.type='button';b.className='filter-chip';b.textContent=label(en,french);b.setAttribute('aria-pressed',String(own===choice));
      b.disabled=!MF.account||(choice==='remove'&&!own);
      b.onclick=async()=>{group.querySelectorAll('button').forEach(x=>x.disabled=true);try{const r=state.governance.find(r=>r.id===id);await MF.api('/api/shared',{op:'ballot',kind:'Governance',id,choice,revision:r.revision});await MF.refresh();openGovernance(id);if(view==='rules'||view==='governance')renderGovernance();}catch(e){toast(e.message);group.querySelectorAll('button').forEach(x=>x.disabled=false);}};
      group.append(b);
    }
    support.replaceWith(group);
  };
  const previousRender = render;
  render=function(){previousRender();if(view==='rules'||view==='governance')renderGovernance();};
}
