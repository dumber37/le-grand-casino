/* ============================================================
   SLOTS — Machine à sous classique
   Config passée au moteur partagé (slot-engine.js) : symboles,
   poids et gains STRICTEMENT identiques à la version d'origine.
   ============================================================ */
(function(){
  window.Casino.createSlotMachine({
    prefix: 's',
    gameKey: 'slots',
    defaultBet: 10, minBet: 5, maxBet: 100, betStep: 5,
    symbols: [
      {icon:'🍒', weight:40, payout:3},
      {icon:'🍋', weight:28, payout:5},
      {icon:'🔔', weight:16, payout:10},
      {icon:'💎', weight:10, payout:20},
      {icon:'7️⃣', weight:4,  payout:50}
    ]
  });
})();
