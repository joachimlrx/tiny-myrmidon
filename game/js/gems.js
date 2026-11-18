import * as THREE from 'three';
import { GEM_ATTRACT_RADIUS, GEM_ATTRACT_SPEED, GEM_COLLECT_RADIUS } from './config.js';

export const gems = [];
const gemGeometry = new THREE.OctahedronGeometry(0.23, 1);
const gemMaterial = new THREE.MeshStandardMaterial({ color: 0x6fd7ff, emissive: 0x087bb2, emissiveIntensity: 1.5, metalness: 0.38, roughness: 0.24 });

export function spawnGem(scene, position, xpValue = 1) {
  const gem = new THREE.Mesh(gemGeometry, gemMaterial);
  gem.position.copy(position);
  gem.position.y = 0.42;
  gem.rotation.set(0.3, Math.random() * Math.PI * 2, 0.4);
  gem.value = Math.max(1, xpValue || 1);
  gem.velocity = new THREE.Vector3((Math.random() - 0.5) * 1.4, 1.2 + Math.random(), (Math.random() - 0.5) * 1.4);
  gem.age = 0;
  gem.castShadow = true;
  scene.add(gem);
  gems.push(gem);
}

export function updateGems(dt, state, scene, player, showUpgrades, updateHud) {
  for (let i = gems.length - 1; i >= 0; i--) {
    const gem = gems[i];
    gem.age += dt;
    gem.rotation.y += dt * 3.6;
    gem.position.addScaledVector(gem.velocity, dt);
    gem.velocity.y = Math.max(0, gem.velocity.y - 4.8 * dt);
    gem.velocity.x *= Math.exp(-2.8 * dt);
    gem.velocity.z *= Math.exp(-2.8 * dt);
    gem.position.y = Math.max(0.28, gem.position.y);

    let distance = gem.position.distanceTo(player.position);
    if (distance < GEM_ATTRACT_RADIUS) {
      const attraction = new THREE.Vector3().subVectors(player.position, gem.position);
      const speed = GEM_ATTRACT_SPEED * (1 + (GEM_ATTRACT_RADIUS - distance) / GEM_ATTRACT_RADIUS);
      gem.position.addScaledVector(attraction, Math.min(1, speed * dt / Math.max(distance, 0.1)));
      distance = gem.position.distanceTo(player.position);
    }

    if (distance < GEM_COLLECT_RADIUS) {
      scene.remove(gem);
      gems.splice(i, 1);
      state.xp += gem.value;
      state.score += gem.value * 18;

      let gainedLevels = 0;
      while (state.xp >= state.nextXp) {
        state.xp -= state.nextXp;
        state.level += 1;
        state.nextXp = Math.max(state.nextXp + 1, Math.floor(state.nextXp * 1.32));
        gainedLevels += 1;
      }

      if (gainedLevels > 0) {
        state.pendingUpgrades = (state.pendingUpgrades || 0) + gainedLevels;
        showUpgrades();
      }
      updateHud();
    }
  }
}
