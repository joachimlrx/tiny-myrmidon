# Understanding the Game Frontend

This folder contains the browser-based 3D game. It is built with JavaScript and Three.js.

The main goal is simple: **each file should have one responsibility that is easy to explain**.

## Getting Started

The browser loads `index.html`. This page loads the stylesheets, configures the Three.js import map, and starts `js/loop.js`.

The game does not require a separate JavaScript build step.

## File Structure

| File | Responsibility |
| --- | --- |
| `index.html` | Page structure: title screen, HUD, menus, and Three.js import map |
| `styles/base.css` | Shared page styles and button defaults |
| `styles/hud.css` | Health and XP bars, level display, pause button, and keyboard help |
| `styles/modals.css` | Pause, upgrade, and game-over dialogs |
| `styles/joystick.css` | Touch joystick |
| `styles/menu.css` | Main title screen |
| `js/config.js` | Fixed tuning values such as distances, speeds, and limits |
| `js/state.js` | Values that can change during a game session |
| `js/input.js` | Keyboard input, score-name entry, touch joystick, and pause/restart buttons |
| `js/camera-controls.js` | Mouse camera orbit, zoom, and camera-relative movement directions |
| `js/loop.js` | Coordinates all systems on every animation frame |
| `js/scene.js` | Three.js scene, lighting, camera, environment, and rendering |
| `js/player.js` | Player model and character animations |
| `js/enemies.js` | Enemy creation, movement, damage, and defeat handling |
| `js/weapons.js` | Spear throws and close-range spear thrusts |
| `js/gems.js` | Experience orbs, attraction, and level progression |
| `js/upgrades.js` | Upgrade choices and their effects |
| `js/hud.js` | Updates the information displayed on screen |
| `js/leaderboard.js` | Loads scores and submits new scores to the API |

## What Happens During a Frame?

The `renderFrame()` function in `loop.js` is called by `requestAnimationFrame()`.

When the game is active, `updateGame()` performs these steps in order:

1. Read keyboard or joystick input and move the hero.
2. Update the hero animation.
3. Spawn enemies when the spawn timer expires.
4. Trigger attacks and update spears that are already in flight.
5. Update the Orbital Aegis, enemies, and experience orbs.
6. Update the HUD and gameplay effects.
7. Announce a new wave when the level changes.

While the game is paused or over, gameplay updates stop but the scene continues to render. Camera controls remain available.

## Where to Make Changes

- To adjust a distance, speed, or limit, start with `config.js`.
- To change the initial values for a new game, edit `state.js`.
- To change movement or keyboard bindings, edit `input.js` and the movement functions in `loop.js`.
- To change spear attacks, edit `weapons.js`.
- To change the hero model or its animations, edit `player.js`.
- To change the arena, lighting, or rendering, edit `scene.js`.
- To change the mouse camera behaviour, edit `camera-controls.js`.
- To change upgrades or progression, edit `upgrades.js` and `gems.js`.
- To change the title screen, edit `index.html` and `styles/menu.css`.
- To change score submission or leaderboard rendering, edit `leaderboard.js`.

## Camera Controls

- Hold the left mouse button and drag to rotate the camera around the hero.
- Drag vertically to change the camera pitch.
- Use the mouse wheel to zoom in or out.
- The camera can be controlled on the title screen and while the game is paused.

## Camera-Relative Movement

Keyboard and joystick input are first read as directions on the screen.

`camera-controls.js` converts that direction into world space using the camera's horizontal rotation. This keeps movement aligned with the current view:

- `Z` moves towards the top of the screen.
- `S` moves towards the bottom of the screen.
- `Q` moves towards the left of the screen.
- `D` moves towards the right of the screen.

The same conversion is applied to joystick input. WASD and arrow-key alternatives are also supported.

## Score Submission

The game-over name field uses a standard form submit event.

- All normal keyboard characters can be entered, including Z, Q, S, and D.
- Press Enter or click the submit button to save the score.
- While a text field is focused, the game does not intercept typing shortcuts.

## Maintenance Guidelines

- Prefer names that describe intent, such as `updateEnemySpawning()`, over single-letter names.
- Keep each function focused on one task.
- Keep gameplay tuning values in `config.js`.
- Avoid manipulating the DOM from combat systems. Route interface updates through `hud.js`.
- After changing JavaScript, check syntax and automated checks with GitHub Actions.
