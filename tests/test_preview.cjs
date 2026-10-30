const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('src/preview.js', 'utf8');

function preview(hostname, memberInterface) {
  const queued = [], notices = [], messages = [];
  const context = {
    location: { hostname }, window: memberInterface ? { MF: memberInterface } : {},
    document: {
      createElement: () => ({}),
      querySelector: () => ({ prepend: notice => notices.push(notice) }),
    },
    queueMicrotask: callback => queued.push(callback),
    toast: message => messages.push(message), render: () => {},
    fetch: () => { throw new Error('Static preview must not contact member APIs'); },
  };
  vm.runInNewContext(source, context);
  return { context, queued, notices, messages };
}

(async () => {
  for (const host of ['localhost', '127.0.0.1']) {
    const { context, queued, notices, messages } = preview(host);
    const M = context.window.MF;
    assert.ok(M, 'Navigation must receive its interface on localhost');
    assert.equal(M.account, null, 'Preview must not simulate a signed-in member');
    assert.equal(M.requireAccount(), false);
    assert.match(messages[0], /configured backend/);
    assert.equal(notices.length, 1);
    await assert.rejects(M.api('/api/shared', { op: 'save' }), /configured backend/);
    let hydrated = false;
    M.hydrate = async () => { hydrated = true; };
    await queued[0]();
    assert.equal(hydrated, true, 'Hydration must run after the other modules initialize');
  }
  const live = { account: { id: 'real-member' } };
  assert.equal(preview('maple-forge.ca', live).context.window.MF, live);
  assert.equal(preview('maple-forge.ca').context.window.MF, undefined);
  assert.equal(preview('staging.example', live).context.window.MF, live);
  console.log('Local preview initialization, read-only behavior and live isolation passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
