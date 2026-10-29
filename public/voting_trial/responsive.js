// Move existing controls, preserving their event handlers and member content.
(()=>{const mq=matchMedia('(max-width:800px)'),header=document.querySelector('.site-header'),notice=document.querySelector('.header-governance'),main=document.querySelector('#main'),side=document.querySelector('.community-sidebar'),categories=document.querySelector('#categories'),search=document.querySelector('#search'),label=document.querySelector('.search-label');
const info=document.createElement('details');info.className='mobile-info';const summary=document.createElement('summary');summary.textContent='About this board & maintenance';info.append(summary);notice.before(info);info.append(notice);
const community=document.createElement('details');community.className='mobile-community';const cs=document.createElement('summary');cs.textContent='Community information & conduct rules';community.append(cs);[...side.children].filter(el=>el!==search&&el!==label).forEach(el=>community.append(el));side.append(community);

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

mobileBoardControls(categories,'[data-category]');
function layout(){info.open=!mq.matches;community.open=!mq.matches;if(mq.matches){main.prepend(label,search);header.after(categories.previousElementSibling,categories);}else{side.prepend(label,search);header.append(categories.previousElementSibling,categories);}}mq.addEventListener('change',layout);layout();})();
