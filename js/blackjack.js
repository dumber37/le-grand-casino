/* ============================================================
   BLACKJACK
   ============================================================ */
(function(){
  const C=window.Casino;
  let bet=0, deck=[], hands=[], dealerHand=[], currentIdx=0, inRound=false, hasSplit=false;
  // Distribution lente (C.paceDeal, deal-anim.js) : `shown` = cartes déjà posées pour chaque place pendant
  // la donne ({me, ai:[…], dealer}), null le reste du temps (tout est alors visible) ; `dealCtl` permet
  // d'accélérer. La donne est tirée d'un coup comme avant : seul l'affichage est étalé dans le temps.
  let shown=null, dealCtl=null;
  // Fin de manche étalée (voir finishFlow) : le résultat n'est réglé qu'à la fin ; endCtl sert à la régler tout de suite
  // si on quitte la page entre-temps (la mise est déjà prise, le gain ne doit pas se perdre).
  let endCtl=null;
  const instantDeal=(n,onCard,onDone)=>{ onDone(); return {skip(){},cancel(){}}; }; // repli si deal-anim.js manque : tout d'un coup
  const betEl=document.getElementById('bj-betAmount'), msg=document.getElementById('bj-message');
  const dealerCardsEl=document.getElementById('bj-dealerCards'), dealerScoreEl=document.getElementById('bj-dealerScore');
  const playerZonesEl=document.getElementById('bj-playerZones'), tableEl=document.querySelector('#bj-solo .bj-table');
  const dealBtn=document.getElementById('bj-dealBtn'), hitBtn=document.getElementById('bj-hitBtn'), standBtn=document.getElementById('bj-standBtn');
  const doubleBtn=document.getElementById('bj-doubleBtn'), splitBtn=document.getElementById('bj-splitBtn');
  function cardValue(c){ if(c.r==='A') return 11; if(['J','Q','K'].includes(c.r)) return 10; return parseInt(c.r,10); }
  // Score + "main souple" (un as encore compté 11) en un seul passage — seule implémentation de
  // ce calcul dans ce fichier, réutilisée par handScore ci-dessous ET par la règle de décision
  // de tirage IA (bjRules.aiShouldHit) : avant, les deux avaient chacune leur propre copie.
  function scoreInfo(cards){ let s=cards.reduce((a,c)=>a+cardValue(c),0), aces=cards.filter(c=>c.r==='A').length; while(s>21&&aces>0){s-=10;aces--;} return {score:s,soft:aces>0}; }
  function handScore(cards){ return scoreInfo(cards).score; }
  // Règles exposées telles quelles (mêmes calculs que le solo) pour le Blackjack multijoueur —
  // aucune règle dupliquée : js/multi-blackjack.js appelle exactement ce code.
  function payoutFor(pCards,dCards,betAmt,doubled){
    const p=handScore(pCards), d=handScore(dCards), dealerBJ=d===21&&dCards.length===2;
    const naturalBJ=p===21&&pCards.length===2&&!doubled;
    if(p>21) return {win:0,cls:'hand-loss',label:'perdu'};
    if(naturalBJ){ if(dealerBJ) return {win:betAmt,cls:null,label:'égalité'}; const w=Math.round(betAmt*2.5); return {win:w,cls:'hand-blackjack',label:'blackjack ! +'+w}; }
    if(d>21||p>d){ const w=betAmt*2; return {win:w,cls:'hand-win',label:'gagné +'+w}; }
    if(p===d) return {win:betAmt,cls:null,label:'égalité'};
    return {win:0,cls:'hand-loss',label:'perdu'};
  }
  C.bjRules={cardValue,handScore,payoutFor,dealerShouldHit:h=>handScore(h)<17,aiShouldHit:(cards,dealerUp,risky)=>{
    const {score:s,soft}=scoreInfo(cards), up=cardValue(dealerUp);
    if(s>=21) return false;
    if(risky) return s<=16||(soft&&s<=17);
    if(soft) return s<=17||(s===18&&up>=9);
    if(s<=11) return true;
    if(s===12) return !(up>=4&&up<=6);
    if(s<=16) return up>=7;
    return false;
  }};

  // ---- Joueurs IA à la table : jouent leur main depuis la même pioche, contre le même croupier.
  // Purement décoratifs pour le solde : aucune mise réelle, aucun effet sur tes gains ni sur les
  // règles. Léa suit la stratégie de base ; Marco est plus téméraire (tire jusqu'à 16). ----
  const AI_SEATS=[{name:'Léa',icon:'🦊',risky:false},{name:'Marco',icon:'🎩',risky:true}];
  let aiHands=AI_SEATS.map(()=>({cards:[],result:''}));
  const aiSeatsEl=document.getElementById('bj-aiSeats');
  function playAiHands(){
    aiHands.forEach((h,i)=>{ while(h.cards.length&&C.bjRules.aiShouldHit(h.cards,dealerHand[0],AI_SEATS[i].risky)) h.cards.push(deck.pop()); });
  }
  function resolveAi(){
    const d=handScore(dealerHand), dealerBJ=d===21&&dealerHand.length===2;
    aiHands.forEach(h=>{
      if(!h.cards.length){ h.result=''; return; }
      const p=handScore(h.cards), bj=p===21&&h.cards.length===2;
      if(p>21) h.result='Perdu';
      else if(bj&&!dealerBJ) h.result='Blackjack !';
      else if(d>21||p>d) h.result='Gagné';
      else if(p===d) h.result='Égalité';
      else h.result='Perdu';
    });
    renderAi();
  }
  function renderAi(){
    aiSeatsEl.innerHTML='';
    aiHands.forEach((h,i)=>{
      const seat=document.createElement('div');
      const res=h.result;
      const cards=shown?h.cards.slice(0,shown.ai[i]):h.cards;
      seat.className='bj-ai-seat'+(res==='Gagné'||res==='Blackjack !'?' ai-win':(res==='Perdu'?' ai-loss':''));
      const label=document.createElement('div'); label.className='zone-label';
      label.innerHTML='<span>'+C.avatars.html(AI_SEATS[i].name,22)+AI_SEATS[i].name+'</span><span>'+(cards.length?handScore(cards):'')+'</span>';
      const row=document.createElement('div'); row.className='cards';
      cards.forEach(c=>row.appendChild(C.renderCard(c,false)));
      const st=document.createElement('div'); st.className='hand-bet'; st.textContent=res||(cards.length?'En jeu':'En attente');
      seat.appendChild(label); seat.appendChild(row); seat.appendChild(st);
      aiSeatsEl.appendChild(seat);
    });
  }
  function renderTable(revealDealer){
    // Retournement animé de la carte cachée du croupier : si elle est déjà à l'écran (pas de
    // tirage supplémentaire entre-temps), on se contente de retirer sa classe .is-back — la
    // transition CSS sur .card-flip fait le reste (même technique que la pièce de Pile ou
    // Face). Quand le croupier tire ensuite (fin de manche étalée), seule la nouvelle carte est
    // ajoutée, pour ne pas couper ce retournement. Sinon (première distribution, ou le croupier
    // a dû tirer d'un coup), on reconstruit tout comme avant.
    const dCards=shown?dealerHand.slice(0,shown.dealer):dealerHand, have=dealerCardsEl.children.length;
    const holeCardEl=dealerCardsEl.children[1]&&dealerCardsEl.children[1].querySelector('.card-flip.is-back');
    if(revealDealer&&holeCardEl&&have===dCards.length){
      holeCardEl.classList.remove('is-back');
      C.sound&&C.sound('card');
    } else if(revealDealer&&!holeCardEl&&have>=2&&have<dCards.length){
      for(let i=have;i<dCards.length;i++) dealerCardsEl.appendChild(C.renderCard(dCards[i],false,true));
    } else {
      dealerCardsEl.innerHTML='';
      dCards.forEach((c,i)=>dealerCardsEl.appendChild(C.renderCard(c,i===1&&!revealDealer,true)));
    }
    dealerScoreEl.textContent=revealDealer?handScore(dCards):(dCards.length?cardValue(dealerHand[0]):'');
    renderAi();
    playerZonesEl.innerHTML='';
    hands.forEach((h,idx)=>{
      const cards=shown?h.cards.slice(0,shown.me):h.cards;
      const block=document.createElement('div'); block.className='hand-block'+(idx===currentIdx&&inRound&&!shown?' active':'');
      const label=document.createElement('div'); label.className='zone-label';
      label.innerHTML='<span class="zl-me">'+C.avatars.html('Toi',22)+(hasSplit?'Main '+(idx+1):'Toi')+'</span><span>'+(cards.length?handScore(cards):'')+'</span>';
      block.appendChild(label);
      const row=document.createElement('div'); row.className='cards';
      cards.forEach(c=>row.appendChild(C.renderCard(c,false,true)));
      block.appendChild(row);
      const betRow=document.createElement('div'); betRow.className='hand-bet';
      betRow.innerHTML='Mise : '+h.bet+(h.doubled?' (doublée)':'')+' '+(C.chips?C.chips.html(h.bet,{scale:.7,label:false}):'');
      block.appendChild(betRow);
      playerZonesEl.appendChild(block);
    });
  }
  function updateButtons(){
    if(!inRound||shown){ hitBtn.disabled=standBtn.disabled=doubleBtn.disabled=splitBtn.disabled=true; return; }
    const hand=hands[currentIdx]; const first=hand.cards.length===2;
    hitBtn.disabled=false; standBtn.disabled=false;
    doubleBtn.disabled=!(first&&C.state.balance>=hand.bet);
    const canSplit=first&&hands.length===1&&cardValue(hand.cards[0])===cardValue(hand.cards[1])&&C.state.balance>=hand.bet;
    splitBtn.disabled=!canSplit;
  }
  function render(){ betEl.textContent=bet; dealBtn.disabled=inRound||bet<=0||C.state.balance<bet; updateButtons(); }
  document.querySelectorAll('#view-blackjack .chip').forEach(chip=>{
    chip.addEventListener('click',()=>{
      if(inRound) return;
      if(chip.dataset.value==='clear'){ bet=0; render(); return; }
      bet=Math.min(C.state.balance, bet+parseInt(chip.dataset.value,10)); render();
    });
  });
  document.addEventListener('balance-changed',render);
  function deal(){
    if(C.state.balance<bet){msg.textContent='Solde insuffisant.';return;}
    C.state.balance-=bet; C.trackWager(bet); C.saveBalance(); C.renderBalance();
    deck=C.newDeck(); hands=[{cards:[deck.pop(),deck.pop()],bet:bet,done:false,doubled:false}]; dealerHand=[deck.pop(),deck.pop()];
    aiHands=AI_SEATS.map(()=>({cards:[deck.pop(),deck.pop()],result:''}));
    currentIdx=0; hasSplit=false; inRound=true;
    // Le croupier distribue une carte à la fois : 1re carte à chacun (Toi, Léa, Marco, croupier), puis la
    // 2e carte à chacun — ~1 s entre deux cartes. Les boutons d'action restent éteints jusqu'à la fin.
    const order=[]; for(let r=0;r<2;r++){ order.push('me'); AI_SEATS.forEach((_,i)=>order.push(i)); order.push('dealer'); }
    shown={me:0,ai:AI_SEATS.map(()=>0),dealer:0};
    if(C.forgetCards) C.forgetCards(tableEl);
    tableEl.classList.add('dealing');
    renderTable(false); render(); msg.textContent='Distribution des cartes… (clique sur la table pour accélérer)';
    const ctl=(C.paceDeal||instantDeal)(order.length,k=>{
      const who=order[k]; if(who==='me') shown.me++; else if(who==='dealer') shown.dealer++; else shown.ai[who]++;
      renderTable(false);
    },()=>{
      shown=null; dealCtl=null; tableEl.classList.remove('dealing');
      renderTable(false); render(); msg.textContent='À toi de jouer.';
      if(handScore(hands[0].cards)===21){ hands[0].done=true; finishFlow(); }
    });
    dealCtl=shown?ctl:null; // `shown` est déjà revenu à null si la donne s'est faite d'un coup (mouvement réduit)
  }
  function hit(){
    const hand=hands[currentIdx]; hand.cards.push(deck.pop()); C.sound&&C.sound('card');
    const score=handScore(hand.cards);
    // Ajoute juste la nouvelle carte à la main courante plutôt que de tout reconstruire
    // (renderTable rejouerait l'animation de distribution sur TOUTES les mains à chaque tirage,
    // y compris celles qui n'ont pas bougé — inutile et visuellement faux en cas de split).
    const block=playerZonesEl.children[currentIdx];
    if(block){
      block.querySelector('.cards').appendChild(C.renderCard(hand.cards[hand.cards.length-1],false,true));
      // lastElementChild (pas un sélecteur "span:last-child") : l'avatar dans .zl-me contient
      // lui-même un <span> qui serait sinon pris pour le score (premier span "dernier de son
      // propre parent" rencontré dans le document, avant le vrai span du score).
      block.querySelector('.zone-label').lastElementChild.textContent=score;
    } else { renderTable(false); }
    render();
    if(score>=21){ hand.done=true; finishFlow(); }
  }
  function stand(){ hands[currentIdx].done=true; finishFlow(); }
  function doubleDown(){
    const hand=hands[currentIdx]; C.state.balance-=hand.bet; C.trackWager(hand.bet); hand.bet*=2; hand.doubled=true; hand.cards.push(deck.pop()); hand.done=true;
    C.sound&&C.sound('card');
    C.saveBalance(); C.renderBalance(); renderTable(false); render(); finishFlow();
  }
  function split(){
    const hand=hands[0]; C.state.balance-=hand.bet; C.trackWager(hand.bet);
    const c2=hand.cards.pop(); hand.cards.push(deck.pop());
    hands.push({cards:[c2,deck.pop()],bet:hand.bet,done:false,doubled:false});
    C.sound&&C.sound('card');
    hasSplit=true; C.saveBalance(); C.renderBalance(); renderTable(false); render(); msg.textContent='Mains séparées. Joue la main 1.';
  }
  function finishFlow(){
    if(currentIdx+1<hands.length){ currentIdx++; renderTable(false); render(); msg.textContent=hasSplit?'Joue la main '+(currentIdx+1)+'.':''; return; }
    // Fin de manche : les joueurs IA puis le croupier jouent. Tout est tiré d'un coup, dans le même ordre de pioche qu'avant ;
    // seul l'AFFICHAGE est étalé (cartes des IA, retournement de la carte cachée, tirages du croupier, un peu plus vif que la
    // donne) et le résultat n'est réglé qu'une fois la dernière carte posée — tout de suite si on clique ou si on quitte la page.
    const aiBefore=aiHands.map(h=>h.cards.length);
    playAiHands();
    const anyAlive=hands.some(h=>handScore(h.cards)<=21)||aiHands.some(h=>h.cards.length&&handScore(h.cards)<=21);
    if(anyAlive){ while(handScore(dealerHand)<17) dealerHand.push(deck.pop()); }
    const seq=[]; aiHands.forEach((h,i)=>{ for(let n=aiBefore[i];n<h.cards.length;n++) seq.push(i); });
    if(!seq.length&&dealerHand.length===2){ inRound=false; renderTable(true); resolve(); return; } // rien d'autre à montrer que la carte cachée
    seq.push('hole'); for(let n=2;n<dealerHand.length;n++) seq.push('dealer');
    shown={me:99,ai:aiBefore.slice(),dealer:2};
    tableEl.classList.add('dealing');
    renderTable(false); render(); msg.textContent='Le croupier joue… (clique sur la table pour accélérer)';
    const gap=C.DEAL_STEP_MS>0?Math.max(350,Math.round(C.DEAL_STEP_MS*0.6)):0;
    let atOnce=true; // vrai tant que paceDeal n'est pas revenu : onDone appelé dans ce laps de temps = tout s'est fait d'un coup
    const ctl=(C.paceDeal||instantDeal)(seq.length,k=>{
      const who=seq[k];
      if(who==='dealer') shown.dealer++; else if(who!=='hole') shown.ai[who]++;
      renderTable(who==='hole'||who==='dealer');
    },()=>{
      shown=null; dealCtl=endCtl=null; tableEl.classList.remove('dealing');
      if(atOnce&&seq.length>1&&C.sound) C.sound('card'); // vitesse « Instantanée » / mouvement réduit : un seul bruit de cartes
      inRound=false; renderTable(true); resolve();
    },{gap,lead:450});
    atOnce=false;
    dealCtl=endCtl=shown?ctl:null; // `shown` est déjà revenu à null si tout s'est fait d'un coup
  }
  function resolve(){
    resolveAi();
    const d=handScore(dealerHand); const dealerBJ=d===21&&dealerHand.length===2;
    let totalWin=0; const msgs=[]; const handClasses=[];
    hands.forEach((h,idx)=>{
      const p=handScore(h.cards); const naturalBJ=p===21&&h.cards.length===2&&!hasSplit&&!h.doubled;
      const tag=hasSplit?'Main '+(idx+1)+': ':''; let win=0; let cls=null;
      if(p>21){ msgs.push(tag+'perdu'); cls='hand-loss'; }
      else if(naturalBJ){ if(dealerBJ){win=h.bet;msgs.push(tag+'égalité');} else {win=Math.round(h.bet*2.5);msgs.push(tag+'blackjack ! +'+win); cls='hand-blackjack';} }
      else if(d>21){ win=h.bet*2; msgs.push(tag+'gagné +'+win); cls='hand-win'; }
      else if(p>d){ win=h.bet*2; msgs.push(tag+'gagné +'+win); cls='hand-win'; }
      else if(p===d){ win=h.bet; msgs.push(tag+'égalité'); }
      else { msgs.push(tag+'perdu'); cls='hand-loss'; }
      totalWin+=win; handClasses.push(cls);
    });
    C.state.balance+=totalWin; C.saveBalance(); C.renderBalance(); msg.textContent=msgs.join(' · ');
    const totalBet=hands.reduce((s,h)=>s+h.bet,0);
    C.recordGame('blackjack', totalBet, totalWin); if(totalWin>0) C.flashWin(msg);
    // Animation signature : mains gagnantes surélevées avec halo doré (flourish plus fort sur un blackjack naturel), pertes assombries.
    Array.from(playerZonesEl.children).forEach((block,idx)=>{ if(handClasses[idx]) block.classList.add(handClasses[idx]); });
  }
  renderAi();
  // Pendant la distribution lente, un clic sur la table (ou Espace / Entrée) la termine tout de suite.
  tableEl.addEventListener('click',()=>{ if(dealCtl) dealCtl.skip(); });
  if(C.onPageLeave) C.onPageLeave(()=>{ if(endCtl) endCtl.skip(); });
  document.addEventListener('keydown',e=>{
    if(!dealCtl||(e.code!=='Space'&&e.key!=='Enter')||e.ctrlKey||e.altKey||e.metaKey||e.shiftKey) return;
    if(!document.getElementById('view-blackjack').classList.contains('active')) return;
    // Décalé d'un tour : le raccourci « Espace = Distribuer » (shortcuts.js) traite le même appui juste après ;
    // sur un blackjack naturel la manche se termine tout de suite et le bouton redeviendrait actif.
    e.preventDefault(); const ctl=dealCtl; setTimeout(()=>ctl.skip(),0);
  });
  dealBtn.addEventListener('click',deal); hitBtn.addEventListener('click',hit); standBtn.addEventListener('click',stand);
  doubleBtn.addEventListener('click',doubleDown); splitBtn.addEventListener('click',split);
  render();
})();
