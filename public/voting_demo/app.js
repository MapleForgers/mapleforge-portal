'use strict';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='mapleforge-standalone-voting-demo-v1';
let saved={};try{saved=JSON.parse(localStorage.getItem(KEY))||{};}catch(_){}
let votes=saved.votes||{},commentVotes=saved.commentVotes||{},localPosts=Array.isArray(saved.posts)?saved.posts:[],localComments=Array.isArray(saved.comments)?saved.comments:[],events=Array.isArray(saved.events)?saved.events:[];
let visibility=saved.visibility||{},panelMode='activity';
let category='All',sort='top',query='',expanded=null,replyTo=null;
const started=Date.now(),names=['CedarWorks','NorthCircuit','PrairieMaker','HarbourStudio'];
const initial=DEMO_EXAMPLES.map((r,i)=>({...r,created:started-(i+2)*3600000,comments:r.comments.map((c,j)=>({...c,id:r.id+'-c'+j,parent:Number.isInteger(c.parentIndex)?r.id+'-c'+c.parentIndex:c.reply?r.id+'-c0':null,created:started-(i+1.8-j*.1)*3600000}))}));
function save(){try{localStorage.setItem(KEY,JSON.stringify({votes,visibility,commentVotes,posts:localPosts,comments:localComments,events}));}catch(_){$('#results-count').textContent='Browser storage is full. Changes remain available until this page closes.';}}
function all(){return [...localPosts,...initial];}
function stamp(ms){return '<time datetime="'+new Date(ms).toISOString()+'">'+esc(new Date(ms).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}))+'</time>';}
function totals(r){const v=votes[r.id];return {yes:r.yes+(v==='agree'?1:0),no:r.no+(v==='disagree'?1:0),abstain:r.abstain+(v==='abstain'?1:0)};}
function score(r){const t=totals(r);return t.yes-t.no;}
function comments(r){return [...r.comments,...localComments.filter(c=>c.post===r.id)];}
function log(id,action,privateVote=false){events.unshift({post:id,author:privateVote?'Hidden voter':'Demo visitor',action,created:Date.now()});events=events.slice(0,150);save();}
function commentHtml(r,parent=null,seen=new Set()){
 return comments(r).filter(c=>(c.parent||null)===parent).map(c=>{
 if(seen.has(c.id))return '';seen.add(c.id);
 return '<article class="comment" id="'+esc(c.id)+'"><div class="meta"><span class="author">'+esc(c.author)+'</span>'+stamp(c.created)+'</div><div class="comment-body">'+esc(c.body)+'</div><div class="comment-actions"><button class="arrow" data-comment-vote="1" data-comment="'+esc(c.id)+'" aria-label="Upvote comment" aria-pressed="'+(commentVotes[c.id]===1)+'">▲</button><strong>'+(c.score+(commentVotes[c.id]||0))+'</strong><button class="arrow" data-comment-vote="-1" data-comment="'+esc(c.id)+'" aria-label="Downvote comment" aria-pressed="'+(commentVotes[c.id]===-1)+'">▼</button><button data-reply="'+esc(c.id)+'">Reply</button></div><div class="replies">'+commentHtml(r,c.id,seen)+'</div></article>';
 }).join('');
}
function voteList(r){
 const shift=(Number(r.id.replace('demo-',''))||0)*3,people=DEMO_VOTERS;let offset=0;
 return '<div class="vote-list"><p>Fictional demo voters. Votes show the voter’s name.</p>'+[['agree','For',r.yes],['disagree','Against',r.no],['abstain','Abstain',r.abstain]].map(([choice,label,n])=>{let rows=[];for(let i=0;i<n;i++){const index=offset++;rows.push({name:people[(index+shift)%people.length],private:false});}if(votes[r.id]===choice)rows.push({name:'Demo visitor',private:visibility[r.id]==='private'});return '<section data-vote-group="'+choice+'"><h4>'+label+' · '+rows.length+'</h4><ul>'+rows.map(v=>'<li>'+esc(v.private?'Hidden voter':v.name)+'</li>').join('')+'</ul></section>';}).join('')+'</div>';
}
function activity(r){
 const example=[...r.comments].reverse().map(c=>({author:c.author,action:c.parent?'replied to a comment':'added a comment',created:c.created}));
 const rows=[...events.filter(e=>e.post===r.id),...example,{author:r.author,action:'created the proposal',created:r.created}];
 return '<aside class="activity"><div class="history-tabs"><button data-panel="activity" aria-pressed="'+(panelMode==='activity')+'">Activity</button><button data-panel="votes" aria-pressed="'+(panelMode==='votes')+'">Votes</button></div>'+(panelMode==='votes'?voteList(r):'<h3>Activity</h3><ol>'+rows.map(e=>'<li><strong>'+esc(e.author)+'</strong> '+esc(e.action)+stamp(e.created)+'</li>').join('')+'</ol>')+'</aside>';
}
function draw(){
 const rows=all().filter(r=>(category==='All'||r.category===category)&&(!query||(r.title+' '+r.summary+' '+r.detail).toLowerCase().includes(query)));
 rows.sort((a,b)=>sort==='new'?b.created-a.created:sort==='discussed'?comments(b).length-comments(a).length:score(b)-score(a));
 $('#categories').innerHTML=['All','Rules','Structure','Agreements','Features','Projects','Proposals'].map(c=>'<button data-category="'+c+'" aria-pressed="'+(category===c)+'">'+(c==='All'?'all posts':c.toLowerCase())+'</button>').join('');
 $('#sorts').innerHTML=['top','new','discussed'].map(s=>'<button data-sort="'+s+'" aria-pressed="'+(sort===s)+'">'+s+'</button>').join('');
 $('#results-count').textContent=rows.length+' proposals · '+(category==='All'?'all topics':category.toLowerCase())+' · simulated votes';
 $('#proposal-count').textContent=all().length;$('#comment-count').textContent=all().reduce((n,r)=>n+comments(r).length,0);
 $('#posts').innerHTML=rows.map((r,i)=>{
 const t=totals(r),open=expanded===r.id;
 return '<article class="post" data-post="'+esc(r.id)+'"><div class="votes">'+[['agree','▲'],['disagree','▼']].map(([choice,icon],i)=>(i?'<strong>'+score(r)+'</strong>':'')+'<button data-vote="'+choice+'" data-visibility="public" data-id="'+esc(r.id)+'" aria-label="Vote '+(choice==='agree'?'for':'against')+'" aria-pressed="'+(votes[r.id]===choice)+'">'+icon+'</button>').join('')+'</div><div class="post-summary"><h2><button class="title" data-expand="'+esc(r.id)+'" aria-expanded="'+open+'">'+esc(r.title)+'</button></h2><div class="meta"><span class="flair" data-cat="'+esc(r.category)+'">'+esc(r.category)+'</span><span>proposed by <span class="author">'+esc(r.author)+'</span></span>'+stamp(r.created)+'</div><p class="excerpt">'+esc(r.summary)+'</p><div class="actions"><button data-expand="'+esc(r.id)+'" aria-expanded="'+open+'">'+(open?'▾ Collapse':'▸ Expand')+'</button><button class="comments-link" data-expand="'+esc(r.id)+'">'+comments(r).length+' comments</button><button data-show-votes="'+esc(r.id)+'">Votes</button><span>'+t.yes+' agree · '+t.no+' disagree · '+t.abstain+' abstain</span><button data-vote="abstain" data-id="'+esc(r.id)+'" aria-pressed="'+(votes[r.id]==='abstain')+'">abstain</button></div></div>'+(open?'<div class="expanded"><div class="expanded-grid"><div><div class="document"><h3>💡 How this could work</h3><p>'+esc(r.detail)+'</p><h3>☑ Suggested next step</h3><p>'+esc(r.nextStep||'Discuss the open questions, refine the proposal and agree how a decision will be made.')+'</p></div><div class="threads">'+commentHtml(r)+'</div><form id="comment-form" class="composer"><label for="comment-body">Add a demo comment</label><p class="reply-context">'+(replyTo?'Replying to '+esc(comments(r).find(c=>c.id===replyTo)?.author||'comment'):'Join the discussion as Demo visitor')+'</p><textarea id="comment-body" name="body" rows="6" maxlength="6000" required placeholder="Try a question, suggestion or objection…"></textarea><button type="submit" class="primary">Post demo comment</button>'+(replyTo?'<button type="button" id="cancel-reply">Cancel reply</button>':'')+'</form><button data-expand="'+esc(r.id)+'">▴ Collapse</button></div>'+activity(r)+'</div></div>':'')+'</article>';
 }).join('')||'<p class="empty">No matching proposals. Try another category or search.</p>';
}
function rerenderPreservingDraft(){const old=$('#comment-body'),draft=old?.value;draw();if(draft&&$('#comment-body'))$('#comment-body').value=draft;}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.category){category=b.dataset.category;expanded=null;replyTo=null;draw();}
 if(b.dataset.sort){sort=b.dataset.sort;rerenderPreservingDraft();}
 if(b.dataset.expand){const id=b.dataset.expand;expanded=expanded===id?null:id;replyTo=null;draw();const row=[...document.querySelectorAll('[data-post]')].find(p=>p.dataset.post===id);if(row?.getBoundingClientRect().top<0)row.scrollIntoView({block:'start'});}
 if(b.dataset.showVotes){expanded=b.dataset.showVotes;panelMode='votes';rerenderPreservingDraft();}
 if(b.dataset.panel){panelMode=b.dataset.panel;rerenderPreservingDraft();}
 if(b.dataset.vote){const id=b.dataset.id,old=votes[id],oldVisibility=visibility[id]||'public',v='public';votes[id]=old===b.dataset.vote?null:b.dataset.vote;visibility[id]=v;log(id,votes[id]?'cast a '+votes[id]+' vote':'withdrew a vote',v==='private'||oldVisibility==='private');rerenderPreservingDraft();}
 if(b.dataset.commentVote){const id=b.dataset.comment,v=Number(b.dataset.commentVote);commentVotes[id]=commentVotes[id]===v?0:v;log(expanded,commentVotes[id]===0?'withdrew a comment vote':commentVotes[id]===1?'upvoted a comment':'downvoted a comment');rerenderPreservingDraft();}
 if(b.dataset.reply){replyTo=b.dataset.reply;rerenderPreservingDraft();$('#comment-body').focus();}
 if(b.id==='cancel-reply'){replyTo=null;rerenderPreservingDraft();}
});
document.addEventListener('submit',e=>{if(e.target.id!=='comment-form')return;e.preventDefault();const body=e.target.elements.body.value.trim();if(!body)return;localComments.push({id:'local-c-'+crypto.randomUUID(),post:expanded,parent:replyTo,author:'Demo visitor',body,score:0,created:Date.now()});log(expanded,replyTo?'replied to a comment':'added a comment');replyTo=null;draw();});
$('#search').oninput=e=>{query=e.target.value.toLowerCase().trim();draw();};
$('#new-proposal').onclick=()=>{$('#proposal-form').hidden=false;$('#proposal-form [name=title]').focus();if(category!=='All')$('#proposal-form [name=category]').value=category;};
$('#cancel-proposal').onclick=()=>{$('#proposal-form').hidden=true;};
$('#proposal-form').onsubmit=e=>{e.preventDefault();const f=e.target,title=f.elements.title.value.trim(),body=f.elements.body.value.trim();if(!title||!body)return;const r={id:'local-p-'+crypto.randomUUID(),title,summary:body.length>220?body.slice(0,217)+'…':body,detail:body,category:f.elements.category.value,author:'Demo visitor',yes:0,no:0,abstain:0,created:Date.now(),comments:[]};localPosts.unshift(r);save();category='All';query='';$('#search').value='';sort='new';expanded=r.id;replyTo=null;f.reset();f.hidden=true;draw();};
$('#reset').onclick=()=>{if(!confirm('Reset only your local demo proposals, comments and votes?'))return;votes={};visibility={};commentVotes={};localPosts=[];localComments=[];events=[];expanded=null;replyTo=null;save();draw();};
$('#font-size').onchange=e=>document.documentElement.style.setProperty('--size',e.target.value+'px');
$('#theme').onchange=e=>document.body.dataset.theme=e.target.value;
draw();
