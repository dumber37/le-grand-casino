/* ============================================================
   PLAN DU CASINO — vue d'ensemble en pseudo-isométrique. Fausse 3D
   obtenue uniquement en 2D (rotate + scaleY), jamais de perspective/
   rotateX/preserve-3d : robuste, léger, et ça évite tout le lot de
   bugs de rendu 3D déjà rencontrés ailleurs dans ce projet.

   Chaque zone est un vrai <button data-view="..."> (ou, pour les
   zones qui regroupent plusieurs jeux, un groupe de petits boutons
   data-view). Rien de plus à faire côté navigation : le clic délégué
   déjà présent dans core.js (switchView sur tout [data-view]) et le
   son de clic déjà présent dans audio.js s'appliquent automatiquement
   — aucune logique de navigation dupliquée ici.
   ============================================================ */
window.Casino=window.Casino||{};
(function(){
  const stage=document.getElementById('floor-plane');
  if(!stage) return;

  // Position en % de la scène (pas en pixels) : le plan peut être redimensionné
  // (cf. media queries de floor.css) sans avoir à retoucher ces coordonnées.
  const ZONES=[
    { label:'Machines à sous', short:'Machines à sous', icon:'🎰', x:16, y:18, theme:'gold', games:[
      {view:'slots', icon:'🎰', name:'Machine à sous'},
      {view:'dragon', icon:'🐉', name:'Fortune Dragon'}
    ]},
    { label:'Blackjack', short:'Blackjack', icon:'🃏', view:'blackjack', x:46, y:10, theme:'felt' },
    { label:'Roulette', short:'Roulette', icon:'🎡', view:'roulette', x:76, y:20, theme:'felt' },
    { label:'Baccarat', short:'Baccarat', icon:'🎴', view:'baccarat', x:58, y:40, theme:'felt' },
    { label:'Jeux rapides', short:'Jeux rapides', icon:'⚡', x:86, y:48, theme:'neon', games:[
      {view:'bus', icon:'🚌', name:'Ride the Bus'},
      {view:'coinflip', icon:'🪙', name:'Pile ou Face'},
      {view:'mines', icon:'💣', name:'Mines'},
      {view:'crash', icon:'🚀', name:'Crash'},
      {view:'war', icon:'⚔️', name:'Bataille'},
      {view:'keno', icon:'🔢', name:'Keno'}
    ]},
    { label:'Salle Poker & Amis', short:'Poker & Amis', icon:'♣️', x:20, y:50, theme:'felt', games:[
      {view:'poker', icon:'♣️', name:'Poker Texas Hold’em'},
      {view:'friends', icon:'🤝', name:'Salon entre amis'}
    ]},
    { label:'Vidéo Poker', short:'Vidéo Poker', icon:'♠️', view:'videopoker', x:40, y:70, theme:'felt' },
    { label:'Ouverture de caisses', short:'Caisses', icon:'📦', view:'cases', x:66, y:72, theme:'neon' },
    { label:'Salon VIP', short:'VIP', icon:'💎', view:'vip', x:88, y:78, theme:'vip' }
  ];

  function pip(g){
    return '<button class="floor-pip" data-view="'+g.view+'" title="'+g.name+'" aria-label="'+g.name+'">'
      +'<span class="fp-icon">'+g.icon+'</span></button>';
  }
  function zoneHtml(z){
    const tag=z.view?'button':'div';
    const attrs=(z.view?(' data-view="'+z.view+'" title="'+z.label+'" aria-label="'+z.label+'"'):' aria-label="'+z.label+'"')
      +' style="left:'+z.x+'%;top:'+z.y+'%"';
    return '<'+tag+' class="floor-zone fz-'+(z.theme||'felt')+'"'+attrs+'>'
      +'<span class="fz-face"><span class="fz-icon">'+z.icon+'</span><span class="fz-label">'+z.short+'</span></span>'
      +(z.games?('<span class="fz-pips">'+z.games.map(pip).join('')+'</span>'):'')
      +'</'+tag+'>';
  }

  stage.innerHTML=ZONES.map(zoneHtml).join('');
})();
