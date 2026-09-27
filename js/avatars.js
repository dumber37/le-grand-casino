/* ============================================================
   AVATARS & CROUPIERS — dessinés en SVG pur (aucune image externe,
   fonctionne hors-ligne). Trois usages :
   - C.avatars.html(nom, taille) : visage rond d'un joueur ou d'un bot.
     Les bots (Marco, Léa, Victor) ont un visage dessiné à la main ;
     tout autre nom (toi, tes amis) obtient un visage unique généré de
     façon stable à partir du nom (même nom = même visage, partout).
   - Les éléments .dealer[data-dealer="cards|roulette"] reçoivent un
     croupier / une croupière. Il « distribue » (bras qui balaie) à
     chaque carte donnée ou lancer de bille : l'animation se branche sur
     le son 'card' / 'spin' déjà émis par les jeux, sans toucher leur code.
   ============================================================ */
window.Casino=window.Casino||{};
(function(){
  const C=window.Casino;

  const hash=s=>{ let h=2166136261; String(s).split('').forEach(ch=>{ h^=ch.charCodeAt(0); h=Math.imul(h,16777619); }); return h>>>0; };
  const at=(arr,h,shift)=>arr[(h>>>shift)%arr.length];

  // ---------- Bots dessinés à la main ----------
  const BOTS={
    'Marco': {bg:'#5f1e1e',skin:'#c68642',hair:'#1a1a1a',style:'short',shirt:'#1c1c1c',hat:true,mustache:true},
    'Léa':   {bg:'#1e4d5f',skin:'#f6dcc6',hair:'#d9731f',style:'bob',shirt:'#2f8a5a',foxEars:true},
    'Victor':{bg:'#2b2b3a',skin:'#e0ac8a',hair:'#8a8f98',style:'short',shirt:'#23233a',glasses:true,beard:true}
  };
  const SKINS=['#f6dcc6','#f2d0b5','#e0ac8a','#c68642','#8d5524'];
  const HAIRS=['#2b1b12','#5a3825','#b5651d','#d8b26e','#7a7a7a','#111111'];
  const SHIRTS=['#2f5d8a','#8a2f4e','#2f8a5a','#6a4bb0','#b0742f'];
  const BGS=['#1e3a5f','#5f1e3a','#1e5f3f','#3f1e5f','#5f4a1e'];
  const STYLES=['short','long','bob','bald','short'];

  // ---------- Avatar personnalisé du joueur + visages reçus des amis (multijoueur) ----------
  const CUSTOM_KEY='grand-casino-avatar-custom';
  const HEX=/^#[0-9a-f]{6}$/i;
  // Valide des traits venus de l'extérieur (localStorage, ami) : couleurs hexadécimales et
  // styles connus uniquement, sinon on renvoie null — jamais de contenu libre injecté dans le SVG.
  function clean(t){
    if(!t||typeof t!=='object') return null;
    if(!['short','long','bob','bald'].includes(t.style)) return null;
    for(const k of ['bg','skin','hair','shirt']) if(typeof t[k]!=='string'||!HEX.test(t[k])) return null;
    return {bg:t.bg,skin:t.skin,hair:t.hair,shirt:t.shirt,style:t.style,glasses:!!t.glasses,mustache:!!t.mustache,beard:!!t.beard,hat:!!t.hat,foxEars:!!t.foxEars};
  }
  const remote={};   // nom d'un ami -> traits reçus
  let custom=null;
  try{ custom=clean(JSON.parse(localStorage.getItem(CUSTOM_KEY)||'null')); }catch(e){}
  function pseudo(){ try{ return localStorage.getItem('grand-casino-pseudo')||'Joueur'; }catch(e){ return 'Joueur'; } }
  const myTraits=()=>custom||traitsFor(pseudo());

  function traitsFor(name){
    if(BOTS[name]) return BOTS[name];
    if(remote[name]) return remote[name];
    const h=hash(name||'?');
    return {
      bg:at(BGS,h,3), skin:at(SKINS,h,5), hair:at(HAIRS,h,8), style:at(STYLES,h,11), shirt:at(SHIRTS,h,14),
      glasses:((h>>>17)%4)===0, mustache:((h>>>19)%7)===0, beard:((h>>>21)%9)===0
    };
  }

  function faceSvg(o){
    const sk=o.skin, hr=o.hair, ink='#2a1a12';
    let s='<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">';
    s+='<rect width="64" height="64" fill="'+o.bg+'"/>';
    s+='<path d="M4 66 Q6 49 32 47 Q58 49 60 66Z" fill="'+o.shirt+'"/><path d="M26 47 L32 57 L38 47Z" fill="#f4ecd8"/>';
    s+='<rect x="28" y="40" width="8" height="9" rx="3" fill="'+sk+'"/>';
    if(o.foxEars) s+='<path d="M19 22 L17 5 L29 14Z" fill="'+hr+'"/><path d="M20.5 19 L19.5 9 L26 14Z" fill="#f4b6a0"/><path d="M45 22 L47 5 L35 14Z" fill="'+hr+'"/><path d="M43.5 19 L44.5 9 L38 14Z" fill="#f4b6a0"/>';
    if(o.style==='bob') s+='<path d="M17 30 Q15 10 32 10 Q49 10 47 30 L47 44 Q41 46 40 38 L24 38 Q23 46 17 44Z" fill="'+hr+'"/>';
    if(o.style==='long') s+='<path d="M17 30 Q15 10 32 10 Q49 10 47 30 L50 54 L14 54Z" fill="'+hr+'"/>';
    s+='<ellipse cx="19" cy="31" rx="2.4" ry="3.6" fill="'+sk+'"/><ellipse cx="45" cy="31" rx="2.4" ry="3.6" fill="'+sk+'"/>';
    s+='<ellipse cx="32" cy="29" rx="13" ry="15" fill="'+sk+'"/>';
    if(o.style==='short') s+='<path d="M19 27 Q19 12 32 12 Q45 12 45 27 Q40 19 32 19 Q24 19 19 27Z" fill="'+hr+'"/>';
    else if(o.style==='bob'||o.style==='long') s+='<path d="M19 26 Q22 14 32 14 Q42 14 45 26 Q38 20 32 21 Q26 20 19 26Z" fill="'+hr+'"/>';
    if(o.beard) s+='<path d="M19.5 33 Q20 50 32 51 Q44 50 44.5 33 Q41 44 32 44 Q23 44 19.5 33Z" fill="'+hr+'"/>';
    s+='<ellipse cx="26.5" cy="30" rx="1.7" ry="2" fill="'+ink+'"/><ellipse cx="37.5" cy="30" rx="1.7" ry="2" fill="'+ink+'"/>';
    s+='<path d="M23.5 26 Q26.5 24.5 29.5 26 M34.5 26 Q37.5 24.5 40.5 26" stroke="'+ink+'" stroke-width="1.2" fill="none" stroke-linecap="round"/>';
    s+='<path d="M32 32 Q33.6 35 31.6 35.6" stroke="rgba(0,0,0,.28)" stroke-width="1" fill="none" stroke-linecap="round"/>';
    if(o.mustache) s+='<path d="M25 37 Q28.5 34.5 32 36.5 Q35.5 34.5 39 37 Q35.5 38.4 32 37.6 Q28.5 38.4 25 37Z" fill="'+hr+'"/>';
    s+='<path d="M27.5 39.5 Q32 43 36.5 39.5" stroke="'+ink+'" stroke-width="1.4" fill="none" stroke-linecap="round"/>';
    if(o.glasses) s+='<g fill="none" stroke="#111" stroke-width="1.3"><circle cx="26.5" cy="30" r="4.6"/><circle cx="37.5" cy="30" r="4.6"/><path d="M31 30 h2"/></g>';
    if(o.hat) s+='<rect x="16" y="14" width="32" height="4" rx="1.5" fill="#111"/><rect x="21" y="1" width="22" height="14" rx="2" fill="#191919"/><rect x="21" y="10" width="22" height="3" fill="#a3352f"/>';
    return s+'</svg>';
  }

  // ---------- API visage ----------
  const cache={};
  const wrap=(svg,size)=>'<span class="av" style="width:'+(size||24)+'px;height:'+(size||24)+'px">'+svg+'</span>';
  function face(name){ return cache[name]||(cache[name]=faceSvg(traitsFor(name))); }
  // 'Toi' = ton avatar personnalisé ; bot connu = son visage ; ami = ses traits reçus ; sinon visage
  // généré de façon stable depuis le nom.
  function html(name,size){
    if(name==='Toi') return wrap(faceSvg(myTraits()),size);
    return wrap(face(name),size);
  }
  // Visage à partir de traits fournis (ex. instantané d'une table reçu de l'hôte).
  function htmlTraits(t,size){ const c=clean(t); return c?wrap(faceSvg(c),size):null; }
  function remember(name,t){ const c=clean(t); if(c&&name){ remote[name]=c; delete cache[name]; } }

  // ---------- Éditeur d'avatar (page Profil) ----------
  const OPTS={
    style:[['short','Court'],['long','Long'],['bob','Carré'],['bald','Chauve']],
    skin:SKINS, hair:HAIRS, shirt:SHIRTS, bg:BGS
  };
  const ACCESS=[['glasses','Lunettes'],['mustache','Moustache'],['beard','Barbe'],['hat','Haut-de-forme'],['foxEars','Oreilles de renard']];
  const LABELS={skin:'Peau',hair:'Cheveux',shirt:'Tenue',bg:'Fond'};
  function saveCustom(t){ custom=clean(t); try{ if(custom) localStorage.setItem(CUSTOM_KEY,JSON.stringify(custom)); else localStorage.removeItem(CUSTOM_KEY); }catch(e){} }
  function refreshProfileAvatar(){
    const pf=document.getElementById('pf-avatar'); if(pf) pf.innerHTML=html('Toi',64);
    const pv=document.getElementById('av-preview'); if(pv) pv.innerHTML=html('Toi',112);
  }
  function refreshEditor(box){
    const t=myTraits();
    box.querySelectorAll('[data-k]').forEach(b=>b.classList.toggle('sel',t[b.dataset.k]===b.dataset.v));
    box.querySelectorAll('[data-t]').forEach(b=>{ const on=!!t[b.dataset.t]; b.classList.toggle('sel',on); b.setAttribute('aria-pressed',String(on)); });
    refreshProfileAvatar();
  }
  function buildEditor(){
    const box=document.getElementById('av-editor'); if(!box) return;
    let h='<div class="avx-preview" id="av-preview"></div>';
    h+='<div class="avx-row"><span>Coiffure</span><div class="avx-opts">'+OPTS.style.map(o=>'<button data-k="style" data-v="'+o[0]+'">'+o[1]+'</button>').join('')+'</div></div>';
    ['skin','hair','shirt','bg'].forEach(k=>{
      h+='<div class="avx-row"><span>'+LABELS[k]+'</span><div class="avx-sws">'+OPTS[k].map(c=>'<button class="avx-sw" data-k="'+k+'" data-v="'+c+'" style="background:'+c+'" aria-label="'+LABELS[k]+' '+c+'"></button>').join('')+'</div></div>';
    });
    h+='<div class="avx-row"><span>Accessoires</span><div class="avx-opts">'+ACCESS.map(a=>'<button data-t="'+a[0]+'" aria-pressed="false">'+a[1]+'</button>').join('')+'</div></div>';
    h+='<div class="avx-actions"><button data-act="random">🎲 Aléatoire</button><button data-act="reset">↺ Automatique (selon mon pseudo)</button></div>';
    box.innerHTML=h;
    const change=patch=>{ saveCustom(Object.assign({},myTraits(),patch)); refreshEditor(box); document.dispatchEvent(new Event('avatar-changed')); };
    box.addEventListener('click',e=>{
      const b=e.target.closest('button'); if(!b) return;
      if(b.dataset.k) change({[b.dataset.k]:b.dataset.v});
      else if(b.dataset.t) change({[b.dataset.t]:!myTraits()[b.dataset.t]});
      else if(b.dataset.act==='random'){
        const r=a=>a[Math.floor(Math.random()*a.length)];
        change({bg:r(BGS),skin:r(SKINS),hair:r(HAIRS),shirt:r(SHIRTS),style:r(['short','long','bob','bald']),glasses:Math.random()<.3,mustache:Math.random()<.15,beard:Math.random()<.12,hat:Math.random()<.1,foxEars:Math.random()<.08});
      } else if(b.dataset.act==='reset'){ saveCustom(null); refreshEditor(box); document.dispatchEvent(new Event('avatar-changed')); }
    });
    refreshEditor(box);
  }

  // ---------- Croupier / croupière ----------
  function dealerSvg(theme){
    const rou=theme==='roulette';
    const vest=rou?'#5a0f1c':'#161616', tie=rou?'#d4af37':'#a3352f', skin=rou?'#c68a5e':'#e8b896', hair=rou?'#1b100b':'#1b1410', gold='#d4af37';
    let s='<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">';
    s+='<path d="M24 100 Q12 108 16 120" stroke="'+vest+'" stroke-width="11" fill="none" stroke-linecap="round"/>';
    if(rou) s+='<path d="M43 46 Q38 70 46 80 L52 62Z M77 46 Q82 70 74 80 L68 62Z" fill="'+hair+'"/>';
    s+='<path d="M16 120 Q20 82 60 78 Q100 82 104 120Z" fill="'+vest+'"/>';
    s+='<path d="M48 80 L60 106 L72 80Z" fill="#f4ecd8"/><path d="M48 80 L60 106 L72 80" stroke="'+gold+'" stroke-width="1.4" fill="none"/>';
    s+='<circle cx="60" cy="111" r="1.8" fill="'+gold+'"/><circle cx="60" cy="117" r="1.8" fill="'+gold+'"/>';
    s+='<rect x="34" y="99" width="15" height="7" rx="1.5" fill="'+gold+'"/><rect x="36" y="101.4" width="11" height="1.2" fill="rgba(0,0,0,.4)"/>';
    s+='<path d="M50 84 L60 88 L50 94Z" fill="'+tie+'"/><path d="M70 84 L60 88 L70 94Z" fill="'+tie+'"/><circle cx="60" cy="88" r="2.6" fill="'+tie+'" stroke="rgba(0,0,0,.35)" stroke-width=".8"/>';
    s+='<rect x="54" y="66" width="12" height="16" rx="4" fill="'+skin+'"/>';
    s+='<ellipse cx="43.5" cy="52" rx="2.8" ry="4.2" fill="'+skin+'"/><ellipse cx="76.5" cy="52" rx="2.8" ry="4.2" fill="'+skin+'"/>';
    s+='<ellipse cx="60" cy="50" rx="16.5" ry="19" fill="'+skin+'"/>';
    s+='<path d="M43.5 48 Q43 28 60 28 Q77 28 76.5 48 Q73 38 60 37 Q47 38 43.5 48Z" fill="'+hair+'"/>';
    if(rou) s+='<circle cx="60" cy="26" r="7" fill="'+hair+'"/>';
    s+='<ellipse cx="53" cy="49" rx="1.9" ry="2.2" fill="#22150e"/><ellipse cx="67" cy="49" rx="1.9" ry="2.2" fill="#22150e"/>';
    s+='<path d="M49 44.5 Q53 42.5 57 44.5 M63 44.5 Q67 42.5 71 44.5" stroke="#22150e" stroke-width="1.4" fill="none" stroke-linecap="round"/>';
    if(!rou) s+='<path d="M53 58 Q56.5 55.5 60 57.5 Q63.5 55.5 67 58 Q63.5 59.4 60 58.6 Q56.5 59.4 53 58Z" fill="'+hair+'"/>';
    s+='<path d="M53.5 61.5 Q60 66.5 66.5 61.5" stroke="'+(rou?'#8a1f1f':'#22150e')+'" stroke-width="1.8" fill="none" stroke-linecap="round"/>';
    s+='<g class="d-arm"><path d="M84 92 L104 106" stroke="'+vest+'" stroke-width="11" stroke-linecap="round"/><circle cx="106" cy="108" r="6.5" fill="#f4ecd8"/>';
    s+=rou?'<circle cx="113" cy="102" r="3.2" fill="#fff" stroke="#bbb" stroke-width=".6"/>'
          :'<rect x="108" y="97" width="9" height="13" rx="1.5" fill="#fff" stroke="#999" stroke-width=".6" transform="rotate(12 112 103)"/>';
    return s+'</g></svg>';
  }
  function mountDealers(){
    document.querySelectorAll('.dealer[data-dealer]').forEach(el=>{
      if(el.dataset.mounted) return; el.dataset.mounted='1';
      const rou=el.dataset.dealer==='roulette';
      el.innerHTML=dealerSvg(el.dataset.dealer)+'<span class="dealer-label">'+(rou?'Croupière':'Croupier')+'</span>';
      el.setAttribute('role','img'); el.setAttribute('aria-label',rou?'Croupière de la roulette':'Croupier');
    });
  }
  function pulseDealers(){
    document.querySelectorAll('.view.active .dealer').forEach(el=>{ el.classList.remove('dealing'); void el.offsetWidth; el.classList.add('dealing'); });
  }
  // Le croupier réagit aux sons déjà émis par les jeux : 'card' (carte distribuée) et 'spin' (bille lancée).
  const baseSound=C.sound;
  if(typeof baseSound==='function'){
    C.sound=function(name){ if(name==='card'||name==='spin') pulseDealers(); return baseSound.apply(this,arguments); };
  }

  C.avatars={html,htmlTraits,face,pseudo,mountDealers,myTraits,clean,remember};
  mountDealers(); buildEditor(); refreshProfileAvatar();
})();
