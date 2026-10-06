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
  const panelEl=document.querySelector('#view-baccarat .panel'), tableEl=document.querySelector('#view-baccarat .bj-table');
  // Distribution lente (C.paceDeal, deal-anim.js) : comme à une vraie table, le croupier pose UNE carte à la
  // fois — Player, Banker, Player, Banker, puis les éventuelles 3es cartes — ~1 s entre deux cartes. La manche
  // est tirée d'un coup (dealRound, inchangé) ; seul l'affichage est étalé, et le résultat (gain, message, solde)
  // n'apparaît qu'après la dernière carte. dealing bloque une nouvelle donne ; pendingSettle règle la manche
  // tout de suite si l'onglet se ferme en pleine distribution (le gain n'est jamais perdu).
  let dealing=false, dealCtl=null, pendingSettle=null;
  const instantDeal=(n,onCard,onDone)=>{ onDone(); return {skip(){},cancel(){}}; }; // repli si deal-anim.js manque : tout d'un coup
  C.onPageLeave(()=>{ if(pendingSettle) pendingSettle(); });
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
  function render(){ betEl.textContent=bet; dealBtn.disabled=dealing||C.state.balance<(bet+sideCost()); }
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
  C.baccarat={deal:dealRound, payout, total:bacTotal};

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
    if(dealing) return;
    if(!selected){ msg.textContent='Choisis Player, Banker ou Tie.'; return; }
    const totalBet=bet+sideCost();
    if(C.state.balance<totalBet){ msg.textContent='Solde insuffisant.'; return; }
    C.state.balance-=totalBet; C.trackWager(totalBet); C.saveBalance(); C.renderBalance();
    // Tout ce dont le règlement a besoin est figé ici : pendant la distribution, mise, camp et paires restent
    // modifiables à l'écran sans jamais toucher à la manche en cours.
    const stake=bet, pick=selected, sideP=sidePlayer, sideB=sideBanker;
    const {player,banker,pTotal,bTotal,outcome}=dealRound();
    // Ordre de la table : Player, Banker, Player, Banker, puis la 3e carte du Player et celle du Banker si elles existent.
    const order=['p','b','p','b']; if(player.length>2) order.push('p'); if(banker.length>2) order.push('b');
    const shownP=[], shownB=[];
    const show=side=>{
      const hand=side==='p'?player:banker, shown=side==='p'?shownP:shownB, c=hand[shown.length]; if(!c) return;
      shown.push(c);
      (side==='p'?playerCardsEl:bankerCardsEl).appendChild(C.renderCard(c,false));
      (side==='p'?playerScoreEl:bankerScoreEl).textContent=bacTotal(shown);
    };
    const settle=()=>{
      if(!dealing) return;
      dealing=false; pendingSettle=null; tableEl.classList.remove('dealing');
      if(dealCtl){ dealCtl.cancel(); dealCtl=null; }
      while(shownP.length<player.length) show('p'); // distribution accélérée : les cartes restantes arrivent d'un coup
      while(shownB.length<banker.length) show('b');
      bankerScoreEl.textContent=bTotal; playerScoreEl.textContent=pTotal;
      const win=payout(pick,stake,outcome);
      let sideWin=0, sideMsg='';
      if(sideP){ if(isPair(player)){ sideWin+=SIDE_COST*SIDE_MULT; sideMsg+=' · Paire Joueur +'+(SIDE_COST*SIDE_MULT); } }
      if(sideB){ if(isPair(banker)){ sideWin+=SIDE_COST*SIDE_MULT; sideMsg+=' · Paire Banquier +'+(SIDE_COST*SIDE_MULT); } }
      const totalWin=win+sideWin;
      renderAi(outcome,stake);
      msg.textContent = (win>0 ? ((outcome==='tie'&&pick!=='tie')?'Égalité — mise remboursée':'Gagné ! +'+win+' jetons') : (outcome+' gagne — perdu')) + sideMsg;
      // Animation signature : la main gagnante (Player/Banker) est surlignée d'un liseré doré ; perte = assombrissement discret.
      bankerZoneEl.classList.remove('zone-win'); playerZoneEl.classList.remove('zone-win');
      if(outcome==='banker') bankerZoneEl.classList.add('zone-win');
      else if(outcome==='player') playerZoneEl.classList.add('zone-win');
      if(totalWin===0) C.flashLoss(panelEl);
      C.state.balance+=totalWin; C.saveBalance(); C.renderBalance();
      C.recordGame('baccarat', totalBet, totalWin); if(totalWin>0) C.flashWin(msg);
      render();
    };
    // Table vidée avant la 1re carte : les cartes de la manche précédente disparaissent, les IA repassent « en attente ».
    bankerCardsEl.innerHTML=''; playerCardsEl.innerHTML=''; bankerScoreEl.textContent=''; playerScoreEl.textContent='';
    bankerZoneEl.classList.remove('zone-win'); playerZoneEl.classList.remove('zone-win');
    renderAi(null,0);
    if(C.forgetCards) C.forgetCards(tableEl);
    dealing=true; pendingSettle=settle; tableEl.classList.add('dealing'); render();
    msg.textContent='Distribution des cartes… (clique sur la table pour accélérer)';
    const ctl=(C.paceDeal||instantDeal)(order.length,k=>show(order[k]),settle);
    dealCtl=dealing?ctl:null; // déjà revenu à false si la manche s'est réglée d'un coup (mouvement réduit)
  });
  // Pendant la distribution lente, un clic sur la table (ou Espace / Entrée) la termine tout de suite.
  tableEl.addEventListener('click',()=>{ if(dealCtl) dealCtl.skip(); });
  document.addEventListener('keydown',e=>{
    if(!dealCtl||(e.code!=='Space'&&e.key!=='Enter')||e.ctrlKey||e.altKey||e.metaKey||e.shiftKey) return;
    if(!document.getElementById('view-baccarat').classList.contains('active')) return;
    // Décalé d'un tour : le raccourci « Espace = Distribuer » (shortcuts.js) traite le même appui juste après,
    // et le bouton redevient actif dès la fin de la distribution — il relancerait aussitôt une manche.
    e.preventDefault(); const ctl=dealCtl; setTimeout(()=>ctl.skip(),0);
  });
  render();
})();
