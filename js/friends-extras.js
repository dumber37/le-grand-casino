/* ============================================================
   SALON ENTRE AMIS — réactions rapides et classement en direct.
   Réactions : uniquement des messages prédéfinis (on envoie un NUMÉRO,
   jamais de texte libre : rien à filtrer, aucun contenu inapproprié
   possible). Classement : chacun envoie son gain net depuis son arrivée
   dans le salon ; l'hôte rassemble et rediffuse le tableau à tous. Même
   passerelle que le comparateur de stats (préfixe de messages "st_").
   ============================================================ */
(function(){
  const C=window.Casino, $=id=>document.getElementById(id);
  const reactEl=$('fr-react'), feedEl=$('fr-feed'), rankEl=$('fr-rank'), tableEl=$('fr-table');
  if(!reactEl||!rankEl||!C.friends) return;
  const F=C.friends;

  // ---------- Réactions ----------
  const REACTS=[['👏','Bravo !'],['😱','Incroyable !'],['😂','Ha ha !'],['🔥','En feu !'],['👍','OK'],['🤝','Bien joué'],['😅','Aïe…'],['🔁','On refait une ?']];
  reactEl.innerHTML=REACTS.map((r,i)=>'<button type="button" data-react="'+i+'" title="'+r[1]+'" aria-label="'+r[1]+'">'+r[0]+'</button>').join('');
  let lastSend=0;
  function showReaction(name,k){
    if(!(k>=0&&k<REACTS.length)) return;
    const line=document.createElement('div'); line.className='fr-feed-line';
    line.textContent=REACTS[k][0]+' '+String(name).slice(0,20)+' : '+REACTS[k][1];
    feedEl.appendChild(line); while(feedEl.children.length>4) feedEl.removeChild(feedEl.firstChild);
    setTimeout(()=>{ if(line.parentNode) line.parentNode.removeChild(line); },9000);
    const f=document.createElement('span'); f.className='fr-float'; f.textContent=REACTS[k][0];
    f.style.left=(15+Math.random()*70)+'%'; tableEl.appendChild(f); setTimeout(()=>f.remove(),1800);
  }
  reactEl.addEventListener('click',e=>{
    const b=e.target.closest('[data-react]'); if(!b||!F.role()) return;
    const now=Date.now(); if(now-lastSend<1200) return; lastSend=now;
    const k=parseInt(b.dataset.react,10);
    showReaction('Toi',k);
    if(F.role()==='host') F.peers().forEach(p=>F.sendPeer(p.id,{t:'st_chat',k,from:F.name()}));
    else F.sendHost({t:'st_chat',k});
  });

  // ---------- Classement de la session ----------
  let base=null, data={}, rows=[], tRank=null, tSend=null;
  const myNet=()=>C.state.balance-(base==null?C.state.balance:base);
  function renderRank(list){
    rows=list;
    if(!list.length){ rankEl.innerHTML=''; return; }
    const sorted=list.slice().sort((a,b)=>b.net-a.net), medals=['🥇','🥈','🥉'];
    rankEl.innerHTML='<div class="fr-rank-title">Classement de la session <small>(gain net depuis l’arrivée)</small></div>'
      +sorted.map((r,i)=>'<div class="fr-rank-row"><span>'+(medals[i]||'▫️')+' '+C.escapeHtml(r.n)+'</span><b class="'+(r.net>0?'pos':(r.net<0?'neg':''))+'">'+(r.net>0?'+':'')+r.net+'</b></div>').join('');
  }
  function hostRows(){
    const me={n:F.name()+' (toi)', net:myNet()};
    return [me].concat(F.peers().map(p=>({n:p.name, net:(data[p.id]&&data[p.id].net)||0})));
  }
  function hostPublish(){
    if(F.role()!=='host') return;
    clearTimeout(tRank);
    tRank=setTimeout(()=>{
      const list=hostRows();
      renderRank(list);
      const wire=list.map(r=>({n:r.n.replace(' (toi)',''),net:r.net}));
      F.peers().forEach((p,i)=>{
        // chaque invité reçoit le tableau avec SA ligne marquée « (toi) »
        F.sendPeer(p.id,{t:'st_rank',rows:wire,me:i+1});
      });
    },700);
  }
  function sendMine(){
    if(F.role()==='guest'){ clearTimeout(tSend); tSend=setTimeout(()=>F.sendHost({t:'st_bal',net:myNet()}),1500); }
    else if(F.role()==='host') hostPublish();
  }
  document.addEventListener('balance-changed',()=>{ if(base!=null) sendMine(); });
  document.addEventListener('friends-changed',()=>{
    const role=F.role();
    if(!role){ base=null; data={}; renderRank([]); feedEl.innerHTML=''; return; }
    if(base==null){ base=C.state.balance; }
    if(role==='host') hostPublish(); else sendMine();
  });

  F.onMsg((m,peerId)=>{
    if(m.t==='st_chat'){
      const k=parseInt(m.k,10);
      if(peerId!=null){ // hôte : le nom vient de la connexion
        const p=F.peers().find(x=>x.id===peerId); if(!p) return;
        showReaction(p.name,k);
        F.peers().forEach(q=>{ if(q.id!==peerId) F.sendPeer(q.id,{t:'st_chat',k,from:p.name}); });
      } else showReaction(m.from,k);
    } else if(m.t==='st_bal'&&peerId!=null){
      const net=parseInt(m.net,10); if(!isFinite(net)||Math.abs(net)>1e9) return;
      data[peerId]={net}; hostPublish();
    } else if(m.t==='st_rank'&&peerId==null&&Array.isArray(m.rows)){
      const list=m.rows.slice(0,6).map((r,i)=>({n:String(r&&r.n).slice(0,20)+(i===m.me?' (toi)':''), net:parseInt(r&&r.net,10)||0}));
      renderRank(list);
    }
  });
  F.onPeerLeft(id=>{ delete data[id]; hostPublish(); });
})();
