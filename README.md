# 🎰 Le Grand Casino

Casino virtuel 100% fictif, jetons uniquement — aucun argent réel, aucune donnée personnelle.

**[▶ Voir le site en ligne](https://dumber37.github.io/le-grand-casino/)**

## À propos

Site statique multi-pages (HTML/CSS/JS, sans framework ni dépendance externe), jouable hors-ligne grâce à un service worker. Le solde et les statistiques sont sauvegardés en local (localStorage) dans le navigateur — chaque appareil a sa propre partie.

## Jeux

- 🎰 Machine à sous / 🐉 Fortune Dragon
- 🃏 Blackjack (solo et multijoueur)
- 🎡 Roulette
- 🎴 Baccarat
- 🚌 Ride the Bus (solo et multijoueur)
- 🪙 Pile ou Face
- 💣 Mines
- 🚀 Crash
- ♣️ Poker Texas Hold'em
- ♠️ Vidéo Poker
- 📦 Ouverture de caisses
- 🗺️ Plan du casino — vue d'ensemble isométrique pour naviguer entre les salles

## Développement local

Aucune dépendance à installer. Servir le dossier avec n'importe quel serveur statique, par exemple :

```bash
npx serve .
```

## Déploiement

Le site est publié via GitHub Pages depuis la branche `main`. Pour mettre en ligne une modification :

```bash
git add -A
git commit -m "Description du changement"
git push
```

GitHub Pages republie automatiquement le site en ~1 minute après chaque push.
