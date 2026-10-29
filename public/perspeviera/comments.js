(() => {
  'use strict';
  const page = document.body.dataset.commentsPage;
  if (!page) return;
  const endpoint = '/perspeviera/comments-api';
  const store = {
    get(key) { try { return localStorage.getItem(key) || ''; } catch { return ''; } },
    set(key, value) { try { if (value) localStorage.setItem(key, value); else localStorage.removeItem(key); } catch {} }
  };
  const sessionKey = 'mf-perspectives-comment-session';
  let session;
  try { session = JSON.parse(sessionStorage.getItem(sessionKey) || 'null'); } catch {}
  if (!session || !/^[a-f0-9]{64}$/.test(session.token)) {
    session = {token:Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2,'0')).join(''), comments:{}};
  }
  function saveSession() { try { sessionStorage.setItem(sessionKey,JSON.stringify(session)); } catch {} }
  function refreshSession() { try { const saved=JSON.parse(sessionStorage.getItem(sessionKey)); if (saved?.token===session.token) session=saved; } catch {} }
  saveSession();
  function canChange(comment) {
    refreshSession();
    return !comment.deleted && (session.comments[comment.id] || 0) > Date.now();
  }
  const make = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = cls; if (text !== undefined) el.textContent = text; return el; };
  async function api(query, body) {
    const response = await fetch(endpoint + query, body ? {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)} : {cache:'no-store'});
    let data; try { data = await response.json(); } catch { throw new Error('Comments are temporarily unavailable. Please try again.'); }
    if (!response.ok) throw new Error(data.error || 'Could not load comments. Please try again.');
    return data;
  }
  const views = [];
  let serial = 0;
  function composer(view, parent, replyingTo) {
    const form = make('form', 'pc-form');
    const key = 'mf-perspectives-draft:' + page + ':' + view.section + ':' + (parent || 'root');
    let saved = {}; try { saved = JSON.parse(store.get(key) || '{}'); } catch {}
    let requestId = saved.requestId || crypto.randomUUID();
    const suffix = 'pc-' + (++serial);
    const nameLabel = make('label', '', 'Your name'); nameLabel.htmlFor = suffix + '-name';
    const name = make('input'); name.id = nameLabel.htmlFor; name.name = 'name'; name.maxLength = 60; name.required = true; name.autocomplete = 'nickname'; name.value = saved.name || store.get('mf-perspectives-name');
    const bodyLabel = make('label', '', parent ? 'Reply to ' + replyingTo : 'Your comment'); bodyLabel.htmlFor = suffix + '-body';
    const body = make('textarea'); body.id = bodyLabel.htmlFor; body.name = 'comment'; body.rows = 4; body.maxLength = 4000; body.required = true; body.value = saved.body || ''; body.placeholder = parent ? 'Write a reply…' : 'What would you like to add?';
    const actions = make('div', 'pc-form-actions');
    const submit = make('button', 'pc-submit', parent ? 'Post reply' : 'Post comment'); submit.type = 'submit';
    const status = make('span', 'pc-status'); status.setAttribute('role','status');
    actions.append(submit);
    if (parent) {
      const cancel = make('button', 'pc-link', 'Cancel'); cancel.type = 'button';
      cancel.addEventListener('click', () => { form.hidden = true; }); actions.append(cancel);
    }
    form.append(nameLabel,name,bodyLabel,body,actions,status);
    function save(resetId = true) {
      if (resetId) requestId = crypto.randomUUID();
      store.set('mf-perspectives-name', name.value);
      store.set(key, body.value ? JSON.stringify({name:name.value, body:body.value, requestId}) : '');
    }
    name.addEventListener('input', () => save()); body.addEventListener('input', () => save());
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!name.value.trim() || !body.value.trim()) { status.textContent = 'Enter a name and a comment.'; return; }
      save(false); submit.disabled = true; name.disabled = true; body.disabled = true; status.textContent = 'Posting…';
      try {
        const result = await api('', {page,section:view.section,parent:parent || null,name:name.value,body:body.value,requestId,ownerToken:session.token});
        refreshSession(); session.comments[result.id] = result.editableUntil; saveSession();
        store.set(key, ''); body.value = ''; requestId = crypto.randomUUID();
        status.textContent = 'Posted.';
        if (parent) form.hidden = true;
        await view.load();
      } catch (error) { status.textContent = error.message; }
      finally { submit.disabled = false; name.disabled = false; body.disabled = false; }
    });
    form.focusBody = () => body.focus();
    return form;
  }
  for (const target of document.querySelectorAll('[data-comment-thread]')) {
    const section = target.dataset.commentThread;
    const title = target.dataset.commentTitle || target.querySelector('h2,h3,legend')?.textContent.trim() || 'this section';
    const details = make('details', 'pc-discussion');
    const summary = make('summary', 'pc-toggle', 'Add comment'); summary.setAttribute('aria-label', 'Add comment on ' + title);
    const content = make('div', 'pc-content');
    const note = make('p', 'pc-note', 'Public comments. Choose any name; names are unverified. Share only what you want everyone to see. You can edit or delete your own new comments in this tab session, for up to 2 hours after posting.');
    const status = make('p', 'pc-status'); status.setAttribute('role','status');
    const list = make('div', 'pc-list'); list.setAttribute('aria-label', 'Comments on ' + title);
    const view = {section, details, count:0, nodes:new Map(), loading:null};
    view.setCount = n => { view.count = n; summary.textContent = n ? n + (n === 1 ? ' comment' : ' comments') + ' · Add comment' : 'Add comment'; };
    view.load = async () => {
      if (view.loading) { await view.loading; return view.load(); }
      view.loading = (async () => {
        status.textContent = 'Loading comments…';
        try {
          const data = await api('?' + new URLSearchParams({page,section}));
          view.setCount(data.comments.filter(c => !c.deleted).length);
          // Update existing comments without discarding other people's replies or open drafts.
          for (const comment of data.comments) {
            let node = view.nodes.get(comment.id);
            if (!node) {
              const item = make('article','pc-comment'); item.id = 'comment-' + comment.id;
              const header = make('div','pc-comment-header');
              const author = make('strong','pc-author');
              const stamp = make('time','pc-time'); const date = new Date(comment.created);
              stamp.dateTime = date.toISOString(); stamp.textContent = date.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}); stamp.title = date.toLocaleString();
              const edited = make('span','pc-time');
              header.append(author,stamp,edited);
              const text = make('p','pc-body');
              const actions = make('div','pc-comment-actions');
              const reply = make('button','pc-link','Reply'); reply.type = 'button'; reply.setAttribute('aria-label','Reply to '+comment.name);
              const children = make('div','pc-replies');
              const message = make('p','pc-status'); message.setAttribute('role','status');
              node = {item,children,parent:comment.parent,author,text,edited,actions,reply,message,comment,editor:null};
              reply.addEventListener('click', () => {
                if (!node.replyForm) { node.replyForm = composer(view,comment.id,comment.name); item.insertBefore(node.replyForm,children); }
                node.replyForm.hidden = false; node.replyForm.focusBody();
              });
              const edit = make('button','pc-link','Edit'); edit.type='button';
              const remove = make('button','pc-link pc-delete','Delete'); remove.type='button';
              node.edit=edit; node.remove=remove;
              edit.addEventListener('click', () => {
                if (!canChange(node.comment)) { message.textContent='The editing window has ended.'; edit.hidden=remove.hidden=true; return; }
                if (node.editor) { node.editor.querySelector('textarea').focus(); return; }
                const form=make('form','pc-form pc-edit-form');
                const label=make('label','','Edit your comment');
                const input=make('textarea'); input.id='pc-edit-'+comment.id; label.htmlFor=input.id; input.value=node.comment.body; input.maxLength=4000; input.required=true; input.rows=4;
                const buttons=make('div','pc-form-actions');
                const save=make('button','pc-submit','Save changes'); save.type='submit';
                const cancel=make('button','pc-link','Cancel'); cancel.type='button';
                function closeEditor() { form.remove(); node.editor=null; text.hidden=false; }
                cancel.addEventListener('click',closeEditor);
                buttons.append(save,cancel);form.append(label,input,buttons);node.editor=form;item.insertBefore(form,children);text.hidden=true;input.focus();
                form.addEventListener('submit', async event => {
                  event.preventDefault(); if (!input.value.trim()) return;
                  save.disabled=true;cancel.disabled=true;message.textContent='Saving…';
                  try { await api('',{action:'edit',id:comment.id,ownerToken:session.token,body:input.value}); closeEditor();message.textContent='Saved.';await view.load(); }
                  catch(error) { message.textContent=error.message; }
                  finally { save.disabled=false;cancel.disabled=false; }
                });
              });
              remove.addEventListener('click', async () => {
                if (!canChange(node.comment)) { message.textContent='The editing window has ended.'; edit.hidden=remove.hidden=true; return; }
                if (!window.confirm('Delete your comment? Replies from other people will remain.')) return;
                remove.disabled=true;edit.disabled=true;message.textContent='Deleting…';
                try { await api('',{action:'delete',id:comment.id,ownerToken:session.token});refreshSession();delete session.comments[comment.id];saveSession();message.textContent='';await view.load(); }
                catch(error) { message.textContent=error.message; }
                finally { remove.disabled=false;edit.disabled=false; }
              });
              actions.append(reply,edit,remove);item.append(header,text,actions,message,children);
              view.nodes.set(comment.id,node);
            }
            node.comment=comment;
            node.author.textContent=comment.deleted ? 'Deleted comment' : comment.name;
            node.text.textContent=comment.deleted ? 'This comment was deleted by its author.' : comment.body;
            node.edited.textContent=comment.edited && !comment.deleted ? '(edited)' : '';
            node.edit.hidden=node.remove.hidden=!canChange(comment);
            node.reply.hidden=!!comment.deleted;
            if (comment.deleted) {
              node.editor?.remove();node.editor=null;node.text.hidden=false;
              if(node.replyForm) node.replyForm.hidden=true;
            }
          }
          for (const node of view.nodes.values()) {
            const destination = node.parent ? view.nodes.get(node.parent)?.children : list;
            if (destination && node.item.parentElement !== destination) destination.append(node.item);
          }
          status.textContent = data.comments.length ? '' : 'No comments yet. Add the first one.';
        } catch (error) { status.textContent = error.message; }
      })();
      try { await view.loading; } finally { view.loading = null; }
    };
    const rootForm = composer(view,null,'');
    content.append(note,rootForm,status,list); details.append(summary,content); target.append(details);
    details.addEventListener('toggle', () => { if (details.open) view.load(); });
    views.push(view);
  }
  setInterval(() => views.forEach(view => view.nodes.forEach(node => {
    if (!canChange(node.comment)) {
      node.edit.hidden=node.remove.hidden=true;
      if(node.editor) { node.editor.remove();node.editor=null;node.text.hidden=false;node.message.textContent='The editing window has ended.'; }
    }
  })), 15000);
  api('?' + new URLSearchParams({page})).then(data => views.forEach(view => view.setCount(data.counts[view.section] || 0))).catch(() => {});
})();
