import * as THREE from 'three';
import {
  SPEAR_RANGE,
  SPEAR_RADIUS,
  MELEE_RANGE,
  SPEAR_FLIGHT_SPEED,
  SPEAR_GRAVITY
} from './config.js';
import { enemies, applyEnemyDamage } from './enemies.js';
import { spearTip, triggerPlayerAttack } from './player.js';
import { spawnGem } from './gems.js';

export const spears = [];

const forwardAxis = new THREE.Vector3(0, 0, 1);
const shaftMaterial = new THREE.MeshStandardMaterial({
  color: 0x493021,
  roughness: 0.7,
  metalness: 0.12
});
const bronzeMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xe6bd75,
  metalness: 0.92,
  roughness: 0.18,
  clearcoat: 0.8,
  clearcoatRoughness: 0.14,
  emissive: 0x4b2c0b,
  emissiveIntensity: 0.2
});
const trailMaterial = new THREE.MeshBasicMaterial({
  color: 0xffd99b,
  transparent: true,
  opacity: 0.2,
  depthWrite: false
});
const shaftGeometry = new THREE.CylinderGeometry(0.027, 0.038, 1.35, 10);
shaftGeometry.rotateX(Math.PI / 2);
const socketGeometry = new THREE.CylinderGeometry(0.052, 0.044, 0.16, 10);
socketGeometry.rotateX(Math.PI / 2);
const tipGeometry = new THREE.ConeGeometry(0.09, 0.34, 10);
tipGeometry.rotateX(Math.PI / 2);
const trailGeometry = new THREE.CylinderGeometry(0.016, 0.085, 1.15, 7, 1, true);
trailGeometry.rotateX(Math.PI / 2);
const spearLength = 1.48;

function createSpear() {
  const spear = new THREE.Group();
  const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
  shaft.position.z = 0.54;
  shaft.castShadow = true;
  spear.add(shaft);

  const socket = new THREE.Mesh(socketGeometry, bronzeMaterial);
  socket.position.z = 1.16;
  spear.add(socket);

  const blade = new THREE.Mesh(tipGeometry, bronzeMaterial);
  blade.position.z = 1.34;
  blade.castShadow = true;
  spear.add(blade);

  const trail = new THREE.Mesh(trailGeometry, trailMaterial);
  trail.position.z = -0.32;
  spear.add(trail);

  return spear;
}

function segmentHit(start, end, center, radius) {
  const segment = new THREE.Vector3().subVectors(end, start);
  const lengthSq = Math.max(segment.lengthSq(), 1e-8);
  const t = THREE.MathUtils.clamp(
    new THREE.Vector3().subVectors(center, start).dot(segment) / lengthSq,
    0,
    1
  );
  return start.clone().addScaledVector(segment, t).distanceToSquared(center) <= radius * radius;
}

function enemyAimHeight(enemy) {
  if (enemy.archetype === 'cyclops') return 1.78;
  if (enemy.archetype === 'harpy') return 1.02;
  return 1.12;
}

export function fireSpears(state, scene, player) {
  if (state.fireTimer > 0 || enemies.length === 0) return false;

  let target = null;
  let bestDistance = Infinity;
  for (const enemy of enemies) {
    if (enemy.dead || enemy.hp <= 0) continue;
    const distance = enemy.position.distanceTo(player.position);
    if (distance < bestDistance && distance <= SPEAR_RANGE) {
      bestDistance = distance;
      target = enemy;
    }
  }
  if (!target) return false;

  const horizontal = new THREE.Vector3(
    target.position.x - player.position.x,
    0,
    target.position.z - player.position.z
  );
  const angle = Math.atan2(horizontal.x, horizontal.z);
  player.rotation.y = angle;
  player.updateMatrixWorld(true);

  if (bestDistance <= MELEE_RANGE) {
    // A single close-range thrust replaces the throw; no projectile is spawned.
    triggerPlayerAttack('thrust');
    const direction = horizontal.normalize();
    applyEnemyDamage(target, state.dmg * 1.1, state, scene, spawnGem, direction);
    state.fireTimer = Math.max(0.28, state.fireRate * 0.72);
    return true;
  }

  const origin = new THREE.Vector3();
  spearTip.getWorldPosition(origin);
  origin.y = player.position.y + 1.18;

  const horizontalDistance = Math.max(0.5, horizontal.length());
  const flightTime = horizontalDistance / SPEAR_FLIGHT_SPEED;
  const aimPoint = target.position.clone().add(new THREE.Vector3(0, enemyAimHeight(target), 0));

  for (let index = 0; index < state.multiShot; index += 1) {
    const spread = (index - (state.multiShot - 1) / 2) * 0.055;
    const shotAngle = angle + spread;
    const shotDirection = new THREE.Vector3(Math.sin(shotAngle), 0, Math.cos(shotAngle));
    const velocity = shotDirection.multiplyScalar(SPEAR_FLIGHT_SPEED);
    velocity.y = (
      aimPoint.y - origin.y + 0.5 * SPEAR_GRAVITY * flightTime * flightTime
    ) / flightTime;

    const direction = velocity.clone().normalize();
    const spear = createSpear();
    spear.position.copy(origin);
    spear.quaternion.setFromUnitVectors(forwardAxis, direction);
    spear.userData = {
      velocity,
      previousTip: origin.clone().addScaledVector(direction, spearLength),
      direction,
      age: 0,
      traveled: 0
    };
    scene.add(spear);
    spears.push(spear);
  }

  triggerPlayerAttack('throw');
  state.fireTimer = state.fireRate;
  return true;
}

export function tickFireTimer(dt, state) {
  state.fireTimer = Math.max(0, state.fireTimer - dt);
}

export function updateSpears(dt, state, scene, spawnGem) {
  for (let index = spears.length - 1; index >= 0; index -= 1) {
    const spear = spears[index];
    const data = spear.userData;
    const previousTip = data.previousTip.clone();

    data.velocity.y -= SPEAR_GRAVITY * dt;
    const next = spear.position.clone().addScaledVector(data.velocity, dt);
    const direction = data.velocity.clone().normalize();
    const nextTip = next.clone().addScaledVector(direction, spearLength);

    data.age += dt;
    data.traveled += Math.hypot(data.velocity.x, data.velocity.z) * dt;

    let hit = false;
    for (const enemy of enemies) {
      if (enemy.dead || enemy.hp <= 0) continue;
      const targetCenter = enemy.position.clone().add(new THREE.Vector3(0, enemyAimHeight(enemy), 0));
      const hitRadius = enemy.userData.colliderRadius + SPEAR_RADIUS;
      if (segmentHit(previousTip, nextTip, targetCenter, hitRadius)) {
        applyEnemyDamage(enemy, state.dmg, state, scene, spawnGem, direction);
        hit = true;
        break;
      }
    }

    if (hit || data.traveled >= SPEAR_RANGE || data.age > 2.1 || next.y < 0.12) {
      scene.remove(spear);
      spears.splice(index, 1);
      continue;
    }

    spear.position.copy(next);
    spear.quaternion.setFromUnitVectors(forwardAxis, direction);
    data.direction.copy(direction);
    data.previousTip.copy(nextTip);
  }
}
