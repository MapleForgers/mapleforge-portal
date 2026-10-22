// Imported correspondence is read-only context, separate from portal comments.
// Private idea content is supplied at build time and never bundled in source.
function renderIdeaDiscussion(idea) {
  const messages = Array.isArray(idea?.discussion) ? idea.discussion : [];
  if (!messages.length) return '';
  const renderMessage = (message) => {
    return `<article class="harvest-message"><header><strong>${memberName(message.author)}</strong><time datetime="${esc(message.time)}">${portalTimeHtml(message.time)}</time></header><p class="shared-text harvest-quote">${esc(message.text)}</p>${message.attachments?.length ? `<p class="shared-text small">${message.attachments.map(esc).join(', ')}</p>` : ''}<small class="harvest-source">${esc(message.channel)} · ${esc(message.id)}</small></article>`;
  };
  const original = messages.filter(m => m.role === 'Original proposal');
  const replies = messages.filter(m => m.role !== 'Original proposal');
  return `<section class="idea-discussion-archive" aria-label="Original proposal and discussion"><h3>Original proposal</h3>${idea.discussionNote ? `<p class="shared-text harvest-note">${esc(idea.discussionNote)}</p>` : ''}${original.map(renderMessage).join('')}<details class="harvest-replies" open><summary><span>Earlier discussion</span> <span>(${replies.length})</span></summary><p class="small">Selected messages from the original conversation. These are not new portal comments or recorded votes.</p>${replies.length ? replies.map(renderMessage).join('') : '<p>No relevant follow-up messages were captured in this review.</p>'}</details></section>`;
}
