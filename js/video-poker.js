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
  // ---- Partie d'essai : jetons fictifs, séparés du solde réel (jamais lu ni modifié tant
  // qu'elle est active). Aucun recordGame en démo : stats/historique/missions/VIP restent
  // intacts, exactement comme si la partie n'avait jamais eu lieu. ----
  let demoMode=false, demoBalance=500;
  const bal=()=>demoMode?demoBalance:C.state.balance;
  function toggleDemo(){
    if(phase==='dealt') return; // pas de bascule en pleine main, pour éviter toute confusion
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

  function renderCards(){
    cardsEl.innerHTML='';
    if(!hand.length){
      for(let i=0;i<5;i++){ const ph=document.createElement('div'); ph.className='vp-slot vp-empty'; cardsEl.appendChild(ph); }
      return;
    }
    hand.forEach((c,i)=>{
      const slot=document.createElement('div'); slot.className='vp-slot'+(held[i]?' vp-held':'');
      slot.appendChild(C.renderCard(c,false,true));
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
  }
  function highlightPaytable(mult){
    Array.from(paytableEl.children).forEach(row=>row.classList.toggle('vp-hit', mult>0 && parseInt(row.dataset.mult,10)===mult));
  }
  function render(){
    betEl.textContent=bet;
    dealBtn.textContent=phase==='dealt'?'ÉCHANGER':'DISTRIBUER';
    dealBtn.disabled=phase==='idle'&&(bet<=0||bal()<bet);
    betMinus.disabled=betPlus.disabled=(phase==='dealt');
    demoBtn.disabled=phase==='dealt';
  }
  betMinus.addEventListener('click',()=>{ if(phase==='idle'){ bet=Math.max(minBet,bet-betStep); render(); } });
  betPlus.addEventListener('click',()=>{ if(phase==='idle'){ bet=Math.min(maxBet,bet+betStep); render(); } });
  document.addEventListener('balance-changed',render);

  function deal(){
    if(bal()<bet){ msg.textContent='Solde insuffisant.'; return; }
    if(demoMode){ demoBalance-=bet; demoBalEl.textContent=demoBalance; } else { C.state.balance-=bet; C.trackWager(bet); C.saveBalance(); C.renderBalance(); }
    deck=C.newDeck(); hand=[deck.pop(),deck.pop(),deck.pop(),deck.pop(),deck.pop()]; held=[false,false,false,false,false];
    C.sound&&C.sound('card');
    phase='dealt';
    cardsEl.classList.remove('vp-win'); highlightPaytable(-1);
    msg.textContent='Choisis les cartes à garder, puis échange.';
    renderCards(); render();
  }
  function draw(){
    for(let i=0;i<5;i++){ if(!held[i]) hand[i]=deck.pop(); }
    C.sound&&C.sound('card');
    const res=evaluateHand(hand);
    const win=res.mult>0?bet*res.mult:0;
    if(demoMode) demoBalance+=win; else { C.state.balance+=win; C.saveBalance(); C.renderBalance(); }
    if(demoMode) demoBalEl.textContent=demoBalance;
    phase='idle'; held=[false,false,false,false,false];
    renderCards(); render(); highlightPaytable(res.mult);
    cardsEl.classList.remove('vp-win'); void cardsEl.offsetWidth;
    if(win>0){ msg.textContent=res.name+' ! +'+win+' jetons'+(demoMode?' (essai)':''); cardsEl.classList.add('vp-win'); C.flashWin(msg); }
    else { msg.textContent=res.name+(demoMode?' (essai).':'.'); C.flashLoss(cardsEl); }
    // Pas de recordGame en partie d'essai : stats, historique, missions et VIP ne doivent
    // refléter que les vraies parties, jamais l'entraînement.
    if(!demoMode) C.recordGame('videopoker', bet, win);
  }
  dealBtn.addEventListener('click',()=>{ phase==='dealt'?draw():deal(); });
  renderCards(); render();
})();
