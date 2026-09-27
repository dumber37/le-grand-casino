/* ============================================================
   SERVICE WORKER — cache "réseau d'abord, secours hors-ligne".
   Toujours la version en ligne quand elle est disponible (jamais de
   contenu périmé affiché alors qu'une connexion fonctionne) ; le
   cache ne sert que de filet de sécurité hors-ligne. CACHE_NAME est
   versionné : à chaque changement de fichiers, incrémenter le
   suffixe fait automatiquement place nette de l'ancien cache.
   ============================================================ */
const CACHE_NAME = 'grand-casino-v9';
const ASSETS = [
  './', './index.html', './manifest.json',
  './css/base.css', './css/slots.css', './css/dragon-slots.css', './css/blackjack.css',
  './css/roulette.css', './css/bus.css', './css/baccarat.css', './css/coinflip.css',
  './css/mines.css', './css/crash.css', './css/video-poker.css', './css/cases.css', './css/poker.css', './css/friends.css', './css/avatars.css', './css/chips.css', './css/floor.css',
  './css/missions.css', './css/vip.css', './css/ambiance.css', './css/halloffame.css', './css/challenges.css',
  './js/core.js', './js/audio.js', './js/slot-engine.js', './js/slots.js',
  './js/dragon-slots.js', './js/blackjack.js', './js/roulette.js', './js/bus.js',
  './js/baccarat.js', './js/coinflip.js', './js/mines.js', './js/crash.js',
  './js/video-poker.js', './js/cases.js', './js/poker.js', './js/friends.js', './js/avatars.js', './js/chips.js', './js/multi-blackjack.js', './js/multi-bus.js', './js/multi-crash.js', './js/floor.js', './js/challenges.js', './js/shortcuts.js', './js/ambiance.js',
  './assets/icon-192.png', './assets/icon-512.png'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e)=>{
  if(e.request.method!=='GET') return;
  e.respondWith(
    fetch(e.request).then(res=>{
      const copy=res.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put(e.request, copy)).catch(()=>{});
      return res;
    }).catch(()=>caches.match(e.request))
  );
});
