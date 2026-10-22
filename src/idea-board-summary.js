function ideaDiscussionStats(idea, comments = [], now = Date.now()) {
  const messages = [...new Map((idea.discussion || []).map(m => [m.id, m])).values()];
  const replies = messages.filter(m => m.role !== 'Original proposal');
  const names = new Set([...replies.map(m => m.author), ...comments.map(c => c.name || c.author || c.uid)].filter(Boolean).map(n => String(n).trim().toLowerCase()));
  const original = messages.find(m => m.role === 'Original proposal');
  const created = original?.time || (idea.created ? new Date(idea.created * 1000).toISOString() : null);
  const days = created ? Math.max(0, Math.floor((now - new Date(created).getTime()) / 86400000)) : null;
  const words = [idea.summary, ...messages.map(m => m.text), ...comments.map(c => c.text || c.body)].filter(Boolean).join(' ').trim().split(/\s+/).filter(Boolean).length;
  return {imported: replies.length, portal: comments.length, replies: replies.length + comments.length, people: names.size, days: Number.isFinite(days) ? days : null, minutes: Math.max(1, Math.ceil(words / 220)), created};
}
{
  const previous = renderCards;
  renderCards = function () {
    previous();
    const grid = document.querySelector('#cards');
    if (!grid) return;
    grid.querySelectorAll('.card').forEach(card => {
      const id = card.querySelector('[data-open]')?.dataset.open;
      const idea = find(id);
      if (!idea) return;
      const s = ideaDiscussionStats(idea, state.comments[id] || []);
      card.dataset.replyCount = s.replies;
      const stats = document.createElement('div');
      stats.className = 'idea-quick-stats';
      stats.innerHTML = `<button class="idea-reply-summary" title="${s.imported} imported replies; ${s.portal} portal comments">${s.replies} <span>${s.replies === 1 ? 'reply' : 'replies'}</span> · ${s.people} <span>${s.people === 1 ? 'person replying' : 'people replying'}</span></button><span>${s.days === null ? '<span>Date unavailable</span>' : s.days === 0 ? '<span>Less than a day old</span>' : `${s.days} <span>${s.days === 1 ? 'day old' : 'days old'}</span>`}</span><span title="Estimated at 220 words per minute, including the proposal and captured discussion">~${s.minutes} <span>min read</span></span>`;
      stats.querySelector('button').onclick = () => openIdea(id);
      const footer = card.querySelector('.card-footer');
      footer.before(stats);
      // The readable reply summary replaces the unexplained speech-bubble zero.
      card.querySelector('.comment-link')?.remove();
      const memberRow = card.querySelector('.idea-members-row');
      if (memberRow && !grid.classList.contains('layout-compact')) {
        const join = memberRow.querySelector('button');
        if (join) footer.append(join);
        if (!memberRow.querySelector('.avatar')) memberRow.remove();
      }
    });
    if (sort === 'comments') {
      const parents = new Set([...grid.querySelectorAll('.card')].map(c => c.parentElement));
      parents.forEach(parent => [...parent.children].filter(c => c.classList.contains('card')).sort((a,b) => Number(b.dataset.replyCount)-Number(a.dataset.replyCount)).forEach(c => parent.append(c)));
    }
  };
}
