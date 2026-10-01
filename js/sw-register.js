/* ============================================================
   ENREGISTREMENT DU SERVICE WORKER — active le mode hors-ligne et
   l'installation "à l'écran d'accueil". Nécessite d'être servi via
   http(s) (localhost/127.0.0.1 comptent) : ne fonctionne pas en
   ouvrant index.html directement depuis le disque (file://), c'est
   une contrainte du navigateur, pas de ce script.
   ============================================================ */
if('serviceWorker' in navigator && (location.protocol==='http:'||location.protocol==='https:')){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{
      // Ne prévient qu'une fois (jamais à chaque visite) — juste assez pour rassurer que l'appli
      // marchera sans connexion la prochaine fois, sans devenir un toast répétitif.
      try{
        if(localStorage.getItem('grand-casino-offline-ready')!=='1'){
          localStorage.setItem('grand-casino-offline-ready','1');
          const C=window.Casino;
          if(C&&C.showToast) C.showToast('✅ Disponible hors-ligne — tu peux maintenant y jouer sans connexion.');
        }
      }catch(e){}
    }).catch(()=>{});
  });
}

// ---- Indicateur de connexion (badge discret dans la barre du haut) — purement informatif,
// ne bloque jamais le jeu : tout fonctionne déjà hors-ligne grâce au service worker ci-dessus. ----
(function(){
  function updateOnlineBadge(){
    const el=document.getElementById('hdrOffline'); if(!el) return;
    el.style.display=navigator.onLine?'none':'inline';
  }
  window.addEventListener('online',updateOnlineBadge);
  window.addEventListener('offline',updateOnlineBadge);
  updateOnlineBadge(); // le badge #hdrOffline est déjà dans le DOM : ce script est chargé en fin de page
})();
