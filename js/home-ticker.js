/* ============================================================
   BANDEAU D'ACCUEIL — un jackpot DÉCORATIF qui monte en direct (calculé
   à partir de l'heure : tous les joueurs voient le même chiffre, mais il
   ne se gagne pas et ne change aucune règle) et un défilement des
   derniers gros gains : les tiens (relus dans l'historique) et ceux de
   tes amis connectés au Salon (messages "st_win", sans serveur : voir
   friends.js). Les noms reçus ne sont jamais interprétés comme du HTML.
   ============================================================ */
(function(){
  const C=window.Casino, $=id=>document.getElementById(id);
  const box=$('homeTicker'); if(!box) return;
  const jackEl=$('jackpotVal'), feedEl=$('bigWinsTicker');
  const BIG_WIN=150;

  // ---- Jackpot décoratif ----
  const JACK_BASE=125000, RATE=2.7, CYCLE=1500000;
  const jack=()=>JACK_BASE+Math.floor(Date.now()/1000*RATE)%CYCLE;
  const homeActive=()=>$('view-home').classList.contains('active');
  function tickJack(){ if(!document.hidden&&homeActive()) jackEl.textContent=jack().toLocaleString('fr-FR'); }
  tickJack(); setInterval(tickJack,1000);

  // ---- Derniers gros gains ----
  const friendWins=[];
  const short=s=>String(s==null?'':s).slice(0,20);
  function items(){
    const own=C.getHistory().filter(h=>h.net>=BIG_WIN).slice(0,5).map(h=>'Toi : +'+h.net+' à '+C.gameName(h.game));
    return friendWins.slice(0,4).concat(own);
  }
  let idx=0;
  function showNext(){
    if(document.hidden||!homeActive()) return;
    const list=items();
    feedEl.classList.remove('in'); void feedEl.offsetWidth;
    feedEl.textContent=list.length?list[idx++%list.length]:'Aucun gros gain pour l’instant — le prochain sera le tien !';
    feedEl.classList.add('in');
  }
  showNext(); setInterval(showNext,4000);

  // ---- Partage avec les amis du salon ----
  const F=()=>C.friends;
  document.addEventListener('game-recorded',e=>{
    const d=e.detail, net=d.win-d.bet;
    if(net<BIG_WIN||!F()||!F().role()) return;
    const msg={t:'st_win',g:String(d.game).slice(0,20),net};
    if(F().role()==='host') F().peers().forEach(p=>F().sendPeer(p.id,Object.assign({from:F().name()},msg)));
    else F().sendHost(msg);
  });
  if(F()) F().onMsg((m,peerId)=>{
    if(m.t!=='st_win') return;
    const net=parseInt(m.net,10); if(!(net>0)||net>1e7) return;
    let who;
    if(peerId!=null){ // je suis l'hôte : le nom vient de la connexion, jamais du message
      const p=F().peers().find(x=>x.id===peerId); if(!p) return; who=p.name;
      F().peers().forEach(q=>{ if(q.id!==peerId) F().sendPeer(q.id,{t:'st_win',g:short(m.g),net,from:who}); });
    } else who=short(m.from);
    friendWins.unshift(short(who)+' : +'+net+' à '+C.gameName(short(m.g))+' 👏');
    friendWins.length=Math.min(friendWins.length,6);
    idx=0; showNext();
  });
})();
