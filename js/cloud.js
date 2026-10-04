import {CONFIG} from './config.js';
const SESSION_KEY='liftplan.v2.session';
export class ApiError extends Error{constructor(message,status,code){super(message);this.status=status;this.code=code;}}
async function request(path,{token,method='GET',body}={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(CONFIG.url+path,{method,headers:{apikey:CONFIG.key,...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:controller.signal});
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new ApiError(data?.message||data?.msg||data?.error_description||'Cloud connection failed. Try again.',response.status,data?.code||data?.error_code);
  return data;
 }catch(error){if(error.name==='AbortError')throw Error('Cloud connection timed out. Your changes remain on this device.');throw error;}finally{clearTimeout(timer);}
}
export class Auth {
 constructor(){this.refreshing=null;}
 session(){try{return JSON.parse(localStorage.getItem(SESSION_KEY));}catch{return null;}}
 remember(data){const value={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:data.expires_at||Math.floor(Date.now()/1000)+data.expires_in,user:{id:data.user.id,email:data.user.email}};localStorage.setItem(SESSION_KEY,JSON.stringify(value));return value;}
 async signIn(email,password){return this.remember(await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}}));}
 async signUp(email,password){const data=await request('/auth/v1/signup',{method:'POST',body:{email,password}});return data.access_token?this.remember(data):null;}
 async token(){
  const session=this.session();if(!session)throw new ApiError('Sign in again to sync. Your local workouts are still saved.',401,'session_missing');
  if(session.expires_at>Math.floor(Date.now()/1000)+60)return session.access_token;
  if(this.refreshing)return this.refreshing;
  const refresh=async()=>{const latest=this.session();if(latest?.expires_at>Math.floor(Date.now()/1000)+60)return latest.access_token;try{return this.remember(await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:latest.refresh_token}})).access_token;}catch(e){if(e.status===400||e.status===401)localStorage.removeItem(SESSION_KEY);throw e;}};
  this.refreshing=(navigator.locks?navigator.locks.request('liftplan-auth-refresh',refresh):refresh()).finally(()=>{this.refreshing=null;});return this.refreshing;
 }
 async signOut(){try{const session=this.session();if(session)await request('/auth/v1/logout?scope=local',{method:'POST',token:session.access_token});}catch{/* Local sign-out must also work offline. */}finally{localStorage.removeItem(SESSION_KEY);}}
}
export class Cloud {
 constructor(auth){this.auth=auth;}
 async call(path,options={}){return request(path,{...options,token:await this.auth.token()});}
 async push(change){const rows=await this.call('/rest/v1/rpc/save_liftplan_v2_record',{method:'POST',body:{p_id:change.id,p_kind:change.kind,p_profile_id:change.profile_id,p_payload:change.payload,p_base_revision:change.baseRevision,p_mutation_id:change.mutation_id,p_deleted:change.deleted}});return rows[0];}
 async get(id){return (await this.call('/rest/v1/liftplan_v2_records?'+new URLSearchParams({id:`eq.${id}`,select:'*'})))[0]||null;}
 async pull(){let offset=0,result=[];while(true){const rows=await this.call(`/rest/v1/liftplan_v2_records?select=*&order=id&limit=500&offset=${offset}`);result.push(...rows);if(rows.length<500)return result;offset+=500;}}
}
export class Sync {
 constructor(store,cloud,notify=()=>{}){this.store=store;this.cloud=cloud;this.notify=notify;this.running=null;this.state='idle';this.message='';}
 async run(){if(this.running)return this.running;this.running=this.perform().finally(()=>{this.running=null;});return this.running;}
 async perform(){
  if(!navigator.onLine){this.state='offline';this.message='Saved on this iPhone · syncs when online';this.notify();return;}
  this.state='syncing';this.message='Syncing';this.notify();
  try{
   const conflicts=new Set((await this.store.all('conflicts')).map(c=>c.id));
   // A snapshot keeps a continuously edited draft from starving a pull.
   for(const change of await this.store.all('outbox')){
    if(conflicts.has(change.id))continue;
    try{await this.store.acknowledge(change,await this.cloud.push(change));}
    catch(error){if(error.code==='40001'||error.status===409){await this.store.conflict(change,await this.cloud.get(change.id));continue;}throw error;}
   }
   for(const remote of await this.cloud.pull())await this.store.acceptRemote(remote);
   const pending=await this.store.all('outbox'),unresolved=await this.store.all('conflicts');
   this.state=unresolved.length?'conflict':pending.length?'pending':'synced';this.message=unresolved.length?'Changes need review':pending.length?'Changes saved here · waiting to sync':'All changes synced';
  }catch(error){this.state='error';this.message=error.code==='42P01'||error.code==='PGRST202'?'Cloud setup is needed. Changes are saved on this device.':error.status===401?'Sign in again to sync. Changes are saved here.':'Saved on this device · cloud sync needs attention';this.error=error.message;}
  this.notify();
 }
}
