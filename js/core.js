/* ============================================================
   CORE — état partagé, stockage, stats, historique, favoris,
   succès, profil, navigation, aide aux cartes.
   Expose window.Casino, utilisé par chaque script de jeu chargé
   après celui-ci.
   ============================================================ */
window.Casino = (function(){
  const C = {};

  // ====== MODULE: State & Storage — solde, mise cumulée, série de jours ======
  const BAL_KEY='grand-casino-balance', WAG_KEY='grand-casino-wagered', STREAK_KEY='grand-casino-streak', LAST_KEY='grand-casino-lastplay', THEME_KEY='grand-casino-theme';
  const BEST_STREAK_KEY='grand-casino-beststreak';
  C.state = { balance:500, totalWagered:0, streak:1, bestStreak:1 };
  // Bonus quotidien (jour 1→7, cyclique) : détecté ici au même moment que la série de jours
  // (dont il réutilise directement le calcul), mais crédité plus bas dans le fichier une fois
  // les modules Notifications/Son chargés — voir DAILY_BONUS_TABLE et son octroi en fin de script.
  let dailyBonusPending=null;
  try{
    const s=localStorage.getItem(BAL_KEY); if(s!==null) C.state.balance=parseInt(s,10);
    C.state.totalWagered=parseInt(localStorage.getItem(WAG_KEY)||'0',10);
    const today=new Date().toISOString().slice(0,10);
    const last=localStorage.getItem(LAST_KEY);
    C.state.streak=parseInt(localStorage.getItem(STREAK_KEY)||'0',10)||1;
    if(last!==today){
      const y=new Date(Date.now()-86400000).toISOString().slice(0,10);
      C.state.streak=(last===y)?C.state.streak+1:1;
      localStorage.setItem(LAST_KEY,today); localStorage.setItem(STREAK_KEY,String(C.state.streak));
      // Pas de bonus sur la toute première visite (last===null) : le solde de départ suffit déjà.
      if(last!==null) dailyBonusPending=((C.state.streak-1)%7)+1;
    }
    // Meilleure série jamais atteinte : simple maximum posé à côté de la série courante
    // (même bloc, même moment de calcul) — pas un système de suivi séparé.
    C.state.bestStreak=Math.max(parseInt(localStorage.getItem(BEST_STREAK_KEY)||'0',10)||1, C.state.streak);
    localStorage.setItem(BEST_STREAK_KEY,String(C.state.bestStreak));
    // Valeur libre depuis la Boutique (néon/émeraude/rubis...) au-delà du simple clair/sombre
    // d'origine — n'importe quelle valeur autre que 'dark' pose l'attribut tel quel.
    const savedTheme=localStorage.getItem(THEME_KEY);
    if(savedTheme && savedTheme!=='dark') document.documentElement.setAttribute('data-theme',savedTheme);
    // Dos de carte achetable à la Boutique (voir shop.js/css base.css) — même principe.
    const savedCardback=localStorage.getItem('grand-casino-cardback');
    if(savedCardback && savedCardback!=='classic') document.documentElement.setAttribute('data-cardback',savedCardback);
  }catch(e){}

  // ====== MODULE: Statistics ======
  const STATS_KEY='grand-casino-stats';
  let stats={gamesPlayed:0,totalWon:0,biggestWin:0,perGame:{}};
  try{ const raw=localStorage.getItem(STATS_KEY); if(raw) stats=JSON.parse(raw); }catch(e){}
  const GAME_NAMES={slots:'Machine à sous',blackjack:'Blackjack',roulette:'Roulette',bus:'Ride the Bus',baccarat:'Baccarat',coinflip:'Pile ou Face',mines:'Mines',crash:'Crash',dragon:'Fortune Dragon',videopoker:'Vidéo Poker',poker:'Poker Texas Hold’em',cases:'Ouverture de Caisses',war:'Bataille',keno:'Keno',craps:'Craps',wheel:'Roue de la chance',daily:'Défi du jour'};
  C.gameName = k=>GAME_NAMES[k]||k;
  function saveStats(){ try{ localStorage.setItem(STATS_KEY, JSON.stringify(stats)); }catch(e){} }

  // ====== MODULE: History (100 dernières parties) ======
  const HIST_KEY='grand-casino-history';
  let history=[];
  try{ const raw=localStorage.getItem(HIST_KEY); if(raw) history=JSON.parse(raw); }catch(e){}
  function saveHistory(){ try{ localStorage.setItem(HIST_KEY, JSON.stringify(history)); }catch(e){} }
  // Stats et historique sont sauvegardés à chaque partie (toutes vues confondues), mais leur
  // rendu DOM est différé à l'ouverture de la vue concernée (voir switchView) : inutile de
  // reconstruire une liste d'historique de 100 lignes ou les cartes de stats par jeu après
  // CHAQUE tour alors que ces vues ne sont, par construction, jamais visibles pendant une partie.
  C.recordGame = function(gameKey, betAmount, winAmount){
    stats.gamesPlayed++;
    let pg=stats.perGame[gameKey]; if(!pg||typeof pg!=='object') pg={count:0,wins:0,wagered:0,won:0};
    pg.count++; pg.wagered+=betAmount; if(winAmount>0){ pg.wins++; pg.won+=winAmount; }
    stats.perGame[gameKey]=pg;
    // Hall of Fame : mêmes champs `stats` déjà sauvegardés/exportés, juste deux de plus par
    // record (jeu + date) pour ne pas se contenter d'un nombre nu — aucun tracking séparé.
    if(winAmount>stats.biggestWin){ stats.biggestWin=winAmount; stats.biggestWinGame=gameKey; stats.biggestWinTime=Date.now(); }
    if(gameKey==='crash'&&winAmount>0&&betAmount>0){
      const mult=winAmount/betAmount;
      if(mult>(stats.crashBestMult||0)){ stats.crashBestMult=mult; stats.crashBestMultTime=Date.now(); }
    }
    if(winAmount>0) stats.totalWon+=winAmount;
    saveStats();
    history.unshift({game:gameKey, bet:betAmount, win:winAmount, net:winAmount-betAmount, time:Date.now()});
    if(history.length>100) history.length=100;
    saveHistory();
    checkAchievements();
    updateMissionsProgress(gameKey, betAmount, winAmount);
    checkVipTierUp();
    checkShareableWin(gameKey, betAmount, winAmount);
  };
  function formatTime(ts){
    const d=new Date(ts), now=new Date();
    const hh=String(d.getHours()).padStart(2,'0'), mm=String(d.getMinutes()).padStart(2,'0');
    const sameDay=d.toDateString()===now.toDateString();
    return (sameDay?'Aujourd’hui':d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'}))+' — '+hh+':'+mm;
  }
  function renderHistory(){
    const listEl=document.getElementById('hist-list'), emptyEl=document.getElementById('hist-empty'), filterEl=document.getElementById('hist-filter'), sortEl=document.getElementById('hist-sort');
    if(!listEl) return;
    const filter=filterEl?filterEl.value:'all';
    const rows=history.filter(h=>filter==='all'||h.game===filter);
    const sort=sortEl?sortEl.value:'recent';
    if(sort==='net-desc') rows.sort((a,b)=>b.net-a.net);
    else if(sort==='net-asc') rows.sort((a,b)=>a.net-b.net);
    // 'recent' : déjà l'ordre naturel de `history` (le plus récent en tête, voir recordGame).
    listEl.innerHTML='';
    emptyEl.style.display=rows.length?'none':'block';
    rows.forEach(h=>{
      const row=document.createElement('div'); row.className='hist-row';
      const name=GAME_NAMES[h.game]||h.game;
      const netTxt=h.net>0?('+'+h.net):(h.net<0?String(h.net):'0');
      row.innerHTML='<div class="hist-main"><b>'+name+'</b><span>Mise : '+h.bet+'</span></div><div class="hist-side"><span class="hist-net '+(h.net>0?'pos':(h.net<0?'neg':''))+'">'+netTxt+'</span><small>'+formatTime(h.time)+'</small></div>';
      listEl.appendChild(row);
    });
  }

  // ====== MODULE: Notifications (toasts) ======
  // action (optionnel) : {label, onClick} — ajoute un petit bouton dans le toast (ex. "Partager
  // mon gain"). Rétrocompatible : tous les appels existants passent juste un message, sans 2e argument.
  function showToast(message, action){
    const container=document.getElementById('toastContainer'); if(!container) return;
    const t=document.createElement('div'); t.className='toast';
    const msg=document.createElement('div'); msg.className='toast-msg'; msg.textContent=message;
    t.appendChild(msg);
    if(action){
      const btn=document.createElement('button'); btn.className='toast-action'; btn.textContent=action.label;
      btn.addEventListener('click',()=>{ action.onClick(); t.classList.add('out'); setTimeout(()=>t.remove(),300); });
      t.appendChild(btn);
    }
    container.appendChild(t);
    const life=action?4500:2400;
    setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(),300); }, life);
  }
  C.showToast = showToast;

  // ====== MODULE: Favorites ======
  const FAV_KEY='grand-casino-favorites';
  let favorites=[];
  try{ const raw=localStorage.getItem(FAV_KEY); if(raw) favorites=JSON.parse(raw); }catch(e){}
  function saveFavorites(){ try{ localStorage.setItem(FAV_KEY, JSON.stringify(favorites)); }catch(e){} }
  const GAMES_META=[
    {key:'slots',icon:'🎰',name:'Machine à sous',tag:'Classique'},
    {key:'dragon',icon:'🐉',name:'Fortune Dragon',tag:'Machine à sous'},
    {key:'blackjack',icon:'🃏',name:'Blackjack',tag:'Cartes'},
    {key:'roulette',icon:'🎡',name:'Roulette',tag:'Casino'},
    {key:'baccarat',icon:'🎴',name:'Baccarat',tag:'Cartes'},
    {key:'coinflip',icon:'🪙',name:'Pile ou Face',tag:'Rapide'},
    {key:'mines',icon:'💣',name:'Mines',tag:'Rapide'},
    {key:'crash',icon:'🚀',name:'Crash',tag:'Rapide'},
    {key:'bus',icon:'🚌',name:'Ride the Bus',tag:'Rapide'},
    {key:'videopoker',icon:'♠️',name:'Vidéo Poker',tag:'Cartes'},
    {key:'poker',icon:'♣️',name:'Poker Texas Hold’em',tag:'Contre l’IA'},
    {key:'cases',icon:'📦',name:'Ouverture de Caisses',tag:'Nouveau'},
    {key:'war',icon:'⚔️',name:'Bataille',tag:'Rapide'},
    {key:'keno',icon:'🔢',name:'Keno',tag:'Nouveau'},
    {key:'craps',icon:'🎲',name:'Craps',tag:'Dés'}
  ];
  function gameCardHTML(g){
    const isFav=favorites.includes(g.key);
    return '<div class="game-card"><button class="fav-star'+(isFav?' active':'')+'" data-game="'+g.key+'" aria-label="Favori">'+(isFav?'★':'☆')+'</button>'
      +'<div class="gc-icon">'+g.icon+'</div><div class="gc-name">'+g.name+'</div><div class="gc-tag">'+g.tag+'</div><button data-view="'+g.key+'">Jouer</button></div>';
  }
  function renderHome(){
    const popularGrid=document.getElementById('popularGrid'), favGrid=document.getElementById('favGrid'), favSection=document.getElementById('favSection');
    if(!popularGrid) return;
    popularGrid.innerHTML=GAMES_META.map(gameCardHTML).join('');
    const favGames=GAMES_META.filter(g=>favorites.includes(g.key));
    if(favGames.length){ favSection.style.display='block'; favGrid.innerHTML=favGames.map(gameCardHTML).join(''); }
    else { favSection.style.display='none'; }
  }
  function toggleFavorite(key){
    const idx=favorites.indexOf(key);
    if(idx>=0){ favorites.splice(idx,1); showToast('Retiré des favoris'); }
    else { favorites.push(key); showToast('Ajouté aux favoris'); }
    saveFavorites(); renderHome();
  }

  // ====== MODULE: Achievements ======
  const ACH_KEY='grand-casino-achievements';
  let unlockedAch=[];
  try{ const raw=localStorage.getItem(ACH_KEY); if(raw) unlockedAch=JSON.parse(raw); }catch(e){}
  function saveUnlockedAch(){ try{ localStorage.setItem(ACH_KEY, JSON.stringify(unlockedAch)); }catch(e){} }
  C.isAchUnlocked = id=>unlockedAch.includes(id);
  // pgCount : petit raccourci réutilisé par plusieurs succès/missions ci-dessous pour lire le
  // nombre de parties d'un jeu dans stats.perGame, sans répéter la même garde à chaque fois.
  const pgCount=key=>(stats.perGame[key]&&stats.perGame[key].count)||0;
  const ACHIEVEMENTS=[
    {id:'first-spin', icon:'🎰', label:'Premier tour — jouer sa première partie', cond:()=>stats.gamesPlayed>=1},
    {id:'big-win', icon:'💰', label:'Premier gros gain — gagner 500 jetons d’un coup', cond:()=>stats.biggestWin>=500},
    {id:'blackjack-fan', icon:'🃏', label:'Joueur de blackjack — 10 parties de blackjack', cond:()=>pgCount('blackjack')>=10},
    {id:'roulette-fan', icon:'🎡', label:'Tour de roulette — 10 parties de roulette', cond:()=>pgCount('roulette')>=10},
    {id:'streak-3', icon:'🔥', label:'Série — 3 jours consécutifs', cond:()=>C.state.streak>=3},
    {id:'high-roller', icon:'💎', label:'High Roller — 5 000 jetons misés au total', cond:()=>C.state.totalWagered>=5000},
    {id:'thousand-won', icon:'👑', label:'1 000 jetons gagnés au total', cond:()=>stats.totalWon>=1000},
    // ---- Ajoutés pour couvrir les jeux/fonctionnalités arrivés depuis (Crash, Poker, Vidéo
    // Poker, Caisses, Ride the Bus, Mines, VIP, série longue, Défis, Connexion cloud) — tous
    // calculés à partir de données déjà suivies ailleurs (stats.perGame, C.state, ou un simple
    // indicateur déjà posé par un autre module), jamais un nouveau système de suivi. ----
    {id:'poker-shark', icon:'♣️', label:'Requin du poker — 10 mains de Poker Texas Hold’em', cond:()=>pgCount('poker')>=10},
    {id:'video-poker-pro', icon:'♠️', label:'Habitué du vidéo poker — 10 parties de Vidéo Poker', cond:()=>pgCount('videopoker')>=10},
    {id:'bus-rider', icon:'🚌', label:'Voyageur régulier — 10 parties de Ride the Bus', cond:()=>pgCount('bus')>=10},
    {id:'mines-master', icon:'💣', label:'Démineur — 10 parties de Mines', cond:()=>pgCount('mines')>=10},
    {id:'crash-flyer', icon:'🚀', label:'Haut vol — atteindre x10 sur Crash avant d’encaisser', cond:()=>(stats.crashBestMult||0)>=10},
    {id:'case-opener', icon:'📦', label:'Collectionneur — 10 caisses ouvertes', cond:()=>pgCount('cases')>=10},
    {id:'all-rounder', icon:'🎯', label:'Touche-à-tout — avoir joué à tous les jeux au moins une fois', cond:()=>GAMES_META.every(g=>pgCount(g.key)>=1)},
    {id:'streak-7', icon:'📅', label:'Semaine complète — 7 jours consécutifs', cond:()=>(C.state.bestStreak||0)>=7},
    {id:'legende-vip', icon:'👑', label:'Statut Légende — le plus haut niveau VIP atteint', cond:()=>vipTierIndex(C.state.totalWagered)>=VIP_TIERS.length-1},
    {id:'challenge-champion', icon:'🏆', label:'Recordman — battre un premier record dans un Défi personnel', cond:()=>{ try{ return Object.keys(JSON.parse(localStorage.getItem('grand-casino-challenges')||'{}')).length>=1; }catch(e){ return false; } }},
    {id:'cloud-linked', icon:'🔐', label:'Connecté — synchronisation cloud activée au moins une fois', cond:()=>{ try{ return localStorage.getItem('grand-casino-had-session')==='1'; }catch(e){ return false; } }},
    // ---- Succès secrets : masqués (icône/libellé remplacés par "???") tant qu'ils ne sont pas
    // débloqués, pour un effet de découverte — voir renderAchievements. Toujours calculés à partir
    // de données déjà suivies ailleurs (history, C.state.balance, localStorage déjà posé par
    // avatars.js/shop.js), jamais un nouveau suivi dédié. ----
    {id:'night-owl', icon:'🦉', label:'Noctambule — jouer une partie entre minuit et 5h du matin', hidden:true, cond:()=>{ const h=new Date().getHours(); return h>=0&&h<5; }},
    {id:'wheel-jackpot', icon:'🎡', label:'Jackpot de la roue — décrocher le gros lot à la Roue de la chance', hidden:true, cond:()=>history.some(h=>h.game==='wheel'&&h.win>=250)},
    {id:'rock-bottom', icon:'💸', label:'Banqueroute — voir son solde tomber à 0 jeton', hidden:true, cond:()=>C.state.balance===0},
    {id:'millionaire', icon:'💰', label:'Millionnaire — atteindre 1 000 000 de jetons', hidden:true, cond:()=>C.state.balance>=1000000},
    {id:'fashionista', icon:'🌈', label:'Styliste — porter le cadre Arc-en-ciel', hidden:true, cond:()=>{ try{ return localStorage.getItem('grand-casino-avatar-frame')==='rainbow'; }catch(e){ return false; } }}
  ];
  // Le rendu de la liste (#ach-list) est différé à l'ouverture de la vue Achievements
  // (voir switchView) : seule la détection de déblocage (+ toast) doit tourner à chaque partie.
  function checkAchievements(){
    let changed=false;
    ACHIEVEMENTS.forEach(a=>{
      if(a.cond() && !unlockedAch.includes(a.id)){ unlockedAch.push(a.id); showToast('🏆 Succès débloqué : '+a.label.split(' — ')[0]); C.sound&&C.sound('achievement'); changed=true; }
    });
    if(changed) saveUnlockedAch();
  }
  function renderAchievements(){
    const listEl=document.getElementById('ach-list'); if(!listEl) return;
    listEl.innerHTML=ACHIEVEMENTS.map(a=>{
      const unlocked=unlockedAch.includes(a.id);
      if(a.hidden&&!unlocked){
        return '<div class="ach-item ach-secret"><span class="ach-icon">❓</span><span class="ach-label">Succès secret — à découvrir...</span><span class="ach-status">Verrouillé</span></div>';
      }
      return '<div class="ach-item'+(unlocked?' unlocked':'')+'"><span class="ach-icon">'+a.icon+'</span><span class="ach-label">'+a.label+'</span><span class="ach-status">'+(unlocked?'Débloqué':'Verrouillé')+'</span></div>';
    }).join('');
  }

  // ====== MODULE: Missions quotidiennes ======
  // Réutilise recordGame (déjà appelé par chaque jeu) comme unique point d'entrée :
  // aucun tracking parallèle, on observe juste les mêmes événements (gameKey, mise, gain).
  const MISSIONS_KEY='grand-casino-missions';
  const MISSION_POOL=[
    {id:'play-5-any',  desc:'Jouer 5 parties (tous jeux confondus)',      type:'count',    games:null,                  target:5,   reward:60},
    {id:'play-3-bj',   desc:'Jouer 3 parties de blackjack',               type:'count',    games:['blackjack'],         target:3,   reward:70},
    {id:'spin-10',     desc:'Faire tourner une machine à sous 10 fois',   type:'count',    games:['slots','dragon'],    target:10,  reward:80},
    {id:'win-500',     desc:'Gagner 500 jetons au total aujourd’hui', type:'won',      games:null,                 target:500, reward:150},
    {id:'play-3-diff', desc:'Jouer à 3 jeux différents',                  type:'distinct', games:null,                 target:3,   reward:100},
    {id:'wager-300',   desc:'Miser un total de 300 jetons',               type:'wagered',  games:null,                 target:300, reward:90},
    // ---- Ajoutées pour couvrir les jeux arrivés depuis (Crash, Poker, Vidéo Poker, Caisses,
    // Mines) et proposer plus de variété au tirage quotidien (3 tirées parmi toutes celles-ci). ----
    {id:'play-3-crash', desc:'Jouer 3 parties de Crash',                  type:'count',    games:['crash'],            target:3,   reward:70},
    {id:'play-3-mines', desc:'Jouer 3 parties de Mines',                  type:'count',    games:['mines'],            target:3,   reward:70},
    {id:'open-2-cases', desc:'Ouvrir 2 caisses',                          type:'count',    games:['cases'],            target:2,   reward:80},
    {id:'play-2-poker', desc:'Jouer 2 mains de Poker Texas Hold’em',      type:'count',    games:['poker'],            target:2,   reward:90},
    {id:'play-3-vp',    desc:'Jouer 3 parties de Vidéo Poker',            type:'count',    games:['videopoker'],       target:3,   reward:70},
    {id:'play-5-diff',  desc:'Jouer à 5 jeux différents',                 type:'distinct', games:null,                 target:5,   reward:180},
    {id:'win-800',      desc:'Gagner 800 jetons au total aujourd’hui',    type:'won',      games:null,                 target:800, reward:200},
    {id:'wager-600',    desc:'Miser un total de 600 jetons',              type:'wagered',  games:null,                 target:600, reward:160}
  ];
  const MISSION_BY_ID={}; MISSION_POOL.forEach(m=>MISSION_BY_ID[m.id]=m);
  let missions=null;
  function todayStr(){ return new Date().toISOString().slice(0,10); }
  function drawDailyMissions(){
    const ids=MISSION_POOL.map(m=>m.id);
    for(let i=ids.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [ids[i],ids[j]]=[ids[j],ids[i]]; }
    return ids.slice(0,3).map(id=>({id, progress:0, playedGames:[], completed:false}));
  }
  function saveMissions(){ try{ localStorage.setItem(MISSIONS_KEY, JSON.stringify(missions)); }catch(e){} }
  function loadMissions(){
    try{ const raw=localStorage.getItem(MISSIONS_KEY); if(raw) missions=JSON.parse(raw); }catch(e){}
    const today=todayStr();
    if(!missions||missions.date!==today){ missions={date:today, list:drawDailyMissions()}; saveMissions(); }
  }
  function missionProgressLabel(tpl,m){
    if(tpl.type==='distinct') return m.progress+' / '+tpl.target+' jeux';
    if(tpl.type==='won') return m.progress+' / '+tpl.target+' jetons gagnés';
    if(tpl.type==='wagered') return m.progress+' / '+tpl.target+' jetons misés';
    return m.progress+' / '+tpl.target+' parties';
  }
  function renderMissions(){
    const doneCount=missions?missions.list.filter(m=>m.completed).length:0;
    const totalCount=missions?missions.list.length:0;
    const summaryEl=document.getElementById('mh-summary');
    if(summaryEl) summaryEl.textContent=doneCount+' / '+totalCount+' complétées';
    const listEl=document.getElementById('missions-list'); if(!listEl) return;
    if(!missions||!missions.list.length){ listEl.innerHTML='<p class="empty-state">Aucune mission pour le moment.<br>Reviens un peu plus tard.</p>'; return; }
    listEl.innerHTML=missions.list.map(m=>{
      const tpl=MISSION_BY_ID[m.id]; if(!tpl) return '';
      const pct=Math.min(100, Math.round((m.progress/tpl.target)*100));
      return '<div class="mission-card'+(m.completed?' mission-done':'')+'">'
        +'<div class="mission-head"><span class="mission-desc">'+tpl.desc+'</span><span class="mission-reward">+'+tpl.reward+' 🪙</span></div>'
        +'<div class="mission-bar-wrap"><div class="mission-bar" style="width:'+pct+'%"></div></div>'
        +'<div class="mission-foot"><span>'+missionProgressLabel(tpl,m)+'</span><span class="mission-status">'+(m.completed?'✅ Complétée':'En cours')+'</span></div>'
        +'</div>';
    }).join('');
  }
  function updateMissionsProgress(gameKey, betAmount, winAmount){
    if(!missions) return;
    missions.list.forEach(m=>{
      if(m.completed) return;
      const tpl=MISSION_BY_ID[m.id]; if(!tpl) return;
      if(tpl.type==='count'){
        if(!tpl.games||tpl.games.includes(gameKey)) m.progress++;
      } else if(tpl.type==='won'){
        if(winAmount>0) m.progress+=winAmount;
      } else if(tpl.type==='wagered'){
        m.progress+=betAmount;
      } else if(tpl.type==='distinct'){
        if(!m.playedGames.includes(gameKey)) m.playedGames.push(gameKey);
        m.progress=m.playedGames.length;
      }
      if(m.progress>=tpl.target){
        m.progress=tpl.target; m.completed=true;
        // Récompense créditée directement au solde — pas de recordGame ici pour ne pas fausser les stats par jeu.
        // Pendant un Défi personnel, le solde affiché est temporairement le capital fictif du
        // défi (voir C.challengeActive) : la récompense est quand même acquise, mais mise de
        // côté pour être ajoutée au VRAI solde à la fin du défi (challenges.js) plutôt que
        // perdue au moment où le vrai solde est restauré.
        if(C.challengeActive) C.state.pendingChallengeCredit=(C.state.pendingChallengeCredit||0)+tpl.reward;
        else { C.state.balance+=tpl.reward; C.saveBalance(); C.renderBalance(); }
        showToast('🎯 Mission complétée : '+tpl.desc+' (+'+tpl.reward+' jetons'+(C.challengeActive?', crédités à la fin du défi':'')+')');
        C.sound&&C.sound('achievement');
      }
    });
    saveMissions(); renderMissions();
  }

  // ====== MODULE: VIP / Titres ======
  // Statut purement honorifique basé sur C.state.totalWagered, déjà suivi par trackWager —
  // aucun nouveau tracking, aucun effet sur les gains d'aucun jeu (badge/teinte uniquement).
  const VIP_TIERS=[
    {key:'bronze',  name:'Bronze',  icon:'🥉', color:'#c98a4b', min:0},
    {key:'argent',  name:'Argent',  icon:'🥈', color:'#c7d0d8', min:2000},
    {key:'or',      name:'Or',      icon:'🥇', color:'#d4af37', min:8000},
    {key:'platine', name:'Platine', icon:'💠', color:'#8fd3e8', min:20000},
    {key:'diamant', name:'Diamant', icon:'💎', color:'#8fb8f2', min:50000},
    {key:'legende', name:'Légende', icon:'👑', color:'#f2d675', min:150000}
  ];
  function vipTierIndex(wagered){ let idx=0; VIP_TIERS.forEach((t,i)=>{ if(wagered>=t.min) idx=i; }); return idx; }
  // Exposés pour le Classement (js/leaderboard.js) : réutilise exactement le même barème,
  // jamais une copie qui pourrait diverger si les paliers changent un jour.
  C.VIP_TIERS=VIP_TIERS; C.vipTierIndex=vipTierIndex;
  function fmtNum(n){ return n.toLocaleString('fr-FR'); }
  function renderVip(){
    const idx=vipTierIndex(C.state.totalWagered), tier=VIP_TIERS[idx], next=VIP_TIERS[idx+1];
    ['home-vip','pf-vip'].forEach(id=>{ const el=document.getElementById(id); if(el){ el.textContent=tier.icon+' '+tier.name; el.style.color=tier.color; } });
    const listEl=document.getElementById('vip-list');
    if(listEl){
      listEl.innerHTML=VIP_TIERS.map((t,i)=>{
        const unlocked=i<=idx;
        return '<div class="vip-tier-card'+(unlocked?' unlocked':'')+(i===idx?' current':'')+'">'
          +'<span class="vip-tier-icon">'+t.icon+'</span>'
          +'<span class="vip-tier-name">'+t.name+'</span>'
          +'<span class="vip-tier-req">'+(t.min===0?'Dès le début':fmtNum(t.min)+' jetons misés')+'</span>'
          +(i===idx?'<span class="vip-tier-tag">Niveau actuel</span>':'')
          +'</div>';
      }).join('');
    }
    const barEl=document.getElementById('vip-progressBar'), labelEl=document.getElementById('vip-progressLabel');
    if(barEl&&labelEl){
      if(next){
        const span=next.min-tier.min, done=C.state.totalWagered-tier.min;
        barEl.style.width=Math.max(0,Math.min(100,Math.round((done/span)*100)))+'%';
        labelEl.textContent=fmtNum(C.state.totalWagered)+' / '+fmtNum(next.min)+' jetons misés — prochain statut : '+next.icon+' '+next.name;
      } else {
        barEl.style.width='100%';
        labelEl.textContent='Statut maximum atteint — '+tier.icon+' '+tier.name+' !';
      }
    }
  }
  let lastVipIdx=vipTierIndex(C.state.totalWagered);
  function checkVipTierUp(){
    const idx=vipTierIndex(C.state.totalWagered);
    if(idx>lastVipIdx){ const t=VIP_TIERS[idx]; showToast('👑 Nouveau statut VIP : '+t.icon+' '+t.name+' !'); C.sound&&C.sound('achievement'); }
    lastVipIdx=idx;
    renderVip();
  }

  // ====== MODULE: Événements temporaires ======
  // Liste codée en dur (pas de back-end) : chaque événement a une période [start,end] (dates
  // AAAA-MM-JJ, comparées comme des chaînes — todayStr() utilise le même format) et un effet
  // simple. Un seul effet existe pour l'instant : multiplier le bonus quotidien.
  // Démo active à la publication de cette fonctionnalité — à adapter/retirer selon les besoins.
  const EVENTS=[
    {id:'demo-launch', label:'🎉 Lancement des nouveautés — bonus quotidien x2 !', start:'2026-09-22', end:'2026-09-23', dailyBonusMult:2}
  ];
  function activeEvent(){ const t=todayStr(); return EVENTS.find(ev=>t>=ev.start&&t<=ev.end)||null; }
  function renderEventBanner(){
    const el=document.getElementById('event-banner'); if(!el) return;
    const ev=activeEvent();
    if(ev){ el.style.display='flex'; el.textContent=ev.label; }
    else { el.style.display='none'; el.textContent=''; }
  }

  // ====== MODULE: Carte de victoire partageable ======
  // Réutilise recordGame (déjà le point d'entrée unique pour stats/historique/achievements/
  // missions/VIP) comme seul déclencheur : aucun nouveau suivi, juste une vérification de plus
  // sur le même événement (gameKey, mise, gain) déjà observé partout ailleurs.
  const SHARE_WIN_MIN_ABS=500, SHARE_WIN_MIN_MULT=10;
  function isShareableWin(betAmount, winAmount){
    return winAmount>=SHARE_WIN_MIN_ABS || (betAmount>0 && winAmount>=betAmount*SHARE_WIN_MIN_MULT);
  }
  function drawWinCard(gameKey, betAmount, winAmount){
    const canvas=document.createElement('canvas'); canvas.width=800; canvas.height=450;
    const ctx=canvas.getContext('2d');
    const bg=ctx.createLinearGradient(0,0,0,450); bg.addColorStop(0,'#14201b'); bg.addColorStop(1,'#050a08');
    ctx.fillStyle=bg; ctx.fillRect(0,0,800,450);
    ctx.strokeStyle='#d4af37'; ctx.lineWidth=6; ctx.strokeRect(15,15,770,420);
    ctx.strokeStyle='rgba(212,175,55,.45)'; ctx.lineWidth=2; ctx.setLineDash([2,10]); ctx.strokeRect(30,30,740,390); ctx.setLineDash([]);
    ctx.textAlign='center';
    ctx.fillStyle='#f2d675'; ctx.font='bold 36px Georgia, serif'; ctx.fillText('🎰 LE GRAND CASINO', 400, 92);
    ctx.fillStyle='#93a89a'; ctx.font='22px Georgia, serif'; ctx.fillText(GAME_NAMES[gameKey]||gameKey, 400, 132);
    ctx.fillStyle='#f2d675'; ctx.font='bold 74px Georgia, serif'; ctx.fillText('+'+winAmount+' 🪙', 400, 252);
    const mult=betAmount>0?(winAmount/betAmount):0;
    ctx.fillStyle='#d4af37'; ctx.font='26px Georgia, serif';
    ctx.fillText('x'+mult.toFixed(1)+' — mise de '+betAmount+' jetons', 400, 296);
    ctx.fillStyle='#93a89a'; ctx.font='15px Georgia, serif';
    ctx.fillText('Casino 100% fictif — jetons uniquement, aucun argent réel', 400, 400);
    return canvas;
  }
  function shareWin(gameKey, betAmount, winAmount){
    const canvas=drawWinCard(gameKey, betAmount, winAmount);
    canvas.toBlob(blob=>{
      if(!blob) return;
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download='grand-casino-gain-'+Date.now()+'.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 1500);
    });
  }
  function checkShareableWin(gameKey, betAmount, winAmount){
    if(!isShareableWin(betAmount, winAmount)) return;
    showToast('🎉 Gain exceptionnel ! Tu peux le partager.', {label:'📤 Partager mon gain', onClick:()=>shareWin(gameKey, betAmount, winAmount)});
  }

  // ====== MODULE: Profile ======
  const PSEUDO_KEY='grand-casino-pseudo', AVATAR_KEY='grand-casino-avatar';
  const AVATAR_ICONS=['🎲','🃏','🎩','🦊','🐺','🦅','🐉','🎯'];
  let pseudo=localStorage.getItem(PSEUDO_KEY), avatarIcon=localStorage.getItem(AVATAR_KEY);
  if(!pseudo){ pseudo='Joueur'+Math.floor(1000+Math.random()*9000); try{localStorage.setItem(PSEUDO_KEY,pseudo);}catch(e){} }
  if(!avatarIcon){ avatarIcon=AVATAR_ICONS[Math.floor(Math.random()*AVATAR_ICONS.length)]; try{localStorage.setItem(AVATAR_KEY,avatarIcon);}catch(e){} }
  function renderProfile(){
    const pseudoEl=document.getElementById('pf-pseudo'), avatarEl=document.getElementById('pf-avatar');
    if(pseudoEl) pseudoEl.textContent=pseudo;
    // Une fois le module d'avatars chargé, il dessine lui-même l'avatar personnalisé dans #pf-avatar.
    if(avatarEl&&!C.avatars) avatarEl.textContent=avatarIcon;
    const gamesEl=document.getElementById('pf-games'); if(gamesEl) gamesEl.textContent=stats.gamesPlayed;
    const favEl=document.getElementById('pf-fav');
    if(favEl){
      const entries=Object.entries(stats.perGame).sort((a,b)=>((b[1].count||0)-(a[1].count||0)));
      favEl.textContent=entries.length?(GAME_NAMES[entries[0][0]]||entries[0][0]):'–';
    }
  }
  function renderPerGameStats(){
    const el=document.getElementById('st-pergame'); if(!el) return;
    el.innerHTML=GAMES_META.map(g=>{
      const pg=stats.perGame[g.key];
      if(!pg||!pg.count) return '<div class="pergame-card"><span class="pg-name">'+g.icon+' '+g.name+'</span><span class="pg-stats">Pas encore joué</span></div>';
      const winRate=Math.round((pg.wins/pg.count)*100);
      return '<div class="pergame-card"><span class="pg-name">'+g.icon+' '+g.name+'</span><span class="pg-stats"><b>'+pg.count+' parties</b>'+winRate+'% de victoires · misé '+pg.wagered+'</span></div>';
    }).join('');
  }
  function renderStats(){
    const entries=Object.entries(stats.perGame).sort((a,b)=>((b[1].count||0)-(a[1].count||0)));
    const favName=entries.length?(GAME_NAMES[entries[0][0]]||entries[0][0]):'–';
    const set=(id,val)=>{ const el=document.getElementById(id); if(el) el.textContent=val; };
    set('st-games', stats.gamesPlayed); set('st-won', stats.totalWon); set('st-biggest', stats.biggestWin); set('st-fav', favName);
    renderPerGameStats(); renderProfile();
  }
  // ====== MODULE: Hall of Fame personnel ======
  // Purement un affichage soigné de records déjà suivis ailleurs (stats.biggestWin/Game/Time,
  // stats.crashBestMult/Time, C.state.bestStreak) : aucun nouveau tracking ici, juste la mise
  // en valeur visuelle de données que recordGame() et le calcul de série alimentent déjà.
  function renderHallOfFame(){
    const gridEl=document.getElementById('hof-grid'), emptyEl=document.getElementById('hof-empty');
    if(!gridEl) return;
    const cards=[];
    if(stats.biggestWin>0){
      cards.push({icon:'💰', label:'Plus gros gain', value:'+'+stats.biggestWin+' 🪙',
        sub:(GAME_NAMES[stats.biggestWinGame]||stats.biggestWinGame||'Jeu inconnu')+(stats.biggestWinTime?' — '+formatTime(stats.biggestWinTime):' — partie ancienne')});
    }
    if(C.state.bestStreak>1){
      cards.push({icon:'🔥', label:'Plus longue série de jours', value:C.state.bestStreak+(C.state.bestStreak>1?' jours':' jour'),
        sub:C.state.bestStreak===C.state.streak?'Série actuelle — continue comme ça !':'Série record — à rebattre !'});
    }
    if(stats.crashBestMult>0){
      cards.push({icon:'🚀', label:'Meilleur multiplicateur — Crash', value:'x'+stats.crashBestMult.toFixed(2),
        sub:stats.crashBestMultTime?formatTime(stats.crashBestMultTime):'—'});
    }
    gridEl.innerHTML=cards.map(c=>
      '<div class="hof-card"><div class="hof-icon">'+c.icon+'</div><div class="hof-label">'+c.label+'</div>'
      +'<div class="hof-value">'+c.value+'</div><div class="hof-sub">'+c.sub+'</div></div>'
    ).join('');
    if(emptyEl) emptyEl.style.display=cards.length?'none':'block';
  }

  C.flashWin = function(el){ el.classList.remove('win-flash'); void el.offsetWidth; el.classList.add('win-flash'); showToast(el.textContent); C.sound&&C.sound('win'); };
  // Perte : assombrissement bref et discret, jamais agressif.
  C.flashLoss = function(el){ if(!el) return; el.classList.remove('loss-flash'); void el.offsetWidth; el.classList.add('loss-flash'); C.sound&&C.sound('loss'); };
  // Flash plein écran (ex. cash out réussi au Crash).
  C.flashScreen = function(){ const el=document.getElementById('screenFlash'); if(!el) return; el.classList.remove('flash-gold'); void el.offsetWidth; el.classList.add('flash-gold'); C.sound&&C.sound('flash'); };

  // ====== MODULE: Balance ======
  // C.challengeActive (posé/retiré par challenges.js pendant un Défi personnel) suspend
  // TOUTE écriture du solde/total misé en localStorage tant qu'un défi tourne : C.state.balance
  // et C.state.totalWagered reflètent alors temporairement le capital fictif du défi, jamais
  // persistés ni confondus avec les vraies valeurs. challenges.js restaure les deux à la fin et
  // rappelle C.saveBalance() une fois — c'est ce dernier appel qui persiste, normalement.
  C.challengeActive = false;
  C.saveBalance = function(){ try{ if(C.challengeActive) return; localStorage.setItem(BAL_KEY,String(C.state.balance)); localStorage.setItem(WAG_KEY,String(C.state.totalWagered)); }catch(e){} };
  C.trackWager = function(amount){ C.state.totalWagered+=amount; };
  C.renderBalance = function(){
    ['hdrBalance','home-balance','pf-balance'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=C.state.balance; });
    const level=Math.floor(C.state.totalWagered/1000)+1;
    const xpInLevel=C.state.totalWagered%1000;
    ['hdrLevel','home-level'].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=level; });
    const pfLevel=document.getElementById('pf-level'); if(pfLevel) pfLevel.textContent=level;
    const pfXp=document.getElementById('pf-xp'); if(pfXp) pfXp.textContent=xpInLevel+' / 1000';
    const pfWag=document.getElementById('pf-wagered'); if(pfWag) pfWag.textContent=C.state.totalWagered;
    const pfStreak=document.getElementById('pf-streak'); if(pfStreak) pfStreak.textContent=C.state.streak+(C.state.streak>1?' jours':' jour');
    const homeStreak=document.getElementById('home-streak'); if(homeStreak) homeStreak.textContent=C.state.streak;
    const xpBar=document.getElementById('xpBar'); if(xpBar) xpBar.style.width=(xpInLevel/10)+'%';
    document.dispatchEvent(new Event('balance-changed'));
  };

  document.getElementById('resetBtn').addEventListener('click',()=>{ C.state.balance=500; C.saveBalance(); C.renderBalance(); });

  // ====== MODULE: Sauvegarde exportable / importable ======
  // Regroupe toutes les clés localStorage du site (y compris grand-casino-sound, propre à
  // audio.js chargé séparément) dans un seul fichier .json téléchargeable, et sait relire/
  // valider ce même format pour tout restaurer. Après import réussi, la page est rechargée pour
  // que chaque module se réinitialise proprement depuis le localStorage restauré, plutôt que de
  // resynchroniser à la main les nombreuses variables en mémoire de chaque module.
  const SAVE_KEYS=[BAL_KEY,WAG_KEY,STREAK_KEY,BEST_STREAK_KEY,LAST_KEY,THEME_KEY,STATS_KEY,HIST_KEY,FAV_KEY,ACH_KEY,MISSIONS_KEY,PSEUDO_KEY,AVATAR_KEY,'grand-casino-sound','grand-casino-challenges'];
  const SAVE_JSON_KEYS=[STATS_KEY,HIST_KEY,FAV_KEY,ACH_KEY,MISSIONS_KEY,'grand-casino-challenges'];
  // buildSaveObject/applySaveObject : le coeur commun de l'export/import fichier ci-dessous,
  // exposé sur C au cas où un autre module voudrait le réutiliser plus tard (même format,
  // même validation, plutôt que d'en recréer une variante).
  function buildSaveObject(){
    const data={};
    SAVE_KEYS.forEach(k=>{ const v=localStorage.getItem(k); if(v!==null) data[k]=v; });
    return {app:'grand-casino', version:1, exportedAt:new Date().toISOString(), data};
  }
  function applySaveObject(payload){
    if(!validateSaveData(payload)) return false;
    SAVE_KEYS.forEach(k=>{
      try{ if(payload.data[k]!==undefined) localStorage.setItem(k, payload.data[k]); else localStorage.removeItem(k); }catch(e){}
    });
    return true;
  }
  C.buildSaveObject = buildSaveObject;
  C.applySaveObject = applySaveObject;
  C.validateSaveData = payload=>validateSaveData(payload); // exposé après coup, voir plus bas (fonction hoisted)
  C.reloadAfterImport = function(msg){ showToast(msg||'✅ Sauvegarde importée — rechargement...'); setTimeout(()=>location.reload(), 900); };
  function exportSave(){
    const payload=buildSaveObject();
    const blob=new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='grand-casino-sauvegarde-'+todayStr()+'.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1500);
    showToast('💾 Sauvegarde exportée');
  }
  function validateSaveData(payload){
    if(!payload||typeof payload!=='object'||payload.app!=='grand-casino') return false;
    if(!payload.data||typeof payload.data!=='object') return false;
    if(!Object.keys(payload.data).some(k=>SAVE_KEYS.includes(k))) return false;
    for(const k of SAVE_JSON_KEYS){
      if(payload.data[k]!==undefined){ try{ JSON.parse(payload.data[k]); }catch(e){ return false; } }
    }
    if(payload.data[BAL_KEY]!==undefined && isNaN(parseInt(payload.data[BAL_KEY],10))) return false;
    if(payload.data[WAG_KEY]!==undefined && isNaN(parseInt(payload.data[WAG_KEY],10))) return false;
    return true;
  }
  function importSaveFile(file){
    const reader=new FileReader();
    reader.onload=()=>{
      let payload;
      try{ payload=JSON.parse(reader.result); }catch(e){ showToast('❌ Fichier illisible (JSON invalide)'); return; }
      if(!validateSaveData(payload)){ showToast('❌ Fichier de sauvegarde invalide ou corrompu'); return; }
      if(!confirm('Importer cette sauvegarde va remplacer TOUTES tes données actuelles (solde, statistiques, historique, favoris, achievements, missions...). Continuer ?')) return;
      applySaveObject(payload);
      C.reloadAfterImport();
    };
    reader.onerror=()=>showToast('❌ Impossible de lire le fichier');
    reader.readAsText(file);
  }
  const exportSaveBtn=document.getElementById('exportSaveBtn'), importSaveBtn=document.getElementById('importSaveBtn'), importSaveInput=document.getElementById('importSaveInput');
  if(exportSaveBtn) exportSaveBtn.addEventListener('click', exportSave);
  if(importSaveBtn&&importSaveInput){
    importSaveBtn.addEventListener('click',()=>importSaveInput.click());
    importSaveInput.addEventListener('change',()=>{
      const file=importSaveInput.files&&importSaveInput.files[0];
      if(file) importSaveFile(file);
      importSaveInput.value='';
    });
  }

  // ====== MODULE: Navigation ======
  function switchView(name){
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    const target=document.getElementById('view-'+name); if(target) target.classList.add('active');
    document.querySelectorAll('.side-nav button[data-view], .bottom-nav button[data-view]').forEach(b=>b.classList.toggle('active', b.dataset.view===name));
    const titles={home:'Accueil',floor:'Plan du casino',slots:'Machines à sous',dragon:'Fortune Dragon',blackjack:'Blackjack',roulette:'Roulette',bus:'Ride the Bus',baccarat:'Baccarat',coinflip:'Pile ou Face',mines:'Mines',crash:'Crash',videopoker:'Vidéo Poker',poker:'Poker Texas Hold’em',friends:'Salon entre amis',cases:'Ouverture de Caisses',war:'Bataille',keno:'Keno',craps:'Craps',wheel:'Roue de la chance',daily:'Défi du jour',season:'Pass saisonnier',stats:'Statistiques',history:'Historique',achievements:'Achievements',missions:'Missions',vip:'Statut VIP',halloffame:'Hall of Fame',challenges:'Défis',weekly:'Tournoi hebdomadaire',leaderboard:'Classement',account:'Connexion',profil:'Profil',shop:'Boutique',parametres:'Paramètres'};
    document.getElementById('viewTitle').textContent=titles[name]||name;
    document.getElementById('sidebar').classList.remove('open');
    // Rendu différé : chaque vue de progression ne reconstruit son contenu qu'à son ouverture,
    // avec les données déjà sauvegardées par recordGame (jamais périmées, jamais reconstruites en trop).
    if(name==='history') renderHistory();
    else if(name==='stats'){ renderStats(); if(C.renderBalanceChart) C.renderBalanceChart(); }
    else if(name==='achievements') renderAchievements();
    else if(name==='profil'){ renderProfile(); if(C.avatars&&C.avatars.refreshFrameLocks) C.avatars.refreshFrameLocks(); }
    else if(name==='shop'&&C.renderShop) C.renderShop();
    else if(name==='weekly'&&C.renderWeekly) C.renderWeekly();
    else if(name==='season'&&C.renderSeason) C.renderSeason();
    else if(name==='vip') renderVip();
    else if(name==='halloffame') renderHallOfFame();
    else if(name==='challenges'&&C.renderChallenges) C.renderChallenges();
    else if(name==='account'&&C.renderAccount) C.renderAccount();
    else if(name==='leaderboard'&&C.renderLeaderboard) C.renderLeaderboard();
  }
  document.addEventListener('click',(e)=>{
    const viewEl=e.target.closest('[data-view]'); if(viewEl){ switchView(viewEl.dataset.view); return; }
    const starEl=e.target.closest('.fav-star'); if(starEl){ toggleFavorite(starEl.dataset.game); return; }
  });
  document.getElementById('burgerBtn').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
  // ---- Plein écran (bonus au resserrement général de la mise en page ci-dessus) : utile sur
  // les petites fenêtres/portables où même une mise en page compacte peut encore nécessiter de
  // défiler pour un jeu chargé (Blackjack...). Bouton masqué si l'API n'est pas disponible
  // (ex. certains navigateurs mobiles) plutôt que de laisser un bouton mort. ----
  const fsBtn=document.getElementById('fsToggleBtn');
  if(fsBtn){
    if(!document.documentElement.requestFullscreen){
      fsBtn.style.display='none'; // API indisponible (ex. certains navigateurs mobiles) : pas de bouton mort
    } else {
      fsBtn.addEventListener('click',()=>{
        if(!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
        else document.exitFullscreen().catch(()=>{});
      });
      document.addEventListener('fullscreenchange',()=>{
        const on=!!document.fullscreenElement;
        fsBtn.setAttribute('aria-pressed',String(on));
        fsBtn.title=on?'Quitter le plein écran':'Plein écran';
      });
    }
  }
  document.getElementById('sidebarOverlay').addEventListener('click',()=>document.getElementById('sidebar').classList.remove('open'));
  document.getElementById('themeToggle').addEventListener('click',(e)=>{
    const isLight=document.documentElement.getAttribute('data-theme')==='light';
    if(isLight){ document.documentElement.removeAttribute('data-theme'); e.target.textContent='Activé'; e.target.classList.add('on'); e.target.setAttribute('aria-pressed','true'); try{localStorage.setItem(THEME_KEY,'dark');}catch(err){} }
    else { document.documentElement.setAttribute('data-theme','light'); e.target.textContent='Désactivé'; e.target.classList.remove('on'); e.target.setAttribute('aria-pressed','false'); try{localStorage.setItem(THEME_KEY,'light');}catch(err){} }
  });
  // Lien profond (raccourcis PWA, manifest.json → shortcuts) : si l'URL charge avec un
  // fragment reconnu (#slots, #missions...), on clique le bouton de navigation correspondant —
  // exactement comme un vrai clic de l'utilisateur, aucune logique de navigation dupliquée.
  (function openDeepLink(){
    const hash=(location.hash||'').replace('#','');
    if(!hash) return;
    const btn=document.querySelector('[data-view="'+hash+'"]');
    if(btn) btn.click();
  })();

  // ====== MODULE: Aide aux cartes (réutilisée par blackjack, baccarat, ride the bus) ======
  const SUITS=['♠','♥','♦','♣'];
  const RANKS=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  C.newDeck = function(){ const d=[]; for(const s of SUITS) for(const r of RANKS) d.push({r,s}); for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [d[i],d[j]]=[d[j],d[i]];} return d; };
  // Carte 3D à deux faces (recto visible / verso pour la carte cachée du croupier) :
  // un seul point d'entrée, réutilisé tel quel par blackjack, baccarat et ride the bus.
  C.renderCard = function(card,hidden,big){
    const wrap=document.createElement('div'); wrap.className='card-3d'+(big?' lg':'');
    const inner=document.createElement('div'); inner.className='card-flip'+(hidden?' is-back':'');
    const face=document.createElement('div'); face.className='card-face'+(['♥','♦'].includes(card.s)?' red':'');
    face.textContent=card.r+card.s;
    const back=document.createElement('div'); back.className='card-back';
    inner.appendChild(face); inner.appendChild(back);
    wrap.appendChild(inner);
    return wrap;
  };

  document.getElementById('hist-filter').addEventListener('change', renderHistory);
  document.getElementById('hist-sort').addEventListener('change', renderHistory);
  renderHome();
  renderStats();
  C.renderBalance();
  checkAchievements();
  loadMissions();
  renderMissions();
  renderVip();
  renderEventBanner();

  // ====== MODULE: Bonus quotidien ======
  // Octroyé au plus une fois par jour (dailyBonusPending posé plus haut, dans State & Storage,
  // au moment même où la série de jours est recalculée). Différé via setTimeout(0) pour que
  // audio.js (chargé juste après ce script) ait eu le temps d'attacher C.sound avant qu'on l'appelle.
  const DAILY_BONUS_TABLE=[50,75,100,125,150,200,300];
  if(dailyBonusPending){
    setTimeout(()=>{
      const ev=activeEvent(); const mult=(ev&&ev.dailyBonusMult)||1;
      const amount=DAILY_BONUS_TABLE[dailyBonusPending-1]*mult;
      C.state.balance+=amount; C.saveBalance(); C.renderBalance();
      showToast((mult>1?'🎁 Bonus quotidien (x'+mult+' événement) — Jour ':'🎁 Bonus quotidien — Jour ')+dailyBonusPending+' : +'+amount+' jetons');
      C.sound&&C.sound('achievement');
    },0);
  }

  return C;
})();
