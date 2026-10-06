/* ============================================================
   BATAILLE (WAR) — une carte chacun, la plus haute gagne. Égalité :
   une "guerre", une carte de plus chacun (gain plus élevé). Nouvelle
   égalité sur la guerre : mise remboursée (pas de récursion infinie).
   ============================================================ */
(function(){
  const C=window.Casino;
  let bet=20, active=false;
  const betEl=document.getElementById('wr-betAmount'), msg=document.getElementById('wr-message');
  const playBtn=document.getElementById('wr-playBtn');
  const betMinus=document.getElementById('wr-betMinus'), betPlus=document.getElementById('wr-betPlus');
  const playerEl=document.getElementById('wr-playerCard'), dealerEl=document.getElementById('wr-dealerCard');
  const tableEl=document.querySelector('#view-war .bj-table');
  // Distribution lente : voir playRound. pendingSettle règle la manche tout de suite si l'onglet se ferme en pleine
  // distribution (le gain n'est jamais perdu) ; instantDeal = repli si deal-anim.js manque (tout d'un coup).
  let dealCtl=null, pendingSettle=null;
  const instantDeal=(n,onCard,onDone)=>{ onDone(); return {skip(){},cancel(){}}; };
  C.onPageLeave(()=>{ if(pendingSettle) pendingSettle(); });

  function rankVal(c){ if(c.r==='A') return 14; if(c.r==='K') return 13; if(c.r==='Q') return 12; if(c.r==='J') return 11; return parseInt(c.r,10); }
  function render(){ betEl.textContent=bet; playBtn.disabled=active||C.state.balance<bet; betMinus.disabled=betPlus.disabled=active; }
  betMinus.addEventListener('click',()=>{ if(!active){ bet=Math.max(5,bet-5); render(); } });
  betPlus.addEventListener('click',()=>{ if(!active){ bet=Math.min(100,bet+5); render(); } });
  document.addEventListener('balance-changed',render);
  function showCard(el,card){ el.innerHTML=''; el.appendChild(C.renderCard(card,false,true)); }

  function finish(roundBet,win,message){
    msg.textContent=message;
    C.state.balance+=win; C.saveBalance(); C.renderBalance();
    C.recordGame('war', roundBet, win);
    if(win>roundBet) C.flashWin(msg); else if(win===0) C.flashLoss(tableEl||msg);
    active=false; render();
  }
  function playRound(){
    if(active) return;
    if(C.state.balance<bet){ msg.textContent='Solde insuffisant.'; return; }
    const roundBet=bet;
    active=true; render();
    C.state.balance-=roundBet; C.trackWager(roundBet); C.saveBalance(); C.renderBalance();
    const deck=C.newDeck();
    const p=deck.pop(), d=deck.pop();
    const pv=rankVal(p), dv=rankVal(d);
    // Tout est tiré d'avance (ta carte, celle du croupier et, en cas d'égalité, celles de la guerre — même ordre de
    // tirage qu'avant) ; le croupier les pose ensuite une à une (C.paceDeal, ~1 s entre deux cartes) : toi, lui,
    // puis, pour la guerre, toi, lui. Le gain n'est annoncé qu'après la dernière carte.
    const seq=[{el:playerEl,card:p},{el:dealerEl,card:d}];
    let win, text;
    if(pv>dv){ win=roundBet*2; text='Tu gagnes ! +'+win+' jetons'; }
    else if(pv<dv){ win=0; text='Perdu — le croupier avait la carte la plus haute.'; }
    else {
      const p2=deck.pop(), d2=deck.pop(), pv2=rankVal(p2), dv2=rankVal(d2);
      seq.push({el:playerEl,card:p2,war:true},{el:dealerEl,card:d2});
      // Guerre gagnée : mise doublée comme une victoire normale (x2). À x3 le retour du jeu montait à ≈ 103 % (avantage au joueur) ; à x2 il est de 100 %.
      if(pv2>dv2){ win=roundBet*2; text='Guerre gagnée ! +'+win+' jetons'; }
      else if(pv2<dv2){ win=0; text='Guerre perdue.'; }
      else { win=roundBet; text='Double égalité — mise remboursée.'; }
    }
    let shown=0, settled=false;
    const show=()=>{ const s=seq[shown++]; if(!s) return; if(s.war) msg.textContent='Égalité — GUERRE ! Une carte de plus chacun...'; showCard(s.el,s.card); };
    const settle=()=>{
      if(settled) return; settled=true; pendingSettle=null; tableEl.classList.remove('dealing');
      if(dealCtl){ dealCtl.cancel(); dealCtl=null; }
      while(shown<seq.length) show(); // distribution accélérée : les cartes restantes arrivent d'un coup
      finish(roundBet,win,text);
    };
    playerEl.innerHTML=''; dealerEl.innerHTML='';
    msg.textContent='Distribution des cartes… (clique sur la table pour accélérer)';
    if(C.forgetCards) C.forgetCards(tableEl);
    pendingSettle=settle; tableEl.classList.add('dealing');
    const ctl=(C.paceDeal||instantDeal)(seq.length,show,settle);
    dealCtl=settled?null:ctl; // déjà réglé si la manche s'est faite d'un coup (mouvement réduit)
  }
  playBtn.addEventListener('click', playRound);
  // Pendant la distribution lente, un clic sur la table (ou Espace / Entrée) la termine tout de suite.
  tableEl.addEventListener('click',()=>{ if(dealCtl) dealCtl.skip(); });
  document.addEventListener('keydown',e=>{
    if(!dealCtl||(e.code!=='Space'&&e.key!=='Enter')||e.ctrlKey||e.altKey||e.metaKey||e.shiftKey) return;
    if(!document.getElementById('view-war').classList.contains('active')) return;
    // Décalé d'un tour : le raccourci « Espace = Jouer » (shortcuts.js) traite le même appui juste après, et le
    // bouton redevient actif dès la fin de la manche — il en relancerait aussitôt une autre.
    e.preventDefault(); const ctl=dealCtl; setTimeout(()=>ctl.skip(),0);
  });
  render();
})();
