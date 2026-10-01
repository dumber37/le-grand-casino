/* ============================================================
   TOURNOI HEBDOMADAIRE — ton solde net (gains - mises) cumulé
   depuis le lundi 00:00 (UTC), avec un petit bonus de jetons à
   chaque semaine terminée sur un net positif. Calculé en relisant
   l'historique déjà sauvegardé (grand-casino-history, voir core.js)
   plutôt qu'un nouveau compteur tenu à chaque partie — même logique
   que le graphique de solde (stats-chart.js). Limite assumée : si
   plus de 100 parties sont jouées dans la même semaine, les plus
   anciennes de cette semaine sortent du calcul (l'historique est
   plafonné à 100 entrées, comme la vue Historique elle-même).
   ============================================================ */
window.Casino = window.Casino || {};
(function(){
  const C = window.Casino;
  const WK_KEY='grand-casino-weekly-tournament';

  function weekStartDate(){
    const d=new Date();
    const day=d.getUTCDay(); // 0=dimanche .. 6=samedi
    const diff=(day===0?-6:1-day); // recule jusqu'au lundi de cette semaine
    return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()+diff));
  }
  function weekStartStr(){ return weekStartDate().toISOString().slice(0,10); }
  function readState(){ try{ const raw=localStorage.getItem(WK_KEY); return raw?JSON.parse(raw):null; }catch(e){ return null; } }
  function saveState(s){ try{ localStorage.setItem(WK_KEY, JSON.stringify(s)); }catch(e){} }
  function netSince(tsStart,tsEnd){
    return C.getHistory().filter(h=>h.time>=tsStart && (tsEnd==null||h.time<tsEnd)).reduce((s,h)=>s+h.net,0);
  }
  function rewardFor(net){ if(net>=1000) return 300; if(net>=500) return 150; if(net>0) return 50; return 0; }

  const curWeekStart=weekStartStr();
  const curWeekStartTs=weekStartDate().getTime();
  let state=readState();
  if(!state){ state={weekStart:curWeekStart, pastWeeks:[]}; saveState(state); }
  else if(state.weekStart!==curWeekStart){
    const prevStartTs=Date.parse(state.weekStart+'T00:00:00Z');
    const net=netSince(prevStartTs, curWeekStartTs);
    const reward=rewardFor(net);
    state.pastWeeks.unshift({weekStart:state.weekStart, net, reward});
    if(state.pastWeeks.length>12) state.pastWeeks.length=12;
    if(reward>0){
      C.state.balance+=reward; C.saveBalance(); C.renderBalance();
      C.showToast&&C.showToast('🏅 Semaine terminée : +'+reward+' jetons de bonus !');
    }
    state.weekStart=curWeekStart;
    saveState(state);
  }

  function fmtCountdown(ms){
    const totalH=Math.max(0,Math.floor(ms/3600000)), d=Math.floor(totalH/24), h=totalH%24;
    return d+'j '+h+'h';
  }
  function render(){
    const netEl=document.getElementById('wk-net'), countdownEl=document.getElementById('wk-countdown'), pastEl=document.getElementById('wk-past');
    if(!netEl) return;
    const net=netSince(curWeekStartTs, null);
    netEl.textContent=(net>0?'+':'')+net;
    netEl.className='hist-net'+(net>0?' pos':(net<0?' neg':''));
    countdownEl.textContent=fmtCountdown(curWeekStartTs+7*86400000-Date.now());
    pastEl.innerHTML = state.pastWeeks.length
      ? state.pastWeeks.map(w=>'<div class="profile-row"><span>Semaine du '+w.weekStart+'</span><b class="hist-net'+(w.net>0?' pos':(w.net<0?' neg':''))+'">'+(w.net>0?'+':'')+w.net+(w.reward>0?' (+'+w.reward+' 🪙)':'')+'</b></div>').join('')
      : '<p class="empty-state">Termine ta première semaine pour voir ton historique ici.</p>';
  }
  C.renderWeekly = render;
})();
