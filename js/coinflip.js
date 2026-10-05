/* ============================================================
   PILE OU FACE
   ============================================================ */
(function(){
  const C=window.Casino;
  let bet=20, selectedSide=null, spinning=false;
  const betEl=document.getElementById('cf-betAmount'), msg=document.getElementById('cf-message');
  const flipBtn=document.getElementById('cf-flipBtn'), coinEl=document.getElementById('cf-coin');
  const betMinus=document.getElementById('cf-betMinus'), betPlus=document.getElementById('cf-betPlus');
  const stageEl=document.getElementById('cf-stage'), shadowEl=document.getElementById('cf-shadow'), tiltEl=document.getElementById('cf-tilt');
  const coinInner=coinEl.querySelector('.coin-inner');
  let spins=0; // tours cumulés, pour que chaque lancer tourne "vers l'avant" sans jamais revenir en arrière

  // ---- Construction de la pièce 3D (voir coinflip.css) : tranche cannelée en N plaquettes + deux faces ciselées en SVG ----
  const N=60;                                         // égal à --n dans coinflip.css
  const REST='rotateX(26deg) rotateY(-16deg) rotateZ(0deg)'; // inclinaison au repos (égale à .coin-tilt dans coinflip.css)
  const FONT='Georgia,\'Times New Roman\',serif';
  function rimHtml(){
    let s='';
    for(let i=0;i<N;i++){
      const a=i*360/N;
      // Lumière venue du haut à gauche : les plaquettes qui lui font face restent claires, les autres s'assombrissent.
      const sh=(0.36*(1-(Math.cos((a-315)*Math.PI/180)+1)/2)).toFixed(3);
      s+='<i style="--a:'+a.toFixed(2)+'deg;--sh:'+sh+'"></i>';
    }
    return '<div class="coin-rim">'+s+'</div>';
  }
  // Dégradés et motifs communs aux deux faces (un seul jeu d'identifiants cfm-* dans le document).
  function defsHtml(){
    const stops=a=>a.map(s=>'<stop offset="'+s[0]+'" stop-color="'+s[1]+'"/>').join('');
    return '<svg class="coin-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>'
      +'<linearGradient id="cfm-rim" x1="0" y1="0" x2="1" y2="1">'+stops([[0,'#fff1a6'],[.25,'#e6bb47'],[.55,'#b8861f'],[.8,'#e2b640'],[1,'#8d6416']])+'</linearGradient>'
      +'<radialGradient id="cfm-field" cx=".36" cy=".3" r=".85">'+stops([[0,'#fbe58c'],[.45,'#e0b53f'],[.8,'#bf8f26'],[1,'#9a6f1a']])+'</radialGradient>'
      +'<linearGradient id="cfm-ridge" x1="0" y1="0" x2="1" y2="1">'+stops([[0,'#fff0a0'],[.5,'#c9982c'],[1,'#7b5510']])+'</linearGradient>'
      +'<linearGradient id="cfm-ink" x1="0" y1="0" x2="0" y2="1">'+stops([[0,'#f9e08a'],[1,'#c99a2c']])+'</linearGradient>'
      +'<radialGradient id="cfm-gloss"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'
      // Pique (PILE) et couronne (FACE) : formes sans remplissage, posées trois fois (ombre, reflet, matière) pour l'effet de relief.
      +'<g id="cfm-spade"><path d="M0 -16 C4 -10 15 -5 15 3 C15 9 9 12 4.5 8.5 C5 12.5 6 15.5 9 17.5 L-9 17.5 C-6 15.5 -5 12.5 -4.5 8.5 C-9 12 -15 9 -15 3 C-15 -5 -4 -10 0 -16 Z"/></g>'
      +'<g id="cfm-crown"><path d="M-17 8 L-19.5 -9 L-9.5 -2 L0 -12.5 L9.5 -2 L19.5 -9 L17 8 Z"/><rect x="-17" y="9.6" width="34" height="4.6" rx="1.7"/>'
        +'<circle cx="-19.5" cy="-10.6" r="2"/><circle cx="0" cy="-14.2" r="2"/><circle cx="19.5" cy="-10.6" r="2"/></g>'
      +'<text id="cfm-t-pile" x="0" y="20" text-anchor="middle" font-family="'+FONT+'" font-weight="700" font-size="12.5" letter-spacing="1.3">PILE</text>'
      +'<text id="cfm-t-face" x="0" y="20" text-anchor="middle" font-family="'+FONT+'" font-weight="700" font-size="12.5" letter-spacing="1.3">FACE</text>'
      +'</defs></svg>';
  }
  function faceSvg(kind){
    const pile=kind==='pile', id=pile?'p':'f', emb=pile?'cfm-spade':'cfm-crown', txt=pile?'cfm-t-pile':'cfm-t-face';
    const raised=(ref,tf)=>'<use href="#'+ref+'" fill="#5b3f0b" opacity=".85" transform="'+tf+' translate(.9 .9)"/>'
      +'<use href="#'+ref+'" fill="#fff3b8" opacity=".95" transform="'+tf+' translate(-.55 -.55)"/>'
      +'<use href="#'+ref+'" fill="url(#cfm-ink)" transform="'+tf+'"/>';
    const arcText=(pid,label,size,spacing)=>
      '<text font-family="'+FONT+'" font-weight="700" font-size="'+size+'" letter-spacing="'+spacing+'" text-anchor="middle" fill="#fff0b0" opacity=".8" transform="translate(.35 .35)"><textPath href="#'+pid+'" startOffset="50%" text-anchor="middle">'+label+'</textPath></text>'
      +'<text font-family="'+FONT+'" font-weight="700" font-size="'+size+'" letter-spacing="'+spacing+'" text-anchor="middle" fill="#6b4b0e"><textPath href="#'+pid+'" startOffset="50%" text-anchor="middle">'+label+'</textPath></text>';
    return '<svg viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">'
      +'<defs><path id="cfm-top-'+id+'" d="M-32.5 0 A32.5 32.5 0 0 1 32.5 0"/><path id="cfm-bot-'+id+'" d="M-37.6 0 A37.6 37.6 0 0 0 37.6 0"/></defs>'
      +'<circle r="49.6" fill="url(#cfm-rim)"/>'
      +'<circle r="46.4" fill="none" stroke="#6a4a0c" stroke-width="2.3" pathLength="72" stroke-dasharray=".46 .54" opacity=".6"/>'
      +'<circle r="46.4" fill="none" stroke="#fff0a8" stroke-width="2.3" pathLength="72" stroke-dasharray=".16 .84" opacity=".7"/>'
      +'<circle r="43.7" fill="none" stroke="url(#cfm-ridge)" stroke-width="1.7"/>'
      +'<circle r="42.6" fill="url(#cfm-field)"/>'
      +'<circle r="29.5" fill="none" stroke="#7d5a12" stroke-width=".8" opacity=".75"/>'
      +'<circle r="29.5" fill="none" stroke="#ffeaa0" stroke-width=".6" opacity=".55" transform="translate(.5 .5)"/>'
      +arcText('cfm-top-'+id,'LE GRAND CASINO',5.6,1)
      +arcText('cfm-bot-'+id,'★ ★ ★',6,2)
      +raised(emb,'translate(0 -9) scale(.95)')
      +raised(txt,'translate(0 0)')
      +'<ellipse cx="-13" cy="-25" rx="27" ry="13" transform="rotate(-30 -13 -25)" fill="url(#cfm-gloss)" opacity=".5"/>'
      +'<circle r="49.2" fill="none" stroke="#fff6c8" stroke-opacity=".55" stroke-width=".5"/>'
      +'<circle r="49.9" fill="none" stroke="#4d3507" stroke-opacity=".55" stroke-width=".6"/>'
      +'</svg>';
  }
  try{
    coinInner.innerHTML=rimHtml()
      +'<div class="coin-face coin-pile">'+faceSvg('pile')+'</div>'
      +'<div class="coin-face coin-tails">'+faceSvg('face')+'</div>';
    stageEl.insertAdjacentHTML('afterbegin',defsHtml());
    stageEl.classList.add('built');
  }catch(e){ /* repli : les faces textuelles du HTML restent affichées */ }

  document.querySelectorAll('#view-coinflip .roulette-grid button').forEach(b=>{
    b.addEventListener('click',()=>{ if(spinning) return; document.querySelectorAll('#view-coinflip .roulette-grid button').forEach(x=>x.classList.remove('sel')); b.classList.add('sel'); selectedSide=b.dataset.side; });
  });
  function render(){ betEl.textContent=bet; flipBtn.disabled=spinning||C.state.balance<bet; betMinus.disabled=betPlus.disabled=spinning; }
  betMinus.addEventListener('click',()=>{ if(!spinning){ bet=Math.max(5,bet-5); render(); } });
  betPlus.addEventListener('click',()=>{ if(!spinning){ bet=Math.min(100,bet+5); render(); } });
  document.addEventListener('balance-changed',render);
  const FLIP_MS=1700; // doit rester égal à la transition de .coin-inner (coinflip.css)
  const motionOff=()=>document.documentElement.getAttribute('data-motion')==='reduce';

  // La pièce est LANCÉE : elle monte vers la caméra (elle grossit) en ralentissant, retombe en accélérant,
  // rebondit une fois ; son ombre au sol rétrécit en montant. Ces deux animations (WAAPI) ne portent que sur
  // des éléments PLATS (conteneur et ombre) ; le tour sur elle-même et le balancement restent des
  // transitions CSS (.coin-inner / .coin-tilt), jamais @keyframes sur un élément 3D.
  function toss(){
    const lift=Math.round(Math.min(118,stageEl.clientHeight*.55));
    const up='cubic-bezier(.2,.7,.35,1)', down='cubic-bezier(.6,0,.9,.5)';
    if(!motionOff()){
      if(coinEl.animate) coinEl.animate([
        {transform:'translateY(0) scale(1)',easing:up,offset:0},
        {transform:'translateY('+(-lift)+'px) scale(1.36)',easing:down,offset:.45},
        {transform:'translateY(0) scale(1)',easing:'ease-out',offset:.8},
        {transform:'translateY(-14px) scale(1.05)',easing:'ease-in',offset:.9},
        {transform:'translateY(0) scale(1)',offset:1}
      ],{duration:FLIP_MS});
      if(shadowEl.animate) shadowEl.animate([
        {transform:'scale(1)',opacity:.95,easing:up,offset:0},
        {transform:'scale(.5)',opacity:.32,easing:down,offset:.45},
        {transform:'scale(1)',opacity:.95,easing:'ease-out',offset:.8},
        {transform:'scale(.88)',opacity:.7,easing:'ease-in',offset:.9},
        {transform:'scale(1)',opacity:.95,offset:1}
      ],{duration:FLIP_MS});
      // Petit balancement en vol, puis la pièce se pose avec un léger rebond d'inclinaison.
      const sgn=()=>Math.random()<.5?-1:1;
      tiltEl.style.transition='transform '+(FLIP_MS*.42/1000)+'s ease-out';
      tiltEl.style.transform='rotateX(16deg) rotateY('+(sgn()*(10+Math.random()*10)).toFixed(1)+'deg) rotateZ('+(sgn()*(4+Math.random()*8)).toFixed(1)+'deg)';
      setTimeout(()=>{ tiltEl.style.transition='transform .8s cubic-bezier(.3,1.6,.5,1)'; tiltEl.style.transform=REST; },FLIP_MS*.8);
    }
    // Tintement à l'impact puis petit rebond sonore (même sans animation : le son suit le résultat).
    setTimeout(()=>C.sound&&C.sound('coin'),FLIP_MS*.8);
    setTimeout(()=>C.sound&&C.sound('coinTink'),FLIP_MS*.9);
  }
  function bounceWin(){
    stageEl.classList.add('win'); setTimeout(()=>stageEl.classList.remove('win'),2200);
    if(!motionOff()&&coinEl.animate) coinEl.animate([
      {transform:'translateY(0) scale(1)',offset:0},
      {transform:'translateY(-14px) scale(1.08)',offset:.35},
      {transform:'translateY(2px) scale(.97)',offset:.6},
      {transform:'translateY(0) scale(1)',offset:1}
    ],{duration:500,easing:'cubic-bezier(.34,1.56,.64,1)'});
  }

  flipBtn.addEventListener('click',()=>{
    if(spinning) return;
    if(!selectedSide){ msg.textContent='Choisis Pile ou Face.'; return; }
    if(C.state.balance<bet){ msg.textContent='Solde insuffisant.'; return; }
    // Mise verrouillée pour ce tour dès le clic : les boutons +/- sont désactivés pendant
    // l'animation (comme les autres jeux), et le gain est calculé sur ce montant figé, jamais
    // sur la variable "bet" (qui pourrait changer entre-temps si les boutons n'étaient pas bloqués).
    const roundBet=bet;
    spinning=true;
    C.state.balance-=roundBet; C.trackWager(roundBet); C.saveBalance(); C.renderBalance();
    C.sound&&C.sound('spin');
    render(); msg.textContent='La pièce tourne...';
    stageEl.classList.remove('win');

    // Le résultat est tiré immédiatement (même instant qu'avant) ; seule la mise à jour
    // visuelle/du solde est différée de FLIP_MS pour laisser la pièce tourner en 3D.
    const result=Math.random()<0.5?'pile':'face';
    spins+=5+Math.floor(Math.random()*3);
    const targetDeg=spins*360+(result==='face'?180:0);
    coinInner.style.transform='rotateX('+targetDeg+'deg)';
    toss();

    setTimeout(()=>{
      let win = result===selectedSide ? roundBet*2 : 0;
      msg.textContent = win>0 ? ("C'était "+result+" — gagné +"+win+" jetons") : ("C'était "+result+" — perdu");
      // Animation signature : la pièce rebondit en retombant sur le bon côté ; perte = assombrissement discret
      // (sur le décor, pas sur la pièce : un filtre sur un élément 3D aplatirait son rendu).
      if(win>0){ bounceWin(); }
      else { C.flashLoss(stageEl); }
      C.state.balance+=win; C.saveBalance(); C.renderBalance();
      C.recordGame('coinflip', roundBet, win); if(win>0) C.flashWin(msg);
      spinning=false; render();
    },FLIP_MS);
  });
  render();
})();
