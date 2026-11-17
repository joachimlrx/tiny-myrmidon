import * as THREE from 'three';
import { SPEAR_SPEED, SPEAR_LIFETIME, SPEAR_RANGE } from './config.js';
import { enemies } from './enemies.js';

export const spears = [];

export const spearGeo = new THREE.ConeGeometry(0.12, 0.7, 6);
spearGeo.rotateX(Math.PI / 2);
export const spearMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

export function fireSpears(state, scene, player) {
  state.fireTimer -= 0;
  if (state.fireTimer > 0 || enemies.length === 0) return;

  let closest = null;
  let bestDist = Infinity;
  for (const e of enemies) {
    const d = e.position.distanceTo(player.position);
    if (d < bestDist) {
      bestDist = d;
      closest = e;
    }
  }

  if (!closest || bestDist >= SPEAR_RANGE) return;

  const baseAngle = Math.atan2(
    closest.position.z - player.position.z,
    closest.position.x - player.position.x
  );

  for (let i = 0; i < state.multiShot; i++) {
    const spread = (i - (state.multiShot - 1) / 2) * 0.16;
    const a = baseAngle + spread;
    const s = new THREE.Mesh(spearGeo, spearMat);
    s.position.copy(player.position).setY(0.75);
    s.rotation.y = Math.atan2(Math.cos(a), Math.sin(a));
    s.vx = Math.cos(a) * SPEAR_SPEED;
    s.vz = Math.sin(a) * SPEAR_SPEED;
    s.life = SPEAR_LIFETIME;
    scene.add(s);
    spears.push(s);
  }

  state.fireTimer = state.fireRate;
}

export function tickFireTimer(dt, state) {
  state.fireTimer -= dt;
}

export function updateSpears(dt, state, scene, spawnGem) {
  for (let i = spears.length - 1; i >= 0; i--) {
    const s = spears[i];
    s.position.x += s.vx * dt;
    s.position.z += s.vz * dt;
    s.life -= dt;

    let hit = false;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      const hitRadius = e.archetype === 'cyclops' ? 1.3 : 0.75;
      if (s.position.distanceTo(e.position) < hitRadius) {
        e.hp -= state.dmg;
        hit = true;
        if (e.hp <= 0) {
          spawnGem(scene, e.position, e.xpValue, e.scoreValue, e);
          scene.remove(e);
          enemies.splice(j, 1);
          state.kills++;
          state.score += e.scoreValue || 50;
        }
        break;
      }
    }

    if (hit || s.life <= 0) {
      scene.remove(s);
      spears.splice(i, 1);
    }
  }
}
