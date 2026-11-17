import * as THREE from 'three';
import { scene, camera, renderer } from './scene.js';
import { state } from './state.js';
import { player, orbitalGroup, orbShieldMesh } from './player.js';
import { enemies, spawnEnemy, updateEnemies } from './enemies.js';
import { spears, fireSpears, tickFireTimer, updateSpears } from './weapons.js';
import { gems, spawnGem, updateGems } from './gems.js';
import { showUpgrades } from './upgrades.js';
import { updateHud } from './hud.js';
import { keys, touchState, isTouchDevice, resetTouch, initInput } from './input.js';
import { initLeaderboardSubmit } from './leaderboard.js';
import {
  FRAME_DT_CAP,
  CAMERA_HEIGHT,
  CAMERA_Z_OFFSET,
  ARENA_RADIUS,
  SPAWN_INTERVAL_BASE,
  SPAWN_INTERVAL_MIN,
  SPAWN_LEVEL_SCALE,
} from './config.js';

if (!orbitalGroup.parent) {
  orbitalGroup.add(orbShieldMesh);
  orbitalGroup.visible = state.hasOrbital;
  scene.add(orbitalGroup);
}

initInput(state, camera, renderer);
initLeaderboardSubmit(state);

const refreshHud = () => updateHud(state, isTouchDevice);
const openUpgrades = () => showUpgrades(state, orbitalGroup, resetTouch, refreshHud);

refreshHud();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const shieldWorldPos = new THREE.Vector3();
let last = performance.now();

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(FRAME_DT_CAP, (now - last) / 1000);
  last = now;

  if (state.paused || state.over) {
    renderer.render(scene, camera);
    return;
  }

  let dx = 0;
  let dz = 0;
  if (keys['w'] || keys['z'] || keys['arrowup']) dz -= 1;
  if (keys['s'] || keys['arrowdown']) dz += 1;
  if (keys['a'] || keys['q'] || keys['arrowleft']) dx -= 1;
  if (keys['d'] || keys['arrowright']) dx += 1;

  if (touchState.active) {
    dx += touchState.dx;
    dz += touchState.dz;
  }

  const moveLen = Math.hypot(dx, dz);
  if (moveLen > 0) {
    const norm = moveLen > 1 ? 1 / moveLen : 1;
    player.position.x += dx * norm * state.speed * dt;
    player.position.z += dz * norm * state.speed * dt;
    player.rotation.y = Math.atan2(dx, dz);
  }

  const distFromCenter = Math.hypot(player.position.x, player.position.z);
  if (distFromCenter > ARENA_RADIUS) {
    const clampRatio = ARENA_RADIUS / distFromCenter;
    player.position.x *= clampRatio;
    player.position.z *= clampRatio;
  }

  camera.position.set(
    player.position.x,
    CAMERA_HEIGHT,
    player.position.z + CAMERA_Z_OFFSET
  );
  camera.lookAt(player.position);

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnEnemy(state, scene, player);
    state.spawnTimer = Math.max(
      SPAWN_INTERVAL_MIN,
      SPAWN_INTERVAL_BASE - (state.level - 1) * SPAWN_LEVEL_SCALE
    );
  }

  tickFireTimer(dt, state);
  fireSpears(state, scene, player);
  updateSpears(dt, state, scene, spawnGem);

  if (state.hasOrbital) {
    orbitalGroup.position.copy(player.position);
    state.orbitalAngle += 3.5 * dt;
    orbitalGroup.rotation.y = state.orbitalAngle;
    orbShieldMesh.getWorldPosition(shieldWorldPos);

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const hitRadius = e.archetype === 'cyclops' ? 1.55 : 0.95;
      if (shieldWorldPos.distanceTo(e.position) < hitRadius) {
        e.hp -= state.dmg * 12 * dt;
        const push = new THREE.Vector3().subVectors(e.position, player.position).setY(0).normalize();
        e.position.addScaledVector(push, 6 * dt);

        if (e.hp <= 0) {
          spawnGem(scene, e.position, e.xpValue);
          scene.remove(e);
          enemies.splice(i, 1);
          state.kills++;
          state.score += e.scoreValue || 50;
        }
      }
    }
  }

  updateEnemies(dt, state, scene, player, resetTouch, refreshHud, spawnGem);
  updateGems(dt, state, scene, player, openUpgrades, refreshHud, resetTouch);
  refreshHud();

  renderer.render(scene, camera);
}

requestAnimationFrame(loop);

document.getElementById("restart-btn")?.addEventListener("click", () => location.reload());
