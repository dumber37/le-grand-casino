/* ============================================================
   RIDE THE BUS
   ============================================================ */
(function(){
  const C=window.Casino;
  let bet=15, deck=[], cards=[], active=false, currentBet=0;
  const betEl=document.getElementById('bus-betAmount'), msg=document.getElementById('bus-message');
  const stageEl=document.getElementById('bus-stage'), cardsEl=document.getElementById('bus-cards');
  const multEl=document.getElementById('bus-mult'), startBtn=document.getElementById('bus-startBtn'), actionsEl=document.getElementById('bus-actions');
  const MULTS=[2,3,4,20];
  function rankVal(c){ if(c.r==='A') return 14; if(c.r==='K') return 13; if(c.r==='Q') return 12; if(c.r==='J') return 11; return parseInt(c.r,10); }
  // Règle de chaque étape exposée telle quelle (mêmes conditions que guess1..guess4 ci-dessous) pour
  // le Ride the Bus multijoueur — aucune règle dupliquée : js/multi-bus.js appelle exactement ce code.
  function checkGuess(stage,cards,drawn,guess){
    if(stage===1){ const col=['♥','♦'].includes(drawn.s)?'rouge':'noir'; return {ok:guess===col,detail:col}; }
    if(stage===2){ const pv=rankVal(cards[0]),v=rankVal(drawn); if(v===pv) return {ok:false,tie:true}; const a=v>pv?'haute':'basse'; return {ok:guess===a,detail:a}; }
    if(stage===3){ const v1=rankVal(cards[0]),v2=rankVal(cards[1]),lo=Math.min(v1,v2),hi=Math.max(v1,v2),v=rankVal(drawn); if(v===lo||v===hi) return {ok:false,tie:true}; const a=(v>lo&&v<hi)?'entre':'dehors'; return {ok:guess===a,detail:a}; }
    return {ok:guess===drawn.s};
  }
  C.busRules={MULTS,rankVal,checkGuess};
  function render(){ betEl.textContent=bet; startBtn.disabled=active||C.state.balance<bet; }
  document.getElementById('bus-betMinus').addEventListener('click',()=>{if(!active){bet=Math.max(5,bet-5);render();}});
  document.getElementById('bus-betPlus').addEventListener('click',()=>{if(!active){bet=Math.min(100,bet+5);render();}});
  document.addEventListener('balance-changed',render);
  function renderCards(){ cardsEl.innerHTML=''; cards.forEach(c=>cardsEl.appendChild(C.renderCard(c,false))); for(let i=cards.length;i<4;i++){ const el=document.createElement('div'); el.className='card hidden'; el.textContent='?'; cardsEl.appendChild(el); } }
  function setActions(buttons){ actionsEl.innerHTML=''; actionsEl.style.display='flex'; buttons.forEach(b=>{ const el=document.createElement('button'); el.textContent=b.label; el.addEventListener('click',b.onClick); actionsEl.appendChild(el); }); }
  // ---- Rivaux IA : chacun fait son propre trajet dans le bus (pioche indépendante, mêmes multiplicateurs
  // et mêmes règles que toi) et s'arrête à l'étape de son choix. Ils jouent avec la même mise que toi,
  // sur le papier uniquement : aucun jeton réel, aucun effet sur ton gain. Léa encaisse tôt (étape 2),
  // Victor à l'étape 3, Marco va au bout. ----
  const RIVALS=[{name:'Léa',icon:'🦊',stop:2},{name:'Victor',icon:'🐺',stop:3},{name:'Marco',icon:'🎩',stop:4}];
  const rivalsEl=document.getElementById('bus-rivals');
  const cs=c=>c.r+c.s;
  function simulateRun(stop){
    const dk=C.newDeck(), seen=[];
    const pull=()=>{ const c=dk.pop(); seen.push(cs(c)); return c; };
    const color=c=>['♥','♦'].includes(c.s)?'rouge':'noir';
    const a=pull(); if(color(a)!==(Math.random()<0.5?'rouge':'noir')) return {mult:0,stage:1,seen};
    if(stop===1) return {mult:MULTS[0],stage:1,seen};
    const b=pull(); const va=rankVal(a), vb=rankVal(b);
    if(vb===va||(vb>va)!==(va<=7)) return {mult:0,stage:2,seen};
    if(stop===2) return {mult:MULTS[1],stage:2,seen};
    const lo=Math.min(va,vb), hi=Math.max(va,vb), c=pull(), vc=rankVal(c);
    const guessBetween=hi-lo>=6;
    if(vc===lo||vc===hi||((vc>lo&&vc<hi)!==guessBetween)) return {mult:0,stage:3,seen};
    if(stop===3) return {mult:MULTS[2],stage:3,seen};
    const d=pull(); const suits=['♠','♥','♦','♣'];
    if(d.s!==suits[Math.floor(Math.random()*4)]) return {mult:0,stage:4,seen};
    return {mult:MULTS[3],stage:4,seen};
  }
  function renderRivals(results,humanMult){
    rivalsEl.innerHTML='';
    const best=results?Math.max.apply(null,results.map(r=>r.mult).concat([humanMult])):0;
    RIVALS.forEach((rv,i)=>{
      const r=results?results[i]:null;
      const row=document.createElement('div'); row.className='bus-rival'+(r&&r.mult>0&&r.mult===best?' rival-best':'')+(r&&r.mult===0?' rival-out':'');
      const head=document.createElement('span'); head.className='rival-name'; head.innerHTML=C.avatars.html(rv.name,22)+rv.name;
      const res=document.createElement('span'); res.className='rival-res';
      res.textContent=!r?'prend place...':(r.mult>0?'encaisse x'+r.mult+' (étape '+r.stage+')':'éliminé à l’étape '+r.stage)+' · '+r.seen.join(' ');
      row.appendChild(head); row.appendChild(res); rivalsEl.appendChild(row);
    });
    if(results){
      const line=document.createElement('div'); line.className='rival-summary';
      const winners=[]; if(humanMult>0&&humanMult===best) winners.push('Toi');
      results.forEach((r,i)=>{ if(r.mult>0&&r.mult===best) winners.push(RIVALS[i].name); });
      line.textContent=best>0?'🏆 Meilleur trajet : '+winners.join(', ')+' (x'+best+')':'Personne n’a terminé le trajet.';
      rivalsEl.appendChild(line);
    }
  }
  function endRound(win, text){ active=false; actionsEl.style.display='none'; actionsEl.innerHTML=''; if(win<=0) C.flashLoss(cardsEl); C.state.balance+=win; C.saveBalance(); C.renderBalance(); msg.textContent=text; C.recordGame('bus', currentBet, win); if(win>0) C.flashWin(msg);
    renderRivals(RIVALS.map(rv=>simulateRun(rv.stop)), currentBet>0?win/currentBet:0);
    render(); }
  function renderDots(current, justDoneIdx){
    for(let i=0;i<4;i++){
      const d=document.getElementById('bus-dot'+i); if(!d) continue;
      d.classList.remove('done','current');
      if(i<current) d.classList.add('done'); else if(i===current) d.classList.add('current');
      // Animation signature : chaque étape réussie fait vibrer son point de progression.
      if(justDoneIdx===i){ d.classList.remove('dot-vibrate'); void d.offsetWidth; d.classList.add('dot-vibrate'); }
    }
  }
  function start(){
    if(C.state.balance<bet){ msg.textContent='Solde insuffisant.'; return; }
    C.state.balance-=bet; currentBet=bet; C.trackWager(bet); C.saveBalance(); C.renderBalance();
    deck=C.newDeck(); cards=[]; active=true; renderCards(); render(); msg.textContent=''; renderRivals(null,0);
    renderDots(0);
    stageEl.textContent='Étape 1 : la carte est-elle rouge ou noire ?'; multEl.textContent='Multiplicateur : x1';
    setActions([{label:'Rouge', onClick:()=>guess1('rouge')},{label:'Noir', onClick:()=>guess1('noir')}]);
  }
  function guess1(g){
    const c=deck.pop(); cards.push(c); C.sound&&C.sound('card'); renderCards();
    const col=['♥','♦'].includes(c.s)?'rouge':'noir';
    if(g!==col){ endRound(0, "C'était "+col+'. Perdu.'); return; }
    multEl.textContent='Multiplicateur : x'+MULTS[0]; stageEl.textContent='Étape 2 : plus haute ou plus basse que la précédente ?'; renderDots(1,0);
    setActions([{label:'Plus haute', onClick:()=>guess2('haute')},{label:'Plus basse', onClick:()=>guess2('basse')},{label:'Encaisser (x'+MULTS[0]+')', onClick:()=>endRound(currentBet*MULTS[0], 'Encaissé ! +'+(currentBet*MULTS[0])+' jetons')}]);
  }
  function guess2(g){
    const prev=cards[0]; const c=deck.pop(); cards.push(c); C.sound&&C.sound('card'); renderCards();
    const prevVal=rankVal(prev), val=rankVal(c);
    if(val===prevVal){ endRound(0,'Égalité, perdu.'); return; }
    const actual=val>prevVal?'haute':'basse';
    if(g!==actual){ endRound(0,"C'était plus "+actual+'. Perdu.'); return; }
    multEl.textContent='Multiplicateur : x'+MULTS[1]; stageEl.textContent='Étape 3 : la carte est-elle entre les deux premières ou en dehors ?'; renderDots(2,1);
    setActions([{label:'Entre', onClick:()=>guess3('entre')},{label:'En dehors', onClick:()=>guess3('dehors')},{label:'Encaisser (x'+MULTS[1]+')', onClick:()=>endRound(currentBet*MULTS[1], 'Encaissé ! +'+(currentBet*MULTS[1])+' jetons')}]);
  }
  function guess3(g){
    const v1=rankVal(cards[0]), v2=rankVal(cards[1]); const lo=Math.min(v1,v2), hi=Math.max(v1,v2);
    const c=deck.pop(); cards.push(c); C.sound&&C.sound('card'); renderCards(); const val=rankVal(c);
    if(val===lo||val===hi){ endRound(0,'Égalité, perdu.'); return; }
    const actual=(val>lo&&val<hi)?'entre':'dehors';
    if(g!==actual){ endRound(0,'Elle était '+(actual==='entre'?'entre les deux':'en dehors')+'. Perdu.'); return; }
    multEl.textContent='Multiplicateur : x'+MULTS[2]; stageEl.textContent='Étape 4 : quel est le symbole exact de la dernière carte ?'; renderDots(3,2);
    setActions([{label:'♠', onClick:()=>guess4('♠')},{label:'♥', onClick:()=>guess4('♥')},{label:'♦', onClick:()=>guess4('♦')},{label:'♣', onClick:()=>guess4('♣')},{label:'Encaisser (x'+MULTS[2]+')', onClick:()=>endRound(currentBet*MULTS[2], 'Encaissé ! +'+(currentBet*MULTS[2])+' jetons')}]);
  }
  function guess4(g){
    const c=deck.pop(); cards.push(c); C.sound&&C.sound('card'); renderCards();
    if(g!==c.s){ endRound(0,"C'était "+c.s+'. Perdu au dernier virage.'); return; }
    endRound(currentBet*MULTS[3], 'Bus complet ! +'+(currentBet*MULTS[3])+' jetons'); renderDots(4,3);
  }
  startBtn.addEventListener('click',start);
  render(); renderRivals(null,0);
})();
