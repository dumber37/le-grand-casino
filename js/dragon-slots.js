/* ============================================================
   FORTUNE DRAGON — machine à sous à thème chinois
   Mêmes mécaniques que la machine classique (moteur partagé),
   seuls le thème visuel et la table des gains changent. Le dragon
   doré est le symbole jackpot : animation spéciale à l'alignement.
   ============================================================ */
(function(){
  window.Casino.createSlotMachine({
    prefix: 'sd',
    gameKey: 'dragon',
    defaultBet: 10, minBet: 5, maxBet: 100, betStep: 5,
    rows: 3, cols: 5,
    // Une « petite combinaison » (2 symboles identiques ou plus sur une ligne de 5) est quasi systématique (98 % des lignes) et
    // paie sur CHACUNE des 3 lignes : à 0,5 × la mise le retour atteignait ≈ 154 %. À 0,3 × la mise : ≈ 96 % (équilibré).
    pairMultiplier: 0.3,
    jackpotIcon: '🐉',
    // Embrase la bannière GRAND de la cabine quand le dragon d'or tombe — purement décoratif,
    // n'affecte jamais le calcul du gain (déjà déterminé par le moteur avant cet appel).
    onJackpot: function(){
      const b=document.getElementById('dr-grandBand'); if(!b) return;
      b.classList.remove('dr-hit'); void b.offsetWidth; b.classList.add('dr-hit');
    },
    symbols: [
      {icon:'🐱', weight:38, payout:3},   // chat porte-bonheur (maneki-neko)
      {icon:'🏮', weight:26, payout:5},   // lanterne rouge
      {icon:'🪙', weight:18, payout:8},   // pièce percée chinoise
      {icon:'🥁', weight:10, payout:15},  // gong
      {icon:'福', weight:6,  payout:25},  // caractère bonheur/chance
      {icon:'🐉', weight:2,  payout:60}   // dragon doré — jackpot
    ]
  });
})();
