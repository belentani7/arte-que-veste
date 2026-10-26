'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
let server, port;
const root = path.join(__dirname, '..', 'frontend');
function request(url, method='GET') {
  return new Promise((resolve,reject) => {
    const req=http.request({host:'127.0.0.1',port,path:url,method},res=>{
      const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString('utf8')}));
    });req.on('error',reject);req.end();
  });
}
before(async () => {
  port=await new Promise((resolve,reject)=>{const s=net.createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))});});
  server=spawn(process.execPath,[path.join(root,'server.js')],{env:{...process.env,PORT:String(port)},stdio:'ignore'});
  for(let i=0;i<40;i++){if(server.exitCode!==null)throw Error('server exited');try{if((await request('/')).status===200)return;}catch{}await delay(50);}
  throw Error('server not ready');
});
after(()=>{if(server?.exitCode===null)server.kill();});
test('GET serves storefront with nosniff and no-store',async()=>{const r=await request('/');assert.equal(r.status,200);assert.match(r.headers['content-type'],/^text\/html/);assert.equal(r.headers['x-content-type-options'],'nosniff');assert.equal(r.headers['cache-control'],'no-store');});
test('HEAD has headers but no body',async()=>{const r=await request('/loja.html','HEAD');assert.equal(r.status,200);assert.equal(r.body,'');});
test('POST is blocked',async()=>{const r=await request('/loja.html','POST');assert.equal(r.status,405);assert.equal(r.headers.allow,'GET, HEAD');});
test('encoded traversal blocked',async()=>{const r=await request('/%2e%2e/backend/seed.json');assert.equal(r.status,403);});
test('invalid URL encoding blocked',async()=>{const r=await request('/%E0%A4%A');assert.equal(r.status,400);});
test('hidden dotfiles blocked',async()=>{const r=await request('/.env');assert.equal(r.status,404);});
test('unknown extensions blocked',async()=>{const r=await request('/private.backup');assert.equal(r.status,404);});
test('JSON served with proper MIME',async()=>{const r=await request('/products.json');assert.equal(r.status,200);assert.match(r.headers['content-type'],/^application\/json/);});
test('symlinks outside root blocked',async()=>{const p=path.join(root,'outside.html');const target=path.join(__dirname,'secret.html');fs.writeFileSync(target,'SECRET');fs.symlinkSync(target,p);try{const r=await request('/outside.html');assert.equal(r.status,404);assert.doesNotMatch(r.body,/SECRET/);}finally{fs.unlinkSync(p);fs.unlinkSync(target);}});
