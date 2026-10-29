(() => {
 'use strict';
 const root = '/publications/';
 const historyPath=root+'relevant-history/';
 const proposalPath=root+'blackknives-proposal/';
 const blackSurveyPath=root+'blackknives-survey/';
 const manddSurveyPath=root+'mandd-survey/';
 const votingPath=root+'virtual-constitution/';
 const pages = [
  {path:proposalPath,title:'Blackknives’ Proposal',group:'MapleForge Perspectives',description:'A community first, with room for pods.'},
  {path:historyPath,title:'Relevant History Research',group:'Information',description:'Sourced and put together by mandd.'},
  {path:votingPath,title:'Constitution board',group:'MapleForge Perspectives',description:'Agree on rules, roles and how decisions are made.'},
  {path:blackSurveyPath,title:'Blackknives-based survey',group:'Proposed Surveys',description:'Community interests, skills and pods.'},
  {path:manddSurveyPath,title:'mandd’s expanded survey',group:'Proposed Surveys',description:'Intentions, commitments and results.'}
 ];
 const normalized = path => path.replace(/index\.html$/, '').replace(/\/?$/, '/');
 const current = pages.find(page => page.path === normalized(location.pathname));
 if (!current) return;
 let plainView=false;try{plainView=localStorage.getItem('mapleforge-perspectives-plain')==='plain';}catch{}
 document.documentElement.classList.toggle('mf-plain-view',plainView);
 if (new URLSearchParams(location.search).get('embedded') === '1') {
  document.documentElement.classList.add('mf-embedded');
  try{document.documentElement.classList.toggle('mf-motion-paused',localStorage.getItem('mapleforge-perspectives-motion')==='paused');}catch{}
  const footer=document.createElement('footer');footer.className='mf-landscape-footer';
  const scene=document.createElement('img');scene.src='/art/mapleforge/mapleforge-panorama.svg';scene.alt='';scene.width=1600;scene.height=240;
  footer.append(scene);footer.setAttribute('aria-label','Canadian lake and forest illustration');document.body.append(footer);
  return;
 }
 const make = (tag,cls,text) => { const el=document.createElement(tag); if(cls)el.className=cls; if(text!==undefined)el.textContent=text; return el; };
 const shell = make('div','mf-workspace');
 const masthead = make('div','mf-workspace-masthead');
 const header = make('header','mf-workspace-header');
 const brand = make('a','mf-workspace-brand'); brand.href='/';
 const mark=make('img');mark.src='/art/mapleforge/mapleforge-maple.svg';mark.alt='';mark.width=28;mark.height=34;
 brand.append(mark,make('span','','MapleForge'));
 const headerRight=make('div','mf-workspace-header-right');
 const motion=make('button','mf-motion-toggle');motion.type='button';
 let motionPaused=false;try{motionPaused=localStorage.getItem('mapleforge-perspectives-motion')==='paused';}catch{}
 const setMotion=()=>{document.documentElement.classList.toggle('mf-motion-paused',motionPaused);motion.textContent=motionPaused?'Play scenery':'Pause scenery';motion.setAttribute('aria-pressed',String(motionPaused));};setMotion();
 const graphics=make('button','mf-graphics-toggle');graphics.type='button';
 const setGraphics=()=>{
  document.documentElement.classList.toggle('mf-plain-view',plainView);
  graphics.textContent=plainView?'Show graphics':'Hide graphics';
  graphics.setAttribute('aria-pressed',String(plainView));
  graphics.title=plainView?'Restore scenery, illustrations and media':'Use a plain reading view without scenery, illustrations or media';
  motion.hidden=plainView;
 };setGraphics();
 headerRight.append(make('span','mf-workspace-edition','Perspectives'),graphics,motion);header.append(brand,headerRight);
 const body=make('div','mf-workspace-body');
 const aside=make('aside','mf-workspace-sidebar');
 const nav=make('nav');nav.setAttribute('aria-label','Perspectives sections');
 const menuLinks=[];
 for(const group of ['MapleForge Perspectives','Proposed Surveys','Information']) {
  const block=make('div','mf-workspace-group');block.append(make('h2','',group));
  for(const page of pages.filter(p=>p.group===group)) {
   const link=make('a','mf-workspace-link');link.href=page.path;link.dataset.section=String([proposalPath,historyPath,blackSurveyPath,manddSurveyPath,votingPath].indexOf(page.path));
   link.append(make('span','',page.title));if(page.description)link.append(make('small','',page.description));
   link.addEventListener('click',event=>{if(event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)return;event.preventDefault();open(page.path,true);});
   block.append(link);menuLinks.push([link,page.path]);
  }
  nav.append(block);
 }
 const controls=make('div','mf-workspace-controls');
 const textLabel=make('label','','Text size');textLabel.htmlFor='workspace-text-size';
 const textSelect=make('select');textSelect.id=textLabel.htmlFor;
 for(const size of ['18','20','22']) {const option=make('option','',size+' px');option.value=size;textSelect.append(option);}
 try{const saved=localStorage.getItem('mapleforge-perspectives-text');if(['18','20','22'].includes(saved))textSelect.value=saved;}catch{}
 controls.append(textLabel,textSelect);aside.append(nav,controls);
 const mobile=make('div','mf-workspace-mobile');
 const mobileLabel=make('label','','Open section');mobileLabel.htmlFor='workspace-section';
 const sectionSelect=make('select');sectionSelect.id=mobileLabel.htmlFor;
 for(const group of ['MapleForge Perspectives','Proposed Surveys','Information']) {
  const options=make('optgroup');options.label=group;
  for(const page of pages.filter(p=>p.group===group)){const option=make('option','',page.title);option.value=page.path;options.append(option);}
  sectionSelect.append(options);
 }
 sectionSelect.addEventListener('change',()=>open(sectionSelect.value,true));mobile.append(mobileLabel,sectionSelect);
 const main=make('main','mf-workspace-content');main.id='workspace-content';
 const sectionBar=make('aside','mf-section-rail');const sectionTitle=make('h2','','Sections');const sectionLinks=make('nav','mf-section-links');sectionLinks.setAttribute('aria-label','Page sections');sectionBar.append(sectionTitle,sectionLinks);
 const status=make('div','mf-workspace-loading');status.setAttribute('role','status');main.append(status);
 const skip=make('a','mf-workspace-skip','Skip to content');skip.href='#workspace-content';
 skip.addEventListener('click',event=>{event.preventDefault();frames.get(active)?.focus();});
 main.prepend(sectionBar);body.append(aside,main);masthead.append(header,mobile);shell.append(skip,masthead,body);
 document.body.replaceChildren(shell);document.body.className='mf-workspace-host';
 delete document.body.dataset.commentsPage;delete document.body.dataset.survey;
 const headerObserver=new ResizeObserver(()=>shell.style.setProperty('--mf-header-height',masthead.offsetHeight+'px'));
 headerObserver.observe(masthead);
 history.scrollRestoration='manual';
 const frames=new Map();const scrollPositions=new Map();let active='';let selectedSection=decodeURIComponent(location.hash.slice(1));const sectionsByPage=new Map();
 graphics.addEventListener('click',()=>{
  plainView=!plainView;setGraphics();
  try{localStorage.setItem('mapleforge-perspectives-plain',plainView?'plain':'illustrated');}catch{}
  for(const frame of frames.values()){
   try{
    frame.contentDocument.documentElement.classList.toggle('mf-plain-view',plainView);
    if(plainView)for(const video of frame.contentDocument.querySelectorAll('video'))video.pause();
   }catch{}
  }
 });
 motion.addEventListener('click',()=>{motionPaused=!motionPaused;setMotion();try{localStorage.setItem('mapleforge-perspectives-motion',motionPaused?'paused':'playing');}catch{}for(const frame of frames.values()){try{frame.contentDocument.documentElement.classList.toggle('mf-motion-paused',motionPaused);}catch{}}});
 function sizeFrame(frame) {
  try {frame.contentDocument.documentElement.style.setProperty('--body',textSelect.value+'px');
   const original=frame.contentDocument.getElementById('text-size');if(original)original.value=textSelect.value;
   fitFrame(frame);
  } catch {}
 }
 textSelect.addEventListener('change',()=>{try{localStorage.setItem('mapleforge-perspectives-text',textSelect.value);}catch{}for(const frame of frames.values())sizeFrame(frame);});
 function fitFrame(frame) {
  if(frame.hidden||!frame.contentDocument?.body)return;
  // Measure the natural body, not scrollHeight (which cannot shrink below the old viewport).
  const height=Math.ceil(frame.contentDocument.body.getBoundingClientRect().height);
  if(height>0&&frame.style.height!==height+'px')frame.style.height=height+'px';
  scheduleSectionTracking();
 }
 function scrollToContent(frame,node) {
  fitFrame(frame);
  const top=node?frame.getBoundingClientRect().top+window.scrollY+node.getBoundingClientRect().top+frame.contentWindow.scrollY-masthead.offsetHeight-(sectionBar.hidden?0:sectionBar.offsetHeight)-16:0;
  window.scrollTo({top:Math.max(0,top),behavior:'instant'});
 }
 function wireFrame(frame) {
  const doc=frame.contentDocument;doc.documentElement.classList.toggle('mf-plain-view',plainView);buildSections(frame);doc.documentElement.classList.toggle('mf-motion-paused',motionPaused);
  const observer=new ResizeObserver(()=>fitFrame(frame));observer.observe(doc.body);
  doc.fonts?.ready.then(()=>fitFrame(frame));
  doc.addEventListener('click',event=>{
   const link=event.target.closest('a[href]');if(!link||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const url=new URL(link.href,frame.src);
   if(url.origin===location.origin&&pages.some(p=>p.path===normalized(url.pathname))) {
    event.preventDefault();
    const target=normalized(url.pathname),id=decodeURIComponent(url.hash.slice(1));
    if(target!==active)open(target,true);
    if(id)chooseSection(id,true);
   } else if(url.origin!==location.origin && ['https:','http:'].includes(url.protocol)) {link.target='_blank';link.rel='noopener noreferrer';}
  });
 }
 function open(path,push) {
  if(push)selectedSection="";
  const page=pages.find(p=>p.path===path);if(!page)return;
  if(active)scrollPositions.set(active,window.scrollY);
  active=path;
  const scenery=path===votingPath?"coastal-garden":path===historyPath?"mountain-inlet":path===proposalPath?"coastal-garden":path===blackSurveyPath?"cedar-rainforest":"atlantic-shore";
  shell.dataset.scenery=scenery;document.body.dataset.scenery=scenery;
  for(const [link,target] of menuLinks){if(target===path)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
  sectionSelect.value=path;
  for(const [target,frame] of frames)frame.hidden=target!==path;
  let frame=frames.get(path);
  if(!frame) {
   frame=make('iframe','mf-workspace-frame');frame.title=page.title;frame.setAttribute('scrolling','no');frame.src=path+'?embedded=1';
   frame.addEventListener('load',()=>{
    frame.dataset.ready='true';sizeFrame(frame);try{wireFrame(frame);}catch{}
    if(active===path){renderSections();applySection(frame,selectedSection);status.hidden=true;main.removeAttribute('aria-busy');}
   });
   frames.set(path,frame);main.append(frame);
  }
  frame.hidden=false;
  if(frame.dataset.ready==='true'){renderSections();fitFrame(frame);if(selectedSection)applySection(frame,selectedSection);else requestAnimationFrame(()=>window.scrollTo({top:scrollPositions.get(path)||0,behavior:'instant'}));}
  else window.scrollTo({top:0,behavior:'instant'});
  status.hidden=frame.dataset.ready==='true';status.textContent='Loading '+page.title+'…';
  if(status.hidden)main.removeAttribute('aria-busy');else main.setAttribute('aria-busy','true');
  document.title=page.title+' · MapleForge Perspectives';
  if(push && location.pathname+location.hash!==path)history.pushState({perspective:path},'',path);
 }
 function buildSections(frame){
  const doc=frame.contentDocument;const path=normalized(new URL(frame.src).pathname);
  const nodes=path===historyPath?[...doc.querySelectorAll('#starting-point,.history-example,#lessons,#practical')]:path===proposalPath?[...doc.querySelectorAll('main.article>.section')]:[...doc.querySelectorAll('fieldset.question')];
  const list=nodes.map((node,i)=>{const title=node.dataset.title||node.querySelector('h3,h2,legend')?.textContent.trim()||'A starting point';const id=node.id||node.dataset.key||node.dataset.commentThread||'section-'+(i+1);node.id=id;return {id,title,node};});
  sectionsByPage.set(path,list);
 }
 function renderSections(){
  sectionLinks.replaceChildren();sectionBar.hidden=active===votingPath;if(sectionBar.hidden)return;
  const isSurvey=[blackSurveyPath,manddSurveyPath].includes(active);
  sectionBar.classList.toggle('mf-survey-navigation',isSurvey);
  sectionLinks.setAttribute('aria-label',isSurvey?'Survey questions':'Page sections');
  if(isSurvey){
   const labels={name:'Your name',purpose:'What are you looking for?',priority:'Your priority',help:'What would help first?',contribute:'How can you help?',participation:'How to take part?',pod:'What kind of group?',project:'Start or join a project?',support:'What would help the group?',goal:'What do you want?',intention:'Your intention',build:'What to build?',how:'How to build it?',want:'What do you want from it?',offer:'What can you put in?',time:'How much time?',when:'When to expect results?',result:'What results?',done:'What does done look like?'};
   for(const [index,item] of [{id:'',title:'Introduction'},...(sectionsByPage.get(active)||[])].entries()){
    const link=make('a','',index?index+'. '+(labels[item.id]||item.title):item.title);
    link.href=active+(item.id?'#'+encodeURIComponent(item.id):'');
    link.dataset.sectionId=item.id;link.title=item.title;
    link.setAttribute('aria-label',index?index+'. '+item.title:item.title);
    link.addEventListener('click',event=>{if(event.button||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();chooseSection(item.id,true);});
    sectionLinks.append(link);
   }
   scheduleSectionTracking();return;
  }
for(const item of [{id:'',title:'Overview'},...(sectionsByPage.get(active)||[])]){const shortLabels={'section-1':'Starting point','the-idea-in-brief':'The idea in brief','know-why-people-are-here':'Why people are here','administrators-help-the-community-function':'Administrators','build-channels-around-actual-needs':'Channels & pods','help-people-through-a-layoff':'Layoff support','let-teams-form-keep-the-connections-useful':'Projects & connections','ideas-need-execution-and-sales':'Execution & sales','goal':'What you want','intention':'Your intention','build':'What to build','how':'How to build it','want':'What you want from it','offer':'Your contribution','time':'Your time','when':'Timeline','result':'Expected results','done':'What done looks like','starting-point':'Starting point','lessons':'Lessons','practical':'Putting it into practice'};const link=make('a','',shortLabels[item.id]||item.title);link.title=item.title;link.dataset.sectionId=item.id;link.href=active+(item.id?'#'+encodeURIComponent(item.id):'');if(item.id===selectedSection)link.setAttribute('aria-current','page');link.addEventListener('click',event=>{if(event.button||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();chooseSection(item.id,true);});sectionLinks.append(link);}scheduleSectionTracking();}
 function applySection(frame,id){
  const doc=frame.contentDocument;
  // A section link is a bookmark within the complete document.
  doc.documentElement.classList.remove('mf-subpage-mode');
  for(const node of doc.querySelectorAll('.mf-view-hidden'))node.classList.remove('mf-view-hidden');
  const node=doc.getElementById(id);
  requestAnimationFrame(()=>{
   scrollToContent(frame,node);
   scrollPositions.set(active,window.scrollY);
  });
 }
 function chooseSection(id,push){selectedSection=id;const frame=frames.get(active);if(!frame||frame.dataset.ready!=='true')return;applySection(frame,id);highlightSection(id);if(push)history.pushState({perspective:active,section:id},'',active+(id?'#'+encodeURIComponent(id):''));}
 let sectionTrackingPending=false;
 function highlightSection(id){
  for(const link of sectionLinks.querySelectorAll('[data-section-id]')){
   if(link.dataset.sectionId===id)link.setAttribute('aria-current','location');
   else link.removeAttribute('aria-current');
  }
 }
 function scheduleSectionTracking(){
  if(sectionTrackingPending)return;
  sectionTrackingPending=true;
  requestAnimationFrame(()=>{
   sectionTrackingPending=false;
   const frame=frames.get(active);
   if(!frame||frame.dataset.ready!=='true'||sectionBar.hidden||main.hasAttribute('aria-busy'))return;
   const readingLine=masthead.offsetHeight+sectionBar.offsetHeight+20;
   const frameTop=frame.getBoundingClientRect().top;
   let currentId='';
   for(const item of sectionsByPage.get(active)||[]){
    if(frameTop+item.node.getBoundingClientRect().top<=readingLine)currentId=item.id;
    else break;
   }
   const last=(sectionsByPage.get(active)||[]).at(-1);
   if(last&&window.scrollY>0&&window.scrollY+window.innerHeight>=document.documentElement.scrollHeight-2&&frameTop+last.node.getBoundingClientRect().top<window.innerHeight)currentId=last.id;
   highlightSection(currentId);
  });
 }
 window.addEventListener('scroll',scheduleSectionTracking,{passive:true});
 window.addEventListener('resize',scheduleSectionTracking,{passive:true});
 const sectionSizeObserver=new ResizeObserver(scheduleSectionTracking);
 sectionSizeObserver.observe(sectionBar);sectionSizeObserver.observe(masthead);
 window.addEventListener('popstate',()=>{selectedSection=decodeURIComponent(location.hash.slice(1));open(normalized(location.pathname),false);const frame=frames.get(active);if(frame?.dataset.ready==='true')applySection(frame,selectedSection);});
 open(current.path,false);
})();
