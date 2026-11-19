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
| `styles/modals.css` | Pause and game-over dialogs |
| `styles/joystick.css` | Touch joystick |
| `styles/menu.css` | Main title screen |
| `js/config.js` | Fixed tuning values such as distances, speeds, and limits |
| `js/state.js` | Values that can change during a game session |
| `js/input.js` | Keyboard input, score-name entry, touch joystick, and pause/restart buttons |
| `js/camera-controls.js` | Mouse camera orbit, zoom, and camera-relative movement directions |
| `js/loop.js` | Coordinates rendering, worker synchronization, and combat VFX |
| `js/game.worker.js` | Off-thread simulation: player physics, enemy waves, combat, and collision math |
| `js/enemy-renderer.js` | 3D visual representation and smooth interpolation of active enemies |
| `js/combat-vfx.js` | Procedural spear arcs, impact sparks, and visual feedback |
| `js/particles.js` | Footstep dust and burst effects |
| `js/scene.js` | Three.js scene, lighting, camera, environment, and rendering |
| `js/player.js` | Player root composition and animator bindings |
| `js/player/rig.js` | Procedural articulated Myrmidon geometry (helmet, armour, spear, shield) |
| `js/player/animator.js` | Procedural locomotion, stances, and attack animations |
| `js/hud.js` | Updates the information displayed on screen |
| `js/leaderboard.js` | Loads scores and submits new scores to the API |

## What Happens During a Frame?

The `renderFrame()` function in `loop.js` is called by `requestAnimationFrame()`.

When the game is active, `loop.js` performs these steps in order:

1. Send keyboard and camera yaw inputs to `game.worker.js`.
2. Interpolate player and enemy transforms received from the simulation worker.
3. Update player character animations and footstep dust.
4. Synchronize 3D enemy models via `enemy-renderer.js`.
5. Update combat visual effects and particles.
6. Smoothly track camera target with attack punch reactions.
7. Render the Three.js scene and update telemetry HUD.

While the game is paused or over, gameplay simulation stops while camera controls and scene rendering remain interactive.

## Where to Make Changes

- To adjust fixed tuning constants, edit `config.js`.
- To change simulation logic, physics, or enemy waves, edit `game.worker.js`.
- To change movement or keyboard bindings, edit `input.js`.
- To change hero geometry, materials, or animations, edit `js/player/`.
- To change the arena, lighting, or rendering, edit `scene.js`.
- To change the mouse camera behaviour or sensitivity, edit `camera-controls.js`.
- To change score submission or leaderboard rendering, edit `leaderboard.js`.
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

## Character Animation and Weapon Grip

The player uses a procedural joint hierarchy for hips, knees, feet, shoulders, and elbows. Locomotion blends between idle breathing and an alternating gait. Attack animations have anticipation, a strike phase, and recovery.

- Hold `Shift` to use the spear one-handed and keep the shield in a forward guard.
- Release `Shift` to return to a two-handed spear grip and stow the physical shield on the back.
- The Orbital Aegis upgrade is represented by an energy shard rather than a second physical shield.

Enemies use articulated limbs, telegraphed attacks, hit reactions, and short recovery windows.

## Collision Model

The arena uses circular gameplay colliders for braziers and outer columns. The player and enemies are pushed out of these obstacles, and enemy groups separate instead of occupying the same space. Enemies no longer damage the player merely by touching them: their attack animation must reach its strike phase.

The player root stays on the arena ground plane. Feet use separate joints so the gait can be tuned without moving the entire character through the floor. This is a lightweight gameplay collision model, not a full rigid-body simulation.

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
