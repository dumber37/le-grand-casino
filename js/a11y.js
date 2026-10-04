/* ============================================================
   ACCESSIBILITÉ — taille du texte, contraste élevé, mode daltonien
   (gains en bleu et pertes en orange au lieu de vert/rouge) et réduction
   des animations (suit par défaut la préférence du système). Pose
   simplement des attributs data-* sur <html> que css/extras.css exploite.
   ============================================================ */
(function(){
  const KEY='grand-casino-a11y';
  const sysReduce=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  let s={fs:0,contrast:false,cb:false,motion:sysReduce};
  try{ const p=JSON.parse(localStorage.getItem(KEY)||'null'); if(p&&typeof p==='object'){ s.fs=[0,1,2].includes(p.fs)?p.fs:0; s.contrast=!!p.contrast; s.cb=!!p.cb; if(typeof p.motion==='boolean') s.motion=p.motion; } }catch(e){}
  const root=document.documentElement;
  function apply(){
    if(s.fs) root.setAttribute('data-fs',String(s.fs)); else root.removeAttribute('data-fs');
    if(s.contrast) root.setAttribute('data-contrast','high'); else root.removeAttribute('data-contrast');
    if(s.cb) root.setAttribute('data-cb','1'); else root.removeAttribute('data-cb');
    root.setAttribute('data-motion',s.motion?'reduce':'allow');
  }
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(s)); }catch(e){} }
  apply();

  const $=id=>document.getElementById(id);
  function syncToggle(btn,on){ if(!btn) return; btn.textContent=on?'Activé':'Désactivé'; btn.classList.toggle('on',on); btn.setAttribute('aria-pressed',String(on)); }
  function syncAll(){
    document.querySelectorAll('#a11yFont button').forEach(b=>b.classList.toggle('on',parseInt(b.dataset.v,10)===s.fs));
    syncToggle($('a11yContrast'),s.contrast); syncToggle($('a11yCb'),s.cb); syncToggle($('a11yMotion'),s.motion);
  }
  document.querySelectorAll('#a11yFont button').forEach(b=>b.addEventListener('click',()=>{ s.fs=parseInt(b.dataset.v,10); apply(); save(); syncAll(); }));
  [['a11yContrast','contrast'],['a11yCb','cb'],['a11yMotion','motion']].forEach(([id,k])=>{
    const btn=$(id); if(btn) btn.addEventListener('click',()=>{ s[k]=!s[k]; apply(); save(); syncAll(); });
  });
  syncAll();
})();
