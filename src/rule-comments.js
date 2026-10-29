// Threaded rule discussions. User text is escaped before formatting.
{
  const text=(en,fr)=>document.documentElement.lang.startsWith('fr')?fr:en;
  function formatted(value) {
    return '<div class="forum-document">'+String(value).split('\n').map(line=>{
      if(!line.trim())return '<div class="document-break"></div>';
      const heading=line.startsWith('## '),checked=line.startsWith('- [x] '),unchecked=line.startsWith('- [ ] '),quote=line.startsWith('> '),bullet=line.startsWith('- ');const prefix=heading?3:checked||unchecked?6:quote||bullet?2:0;
      let s=esc(line.slice(prefix));
      s=s.replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>');
      s=s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      s=s.replace(/\[color=(blue|green|orange|purple|red)\]([\s\S]*?)\[\/color\]/g,'<span class="comment-color-$1">$2</span>');
      return heading?`<h4>${s}</h4>`:checked||unchecked?`<div>${checked?'☑':'☐'} ${s}</div>`:quote?`<blockquote>${s}</blockquote>`:bullet?`<div>• ${s}</div>`:`<div>${s||'<br>'}</div>`;
    }).join('')+'</div>';
  }
  const styles=document.createElement('style');styles.textContent=`.rule-comment{padding:1rem 0;border-bottom:1px solid var(--line,#ccc);overflow-wrap:anywhere;font-size:1rem}.rule-replies{margin-left:clamp(.5rem,2vw,1.5rem)}.rule-media{max-width:100%;max-height:24rem;display:block;margin:.75rem 0}.rule-comment-actions,.rule-editor-tools{display:flex;flex-wrap:wrap;gap:.5rem;margin:.75rem 0}.rule-comment-actions button,.rule-editor-tools button{font-size:1rem}.rule-comment-edit textarea{display:block;width:100%;min-height:16rem;font:inherit}.rule-editor textarea{width:100%;min-height:20rem;font-size:1rem}.rule-comment code{white-space:pre-wrap}.rule-comment blockquote{margin:.5rem 0;padding-left:1rem}.rule-editor fieldset{min-width:0}#governance-detail .rule-editor-tools .rule-post-comment{margin-left:auto;background:var(--forum-link,#245f9d)!important;color:var(--surface,#fff)!important;padding:9px 16px!important;border-radius:4px!important;font-weight:700;min-height:42px}#governance-detail .rule-editor-tools .rule-post-comment:disabled{opacity:.6}.rule-preview:empty,.reply-context:empty{display:none}.rule-editor-host{margin:12px 0}.rule-comment>.rule-editor-host{margin-left:16px}.rule-comment{border-bottom:0}`;document.head.append(styles);
  // Shared safe markup and toolbar for proposals and comments. No raw HTML is rendered.
  MF.formatComment=formatted;
  MF.postPreview=value=>{const line=String(value||'').split('\n').find(s=>s.trim()&&!s.startsWith('## '))||'';const plain=line.replace(/\[color=[a-z]+\]|\[\/color\]|\*\*|`/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1');return plain.length>220?plain.slice(0,217).trimEnd()+'…':plain;};
  MF.addFormatting=function(ta,tools,basic=true){
    const insert=(start,end='')=>{const from=ta.selectionStart,to=ta.selectionEnd;ta.setRangeText(start+ta.value.slice(from,to)+end,from,to,'select');ta.dispatchEvent(new Event('input',{bubbles:true}));ta.focus();};
    const controls=basic?[['Bold','**','**'],['Italic','*','*'],['Quote','> ',''],['Link','[','](https://)']]:[];
    controls.push([text('Heading','Titre'),'## ',''],[text('Checklist','Liste à cocher'),'- [ ] ',''],[text('Checked','Coché'),'- [x] ','']);
    controls.forEach(([label,start,end])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>insert(start,end);tools.append(b);});
    for(const [title,options] of [[text('Colors','Couleurs'),[['Blue','blue'],['Green','green'],['Orange','orange'],['Purple','purple'],['Red','red']]],[text('Icons','Icônes'),[['👍','👍'],['✅','✅'],['💡','💡'],['🗳️','🗳️'],['🤝','🤝'],['🔄','🔄'],['⭐','⭐'],['⚠️','⚠️']]]]){
      const picker=document.createElement('details');picker.className='comment-format-picker';const summary=document.createElement('summary');summary.textContent=title;picker.append(summary);const choices=document.createElement('div');picker.append(choices);
      options.forEach(([label,value])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-label',title+' '+label);b.onclick=()=>{if(/^[a-z]+$/.test(value))insert('[color='+value+']','[/color]');else insert(value+' ');picker.open=false;};choices.append(b);});tools.append(picker);
    }
    ta.rows=12;ta.style.minHeight='20rem';ta.style.width='100%';
  };
  const richStyle=document.createElement('style');richStyle.textContent=`.comment-color-blue{color:#245f9d}.comment-color-green{color:#237344}.comment-color-orange{color:#a8470a}.comment-color-purple{color:#7943a5}.comment-color-red{color:#b52c32}body[data-theme=night] .comment-color-blue{color:#9bcaff}body[data-theme=night] .comment-color-green{color:#83dca1}body[data-theme=night] .comment-color-orange{color:#ffb675}body[data-theme=night] .comment-color-purple{color:#d3afff}body[data-theme=night] .comment-color-red{color:#ff9ba0}.comment-format-picker{position:relative}.comment-format-picker summary{cursor:pointer;padding:4px 6px}.comment-format-picker>div{position:absolute;z-index:5;display:flex;flex-wrap:wrap;gap:4px;min-width:180px;padding:8px;background:var(--surface,#fff);border:1px solid var(--line,#ccc)}.rich-editor-tools{display:flex;flex-wrap:wrap;gap:6px}.forum-document{max-width:78ch;white-space:normal;line-height:1.5;overflow-wrap:anywhere}.forum-document>div{margin:0}.forum-document .document-break{height:.65em}.forum-document .document-break+.document-break{display:none}body #main .forum-document h4,body #main .forum-document h4 span,body #governance-detail .forum-document h4,body #governance-detail .forum-document h4 span{font-size:calc(var(--rules-text-size,18px) + 3px)!important;line-height:1.3;margin:1em 0 .3em;font-weight:700}.forum-document>h4:first-child{margin-top:0!important}.forum-document h4+.document-break,.forum-document .document-break:has(+h4){display:none}.forum-document blockquote{margin:.5em 0!important;padding:8px 14px;border-left:3px solid var(--forum-link,#245f9d);background:var(--forum-strip,#eef4fa)}`;document.head.append(richStyle);
  const oldNewRule=newGovernance;newGovernance=function(){oldNewRule();document.querySelectorAll('textarea[name=summary]').forEach(ta=>{if(ta.dataset.formatted)return;ta.dataset.formatted='true';const tools=document.createElement('div');tools.className='rich-editor-tools';ta.before(tools);MF.addFormatting(ta,tools);});};
  const drafts=new Map();
  const draftKey=id=>'mapleforge-rule-draft:'+String(MF.account?.id||'guest')+':'+id;
  const draftDB=new Promise(resolve=>{try{const req=indexedDB.open('mapleforge-comment-drafts',1);req.onupgradeneeded=()=>req.result.createObjectStore('drafts');req.onsuccess=()=>resolve(req.result);req.onerror=()=>resolve(null);}catch(_){resolve(null);}});
  function saveDraft(id,draft){const key=draftKey(id);try{localStorage.setItem(key,JSON.stringify({body:draft.body,parent:draft.parent}));}catch(_){}draftDB.then(db=>{if(db){const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put({body:draft.body,parent:draft.parent,files:draft.files},key);}});}
  function clearDraft(id){const key=draftKey(id);try{localStorage.removeItem(key);}catch(_){}draftDB.then(db=>{if(db)db.transaction('drafts','readwrite').objectStore('drafts').delete(key);});drafts.delete(key);}

  const previous=openGovernance;
  openGovernance=function(id){
    previous(id);
    const dialog=governanceDialog,form=dialog.querySelector('#gov-comment');
    dialog.querySelectorAll('.request-comment').forEach(el=>el.remove());
    const heading=[...dialog.querySelectorAll('h3')].find(el=>el.textContent.includes('Discussion'));if(heading)heading.remove();
    const area=document.createElement('section');form.replaceWith(area);
    const comments=(MF.bookmarkData?.comments||[]).filter(c=>c.target==='Governance:'+id);
    const votes=(MF.bookmarkData?.relations||[]).filter(r=>r.kind==='comment_vote');
    const score=cid=>votes.filter(r=>r.target==='Comments:'+cid).reduce((n,r)=>n+(r.data?.value||0),0);
    const byId=new Map(comments.map(c=>[c.id,c]));
    const children=parent=>comments.filter(c=>(c.parent&&byId.has(c.parent)?c.parent:'')===parent).sort((a,b)=>score(b.id)-score(a.id)||a.created-b.created);
    area.innerHTML=`<div class="rule-thread-list"></div><div class="rule-editor-host"></div>`;
    const seen=new Set();
    function appendThread(parent,host,depth=0){
      for(const c of children(parent)){
        if(seen.has(c.id))continue;seen.add(c.id);
        const article=document.createElement('article');article.className='rule-comment';article.dataset.commentId=c.id;
        article.innerHTML=`<div class="comment-byline"><strong>${memberName(c.author)}</strong> <span class="comment-timestamp">${portalTimeHtml(c.created*1000)}</span></div><div>${formatted(c.body)}</div>`;
        for(const a of c.attachments||[]){
          if(!/^\/api\/media\/[a-f0-9]+$/.test(a.url))continue;
          const el=document.createElement(a.mime.startsWith('video/')?'video':'img');el.src=a.url;el.className='rule-media';
          if(el.tagName==='VIDEO'){el.controls=true;el.preload='metadata';}else{el.alt=a.name;el.loading='lazy';}article.append(el);
        }
        const actions=document.createElement('div');actions.className='rule-comment-actions';
        const own=votes.find(r=>r.target==='Comments:'+c.id&&r.uid===MF.account?.id)?.data?.value||0;
        for(const [value,label] of [[1,text('Upvote','Vote positif')],[-1,text('Downvote','Vote négatif')]]){
          const b=document.createElement('button');b.type='button';b.className='filter-chip';b.textContent=label;b.setAttribute('aria-pressed',String(own===value));b.disabled=!MF.account;
          b.onclick=async()=>{b.disabled=true;try{await MF.api('/api/comment-vote',{id:c.id,value:own===value?0:value});await MF.refresh();openGovernance(id);}catch(e){toast(e.message);b.disabled=false;}};actions.append(b);
        }
        const count=document.createElement('span');count.textContent=`${score(c.id)} ${text('score','points')}`;actions.append(count);
        const reply=document.createElement('button');reply.type='button';reply.className='btn link';reply.textContent=text('Reply','Répondre');reply.onclick=()=>{editor(c.id,c.author);area.querySelector('textarea').focus();};actions.append(reply);
        if(MF.account?.id===c.uid){
          const edit=document.createElement('button');edit.type='button';edit.textContent=text('Edit','Modifier');
          edit.onclick=()=>{
            if(article.querySelector(':scope > .rule-comment-edit'))return;
            const f=document.createElement('form');f.className='rule-comment-edit';
            f.innerHTML=`<label>${text('Edit your comment','Modifier votre commentaire')}<textarea name="body" maxlength="12000">${esc(c.body)}</textarea></label>${(c.attachments||[]).map(a=>`<label><input type="checkbox" name="remove" value="${esc(a.id)}">${text('Remove attachment: ','Supprimer le fichier : ')}${esc(a.name)}</label>`).join('')}<button type="submit">${text('Save changes','Enregistrer')}</button><button type="button" class="cancel-edit">${text('Cancel','Annuler')}</button><p role="status"></p>`;
            actions.after(f);f.querySelector('.cancel-edit').onclick=()=>f.remove();f.querySelector('textarea').focus();
            f.onsubmit=async e=>{e.preventDefault();const submit=f.querySelector('[type=submit]');submit.disabled=true;try{await MF.api('/api/comments',{op:'edit',id:c.id,body:f.elements.body.value,originalBody:c.body,removeAttachments:[...f.querySelectorAll('[name=remove]:checked')].map(el=>el.value)});await MF.refresh();openGovernance(id);}catch(err){f.querySelector('[role=status]').textContent=err.message;submit.disabled=false;}};
          };actions.append(edit);
          const del=document.createElement('button');del.type='button';del.textContent=text('Delete','Supprimer');
          del.onclick=async()=>{if(!confirm(text('Delete your comment and its attachments? Other people’s replies will remain.','Supprimer votre commentaire et ses fichiers ? Les réponses des autres resteront.')))return;del.disabled=true;try{await MF.api('/api/delete',{kind:'Comments',id:c.id});await MF.refresh();openGovernance(id);}catch(err){toast(err.message);del.disabled=false;}};actions.append(del);
        }
        article.append(actions);host.append(article);
        const replies=document.createElement('div');replies.className='rule-replies';article.append(replies);appendThread(c.id,replies,depth+1);
      }
    }
    appendThread('',area.querySelector('.rule-thread-list'));
    function editor(parent='',name=''){
      let draft=drafts.get(draftKey(id));if(!draft){draft={body:'',files:[],parent:''};try{Object.assign(draft,JSON.parse(localStorage.getItem(draftKey(id))||'{}'));}catch(_){}drafts.set(draftKey(id),draft);}draft.parent=parent;
      const host=area.querySelector('.rule-editor-host');const parentArticle=[...area.querySelectorAll('.rule-comment')].find(el=>el.dataset.commentId===parent);if(parentArticle)parentArticle.append(host);else area.append(host);host.innerHTML=`<form class="rule-editor" data-dirty="true"><p class="reply-context">${parent?text('Reply to ','Réponse à ')+esc(name):''}</p><div class="rule-editor-tools"></div><label>${text('Comment (optional with an attachment)','Commentaire (facultatif avec un fichier)')}<textarea name="body" maxlength="12000"></textarea></label><p>${text('Paste an image, attach images/videos, or paste a video link. Up to 3 files, 20 MB total.','Collez une image, joignez des images/vidéos ou collez un lien vidéo. Jusqu’à 3 fichiers, 20 Mo au total.')}</p><input hidden type="file" accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm" multiple><div class="rule-files"></div><div class="rule-preview"></div><p role="status"></p><button class="btn" type="submit">${text('Post comment','Publier')}</button></form>`;
      const f=host.querySelector('form'),ta=f.querySelector('textarea'),status=f.querySelector('[role=status]');ta.value=draft.body;
      if(!draft.loaded){draft.loaded=true;const key=draftKey(id);draftDB.then(db=>{if(!db)return;const req=db.transaction('drafts').objectStore('drafts').get(key);req.onsuccess=()=>{if(req.result&&!draft.touched&&drafts.get(key)===draft){draft.body=req.result.body||draft.body;draft.files=req.result.files||[];if(f.isConnected){ta.value=draft.body;list();}}};});}
ta.oninput=()=>{draft.body=ta.value;draft.touched=true;saveDraft(id,draft);};
      const tools=f.querySelector('.rule-editor-tools');
      for(const [title,start,end] of [['Bold','**','**'],['Italic','*','*'],['Code','`','`'],['Quote','> ',''],['List','- ',''],['Link','[','](https://)']]){
        const b=document.createElement('button');b.type='button';b.textContent=title;b.className='filter-chip';b.onclick=()=>{const from=ta.selectionStart,to=ta.selectionEnd;ta.setRangeText(start+ta.value.slice(from,to)+end,from,to,'select');draft.body=ta.value;draft.touched=true;saveDraft(id,draft);ta.focus();};tools.append(b);
      }
      MF.addFormatting(ta,tools,false);
      const preview=document.createElement('button');preview.type='button';preview.textContent=text('Preview','Aperçu');preview.onclick=()=>{f.querySelector('.rule-preview').innerHTML=formatted(ta.value);};tools.append(preview);
      const attach=document.createElement('button');attach.type='button';attach.textContent=text('Attach','Joindre');attach.onclick=()=>f.querySelector('input[type=file]').click();tools.append(attach);const post=f.querySelector('[type=submit]');post.classList.add('rule-post-comment');tools.append(post);
      if(parent){const cancel=document.createElement('button');cancel.type='button';cancel.textContent=text('Cancel reply','Annuler la réponse');cancel.onclick=()=>editor();tools.append(cancel);}
      function list(){const box=f.querySelector('.rule-files');box.replaceChildren();draft.files.forEach((file,i)=>{const row=document.createElement('p');row.textContent=file.name+' ';const remove=document.createElement('button');remove.type='button';remove.textContent=text('Remove','Retirer');remove.onclick=()=>{draft.files.splice(i,1);draft.touched=true;saveDraft(id,draft);list();};row.append(remove);box.append(row);});}list();
      function add(files){const all=[...draft.files,...files];if(all.length>3||all.reduce((n,f)=>n+f.size,0)>20*1024*1024){status.textContent=text('Use up to 3 files totaling 20 MB.','Maximum : 3 fichiers et 20 Mo.');return;}draft.files=all;draft.touched=true;saveDraft(id,draft);status.textContent='';list();}
      f.querySelector('input[type=file]').onchange=e=>{add([...e.target.files]);e.target.value='';};
      ta.addEventListener('paste',e=>{const files=[...(e.clipboardData?.files||[])];if(files.length){e.preventDefault();add(files);}});
      f.onsubmit=async e=>{e.preventDefault();if(!MF.account){toast(text('Sign in to comment.','Connectez-vous pour commenter.'));return;}const submit=f.querySelector('[type=submit]');submit.disabled=true;status.textContent=text('Saving…','Enregistrement…');
        try{const attachments=await Promise.all(draft.files.map(file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve({name:file.name,data:String(reader.result).split(',')[1]});reader.onerror=reject;reader.readAsDataURL(file);})));await MF.api('/api/comments',{target:'Governance:'+id,body:ta.value,parent:draft.parent,attachments});clearDraft(id);await MF.refresh();openGovernance(id);}catch(err){status.textContent=err.message||text('Could not save. Your draft is still here.','Échec de l’enregistrement. Votre brouillon est conservé.');submit.disabled=false;}
      };
    }
    let draft=drafts.get(draftKey(id));if(!draft){try{draft=JSON.parse(localStorage.getItem(draftKey(id))||'null');}catch(_){}}editor(draft?.parent||'',byId.get(draft?.parent)?.author||'');
  };
}
