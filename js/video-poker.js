/* ============================================================
   VIDÉO POKER — Jacks or Better (paytable 9/6 classique).
   Distribue 5 cartes, choisis celles à garder, échange le reste,
   la meilleure combinaison forme le gain. Cartes 3D et deck
   réutilisés tels quels (C.renderCard / C.newDeck).
   ============================================================ */
(function(){
  const C=window.Casino;
  const betEl=document.getElementById('vp-betAmount'), msg=document.getElementById('vp-message');
  const cardsEl=document.getElementById('vp-cards'), dealBtn=document.getElementById('vp-dealBtn');
  const betMinus=document.getElementById('vp-betMinus'), betPlus=document.getElementById('vp-betPlus');
  const paytableEl=document.getElementById('vp-paytable');
  const demoBtn=document.getElementById('vp-demoBtn'), demoBanner=document.getElementById('vp-demoBanner'), demoBalEl=document.getElementById('vp-demoBal');
  const minBet=5, maxBet=100, betStep=5;
  let bet=20, deck=[], hand=[], held=[false,false,false,false,false], phase='idle';
  const tableEl=cardsEl.closest('.bj-table');
  // Distribution lente (C.paceDeal, deal-anim.js) : les 5 cartes sont posées une à une (~1 s), puis, à l'échange, les
  // cartes remplacées une à une ; le gain n'est annoncé qu'après la dernière. Tout est tiré d'un coup comme avant,
  // seul l'affichage est étalé. phase : 'idle' | 'dealing' | 'dealt' (choix des cartes à garder) | 'drawing'.
  // pendingSettle règle l'échange tout de suite si l'onglet se ferme en pleine distribution (le gain n'est jamais perdu).
  let dealCtl=null, pendingSettle=null;
  const instantDeal=(n,onCard,onDone)=>{ onDone(); return {skip(){},cancel(){}}; }; // repli si deal-anim.js manque : tout d'un coup
  window.addEventListener('pagehide',()=>{ if(pendingSettle) pendingSettle(); });
  // ---- Partie d'essai : jetons fictifs, séparés du solde réel (jamais lu ni modifié tant
  // qu'elle est active). Aucun recordGame en démo : stats/historique/missions/VIP restent
  // intacts, exactement comme si la partie n'avait jamais eu lieu. ----
  let demoMode=false, demoBalance=500;
  const bal=()=>demoMode?demoBalance:C.state.balance;
  function toggleDemo(){
    if(phase!=='idle') return; // pas de bascule en pleine main (ni pendant la distribution), pour éviter toute confusion
    demoMode=!demoMode; demoBalance=500;
    demoBtn.textContent=demoMode?'🎓 Quitter la partie d’essai':'🎓 Partie d’essai';
    demoBanner.classList.toggle('show',demoMode);
    demoBalEl.textContent=demoBalance;
    hand=[]; held=[false,false,false,false,false]; phase='idle';
    cardsEl.classList.remove('vp-win'); highlightPaytable(-1);
    msg.textContent=demoMode?'Partie d’essai — place une mise fictive puis distribue.':'Place ta mise puis distribue.';
    renderCards(); render();
  }
  demoBtn.addEventListener('click',toggleDemo);

  function rankValue(r){ if(r==='A') return 14; if(r==='K') return 13; if(r==='Q') return 12; if(r==='J') return 11; return parseInt(r,10); }
  function evaluateHand(cards){
    const values=cards.map(c=>rankValue(c.r)).sort((a,b)=>a-b);
    const suits=cards.map(c=>c.s);
    const isFlush=suits.every(s=>s===suits[0]);
    let isStraight=values.every((v,i)=>i===0||v===values[i-1]+1);
    if(!isStraight&&values[0]===2&&values[1]===3&&values[2]===4&&values[3]===5&&values[4]===14) isStraight=true;
    const counts={};
    values.forEach(v=>counts[v]=(counts[v]||0)+1);
    const countVals=Object.values(counts).sort((a,b)=>b-a);
    if(isFlush&&isStraight&&values[0]===10&&values[4]===14) return {name:'Quinte Flush Royale',mult:800};
    if(isFlush&&isStraight) return {name:'Quinte Flush',mult:50};
    if(countVals[0]===4) return {name:'Carré',mult:25};
    if(countVals[0]===3&&countVals[1]===2) return {name:'Full',mult:9};
    if(isFlush) return {name:'Couleur',mult:6};
    if(isStraight) return {name:'Quinte',mult:4};
    if(countVals[0]===3) return {name:'Brelan',mult:3};
    if(countVals[0]===2&&countVals[1]===2) return {name:'Deux Paires',mult:2};
    if(countVals[0]===2){
      const pairVal=parseInt(Object.keys(counts).find(k=>counts[k]===2),10);
      if(pairVal>=11) return {name:'Paire de Valets ou mieux',mult:1};
    }
    return {name:'Rien — perdu',mult:0};
  }

  // animateMask (tableau de 5 booléens, optionnel) : seules les cartes marquées y rejouent
  // l'animation "sortie de la banque" — sans ça, garder une carte (clic sur "GARDÉE") reconstruit
  // toute la main et ferait revoler TOUTES les cartes à chaque clic, y compris celles déjà en jeu.
  function renderCards(animateMask){
    cardsEl.innerHTML='';
    hand.forEach((c,i)=>{
      const slot=document.createElement('div'); slot.className='vp-slot'+(held[i]?' vp-held':'');
      const cardEl=C.renderCard(c,false,true);
      if(animateMask&&animateMask[i]) cardEl.classList.add('vp-fresh');
      slot.appendChild(cardEl);
      const tag=document.createElement('div'); tag.className='vp-hold-tag'; tag.textContent=held[i]?'GARDÉE':'';
      slot.appendChild(tag);
      if(phase==='dealt'){
        const toggle=()=>{ held[i]=!held[i]; renderCards(); };
        // Accessible au clavier pendant la phase de sélection uniquement (comme au clic) :
        // rôle bouton + focus + Entrée/Espace basculent la carte gardée.
        slot.setAttribute('role','button'); slot.setAttribute('tabindex','0');
        slot.setAttribute('aria-pressed', held[i]?'true':'false');
        slot.setAttribute('aria-label', c.r+c.s+(held[i]?', gardée':', à échanger'));
        slot.addEventListener('click',toggle);
        slot.addEventListener('keydown',(e)=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); toggle(); } });
      }
      cardsEl.appendChild(slot);
    });
    // Emplacements pas encore distribués (main vide, ou distribution en cours) : cases vides en pointillé.
    for(let i=hand.length;i<5;i++){ const ph=document.createElement('div'); ph.className='vp-slot vp-empty'; cardsEl.appendChild(ph); }
  }
  function highlightPaytable(mult){
    Array.from(paytableEl.children).forEach(row=>row.classList.toggle('vp-hit', mult>0 && parseInt(row.dataset.mult,10)===mult));
  }
  function render(){
    betEl.textContent=bet;
    dealBtn.textContent=(phase==='dealt'||phase==='drawing')?'ÉCHANGER':'DISTRIBUER';
    dealBtn.disabled=(phase==='idle'&&(bet<=0||bal()<bet))||phase==='dealing'||phase==='drawing';
    betMinus.disabled=betPlus.disabled=(phase!=='idle');
    demoBtn.disabled=(phase!=='idle');
  }
  betMinus.addEventListener('click',()=>{ if(phase==='idle'){ bet=Math.max(minBet,bet-betStep); render(); } });
  betPlus.addEventListener('click',()=>{ if(phase==='idle'){ bet=Math.min(maxBet,bet+betStep); render(); } });
  document.addEventListener('balance-changed',render);

  function deal(){
    if(phase!=='idle') return;
    if(bal()<bet){ msg.textContent='Solde insuffisant.'; return; }
    if(demoMode){ demoBalance-=bet; demoBalEl.textContent=demoBalance; } else { C.state.balance-=bet; C.trackWager(bet); C.saveBalance(); C.renderBalance(); }
    deck=C.newDeck(); const dealt=[deck.pop(),deck.pop(),deck.pop(),deck.pop(),deck.pop()]; held=[false,false,false,false,false];
    // Les 5 cartes sont tirées d'un coup ; le croupier les pose une à une, de gauche à droite.
    hand=[]; phase='dealing';
    cardsEl.classList.remove('vp-win'); highlightPaytable(-1);
    msg.textContent='Distribution des cartes… (clique sur la table pour accélérer)';
    if(C.forgetCards) C.forgetCards(tableEl); // nouvelle donne : chaque carte part bien de la main du croupier
    tableEl.classList.add('dealing');
    renderCards(); render();
    const finish=()=>{
      if(phase!=='dealing') return;
      dealCtl=null; tableEl.classList.remove('dealing');
      hand=dealt.slice(); phase='dealt';
      msg.textContent='Choisis les cartes à garder, puis échange.';
      renderCards([true,true,true,true,true]); render();
    };
    const ctl=(C.paceDeal||instantDeal)(5,k=>{ hand.push(dealt[k]); renderCards(); },finish);
    dealCtl=phase==='dealing'?ctl:null; // déjà revenu à 'dealt' si la main s'est faite d'un coup (mouvement réduit)
  }
  function draw(){
    if(phase!=='dealt') return;
    const wasHeld=held.slice(), idxs=[];
    for(let i=0;i<5;i++){ if(!held[i]) idxs.push(i); }
    const fresh=idxs.map(()=>deck.pop());
    // L'échange est tiré d'un coup (et évalué) ; seuls l'affichage — cartes remplacées une à une — et l'annonce du
    // gain sont étalés dans le temps. Mise, mode essai et main finale sont figés ici.
    const finalHand=hand.slice(); idxs.forEach((i,k)=>{ finalHand[i]=fresh[k]; });
    const res=evaluateHand(finalHand), stake=bet, isDemo=demoMode, win=res.mult>0?stake*res.mult:0;
    phase='drawing'; render();
    let settled=false;
    const settle=()=>{
      if(settled) return; settled=true; pendingSettle=null; tableEl.classList.remove('dealing');
      if(dealCtl){ dealCtl.cancel(); dealCtl=null; }
      hand=finalHand;
      if(isDemo) demoBalance+=win; else { C.state.balance+=win; C.saveBalance(); C.renderBalance(); }
      if(isDemo) demoBalEl.textContent=demoBalance;
      phase='idle'; held=[false,false,false,false,false];
      renderCards(wasHeld.map(h=>!h)); render(); highlightPaytable(res.mult);
      cardsEl.classList.remove('vp-win'); void cardsEl.offsetWidth;
      if(win>0){ msg.textContent=res.name+' ! +'+win+' jetons'+(isDemo?' (essai)':''); cardsEl.classList.add('vp-win'); C.flashWin(msg); }
      else { msg.textContent=res.name+(isDemo?' (essai).':'.'); C.flashLoss(cardsEl); }
      // Pas de recordGame en partie d'essai : stats, historique, missions et VIP ne doivent
      // refléter que les vraies parties, jamais l'entraînement.
      if(!isDemo) C.recordGame('videopoker', stake, win);
    };
    pendingSettle=settle;
    if(!idxs.length){ settle(); return; } // tout gardé : rien à distribuer
    msg.textContent='Distribution des cartes… (clique sur la table pour accélérer)';
    tableEl.classList.add('dealing');
    const ctl=(C.paceDeal||instantDeal)(idxs.length,k=>{ hand[idxs[k]]=fresh[k]; renderCards(); },settle);
    dealCtl=settled?null:ctl; // déjà réglé si l'échange s'est fait d'un coup (mouvement réduit)
  }
  dealBtn.addEventListener('click',()=>{ phase==='dealt'?draw():deal(); });
  // Pendant la distribution lente, un clic sur la table (ou Espace / Entrée) la termine tout de suite.
  tableEl.addEventListener('click',()=>{ if(dealCtl) dealCtl.skip(); });
  document.addEventListener('keydown',e=>{
    if(!dealCtl||(e.code!=='Space'&&e.key!=='Enter')||e.ctrlKey||e.altKey||e.metaKey||e.shiftKey) return;
    if(!document.getElementById('view-videopoker').classList.contains('active')) return;
    // Décalé d'un tour : le raccourci « Espace = Distribuer / Échanger » (shortcuts.js) traite le même appui juste
    // après, et le bouton redevient actif dès la fin de la distribution — il lancerait aussitôt l'échange.
    e.preventDefault(); const ctl=dealCtl; setTimeout(()=>ctl.skip(),0);
  });
  renderCards(); render();
})();
