/* ============================================================
   RACCOURCIS CLAVIER — Espace / Entrée déclenchent l'action de
   DÉPART de la partie du jeu actuellement affiché (tirer le levier,
   distribuer, lancer, jouer, ouvrir...). Ne devine jamais un choix
   en cours de manche (tirer/rester, quelle case, quelle couleur...) :
   si aucune action de départ n'est disponible (manche déjà en cours,
   bouton désactivé/masqué), la touche ne fait rien de spécial.
   Inactif dans un champ de saisie (texte, liste déroulante).
   ============================================================ */
(function(){
  // id du bouton "action de départ" pour chaque vue de jeu — un seul point de vérité,
  // cohérent avec le petit indice "Espace pour..." affiché sous chaque bouton concerné.
  const PRIMARY_ACTION_BTN={
    slots:'s-lever', dragon:'sd-lever', blackjack:'bj-dealBtn', roulette:'r-spinBtn',
    bus:'bus-startBtn', baccarat:'bc-dealBtn', coinflip:'cf-flipBtn', mines:'mn-startBtn',
    crash:'cr-startBtn', videopoker:'vp-dealBtn', poker:'pk-dealBtn', friends:'fr-dealBtn', cases:'cs-openBtn'
  };
  document.addEventListener('keydown',(e)=>{
    // e.code==='Space' en secours : certains navigateurs/claviers ne remontent pas e.key===' '.
    const isSpace=e.code==='Space'||e.key===' '||e.key==='Spacebar';
    if(!isSpace&&e.key!=='Enter') return;
    if(e.ctrlKey||e.altKey||e.metaKey||e.shiftKey) return;
    const tag=document.activeElement&&document.activeElement.tagName;
    if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT') return; // ne jamais voler une saisie
    const activeView=document.querySelector('.view.active'); if(!activeView) return;
    const btnId=PRIMARY_ACTION_BTN[activeView.id.replace('view-','')]; if(!btnId) return;
    const btn=document.getElementById(btnId);
    if(!btn||btn.disabled||btn.offsetParent===null) return; // absent / masqué / désactivé
    e.preventDefault();
    btn.click();
  });
})();
