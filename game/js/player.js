import * as THREE from 'three';
import { scene } from './scene.js';

export const player = new THREE.Group();

function makeClothTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  context.fillStyle = '#5c1423';
  context.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 4) {
    context.fillStyle = y % 8 === 0 ? 'rgba(240,180,128,.08)' : 'rgba(10,0,8,.10)';
    context.fillRect(0, y, 256, 1);
  }
  for (let x = 0; x < 256; x += 4) {
    context.fillStyle = x % 8 === 0 ? 'rgba(255,220,180,.06)' : 'rgba(0,0,0,.08)';
    context.fillRect(x, 0, 1, 256);
  }
  for (let i = 0; i < 900; i += 1) {
    const shade = Math.random() > 0.5 ? '255,210,170' : '8,0,8';
    context.fillStyle = 'rgba(' + shade + ',' + (Math.random() * 0.07) + ')';
    context.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

const bronze = new THREE.MeshPhysicalMaterial({
  color: 0x8d603e,
  metalness: 0.72,
  roughness: 0.42,
  clearcoat: 0.2,
  clearcoatRoughness: 0.5,
  envMapIntensity: 0.68
});
const gold = new THREE.MeshPhysicalMaterial({
  color: 0xc8a16b,
  metalness: 0.82,
  roughness: 0.36,
  clearcoat: 0.24,
  clearcoatRoughness: 0.45,
  envMapIntensity: 0.76,
  emissive: 0x241304,
  emissiveIntensity: 0.04
});
const red = new THREE.MeshStandardMaterial({
  color: 0x782f39,
  map: makeClothTexture(),
  roughness: 0.92,
  side: THREE.DoubleSide
});
const dark = new THREE.MeshStandardMaterial({
  color: 0x201c20,
  metalness: 0.28,
  roughness: 0.68
});
const skin = new THREE.MeshPhysicalMaterial({
  color: 0xa9785d,
  roughness: 0.82,
  clearcoat: 0.025
});
const black = new THREE.MeshStandardMaterial({ color: 0x11151c, roughness: 0.88 });

function mesh(parent, geometry, material, position, rotation) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  if (rotation) object.rotation.set(...rotation);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(0.68, 40),
  new THREE.MeshBasicMaterial({
    color: 0x03050b,
    transparent: true,
    opacity: 0.52,
    depthWrite: false
  })
);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.025;
player.add(shadow);

const body = new THREE.Group();
body.position.y = 0.88;
player.add(body);

// Layered linen tunic and sculpted bronze cuirass.
mesh(body, new THREE.CapsuleGeometry(0.31, 0.47, 7, 18), red, [0, 0, -0.015]);
const breastplate = mesh(
  body,
  new THREE.SphereGeometry(0.41, 32, 22),
  bronze,
  [0, 0.13, 0.075]
);
breastplate.scale.set(1.04, 0.83, 0.75);

for (const side of [-1, 1]) {
  const pectoral = mesh(
    body,
    new THREE.SphereGeometry(0.235, 24, 18),
    bronze,
    [side * 0.16, 0.18, 0.285]
  );
  pectoral.scale.set(1.08, 0.68, 0.32);
}

for (let row = 0; row < 3; row += 1) {
  const plate = mesh(
    body,
    new THREE.SphereGeometry(0.3, 24, 16),
    bronze,
    [0, -0.095 - row * 0.135, 0.11]
  );
  plate.scale.set(0.82, 0.22, 0.58);
}

mesh(body, new THREE.TorusGeometry(0.31, 0.028, 10, 36), gold, [0, -0.42, 0]);
mesh(body, new THREE.CylinderGeometry(0.33, 0.35, 0.13, 24), dark, [0, -0.42, 0]);
mesh(body, new THREE.TorusGeometry(0.34, 0.025, 8, 32), gold, [0, -0.49, 0]);

// A proper helmet silhouette: crown, brow, cheek guards, nose guard and crest.
const head = new THREE.Group();
head.position.set(0, 0.6, 0.025);
body.add(head);
mesh(head, new THREE.SphereGeometry(0.225, 24, 18), skin, [0, -0.035, 0.035]);
const helmet = mesh(
  head,
  new THREE.SphereGeometry(0.3, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.62),
  bronze,
  [0, 0.085, -0.005]
);
helmet.scale.set(1.02, 1.12, 1);
mesh(head, new THREE.TorusGeometry(0.285, 0.035, 10, 32, Math.PI), gold, [0, 0.04, 0.02], [Math.PI, 0, 0]);
mesh(head, new THREE.BoxGeometry(0.5, 0.055, 0.09), gold, [0, 0.035, 0.245]);
mesh(head, new THREE.BoxGeometry(0.075, 0.26, 0.085), gold, [0, -0.085, 0.255]);

for (const side of [-1, 1]) {
  mesh(head, new THREE.BoxGeometry(0.13, 0.22, 0.13), bronze, [side * 0.245, -0.13, 0.06], [0, 0, side * -0.2]);
}
const eyeLine = mesh(head, new THREE.BoxGeometry(0.27, 0.035, 0.025), black, [0, -0.015, 0.248]);
eyeLine.material = black;

const crest = mesh(head, new THREE.CapsuleGeometry(0.075, 0.43, 6, 12), red, [0, 0.39, -0.04], [0, 0, -0.1]);
crest.scale.set(0.9, 1.06, 1.55);
mesh(head, new THREE.SphereGeometry(0.08, 14, 10), gold, [0, 0.55, -0.04]);

const limbs = [];
for (const side of [-1, 1]) {
  const leg = new THREE.Group();
  leg.position.set(side * 0.205, -0.42, 0);
  body.add(leg);
  mesh(leg, new THREE.CapsuleGeometry(0.105, 0.35, 5, 12), dark, [0, -0.22, 0]);
  mesh(leg, new THREE.CapsuleGeometry(0.12, 0.27, 5, 12), bronze, [0, -0.19, 0.035]);
  mesh(leg, new THREE.BoxGeometry(0.25, 0.13, 0.37), dark, [0, -0.48, 0.1]);
  mesh(leg, new THREE.BoxGeometry(0.22, 0.21, 0.075), gold, [0, -0.28, 0.145]);
  limbs.push(leg);

  const arm = new THREE.Group();
  arm.position.set(side * 0.39, 0.16, 0);
  body.add(arm);
  mesh(arm, new THREE.CapsuleGeometry(0.105, 0.36, 5, 12), skin, [0, -0.2, 0]);
  mesh(arm, new THREE.SphereGeometry(0.19, 20, 16), bronze, [side * -0.035, 0.035, 0]);
  mesh(arm, new THREE.CylinderGeometry(0.125, 0.115, 0.2, 16), gold, [0, -0.32, 0.035], [0, 0, Math.PI / 2]);
  mesh(arm, new THREE.CylinderGeometry(0.11, 0.105, 0.16, 16), bronze, [0, -0.43, 0.035], [0, 0, Math.PI / 2]);
  limbs.push(arm);
}

const capeGeometry = new THREE.PlaneGeometry(1.08, 1.35, 8, 10);
const capePositions = capeGeometry.attributes.position;
for (let index = 0; index < capePositions.count; index += 1) {
  const x = capePositions.getX(index);
  const y = capePositions.getY(index);
  capePositions.setZ(index, Math.sin(x * 5 + y * 2.5) * 0.055 + Math.abs(x) * 0.07);
}
capeGeometry.computeVertexNormals();
const cape = mesh(body, capeGeometry, red, [0, -0.14, -0.34]);
cape.rotation.x = 0.04;
for (const side of [-1, 1]) {
  mesh(body, new THREE.BoxGeometry(0.025, 1.2, 0.025), gold, [side * 0.49, -0.18, -0.275]);
}

// Shield: bronze boss, raised rim, radial boss details and a clean silhouette.
export const shieldRig = new THREE.Group();
shieldRig.position.set(-0.57, 0.11, 0.22);
body.add(shieldRig);
mesh(shieldRig, new THREE.CylinderGeometry(0.43, 0.43, 0.145, 40), dark, [0, 0, 0], [Math.PI / 2, 0, 0]);
mesh(shieldRig, new THREE.TorusGeometry(0.415, 0.048, 10, 40), gold, [0, 0, 0.035]);
mesh(shieldRig, new THREE.TorusGeometry(0.31, 0.018, 8, 32), bronze, [0, 0, 0.075]);
mesh(shieldRig, new THREE.SphereGeometry(0.145, 24, 18), gold, [0, 0, 0.12]).scale.z = 0.48;
mesh(shieldRig, new THREE.BoxGeometry(0.045, 0.42, 0.025), gold, [0, 0, 0.145]);
mesh(shieldRig, new THREE.BoxGeometry(0.42, 0.045, 0.025), gold, [0, 0, 0.145]);
for (let index = 0; index < 8; index += 1) {
  const angle = (index / 8) * Math.PI * 2;
  const stud = mesh(
    shieldRig,
    new THREE.SphereGeometry(0.035, 10, 8),
    gold,
    [Math.cos(angle) * 0.355, Math.sin(angle) * 0.355, 0.09]
  );
  stud.scale.z = 0.55;
}

// A held ash spear with a leaf-shaped, polished bronze point.
export const spearRig = new THREE.Group();
spearRig.position.set(0.42, 0.15, 0.13);
body.add(spearRig);
const heldShaft = mesh(
  spearRig,
  new THREE.CylinderGeometry(0.026, 0.036, 1.52, 10),
  dark,
  [0, 0, 0.48],
  [Math.PI / 2, 0, 0]
);
heldShaft.scale.x = 1.02;
mesh(spearRig, new THREE.CylinderGeometry(0.047, 0.042, 0.15, 10), gold, [0, 0, 1.12], [Math.PI / 2, 0, 0]);
mesh(spearRig, new THREE.ConeGeometry(0.095, 0.36, 10), gold, [0, 0, 1.36], [Math.PI / 2, 0, 0]);
mesh(spearRig, new THREE.TorusGeometry(0.037, 0.013, 6, 12), gold, [0, 0, 1.12], [Math.PI / 2, 0, 0]);
export const spearTip = new THREE.Object3D();
spearTip.position.set(0, 0, 1.54);
spearRig.add(spearTip);

player.userData = {
  body,
  limbs,
  shadow,
  hitTimer: 0,
  attackTimer: 0,
  walkPhase: 0,
  colliderRadius: 0.54
};
player.scale.setScalar(1.1);
scene.add(player);

export const orbitalGroup = new THREE.Group();
const orbitalMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x91a9b5,
  metalness: 0.64,
  roughness: 0.4,
  clearcoat: 0.22
});
export const orbShieldMesh = mesh(
  orbitalGroup,
  new THREE.CylinderGeometry(0.34, 0.34, 0.12, 28),
  orbitalMaterial,
  [1.55, 0.9, 0],
  [Math.PI / 2, 0, 0]
);
mesh(orbitalGroup, new THREE.TorusGeometry(0.34, 0.04, 8, 24), gold, [1.55, 0.9, 0.04]);
orbitalGroup.visible = false;
scene.add(orbitalGroup);

export function triggerPlayerAttack(mode = 'throw') {
  const data = player.userData;
  data.attackMode = mode;
  data.attackDuration = mode === 'thrust' ? 0.3 : 0.48;
  data.attackTimer = data.attackDuration;
}

export function triggerPlayerHit() {
  player.userData.hitTimer = 0.22;
}

export function updatePlayerAnimation(dt, moving, state) {
  const data = player.userData;
  data.walkPhase += dt * (moving ? 10.5 : 2.2);
  const gait = moving ? Math.sin(data.walkPhase) * 0.47 : Math.sin(data.walkPhase) * 0.025;

  data.limbs[0].rotation.x = gait;
  data.limbs[2].rotation.x = -gait;
  data.limbs[1].rotation.x = -gait * 0.34;
  data.limbs[3].rotation.x = gait * 0.34;
  data.body.position.y = 0.88 + (moving ? Math.abs(Math.sin(data.walkPhase)) * 0.045 : Math.sin(data.walkPhase) * 0.014);
  data.body.rotation.z = moving ? Math.sin(data.walkPhase) * 0.035 : 0;

  data.attackTimer = Math.max(0, data.attackTimer - dt);
  const attacking = data.attackTimer > 0;
  const duration = data.attackDuration || 0.48;
  const progress = attacking ? 1 - data.attackTimer / duration : 1;
  const pulse = attacking ? Math.sin(Math.PI * progress) : 0;

  if (attacking && data.attackMode === 'thrust') {
    // A short, committed jab: extend the spear straight ahead and lean into it.
    spearRig.position.z = 0.13 + pulse * 0.5;
    spearRig.rotation.x = -0.08 * pulse;
    data.limbs[3].rotation.x -= pulse * 0.48;
    data.body.position.z = pulse * 0.075;
    data.body.rotation.x = -pulse * 0.045;
  } else if (attacking) {
    // Wind the spear above the shoulder, then drive the arm forward on release.
    const windup = Math.min(1, progress / 0.34);
    const release = Math.max(0, (progress - 0.34) / 0.66);
    spearRig.rotation.x = progress < 0.34
      ? -0.92 * Math.sin(windup * Math.PI * 0.5)
      : -0.92 + 1.38 * Math.sin(release * Math.PI * 0.5);
    spearRig.position.z = 0.13 + (progress < 0.34
      ? -0.13 * Math.sin(windup * Math.PI * 0.5)
      : 0.12 * Math.sin(release * Math.PI));
    data.limbs[3].rotation.x -= 0.2 + 0.28 * pulse;
    data.body.rotation.x = -0.035 * pulse;
  } else {
    spearRig.rotation.x = 0;
    spearRig.position.z = 0.13;
    data.body.rotation.x = 0;
    data.body.position.z = 0;
  }

  data.hitTimer = Math.max(0, data.hitTimer - dt);
  data.body.position.x = data.hitTimer > 0 ? Math.sin(data.hitTimer * 48) * 0.055 : 0;
  data.shadow.material.opacity = 0.42 + (moving ? Math.sin(data.walkPhase) * 0.04 : 0);

  bronze.emissive.setHex(state.upgradeAuraTimer > 0 ? 0x2b190d : 0x000000);
  gold.emissiveIntensity = state.upgradeAuraTimer > 0 ? 0.18 : 0.035;
}
