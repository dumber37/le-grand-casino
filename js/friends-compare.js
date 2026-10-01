/* ============================================================
   COMPARATEUR DE STATS ENTRE AMIS — dans le Salon entre amis déjà
   existant (friends.js, WebRTC), échange un résumé ANONYME (solde,
   total misé, plus gros gain, jeu favori) avec les joueurs connectés,
   affiché côte à côte. Réutilise C.friends.onMsg/sendPeer/sendHost
   (même passerelle que le Poker multijoueur) avec un nouveau préfixe
   de message "st_" — aucune donnée envoyée nulle part ailleurs que
   directement à l'ami connecté (pas de serveur, voir friends.js).
   ============================================================ */
window.Casino = window.Casino || {};
(function(){
  const C = window.Casino, $=id=>document.getElementById(id);
  const btn=$('fr-compareBtn'), box=$('fr-compareBox');
  if(!btn || !box || !C.friends) return;

  const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function mySummary(){
    const s=C.getStatsSummary?C.getStatsSummary():{gamesPlayed:0,totalWon:0,biggestWin:0,favGame:null};
    return {name:C.friends.name(), balance:C.state.balance, wagered:C.state.totalWagered,
      gamesPlayed:s.gamesPlayed, totalWon:s.totalWon, biggestWin:s.biggestWin, favGame:s.favGame||'–'};
  }
  const ROWS=[['Solde actuel','balance'],['Total misé','wagered'],['Parties jouées','gamesPlayed'],
    ['Total gagné','totalWon'],['Plus gros gain','biggestWin'],['Jeu favori','favGame']];
  function renderTable(list){
    let html='<table class="fr-compare-table"><thead><tr><th></th>'+list.map(p=>'<th>'+escapeHtml(p.name)+'</th>').join('')+'</tr></thead><tbody>';
    html+=ROWS.map(([label,key])=>'<tr><td>'+label+'</td>'+list.map(p=>'<td>'+p[key]+'</td>').join('')+'</tr>').join('');
    html+='</tbody></table>';
    box.innerHTML=html; box.style.display='block';
  }

  let pending={};
  btn.addEventListener('click',()=>{
    const role=C.friends.role();
    if(role==='host'){
      const peers=C.friends.peers();
      if(!peers.length){ box.innerHTML='<p class="empty-state">Aucun ami connecté pour comparer.</p>'; box.style.display='block'; return; }
      pending={};
      renderTable([mySummary()].concat(peers.map(p=>({name:p.name,balance:'…',wagered:'…',gamesPlayed:'…',totalWon:'…',biggestWin:'…',favGame:'…'}))));
      peers.forEach(p=>C.friends.sendPeer(p.id,{t:'st_req'}));
    } else if(role==='guest'){
      box.innerHTML='<p class="empty-state">Demande envoyée, en attente de la réponse de l’hôte...</p>'; box.style.display='block';
      C.friends.sendHost({t:'st_req'});
    } else {
      box.innerHTML='<p class="empty-state">Rejoins ou crée d’abord un salon.</p>'; box.style.display='block';
    }
  });

  C.friends.onMsg((m, peerId)=>{
    if(m.t==='st_req'){
      const payload={t:'st_res', summary:mySummary()};
      if(peerId!=null) C.friends.sendPeer(peerId, payload); else C.friends.sendHost(payload);
    } else if(m.t==='st_res'){
      if(C.friends.role()==='host'){
        pending[peerId]=m.summary;
        const peers=C.friends.peers();
        renderTable([mySummary()].concat(peers.map(p=>pending[p.id]||{name:p.name,balance:'…',wagered:'…',gamesPlayed:'…',totalWon:'…',biggestWin:'…',favGame:'…'})));
      } else {
        renderTable([mySummary(), m.summary]);
      }
    }
  });

  // La comparaison affichée peut devenir périmée (nouvelle partie, départ d'un ami) : la masquer
  // au lieu de montrer des chiffres faux — redemander suffit pour la rafraîchir.
  document.addEventListener('friends-changed',()=>{ box.style.display='none'; pending={}; });
})();
