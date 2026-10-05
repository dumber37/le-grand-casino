/* ============================================================
   SCÈNE DE LA ROULETTE — dessine toute la roue en SVG (bol en bois verni,
   piste de la bille, 37 alvéoles avec séparateurs en laiton, anneau de
   numéros, pente de bois, cône central chromé avec sa poignée, déflecteurs
   en losange, reflets de vernis) puis la pose dans .wheel-wrap, que le CSS
   incline en 3D. Aucune règle ni aucun tirage ici : roulette.js continue de
   choisir le numéro et de piloter les rotations de #r-wheel (roue) et
   #r-ballOrbit (orbite de la bille) ; ce fichier ne fournit que le décor.

   Repère : viewBox centré (-200 -200 400 400), le zéro est en haut.
   Rayons (unités SVG) : bol 200 · piste 150-192 · anneau de numéros 126-148 ·
   alvéoles 100-126 · pente 62-100 · cône 0-62.
   Rotations CSS sur des <g> SVG : l'origine par défaut est l'origine du
   repère utilisateur, soit le centre de la roue.
   ============================================================ */
(function(){
  const C=window.Casino=window.Casino||{};
  // L'ordre des numéros et les rouges viennent de roulette.js (source unique de vérité, partagée avec
  // la table de mise et le calcul du gain) : fournis à chaque appel de C.buildRouletteScene.
  let RED=[], WHEEL_ORDER=[], N=37, SEG=360/37;
  const RAD=Math.PI/180;
  const colorOf=n=>n===0?'green':(RED.includes(n)?'red':'black');
  const f=v=>Math.round(v*100)/100;
  const pt=(r,deg)=>[f(r*Math.sin(deg*RAD)),f(-r*Math.cos(deg*RAD))];
  // Secteur annulaire entre deux rayons et deux angles (0° = haut, sens horaire).
  function wedge(r1,r2,a1,a2){
    const [x1,y1]=pt(r2,a1),[x2,y2]=pt(r2,a2),[x3,y3]=pt(r1,a2),[x4,y4]=pt(r1,a1);
    return 'M'+x1+' '+y1+'A'+r2+' '+r2+' 0 0 1 '+x2+' '+y2+'L'+x3+' '+y3+'A'+r1+' '+r1+' 0 0 0 '+x4+' '+y4+'Z';
  }

  function defs(){
    return '<defs>'
    +'<radialGradient id="rwl-wood" cx="35%" cy="28%" r="85%"><stop offset="0" stop-color="#9a6234"/><stop offset=".45" stop-color="#5f3518"/><stop offset="1" stop-color="#26130a"/></radialGradient>'
    +'<linearGradient id="rwl-brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b5"/><stop offset=".3" stop-color="#d9b04a"/><stop offset=".62" stop-color="#8f6a1c"/><stop offset="1" stop-color="#f1d472"/></linearGradient>'
    +'<radialGradient id="rwl-maple" cx="50%" cy="50%" r="50%"><stop offset=".68" stop-color="#b98a52"/><stop offset=".8" stop-color="#e2bd86"/><stop offset=".92" stop-color="#c79a62"/><stop offset="1" stop-color="#8a6034"/></radialGradient>'
    +'<radialGradient id="rwl-red" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="148"><stop offset=".66" stop-color="#5a0a10"/><stop offset=".78" stop-color="#b3141d"/><stop offset="1" stop-color="#d93a3f"/></radialGradient>'
    +'<radialGradient id="rwl-black" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="148"><stop offset=".66" stop-color="#050505"/><stop offset=".78" stop-color="#1c1c1e"/><stop offset="1" stop-color="#3b3b40"/></radialGradient>'
    +'<radialGradient id="rwl-green" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="148"><stop offset=".66" stop-color="#04301a"/><stop offset=".78" stop-color="#0f7a3e"/><stop offset="1" stop-color="#25a35c"/></radialGradient>'
    +'<radialGradient id="rwl-slope" cx="50%" cy="50%" r="50%"><stop offset=".5" stop-color="#2c170a"/><stop offset=".78" stop-color="#6b3d1b"/><stop offset=".9" stop-color="#a06a36"/><stop offset="1" stop-color="#4a2810"/></radialGradient>'
    +'<radialGradient id="rwl-cone" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".25" stop-color="#e6e8ec"/><stop offset=".6" stop-color="#8d939d"/><stop offset="1" stop-color="#3e434b"/></radialGradient>'
    +'<radialGradient id="rwl-ball" cx="32%" cy="28%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#ececec"/><stop offset=".75" stop-color="#9b9b9b"/><stop offset="1" stop-color="#555"/></radialGradient>'
    +'<radialGradient id="rwl-gloss" cx="30%" cy="22%" r="62%"><stop offset="0" stop-color="#fff" stop-opacity=".34"/><stop offset=".5" stop-color="#fff" stop-opacity=".07"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'
    +'<radialGradient id="rwl-vignette" cx="50%" cy="50%" r="50%"><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>'
    +'<radialGradient id="rwl-ballshadow"><stop offset="0" stop-color="#000" stop-opacity=".6"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>'
    +'</defs>';
  }

  // Épaisseur du bol : on empile des disques décalés vers le bas, de plus en plus sombres — une fois
  // le plan incliné en 3D (CSS), ils forment la paroi visible sous la roue.
  function bowlWall(){
    let s='';
    for(let i=14;i>=1;i--){
      const t=i/14, c=Math.round(66-t*46), g=Math.round(40-t*28), b=Math.round(22-t*16);
      s+='<circle cx="0" cy="'+(i*2.4)+'" r="200" fill="rgb('+c+','+g+','+b+')"/>';
    }
    return s;
  }
  function bowlTop(){
    let s='<circle r="200" fill="url(#rwl-wood)"/>';
    // Veines du bois : fins anneaux concentriques irréguliers
    for(let r=158;r<198;r+=3.4) s+='<circle r="'+r+'" fill="none" stroke="#000" stroke-opacity="'+f(.05+((r*7)%5)/90)+'" stroke-width=".7"/>';
    s+='<circle r="197.5" fill="none" stroke="url(#rwl-brass)" stroke-width="5"/>';
    s+='<circle r="194" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="1"/>';
    return s;
  }
  function track(){
    // Piste de la bille en érable verni (statique), bords biseautés, déflecteurs en losange.
    let s='<circle r="171" fill="none" stroke="url(#rwl-maple)" stroke-width="42"/>';
    s+='<circle r="192" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="1.4"/>';
    s+='<circle r="150.5" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="1.6"/>';
    s+='<circle r="149" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1"/>';
    for(let k=0;k<8;k++){
      const a=22.5+k*45, [x,y]=pt(167,a);
      s+='<g transform="translate('+x+' '+y+') rotate('+a+')"><path d="M0 -11L6 0L0 11L-6 0Z" fill="url(#rwl-brass)" stroke="#5a3d0a" stroke-width=".8"/>'
        +'<path d="M0 -11L6 0L0 0Z" fill="#fff" opacity=".3"/><ellipse cx="0" cy="12" rx="5" ry="2" fill="#000" opacity=".35"/></g>';
    }
    return s;
  }
  function wheelGroup(){
    let s='';
    s+='<circle r="149" fill="#120a05"/>';
    // Alvéoles : un secteur par numéro, couleur en dégradé radial (fond plus sombre vers le centre).
    WHEEL_ORDER.forEach((n,i)=>{
      const a1=i*SEG-SEG/2, a2=a1+SEG, col=colorOf(n);
      s+='<g class="pk" data-n="'+n+'"><path class="pk-bg" d="'+wedge(100,148,a1,a2)+'" fill="url(#rwl-'+col+')"/>';
      const [tx,ty]=pt(136,i*SEG);
      s+='<text class="pk-num" transform="translate('+tx+' '+ty+') rotate('+f(i*SEG)+')" text-anchor="middle" dominant-baseline="central">'+n+'</text></g>';
    });
    // Séparateurs (frets) en laiton : un trait clair + une ombre décalée pour le relief.
    for(let i=0;i<N;i++){
      const a=i*SEG-SEG/2, [x1,y1]=pt(100,a), [x2,y2]=pt(148,a);
      s+='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="#000" stroke-opacity=".55" stroke-width="2.6"/>';
      s+='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="url(#rwl-brass)" stroke-width="1.5"/>';
    }
    // Fond des alvéoles (arête intérieure) et jonc extérieur
    s+='<circle r="100" fill="none" stroke="#000" stroke-opacity=".6" stroke-width="3"/>';
    s+='<circle r="148.5" fill="none" stroke="url(#rwl-brass)" stroke-width="2.6"/>';
    s+='<circle r="126" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="1"/>';
    // Pente en bois qui descend vers le cône central
    s+='<circle r="99" fill="url(#rwl-slope)"/>';
    for(let r=66;r<98;r+=4) s+='<circle r="'+r+'" fill="none" stroke="#000" stroke-opacity=".12" stroke-width=".8"/>';
    s+='<circle r="99" fill="none" stroke="url(#rwl-brass)" stroke-width="1.6" stroke-opacity=".8"/>';
    // Cône / turret chromé + poignée à 4 branches (laiton) + bouton central
    s+='<circle r="63" fill="url(#rwl-cone)" stroke="#2a2d33" stroke-width="1.2"/>';
    s+='<circle r="48" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1"/>';
    s+='<circle r="30" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="1.2"/>';
    for(let k=0;k<4;k++){
      s+='<g transform="rotate('+(k*90+45)+')"><rect x="-3.2" y="-58" width="6.4" height="48" rx="3" fill="url(#rwl-brass)" stroke="#5a3d0a" stroke-width=".7"/>'
        +'<circle cy="-60" r="6.2" fill="url(#rwl-brass)" stroke="#5a3d0a" stroke-width=".8"/><circle cx="-1.6" cy="-62" r="1.9" fill="#fff" opacity=".7"/></g>';
    }
    s+='<circle r="13" fill="url(#rwl-brass)" stroke="#5a3d0a" stroke-width="1"/><circle cx="-3" cy="-3.5" r="4" fill="#fff" opacity=".6"/>';
    return s;
  }
  function ballGroup(){
    // Orbite (rotation pilotée par roulette.js) > recul radial (animation de la chute) > rayon de la
    // piste > contre-rotation + écrasement vertical : le plan est incliné en 3D, la bille serait vue
    // comme un disque aplati ; on l'étire pour qu'elle reste ronde à l'écran. Les deux rotations sont
    // synchronisées par roulette.js (même durée, même courbe) : l'angle total s'annule à chaque instant.
    return '<g class="ball-hop"><g transform="translate(0 -116)"><g class="ball-pivot">'
      +'<ellipse class="ball-shadow" cx="3" cy="6.5" rx="9" ry="4.4" fill="url(#rwl-ballshadow)"/>'
      +'<circle class="ball" r="6.8" fill="url(#rwl-ball)" stroke="#6a6a6a" stroke-width=".4"/>'
      +'<circle cx="-2.2" cy="-2.4" r="2" fill="#fff" opacity=".9"/>'
      +'</g></g></g>';
  }
  function overlay(){
    // Reflets de vernis FIXES (ils ne tournent pas avec la roue : c'est ce qui donne la sensation de
    // lumière), vignette sur le bord et repère doré à midi.
    return '<ellipse cx="-58" cy="-92" rx="118" ry="62" transform="rotate(-28 -58 -92)" fill="url(#rwl-gloss)"/>'
      +'<circle r="198" fill="url(#rwl-vignette)"/>'
      +'<path d="M-170 -60A178 178 0 0 1 -60 -168" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="3" stroke-linecap="round"/>'
      +'<g class="rw-marker"><path d="M0 -180L9 -198L0 -190L-9 -198Z" fill="url(#rwl-brass)" stroke="#5a3d0a" stroke-width="1"/>'
      +'<circle cy="-176" r="3.2" fill="#e8483f" stroke="#5a1410" stroke-width=".8"/></g>';
  }

  // Quatre calques SVG superposés (même repère) : décor fixe, roue, bille, reflets. La roue et l'orbite
  // de la bille sont chacune leur propre élément <svg> : leur rotation CSS est alors un simple
  // changement de transform sur un calque déjà rasterisé (will-change), fait par le GPU — le décor
  // et les reflets ne sont jamais redessinés pendant le tour. Les dégradés partagés (defs) sont dans
  // le premier calque et référencés par id depuis les autres.
  C.buildRouletteScene=function(opts){
    RED=opts.red; WHEEL_ORDER=opts.order; N=WHEEL_ORDER.length; SEG=360/N;
    const open=(cls,id)=>'<svg class="rw-layer '+cls+'"'+(id?' id="'+id+'"':'')+' viewBox="-200 -200 400 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">';
    return open('rw-base')+defs()+'<g class="rw-wall">'+bowlWall()+'</g>'+bowlTop()+track()+'</svg>'
      +open('wheel','r-wheel')+wheelGroup()+'</svg>'
      +open('ball-orbit','r-ballOrbit')+ballGroup()+'</svg>'
      +open('rw-over')+overlay()+'</svg>';
  };
})();