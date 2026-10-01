/* ============================================================
   BOUTON "INSTALLER L'APPLICATION" — déclenche l'invite native du
   navigateur (beforeinstallprompt) au lieu de laisser chacun chercher
   l'option dans son menu. Sur iOS/iPadOS, Safari n'expose pas cet
   événement (pas d'install programmatique possible) : on affiche
   plutôt un petit mode d'emploi, seule option sur cette plateforme.
   ============================================================ */
(function(){
  const C = window.Casino || (window.Casino = {});
  const row = document.getElementById('installRow'), btn = document.getElementById('installAppBtn');
  if(!row || !btn) return;

  function isStandalone(){ return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone===true; }
  function isIOS(){ return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream; }

  if(isStandalone()) return; // déjà installée, rien à proposer

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault();
    deferredPrompt = e;
    btn.textContent = 'Installer';
    row.style.display = 'flex';
  });
  window.addEventListener('appinstalled', ()=>{
    row.style.display = 'none';
    deferredPrompt = null;
  });

  if(isIOS()){
    btn.textContent = 'Comment faire ?';
    row.style.display = 'flex';
  }

  btn.addEventListener('click', async ()=>{
    if(deferredPrompt){
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if(choice.outcome==='accepted'){ row.style.display='none'; C.showToast&&C.showToast('✅ Application installée !'); }
    } else if(isIOS()){
      C.showToast&&C.showToast('Sur iPhone/iPad : appuie sur le bouton Partager 􀈂 puis « Sur l’écran d’accueil ».');
    }
  });
})();
