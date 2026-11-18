# Comprendre le frontend du jeu

Ce dossier contient le jeu 3D exécuté dans le navigateur. Il est écrit en JavaScript avec Three.js.

L'objectif est simple : **un fichier doit avoir une responsabilité facile à expliquer**.

## Démarrage

Le navigateur ouvre `index.html`. Cette page charge les feuilles de style, configure l'import de Three.js, puis démarre `js/loop.js`.

Le jeu ne nécessite pas de compilation JavaScript séparée.

## Organisation des fichiers

| Fichier | Responsabilité |
| --- | --- |
| `index.html` | Structure de la page : écran d'accueil, HUD, menus et import de Three.js |
| `styles/base.css` | Règles communes de la page et styles de boutons |
| `styles/hud.css` | Barres de vie et d'expérience, niveau, pause et aide clavier |
| `styles/modals.css` | Menus pause, améliorations et fin de partie |
| `styles/joystick.css` | Joystick tactile |
| `js/config.js` | Réglages fixes : distances, vitesses et limites |
| `js/state.js` | Valeurs qui changent pendant une partie |
| `js/input.js` | Clavier, saisie du nom, joystick tactile et boutons pause / redémarrage |
| `js/camera-controls.js` | Rotation de la caméra à la souris et zoom à la molette |
| `js/loop.js` | Coordination des systèmes à chaque image |
| `js/scene.js` | Scène Three.js, lumière, caméra, décor et rendu |
| `js/player.js` | Modèle du héros et ses animations |
| `js/enemies.js` | Création, déplacement, dégâts et élimination des ennemis |
| `js/weapons.js` | Lancers de lance et attaques au contact |
| `js/gems.js` | Orbes d'expérience, attraction et progression |
| `js/upgrades.js` | Choix et application des bénédictions |
| `js/hud.js` | Mise à jour des informations affichées |
| `js/leaderboard.js` | Lecture et envoi des scores à l'API |

## Déroulement d'une image

La fonction `renderFrame()` de `loop.js` est appelée par `requestAnimationFrame()`.

Quand la partie n'est pas en pause, `updateGame()` exécute ces étapes dans cet ordre :

1. Lire les touches ou le joystick et déplacer le héros.
2. Mettre à jour l'animation du héros et la caméra.
3. Faire apparaître les ennemis lorsque le délai de réapparition est écoulé.
4. Déclencher les attaques et déplacer les lances déjà lancées.
5. Mettre à jour le bouclier orbital, les ennemis et les orbes d'expérience.
6. Mettre à jour les effets visuels, le décor animé et le HUD.
7. Annoncer une nouvelle vague si le niveau a changé.

La pause arrête les mises à jour du jeu, mais continue d'afficher la dernière image rendue.

## Où modifier le comportement

- Pour modifier une distance, une vitesse ou une limite, commencer par `config.js`.
- Pour modifier les caractéristiques initiales d'une partie, modifier `state.js`.
- Pour changer les déplacements ou les touches, modifier `input.js` et la lecture des déplacements dans `loop.js`.
- Pour changer les attaques, modifier `weapons.js`.
- Pour changer le modèle ou les mouvements du héros, modifier `player.js`.
- Pour changer l'arène, la lumière ou le rendu, modifier `scene.js`.
- Pour modifier les améliorations ou la progression, modifier `upgrades.js` et `gems.js`.

## Quelques règles de maintenance

- Utiliser des noms qui décrivent l'intention, par exemple `updateEnemySpawning()` plutôt que des noms d'une seule lettre.
- Garder une fonction courte et centrée sur une seule étape du jeu.
- Garder les constantes d'équilibrage dans `config.js`.
- Ne pas manipuler le DOM depuis les systèmes de combat : les mises à jour d'interface passent par `hud.js`.
- Après une modification JavaScript, vérifier la syntaxe avec la CI GitHub Actions.


## Écran d'accueil et caméra

- L'écran titre est dans `index.html` et son apparence dans `styles/menu.css`.
- La partie ne démarre qu'après le bouton `Start your legend` ou la touche Entrée.
- `camera-controls.js` gère la caméra indépendamment du gameplay : glisser avec le bouton gauche de la souris fait tourner la caméra, et la molette règle la distance.
- La caméra reste contrôlable pendant les menus et lorsque la partie est en pause.

## Enregistrement du score

Le formulaire de fin de partie utilise un véritable événement `submit`. On peut écrire avec toutes les touches du clavier, y compris Z, Q, S et D. La touche Entrée envoie le formulaire. Quand le curseur est dans un champ de saisie, les raccourcis du jeu ne capturent pas les caractères.
