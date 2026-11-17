import * as THREE from 'three';
import { GEM_ATTRACT_RADIUS, GEM_ATTRACT_SPEED, GEM_COLLECT_RADIUS } from './config.js';

export const gems = [];

export const gemGeo = new THREE.OctahedronGeometry(0.26);
export const gemMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7 });

export function spawnGem(scene, position, xpValue) {
  const g = new THREE.Mesh(gemGeo, gemMat);
  g.position.copy(position).setY(0.35);
  g.value = xpValue || 1;
  scene.add(g);
  gems.push(g);
}

export function updateGems(dt, state, scene, player, showUpgrades, updateHud, resetTouch) {
  for (let i = gems.length - 1; i >= 0; i--) {
    const g = gems[i];
    g.rotation.y += 3 * dt;

    const dist = g.position.distanceTo(player.position);
    if (dist < GEM_ATTRACT_RADIUS) {
      g.position.lerp(player.position, GEM_ATTRACT_SPEED * dt);
    }

    if (dist < GEM_COLLECT_RADIUS) {
      scene.remove(g);
      gems.splice(i, 1);
      state.xp += g.value;
      state.score += g.value * 20;

      if (state.xp >= state.nextXp) {
        state.xp = 0;
        state.level++;
        state.nextXp = Math.floor(state.nextXp * 1.4);
        showUpgrades(state, resetTouch, updateHud);
      }

      updateHud(state);
    }
  }
}
