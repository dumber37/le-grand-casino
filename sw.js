/* ============================================================
   SERVICE WORKER — cache "réseau d'abord, secours hors-ligne".
   Toujours la version en ligne quand elle est disponible (jamais de
   contenu périmé affiché alors qu'une connexion fonctionne) ; le
   cache ne sert que de filet de sécurité hors-ligne. CACHE_NAME est
   versionné : à chaque changement de fichiers, incrémenter le
   suffixe fait automatiquement place nette de l'ancien cache.
   ============================================================ */
const CACHE_NAME = 'grand-casino-v59';
const ASSETS = [
  './', './index.html', './manifest.json',
  './css/base.css', './css/slots.css', './css/dragon-slots.css', './css/blackjack.css',
  './css/roulette.css', './css/bus.css', './css/baccarat.css', './css/coinflip.css',
  './css/mines.css', './css/crash.css', './css/video-poker.css', './css/cases.css', './css/poker.css', './css/friends.css', './css/avatars.css', './css/chips.css', './css/floor.css',
  './css/missions.css', './css/vip.css', './css/ambiance.css', './css/halloffame.css', './css/challenges.css', './css/account.css', './css/leaderboard.css', './css/war.css', './css/keno.css', './css/wheel.css', './css/shop.css', './css/craps.css', './css/plinko.css', './css/hilo.css', './css/scratch.css', './css/tower.css', './css/extras.css',
  './js/core.js', './js/firebase-config.js', './js/firebase-shared.js', './js/turn-config.js','./js/seasonal.js', './js/a11y.js', './js/pin-lock.js', './js/win-effects.js', './js/deal-anim.js', './js/audio.js', './js/slot-engine.js', './js/slots.js',
  './js/dragon-slots.js', './js/blackjack.js', './js/roulette-scene.js', './js/roulette.js', './js/bus.js',
  './js/baccarat.js', './js/coinflip.js', './js/war.js', './js/keno.js', './js/craps.js', './js/plinko.js', './js/hilo.js', './js/scratch.js', './js/tower.js', './js/weekly.js', './js/season.js', './js/stats-chart.js', './js/wheel.js', './js/daily-challenge.js', './js/shop.js', './js/mines.js', './js/crash.js',
  './js/video-poker.js', './js/cases.js', './js/poker.js', './js/friends.js', './js/friends-compare.js', './js/friends-extras.js', './js/home-ticker.js', './js/avatars.js', './js/chips.js', './js/multi-blackjack.js', './js/multi-bus.js', './js/multi-crash.js', './js/floor.js', './js/challenges.js', './js/cloud-sync.js', './js/leaderboard.js', './js/online-leaderboard.js','./js/shortcuts.js', './js/ambiance.js',
  './js/qrcode-lib.js', './js/qrcode.js', './js/install-prompt.js', './js/save-transfer.js',
  './js/sw-register.js', './assets/icon-180.png', './assets/icon-192.png', './assets/icon-512.png', './assets/icon-maskable-192.png', './assets/icon-maskable-512.png'
];

self.addEventListener('install', (e)=>{
  // cache:'reload' : on récupère la version DU SERVEUR, jamais une copie périmée du cache HTTP du navigateur
  // (GitHub Pages autorise 10 min de cache : sans ça, un nouveau déploiement pouvait être « installé » avec d'anciens fichiers).
  e.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS.map(a=>new Request(a,{cache:'reload'})))).catch(()=>{}));
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
  // Uniquement les fichiers du site : les requêtes vers Firebase/Firestore, Google ou Metered
  // (poignée de main des salons, SDK) ne doivent jamais être mises en cache ni resservies périmées.
  if(new URL(e.request.url).origin!==self.location.origin) return;
  e.respondWith(
    // cache:'no-cache' : revalidation auprès du serveur à chaque chargement (réponse 304 légère si rien n'a changé), pour
    // voir un nouveau déploiement tout de suite plutôt qu'après l'expiration du cache HTTP (10 min sur GitHub Pages).
    fetch(e.request,{cache:'no-cache'}).then(res=>{
      if(res.ok){
        const copy=res.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put(e.request, copy)).catch(()=>{});
      }
      return res;
    }).catch(()=>caches.match(e.request,{ignoreSearch:true}))
  );
});
