/* ============================================================
   DÉFIS PERSONNELS — capital fictif + temps limité, purement local
   (pas d'autres joueurs). Ne duplique AUCUNE règle de jeu : un défi
   se contente d'échanger temporairement C.state.balance contre un
   capital fixe, puis renvoie le joueur sur le VRAI jeu choisi via la
   navigation [data-view] déjà en place — il joue avec les mêmes
   moteurs, mêmes probabilités, mêmes écrans que d'habitude. Le solde
   réel est sauvegardé à part et restauré à la fin (voir le garde-fou
   C.challengeActive dans core.js) ; le score retenu est le MEILLEUR
   solde atteint pendant le défi (pas forcément le solde final), suivi
   en écoutant l'événement 'balance-changed' déjà déclenché par
   C.renderBalance() à chaque jeu — aucun nouveau système de suivi.
   ============================================================ */
window.Casino=window.Casino||{};
(function(){
  const C=window.Casino, $=id=>document.getElementById(id);
  if(!$('view-challenges')) return;

  const CH_KEY='grand-casino-challenges';
  // Liste d'affichage uniquement (icône/nom) : aucune règle ni logique de jeu ici, seulement
  // de quoi construire le sélecteur — la partie elle-même se joue sur la vraie page du jeu.
  const GAMES=[
    {key:'slots',icon:'🎰',name:'Machine à sous'},
    {key:'dragon',icon:'🐉',name:'Fortune Dragon'},
    {key:'blackjack',icon:'🃏',name:'Blackjack'},
    {key:'roulette',icon:'🎡',name:'Roulette'},
    {key:'bus',icon:'🚌',name:'Ride the Bus'},
    {key:'baccarat',icon:'🎴',name:'Baccarat'},
    {key:'coinflip',icon:'🪙',name:'Pile ou Face'},
    {key:'mines',icon:'💣',name:'Mines'},
    {key:'crash',icon:'🚀',name:'Crash'},
    {key:'videopoker',icon:'♠️',name:'Vidéo Poker'},
    {key:'poker',icon:'♣️',name:'Poker Texas Hold’em'},
    {key:'cases',icon:'📦',name:'Ouverture de Caisses'}
  ];
  const CAPITALS=[100,250,500], DURATIONS=[180,300];

  const setupEl=$('ch-setup'), runningNoteEl=$('ch-runningNote');
  const gameGridEl=$('ch-gameGrid'), capitalGridEl=$('ch-capitalGrid'), durationGridEl=$('ch-durationGrid');
  const startBtn=$('ch-startBtn'), recordsEl=$('ch-records');
  const hud=$('chHud'), hudGame=$('ch-hudGame'), hudTime=$('ch-hudTime'), hudBalance=$('ch-hudBalance'), quitBtn=$('ch-quitBtn');

  let records={};
  try{ const raw=localStorage.getItem(CH_KEY); if(raw) records=JSON.parse(raw); }catch(e){}
  function saveRecords(){ try{ localStorage.setItem(CH_KEY, JSON.stringify(records)); }catch(e){} }

  let selectedGame=GAMES[0].key, selectedCapital=CAPITALS[0], selectedDuration=DURATIONS[0];
  let active=false, realBalance=0, realWagered=0, peak=0, endAt=0, tickIv=null;

  function fmtTime(sec){ sec=Math.max(0,Math.ceil(sec)); const m=Math.floor(sec/60), s=sec%60; return m+':'+String(s).padStart(2,'0'); }

  function renderGameGrid(){
    gameGridEl.innerHTML=GAMES.map(g=>
      '<button data-game="'+g.key+'"'+(g.key===selectedGame?' class="sel"':'')+'><span class="ch-g-icon">'+g.icon+'</span>'+g.name+'</button>'
    ).join('');
  }
  function renderRecordsList(){
    const played=GAMES.filter(g=>records[g.key]);
    recordsEl.innerHTML=played.length
      ? played.map(g=>'<div class="ch-record-row"><span>'+g.icon+' '+g.name+'</span><b>'+records[g.key]+' 🪙</b></div>').join('')
      : '<p class="empty-state">Aucun défi terminé pour l’instant.</p>';
  }
  function refreshSetupState(){
    setupEl.style.display=active?'none':'';
    runningNoteEl.style.display=active?'block':'none';
  }
  // Exposé pour core.js : appelé à chaque ouverture de la vue (switchView), comme les autres
  // rendus différés (renderStats, renderVip...).
  C.renderChallenges=function(){ renderGameGrid(); renderRecordsList(); refreshSetupState(); };

  gameGridEl.addEventListener('click',(e)=>{
    const b=e.target.closest('button'); if(!b||active) return;
    selectedGame=b.dataset.game; renderGameGrid();
  });
  capitalGridEl.addEventListener('click',(e)=>{
    const b=e.target.closest('button'); if(!b||active) return;
    selectedCapital=parseInt(b.dataset.capital,10);
    capitalGridEl.querySelectorAll('button').forEach(x=>x.classList.toggle('sel',x===b));
  });
  durationGridEl.addEventListener('click',(e)=>{
    const b=e.target.closest('button'); if(!b||active) return;
    selectedDuration=parseInt(b.dataset.duration,10);
    durationGridEl.querySelectorAll('button').forEach(x=>x.classList.toggle('sel',x===b));
  });

  function startChallenge(){
    if(active) return;
    realBalance=C.state.balance; realWagered=C.state.totalWagered;
    peak=selectedCapital;
    C.challengeActive=true;
    C.state.balance=selectedCapital;
    C.renderBalance();
    active=true;
    endAt=Date.now()+selectedDuration*1000;
    const g=GAMES.find(x=>x.key===selectedGame);
    hudGame.textContent=g?(g.icon+' '+g.name):selectedGame;
    hud.style.display='block';
    updateHud();
    tickIv=setInterval(tick,250);
    refreshSetupState();
    C.showToast('🎯 Défi lancé — '+selectedCapital+' 🪙, '+Math.round(selectedDuration/60)+' min. Joue sur '+(g?g.name:selectedGame)+' !');
    const nav=document.querySelector('[data-view="'+selectedGame+'"]'); if(nav) nav.click();
  }
  startBtn.addEventListener('click',startChallenge);

  function updateHud(){
    hudBalance.textContent=C.state.balance;
    hudTime.textContent=fmtTime((endAt-Date.now())/1000);
  }
  function tick(){
    if(!active) return;
    updateHud();
    if(Date.now()>=endAt) endChallenge('time');
  }
  document.addEventListener('balance-changed',()=>{
    if(!active) return;
    peak=Math.max(peak, C.state.balance);
    updateHud();
  });

  function endChallenge(reason){
    if(!active) return;
    active=false; clearInterval(tickIv);
    C.challengeActive=false;
    // Une récompense de mission gagnée pendant le défi a été mise de côté (voir core.js) : on
    // l'ajoute au VRAI solde ici, elle n'est jamais perdue.
    const pending=C.state.pendingChallengeCredit||0; C.state.pendingChallengeCredit=0;
    C.state.balance=realBalance+pending; C.state.totalWagered=realWagered;
    C.saveBalance(); C.renderBalance();
    hud.style.display='none';
    const g=GAMES.find(x=>x.key===selectedGame);
    const gname=g?g.name:selectedGame;
    const prev=records[selectedGame]||0;
    const beat=peak>prev;
    if(beat){ records[selectedGame]=peak; saveRecords(); }
    C.sound&&C.sound(beat?'achievement':(reason==='quit'?'loss':'win'));
    C.showToast((reason==='quit'?'🏳️ Défi abandonné — ':'⏱️ Défi terminé — ')+gname+' : meilleur solde '+peak+' 🪙'+(beat?' — nouveau record !':(prev?' (record : '+prev+' 🪙)':'')));
    refreshSetupState();
    // On ne force jamais la navigation à la fin (timeout ou abandon) : si le joueur est en
    // pleine main sur le jeu du défi, le rediriger d'office serait plus perturbant qu'utile.
    // On rafraîchit juste la page Défis si elle est déjà ouverte (ex. l'utilisateur y était
    // revenu pendant le décompte pour surveiller le temps restant).
    if($('view-challenges').classList.contains('active')){ renderGameGrid(); renderRecordsList(); }
  }
  quitBtn.addEventListener('click',()=>endChallenge('quit'));

  // Le salon entre amis / une connexion multijoueur ne se mélange pas avec un défi : si
  // l'utilisateur rejoint ou héberge un salon pendant un défi, mieux vaut l'arrêter proprement
  // plutôt que de laisser un capital fictif se mélanger à une partie avec de vrais amis.
  document.addEventListener('friends-changed',()=>{ if(active&&C.friends&&C.friends.role()) endChallenge('quit'); });

  renderGameGrid(); renderRecordsList(); refreshSetupState();
})();
