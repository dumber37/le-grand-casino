/* ============================================================
   BACCARAT
   ============================================================ */
(function(){
  const C=window.Casino;
  let bet=25, selected=null;
  // Side-bets "Paire Parfaite" : mises optionnelles additives (10 jetons fixe, 11:1 si les 2
  // premières cartes du camp choisi forment une paire de même rang) — n'affecte jamais la
  // logique Player/Banker/Tie ci-dessous (dealRound/payout restent inchangés).
  const SIDE_COST=10, SIDE_MULT=11;
  let sidePlayer=false, sideBanker=false;
  const sidePlayerBtn=document.getElementById('bc-sidePlayer'), sideBankerBtn=document.getElementById('bc-sideBanker');
  sidePlayerBtn&&sidePlayerBtn.addEventListener('click',()=>{ sidePlayer=!sidePlayer; sidePlayerBtn.classList.toggle('sel',sidePlayer); render(); });
  sideBankerBtn&&sideBankerBtn.addEventListener('click',()=>{ sideBanker=!sideBanker; sideBankerBtn.classList.toggle('sel',sideBanker); render(); });
  function isPair(hand){ return hand[0].r===hand[1].r; }
  const betEl=document.getElementById('bc-betAmount'), msg=document.getElementById('bc-message'), dealBtn=document.getElementById('bc-dealBtn');
  const bankerCardsEl=document.getElementById('bc-bankerCards'), playerCardsEl=document.getElementById('bc-playerCards');
  const bankerScoreEl=document.getElementById('bc-bankerScore'), playerScoreEl=document.getElementById('bc-playerScore');
  const bankerZoneEl=bankerCardsEl.closest('.zone'), playerZoneEl=playerCardsEl.closest('.zone');
  const panelEl=document.querySelector('#view-baccarat .panel');
  document.querySelectorAll('#bc-mainBets button').forEach(b=>{
    b.addEventListener('click',()=>{ document.querySelectorAll('#bc-mainBets button').forEach(x=>x.classList.remove('sel')); b.classList.add('sel'); selected=b.dataset.bet; });
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
  function sideCost(){ return (sidePlayer?SIDE_COST:0)+(sideBanker?SIDE_COST:0); }
  function render(){ betEl.textContent=bet; dealBtn.disabled=C.state.balance<(bet+sideCost()); }
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
    const totalBet=bet+sideCost();
    if(C.state.balance<totalBet){ msg.textContent='Solde insuffisant.'; return; }
    C.state.balance-=totalBet; C.trackWager(totalBet); C.saveBalance(); C.renderBalance();
    const {player,banker,pTotal,bTotal,outcome}=dealRound();
    bankerCardsEl.innerHTML=''; banker.forEach(c=>bankerCardsEl.appendChild(C.renderCard(c,false)));
    playerCardsEl.innerHTML=''; player.forEach(c=>playerCardsEl.appendChild(C.renderCard(c,false)));
    bankerScoreEl.textContent=bTotal; playerScoreEl.textContent=pTotal;
    const win=payout(selected,bet,outcome);
    let sideWin=0, sideMsg='';
    if(sidePlayer){ if(isPair(player)){ sideWin+=SIDE_COST*SIDE_MULT; sideMsg+=' · Paire Joueur +'+(SIDE_COST*SIDE_MULT); } }
    if(sideBanker){ if(isPair(banker)){ sideWin+=SIDE_COST*SIDE_MULT; sideMsg+=' · Paire Banquier +'+(SIDE_COST*SIDE_MULT); } }
    const totalWin=win+sideWin;
    renderAi(outcome,bet);
    msg.textContent = (win>0 ? ((outcome==='tie'&&selected!=='tie')?'Égalité — mise remboursée':'Gagné ! +'+win+' jetons') : (outcome+' gagne — perdu')) + sideMsg;
    // Animation signature : la main gagnante (Player/Banker) est surlignée d'un liseré doré ; perte = assombrissement discret.
    bankerZoneEl.classList.remove('zone-win'); playerZoneEl.classList.remove('zone-win');
    if(outcome==='banker') bankerZoneEl.classList.add('zone-win');
    else if(outcome==='player') playerZoneEl.classList.add('zone-win');
    if(totalWin===0) C.flashLoss(panelEl);
    C.state.balance+=totalWin; C.saveBalance(); C.renderBalance();
    C.recordGame('baccarat', totalBet, totalWin); if(totalWin>0) C.flashWin(msg);
    render();
  });
  render();
})();
