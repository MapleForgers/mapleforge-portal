if(window.MF){
 const M=window.MF;
 sectionLabels.privacy='My content & privacy';
 async function drawPrivacy(){
  const root=document.getElementById('main');
  root.innerHTML='<h1>My content & privacy</h1><p>Manage your contributions together. Removing them also removes their activity and saved copies, plus replies attached to your deleted entries.</p><p>Removal affects the live portal. Server recovery backups expire within 30 days. Imported Discord contributions are shown only with permission and a verified author link. Contact an administrator to delete retained imports.</p><div id="privacy-list"></div><div id="privacy-confirm"></div><p id="privacy-message" role="status"></p><details><summary>Delete my portal account</summary><p>This removes your portal account and its submitted content, saved items, member details and map pin. It does not delete your Discord account. This cannot be undone from the portal.</p><form id="privacy-account"><label>Type DELETE to confirm<input name="confirmation" required pattern="DELETE" autocomplete="off"></label><button class="btn secondary">Delete my portal account</button></form></details>';
  if(!M.account){root.innerHTML='<h1>My content & privacy</h1><p>Sign in with Discord to manage your content.</p>';return;}
  const consentButton=document.createElement('button');consentButton.className='btn secondary';consentButton.textContent='Discord sharing permissions';consentButton.onclick=()=>M.openDiscordConsent?.();root.insertBefore(consentButton,document.getElementById('privacy-list'));
  const list=document.getElementById('privacy-list');
  try{const result=await M.api('/api/my-content');if(view!=='privacy')return;
   list.innerHTML=`<h2>My portal contributions</h2><p>${result.items.length} contributions submitted through the portal.</p>${result.items.length ? '<button class="btn secondary" id="privacy-remove-all">Remove all my contributions</button>' : ''}`;
   const imported=document.createElement('section');
   imported.innerHTML='<h2>My Discord imports</h2><p>Manage all your imported contributions through Discord sharing permissions above. You can show or hide them together.</p><p>'+ (result.importedItems?.length ? `${result.importedItems.length} linked entries. ${result.importedItems.filter(x=>x.visible).length} currently visible.` : 'No imported entries are linked to your account yet.')+'</p>';
   list.after(imported);
   const removeAll=document.getElementById('privacy-remove-all');
   if(removeAll)removeAll.onclick=()=>{
    const box=document.getElementById('privacy-confirm');
    box.innerHTML='<p>Permanently remove all your portal posts, offers, board entries and comments? Replies attached to your deleted entries are removed too. Your account, profile, map pin and Discord sharing choices stay. This cannot be undone from the portal.</p><form id="privacy-bulk"><label>Type REMOVE to confirm <input name="confirmation" required pattern="REMOVE" autocomplete="off"></label><button class="btn">Remove all my contributions</button> <button type="button" id="privacy-no" class="btn secondary">Cancel</button></form>';
    document.getElementById('privacy-no').onclick=()=>box.replaceChildren();
    document.getElementById('privacy-bulk').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{await M.api('/api/delete',{kind:'Contributions',confirmation:new FormData(e.target).get('confirmation')});await M.refresh();await drawPrivacy();}catch(err){document.getElementById('privacy-message').textContent=err.message;b.disabled=false;}};
    box.scrollIntoView({block:'nearest'});
   };
  }catch(err){document.getElementById('privacy-message').textContent=err.message;}
  document.getElementById('privacy-account').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{await M.api('/api/delete',{kind:'Account',confirmation:new FormData(e.target).get('confirmation')});location.href='/portal1/';}catch(err){document.getElementById('privacy-message').textContent=err.message;b.disabled=false;}};
 }
 const before=render;render=function(){before();if(view==='privacy')drawPrivacy();};
 M.openPrivacy=()=>switchSection('privacy');
 if(requestedPortalSection==='privacy')switchSection('privacy');
}
