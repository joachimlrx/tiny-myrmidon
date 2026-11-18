import * as THREE from 'three';

import {
  ARENA_RADIUS,
  FRAME_DT_CAP,
  CAMERA_TARGET_HEIGHT,
  MAX_ENEMIES,
  SPAWN_INTERVAL_BASE,
  SPAWN_INTERVAL_MIN,
  SPAWN_LEVEL_SCALE,
} from './config.js';

import { scene, camera, composer, updateScene } from './scene.js';
import { state } from './state.js';
import {
  player,
  orbitalGroup,
  orbShieldMesh,
  updatePlayerAnimation,
} from './player.js';
import {
  enemies,
  spawnEnemy,
  updateEnemies,
  updateEnemyEffects,
  applyEnemyDamage,
} from './enemies.js';
import { fireSpears, tickFireTimer, updateSpears } from './weapons.js';
import { spawnGem, updateGems } from './gems.js';
import { showUpgrades } from './upgrades.js';
import { updateHud, announceWave } from './hud.js';
import {
  keys,
  touchState,
  isTouchDevice,
  resetTouch,
  initInput,
} from './input.js';
import { initLeaderboardSubmit } from './leaderboard.js';
import { createCameraControls } from './camera-controls.js';

const MAX_PLAYER_RADIUS = ARENA_RADIUS - 1;
const ORBITAL_ROTATION_SPEED = 3.6;
const ORBITAL_DAMAGE_INTERVAL = 0.22;

const movementInput = new THREE.Vector2();
const cameraTarget = new THREE.Vector3();
const orbitalShieldPosition = new THREE.Vector3();
const orbitalKnockbackDirection = new THREE.Vector3();
const cameraControls = createCameraControls(camera);

let previousFrameTime = performance.now();
let elapsedGameTime = 0;
let orbitalDamageTimer = 0;
let lastAnnouncedWave = state.level;

const refreshHud = () => updateHud(state, isTouchDevice);

function showUpgradeSelection() {
  showUpgrades(state, orbitalGroup, resetTouch, refreshHud);
}

function startSession() {
  if (state.started) return;

  state.started = true;
  state.paused = false;

  document.body.classList.remove('menu-active');
  refreshHud();
  announceWave(state.level);
}

function togglePause() {
  const upgradeModal = document.getElementById('upgrade-modal');
  const pauseModal = document.getElementById('pause-modal');

  if (!state.started || state.over) return;
  if (upgradeModal?.classList.contains('is-visible')) return;

  state.paused = !state.paused;
  pauseModal?.classList.toggle('is-visible', state.paused);

  resetTouch();
  refreshHud();
}

/** Combine keyboard and joystick input into one movement vector. */
function readMovementInput() {
  const right = keys.d || keys.arrowright;
  const left = keys.q || keys.a || keys.arrowleft;
  const down = keys.s || keys.arrowdown;
  const up = keys.z || keys.w || keys.arrowup;

  movementInput.set(
    Number(Boolean(right)) - Number(Boolean(left)),
    Number(Boolean(down)) - Number(Boolean(up)),
  );

  if (touchState.active) {
    movementInput.x += touchState.dx;
    movementInput.y += touchState.dz;
  }

  return movementInput;
}

/** Move the hero and keep it inside the arena. */
function updatePlayerMovement(deltaTime) {
  const direction = readMovementInput();
  const inputLength = direction.length();

  if (inputLength <= 0.08) return false;

  direction.multiplyScalar(1 / inputLength);
  player.position.x += direction.x * state.speed * deltaTime;
  player.position.z += direction.y * state.speed * deltaTime;

  const distanceFromCenter = Math.hypot(
    player.position.x,
    player.position.z,
  );

  if (distanceFromCenter > MAX_PLAYER_RADIUS) {
    player.position.multiplyScalar(MAX_PLAYER_RADIUS / distanceFromCenter);
  }

  return true;
}

/** Keep the camera focused on the hero while allowing mouse orbit and zoom. */
function updateCamera(deltaTime) {
  cameraTarget.set(
    player.position.x,
    CAMERA_TARGET_HEIGHT,
    player.position.z,
  );
  cameraControls.update(cameraTarget, deltaTime);
}

/** Spawn enemies at a pace that increases with the current level. */
function updateEnemySpawning(deltaTime) {
  state.spawnTimer -= deltaTime;

  if (state.spawnTimer > 0 || enemies.length >= MAX_ENEMIES) return;

  spawnEnemy(state, scene, player);

  const intervalForLevel =
    SPAWN_INTERVAL_BASE - (state.level - 1) * SPAWN_LEVEL_SCALE;

  state.spawnTimer = Math.max(SPAWN_INTERVAL_MIN, intervalForLevel);
}

/** Move the Orbital Aegis and apply its periodic area damage. */
function updateOrbitalShield(deltaTime) {
  if (!state.hasOrbital) return;

  orbitalGroup.position.copy(player.position);
  state.orbitalAngle += ORBITAL_ROTATION_SPEED * deltaTime;
  orbitalGroup.rotation.y = state.orbitalAngle;

  orbitalDamageTimer -= deltaTime;
  if (orbitalDamageTimer > 0) return;

  orbitalDamageTimer = ORBITAL_DAMAGE_INTERVAL;
  orbitalGroup.updateMatrixWorld(true);
  orbShieldMesh.getWorldPosition(orbitalShieldPosition);

  // Work backwards because defeated enemies are removed from the array.
  for (let index = enemies.length - 1; index >= 0; index -= 1) {
    const enemy = enemies[index];
    const hitDistance = enemy.userData.colliderRadius + 0.5;

    if (
      enemy.dead ||
      orbitalShieldPosition.distanceTo(enemy.position) >= hitDistance
    ) {
      continue;
    }

    orbitalKnockbackDirection
      .subVectors(enemy.position, player.position)
      .setY(0);

    applyEnemyDamage(
      enemy,
      Math.max(1, state.dmg * 0.7),
      state,
      scene,
      spawnGem,
      orbitalKnockbackDirection,
    );

    if (!enemy.dead && orbitalKnockbackDirection.lengthSq() > 0) {
      enemy.userData.knockback.add(
        orbitalKnockbackDirection.normalize().multiplyScalar(1.1),
      );
    }
  }
}

/** Update all gameplay systems for one active frame. */
function updateGame(deltaTime) {
  const isMoving = updatePlayerMovement(deltaTime);

  updatePlayerAnimation(deltaTime, isMoving, state);
  state.upgradeAuraTimer = Math.max(0, state.upgradeAuraTimer - deltaTime);

  updateEnemySpawning(deltaTime);

  tickFireTimer(deltaTime, state);
  fireSpears(state, scene, player);
  updateSpears(deltaTime, state, scene, spawnGem);

  updateOrbitalShield(deltaTime);
  updateEnemies(deltaTime, state, scene, player);
  updateGems(
    deltaTime,
    state,
    scene,
    player,
    showUpgradeSelection,
    refreshHud,
  );

  updateEnemyEffects(deltaTime, scene);
  refreshHud();

  if (state.level !== lastAnnouncedWave) {
    lastAnnouncedWave = state.level;
    announceWave(lastAnnouncedWave);
  }
}

/** Render continuously, even while the title screen or pause menu is visible. */
function renderFrame(currentTime) {
  requestAnimationFrame(renderFrame);

  const elapsedSinceLastFrame = (currentTime - previousFrameTime) / 1000;
  const deltaTime = Math.min(FRAME_DT_CAP, elapsedSinceLastFrame);

  previousFrameTime = currentTime;
  elapsedGameTime += deltaTime;

  // Camera controls and decorative arena lights remain active in menus.
  updateScene(deltaTime, elapsedGameTime);
  updateCamera(deltaTime);

  if (state.paused || state.over) {
    composer.render();
    return;
  }

  updateGame(deltaTime);
  composer.render();
}

function startGame() {
  initInput(state, camera, togglePause, startSession);
  initLeaderboardSubmit(state);

  document.getElementById('start-button')?.addEventListener(
    'click',
    startSession,
  );

  refreshHud();
  requestAnimationFrame(renderFrame);
}

startGame();
