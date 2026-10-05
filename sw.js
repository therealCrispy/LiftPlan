const CACHE='liftplan-shell-v2-9';
const BASE=new URL('./',self.location.href);
const FILES=['./','index.html','styles.css','manifest.webmanifest','js/app.js','js/core.js','js/program.js','js/config.js','js/store.js','js/cloud.js','icons/icon.svg','icons/logo.svg','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','icons/apple-touch-icon.png'].map(p=>new URL(p,BASE).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('liftplan-shell-')&&name!==CACHE)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).then(response=>response.ok?response:Promise.reject()).catch(async()=>await caches.match(new URL('index.html',BASE).href)));return;
 }
 if(!FILES.includes(url.href))return;
 event.respondWith(caches.open(CACHE).then(async cache=>await cache.match(request)||fetch(request)));
});
