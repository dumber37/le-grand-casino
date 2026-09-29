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
  // id(s) du bouton "action de départ" pour chaque vue de jeu — un seul point de vérité,
  // cohérent avec le petit indice "Espace pour..." affiché sous chaque bouton concerné.
  // Plusieurs ids pour les jeux qui ont un bouton solo ET un bouton multijoueur séparé
  // (Blackjack/Bus/Crash) : on prend le premier des deux qui soit réellement visible.
  const PRIMARY_ACTION_BTN={
    slots:['s-lever'], dragon:['sd-lever'], blackjack:['bj-dealBtn','bjm-dealBtn'], roulette:['r-spinBtn'],
    bus:['bus-startBtn','bsm-dealBtn'], baccarat:['bc-dealBtn'], coinflip:['cf-flipBtn'], mines:['mn-startBtn'],
    crash:['cr-startBtn','crm-startBtn'], videopoker:['vp-dealBtn'], poker:['pk-dealBtn'], friends:['fr-dealBtn'], cases:['cs-openBtn']
  };
  document.addEventListener('keydown',(e)=>{
    // e.code==='Space' en secours : certains navigateurs/claviers ne remontent pas e.key===' '.
    const isSpace=e.code==='Space'||e.key===' '||e.key==='Spacebar';
    if(!isSpace&&e.key!=='Enter') return;
    if(e.ctrlKey||e.altKey||e.metaKey||e.shiftKey) return;
    const tag=document.activeElement&&document.activeElement.tagName;
    if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT') return; // ne jamais voler une saisie
    const activeView=document.querySelector('.view.active'); if(!activeView) return;
    const ids=PRIMARY_ACTION_BTN[activeView.id.replace('view-','')]; if(!ids) return;
    const btn=ids.map(id=>document.getElementById(id)).find(b=>b&&!b.disabled&&b.offsetParent!==null);
    if(!btn) return; // aucun des deux boutons visible/actif (ex. invité en multijoueur)
    e.preventDefault();
    btn.click();
  });
})();
