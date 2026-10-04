const req=request=>new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
export class LocalStore {
 constructor(scope='preview'){this.scope=scope;}
 async open(){if(this.db)return this;this.db=await new Promise((resolve,reject)=>{
  const r=indexedDB.open('liftplan-v2',1);r.onupgradeneeded=()=>{for(const name of ['records','outbox','drafts','conflicts'])r.result.createObjectStore(name,{keyPath:'key'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Close other LiftPlan tabs and try again.'));
 });return this;}
 key(id){return `${this.scope}|${id}`;}
 async transaction(names,fn){await this.open();return new Promise((resolve,reject)=>{const tx=this.db.transaction(names,'readwrite');let result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Your device could not save this change.'));try{result=fn(tx);}catch(e){tx.abort();reject(e);}});}
 async get(name,id){await this.open();return req(this.db.transaction(name).objectStore(name).get(this.key(id)));}
 async all(name){await this.open();return (await req(this.db.transaction(name).objectStore(name).getAll())).filter(r=>r.key.startsWith(`${this.scope}|`));}
 async records(kind,profileId){return (await this.all('records')).filter(r=>!r.deleted&&(!kind||r.kind===kind)&&(!profileId||r.profile_id===profileId));}
 async put(id,kind,profileId,payload,{deleted=false,finishDraft=null}={}){
  await this.open();let output;
  await this.transaction(['records','outbox','drafts','conflicts'],tx=>{
   const records=tx.objectStore('records');const read=records.get(this.key(id));read.onsuccess=()=>{
    const prior=read.result,mutation_id=crypto.randomUUID();
    output={key:this.key(id),id,kind,profile_id:profileId,payload,deleted,serverRevision:prior?.serverRevision||0,mutation_id,changedAt:Date.now()};
    records.put(output);tx.objectStore('outbox').put({...output,baseRevision:output.serverRevision});tx.objectStore('conflicts').delete(this.key(id));
    if(finishDraft)tx.objectStore('drafts').delete(this.key(finishDraft));
   };
  });return output;
 }
 async saveDraft(profileId,draft){await this.transaction(['drafts'],tx=>tx.objectStore('drafts').put({key:this.key(profileId),...draft}));}
 async deleteDraft(profileId){await this.transaction(['drafts'],tx=>tx.objectStore('drafts').delete(this.key(profileId)));}
 async acceptRemote(remote){await this.transaction(['records','outbox'],tx=>{
  const pending=tx.objectStore('outbox').get(this.key(remote.id));pending.onsuccess=()=>{if(pending.result)return;const records=tx.objectStore('records'),read=records.get(this.key(remote.id));read.onsuccess=()=>{if((read.result?.serverRevision||0)>remote.revision)return;records.put({key:this.key(remote.id),...remote,serverRevision:remote.revision});};};
 });}
 async acknowledge(sent,remote){await this.transaction(['records','outbox'],tx=>{
  const records=tx.objectStore('records'),outbox=tx.objectStore('outbox'),read=records.get(this.key(sent.id));read.onsuccess=()=>{
   const local=read.result;if(!local)return;records.put({...local,serverRevision:remote.revision});
   const pending=outbox.get(this.key(sent.id));pending.onsuccess=()=>{if(!pending.result)return;if(pending.result.mutation_id===sent.mutation_id)outbox.delete(this.key(sent.id));else outbox.put({...pending.result,baseRevision:remote.revision,serverRevision:remote.revision});};
  };
 });}
 async conflict(sent,remote){await this.transaction(['conflicts'],tx=>tx.objectStore('conflicts').put({key:this.key(sent.id),id:sent.id,local:sent,remote}));}
 async resolve(id,keepLocal){const conflict=await this.get('conflicts',id);if(!conflict)return;await this.transaction(['records','outbox','conflicts'],tx=>{
  const key=this.key(id),remote=conflict.remote;
  if(keepLocal){const r=tx.objectStore('records').get(key);r.onsuccess=()=>{const v={...r.result,serverRevision:remote?.revision||0,baseRevision:remote?.revision||0,mutation_id:crypto.randomUUID()};tx.objectStore('records').put(v);tx.objectStore('outbox').put(v);};}
  else {tx.objectStore('outbox').delete(key);if(remote)tx.objectStore('records').put({key,...remote,serverRevision:remote.revision});else tx.objectStore('records').delete(key);}
  tx.objectStore('conflicts').delete(key);
 });}
 async export(){return {version:2,exportedAt:new Date().toISOString(),records:await this.all('records'),drafts:await this.all('drafts')};}
}
