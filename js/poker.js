/* ============================================================
   POKER TEXAS HOLD'EM — toi, des amis (multijoueur) et des IA.
   Blinds, relances, tapis, pots annexes, abattage. Ton solde est le
   solde partagé du casino (déduit au fil des mises, crédité au gain) ;
   les piles des IA sont virtuelles (elles se recavent seules).
   La main est enregistrée une seule fois par joueur via C.recordGame,
   comme tous les autres jeux (stats, historique, missions, VIP...).
   Les IA ne voient JAMAIS tes cartes : chacune estime sa probabilité de
   gagner à partir de ses seules cartes + du tableau (simulation).

   MULTIJOUEUR : l'hôte (celui qui a créé le salon dans « Salon entre
   amis ») fait autorité — il gère le paquet, les tours et les pots.
   Chaque ami reçoit un instantané PERSONNALISÉ de la table (ses cartes
   visibles, celles des autres cachées jusqu'à l'abattage) et renvoie
   ses actions. Chacun garde son propre solde : ses mises sont déduites
   au fil de la main sur son navigateur, son gain crédité à la fin.
   ============================================================ */
(function(){
  const C=window.Casino;

  // ---------- Évaluateur de mains (meilleures 5 cartes parmi 7) ----------
  const RV={A:14,K:13,Q:12,J:11};
  const rv=c=>RV[c.r]||parseInt(c.r,10);
  const HAND_NAMES=['Carte haute','Paire','Deux paires','Brelan','Quinte','Couleur','Full','Carré','Quinte flush'];
  const CAT_UNIT=759375; // 15^5 : score = catégorie * 15^5 + départage
  function score5(cs){
    const v=cs.map(rv).sort((a,b)=>b-a);
    const flush=cs.every(c=>c.s===cs[0].s);
    let straightHigh=0;
    if(new Set(v).size===5){ if(v[0]-v[4]===4) straightHigh=v[0]; else if(v[0]===14&&v[1]===5) straightHigh=5; }
    const cnt={}; v.forEach(x=>cnt[x]=(cnt[x]||0)+1);
    const g=Object.keys(cnt).map(k=>[+k,cnt[k]]).sort((a,b)=>b[1]-a[1]||b[0]-a[0]);
    let cat,tb;
    if(straightHigh&&flush){cat=8;tb=[straightHigh];}
    else if(g[0][1]===4){cat=7;tb=g.map(x=>x[0]);}
    else if(g[0][1]===3&&g[1][1]===2){cat=6;tb=g.map(x=>x[0]);}
    else if(flush){cat=5;tb=v;}
    else if(straightHigh){cat=4;tb=[straightHigh];}
    else if(g[0][1]===3){cat=3;tb=g.map(x=>x[0]);}
    else if(g[0][1]===2&&g[1][1]===2){cat=2;tb=g.map(x=>x[0]);}
    else if(g[0][1]===2){cat=1;tb=g.map(x=>x[0]);}
    else {cat=0;tb=v;}
    let s=cat; for(let i=0;i<5;i++) s=s*15+(tb[i]||0);
    return s;
  }
  function best7(cs){
    const n=cs.length; let b=-1;
    for(let a=0;a<n-1;a++) for(let c=a+1;c<n;c++){
      const s=score5(cs.filter((_,i)=>i!==a&&i!==c)); if(s>b) b=s;
    }
    return b;
  }
  // Probabilité de gagner (Monte-Carlo) contre nOpp mains adverses aléatoires.
  function equity(hole,board,nOpp,sims){
    const key=c=>c.r+c.s, known=new Set(hole.concat(board).map(key));
    const rest=C.newDeck().filter(c=>!known.has(key(c)));
    const missing=5-board.length; let wins=0;
    for(let i=0;i<sims;i++){
      const need=missing+2*nOpp;
      for(let j=0;j<need;j++){ const r=j+Math.floor(Math.random()*(rest.length-j)); const t=rest[j]; rest[j]=rest[r]; rest[r]=t; }
      const full=board.concat(rest.slice(0,missing));
      const mine=best7(hole.concat(full));
      let idx=missing, res=1;
      for(let o=0;o<nOpp;o++){
        const os=best7([rest[idx],rest[idx+1]].concat(full)); idx+=2;
        if(os>mine){res=0;break;} if(os===mine) res=Math.min(res,0.5);
      }
      wins+=res;
    }
    return wins/sims;
  }

  // ---------- Éléments d'interface ----------
  const el=id=>document.getElementById(id);
  const seatsEl=el('pk-seats'), meEl=el('pk-me'), boardEl=el('pk-board'), potEl=el('pk-pot'), msg=el('pk-message');
  const feltEl=document.querySelector('#view-poker .pk-table');
  const actionsEl=el('pk-actions'), foldBtn=el('pk-foldBtn'), callBtn=el('pk-callBtn'), raiseBox=el('pk-raiseBox');
  const rAmountEl=el('pk-rAmount'), rMinus=el('pk-rMinus'), rPlus=el('pk-rPlus'), raiseBtn=el('pk-raiseBtn');
  const dealBtn=el('pk-dealBtn'), dealRow=el('pk-dealRow'), tablesEl=el('pk-tables');
  const mpEl=el('pk-mp'), mpInfo=el('pk-mpInfo'), fillEl=el('pk-fill');
  const F=()=>C.friends;

  // ---------- État de la partie ----------
  const AI_DEFS=[
    {name:'Marco', icon:'🎩', tight:0.00, aggr:0.55, bluff:0.10}, // agressif
    {name:'Léa',   icon:'🦊', tight:0.08, aggr:0.28, bluff:0.03}, // prudente
    {name:'Victor',icon:'🐺', tight:0.03, aggr:0.42, bluff:0.06}  // équilibré
  ];
  const TABLE_SEATS=4;                 // sièges visés : humains d'abord, complétés par des IA
  const REMOTE_TURN_MS=60000;          // un ami qui ne joue pas est couché / checké d'office
  let sb=10, bb=20, aiPool=AI_DEFS.map(d=>Object.assign({kind:'ai',stack:50*20},d));
  let players=[], deck=[], board=[], dealer=-1, street='', currentBet=0, minRaise=20;
  let turn=0, handActive=false, pendingHuman=-1, handNo=0, lastMsg='Choisis tes blinds puis lance une main.';
  let timer=null, turnTimer=null, inHandler=null;
  let view=null, raiseTo=0, lastActKey='', renderedBoard=0, renderedBoardNo=-1;
  let guestMode=false, guestInvested=0;   // guestMode : je suis assis à la table d'un ami (hôte)
  // Deux modes séparés : 'ai' = classique, contre les IA (les amis connectés sont ignorés) ;
  // 'multi' = contre de vrais joueurs (salon entre amis), complété ou non par des IA.
  const MODE_KEY='grand-casino-mode-poker';
  let gameMode='ai'; try{ if(localStorage.getItem(MODE_KEY)==='multi') gameMode='multi'; }catch(e){}
  const switchBtns=document.querySelectorAll('.mode-switch[data-mode-for="poker"] button');
  const switchBox=document.querySelector('.mode-switch[data-mode-for="poker"]');

  function resetP(p){ p.hole=[]; p.folded=false; p.allIn=false; p.bet=0; p.total=0; p.acted=false; p.lastAction=''; p.reveal=false; p.handName=''; p.won=0; p.score=0; }
  const stackOf=p=>p.kind==='local'?C.state.balance:p.stack;
  const potTotal=()=>players.reduce((s,p)=>s+p.total,0);
  const canAct=p=>!p.folded&&!p.allIn;
  const isHostRole=()=>!!(F()&&F().role()==='host');
  function say(t){ lastMsg=t; msg.textContent=t; }

  function putIn(p,amt){
    amt=Math.max(0,Math.min(amt,stackOf(p)));
    if(p.kind==='local'){ C.state.balance-=amt; C.trackWager(amt); C.saveBalance(); C.renderBalance(); }
    else { p.stack-=amt; if(p.kind==='remote'&&amt>0) F().sendPeer(p.peerId,{t:'pk_chips',delta:-amt}); }
    p.bet+=amt; p.total+=amt;
    if(stackOf(p)===0) p.allIn=true;
    return amt;
  }

  // ---------- Instantané (ce que voit un joueur donné) ----------
  function actInfo(p){
    const toCall=currentBet-p.bet, st=stackOf(p), maxTo=p.bet+st;
    return {toCall:Math.max(0,toCall), stack:st, bet:p.bet, currentBet, minRaise, pot:potTotal(), sb, bb,
      maxTo, minTo:Math.min(maxTo,currentBet+minRaise), canRaise:st>toCall};
  }
  function snapshot(viewer){
    const me=players[viewer];
    const seats=players.map((p,i)=>({
      name:p.name, icon:p.icon, kind:p.kind, stack:stackOf(p), bet:p.bet, folded:p.folded, allIn:p.allIn,
      av:p.kind==='local'?(C.avatars?C.avatars.myTraits():null):(p.av||null),
      lastAction:p.lastAction, handName:p.handName, won:p.won, dealer:i===dealer,
      turn:handActive&&turn===i&&!p.folded, hole:(i===viewer||p.reveal||p.folded)?p.hole:null, nHole:p.hole.length
    }));
    const act=(handActive&&pendingHuman===viewer&&me)?actInfo(me):null;
    let text=lastMsg;
    if(act) text='À toi de jouer — '+(act.toCall>0?'à payer : '+Math.min(act.toCall,act.stack):'tu peux checker')+'.';
    return {seats,me:viewer,board:board.slice(),pot:potTotal(),street,handActive,handNo,msg:text,act,sb,bb};
  }

  // ---------- Rendu (identique pour l'hôte, le solo et les invités : tout vient d'un instantané) ----------
  function seatEl(s,i,isMe,st){
    const d=document.createElement('div');
    d.className='pk-seat'+(isMe?' pk-me-seat':'')+(s.folded?' folded':'')+(s.turn?' turn':'')+(!st.handActive&&s.won>0?' win':'');
    const av=document.createElement('div'); av.className='pk-av';
    const px=isMe?40:30;
    av.innerHTML=C.avatars?(isMe?C.avatars.html('Toi',px):(C.avatars.htmlTraits(s.av,px)||C.avatars.html(s.name,px))):s.icon;
    const nm=document.createElement('div'); nm.className='pk-name'; nm.textContent=s.name+(isMe&&s.kind!=='ai'&&s.name!=='Toi'?' (toi)':'');
    if(s.dealer&&s.nHole){ const b=document.createElement('span'); b.className='pk-dealer'; b.textContent='D'; nm.appendChild(b); }
    const stk=document.createElement('div'); stk.className='pk-stack'; stk.textContent='💰 '+s.stack;
    const row=document.createElement('div'); row.className='pk-cards';
    if(s.hole&&s.hole.length) s.hole.forEach(c=>row.appendChild(C.renderCard(c,false,isMe)));
    else for(let k=0;k<s.nHole;k++) row.appendChild(C.renderCard({r:'?',s:'♠'},true,false));
    const info=document.createElement('div'); info.className='pk-info';
    let t=s.folded?'Couché':s.lastAction;
    if(s.handName) t=s.handName+(s.won>0?' · +'+s.won:'');
    else if(!st.handActive&&s.won>0) t='+'+s.won;
    info.textContent=t;
    d.appendChild(av); d.appendChild(nm); d.appendChild(stk); d.appendChild(row); d.appendChild(info);
    if(s.bet>0&&st.handActive&&C.chips){ const b=document.createElement('div'); b.className='pk-bet'; b.innerHTML=C.chips.html(s.bet,{scale:.75}); d.appendChild(b); }
    return d;
  }
  function draw(s){
    view=s;
    potEl.textContent='Pot : '+s.pot;
    const pc=el('pk-potChips'); if(pc) pc.innerHTML=(s.handActive&&s.pot>0&&C.chips)?C.chips.html(s.pot,{scale:.95,maxCols:5}):'';
    if(s.handNo!==renderedBoardNo){ renderedBoard=0; renderedBoardNo=s.handNo; }
    boardEl.innerHTML='';
    for(let i=0;i<5;i++){
      if(s.board[i]){ const c=C.renderCard(s.board[i],false,true); if(i>=renderedBoard) c.classList.add('pk-new'); boardEl.appendChild(c); }
      else { const sl=document.createElement('div'); sl.className='pk-slot'; boardEl.appendChild(sl); }
    }
    renderedBoard=s.board.length;
    const others=[]; for(let k=1;k<s.seats.length;k++){ const i=(s.me+k)%s.seats.length; others.push(i); }
    seatsEl.innerHTML=''; seatsEl.style.gridTemplateColumns='repeat('+Math.max(1,Math.min(others.length,3))+',1fr)';
    others.forEach(i=>seatsEl.appendChild(seatEl(s.seats[i],i,false,s)));
    meEl.innerHTML=''; if(s.seats[s.me]) meEl.appendChild(seatEl(s.seats[s.me],s.me,true,s));
    msg.textContent=s.msg;
    dealRow.style.display=(s.handActive||guestMode)?'none':'flex';
    dealBtn.disabled=s.handActive||guestMode||C.state.balance<bb;
    tablesEl.style.display=guestMode?'none':'';
    tablesEl.querySelectorAll('button').forEach(b=>b.disabled=s.handActive);
    updateActions(s);
    updateMp();
  }
  function updateActions(s){
    const a=s.act;
    if(!a){ actionsEl.style.display='none'; return; }
    const key=s.handNo+'|'+s.street+'|'+a.currentBet+'|'+a.bet;
    if(key!==lastActKey){ lastActKey=key; raiseTo=0; }
    actionsEl.style.display='block';
    const toCall=Math.min(a.toCall,a.stack);
    callBtn.textContent=a.toCall<=0?'Check':(toCall>=a.stack?'Tapis '+toCall:'Suivre '+toCall);
    raiseBox.style.display=a.canRaise?'block':'none';
    raiseTo=Math.max(a.minTo,Math.min(raiseTo||a.minTo,a.maxTo));
    rAmountEl.textContent=raiseTo;
    raiseBtn.textContent=raiseTo>=a.maxTo?'TAPIS '+raiseTo:(a.currentBet===0?'MISER ':'RELANCER À ')+raiseTo;
  }
  function updateMp(){
    switchBtns.forEach(b=>b.classList.toggle('sel',b.dataset.mode===gameMode));
    if(switchBox) switchBox.style.display=guestMode?'none':'';
    if(!mpEl) return;
    const role=F()&&F().role(), n=(F()&&role==='host')?F().peers().length:0;
    if(guestMode||role==='guest'){ mpEl.style.display='flex'; mpInfo.textContent=guestMode?'🤝 Tu joues à la table de l’hôte — c’est lui qui lance les mains.':'🤝 Connecté à un salon : l’hôte peut lancer une partie de poker.'; fillEl.parentNode.style.display='none'; }
    else if(gameMode==='multi'){
      mpEl.style.display='flex';
      mpInfo.textContent=role==='host'?(n?'🤝 '+n+' ami'+(n>1?'s':'')+' à la table':'🤝 Salon ouvert — invite des amis depuis « Salon entre amis ».'):'🤝 Aucun salon ouvert — crées-en un dans « Salon entre amis » pour jouer avec tes amis.';
      fillEl.parentNode.style.display=role==='host'?'':'none';
    }
    else { mpEl.style.display='none'; }
  }
  function setMode(m){
    if(handActive||guestMode||(m!=='ai'&&m!=='multi')) return;
    gameMode=m; try{ localStorage.setItem(MODE_KEY,m); }catch(e){}
    say(m==='ai'?'Mode classique : tu joues contre les IA.':'Mode multijoueur : joue avec tes amis (salon entre amis).');
    updateMp();
  }
  function render(){
    if(!players.length) return;
    draw(snapshot(0));
    players.forEach((p,i)=>{ if(p.kind==='remote') F().sendPeer(p.peerId,Object.assign({t:'pk_state'},snapshot(i))); });
  }

  // ---------- Déroulé de la main (hôte / solo) ----------
  const schedule=(fn,ms)=>{ clearTimeout(timer); timer=setTimeout(fn,ms); };
  function startHand(){
    if(handActive||guestMode) return;
    if(C.state.balance<bb){ say('Solde insuffisant pour ces blinds ('+bb+' minimum).'); return; }
    const peers=(gameMode==='multi'&&isHostRole())?F().peers():[];
    if(gameMode==='multi'&&!peers.length){ say('Mode multijoueur : ouvre un salon (« Salon entre amis ») et invite au moins un ami — ou passe en mode classique.'); return; }
    if(!peers.length) return begin([]);
    // On demande à chaque ami son solde actuel avant de le faire asseoir.
    const waiting=new Set(peers.map(p=>p.id)), bals={};
    let done=false;
    const finish=()=>{ if(done) return; done=true; clearTimeout(t); inHandler=null;
      peers.forEach(p=>{ if(!(bals[p.id]>=bb)) F().sendPeer(p.id,{t:'pk_msg',text:'Pas assez de jetons pour ces blinds — tu passes cette main.'}); });
      begin(peers.filter(p=>bals[p.id]>=bb).map(p=>({id:p.id,name:p.name,bal:bals[p.id],av:p.av}))); };
    const t=setTimeout(finish,2000);
    inHandler=(m,id)=>{ if(m.t==='pk_in'&&waiting.has(id)){ bals[id]=parseInt(m.bal,10)||0; waiting.delete(id); if(!waiting.size) finish(); } };
    peers.forEach(p=>F().sendPeer(p.id,{t:'pk_join',sb,bb}));
    say('Invitation des amis à la table...');
  }
  function begin(remotes){
    // Un ami qui s'est déconnecté entre l'invitation et la distribution ne prend pas place.
    const livePeers=(gameMode==='multi'&&isHostRole())?F().peers():[];
    remotes=remotes.filter(r=>livePeers.some(p=>p.id===r.id));
    const multi=remotes.length>0;
    const local={kind:'local',name:multi?F().name():'Toi',icon:'🙂'};
    const rem=remotes.map(r=>({kind:'remote',peerId:r.id,name:r.name,icon:'🧑',stack:r.bal,av:r.av}));
    const humans=1+rem.length;
    aiPool.forEach(p=>{ if(p.stack<bb) p.stack=50*bb; });
    const ais=(humans<2||fillEl.checked)?aiPool.slice(0,Math.max(0,TABLE_SEATS-humans)):[];
    players=[local].concat(rem,ais);
    if(players.length<2){ say('Il faut au moins deux joueurs à la table.'); players=[]; return; }
    players.forEach(resetP);
    deck=C.newDeck(); board=[]; renderedBoard=0; street='preflop'; handNo++;
    const N=players.length;
    dealer=((dealer+1)%N+N)%N;
    players.forEach(p=>{ p.hole=[deck.pop(),deck.pop()]; });
    C.sound&&C.sound('card');
    const sbI=N===2?dealer:(dealer+1)%N, bbI=N===2?(dealer+1)%N:(dealer+2)%N;
    putIn(players[sbI],sb); players[sbI].lastAction='Petite blind '+sb;
    putIn(players[bbI],bb); players[bbI].lastAction='Grosse blind '+bb;
    currentBet=Math.max.apply(null,players.map(p=>p.bet)); minRaise=bb;
    turn=(bbI+1)%N; handActive=true; pendingHuman=-1;
    say('Nouvelle main — blinds '+sb+'/'+bb+(multi?' — '+players.filter(p=>p.kind!=='ai').length+' joueurs humains.':'.'));
    render(); schedule(step,700);
  }
  function roundOver(){
    const alive=players.filter(p=>!p.folded);
    if(alive.length<=1) return true;
    const actors=alive.filter(canAct);
    if(actors.length===0) return true;
    if(actors.length===1&&actors[0].bet>=currentBet) return true;
    return actors.every(p=>p.acted&&p.bet===currentBet);
  }
  function step(){
    if(!handActive) return;
    if(players.filter(p=>!p.folded).length===1) return settle(false);
    if(roundOver()) return advanceStreet();
    const N=players.length; let idx=-1;
    for(let k=0;k<N;k++){ const i=(turn+k)%N,p=players[i]; if(canAct(p)&&(!p.acted||p.bet<currentBet)){ idx=i; break; } }
    if(idx<0) return advanceStreet();
    turn=idx; const p=players[idx];
    if(p.kind==='ai'){ pendingHuman=-1; render(); schedule(()=>aiAct(p),650+Math.random()*550); return; }
    pendingHuman=idx; render();
    if(p.kind==='remote'){
      clearTimeout(turnTimer);
      turnTimer=setTimeout(()=>{ if(handActive&&pendingHuman===idx) act(p,(currentBet-p.bet>0)?'fold':'check'); },REMOTE_TURN_MS);
    }
  }
  function act(p,type,to){
    clearTimeout(turnTimer);
    const toCall=currentBet-p.bet, opening=currentBet===0;
    if(type==='fold'){ p.folded=true; p.lastAction='Couché'; }
    else if(type==='check'||(type==='call'&&toCall<=0)){ p.lastAction='Check'; }
    else if(type==='call'){ const a=putIn(p,toCall); p.lastAction=p.allIn?'Tapis '+a:'Suit '+a; }
    else {
      const maxTo=p.bet+stackOf(p);
      let target=Math.min(Number(to)||0,maxTo);
      if(target<maxTo) target=Math.max(target,currentBet+minRaise);
      target=Math.min(target,maxTo);
      if(target<=currentBet){ const a=putIn(p,toCall); p.lastAction=p.allIn?'Tapis '+a:'Suit '+a; }
      else {
        putIn(p,target-p.bet);
        const size=p.bet-currentBet; if(size>=minRaise) minRaise=size;
        currentBet=p.bet;
        players.forEach(q=>{ if(q!==p&&canAct(q)) q.acted=false; });
        p.lastAction=p.allIn?'Tapis '+p.bet:(opening?'Mise ':'Relance ')+p.bet;
      }
    }
    p.acted=true; pendingHuman=-1; turn=(players.indexOf(p)+1)%players.length;
    if(p.kind!=='local') lastMsg=p.icon+' '+p.name+' : '+p.lastAction+'.';
    render(); schedule(step,450);
  }
  function advanceStreet(){
    players.forEach(p=>{ p.bet=0; p.acted=false; });
    currentBet=0; minRaise=bb; pendingHuman=-1;
    if(street==='preflop'){ board.push(deck.pop(),deck.pop(),deck.pop()); street='flop'; }
    else if(street==='flop'){ board.push(deck.pop()); street='turn'; }
    else if(street==='turn'){ board.push(deck.pop()); street='river'; }
    else return settle(true);
    C.sound&&C.sound('card');
    turn=N2(dealer+1);
    render(); schedule(step,900);
  }
  const N2=i=>((i%players.length)+players.length)%players.length;

  // ---------- IA ----------
  function aiAct(p){
    if(!handActive) return;
    const toCall=Math.min(currentBet-p.bet,p.stack);
    const opp=players.filter(q=>!q.folded&&q!==p).length;
    const pot=potTotal();
    const eq=equity(p.hole,board,opp,street==='preflop'?140:110)+(Math.random()-0.5)*0.08;
    const fair=1/(opp+1), strong=fair+0.22, medium=fair+0.06;
    const potOdds=toCall/(pot+toCall||1);
    const r=Math.random();
    const raiseSize=()=>{
      const base=Math.max(pot*(0.45+Math.random()*0.55)*(eq>strong?1.25:1),street==='preflop'?bb*2:bb);
      return currentBet+Math.max(minRaise,Math.round(base/sb)*sb);
    };
    if(toCall<=0){
      if(eq>strong&&r<p.aggr+0.3) return act(p,'raise',raiseSize());
      if(eq>medium&&r<p.aggr*0.8) return act(p,'raise',raiseSize());
      if(r<p.bluff) return act(p,'raise',raiseSize());
      return act(p,'check');
    }
    const cheap=toCall<=bb&&street==='preflop'&&eq>fair-0.08;
    if(eq<potOdds+p.tight&&!cheap) return act(p,'fold');
    if(eq>strong&&r<p.aggr+0.25) return act(p,'raise',raiseSize());
    return act(p,'call');
  }

  // ---------- Fin de main : pots annexes + abattage ----------
  function settle(showdown){
    clearTimeout(timer); clearTimeout(turnTimer); handActive=false; pendingHuman=-1;
    const alive=players.filter(p=>!p.folded);
    if(showdown) alive.forEach(p=>{ p.reveal=true; p.score=best7(p.hole.concat(board)); p.handName=HAND_NAMES[Math.floor(p.score/CAT_UNIT)]; });
    const contrib=players.map(p=>p.total), pots=[];
    while(contrib.some(x=>x>0)){
      const pos=[]; contrib.forEach((x,i)=>{ if(x>0) pos.push(i); });
      const m=Math.min.apply(null,pos.map(i=>contrib[i]));
      const amount=m*pos.length;
      const elig=pos.filter(i=>!players[i].folded);
      pos.forEach(i=>{ contrib[i]-=m; });
      if(elig.length) pots.push({amount,elig});
      else if(pots.length) pots[pots.length-1].amount+=amount;
    }
    const win=players.map(()=>0);
    pots.forEach(pot=>{
      let winners=pot.elig;
      if(showdown){ const top=Math.max.apply(null,pot.elig.map(i=>players[i].score)); winners=pot.elig.filter(i=>players[i].score===top); }
      const share=Math.floor(pot.amount/winners.length); let rem=pot.amount-share*winners.length;
      winners.forEach(i=>{ win[i]+=share+(rem>0?1:0); if(rem>0) rem--; });
    });
    players.forEach((p,i)=>{
      p.won=win[i];
      if(p.kind==='local') C.state.balance+=win[i];
      else { p.stack+=win[i]; if(p.kind==='remote') F().sendPeer(p.peerId,{t:'pk_end',total:p.total,won:win[i]}); }
    });
    C.saveBalance(); C.renderBalance();
    const me=players[0];
    const winners=players.filter(p=>p.won>0);
    // Sans abattage (tout le monde s'est couché), le gagnant montre quand même sa main.
    winners.forEach(p=>{ p.reveal=true; });
    const txt=winners.map(p=>(p.kind==='local'&&p.name==='Toi'?'Tu remportes ':p.icon+' '+p.name+' remporte ')+p.won+(showdown&&p.handName?' ('+p.handName+')':'')).join(' · ');
    say((showdown?'Abattage — ':'')+txt+'.');
    C.recordGame('poker',me.total,me.won);
    if(me.won>me.total) C.flashWin(msg); else if(me.won===0) C.flashLoss(feltEl);
    render();
    if(C.state.balance<bb) say(lastMsg+' Solde insuffisant pour la prochaine main.');
  }

  // ---------- Commandes du joueur (local : hôte/solo ou invité) ----------
  function submit(type,to){
    if(guestMode){
      if(!view||!view.act) return;
      view.act=null; updateActions(view);
      F().sendHost({t:'pk_act',type,to}); return;
    }
    if(!handActive||pendingHuman!==0) return;
    act(players[0],type,to);
  }
  foldBtn.addEventListener('click',()=>submit('fold'));
  callBtn.addEventListener('click',()=>submit('call'));
  raiseBtn.addEventListener('click',()=>submit('raise',raiseTo));
  rMinus.addEventListener('click',()=>{ if(view&&view.act){ raiseTo-=view.bb; updateActions(view); } });
  rPlus.addEventListener('click',()=>{ if(view&&view.act){ raiseTo+=view.bb; updateActions(view); } });
  raiseBox.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',()=>{
    if(!view||!view.act) return;
    const a=view.act, potAfter=a.pot+a.toCall, step_=Math.max(1,view.sb), q=b.dataset.q;
    if(q==='min') raiseTo=0;
    else if(q==='half') raiseTo=a.currentBet+Math.round(potAfter/2/step_)*step_;
    else if(q==='pot') raiseTo=a.currentBet+Math.round(potAfter/step_)*step_;
    else raiseTo=a.maxTo;
    updateActions(view);
  }));
  tablesEl.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
    if(handActive||guestMode) return;
    tablesEl.querySelectorAll('button').forEach(x=>x.classList.remove('sel')); b.classList.add('sel');
    sb=parseInt(b.dataset.sb,10); bb=sb*2;
    aiPool.forEach(p=>{ p.stack=50*bb; });
    if(players.length) render(); else updateMp();
  }));
  dealBtn.addEventListener('click',startHand);
  document.addEventListener('balance-changed',()=>{ if(!handActive&&!guestMode) dealBtn.disabled=C.state.balance<bb; });

  // ---------- Réseau (via la connexion du « Salon entre amis ») ----------
  function guestReset(text){
    if(guestInvested>0&&!(view&&!view.handActive)){ C.state.balance+=guestInvested; C.saveBalance(); C.renderBalance(); text=(text||'')+' Tes mises de la main t’ont été rendues.'; }
    guestInvested=0; guestMode=false; view=null;
    board=[]; handActive=false; pendingHuman=-1; say(text||'Choisis tes blinds puis lance une main.');
    tablesEl.style.display=''; previewTable();
  }
  if(F()){
    F().onMsg((m,id)=>{
      if(m.t==='pk_in'){ if(inHandler) inHandler(m,id); }
      else if(m.t==='pk_act'){
        const idx=players.findIndex(p=>p.kind==='remote'&&p.peerId===id);
        if(idx>=0&&handActive&&pendingHuman===idx&&['fold','check','call','raise'].indexOf(m.type)>=0) act(players[idx],m.type,m.to);
      }
      else if(m.t==='pk_join'){ sb=m.sb||sb; bb=m.bb||bb; F().sendHost({t:'pk_in',bal:C.state.balance}); }
      else if(m.t==='pk_state'){
        guestMode=true;
        if(!el('view-poker').classList.contains('active')){ const nav=document.querySelector('[data-view="poker"]'); if(nav) nav.click(); }
        draw(m);
        if(!m.handActive&&guestInvested>0) guestInvested=0;
      }
      else if(m.t==='pk_chips'){
        const d=parseInt(m.delta,10)||0;
        C.state.balance+=d; if(d<0){ C.trackWager(-d); guestInvested+=-d; }
        C.saveBalance(); C.renderBalance();
      }
      else if(m.t==='pk_end'){
        const total=parseInt(m.total,10)||0, won=parseInt(m.won,10)||0;
        C.state.balance+=won; C.saveBalance(); C.renderBalance(); guestInvested=0;
        C.recordGame('poker',total,won);
        if(won>total){ C.flashWin(msg); } else if(won===0){ C.flashLoss(feltEl); }
      }
      else if(m.t==='pk_msg'){ say(m.text||''); }
    });
    F().onPeerLeft(id=>{
      const idx=players.findIndex(p=>p.kind==='remote'&&p.peerId===id);
      if(idx<0||!handActive) return;
      const p=players[idx]; p.folded=true; p.lastAction='Déconnecté';
      if(pendingHuman===idx){ pendingHuman=-1; clearTimeout(turnTimer); }
      render(); schedule(step,300);
    });
    F().onLeave(()=>{
      if(guestMode) guestReset('Tu as quitté le salon.');
      else if(handActive) players.forEach((p,i)=>{ if(p.kind==='remote'&&!p.folded){ p.folded=true; p.lastAction='Déconnecté'; } });
    });
  }
  document.addEventListener('friends-changed',()=>{
    // L'invité perd sa connexion à l'hôte : on rend les mises de la main en cours.
    if(guestMode&&!(F()&&F().role())) guestReset('L’hôte a quitté la table.');
    else updateMp();
  });

  switchBtns.forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
  document.addEventListener('avatar-changed',()=>{ if(players.length) render(); });
  el('fr-pokerBtn')&&el('fr-pokerBtn').addEventListener('click',()=>setMode('multi'));
  el('pk-friendsBtn')&&el('pk-friendsBtn').addEventListener('click',()=>{ const nav=document.querySelector('[data-view="friends"]'); if(nav) nav.click(); });
  // Table de départ : toi + les IA assises, en attendant la première main.
  function previewTable(){
    players=[{kind:'local',name:'Toi',icon:'🙂'}].concat(aiPool.slice(0,TABLE_SEATS-1)); players.forEach(resetP);
    dealer=-1; render();
  }
  previewTable();
})();
