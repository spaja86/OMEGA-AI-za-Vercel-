import assert from 'node:assert/strict';
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4317';
let checks=0;
const ok=(v)=>{assert.ok(v);checks++};
async function req(path, cookie='', method='GET', body) {
 return fetch(base+path,{method,headers:{...(cookie?{cookie}:{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
}
const a=await req('/api/conversations','','POST',{}); ok(a.status===201);
const ac=a.headers.get('set-cookie'); ok(/HttpOnly/i.test(ac)&&/SameSite=strict/i.test(ac)&&/Secure/i.test(ac));
const cookieA=ac.split(';')[0], ca=await a.json();
const b=await req('/api/conversations','','POST',{}); const cookieB=b.headers.get('set-cookie').split(';')[0]; const cb=await b.json();
ok(ca.id!==cb.id);
try {
 for (const cookie of ['',cookieB]) {
  ok((await req(`/api/conversations/${ca.id}`,cookie)).status===404);
  ok((await req(`/api/conversations/${ca.id}`,cookie,'DELETE')).status===404);
  ok((await req(`/api/conversations/${ca.id}/messages`,cookie,'POST',{content:'Unauthorized test'})).status===404);
  ok((await req(`/api/conversations/${ca.id}/feedback`,cookie,'POST',{messageId:ca.messages[0].id,value:'up'})).status===404);
  const list=await (await req('/api/conversations',cookie)).json(); ok(!list.some(x=>x.id===ca.id));
  const stats=await (await req('/api/stats',cookie)).json(); ok(!stats.topConversationsByLength.some(x=>x.id===ca.id));
 }
 const own=await req(`/api/conversations/${ca.id}/messages`,cookieA,'POST',{content:'SPAJA deployment verification'});ok(own.status===200);ok((await own.text()).includes('[DONE]'));
 const saved=await (await req(`/api/conversations/${ca.id}`,cookieA)).json();ok(saved.messages.some(x=>x.role==='assistant'));ok(saved.messages.some(x=>x.content==='SPAJA deployment verification'));
 ok((await req(`/api/conversations/${ca.id}/messages`,cookieA,'POST',{content:'x'.repeat(2001)})).status===413);
 const cross=await fetch(base+'/api/conversations',{method:'POST',headers:{cookie:cookieA,origin:'https://example.invalid','content-type':'application/json'},body:'{}'});ok(cross.status>=400);
 console.log(JSON.stringify({passed:checks,scope:'two-session isolation, anonymous denial, stats, SSE, persisted reply, size limit, cross-origin denial'}));
} finally {
 await req(`/api/conversations/${ca.id}`,cookieA,'DELETE');await req(`/api/conversations/${cb.id}`,cookieB,'DELETE');
}
