/* ============================================================
   CARTES À GRATTER — 9 cases, 3 symboles identiques = gagné. Le tirage
   est fait à l'achat (grille choisie selon un tableau de probabilités,
   retour théorique ≈ 95,5 %) ; gratter ne fait que révéler. Le gain est
   crédité quand tout est gratté (ou en quittant la page avec un ticket
   en cours : jamais perdu). Aucune grille perdante ne contient 3 fois le
   même symbole, et une grille gagnante n'en contient qu'un seul trio.
   ============================================================ */
(function(){
  const C=window.Casino, $=id=>document.getElementById(id);
  const gridEl=$('sc-grid'); if(!gridEl) return;
  const SYMS=[{s:'🍒',m:2},{s:'🍋',m:3},{s:'🔔',m:5},{s:'⭐',m:10},{s:'7️⃣',m:25},{s:'💎',m:100}];
  // Probabilité de chaque palier de gain (cumul croissant du plus rare au plus fréquent).
  const TIERS=[{m:100,p:0.0003},{m:25,p:0.003},{m:10,p:0.012},{m:5,p:0.03},{m:3,p:0.06},{m:2,p:0.20}];
  let bet=20, ticket=null;
  const betEl=$('sc-betAmount'), msg=$('sc-message'), buyBtn=$('sc-buyBtn'), allBtn=$('sc-allBtn');
  const betMinus=$('sc-betMinus'), betPlus=$('sc-betPlus');

  function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
  function makeGrid(){
    const r=Math.random(); let acc=0, tier=null;
    for(const t of TIERS){ acc+=t.p; if(r<acc){ tier=t; break; } }
    const pool=[];
    if(tier){
      const win=SYMS.find(x=>x.m===tier.m);
      const cells=[win.s,win.s,win.s];
      SYMS.filter(x=>x!==win).forEach(x=>{ pool.push(x.s,x.s); });
      shuffle(pool); return {cells:shuffle(cells.concat(pool.slice(0,6))), mult:tier.m};
    }
    SYMS.forEach(x=>pool.push(x.s,x.s));
    return {cells:shuffle(pool).slice(0,9), mult:0};
  }
  function render(){
    betEl.textContent=bet;
    const busy=!!ticket;
    buyBtn.disabled=busy||C.state.balance<bet; betMinus.disabled=betPlus.disabled=busy;
    allBtn.style.display=busy?'':'none';
  }
  betMinus.addEventListener('click',()=>{ if(!ticket){ bet=Math.max(5,bet-5); render(); } });
  betPlus.addEventListener('click',()=>{ if(!ticket){ bet=Math.min(50,bet+5); render(); } });
  document.addEventListener('balance-changed',()=>{ if(!ticket) render(); });

  function buildEmpty(){
    gridEl.innerHTML='';
    for(let i=0;i<9;i++){
      const c=document.createElement('div'); c.className='sc-cell sc-idle';
      c.innerHTML='<span class="sc-sym">?</span><span class="sc-cover"></span>'; gridEl.appendChild(c);
    }
  }
  function reveal(cell){
    if(!ticket||!cell||cell.classList.contains('open')) return;
    cell.classList.add('open'); C.sound&&C.sound('reveal');
    if(gridEl.querySelectorAll('.sc-cell.open').length===9) settle();
  }
  function settle(){
    if(!ticket) return;
    const t=ticket; ticket=null;
    gridEl.querySelectorAll('.sc-cell').forEach(c=>c.classList.add('open'));
    if(t.mult>0){
      const win=t.bet*t.mult, trio=t.cells.find(s=>t.cells.filter(x=>x===s).length>=3);
      gridEl.querySelectorAll('.sc-cell').forEach((c,i)=>{ if(t.cells[i]===trio) c.classList.add('sc-hit'); });
      C.state.balance+=win; C.saveBalance(); C.renderBalance();
      C.recordGame('scratch',t.bet,win);
      msg.textContent='Trois '+trio+' ! x'+t.mult+' — +'+win+' jetons';
      C.flashWin(msg);
    } else {
      C.recordGame('scratch',t.bet,0);
      msg.textContent='Pas de trio cette fois. Retente ta chance !';
      C.flashLoss(gridEl);
    }
    render();
  }
  function buy(){
    if(ticket) return;
    if(C.state.balance<bet){ msg.textContent='Solde insuffisant.'; return; }
    C.state.balance-=bet; C.trackWager(bet); C.saveBalance(); C.renderBalance();
    const g=makeGrid(); ticket={bet,cells:g.cells,mult:g.mult};
    gridEl.innerHTML='';
    g.cells.forEach(s=>{
      const c=document.createElement('div'); c.className='sc-cell';
      c.innerHTML='<span class="sc-sym">'+s+'</span><span class="sc-cover"></span>'; gridEl.appendChild(c);
    });
    msg.textContent='Gratte les 9 cases (glisse le doigt ou la souris) — 3 symboles identiques = gagné.';
    C.sound&&C.sound('lever'); render();
  }
  let down=false;
  function scratchAt(x,y){ const el=document.elementFromPoint(x,y); reveal(el&&el.closest('.sc-cell')); }
  gridEl.addEventListener('pointerdown',e=>{ down=true; scratchAt(e.clientX,e.clientY); });
  gridEl.addEventListener('pointermove',e=>{ if(down) scratchAt(e.clientX,e.clientY); });
  ['pointerup','pointercancel','pointerleave'].forEach(ev=>gridEl.addEventListener(ev,()=>{ down=false; }));
  buyBtn.addEventListener('click',buy);
  allBtn.addEventListener('click',()=>{ if(ticket) settle(); });
  window.addEventListener('pagehide',()=>{ if(ticket) settle(); });
  buildEmpty(); render();
})();
