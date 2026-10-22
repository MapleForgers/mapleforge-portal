if(window.MF){
 const M=window.MF;
 sectionLabels.privacy='My content & privacy';
 let pending=null;
 async function drawPrivacy(){
  const root=document.getElementById('main');
  root.innerHTML='<h1>My content & privacy</h1><p>Remove your own posts, comments or board entries. Copies in Activity and saved collections are removed too. Other people’s comments on a deleted entry are also removed.</p><p>Removal affects the live portal. Restricted recovery backups may retain earlier data until they expire. Imported Discord summaries are separate and are not automatically matched to your account.</p><div id="privacy-list"></div><div id="privacy-confirm"></div><p id="privacy-message" role="status"></p><details><summary>Delete my portal account</summary><p>This removes your portal account and its submitted content, saved items, member details and map pin. It does not delete your Discord account. This cannot be undone from the portal.</p><form id="privacy-account"><label>Type DELETE to confirm<input name="confirmation" required pattern="DELETE" autocomplete="off"></label><button class="btn secondary">Delete my portal account</button></form></details>';
  if(!M.account){root.innerHTML='<h1>My content & privacy</h1><p>Sign in with Discord to manage your content.</p>';return;}
  const list=document.getElementById('privacy-list');
  try{const result=await M.api('/api/my-content');if(view!=='privacy')return;
   list.innerHTML=result.items.map((x,i)=>`<article class="details-card"><strong>${esc(x.title)}</strong><p>${esc(x.kind)}</p><button class="btn secondary" data-delete-index="${i}">Remove</button></article>`).join('')||'<p>No submitted posts, comments or board entries.</p>';
   list.querySelectorAll('[data-delete-index]').forEach(b=>b.onclick=()=>{
    pending=result.items[Number(b.dataset.deleteIndex)];const box=document.getElementById('privacy-confirm');
    box.innerHTML=`<p>Remove <strong>${esc(pending.title)}</strong> permanently from the live portal?</p><button id="privacy-yes" class="btn">Confirm removal</button> <button id="privacy-no" class="btn secondary">Cancel</button>`;
    document.getElementById('privacy-no').onclick=()=>{pending=null;box.replaceChildren();};
    document.getElementById('privacy-yes').onclick=async e=>{e.target.disabled=true;try{await M.api('/api/delete',pending);pending=null;await M.refresh();drawPrivacy();}catch(err){document.getElementById('privacy-message').textContent=err.message;e.target.disabled=false;}};
    box.scrollIntoView({block:'nearest'});
   });
  }catch(err){document.getElementById('privacy-message').textContent=err.message;}
  document.getElementById('privacy-account').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{await M.api('/api/delete',{kind:'Account',confirmation:new FormData(e.target).get('confirmation')});location.href='/portal1/';}catch(err){document.getElementById('privacy-message').textContent=err.message;b.disabled=false;}};
 }
 const before=render;render=function(){before();if(view==='privacy')drawPrivacy();};
 M.openPrivacy=()=>switchSection('privacy');
 if(requestedPortalSection==='privacy')switchSection('privacy');
}
