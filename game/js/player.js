import * as THREE from 'three';
import { scene } from './scene.js';
import { buildPlayerRig } from './player/rig.js';
import { createOrbitalShield } from './player/weapons.js';
import { createAnimator } from './player/animator.js';

export const player = new THREE.Group();
const rig = buildPlayerRig(player);

export const shieldRig = rig.shieldRig;
export const spearRig = rig.spearRig;
export const spearTip = rig.spearTip;

player.scale.setScalar(1.06);
scene.add(player);

export const { orbitalGroup, orbShieldMesh } = createOrbitalShield(scene);

const animator = createAnimator(player, rig);

player.userData = {
  ...rig,
  body: rig.pelvis,
  colliderRadius: 0.54,
};

export function triggerPlayerAttack(mode = 'throw', slow = false) {
  animator.triggerAttack(mode, slow);
}

export function triggerPlayerHit() {
  animator.triggerHit();
}

export function updatePlayerAnimation(dt, moving, state, shieldActive = false) {
  animator.update(dt, moving, state, shieldActive);
}

window.__myrmidonModelLoaded = true;
