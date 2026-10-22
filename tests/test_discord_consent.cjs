const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

test('consent starts unchecked, saves explicit decline, and reopens with saved choices', async () => {
  let dialog, payload, status = {version:'2026-10-22-v1', answered:false, existing:false, future:false};
  const M = {account:{id:'alice'}, hydrate:async()=>{M.bookmarkData={discordConsent:status};}, api:async(path,data)=>{payload=data; status={...data,answered:true};return {discordConsent:status};}};
  const document = {body:{append(){}},createElement(){
    const buttons=[{},{}], decline={}, error={};
    const form={elements:{existing:{checked:false},future:{checked:false}},querySelectorAll:()=>buttons,querySelector:s=>s==='[data-decline]'?decline:error};
    dialog={setAttribute(){},style:{},querySelector:()=>form,showModal(){this.open=true;},close(){this.open=false;},remove(){this.removed=true;},form,decline};
    return dialog;
  }};
  vm.runInNewContext(fs.readFileSync('src/discord-consent.js','utf8'),{window:{MF:M},document,setTimeout});
  await M.hydrate();
  assert.equal(dialog.open,true);
  assert.equal(dialog.form.elements.existing.checked,false);
  assert.equal(dialog.form.elements.future.checked,false);
  await dialog.decline.onclick();
  // click handler starts an async save, await its continuation.
  await Promise.resolve();
  assert.equal(payload.existing,false);assert.equal(payload.future,false);
  assert.equal(dialog.removed,true);
  const first=dialog;await M.hydrate();assert.equal(dialog,first);
  M.openDiscordConsent();assert.equal(dialog.open,true);
  dialog.form.elements.future.checked=true;
  dialog.form.onsubmit({preventDefault(){}});await Promise.resolve();
  assert.equal(payload.future,true);assert.equal(payload.existing,false);
  M.openDiscordConsent();assert.equal(dialog.form.elements.future.checked,true);
});
