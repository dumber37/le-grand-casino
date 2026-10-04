/* ============================================================
   DRAGON TOWER — on monte la tour étage par étage : à chaque étage,
   choisir une case ; un piège (feu) se cache derrière certaines. Chaque
   étage franchi multiplie le gain par 0,97 / (probabilité de passer
   l'étage). On peut encaisser entre deux étages. Trois difficultés :
   plus il y a de pièges par rapport aux cases, plus ça paie.
   ============================================================ */
(function(){
  const C=window.Casino, $=id=>document.getElementById(id);
  const towerEl=$('tw-tower'); if(!towerEl) return;
  // tiles = cases par étage, traps = pièges par étage, floors = nombre d'étages
  const DIFFS={
    facile:   {tiles:4, traps:1, floors:9},
    moyen:    {tiles:3, traps:1, floors:8},
    difficile:{tiles:2, traps:1, floors:6}
  };
  let bet=20, diff='moyen', active=false, floor=0, traps=[], picks=[], roundBet=0;
  const betEl=$('tw-betAmount'), msg=$('tw-message'), startBtn=$('tw-startBtn'), actionsEl=$('tw-actions'), cashBtn=$('tw-cashBtn');
  const multEl=$('tw-mult'), potEl=$('tw-potential'), betMinus=$('tw-betMinus'), betPlus=$('tw-betPlus');
  const diffBtns=document.querySelectorAll('#tw-diff button');

  const pass=()=>{ const d=DIFFS[diff]; return (d.tiles-d.traps)/d.tiles; };
  const multAt=k=>0.97/Math.pow(pass(),k);
  function render(){
    betEl.textContent=bet;
    startBtn.disabled=active||C.state.balance<bet;
    betMinus.disabled=betPlus.disabled=active; diffBtns.forEach(b=>b.disabled=active);
    actionsEl.style.display=active?'flex':'none';
    cashBtn.disabled=!active||floor===0;
    const m=floor>0?multAt(floor):1;
    multEl.textContent=m.toFixed(2); potEl.textContent=Math.round((active?roundBet:bet)*m);
  }
  function build(){
    const d=DIFFS[diff]; towerEl.innerHTML='';
    for(let f=d.floors-1;f>=0;f--){
      const row=document.createElement('div'); row.className='tw-row'; row.dataset.floor=f;
      const lab=document.createElement('span'); lab.className='tw-lab'; lab.textContent='x'+multAt(f+1).toFixed(2); row.appendChild(lab);
      for(let t=0;t<d.tiles;t++){
        const b=document.createElement('button'); b.className='tw-tile'; b.type='button'; b.setAttribute('aria-label','Étage '+(f+1)+', case '+(t+1));
        b.addEventListener('click',()=>choose(f,t)); row.appendChild(b);
      }
      towerEl.appendChild(row);
    }
    mark();
  }
  function mark(){
    towerEl.querySelectorAll('.tw-row').forEach(r=>{
      const f=parseInt(r.dataset.floor,10);
      r.classList.toggle('tw-current',active&&f===floor);
      r.querySelectorAll('.tw-tile').forEach(b=>{ b.disabled=!(active&&f===floor); });
    });
  }
  diffBtns.forEach(b=>b.addEventListener('click',()=>{
    if(active) return;
    diffBtns.forEach(x=>x.classList.remove('sel')); b.classList.add('sel'); diff=b.dataset.diff; build(); render();
  }));
  betMinus.addEventListener('click',()=>{ if(!active){ bet=Math.max(5,bet-5); render(); } });
  betPlus.addEventListener('click',()=>{ if(!active){ bet=Math.min(100,bet+5); render(); } });
  document.addEventListener('balance-changed',()=>{ if(!active) render(); });

  function start(){
    if(active) return;
    if(C.state.balance<bet){ msg.textContent='Solde insuffisant.'; return; }
    roundBet=bet; C.state.balance-=roundBet; C.trackWager(roundBet); C.saveBalance(); C.renderBalance();
    const d=DIFFS[diff]; traps=[]; picks=[];
    for(let f=0;f<d.floors;f++){
      const set=new Set(); while(set.size<d.traps) set.add(Math.floor(Math.random()*d.tiles)); traps.push(set);
    }
    floor=0; active=true; build(); mark();
    msg.textContent='Choisis une case pour franchir le premier étage.'; C.sound&&C.sound('lever'); render();
  }
  function reveal(){
    const d=DIFFS[diff];
    towerEl.querySelectorAll('.tw-row').forEach(r=>{
      const f=parseInt(r.dataset.floor,10);
      r.querySelectorAll('.tw-tile').forEach((b,t)=>{
        if(b.classList.contains('safe')||b.classList.contains('trap')) return;
        const isTrap=traps[f]&&traps[f].has(t);
        b.classList.add('ghost',isTrap?'trap':'safe'); b.textContent=isTrap?'🔥':'🥚';
      });
    });
  }
  function end(win,text,lost){
    active=false; reveal(); mark();
    C.state.balance+=win; C.saveBalance(); C.renderBalance();
    C.recordGame('tower',roundBet,win);
    msg.textContent=text;
    if(win>0) C.flashWin(msg); else C.flashLoss(towerEl);
    if(lost){ towerEl.classList.remove('tw-shake'); void towerEl.offsetWidth; towerEl.classList.add('tw-shake'); }
    render();
  }
  function choose(f,t){
    if(!active||f!==floor) return;
    const row=towerEl.querySelector('.tw-row[data-floor="'+f+'"]'), b=row.children[t+1];
    if(traps[f].has(t)){ b.classList.add('trap'); b.textContent='🔥'; end(0,'Aïe, un piège à l’étage '+(f+1)+' !',true); return; }
    b.classList.add('safe'); b.textContent='🐉'; C.sound&&C.sound('reveal');
    floor++;
    const d=DIFFS[diff];
    if(floor>=d.floors){ const win=Math.round(roundBet*multAt(floor)); end(win,'Sommet atteint ! +'+win+' jetons (x'+multAt(floor).toFixed(2)+')'); return; }
    msg.textContent='Étage '+floor+' franchi — monte encore ou encaisse.';
    mark(); render();
  }
  cashBtn.addEventListener('click',()=>{
    if(!active||floor===0) return;
    const win=Math.round(roundBet*multAt(floor)); end(win,'Encaissé ! +'+win+' jetons (x'+multAt(floor).toFixed(2)+')');
  });
  startBtn.addEventListener('click',start);
  build(); render();
})();
