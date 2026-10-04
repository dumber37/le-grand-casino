/* ============================================================
   PLINKO — une bille tombe à travers 12 rangées de picots, gauche ou
   droite à égalité de chances à chaque picot, et finit dans une case
   multiplicatrice. Le tirage (chemin de la bille) est fait à l'avance,
   l'animation ne fait que le montrer. Trois niveaux de risque : plus
   les cases du bord paient, plus celles du centre rendent peu. Retour
   théorique ≈ 95–97 % (marge de la maison, comme les autres jeux).
   ============================================================ */
(function(){
  const C=window.Casino;
  const ROWS=12;
  const TABLES={
    faible:[7.5,2.8,1.5,1.25,1.1,0.95,0.55,0.95,1.1,1.25,1.5,2.8,7.5],
    moyen: [33,11,4,2,1.1,0.5,0.3,0.5,1.1,2,4,11,33],
    eleve: [100,24,8,2.2,0.7,0.2,0.2,0.2,0.7,2.2,8,24,100]
  };
  const canvas=document.getElementById('pl-canvas');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const betEl=document.getElementById('pl-betAmount'), msg=document.getElementById('pl-message');
  const dropBtn=document.getElementById('pl-dropBtn'), betMinus=document.getElementById('pl-betMinus'), betPlus=document.getElementById('pl-betPlus');
  const riskBtns=document.querySelectorAll('#pl-risk button');
  let bet=20, risk='moyen', active=false, ball=null, hitSlot=-1;

  const W=canvas.width, H=canvas.height, S=36, CX=W/2, TOP=34, RS=26, BIN_Y=TOP+ROWS*RS+6, BIN_H=34;
  const pegY=r=>TOP+r*RS;
  const offX=(k,r)=>CX+(2*k-r)*S/2;

  function fmt(m){ return m>=10?String(Math.round(m)):String(m); }
  function binColor(m){ return m>=10?'#e0453a':m>=2?'#e8892b':m>=1?'#d4af37':'#6c7a89'; }
  function draw(){
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='rgba(255,255,255,.78)';
    for(let r=0;r<ROWS;r++) for(let k=0;k<=r;k++){ ctx.beginPath(); ctx.arc(offX(k,r),pegY(r),3.2,0,Math.PI*2); ctx.fill(); }
    const tbl=TABLES[risk];
    for(let k=0;k<=ROWS;k++){
      const x=CX+(2*k-ROWS)*S/2, w=S-4;
      ctx.fillStyle=binColor(tbl[k]); ctx.globalAlpha=(k===hitSlot)?1:.82;
      ctx.beginPath(); ctx.roundRect?ctx.roundRect(x-w/2,BIN_Y,w,BIN_H,6):ctx.rect(x-w/2,BIN_Y,w,BIN_H); ctx.fill();
      ctx.globalAlpha=1; ctx.fillStyle='#1a1205'; ctx.font='bold 11px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('x'+fmt(tbl[k]),x,BIN_Y+BIN_H/2);
      if(k===hitSlot){ ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.beginPath(); ctx.roundRect?ctx.roundRect(x-w/2,BIN_Y,w,BIN_H,6):ctx.rect(x-w/2,BIN_Y,w,BIN_H); ctx.stroke(); }
    }
    if(ball){
      const g=ctx.createRadialGradient(ball.x-2,ball.y-2,1,ball.x,ball.y,8);
      g.addColorStop(0,'#fff6c8'); g.addColorStop(1,'#d4af37');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(ball.x,ball.y,7,0,Math.PI*2); ctx.fill();
    }
  }

  function render(){
    betEl.textContent=bet;
    dropBtn.disabled=active||C.state.balance<bet;
    betMinus.disabled=betPlus.disabled=active;
    riskBtns.forEach(b=>b.disabled=active);
  }
  betMinus.addEventListener('click',()=>{ if(!active){ bet=Math.max(5,bet-5); render(); } });
  betPlus.addEventListener('click',()=>{ if(!active){ bet=Math.min(100,bet+5); render(); } });
  document.addEventListener('balance-changed',render);
  riskBtns.forEach(b=>b.addEventListener('click',()=>{
    if(active) return;
    riskBtns.forEach(x=>x.classList.remove('sel')); b.classList.add('sel');
    risk=b.dataset.risk; hitSlot=-1; draw();
  }));

  function finish(roundBet,roundRisk,slot){
    const mult=TABLES[roundRisk][slot], win=Math.round(roundBet*mult);
    hitSlot=slot; ball=null; draw();
    C.state.balance+=win; C.saveBalance(); C.renderBalance();
    C.recordGame('plinko',roundBet,win);
    msg.textContent=win>roundBet?'x'+fmt(mult)+' — tu gagnes +'+(win-roundBet)+' jetons !':(win===roundBet?'x'+fmt(mult)+' — mise récupérée.':'x'+fmt(mult)+' — il te reste '+win+' jetons sur '+roundBet+'.');
    if(win>roundBet){ C.flashWin(msg); C.sound&&C.sound(mult>=10?'jackpot':'win'); } else C.sound&&C.sound('loss');
    active=false; render();
  }
  function drop(){
    if(active) return;
    if(C.state.balance<bet){ msg.textContent='Solde insuffisant.'; return; }
    const roundBet=bet, roundRisk=risk;
    active=true; hitSlot=-1; render();
    C.state.balance-=roundBet; C.trackWager(roundBet); C.saveBalance(); C.renderBalance();
    const path=[]; for(let r=0;r<ROWS;r++) path.push(Math.random()<0.5?1:0);
    const slot=path.reduce((a,b)=>a+b,0);
    msg.textContent='La bille tombe...';
    const STEP=150, t0=performance.now();
    // Le résultat est déjà décidé : si l'onglet passe en arrière-plan (animation mise en pause par le
    // navigateur) ou se ferme en pleine chute, on règle quand même la mise — jamais perdue.
    let done=false;
    const settle=()=>{ if(done) return; done=true; clearTimeout(safety); window.removeEventListener('pagehide',settle); finish(roundBet,roundRisk,slot); };
    const safety=setTimeout(settle,STEP*ROWS+600);
    window.addEventListener('pagehide',settle);
    (function frame(now){
      if(done) return;
      const t=(now-t0)/STEP, r=Math.min(ROWS,Math.floor(t)), p=t-r;
      let k=0; for(let i=0;i<r;i++) k+=path[i];
      if(r>=ROWS){ settle(); return; }
      const x0=offX(k,r), y0=pegY(r), x1=offX(k+path[r],r+1), y1=(r+1>=ROWS)?BIN_Y+8:pegY(r+1);
      ball={x:x0+(x1-x0)*p, y:y0+(y1-y0)*(p*p)-Math.sin(Math.PI*p)*7};
      draw();
      requestAnimationFrame(frame);
    })(t0);
  }
  dropBtn.addEventListener('click',drop);
  draw(); render();
})();
