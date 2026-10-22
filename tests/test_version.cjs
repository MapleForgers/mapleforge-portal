const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{
let latest='abc1234',focus,reload=false;
const button={hidden:true};
const release={querySelector:()=>button};
const ctx={PORTAL_BUILD:{commit:'abc1234',short:'abc1234'},document:{hidden:false,createElement:()=>release,querySelector:()=>({append:()=>{}})},location:{reload:()=>{reload=true}},fetch:async()=>({ok:true,json:async()=>({commit:latest})}),setInterval:()=>{},window:{addEventListener:(_,cb)=>{focus=cb}}};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../src/version.js'),'utf8'),ctx);
await new Promise(setImmediate);assert.equal(button.hidden,true);
latest='new4567';await focus();assert.equal(button.hidden,false);assert.equal(reload,false);
button.onclick();assert.equal(reload,true);console.log('Version and manual update checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
