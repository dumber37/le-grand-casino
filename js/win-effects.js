/* ============================================================
   EFFETS DE VICTOIRE — animation plein écran jouée à chaque gain, au
   choix dans la Boutique (confettis, pluie de pièces, feux d'artifice).
   Branché sur C.flashWin (le point d'entrée commun de tous les jeux) :
   aucune règle ni aucun gain ne change, c'est purement visuel. Désactivé
   si « Réduire les animations » est actif ou si l'onglet est masqué.
   ============================================================ */
(function(){
  const C=window.Casino;
  const KEY='grand-casino-wineffect';
  let canvas=null, ctx=null, running=false, parts=[], endAt=0, last=0, kind='classic';

  function ensureCanvas(){
    if(canvas) return;
    canvas=document.createElement('canvas'); canvas.id='winFx'; canvas.setAttribute('aria-hidden','true');
    document.body.appendChild(canvas); ctx=canvas.getContext('2d');
    const fit=()=>{ canvas.width=innerWidth; canvas.height=innerHeight; };
    fit(); addEventListener('resize',fit);
  }
  const R=(a,b)=>a+Math.random()*(b-a);
  const COLORS=['#f2d675','#ff5d8f','#4cc9f0','#7bd88f','#ffffff','#ff9f1c'];

  function spawn(k){
    const W=canvas.width, H=canvas.height; parts=[];
    if(k==='confetti'){
      for(let i=0;i<140;i++) parts.push({x:R(0,W),y:R(-H*.4,0),vx:R(-60,60),vy:R(120,320),rot:R(0,6.28),vr:R(-6,6),w:R(6,11),h:R(4,8),c:COLORS[i%COLORS.length],life:2.4});
    } else if(k==='coins'){
      for(let i=0;i<55;i++) parts.push({x:R(0,W),y:R(-H*.6,0),vx:R(-25,25),vy:R(200,420),rot:0,vr:0,s:R(18,30),emoji:'🪙',life:2.6});
    } else if(k==='fireworks'){
      for(let b=0;b<3;b++){
        const cx=R(W*.2,W*.8), cy=R(H*.15,H*.45), delay=b*.45, col=COLORS[Math.floor(R(0,COLORS.length))];
        for(let i=0;i<46;i++){ const a=R(0,6.28), sp=R(90,260); parts.push({x:cx,y:cy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,g:220,r:R(1.8,3.2),c:col,delay,life:1.5}); }
      }
    }
  }
  function frame(now){
    if(!running) return;
    const dt=Math.min(.05,(now-last)/1000); last=now;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    let alive=0;
    parts.forEach(p=>{
      if(p.delay>0){ p.delay-=dt; alive++; return; }
      p.life-=dt; if(p.life<=0) return; alive++;
      p.x+=p.vx*dt; p.y+=p.vy*dt; if(p.g) p.vy+=p.g*dt; p.rot+=(p.vr||0)*dt;
      ctx.globalAlpha=Math.max(0,Math.min(1,p.life/(kind==='fireworks'?1:.6)));
      if(p.emoji){ ctx.font=p.s+'px serif'; ctx.fillText(p.emoji,p.x,p.y); }
      else if(p.w){ ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle=p.c; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore(); }
      else { ctx.fillStyle=p.c; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,6.28); ctx.fill(); }
    });
    ctx.globalAlpha=1;
    if(alive&&now<endAt){ requestAnimationFrame(frame); }
    else { running=false; ctx.clearRect(0,0,canvas.width,canvas.height); }
  }
  // forced : aperçu depuis la Boutique (joue l'effet demandé même s'il n'est pas équipé).
  C.winEffect=function(forced){
    let k=forced; if(!k){ try{ k=localStorage.getItem(KEY)||'classic'; }catch(e){ k='classic'; } }
    if(k==='classic'||running||document.hidden) return;
    if(document.documentElement.getAttribute('data-motion')==='reduce') return;
    kind=k; ensureCanvas(); spawn(k);
    running=true; last=performance.now(); endAt=last+3200; requestAnimationFrame(frame);
  };
})();
