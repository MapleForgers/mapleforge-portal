const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/idea-board-summary.js'),'utf8').split('\n{\n  const previous')[0];
const ctx={};vm.createContext(ctx);vm.runInContext(source,ctx);
const original={id:'1',role:'Original proposal',author:'A',time:'2026-10-20T12:00:00Z',text:'one two'};
const reply={id:'2',author:'B',text:'three four'};
const s=ctx.ideaDiscussionStats({discussion:[original,reply,reply]},[{name:'B',text:'five'},{name:'C',text:'six'}],Date.parse('2026-10-22T12:00:00Z'));
assert.equal(s.replies,3);assert.equal(s.people,2);assert.equal(s.days,2);assert.equal(s.minutes,1);
assert.equal(ctx.ideaDiscussionStats({}).days,null);
console.log('Reply deduplication, participants, age and reading-time checks passed');
