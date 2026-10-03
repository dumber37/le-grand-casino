/* ============================================================
   CHARGEMENT FIREBASE PARTAGÉ — petit point d'entrée commun à
   cloud-sync.js (sauvegarde cloud) et friends.js (salons rapides) pour
   ne jamais appeler initializeApp() deux fois (la 2e fois lève une
   erreur "app already exists"). Le SDK (CDN officiel Google) n'est
   chargé que si CASINO_FIREBASE_CONFIG est rempli ET qu'un de ces deux
   usages est réellement déclenché par le joueur — jamais au chargement
   de la page.
   ============================================================ */
window.Casino = window.Casino || {};
(function(){
  const C = window.Casino;
  const CFG = window.CASINO_FIREBASE_CONFIG;
  C.firebaseConfigured = !!(CFG && CFG.apiKey && CFG.projectId);

  let appPromise = null;
  C.loadFirebaseApp = function(){
    if(!C.firebaseConfigured) return Promise.reject(new Error('firebase-not-configured'));
    if(!appPromise){
      appPromise = import('https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js')
        .then(({initializeApp,getApps,getApp})=> getApps().length ? getApp() : initializeApp(CFG));
    }
    return appPromise;
  };
})();
