/* ============================================================
   BACCARAT
   ============================================================ */
(function(){
  const C=window.Casino;
  let bet=25, selected=null;
  const betEl=document.getElementById('bc-betAmount'), msg=document.getElementById('bc-message'), dealBtn=document.getElementById('bc-dealBtn');
  const bankerCardsEl=document.getElementById('bc-bankerCards'), playerCardsEl=document.getElementById('bc-playerCards');
  const bankerScoreEl=document.getElementById('bc-bankerScore'), playerScoreEl=document.getElementById('bc-playerScore');
  const bankerZoneEl=bankerCardsEl.closest('.zone'), playerZoneEl=playerCardsEl.closest('.zone');
  const panelEl=document.querySelector('#view-baccarat .panel');
  document.querySelectorAll('#view-baccarat .roulette-grid button').forEach(b=>{
    b.addEventListener('click',()=>{ document.querySelectorAll('#view-baccarat .roulette-grid button').forEach(x=>x.classList.remove('sel')); b.classList.add('sel'); selected=b.dataset.bet; });
  });
  function bacVal(c){ if(c.r==='A') return 1; if(['10','J','Q','K'].includes(c.r)) return 0; return parseInt(c.r,10); }
  function bacTotal(cards){ return cards.reduce((s,c)=>s+bacVal(c),0)%10; }
  function bankerDraws(bTotal,p3){
    if(p3===null) return bTotal<=5;
    if(bTotal<=2) return true;
    if(bTotal===3) return p3!==8;
    if(bTotal===4) return p3>=2&&p3<=7;
    if(bTotal===5) return p3>=4&&p3<=7;
    if(bTotal===6) return p3===6||p3===7;
    return false;
  }
  function render(){ betEl.textContent=bet; dealBtn.disabled=C.state.balance<bet; }
  document.getElementById('bc-betMinus').addEventListener('click',()=>{bet=Math.max(5,bet-5);render();});
  document.getElementById('bc-betPlus').addEventListener('click',()=>{bet=Math.min(200,bet+5);render();});
  document.addEventListener('balance-changed',render);
  // ---- Logique d'une manche, extraite telle quelle (mêmes règles de tirage, mêmes gains) pour
  // pouvoir être réutilisée par le salon multijoueur (js/friends.js) : C.baccarat.deal / payout. ----
  function dealRound(){
    const deck=C.newDeck();
    const player=[deck.pop(),deck.pop()], banker=[deck.pop(),deck.pop()];
    C.sound&&C.sound('card');
    let pTotal=bacTotal(player), bTotal=bacTotal(banker), p3Val=null, playerDrew=false;
    if(pTotal<8 && bTotal<8){
      if(pTotal<=5){ const c=deck.pop(); player.push(c); p3Val=bacVal(c); pTotal=bacTotal(player); playerDrew=true; C.sound&&C.sound('card'); }
      if(bankerDraws(bTotal, playerDrew?p3Val:null)){ banker.push(deck.pop()); bTotal=bacTotal(banker); C.sound&&C.sound('card'); }
    }
    const outcome=pTotal>bTotal?'player':(bTotal>pTotal?'banker':'tie');
    return {player,banker,pTotal,bTotal,outcome};
  }
  function payout(sel,stake,outcome){
    let win=0;
    if(sel==='tie'){ win=outcome==='tie'?stake*9:0; }
    else if(sel===outcome){ win=sel==='banker'?(stake+Math.floor(stake*0.95)):stake*2; }
    else if(outcome==='tie'){ win=stake; }
    return win;
  }
  C.baccarat={deal:dealRound, payout};

  // ---- Joueurs IA à la table : parient chacun sur un camp avec la même mise que toi, sur le papier
  // uniquement (aucun jeton réel, aucun effet sur tes gains). Léa mise sur le Banker (meilleure
  // espérance), Marco sur le Player, Victor tire au sort (avec un peu de Tie). ----
  const AI_SEATS=[
    {name:'Léa',icon:'🦊',pick:()=>'banker'},
    {name:'Marco',icon:'🎩',pick:()=>'player'},
    {name:'Victor',icon:'🐺',pick:()=>{ const r=Math.random(); return r<0.45?'banker':(r<0.9?'player':'tie'); }}
  ];
  const SIDE_LABEL={player:'Player',banker:'Banker',tie:'Tie'};
  const aiEl=document.getElementById('bc-aiSeats');
  function renderAi(outcome,stake){
    if(!aiEl) return;
    aiEl.innerHTML='';
    AI_SEATS.forEach(s=>{
      const seat=document.createElement('div'); seat.className='bc-ai-seat';
      let txt='En attente';
      if(outcome){
        const side=s.pick(), win=payout(side,stake,outcome), net=win-stake;
        txt=SIDE_LABEL[side]+' · '+(net>0?'+'+net:(net<0?String(net):'0'));
        if(net!==0) seat.classList.add(net>0?'ai-win':'ai-loss');
      }
      seat.innerHTML='<span class="ai-name">'+C.avatars.html(s.name,26)+s.name+'</span><span class="ai-res">'+txt+'</span>';
      aiEl.appendChild(seat);
    });
  }
  renderAi(null,0);

  dealBtn.addEventListener('click',()=>{
    if(!selected){ msg.textContent='Choisis Player, Banker ou Tie.'; return; }
    if(C.state.balance<bet){ msg.textContent='Solde insuffisant.'; return; }
    C.state.balance-=bet; C.trackWager(bet); C.saveBalance(); C.renderBalance();
    const {player,banker,pTotal,bTotal,outcome}=dealRound();
    bankerCardsEl.innerHTML=''; banker.forEach(c=>bankerCardsEl.appendChild(C.renderCard(c,false)));
    playerCardsEl.innerHTML=''; player.forEach(c=>playerCardsEl.appendChild(C.renderCard(c,false)));
    bankerScoreEl.textContent=bTotal; playerScoreEl.textContent=pTotal;
    const win=payout(selected,bet,outcome);
    renderAi(outcome,bet);
    msg.textContent = win>0 ? ((outcome==='tie'&&selected!=='tie')?'Égalité — mise remboursée':'Gagné ! +'+win+' jetons') : (outcome+' gagne — perdu');
    // Animation signature : la main gagnante (Player/Banker) est surlignée d'un liseré doré ; perte = assombrissement discret.
    bankerZoneEl.classList.remove('zone-win'); playerZoneEl.classList.remove('zone-win');
    if(outcome==='banker') bankerZoneEl.classList.add('zone-win');
    else if(outcome==='player') playerZoneEl.classList.add('zone-win');
    if(win===0) C.flashLoss(panelEl);
    C.state.balance+=win; C.saveBalance(); C.renderBalance();
    C.recordGame('baccarat', bet, win); if(win>0) C.flashWin(msg);
    render();
  });
  render();
})();
