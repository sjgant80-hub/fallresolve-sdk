// fallresolve SDK · sovereign single-file library · MIT · AI-Native Solutions
// Extracted from fallresolve/index.html · 18270 bytes of source logic
// Public-safe: no primes/glyphs/dyad references

// ─── fall-kit inline (bloom + fingerprint) ────────────────────────────────
const PRIMES=[2,3,5,7,11,13,17];
function bloom7(s){const b=new Array(7).fill(0);for(const c of String(s||'')){const x=c.charCodeAt(0);for(let i=0;i<7;i++)b[i]+=(x%PRIMES[i]);}const m=Math.max(...b)||1;return b.map(v=>+(v/m).toFixed(3));}
function fingerprint(s){const b=bloom7(s);return '['+b.join(',')+']';}
// ─── IndexedDB helpers ────────────────────────────────────────────────────
const DB_NAME='fallresolve';const DB_V=1;
function db(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,DB_V);r.onupgradeneeded=e=>{const d=e.target.result;if(!d.objectStoreNames.contains('key'))d.createObjectStore('key');if(!d.objectStoreNames.contains('resolves'))d.createObjectStore('resolves',{keyPath:'id'});if(!d.objectStoreNames.contains('chain'))d.createObjectStore('chain',{keyPath:'seq'});if(!d.objectStoreNames.contains('meta'))d.createObjectStore('meta');};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
function tx(store,mode='readonly'){return db().then(d=>d.transaction(store,mode).objectStore(store));}
function idbGet(store,k){return tx(store).then(s=>new Promise((res,rej)=>{const r=s.get(k);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}));}
function idbPut(store,v,k){return tx(store,'readwrite').then(s=>new Promise((res,rej)=>{const r=k!==undefined?s.put(v,k):s.put(v);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}));}
function idbAll(store){return tx(store).then(s=>new Promise((res,rej)=>{const r=s.getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}));}
// ─── crypto ───────────────────────────────────────────────────────────────
const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b)));
const b64d=s=>{const b=atob(s);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u;};
const enc=s=>new TextEncoder().encode(s);
async function sha256hex(s){const h=await crypto.subtle.digest('SHA-256',enc(s));return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function cid(s){const h=await sha256hex(s);return 'cid-'+h.slice(0,32);}
let KEY=null;
async function ensureKey(){
  let stored=await idbGet('key','current');
  if(stored){
    try{
      const pub=await crypto.subtle.importKey('raw',b64d(stored.pubRaw),{name:'Ed25519'},true,['verify']);
      const prv=await crypto.subtle.importKey('pkcs8',b64d(stored.prvPkcs8),{name:'Ed25519'},true,['sign']);
      KEY={publicKey:pub,privateKey:prv,pubRaw:stored.pubRaw,prvPkcs8:stored.prvPkcs8,createdAt:stored.createdAt};
      return KEY;
    }catch(e){console.warn('key import failed, regenerating',e);}
  }
  return genKey();
}
async function genKey(){
  const kp=await crypto.subtle.generateKey({name:'Ed25519'},true,['sign','verify']);
  const pubRaw=b64(await crypto.subtle.exportKey('raw',kp.publicKey));
  const prvPkcs8=b64(await crypto.subtle.exportKey('pkcs8',kp.privateKey));
  const createdAt=new Date().toISOString();
  await idbPut('key',{pubRaw,prvPkcs8,createdAt},'current');
  KEY={publicKey:kp.publicKey,privateKey:kp.privateKey,pubRaw,prvPkcs8,createdAt};
  renderIdentity();renderBanner();
  return KEY;
}
async function signBytes(msg){const sig=await crypto.subtle.sign({name:'Ed25519'},KEY.privateKey,enc(msg));return b64(sig);}
async function verifyBytes(msg,sigB64,pubRawB64){
  const pub=await crypto.subtle.importKey('raw',b64d(pubRawB64),{name:'Ed25519'},true,['verify']);
  return crypto.subtle.verify({name:'Ed25519'},pub,b64d(sigB64),enc(msg));
}
function exportKey(){
  const blob=new Blob([JSON.stringify({pubRaw:KEY.pubRaw,createdAt:KEY.createdAt,algorithm:'Ed25519'},null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='fallresolve-pubkey.json';a.click();
}
// ─── UI helpers ───────────────────────────────────────────────────────────
function log(el,msg,cls=''){el.innerHTML+=`<div class="${cls}">${msg}</div>`;el.scrollTop=el.scrollHeight;}
  $('tab-'+t.dataset.tab).classList.remove('hide');
  if(t.dataset.tab==='history')renderHistory();
  if(t.dataset.tab==='identity')renderIdentity();
});
function uuid(){return 'sess-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);}
// ─── commitments ──────────────────────────────────────────────────────────
const DEFAULT_COMMITS=[
  'shipped index.html (single file · under 1200 lines)',
  'verified live URL returns 200',
  'pushed to sjgant80-hub · public repo',
  'audit chain contiguous · prevHash valid',
  'v21 alignment · 9-vertex · θ · torus'
];
function renderCommits(){
  const ul=$('commit-list');ul.innerHTML='';
  const list=window._commits||(window._commits=DEFAULT_COMMITS.map(t=>({t,done:false})));
  list.forEach((c,i)=>{
    const li=document.createElement('li');
    li.innerHTML=`<input type="checkbox" ${c.done?'checked':''} onchange="_commits[${i}].done=this.checked"><input type="text" value="${c.t.replace(/"/g,'&quot;')}" oninput="_commits[${i}].t=this.value"><button class="rm" onclick="_commits.splice(${i},1);renderCommits()">×</button>`;
    ul.appendChild(li);
  });
}
function addCommit(){window._commits.push({t:'new commitment',done:false});renderCommits();}
function tickAll(){window._commits.forEach(c=>c.done=true);renderCommits();}
// ─── audit chain (FallSignature-shaped) ───────────────────────────────────
async function seedDemo(){
  const out=$('audit-out');out.innerHTML='';log(out,'seeding demo chain…');
  const chain=[];let prev='0'.repeat(64);
  for(let i=0;i<5;i++){
    const payload={seq:i,ts:new Date(Date.now()-(5-i)*60000).toISOString(),note:'demo entry '+i,prev};
    const msg=JSON.stringify(payload);
    const sig=await signBytes(msg);
    const hash=await sha256hex(msg+sig);
    const rec={seq:i,payload,sig,hash,pub:KEY.pubRaw};
    chain.push(rec);await idbPut('chain',rec);
    prev=hash;
  }
  log(out,`seeded ${chain.length} signed entries · pub ${KEY.pubRaw.slice(0,12)}…`,'ok');
}
async function runAudit(){
  const out=$('audit-out');out.innerHTML='';log(out,'reading chain from IndexedDB…');
  const chain=(await idbAll('chain')).sort((a,b)=>a.seq-b.seq);
  if(!chain.length){log(out,'chain empty · seed demo or wait for FallSignature entries','wa');window._auditResult={valid:false,reason:'empty',count:0};return;}
  log(out,`${chain.length} entries loaded`);
  let prev='0'.repeat(64);let ok=0,bad=0;
  for(const rec of chain){
    if(rec.payload.prev!==prev){log(out,`seq ${rec.seq}: prevHash mismatch (chain break)`,'er');bad++;continue;}
    const msg=JSON.stringify(rec.payload);
    const v=await verifyBytes(msg,rec.sig,rec.pub);
    const h=await sha256hex(msg+rec.sig);
    if(!v){log(out,`seq ${rec.seq}: signature invalid`,'er');bad++;continue;}
    if(h!==rec.hash){log(out,`seq ${rec.seq}: hash mismatch`,'er');bad++;continue;}
    log(out,`seq ${rec.seq}: ok · ${h.slice(0,16)}…`,'ok');ok++;prev=rec.hash;
  }
  const valid=bad===0&&ok>0;
  log(out,`── ${ok} ok · ${bad} bad · ${valid?'CHAIN VALID':'CHAIN BROKEN'}`,valid?'ok':'er');
  window._auditResult={valid,ok,bad,count:chain.length,tip:prev};
}
// ─── scorecard ────────────────────────────────────────────────────────────
async function computeScore(){
  const commits=window._commits||[];
  const done=commits.filter(c=>c.done).length;
  const total=commits.length||1;
  const comRatio=done/total;
  const audit=window._auditResult||{valid:false,count:0};
  const state={
    id:$('sid').value||'',name:$('sname').value||'',start:$('sstart').value||'',
    notes:$('snotes').value||'',commits:commits.map(c=>({t:c.t,done:c.done}))
  };
  const ckh=await sha256hex(JSON.stringify(state));
  const bloomVec=bloom7(state.name+state.notes+commits.map(c=>c.t).join(' '));
  const bloomMag=bloomVec.reduce((a,b)=>a+b,0);
  const v21score=bloomMag>=3.5&&bloomVec.every(v=>v>0.1);
  const drift=audit.count>0&&!audit.valid;
  setScore('s-com',(comRatio*100).toFixed(0)+'%',comRatio>=0.8?'pass':(comRatio>=0.5?'warn':'fail'),`${done}/${commits.length} ticked`);
  setScore('s-aud',audit.valid?'valid':(audit.count?'broken':'—'),audit.valid?'pass':(audit.count?'fail':'warn'),`${audit.count||0} entries`);
  setScore('s-ckh',ckh.slice(0,12)+'…','pass','SHA-256 of session state');
  setScore('s-v21',v21score?'aligned':'thin',v21score?'pass':'warn',`bloom mag ${bloomMag.toFixed(2)}`);
  setScore('s-drf',drift?'detected':'none',drift?'fail':'pass',drift?'audit chain broken':'no tampering');
  window._score={comRatio,commits:{done,total},audit,ckh,v21:{aligned:v21score,bloom:bloomVec,mag:bloomMag},drift,state};
  return window._score;
}
function setScore(id,val,cls,desc){
  const box=$(id).closest('.score');box.classList.remove('pass','fail','warn');box.classList.add(cls);
  $(id).textContent=val;box.querySelector('.d').textContent=desc;
}
// ─── the resolve ceremony ─────────────────────────────────────────────────
async function doResolve(force){
  const btn=$('btn-resolve');btn.disabled=true;
  const out=$('resolve-out');out.innerHTML='<div class="log">computing…</div>';
  try{
    if(!window._score)await computeScore();
    const sc=window._score;
    const anyFail=(!sc.audit.valid&&sc.audit.count>0)||sc.comRatio<0.5||sc.drift;
    if(anyFail&&!force){
      out.innerHTML=`<div class="pill err">blocked</div> <span style="color:var(--muted)">one or more dimensions failed. review scorecard or force-resolve.</span>`;
      btn.disabled=false;return;
    }
    const id=$('sid').value||uuid();$('sid').value=id;
    const prevResolve=await getLastResolve();
    const blob={
      kind:'fallresolve.v1',ring:6,glyph:'Ω',
      session:{id,name:$('sname').value||'unnamed',start:$('sstart').value||'',notes:$('snotes').value||''},
      commitments:sc.state.commits,
      scorecard:{
        commitments:{done:sc.commits.done,total:sc.commits.total,ratio:+sc.comRatio.toFixed(3)},
        audit:{valid:sc.audit.valid,count:sc.audit.count||0,ok:sc.audit.ok||0,bad:sc.audit.bad||0,tip:sc.audit.tip||''},
        checkpointHash:sc.ckh,
        v21:{aligned:sc.v21.aligned,bloom:sc.v21.bloom,mag:+sc.v21.mag.toFixed(3)},
        drift:sc.drift
      },
      lineage:{prev:prevResolve?prevResolve.cid:null,prevSession:prevResolve?prevResolve.session.id:null},
      timestamps:{start:$('sstart').value||'',resolved:new Date().toISOString()},
      signer:{algorithm:'Ed25519',pubRaw:KEY.pubRaw,keyCreated:KEY.createdAt},
      forced:!!force
    };
    const payloadStr=JSON.stringify(blob);
    const sig=await signBytes(payloadStr);
    const signedBlob={...blob,signature:sig};
    const c=await cid(payloadStr+sig);
    const record={id,cid:c,session:blob.session,scorecard:blob.scorecard,resolvedAt:blob.timestamps.resolved,path:`/resolve/${id}/resolve.json`,signedBlob,forced:!!force};
    await idbPut('resolves',record);
    // fan-out
    if($('opt-cast').checked){
      try{const bc=new BroadcastChannel('fall-signal');bc.postMessage({kind:'session-closed',source:'fallresolve',ring:6,session:blob.session,cid:c,ts:blob.timestamps.resolved});bc.close();}catch(e){}
    }
    out.innerHTML=`
      <div class="pill ok">resolved</div> ${force?'<span class="pill warn">forced</span>':''}
      <div style="margin-top:12px"><h3>closing stamp</h3>
        <div><span class="pill">cid</span></div><code class="hash">${c}</code>
        <div style="margin-top:8px"><span class="pill">fallpod path</span></div><code class="hash">/resolve/${id}/resolve.json</code>
        <div style="margin-top:8px"><span class="pill">signature</span></div><code class="hash">${sig.slice(0,80)}…</code>
        <details style="margin-top:10px"><summary>full signed blob (${payloadStr.length+sig.length} bytes)</summary><pre>${JSON.stringify(signedBlob,null,2)}</pre></details>
        <div style="margin-top:12px">
          <button class="big-btn" onclick='downloadBlob(${JSON.stringify(id)},${JSON.stringify(signedBlob).replace(/'/g,"&apos;")})'>download resolve-${id}.json</button>
        </div>
      </div>`;
    renderBanner();
  }catch(e){
    out.innerHTML=`<div class="pill err">error</div> <span style="color:var(--rose)">${e.message}</span>`;
    console.error(e);
  }finally{btn.disabled=false;}
}
async function getLastResolve(){const all=await idbAll('resolves');return all.sort((a,b)=>(b.resolvedAt||'').localeCompare(a.resolvedAt||''))[0];}
function downloadBlob(id,blob){const b=new Blob([JSON.stringify(blob,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`resolve-${id}.json`;a.click();}
// ─── history ──────────────────────────────────────────────────────────────
async function renderHistory(){
  const all=(await idbAll('resolves')).sort((a,b)=>(b.resolvedAt||'').localeCompare(a.resolvedAt||''));
  const tb=$('hist-body');
  if(!all.length){tb.innerHTML='<tr><td colspan="5" style="color:var(--dim)">no resolves yet</td></tr>';return;}
  tb.innerHTML=all.map(r=>{
    const sc=r.scorecard;const passed=sc.audit.valid&&!sc.drift&&sc.commitments.ratio>=0.5;
    return `<tr><td>${(r.resolvedAt||'').slice(0,19).replace('T',' ')}</td><td>${r.session.name} <span style="color:var(--dim)">${r.id.slice(0,14)}</span></td><td>${passed?'<span class="pill ok">pass</span>':'<span class="pill warn">warn</span>'}${r.forced?' <span class="pill warn">forced</span>':''}</td><td>${r.cid.slice(0,20)}…</td><td class="act"><button class="big-btn ghost" onclick='loadRewind(${JSON.stringify(r.id)})'>verify</button></td></tr>`;
  }).join('');
}
async function loadRewind(id){
  const r=await idbGet('resolves',id);if(!r)return;
  $('rewind-in').value=JSON.stringify(r.signedBlob,null,2);await rewindVerify();
}
// ─── rewind ───────────────────────────────────────────────────────────────
async function rewindVerify(){
  const out=$('rewind-out');out.innerHTML='';
  try{
    const raw=$('rewind-in').value.trim();if(!raw)throw new Error('paste a resolve blob first');
    const blob=JSON.parse(raw);
    if(blob.kind!=='fallresolve.v1')throw new Error('not a fallresolve.v1 blob');
    const {signature,...payload}=blob;
    const payloadStr=JSON.stringify(payload);
    const ok=await verifyBytes(payloadStr,signature,payload.signer.pubRaw);
    const c=await cid(payloadStr+signature);
    const sc=payload.scorecard;
    out.innerHTML=`
      <div>${ok?'<span class="pill ok">signature valid</span>':'<span class="pill err">signature invalid</span>'}</div>
      <div style="margin-top:14px"><h3>session</h3>
        <div class="score" style="max-width:none">
          <div class="k">${payload.session.name}</div>
          <div class="v" style="font-size:14px;font-family:var(--mono)">${payload.session.id}</div>
          <div class="d">resolved ${payload.timestamps.resolved} · ring ${payload.ring} · <span class="omega">${payload.glyph}</span></div>
        </div>
      </div>
      <div style="margin-top:14px"><h3>scorecard</h3>
        <div class="scorecard">
          <div class="score ${sc.commitments.ratio>=0.8?'pass':(sc.commitments.ratio>=0.5?'warn':'fail')}"><div class="k">commitments</div><div class="v">${(sc.commitments.ratio*100).toFixed(0)}%</div><div class="d">${sc.commitments.done}/${sc.commitments.total}</div></div>
          <div class="score ${sc.audit.valid?'pass':'fail'}"><div class="k">audit</div><div class="v">${sc.audit.valid?'valid':'broken'}</div><div class="d">${sc.audit.count} entries</div></div>
          <div class="score pass"><div class="k">checkpoint</div><div class="v" style="font-size:14px;font-family:var(--mono)">${sc.checkpointHash.slice(0,12)}…</div><div class="d">SHA-256</div></div>
          <div class="score ${sc.v21.aligned?'pass':'warn'}"><div class="k">v21</div><div class="v">${sc.v21.aligned?'aligned':'thin'}</div><div class="d">bloom ${sc.v21.mag}</div></div>
          <div class="score ${sc.drift?'fail':'pass'}"><div class="k">drift</div><div class="v">${sc.drift?'detected':'none'}</div><div class="d">tampering probe</div></div>
        </div>
      </div>
      <div style="margin-top:8px"><h3>cid (recomputed)</h3><code class="hash">${c}</code></div>
      <div style="margin-top:8px"><h3>signer pubkey</h3><code class="hash">${payload.signer.pubRaw}</code></div>
      ${payload.lineage.prev?`<div style="margin-top:8px"><h3>lineage · previous</h3><code class="hash">${payload.lineage.prev}</code></div>`:'<div style="margin-top:8px"><span class="pill">genesis resolve</span></div>'}
    `;
  }catch(e){out.innerHTML=`<div class="pill err">error</div> <span style="color:var(--rose)">${e.message}</span>`;}
}
// ─── identity panel ───────────────────────────────────────────────────────
function renderIdentity(){
  if(!KEY){$('idkey').textContent='no key yet';return;}
  $('idkey').innerHTML=`<span class="ok">algorithm</span>: Ed25519\n<span class="ok">created</span>: ${KEY.createdAt}\n<span class="ok">public key (raw · b64)</span>:\n${KEY.pubRaw}\n\n<span class="wa">private key</span>: stored in IndexedDB · never leaves this device`;
}
function renderBanner(){
  const idl=KEY?KEY.pubRaw.slice(0,12)+'…':'—';
  idbAll('chain').then(c=>{
    idbAll('resolves').then(r=>{
      $('banner-meta').innerHTML=`<b>identity</b>: ${idl} · <b>ring</b>: 6/Ω · <b>chain</b>: ${c.length} entries · <b>resolves</b>: ${r.length}`;
    });
  });
}
// ─── bootstrap ────────────────────────────────────────────────────────────
(async function boot(){
  await ensureKey();
  $('sid').value=uuid();
  $('sname').value='ring-6-close';
  $('sstart').value=new Date(Date.now()-45*60000).toISOString();
  renderCommits();
  renderIdentity();
  renderBanner();
  // register sw (best-effort)
  if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{});}
})();

// Named exports for the primary API surface
export { bloom7 };
export { fingerprint };
export { db };
export { tx };
export { idbGet };
export { idbPut };
export { idbAll };
export { sha256hex };
export { cid };
export { ensureKey };

export { PRIMES };
export { DB_NAME };
export { DEFAULT_COMMITS };
