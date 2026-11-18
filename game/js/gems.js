import * as THREE from 'three';

import {
  GEM_ATTRACT_RADIUS,
  GEM_ATTRACT_SPEED,
  GEM_COLLECT_RADIUS,
} from './config.js';

export const gems = [];

const gemGeometry = new THREE.OctahedronGeometry(0.23, 1);
const gemMaterial = new THREE.MeshStandardMaterial({
  color: 0x65b6ca,
  emissive: 0x075b78,
  emissiveIntensity: 0.72,
  metalness: 0.38,
  roughness: 0.24,
});

function createGem(position, experienceValue) {
  const gem = new THREE.Mesh(gemGeometry, gemMaterial);

  gem.position.copy(position);
  gem.position.y = 0.42;
  gem.rotation.set(0.3, Math.random() * Math.PI * 2, 0.4);

  gem.value = Math.max(1, experienceValue || 1);
  gem.velocity = new THREE.Vector3(
    (Math.random() - 0.5) * 1.4,
    1.2 + Math.random(),
    (Math.random() - 0.5) * 1.4,
  );

  gem.castShadow = true;
  return gem;
}

/** Add one experience pickup at the position of a defeated enemy. */
export function spawnGem(scene, position, experienceValue = 1) {
  const gem = createGem(position, experienceValue);
  scene.add(gem);
  gems.push(gem);
}

/** Convert collected experience into levels and upgrade choices. */
function awardExperience(gem, state, showUpgradeSelection, refreshHud) {
  state.xp += gem.value;
  state.score += gem.value * 18;

  let levelsGained = 0;

  while (state.xp >= state.nextXp) {
    state.xp -= state.nextXp;
    state.level += 1;
    state.nextXp = Math.max(
      state.nextXp + 1,
      Math.floor(state.nextXp * 1.32),
    );
    levelsGained += 1;
  }

  if (levelsGained > 0) {
    state.pendingUpgrades += levelsGained;
    showUpgradeSelection();
  }

  refreshHud();
}

function moveGemTowardPlayer(gem, player, deltaTime) {
  const distance = gem.position.distanceTo(player.position);
  if (distance >= GEM_ATTRACT_RADIUS) return distance;

  const directionToPlayer = new THREE.Vector3()
    .subVectors(player.position, gem.position);

  const attractionSpeed = GEM_ATTRACT_SPEED * (
    1 + (GEM_ATTRACT_RADIUS - distance) / GEM_ATTRACT_RADIUS
  );

  const movementFraction = Math.min(
    1,
    attractionSpeed * deltaTime / Math.max(distance, 0.1),
  );

  gem.position.addScaledVector(directionToPlayer, movementFraction);
  return gem.position.distanceTo(player.position);
}

function updateGemPhysics(gem, deltaTime) {
  gem.rotation.y += deltaTime * 3.6;
  gem.position.addScaledVector(gem.velocity, deltaTime);

  gem.velocity.y = Math.max(0, gem.velocity.y - 4.8 * deltaTime);
  gem.velocity.x *= Math.exp(-2.8 * deltaTime);
  gem.velocity.z *= Math.exp(-2.8 * deltaTime);

  gem.position.y = Math.max(0.28, gem.position.y);
}

/** Move, attract and collect every experience pickup. */
export function updateGems(
  deltaTime,
  state,
  scene,
  player,
  showUpgradeSelection,
  refreshHud,
) {
  for (let index = gems.length - 1; index >= 0; index -= 1) {
    const gem = gems[index];

    updateGemPhysics(gem, deltaTime);

    const distanceToPlayer = moveGemTowardPlayer(
      gem,
      player,
      deltaTime,
    );

    if (distanceToPlayer >= GEM_COLLECT_RADIUS) continue;

    scene.remove(gem);
    gems.splice(index, 1);

    awardExperience(
      gem,
      state,
      showUpgradeSelection,
      refreshHud,
    );
  }
}
