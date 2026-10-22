const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/base.js'), 'utf8');
const helper = source.slice(source.indexOf('function safeSourceURL('), source.indexOf('function renderDetail('));
const context = { URL }; vm.createContext(context); vm.runInContext(helper, context);
for (const url of ['javascript:alert(1)', 'data:text/html,test', 'http://example.com', '//example.com', 'https://user:pass@example.com', '', null]) assert.equal(context.safeSourceURL(url), '', String(url));
assert.equal(context.safeSourceURL('https://example.com/reference?q=1'), 'https://example.com/reference?q=1');
console.log('HTTPS source/reference URL checks passed');
