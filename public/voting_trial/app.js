'use strict';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let votes={},visibility={},commentVotes={},records=[],user=null,panelMode='activity';
let category='All',sort='top',query='',expanded=null,replyTo=null,busy=false;
function all(){return records;}
async function api(data){const r=await fetch('./api',{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined,credentials:'same-origin',cache:'no-store'});const result=await r.json();if(!r.ok)throw Error(result.error||'Could not reach the trial.');return result;}
function status(message){$('#trial-status').textContent=message;}
function requireUser(){if(user)return true;status('Enter a nickname above to join the trial.');$('#nickname').focus();return false;}
async function refresh(render=true){const data=await api();user=data.user;records=data.posts;votes={};visibility={};commentVotes={};for(const p of records){const own=p.votes.find(v=>v.own);if(own){votes[p.id]=own.choice;visibility[p.id]=own.visibility;}for(const c of p.comments)commentVotes[c.id]=c.ownVote;}
$('#join-form input').hidden=!!user;$('#join-form button').hidden=!!user;$('#join-form label').hidden=!!user;$('#joined-as').hidden=!user;$('#joined-as').textContent=user?'Joined as '+user.name:'';
if(render)rerenderPreservingDraft();}
async function write(data){if(busy)return false;busy=true;status('Saving…');try{const result=await api(data);await refresh();status('');return result;}catch(e){status(e.message);return false;}finally{busy=false;}}
function stamp(ms){return '<time datetime="'+new Date(ms).toISOString()+'">'+esc(new Date(ms).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}))+'</time>';}
function totals(r){return {yes:r.yes,no:r.no,abstain:r.abstain};}
function score(r){return r.yes-r.no;}
function comments(r){return r.comments;}
function commentHtml(r,parent=null,seen=new Set()){
 return comments(r).filter(c=>(c.parent||null)===parent).map(c=>{
 if(seen.has(c.id))return '';seen.add(c.id);
 return '<article class="comment" id="'+esc(c.id)+'"><div class="meta"><span class="author">'+esc(c.author)+'</span>'+stamp(c.created)+'</div><div class="comment-body">'+esc(c.body)+'</div><div class="comment-actions"><button class="arrow" data-comment-vote="1" data-comment="'+esc(c.id)+'" aria-label="Upvote comment" aria-pressed="'+(commentVotes[c.id]===1)+'">▲</button><strong>'+c.score+'</strong><button class="arrow" data-comment-vote="-1" data-comment="'+esc(c.id)+'" aria-label="Downvote comment" aria-pressed="'+(commentVotes[c.id]===-1)+'">▼</button><button data-reply="'+esc(c.id)+'">Reply</button></div><div class="replies">'+commentHtml(r,c.id,seen)+'</div></article>';
 }).join('');
}
function voteList(r){return '<div class="vote-list"><p>Votes show the voter’s nickname.</p>'+[['agree','For'],['disagree','Against'],['abstain','Abstain']].map(([choice,label])=>{const rows=r.votes.filter(v=>v.choice===choice);return '<section data-vote-group="'+choice+'"><h4>'+label+' · '+rows.length+'</h4><ul>'+rows.map(v=>'<li>'+esc(v.name)+'</li>').join('')+'</ul></section>';}).join('')+'</div>';}
function activity(r){return '<aside class="activity"><div class="history-tabs"><button data-panel="activity" aria-pressed="'+(panelMode==='activity')+'">Activity</button><button data-panel="votes" aria-pressed="'+(panelMode==='votes')+'">Votes</button></div>'+(panelMode==='votes'?voteList(r):'<h3>Activity</h3><ol>'+r.events.map(e=>'<li><strong>'+esc(e.author)+'</strong> '+esc(e.action)+stamp(e.created)+'</li>').join('')+'</ol>')+'</aside>';}
function draw(){
 const rows=all().filter(r=>(category==='All'||r.category===category)&&(!query||(r.title+' '+r.summary+' '+r.detail).toLowerCase().includes(query)));
 rows.sort((a,b)=>sort==='new'?b.created-a.created:sort==='discussed'?comments(b).length-comments(a).length:score(b)-score(a));
 $('#categories').innerHTML=['All','Rules','Structure','Agreements','Features','Projects','Proposals'].map(c=>'<button data-category="'+c+'" aria-pressed="'+(category===c)+'">'+(c==='All'?'all posts':c.toLowerCase())+'</button>').join('');
 $('#sorts').innerHTML=['top','new','discussed'].map(s=>'<button data-sort="'+s+'" aria-pressed="'+(sort===s)+'">'+s+'</button>').join('');
 $('#results-count').textContent=rows.length+' proposals · '+(category==='All'?'all topics':category.toLowerCase())+' · non-binding trial';
 $('#proposal-count').textContent=all().length;$('#comment-count').textContent=all().reduce((n,r)=>n+comments(r).length,0);
 $('#posts').innerHTML=rows.map((r,i)=>{
 const t=totals(r),open=expanded===r.id;
 return '<article class="post" data-post="'+esc(r.id)+'"><div class="votes">'+[['agree','▲'],['disagree','▼']].map(([choice,icon],i)=>(i?'<strong>'+score(r)+'</strong>':'')+'<button data-vote="'+choice+'" data-visibility="public" data-id="'+esc(r.id)+'" aria-label="Vote '+(choice==='agree'?'for':'against')+'" aria-pressed="'+(votes[r.id]===choice)+'">'+icon+'</button>').join('')+'</div><div class="post-summary"><h2><button class="title" data-expand="'+esc(r.id)+'" aria-expanded="'+open+'">'+esc(r.title)+'</button></h2><div class="meta"><span class="flair" data-cat="'+esc(r.category)+'">'+esc(r.category)+'</span><span>proposed by <span class="author">'+esc(r.author)+'</span></span>'+stamp(r.created)+'</div><p class="excerpt">'+esc(r.summary)+'</p><div class="actions"><button data-expand="'+esc(r.id)+'" aria-expanded="'+open+'">'+(open?'▾ Collapse':'▸ Expand')+'</button><button class="comments-link" data-expand="'+esc(r.id)+'">'+comments(r).length+' comments</button><button data-show-votes="'+esc(r.id)+'">Votes</button><span>'+t.yes+' agree · '+t.no+' disagree · '+t.abstain+' abstain</span><button data-vote="abstain" data-id="'+esc(r.id)+'" aria-pressed="'+(votes[r.id]==='abstain')+'">abstain</button></div></div>'+(open?'<div class="expanded"><div class="expanded-grid"><div><div class="document"><p>'+esc(r.detail)+'</p></div><div class="threads">'+commentHtml(r)+'</div><form id="comment-form" class="composer"><label for="comment-body">Add a comment</label><p class="reply-context">'+(replyTo?'Replying to '+esc(comments(r).find(c=>c.id===replyTo)?.author||'comment'):'Join the discussion'+(user?' as '+esc(user.name):''))+'</p><textarea id="comment-body" name="body" rows="6" maxlength="6000" required placeholder="Try a question, suggestion or objection…"></textarea><button type="submit" class="primary">Post comment</button>'+(replyTo?'<button type="button" id="cancel-reply">Cancel reply</button>':'')+'</form><button data-expand="'+esc(r.id)+'">▴ Collapse</button></div>'+activity(r)+'</div></div>':'')+'</article>';
 }).join('')||'<p class="empty">No proposals here yet. Start with a rule, agreement, feature or project you would like to explore.</p>';
}
function rerenderPreservingDraft(){const old=$('#comment-body'),draft=old?.value;draw();if(draft&&$('#comment-body'))$('#comment-body').value=draft;}
document.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.category){category=b.dataset.category;expanded=null;replyTo=null;draw();}
 if(b.dataset.sort){sort=b.dataset.sort;rerenderPreservingDraft();}
 if(b.dataset.expand){const id=b.dataset.expand;expanded=expanded===id?null:id;replyTo=null;draw();const row=[...document.querySelectorAll('[data-post]')].find(p=>p.dataset.post===id);if(row?.getBoundingClientRect().top<0)row.scrollIntoView({block:'start'});}
 if(b.dataset.showVotes){expanded=b.dataset.showVotes;panelMode='votes';rerenderPreservingDraft();}
 if(b.dataset.panel){panelMode=b.dataset.panel;rerenderPreservingDraft();}
 if(b.dataset.vote){if(!requireUser())return;const id=b.dataset.id,old=votes[id],v='public';await write({op:'vote',post:id,choice:old===b.dataset.vote?'remove':b.dataset.vote,visibility:v});}
 if(b.dataset.commentVote){if(!requireUser())return;const id=b.dataset.comment,v=Number(b.dataset.commentVote);await write({op:'comment_vote',post:expanded,comment:id,value:commentVotes[id]===v?0:v});}
 if(b.dataset.reply){replyTo=b.dataset.reply;rerenderPreservingDraft();$('#comment-body').focus();}
 if(b.id==='cancel-reply'){replyTo=null;rerenderPreservingDraft();}
});
document.addEventListener('submit',async e=>{if(e.target.id!=='comment-form')return;e.preventDefault();if(!requireUser())return;const body=e.target.elements.body.value.trim();if(!body)return;const post=expanded;if(await write({op:'comment',post,parent:replyTo,body})){try{localStorage.removeItem('mapleforge-trial-draft:'+post);}catch(_){}replyTo=null;draw();}});
$('#search').oninput=e=>{query=e.target.value.toLowerCase().trim();draw();};
$('#new-proposal').onclick=()=>{if(!requireUser())return;$('#proposal-form').hidden=false;$('#proposal-form [name=title]').focus();if(category!=='All')$('#proposal-form [name=category]').value=category;};
$('#cancel-proposal').onclick=()=>{$('#proposal-form').hidden=true;};
$('#proposal-form').onsubmit=async e=>{e.preventDefault();if(!requireUser())return;const f=e.target,title=f.elements.title.value.trim(),body=f.elements.body.value.trim();if(!title||!body)return;const result=await write({op:'post',title,body,category:f.elements.category.value});if(result){category='All';query='';$('#search').value='';sort='new';expanded=result.id;replyTo=null;f.reset();f.hidden=true;draw();}};
$('#join-form').onsubmit=async e=>{e.preventDefault();if(user)return;await write({op:'join',name:e.target.elements.name.value.trim()});};
$('#font-size').onchange=e=>document.documentElement.style.setProperty('--size',e.target.value+'px');
$('#theme').onchange=e=>document.body.dataset.theme=e.target.value;
draw();refresh().catch(e=>status(e.message));
setInterval(()=>{if(!document.hidden&&!busy&&!document.activeElement?.closest('form'))refresh().catch(e=>status(e.message));},10000);
