import * as THREE from 'three';
import { scene, camera, renderer, updateScene } from './scene.js';
import { state } from './state.js';
import {
  player,
  spearTip,
  updatePlayerAnimation,
  triggerPlayerAttack,
  triggerPlayerHit,
} from './player.js';
import { keys, initInput, resetTouch } from './input.js';
import { createCameraControls } from './camera-controls.js';
import { updateHud } from './hud.js';
import { initLeaderboardSubmit } from './leaderboard.js';
import { spawnFootstepDust, updateParticleEffects } from './particles.js';
import { createEnemyRenderer } from './enemy-renderer.js';
import {
  spawnSpearThrustArc,
  spawnImpactSparks,
  updateCombatVFX,
} from './combat-vfx.js';

const cameraControls = createCameraControls(camera);
const enemyRenderer = createEnemyRenderer(scene);
const cameraTarget = new THREE.Vector3();
const cameraPunch = new THREE.Vector3();
const tipWorldPos = new THREE.Vector3();
const impactWorldPos = new THREE.Vector3();

let previousFrameTime = performance.now();
let elapsedGameTime = 0;
let frameCount = 0;
let lastFpsTime = performance.now();
let hitstopTimer = 0;
let dustTimer = 0;
let gameOverShown = false;

const gameWorker = new Worker(new URL('./game.worker.js?v=9', import.meta.url));

let workerPlayer = { x: 0, z: 0, rotationY: 0 };
let isMovingFromWorker = false;
let workerEnemies = [];

function showGameOverScreen() {
  if (gameOverShown) return;
  gameOverShown = true;
  state.over = true;
  state.paused = true;
  resetTouch();

  const modal =
    document.getElementById('gameover-modal') ||
    document.getElementById('game-over-modal') ||
    document.querySelector('[data-modal="gameover"]');

  const finalScore =
    document.getElementById('final-score') ||
    document.getElementById('gameover-score');

  const summaryText = `${Math.floor(state.score).toLocaleString()} Renown · ${state.kills} Defeated · Wave ${state.wave || 1}`;
  if (finalScore) {
    finalScore.textContent = summaryText;
  }

  if (modal) {
    modal.hidden = false;
    modal.removeAttribute('hidden');
    modal.classList.add('is-visible');
    modal.style.display = 'flex';
  }
}

function hideGameOverScreen() {
  gameOverShown = false;
  const modal =
    document.getElementById('gameover-modal') ||
    document.getElementById('game-over-modal') ||
    document.querySelector('[data-modal="gameover"]');

  if (modal) {
    modal.classList.remove('is-visible');
    modal.style.display = '';
  }
}

function handleCombatEvents(events) {
  for (const ev of events) {
    if (ev.type === 'startThrust') {
      triggerPlayerAttack('thrust', ev.slow);
    } else if (ev.type === 'spearTipPierce') {
      player.updateMatrixWorld(true);
      spearTip.getWorldPosition(tipWorldPos);

      spawnSpearThrustArc(scene, tipWorldPos, ev.yaw, ev.isTwoHanded);
      spawnImpactSparks(
        scene,
        tipWorldPos,
        ev.lethal ? 0xff4d4d : (ev.isTwoHanded ? 0xffc857 : 0x9ad8ff),
        ev.lethal ? 18 : 10
      );

      const punchStrength = ev.lethal ? 0.22 : (ev.isTwoHanded ? 0.14 : 0.08);
      cameraPunch.set(Math.sin(ev.yaw) * punchStrength, -0.05, Math.cos(ev.yaw) * punchStrength);

      if (ev.lethal && ev.isTwoHanded) {
        hitstopTimer = 0.035;
      }
    } else if (ev.type === 'shieldBlock') {
      impactWorldPos.set(ev.x, 1.05, ev.z);
      spawnImpactSparks(scene, impactWorldPos, 0x6ec6ff, 14);
    } else if (ev.type === 'playerHit') {
      triggerPlayerHit();
      impactWorldPos.set(ev.x, 0.95, ev.z);
      spawnImpactSparks(scene, impactWorldPos, 0xe63946, 10);
    } else if (ev.type === 'gameOver') {
      showGameOverScreen();
    }
  }
}

gameWorker.onmessage = function (e) {
  const data = e.data;
  if (!data.player) return;

  workerPlayer = data.player;
  isMovingFromWorker = data.isMoving;
  workerEnemies = data.enemies || [];
  state.enemiesCount = workerEnemies.length;

  if (typeof data.combatProgress === 'number') {
    state.fireTimer = data.combatProgress > 0 ? (1 - data.combatProgress) * state.fireRate : 0;
  }

  if (data.stats) {
    state.hp = data.stats.hp;
    state.maxHp = data.stats.maxHp;
    state.kills = data.stats.kills;
    state.score = data.stats.score;
    state.wave = data.stats.wave;
    state.elapsed = data.stats.elapsed;
    if (data.stats.over || state.hp <= 0) {
      showGameOverScreen();
    }
  }

  if (data.events && data.events.length > 0) {
    handleCombatEvents(data.events);
  }
};

function startSession() {
  if (state.started && !state.over) return;
  hideGameOverScreen();
  state.started = true;
  state.paused = false;
  state.over = false;
  document.body.classList.remove('menu-active');
  gameWorker.postMessage({ start: true });
}

function restartRun() {
  hideGameOverScreen();
  state.started = true;
  state.paused = false;
  state.over = false;
  state.hp = 100;
  state.maxHp = 100;
  state.kills = 0;
  state.score = 0;
  state.wave = 1;
  state.elapsed = 0;
  workerPlayer = { x: 0, z: 0, rotationY: 0 };
  workerEnemies = [];
  player.position.set(0, 0, 0);
  document.body.classList.remove('menu-active');
  document.getElementById('pause-modal')?.classList.remove('is-visible');
  resetTouch();
  gameWorker.postMessage({ reset: true, start: true });
}

function togglePause() {
  if (!state.started || state.over) return;
  state.paused = !state.paused;
  const pauseModal = document.getElementById('pause-modal');
  if (pauseModal) {
    pauseModal.classList.toggle('is-visible', state.paused);
  }
  resetTouch();
}

function renderFrame(currentTime) {
  requestAnimationFrame(renderFrame);

  const rawDt = (currentTime - previousFrameTime) / 1000;
  previousFrameTime = currentTime;
  if (rawDt > 0.5) return;

  const dt = Math.min(0.05, Math.max(0.001, rawDt));
  elapsedGameTime += dt;

  let simDt = dt;
  if (hitstopTimer > 0) {
    hitstopTimer = Math.max(0, hitstopTimer - dt);
    simDt = dt * 0.15;
  }

  const camYaw = cameraControls.getYaw ? cameraControls.getYaw() : 0;
  gameWorker.postMessage({
    keys: {
      forward: Boolean(keys.forward),
      backward: Boolean(keys.backward),
      left: Boolean(keys.left),
      right: Boolean(keys.right),
      shift: Boolean(keys.shift),
    },
    dt: simDt,
    camYaw,
    started: Boolean(state.started),
    paused: Boolean(state.paused),
  });

  player.position.x = THREE.MathUtils.lerp(player.position.x, workerPlayer.x, 1 - Math.exp(-24 * dt));
  player.position.y = 0;
  player.position.z = THREE.MathUtils.lerp(player.position.z, workerPlayer.z, 1 - Math.exp(-24 * dt));

  const angleDiff = Math.atan2(
    Math.sin(workerPlayer.rotationY - player.rotation.y),
    Math.cos(workerPlayer.rotationY - player.rotation.y)
  );
  player.rotation.y += angleDiff * (1 - Math.exp(-18 * dt));

  if (state.started && !state.paused && !state.over && isMovingFromWorker && !keys.shift) {
    dustTimer -= dt;
    if (dustTimer <= 0 && typeof spawnFootstepDust === 'function') {
      dustTimer = 0.28;
      spawnFootstepDust(scene, player.position);
    }
  }

  updatePlayerAnimation(dt, isMovingFromWorker && !state.over, state, Boolean(keys.shift));

  enemyRenderer.sync(workerEnemies, camera, simDt);
  updateCombatVFX(scene, dt);
  updateParticleEffects(scene, dt);

  cameraPunch.lerp(new THREE.Vector3(0, 0, 0), 1 - Math.exp(-14 * dt));
  cameraTarget.set(
    player.position.x + cameraPunch.x,
    2.45 + cameraPunch.y,
    player.position.z + cameraPunch.z
  );
  cameraControls.update(cameraTarget, dt);
  updateScene(dt, elapsedGameTime);

  frameCount++;
  if (currentTime - lastFpsTime >= 1000) {
    state.fps = Math.round((frameCount * 1000) / (currentTime - lastFpsTime));
    frameCount = 0;
    lastFpsTime = currentTime;
  }

  if (typeof updateHud === 'function') {
    updateHud(state);
  }

  renderer.render(scene, camera);
}

function startGame() {
  initInput(state, camera, togglePause, startSession);
  initLeaderboardSubmit(state);
  document.getElementById('start-button')?.addEventListener('click', startSession);
  document.getElementById('resume-btn')?.addEventListener('click', togglePause);
  document.getElementById('pause-restart-btn')?.addEventListener('click', restartRun);
  document.getElementById('restart-btn')?.addEventListener('click', restartRun);
  document.getElementById('play-again-btn')?.addEventListener('click', restartRun);
  requestAnimationFrame(renderFrame);
}

startGame();
