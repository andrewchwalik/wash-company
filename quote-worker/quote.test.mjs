import test from 'node:test';
import assert from 'node:assert/strict';
import { handler, deliver } from './quote.mjs';
const url='https://forms.example.net/quote';
const pass={limit:async()=>({success:true})};
const env={QUOTE_IP:pass,QUOTE_TOTAL:pass};
const details={name:'Marta O’Neil',business:'The Inn',email:'marta@example.com',city:'Sandusky',phone:'',frequency:'Weekly',details:'Towels & sheets\nApprox. 12 bags'};
const req=(fields=details,headers={})=>new Request(url,{method:'POST',headers:{origin:new URL(url).origin,...headers},body:new URLSearchParams(fields)});
test('form is readable and submits same-origin without scripts',async()=>{
  const r=await handler(()=>assert.fail()).fetch(new Request(url),env);
  assert.equal(r.status,200);
  assert.match(r.headers.get('content-security-policy'),/form-action 'self'/);
  const t=await r.text();
  for(const key of Object.keys(details)) assert.match(t,new RegExp('name="'+key+'"'));
  assert.match(t,/<form action="\/quote" method="post">/);
});
test('accepted sends redirect; direct success visits do not show success',async()=>{
  let received;
  const app=handler(x=>{received=x;});
  const r=await app.fetch(req(),env);
  assert.deepEqual(received,details);
  assert.equal(r.status,303);
  assert.match(r.headers.get('set-cookie'),/HttpOnly/);
  const next=new URL(r.headers.get('location'),url);
  assert.equal((await app.fetch(new Request(next),env)).status,303);
  assert.match(await (await app.fetch(new Request(next,{headers:{cookie:'__Host-quote-confirmed=1'}}),env)).text(),/Request sent/);
});
test('rejects foreign post, invalid or oversized payload, rate limit, and never sends honeypot',async()=>{
 const app=handler(()=>assert.fail());
 assert.equal((await app.fetch(req(details,{origin:'https://elsewhere.example'}),env)).status,403);
 assert.equal((await app.fetch(req({...details,email:'marta@example.com\r\nBcc: other@example.com'}),env)).status,422);
 assert.equal((await app.fetch(req({...details,details:'x'.repeat(16001)}),env)).status,413);
 assert.equal((await app.fetch(req({...details,website:'bot'}),env)).status,303);
 assert.equal((await app.fetch(req(),{...env,QUOTE_IP:{limit:async()=>({success:false})}})).status,429);
});
test('mail failure preserves safely escaped form values and does not claim success',async()=>{
 const r=await handler(()=>{throw Error('secret');}).fetch(req({...details,details:'<script>alert(1)</script>'}),env);
 assert.equal(r.status,503);
 const t=await r.text();
 assert.match(t,/&lt;script&gt;/);
 assert.doesNotMatch(t,/<script>|secret|Request sent/);
});
test('SMTP authenticates over TLS, fixes sender/recipient and replies to submitter',async()=>{
 const enc=new TextEncoder();
 let rc, sent=[],closed=false;
 const connect=(addr,opts)=>{
   assert.deepEqual(addr,{hostname:'smtp.purelymail.com',port:465}); assert.equal(opts.secureTransport,'on');
   const readable=new ReadableStream({start(c){rc=c;rc.enqueue(enc.encode('220 Mock ready\r\n'));}});
   const responses=['250-Mock\r\n250 AUTH PLAIN\r\n','235 OK\r\n','250 OK\r\n','250 OK\r\n','354 Data\r\n','250 Queued\r\n'];
   const writable=new WritableStream({write(chunk){sent.push(new TextDecoder().decode(chunk));rc.enqueue(enc.encode(responses.shift()));}});
   return {readable,writable,close:async()=>{closed=true;rc.close();}};
 };
 await deliver(connect,details,{PURELYMAIL_APP_PASSWORD:'fake-only'});
 assert.equal(sent[1],'AUTH PLAIN '+Buffer.from('\0hello@wash.ooo\0fake-only').toString('base64')+'\r\n');
 assert.equal(sent[2],'MAIL FROM:<hello@wash.ooo>\r\n');
 assert.equal(sent[3],'RCPT TO:<hello@wash.ooo>\r\n');
 assert.match(sent[5],/Reply-To: marta@example.com/);
 const body=sent[5].split('\r\n\r\n')[1].split('\r\n.')[0].replace(/\r\n/g,'');
 assert.match(Buffer.from(body,'base64').toString('utf-8'),/Marta O’Neil/);
 assert.equal(closed,true);
 sent=[];
 await deliver(connect,details,{PURELYMAIL_APP_PASSWORD:'fake-only',PURELYMAIL_SMTP_USERNAME:'owner@example.com'});
 assert.equal(sent[1],'AUTH PLAIN '+Buffer.from('\0owner@example.com\0fake-only').toString('base64')+'\r\n');
 assert.equal(sent[2],'MAIL FROM:<hello@wash.ooo>\r\n');
 assert.equal(sent[3],'RCPT TO:<hello@wash.ooo>\r\n');
});
