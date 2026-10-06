/* ============================================================
   DISTRIBUTION DES CARTES — chaque carte nouvellement posée sur la table
   part de la MAIN du croupier, décrit un petit arc, atterrit face cachée
   puis se retourne, pendant que le bras du croupier lance la carte (un
   mouvement par carte). Les cartes d'une même donne sortent une par une,
   en alternant les mains (joueur, croupier, joueur, croupier...).

   Un seul point d'entrée pour tous les jeux : un MutationObserver repère
   les nouveaux .card-3d (que C.renderCard crée partout) — aucun jeu à
   modifier, aucune règle touchée. Certains jeux (poker, tables multijoueur)
   redessinent TOUTE la table à chaque action : on retient donc, pour chaque
   emplacement, la carte qui s'y trouve (« empreinte ») pour (1) ne pas
   relancer les cartes déjà posées et (2) faire CONTINUER un vol en cours
   sur la nouvelle copie de la carte au lieu de le perdre.

   Sûreté 3D (bug déjà rencontré ici) : on n'anime que .card-3d, jamais
   .card-flip/.card-face/.card-back en @keyframes. Le retournement reste la
   transition CSS existante (classe is-back retirée sur un élément déjà
   présent) ; on la coupe uniquement le temps de poser l'état « face cachée »
   initial, pour ne pas voir la carte se retourner une première fois.
   ============================================================ */
(function(){
  const C=window.Casino, root=document.documentElement;

  /* Cadence « de casino » (tous les jeux de cartes) : au lieu de jeter toutes les cartes d'un coup, le
     croupier en pose UNE à la fois, C.DEAL_STEP_MS entre deux cartes (réglable dans Paramètres, 1 s par
     défaut ; 0 = instantanée). Le jeu tire sa donne comme avant et donne seulement l'ordre de pose :
     onCard(k) affiche la k-ième carte, onDone() rend la main au joueur. `lead` laisse la table se vider
     avant la 1re carte, `tail` laisse la dernière carte atterrir avant la suite (plus courts aux vitesses
     rapides). Mouvement réduit / animations indisponibles / vitesse instantanée : tout d'un coup (onDone
     seul), exactement comme avant. Renvoie {skip, cancel} : skip() termine tout de suite. */
  const SPEED_KEY='grand-casino-deal-speed', SPEEDS=[0,500,1000,1500]; // millisecondes entre deux cartes
  C.DEAL_STEP_MS=1000;
  try{ const v=parseInt(localStorage.getItem(SPEED_KEY),10); if(SPEEDS.indexOf(v)>=0) C.DEAL_STEP_MS=v; }catch(e){}
  C.paceDeal=function(n,onCard,onDone,o){
    o=o||{};
    const gap=o.gap!=null?o.gap:C.DEAL_STEP_MS, k=Math.min(1,gap/1000);
    const lead=o.lead!=null?o.lead:Math.max(150,350*k), tail=o.tail!=null?o.tail:Math.max(450,650*k);
    const animated=root.classList.contains('deal-js')&&root.getAttribute('data-motion')!=='reduce'&&gap>0;
    let i=0, timer=null, over=false;
    const finish=()=>{ if(over) return; over=true; clearTimeout(timer); onDone&&onDone(); };
    if(!animated||!(n>0)){ finish(); return {skip(){}, cancel(){}}; }
    const next=()=>{
      if(over) return;
      onCard(i++);
      timer=setTimeout(i<n?next:finish, i<n?gap:tail);
    };
    timer=setTimeout(next,lead);
    return {skip:finish, cancel(){ over=true; clearTimeout(timer); }};
  };
  // Une seule carte posée (Ride the Bus, Hi-Lo...) : le résultat n'est annoncé qu'après un temps (C.DEAL_STEP_MS)
  // pour laisser la carte arriver et se retourner. Même contrat que paceDeal : onDone() puis {skip, cancel}.
  C.paceReveal=function(onDone,o){
    return C.paceDeal(1,function(){},onDone,Object.assign({lead:0,tail:C.DEAL_STEP_MS},o));
  };

  // ---- Réglage « Vitesse de distribution des cartes » (page Paramètres) : 4 vitesses, mémorisées (et incluses
  // dans les sauvegardes, voir EXTRA_KEYS de core.js) ; un petit aperçu pose 5 cartes au rythme choisi. ----
  const $=id=>document.getElementById(id);
  const speedBtns=Array.prototype.slice.call(document.querySelectorAll('#dealSpeed button'));
  const SPEED_HINT={0:'Toutes les cartes sont posées d’un coup.',500:'Environ 0,5 s entre deux cartes.',1000:'Environ 1 s entre deux cartes.',1500:'Environ 1,5 s entre deux cartes.'};
  const HINT_ALL=' S’applique au blackjack, baccarat, poker, vidéo poker, bataille, Ride the Bus et Hi-Lo ; un clic sur la table accélère toujours la distribution en cours.';
  const reducedNow=()=>root.getAttribute('data-motion')==='reduce';
  function syncSpeedUi(){
    speedBtns.forEach(b=>{ const on=parseInt(b.dataset.ms,10)===C.DEAL_STEP_MS; b.classList.toggle('on',on); b.setAttribute('aria-pressed',String(on)); });
    const hint=$('dealSpeedHint'); if(!hint) return;
    hint.textContent=reducedNow()
      ? 'Sans effet tant que « Réduire les animations » est activé : les cartes sont alors posées d’un coup.'
      : (SPEED_HINT[C.DEAL_STEP_MS]||'')+HINT_ALL;
  }
  let previewTimers=[];
  function previewSpeed(){
    const cards=Array.prototype.slice.call(document.querySelectorAll('#dealSpeedPreview i'));
    previewTimers.forEach(clearTimeout); previewTimers=[];
    cards.forEach(c=>c.classList.remove('on'));
    const step=reducedNow()?0:C.DEAL_STEP_MS;
    cards.forEach((c,k)=>{ previewTimers.push(setTimeout(()=>c.classList.add('on'),150+k*step)); });
  }
  C.setDealSpeed=function(ms){
    if(SPEEDS.indexOf(ms)<0) return;
    C.DEAL_STEP_MS=ms;
    try{ localStorage.setItem(SPEED_KEY,String(ms)); }catch(e){}
    syncSpeedUi();
  };
  speedBtns.forEach(b=>b.addEventListener('click',()=>{ C.setDealSpeed(parseInt(b.dataset.ms,10)); previewSpeed(); }));
  if($('dealSpeedTest')) $('dealSpeedTest').addEventListener('click',previewSpeed);
  if($('a11yMotion')) $('a11yMotion').addEventListener('click',()=>setTimeout(syncSpeedUi,0)); // le texte d'aide suit « Réduire les animations »
  syncSpeedUi();

  // Sans MutationObserver / Element.animate, aucune carte n'est animée : le réglage n'aurait aucun effet, on le masque.
  if(!window.MutationObserver||!Element.prototype.animate){ if($('dealSpeedRow')) $('dealSpeedRow').style.display='none'; return; }
  root.classList.add('deal-js');

  const GAP=170, FLIGHT=480, FLIP_AT=.55, MEM_TTL=90000;
  const memory=new Map();        // empreinte d'emplacement -> {labels, fly:{idx:{start,tilt,faceUp}}, t}
  const busyUntil=new WeakMap(); // table -> instant où le croupier est de nouveau libre
  // Nouvelle donne sur une table : on oublie ses cartes, sinon une carte identique à celle qui occupait
  // le même emplacement à la donne précédente serait prise pour « déjà posée » et arriverait sans vol.
  C.forgetCards=function(table){ memory.forEach((v,k)=>{ if(table&&(v.table===table||(v.table&&table.contains(v.table)))) memory.delete(k); }); };

  const labelOf=c=>{ const f=c.querySelector('.card-face'); return f?(f.dataset.label||f.textContent):''; };
  function keyOf(el){
    const parts=[]; let n=el;
    for(let i=0;i<7&&n&&n!==document.body;i++){
      if(n.id){ parts.push('#'+n.id); break; }
      const p=n.parentElement, idx=p?Array.prototype.indexOf.call(p.children,n):0;
      parts.push((String(n.className||'').split(' ')[0]||n.tagName)+':'+idx); n=p;
    }
    return parts.join('>');
  }
  const reduced=()=>root.getAttribute('data-motion')==='reduce';

  function originFor(card,table){
    const d=table.querySelector('.dealer[data-dealer="cards"] svg');
    if(d){ const r=d.getBoundingClientRect(); if(r.width) return {x:r.left+r.width*(112/120), y:r.top+r.height*(103/120), dealer:d.closest('.dealer')}; }
    const cont=card.parentElement.getBoundingClientRect();
    return {x:cont.left+cont.width/2, y:cont.top-70, dealer:null};
  }
  function toss(dealer,delay){
    setTimeout(()=>{
      C.sound&&C.sound('deal');
      const arm=dealer&&dealer.querySelector('.d-arm');
      if(arm&&arm.animate) arm.animate([
        {transform:'rotate(0deg)'},{transform:'rotate(-30deg) translateX(-2px)',offset:.4},{transform:'rotate(12deg)',offset:.75},{transform:'rotate(0deg)'}
      ],{duration:300,easing:'ease-out'});
    },delay);
  }
  // info : {start (instant epoch du départ du vol), tilt, faceUp}. Un vol déjà entamé (copie d'une carte
  // redessinée) reprend à la bonne avancée au lieu de repartir de zéro.
  function fly(card,o,info,announce){
    const now=Date.now(), until=info.start-now;            // > 0 : pas encore parti
    const flip=card.querySelector('.card-flip');
    const flipDelay=until+FLIGHT*FLIP_AT;
    const r=card.getBoundingClientRect();
    const dx=o.x-(r.left+r.width/2), dy=o.y-(r.top+r.height/2), tilt=info.tilt;
    if(info.faceUp&&flip&&flipDelay>0&&!flip.classList.contains('is-back')){
      flip.style.transition='none'; flip.classList.add('is-back'); void flip.offsetWidth; flip.style.transition='';
    }
    const anim=card.animate([
      {transform:'translate('+dx+'px,'+dy+'px) rotate('+(tilt-28)+'deg) scale(.5)',opacity:0,offset:0},
      {opacity:1,offset:.1},
      {transform:'translate('+(dx*.3)+'px,'+(dy*.3-22)+'px) rotate('+(tilt*.4)+'deg) scale(1.12)',offset:.6},
      {transform:'translate(0,0) rotate(0deg) scale(1)',opacity:1,offset:1}
    ],{duration:FLIGHT,delay:Math.max(0,until),easing:'cubic-bezier(.2,.75,.3,1)',fill:'both'});
    if(until<0) anim.currentTime=-until;
    anim.onfinish=anim.oncancel=()=>{ try{ anim.cancel(); }catch(e){} };
    if(info.faceUp&&flip&&flipDelay>0) setTimeout(()=>{ if(flip.isConnected) flip.classList.remove('is-back'); },flipDelay);
    if(announce) toss(o.dealer,Math.max(0,until));
  }

  const observer=new MutationObserver(records=>{
    const added=new Set(), cleared=new Set();
    records.forEach(rec=>{
      rec.addedNodes.forEach(n=>{
        if(n.nodeType!==1) return;
        if(n.classList.contains('card-3d')) added.add(n);
        else if(n.querySelectorAll) n.querySelectorAll('.card-3d').forEach(c=>added.add(c));
      });
      rec.removedNodes.forEach(n=>{
        if(n.nodeType===1&&n.classList&&n.classList.contains('card-3d')&&rec.target.isConnected) cleared.add(rec.target);
      });
    });
    if(!added.size&&!cleared.size) return;
    const now=Date.now(), groups=new Map();
    added.forEach(card=>{
      if(!card.isConnected||!card.parentElement) return;
      const cont=card.parentElement, key=keyOf(cont);
      if(!groups.has(key)) groups.set(key,{cont,cards:[]});
      groups.get(key).cards.push(card);
    });
    // Emplacements vidés sans être remplis dans la foulée : on oublie leurs cartes (nouvelle donne).
    cleared.forEach(cont=>{ const k=keyOf(cont); if(!groups.has(k)) memory.delete(k); });

    const fresh=[], resumed=[];   // vols à lancer / vols en cours à reprendre sur une nouvelle copie
    groups.forEach((g,key)=>{
      const mem=memory.get(key), ok=mem&&now-mem.t<MEM_TTL;
      const prev=ok?mem.labels:[], prevFly=ok?mem.fly:{};
      const kids=Array.from(g.cont.children).filter(k=>k.classList.contains('card-3d'));
      const entry={labels:kids.map(labelOf),fly:Object.assign({},prevFly),t:now,table:g.cont.closest('.bj-table')||g.cont.closest('.panel')||document.body};
      const list=[];
      g.cards.forEach(card=>{
        const i=kids.indexOf(card);
        if(prev[i]!==labelOf(card)){ list.push({card,i}); delete entry.fly[i]; }
        else { const f=prevFly[i]; if(f&&now<f.start+FLIGHT) resumed.push({card,info:f}); }
      });
      memory.set(key,entry);
      if(list.length) fresh.push({cont:g.cont,cards:list,entry});
    });
    if(reduced()) return;

    // Vols en cours : même départ, même inclinaison — simplement sur la nouvelle copie de la carte.
    resumed.forEach(({card,info})=>{
      if(!card.getClientRects().length) return;
      const table=card.closest('.bj-table')||card.closest('.panel')||document.body;
      fly(card,originFor(card,table),info,false);
    });

    // Nouvelles cartes, par table (le croupier distribue à une seule table à la fois).
    const byTable=new Map();
    fresh.forEach(f=>{
      const table=f.cont.closest('.bj-table')||f.cont.closest('.panel')||document.body;
      if(!byTable.has(table)) byTable.set(table,[]);
      byTable.get(table).push(f);
    });
    byTable.forEach((list,table)=>{
      // Alterne les mains en commençant par celle du bas de l'écran (le joueur), puis en remontant.
      list.sort((a,b)=>b.cont.getBoundingClientRect().top-a.cont.getBoundingClientRect().top);
      const seq=[], max=Math.max.apply(null,list.map(l=>l.cards.length));
      for(let i=0;i<max;i++) list.forEach(l=>{ if(l.cards[i]) seq.push({card:l.cards[i].card,i:l.cards[i].i,entry:l.entry}); });
      const start=Math.max(now,busyUntil.get(table)||0);
      let n=0;
      seq.forEach(s=>{
        if(!s.card.getClientRects().length) return;
        const flip=s.card.querySelector('.card-flip');
        const info={start:start+n*GAP,tilt:Math.random()*24-12,faceUp:!!flip&&!flip.classList.contains('is-back')};
        s.entry.fly[s.i]=info;
        fly(s.card,originFor(s.card,table),info,true); n++;
      });
      if(n) busyUntil.set(table,start+(n-1)*GAP+160);
    });
  });
  observer.observe(document.body,{childList:true,subtree:true});
})();
