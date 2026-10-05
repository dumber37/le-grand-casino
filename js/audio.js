/* ============================================================
   AUDIO — moteur de sons d'ambiance (Web Audio API, synthétisés,
   aucun fichier externe). Expose Casino.sound(name) : chaque jeu
   ou module appelle ce point d'entrée unique aux moments clés déjà
   présents dans le code (flashWin, flashLoss, deal, spin...) plutôt
   que de gérer l'audio lui-même. Réglable / persistant via le
   bouton "Son" des Paramètres.
   ============================================================ */
window.Casino = window.Casino || {};
(function(){
  const C = window.Casino;
  const SOUND_KEY = 'grand-casino-sound';
  let enabled = true;
  try{ const s=localStorage.getItem(SOUND_KEY); if(s!==null) enabled = s==='on'; }catch(e){}

  let ctx = null;
  function ensureCtx(){
    if(!ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return null;
      try{ ctx = new AC(); }catch(e){ return null; }
    }
    if(ctx.state==='suspended'){ ctx.resume().catch(()=>{}); }
    return ctx;
  }
  // Les navigateurs exigent un geste utilisateur avant d'autoriser l'audio :
  // on prépare le contexte dès le premier clic, sans jouer de son.
  document.addEventListener('click', ensureCtx, {once:true, capture:true});

  function tone(c, freq, start, dur, type, peak){
    const osc=c.createOscillator(), gain=c.createGain();
    osc.type=type||'sine';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start+0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start+dur);
    osc.connect(gain); gain.connect(c.destination);
    osc.start(start); osc.stop(start+dur+0.03);
  }
  function sweep(c, f1, f2, start, dur, type, peak){
    const osc=c.createOscillator(), gain=c.createGain();
    osc.type=type||'sine';
    osc.frequency.setValueAtTime(f1, start);
    osc.frequency.exponentialRampToValueAtTime(f2, start+dur);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start+0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start+dur);
    osc.connect(gain); gain.connect(c.destination);
    osc.start(start); osc.stop(start+dur+0.03);
  }

  // Chaque "recette" reçoit le contexte audio et l'heure de départ (c.currentTime).
  const RECIPES = {
    click:       (c,t)=> tone(c, 1250, t, 0.045, 'square', 0.045),
    lever:       (c,t)=>{ tone(c, 220, t, 0.09, 'square', 0.06); tone(c, 90, t+0.06, 0.14, 'square', 0.05); },
    card:        (c,t)=>{ sweep(c, 900, 500, t, 0.05, 'triangle', 0.055); },
    // Carte lancée par le croupier : petit « fiouu » qui retombe, puis le tap sur le feutre.
    deal:        (c,t)=>{ sweep(c, 1900, 650, t, 0.09, 'triangle', 0.03); tone(c, 190, t+0.1, 0.045, 'sine', 0.045); },
    // Rouleau de machine à sous qui s'arrête (clac sec) et rebond de la bille de roulette.
    clack:       (c,t)=>{ tone(c, 130, t, 0.05, 'square', 0.05); tone(c, 880, t, 0.025, 'square', 0.025); },
    hop:         (c,t)=> tone(c, 1700, t, 0.035, 'sine', 0.035),
    // Pièce de métal : impact (tintement aigu qui s'éteint) puis petit rebond plus bref.
    coin:        (c,t)=>{ tone(c, 2093, t, 0.42, 'sine', 0.05); tone(c, 3136, t+0.004, 0.3, 'sine', 0.03); tone(c, 4186, t+0.008, 0.16, 'triangle', 0.016); },
    coinTink:    (c,t)=>{ tone(c, 2637, t, 0.13, 'sine', 0.035); tone(c, 3951, t, 0.08, 'sine', 0.02); },
    reveal:      (c,t)=> tone(c, 1400, t, 0.06, 'sine', 0.05),
    spin:        (c,t)=> sweep(c, 260, 620, t, 0.35, 'sine', 0.035),
    win:         (c,t)=>{ [523.25,659.25,783.99].forEach((f,i)=>tone(c, f, t+i*0.075, 0.2, 'sine', 0.08)); },
    loss:        (c,t)=> tone(c, 140, t, 0.24, 'sine', 0.055),
    jackpot:     (c,t)=>{ [523.25,659.25,783.99,1046.5,1318.5].forEach((f,i)=>tone(c, f, t+i*0.09, 0.32, 'sine', 0.1)); },
    flash:       (c,t)=>{ sweep(c, 400, 1600, t, 0.5, 'sine', 0.07); tone(c, 1046.5, t+0.15, 0.35, 'sine', 0.08); },
    achievement: (c,t)=>{ tone(c, 880, t, 0.12, 'sine', 0.08); tone(c, 1174.7, t+0.11, 0.24, 'sine', 0.09); }
  };

  C.sound = function(name){
    if(!enabled) return;
    const c=ensureCtx(); if(!c) return;
    const recipe=RECIPES[name]; if(!recipe) return;
    try{ recipe(c, c.currentTime); }catch(e){}
  };
  C.isSoundEnabled = function(){ return enabled; };
  C.setSoundEnabled = function(v){
    enabled=!!v;
    try{ localStorage.setItem(SOUND_KEY, enabled?'on':'off'); }catch(e){}
  };

  // Ce script est chargé en bas de page, le bouton existe donc déjà dans le DOM.
  const soundBtn=document.getElementById('soundToggle');
  if(soundBtn){
    const sync=()=>{ soundBtn.textContent=enabled?'Activé':'Désactivé'; soundBtn.classList.toggle('on', enabled); soundBtn.setAttribute('aria-pressed', String(enabled)); };
    sync();
    soundBtn.addEventListener('click',()=>{ C.setSoundEnabled(!enabled); sync(); });
  }

  // Clic générique : couvre la quasi-totalité des contrôles (nav, mises, jetons,
  // distribuer, tirer...) sans avoir à instrumenter chaque bouton individuellement.
  document.addEventListener('click',(e)=>{
    if(e.target.closest('button, .missions-home-card')) C.sound('click');
  });
})();
