(() => {
 'use strict';
 const kind = document.body.dataset.survey;
 const questions = [...document.querySelectorAll('.question')];
 const fields = [...document.querySelectorAll('#questions textarea, #questions input, #questions select')];
 const storageKey = 'mapleforge-survey-preview:' + location.pathname;
 const status = document.getElementById('status');
 const output = document.getElementById('answer-preview');
 const title = document.querySelector('h1').textContent;
 let storageAvailable = true;
 function collect() {
  const values = {};
  for (const field of fields) {
   if (field.type === 'checkbox') {
    if (!values[field.name]) values[field.name] = [];
    if (field.checked) values[field.name].push(field.value);
   } else values[field.name] = field.value;
  }
  return values;
 }
 function answer(question) {
  const parts = [];
  for (const field of question.querySelectorAll('input,textarea,select')) {
   if(field.closest('.pc-form'))continue;
   if (field.type === 'checkbox') { if (field.checked) parts.push('• ' + field.value); }
   else if (field.value.trim()) parts.push(field.value.trim());
  }
  return parts.join('\n');
 }
 function text() {
  return title + '\nReview preview\n\n' + questions.map((question,i) => (i+1) + '. ' + question.dataset.title + '\n' + (answer(question) || '(Not answered)')).join('\n\n');
 }
 function update() {
  const count = questions.filter(q => answer(q)).length;
  document.getElementById('progress').textContent = count + ' of ' + questions.length + ' answered';
  if (!output.hidden) output.textContent = text();
 }
 try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
  for (const field of fields) {
   if (field.type === 'checkbox') field.checked = Array.isArray(saved[field.name]) && saved[field.name].includes(field.value);
   else if (typeof saved[field.name] === 'string') field.value = saved[field.name];
  }
 } catch { storageAvailable = false; }
 fields.forEach(field => field.addEventListener('input', () => {
  try { localStorage.setItem(storageKey, JSON.stringify(collect())); storageAvailable = true; }
  catch { storageAvailable = false; }
  if (!storageAvailable) status.textContent = 'This browser cannot save the draft. Copy or download your answers before leaving.';
  update();
 }));
 document.getElementById('review').addEventListener('click', () => {
  output.hidden = false; output.textContent = text(); output.focus();
  status.textContent = 'Preview only. Nothing has been submitted.';
 });
 document.getElementById('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(text()); status.textContent = 'Answers copied. Nothing has been submitted.'; }
  catch { output.hidden = false; output.textContent = text(); output.focus(); status.textContent = 'Automatic copying is unavailable. Select and copy the answers below.'; }
 });
 document.getElementById('download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([text()],{type:'text/plain;charset=utf-8'}));
  const link = document.createElement('a'); link.href = url; link.download = 'mapleforge-'+kind+'-survey-answers.txt';
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  status.textContent = 'Download prepared. Nothing has been submitted.';
 });
 update();
})();
