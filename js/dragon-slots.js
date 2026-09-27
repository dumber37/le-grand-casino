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
    jackpotIcon: '🐉',
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
