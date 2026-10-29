(() => {
 'use strict';
 const questions = [...document.querySelectorAll('.question')];
 const fields = [...document.querySelectorAll('#questions textarea, #questions input, #questions select')];
 const key = 'mapleforge-survey-preview:' + location.pathname;
 let previous = {};
 try { previous = JSON.parse(localStorage.getItem(key) || '{}'); } catch {}
 function value(name) {
  const options = fields.filter(field => field.name === name);
  return options.find(field => field.type === 'radio' && field.checked)?.value || '';
 }
 function active(field) { return !field.closest('[hidden]'); }
 function collect() {
  const result = {...previous};
  for (const field of fields) {
   if (field.type === 'checkbox') {
    result[field.name] = fields.filter(f => f.name === field.name && f.checked).map(f => f.value);
   } else if (field.type === 'radio') {
    result[field.name] = value(field.name);
   } else result[field.name] = field.value;
  }
  return result;
 }
 function update() {
  for (const branch of document.querySelectorAll('[data-show-field]')) {
   branch.hidden = !JSON.parse(branch.dataset.showValues).includes(value(branch.dataset.showField));
   branch.querySelectorAll('input,textarea,select').forEach(field => { field.disabled = branch.hidden; });
  }
  const goal = value('goal');
  const project = document.querySelector('[data-key="build"]');
  const descriptions = {
   join:['What kind of project would you join?','Describe a project, problem or subject you would like to help with.','I would like to join a project that …'],
   make:['What would you like to explore or make?','It does not have to be a business or a finished idea. What interests you?','I would enjoy experimenting with …'],
   solve:['What problem do you want to solve?','Who has this problem, and what would you like to change?','The problem is … It affects …'],
   unsure:['What interests you so far?','Share a topic, a skill you want to use, or something you would like to explore.','I’m curious about …']
  };
  const [title,hint,placeholder] = descriptions[goal] || ['What do you want to build?','Name the thing, the problem it solves, and who it is for. A rough idea is enough.','I want to build … for … so they can …'];
  project.dataset.title = title;
  project.querySelector('.q-title').textContent = title;
  project.querySelector('.hint').textContent = hint;
  project.querySelector('label').textContent = title;
  project.querySelector('textarea').placeholder = placeholder;
  questions.forEach((question,i) => { question.querySelector('.q-number').textContent = String(i+1).padStart(2,'0'); });
  const answered = questions.filter(question => [...question.querySelectorAll('input,textarea,select')].some(field => !field.closest('.pc-form') && active(field) && ((field.type === 'radio' || field.type === 'checkbox') ? field.checked : field.value.trim()))).length;
  document.getElementById('progress').textContent = answered + ' of ' + questions.length + ' answered';
 }
 for (const field of fields) {
  if (field.type === 'checkbox') field.checked = Array.isArray(previous[field.name]) && previous[field.name].includes(field.value);
  else if (field.type === 'radio') field.checked = previous[field.name] === field.value;
  else if (typeof previous[field.name] === 'string') field.value = previous[field.name];
  field.addEventListener('input', () => {
   update();
   try { previous = collect(); localStorage.setItem(key, JSON.stringify(previous)); } catch {}
  });
 }
 update();
})();
