/* ============================================================
   HI-LO — la prochaine carte sera-t-elle plus haute ou plus basse ?
   Chaque bonne réponse multiplie le gain par 0,97 / (probabilité réelle
   de gagner), calculée sur les cartes RESTANTES du paquet (as = carte
   la plus haute). Une égalité fait perdre. On peut encaisser après au
   moins une bonne réponse.
   ============================================================ */
(function(){
  const C=window.Casino, $=id=>document.getElementById(id);
  if(!$('hl-card')) return;
  let bet=20, active=false, deck=[], cur=null, mult=1, steps=0;
  const betEl=$('hl-betAmount'), msg=$('hl-message'), cardEl=$('hl-card'), trailEl=$('hl-trail');
  const startBtn=$('hl-startBtn'), hiBtn=$('hl-hiBtn'), loBtn=$('hl-loBtn'), cashBtn=$('hl-cashBtn'), actionsEl=$('hl-actions');
  const multEl=$('hl-mult'), potEl=$('hl-potential'), betMinus=$('hl-betMinus'), betPlus=$('hl-betPlus');
  const tableEl=document.querySelector('#view-hilo .bj-table');
  // Une seule carte par pari : elle est posée tout de suite (le croupier la lance), mais le résultat n'est annoncé
  // qu'après ~1 s (C.paceReveal, deal-anim.js) pour la laisser arriver et se retourner. Les boutons sont éteints
  // (revealing) pendant ce temps ; pendingRun joue le résultat tout de suite si l'onglet se ferme (le gain n'est jamais perdu).
  let revealing=false, revealCtl=null, pendingRun=null;
  const instantReveal=onDone=>{ onDone(); return {skip(){},cancel(){}}; }; // repli si deal-anim.js manque : tout de suite
  window.addEventListener('pagehide',()=>{ if(pendingRun) pendingRun(); });

  const val=c=>c.r==='A'?14:c.r==='K'?13:c.r==='Q'?12:c.r==='J'?11:parseInt(c.r,10);
  function chances(){
    const v=val(cur); let hi=0, lo=0;
    deck.forEach(c=>{ const x=val(c); if(x>v) hi++; else if(x<v) lo++; });
    return {hi:hi/deck.length, lo:lo/deck.length};
  }
  const stepMult=p=>0.97/p;
  function render(){
    betEl.textContent=bet;
    startBtn.disabled=active||C.state.balance<bet;
    betMinus.disabled=betPlus.disabled=active;
    actionsEl.style.display=active?'flex':'none';
    if(active&&revealing){
      hiBtn.disabled=loBtn.disabled=cashBtn.disabled=true; // la carte arrive : on attend le résultat
    } else if(active){
      const p=chances();
      hiBtn.disabled=p.hi===0; loBtn.disabled=p.lo===0;
      hiBtn.innerHTML='▲ Plus haut<small>'+(p.hi?'x'+(mult*stepMult(p.hi)).toFixed(2)+' · '+Math.round(p.hi*100)+' %':'impossible')+'</small>';
      loBtn.innerHTML='▼ Plus bas<small>'+(p.lo?'x'+(mult*stepMult(p.lo)).toFixed(2)+' · '+Math.round(p.lo*100)+' %':'impossible')+'</small>';
      cashBtn.disabled=steps===0;
    }
    multEl.textContent=mult.toFixed(2); potEl.textContent=Math.round(bet*mult);
  }
  betMinus.addEventListener('click',()=>{ if(!active){ bet=Math.max(5,bet-5); render(); } });
  betPlus.addEventListener('click',()=>{ if(!active){ bet=Math.min(100,bet+5); render(); } });
  document.addEventListener('balance-changed',()=>{ if(!active) render(); });

  function showCard(card){ cardEl.innerHTML=''; cardEl.appendChild(C.renderCard(card,false,true)); }
  function addTrail(card){
    const d=document.createElement('span'); d.className='hl-mini'+(['♥','♦'].includes(card.s)?' red':''); d.textContent=card.r+card.s;
    trailEl.appendChild(d); while(trailEl.children.length>10) trailEl.removeChild(trailEl.firstChild);
  }
  function end(win,text){
    active=false;
    C.state.balance+=win; C.saveBalance(); C.renderBalance();
    C.recordGame('hilo',roundBet,win);
    msg.textContent=text;
    if(win>0) C.flashWin(msg); else C.flashLoss(tableEl||msg);
    render();
  }
  let roundBet=0;
  function start(){
    if(active) return;
    if(C.state.balance<bet){ msg.textContent='Solde insuffisant.'; return; }
    roundBet=bet;
    C.state.balance-=roundBet; C.trackWager(roundBet); C.saveBalance(); C.renderBalance();
    deck=C.newDeck(); cur=deck.pop(); mult=1; steps=0; active=true;
    trailEl.innerHTML=''; showCard(cur); C.sound&&C.sound('card');
    msg.textContent='La prochaine carte sera-t-elle plus haute ou plus basse ?';
    render();
  }
  function guess(dir){
    if(!active||revealing) return;
    const p=chances(), pw=dir==='hi'?p.hi:p.lo;
    if(!pw) return;
    const next=deck.pop();
    const ok=dir==='hi'?val(next)>val(cur):val(next)<val(cur);
    addTrail(cur); showCard(next);
    revealing=true; render(); // boutons éteints le temps que la carte arrive
    const outcome=()=>{
      if(!ok){ end(0,(val(next)===val(cur)?'Égalité — ':'')+'Perdu : '+next.r+next.s+'.'); return; }
      mult*=stepMult(pw); steps++; cur=next;
      if(deck.length<2){ const win=Math.round(roundBet*mult); end(win,'Paquet épuisé — encaissé automatiquement : +'+win+' jetons'); return; }
      msg.textContent='Bonne réponse ! Continue ou encaisse.';
      render();
    };
    let ran=false;
    const once=()=>{ if(ran) return; ran=true; pendingRun=null; revealCtl=null; revealing=false; if(tableEl) tableEl.classList.remove('dealing'); outcome(); };
    pendingRun=once; if(tableEl) tableEl.classList.add('dealing');
    const ctl=(C.paceReveal||instantReveal)(once);
    revealCtl=ran?null:ctl;
  }
  function cash(){ if(!active||steps===0||revealing) return; const win=Math.round(roundBet*mult); end(win,'Encaissé ! +'+win+' jetons (x'+mult.toFixed(2)+')'); }
  if(tableEl) tableEl.addEventListener('click',()=>{ if(revealCtl) revealCtl.skip(); }); // un clic sur la table annonce le résultat tout de suite
  startBtn.addEventListener('click',start);
  hiBtn.addEventListener('click',()=>guess('hi'));
  loBtn.addEventListener('click',()=>guess('lo'));
  cashBtn.addEventListener('click',cash);
  render();
})();
