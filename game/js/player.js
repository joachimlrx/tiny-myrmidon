import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
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
  color: 0x76513b,
  metalness: 0.68,
  roughness: 0.48,
  clearcoat: 0.16,
  clearcoatRoughness: 0.58,
  envMapIntensity: 0.72
});
const gold = new THREE.MeshPhysicalMaterial({
  color: 0xb88b52,
  metalness: 0.78,
  roughness: 0.4,
  clearcoat: 0.2,
  clearcoatRoughness: 0.52,
  envMapIntensity: 0.78,
  emissive: 0x1b1006,
  emissiveIntensity: 0.025
});
const red = new THREE.MeshStandardMaterial({
  color: 0x642532,
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
  color: 0xb98266,
  roughness: 0.86,
  clearcoat: 0.018
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

// Tailored linen underlayer and a continuous, anatomically shaped cuirass.
const tunic = mesh(body, new THREE.CapsuleGeometry(0.285, 0.58, 8, 24), red, [0, 0.015, -0.025]);
tunic.scale.set(1.0, 1.08, 0.86);

// Build the cuirass as one shaped surface rather than stacked primitive blobs.
// Its chest is broad, the ribs taper into a narrow waist, and the lower edge
// flares just enough to sit naturally over the belt.
function createCuirassGeometry() {
  const rings = [
    [-0.47, 0.255, 0.17], [-0.36, 0.265, 0.185],
    [-0.20, 0.285, 0.19], [-0.04, 0.315, 0.205],
    [0.12, 0.355, 0.22], [0.28, 0.385, 0.205],
    [0.40, 0.345, 0.17], [0.47, 0.285, 0.145]
  ];
  const segments = 48;
  const positions = [];
  const uvs = [];
  const indices = [];
  rings.forEach(([y, width, depth], row) => {
    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2;
      const front = Math.max(0, Math.sin(angle));
      const chestBulge = Math.exp(-Math.pow((y - 0.2) / 0.19, 2)) * Math.pow(front, 3);
      const x = Math.cos(angle) * width;
      const z = Math.sin(angle) * (depth + chestBulge * 0.025);
      positions.push(x, y, z + 0.015);
      uvs.push(segment / segments, row / (rings.length - 1));
      if (row < rings.length - 1 && segment < segments) {
        const a = row * (segments + 1) + segment;
        const b = a + segments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
const cuirass = mesh(body, createCuirassGeometry(), bronze, [0, 0.02, 0]);
cuirass.material = bronze;

// Subtle raised pectoral contours are part of the cuirass silhouette, not
// separate spheres; a narrow central ridge catches light like forged metal.
const sternumRidge = mesh(body, new THREE.BoxGeometry(0.018, 0.49, 0.018), gold, [0, 0.13, 0.232]);
sternumRidge.scale.set(0.72, 1, 0.55);

// Five overlapping curved tassets follow the hips and leave the thighs free.
function createTassetGeometry(width, height) {
  const positions = [];
  const indices = [];
  const across = 8;
  const down = 5;
  for (let row = 0; row <= down; row += 1) {
    const v = row / down;
    for (let col = 0; col <= across; col += 1) {
      const u = col / across;
      const x = (u - 0.5) * width;
      const y = (0.5 - v) * height;
      const curve = 0.035 * (1 - Math.pow((u - 0.5) * 2, 2));
      positions.push(x, y, curve + 0.018 * Math.sin(v * Math.PI));
      if (row < down && col < across) {
        const a = row * (across + 1) + col;
        const b = a + across + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
for (let index = -2; index <= 2; index += 1) {
  const plate = mesh(body, createTassetGeometry(0.145, 0.32), bronze,
    [index * 0.137, -0.59, 0.145 - Math.abs(index) * 0.012]);
  plate.rotation.z = -index * 0.055;
  const edge = mesh(plate, new THREE.BoxGeometry(0.105, 0.012, 0.012), gold,
    [0, -0.145, 0.025]);
  edge.scale.x = 1.0;
}

mesh(body, new THREE.TorusGeometry(0.285, 0.024, 10, 36), gold, [0, -0.405, 0]);
mesh(body, new THREE.CylinderGeometry(0.29, 0.315, 0.12, 32), dark, [0, -0.415, 0]);
mesh(body, new THREE.TorusGeometry(0.305, 0.021, 8, 32), gold, [0, -0.48, 0]);

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

// Exposed human anatomy: a neck connecting the helmeted head to the cuirass,
// with readable facial planes rather than a featureless skin-colored sphere.
mesh(body, new THREE.CapsuleGeometry(0.105, 0.19, 7, 14), skin, [0, 0.49, 0.015]);
const faceDetails = { eyes: [], hands: [] };
for (const side of [-1, 1]) {
  mesh(head, new THREE.SphereGeometry(0.075, 16, 12), skin, [side * 0.218, -0.045, 0.015]);
  mesh(head, new THREE.SphereGeometry(0.032, 12, 10), red, [side * 0.226, -0.045, 0.043]);
  const eyeSocket = mesh(head, new THREE.SphereGeometry(0.058, 18, 12), dark, [side * 0.087, 0.005, 0.235]);
  eyeSocket.scale.set(1.18, 0.78, 0.42);
  const eye = mesh(head, new THREE.SphereGeometry(0.039, 18, 12), new THREE.MeshStandardMaterial({ color: 0xe6d9c2, roughness: 0.48 }), [side * 0.087, 0.005, 0.255]);
  eye.scale.set(1.05, 0.78, 0.5);
  mesh(head, new THREE.SphereGeometry(0.019, 14, 10), black, [side * 0.087, 0.002, 0.275]);
  mesh(head, new THREE.SphereGeometry(0.008, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), [side * 0.079, 0.014, 0.285]);
  const brow = mesh(head, new THREE.CapsuleGeometry(0.025, 0.085, 3, 8), dark, [side * 0.087, 0.073, 0.245]);
  brow.rotation.z = side * -0.12;
  faceDetails.eyes.push(eye);
}
// Nose bridge, cheek planes, lips and a close-cropped beard beneath the jaw.
mesh(head, new THREE.CapsuleGeometry(0.027, 0.075, 4, 10), skin, [0, -0.065, 0.255]);
const noseTip = mesh(head, new THREE.SphereGeometry(0.043, 14, 10), skin, [0, -0.105, 0.272]);
noseTip.scale.set(1, 0.78, 0.85);
for (const side of [-1, 1]) {
  const cheek = mesh(head, new THREE.SphereGeometry(0.075, 14, 10), skin, [side * 0.145, -0.085, 0.19]);
  cheek.scale.set(1, 0.72, 0.46);
}
mesh(head, new THREE.BoxGeometry(0.105, 0.014, 0.018), new THREE.MeshStandardMaterial({ color: 0x673b35, roughness: 0.9 }), [0, -0.172, 0.249]);
const beard = mesh(head, new THREE.SphereGeometry(0.16, 18, 12), dark, [0, -0.205, 0.075]);
beard.scale.set(0.82, 0.56, 0.9);
mesh(head, new THREE.ConeGeometry(0.075, 0.13, 8), dark, [0, -0.31, 0.105], [Math.PI, 0, 0]);
// Two slim leather cheek straps anchor the helmet without crossing the mouth.
for (const side of [-1, 1]) {
  const strap = mesh(head, new THREE.CapsuleGeometry(0.012, 0.13, 4, 8), dark,
    [side * 0.205, -0.17, 0.145], [0, 0, side * -0.24]);
  strap.scale.z = 0.72;
  mesh(head, new THREE.SphereGeometry(0.018, 10, 8), gold,
    [side * 0.205, -0.105, 0.19]);
}


const crest = mesh(head, new THREE.CapsuleGeometry(0.075, 0.43, 6, 12), red, [0, 0.39, -0.04], [0, 0, -0.1]);
crest.scale.set(0.9, 1.06, 1.55);
mesh(head, new THREE.SphereGeometry(0.08, 14, 10), gold, [0, 0.55, -0.04]);

const footWorldPosition = new THREE.Vector3();
const legs = [];
const arms = [];
for (const side of [-1, 1]) {
  const hip = new THREE.Group();
  hip.position.set(side * 0.19, -0.47, 0);
  body.add(hip);
  mesh(hip, new THREE.CapsuleGeometry(0.105, 0.19, 6, 14), dark, [0, -0.12, 0]);

  const knee = new THREE.Group();
  knee.position.y = -0.275;
  hip.add(knee);
  mesh(knee, new THREE.SphereGeometry(0.105, 18, 14), bronze, [0, 0, 0.025]);
  mesh(knee, new THREE.CapsuleGeometry(0.085, 0.17, 6, 14), dark, [0, -0.12, 0.015]);

  const foot = new THREE.Group();
  foot.position.set(0, -0.255, 0.04);
  knee.add(foot);
  mesh(foot, new THREE.BoxGeometry(0.205, 0.095, 0.29), dark, [0, 0.01, 0.105]);
  mesh(foot, new THREE.BoxGeometry(0.19, 0.11, 0.065), gold, [0, 0.025, 0.225]);
  legs.push({ hip, knee, foot, side, baseFootY: foot.position.y });

  const shoulder = new THREE.Group();
  shoulder.position.set(side * 0.405, 0.19, 0);
  body.add(shoulder);
  mesh(shoulder, new THREE.CapsuleGeometry(0.105, 0.31, 5, 12), skin, [0, -0.14, 0]);
  const pauldron = mesh(shoulder, new THREE.SphereGeometry(0.19, 24, 18), bronze, [side * -0.035, 0.035, 0]);
  pauldron.scale.set(1.12, 0.78, 1.08);

  const elbow = new THREE.Group();
  elbow.position.y = -0.29;
  shoulder.add(elbow);
  mesh(elbow, new THREE.CapsuleGeometry(0.09, 0.23, 5, 12), skin, [0, -0.11, 0.025]);
  mesh(elbow, new THREE.CylinderGeometry(0.115, 0.105, 0.17, 16), bronze, [0, -0.12, 0.045], [0, 0, Math.PI / 2]);
  mesh(elbow, new THREE.TorusGeometry(0.105, 0.012, 7, 18), gold, [0, -0.205, 0.045], [Math.PI / 2, 0, 0]);
  mesh(elbow, new THREE.SphereGeometry(0.085, 14, 10), skin, [0, -0.235, 0.04]);

  // Human hands: a palm, thumb and four articulated fingers at the weapon grip.
  const handRig = new THREE.Group();
  handRig.position.set(0, -0.31, 0.035);
  elbow.add(handRig);
  mesh(handRig, new THREE.SphereGeometry(0.092, 16, 12), skin, [0, -0.015, 0.015]).scale.set(0.82, 1.12, 0.62);
  for (let finger = 0; finger < 4; finger += 1) {
    const spread = (finger - 1.5) * 0.041;
    const length = 0.105 + (1 - Math.abs(finger - 1.5) / 2) * 0.025;
    const digit = mesh(handRig, new THREE.CapsuleGeometry(0.022, length, 4, 8), skin, [spread, -0.105 - (finger === 0 || finger === 3 ? 0.008 : 0), 0.025]);
    digit.rotation.z = (finger - 1.5) * 0.075;
    mesh(handRig, new THREE.SphereGeometry(0.022, 10, 8), skin, [spread, -0.105 - length * 0.72, 0.025]);
  }
  const thumb = mesh(handRig, new THREE.CapsuleGeometry(0.025, 0.09, 4, 8), skin, [side * 0.09, -0.035, 0.04]);
  thumb.rotation.z = side * -0.8;
  faceDetails.hands.push(handRig);

  arms.push({ shoulder, elbow, side });
}

const capeGeometry = new THREE.PlaneGeometry(1.08, 1.35, 8, 10);
const capeBasePositions = Float32Array.from(capeGeometry.attributes.position.array);
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
  mesh(body, new THREE.BoxGeometry(0.018, 1.16, 0.018), gold, [side * 0.49, -0.18, -0.275]);
}

// Shield: bronze boss, raised rim, radial boss details and a clean silhouette.
export const shieldRig = new THREE.Group();
shieldRig.position.set(-0.28, 0.04, -0.38);
shieldRig.rotation.y = Math.PI;
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
  crest,
  capeGeometry,
  capeBasePositions,
  head,
  legs,
  arms,
  faceDetails,
  cape,
  shieldRig,
  shadow,
  hitTimer: 0,
  attackTimer: 0,
  attackDuration: 0.72,
  walkPhase: 0,
  animationTime: 0,
  moveBlend: 0,
  twoHandBlend: 1,
  colliderRadius: 0.54
};
player.scale.setScalar(1.1);
scene.add(player);

// Prefer the bundled, rigged GLTF asset; the handcrafted Three.js model above
// remains visible as a resilient fallback if the asset cannot be loaded.
const gltfLoader = new GLTFLoader();
gltfLoader.load(
  './models/myrmidon.gltf',
  (gltf) => {
    const model = gltf.scene;
    model.name = 'MyrmidonGLTF';
    model.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      if (object.material) {
        object.material.envMapIntensity = 0.85;
      }
    });

    // Keep the richer procedural human character visible. The bundled GLTF
    // remains loaded as the animation/asset reference and as a verified fallback
    // asset, but its blockout geometry must not cover the anatomical character.
    model.visible = false;
    player.add(model);
    window.__myrmidonModelLoaded = true;

    const mixer = new THREE.AnimationMixer(model);
    const clips = new Map(gltf.animations.map((clip) => [clip.name, clip]));
    const runClip = clips.get('Run');
    const attackClip = clips.get('SpearAttack');
    const capeClip = clips.get('CapeFlutter');

    const runAction = runClip ? mixer.clipAction(runClip) : null;
    if (runAction) {
      runAction.setLoop(THREE.LoopRepeat, Infinity);
      runAction.play();
      runAction.setEffectiveWeight(0);
    }

    const attackAction = attackClip ? mixer.clipAction(attackClip) : null;
    if (attackAction) {
      attackAction.setLoop(THREE.LoopOnce, 1);
      attackAction.setDuration(0.82);
      attackAction.clampWhenFinished = true;
      if (player.userData.attackTimer > 0) {
        attackAction.reset().play();
        player.userData.gltfAttackActive = true;
      }
    }

    const capeAction = capeClip ? mixer.clipAction(capeClip) : null;
    if (capeAction) {
      capeAction.setLoop(THREE.LoopRepeat, Infinity);
      capeAction.setEffectiveWeight(0.72);
      capeAction.play();
    }

    Object.assign(player.userData, {
      gltfModel: model,
      gltfMixer: mixer,
      gltfRunAction: runAction,
      gltfAttackAction: attackAction,
      gltfCapeAction: capeAction,
      gltfCrest: model.getObjectByName('Crest'),
      gltfReady: true
    });
  },
  undefined,
  (error) => {
    console.warn('Could not load the bundled Myrmidon GLTF; using the procedural model.', error);
  }
);

export const orbitalGroup = new THREE.Group();
const orbitalMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x9cc9d8,
  metalness: 0.48,
  roughness: 0.22,
  clearcoat: 0.8,
  emissive: 0x286a83,
  emissiveIntensity: 0.42
});
export const orbShieldMesh = mesh(
  orbitalGroup,
  new THREE.IcosahedronGeometry(0.27, 1),
  orbitalMaterial,
  [1.55, 0.9, 0]
);
const orbitalRing = mesh(
  orbitalGroup,
  new THREE.TorusGeometry(0.38, 0.025, 8, 32),
  gold,
  [1.55, 0.9, 0]
);
orbitalRing.rotation.x = Math.PI / 2;
orbitalGroup.visible = false;
scene.add(orbitalGroup);

const oneHandSpearPosition = new THREE.Vector3(0.42, 0.15, 0.13);
const twoHandSpearPosition = new THREE.Vector3(0.02, 0.09, 0.28);
const shieldGuardPosition = new THREE.Vector3(-0.57, 0.11, 0.22);
const shieldStowPosition = new THREE.Vector3(-0.28, 0.04, -0.38);

export function triggerPlayerAttack(mode = 'throw') {
  const data = player.userData;
  data.attackMode = mode;
  data.attackDuration = mode === 'thrust' ? 0.68 : 0.88;
  data.attackTimer = data.attackDuration;
  if (data.gltfAttackAction) {
    data.gltfAttackAction.reset().play();
    data.gltfAttackActive = true;
  }
}

export function triggerPlayerHit() {
  player.userData.hitTimer = 0.3;
}

export function updatePlayerAnimation(dt, moving, state, oneHanded = false) {
  const data = player.userData;
  data.animationTime += dt;
  data.moveBlend = THREE.MathUtils.damp(data.moveBlend, moving ? 1 : 0, 9, dt);
  data.gltfRunAction?.setEffectiveWeight(data.moveBlend);
  data.gltfRunAction?.setEffectiveTimeScale(0.82 + data.moveBlend * 0.48);
  data.gltfMixer?.update(dt);
  data.twoHandBlend = THREE.MathUtils.damp(data.twoHandBlend, oneHanded ? 0 : 1, 13, dt);

  const gaitSpeed = 4.8 + data.moveBlend * 6.4;
  data.walkPhase += dt * gaitSpeed;
  const phase = data.walkPhase;
  const stride = Math.sin(phase);
  const idleWeight = 1 - data.moveBlend;
  const breath = Math.sin(data.animationTime * 2.15);
  const twoHands = data.twoHandBlend;
  const oneHand = 1 - twoHands;

  for (const leg of data.legs) {
    leg.foot.position.y = leg.baseFootY;
    const swing = Math.sin(phase + (leg.side > 0 ? Math.PI : 0));
    leg.hip.rotation.x = swing * (0.52 * data.moveBlend + 0.012 * idleWeight);
    leg.knee.rotation.x = Math.max(0, -swing) * 0.92 * data.moveBlend;
    leg.foot.rotation.x = -leg.hip.rotation.x * 0.28 - leg.knee.rotation.x * 0.48;
  }

  for (const arm of data.arms) {
    const swing = Math.sin(phase + (arm.side > 0 ? 0 : Math.PI));
    arm.shoulder.rotation.x = -swing * 0.34 * data.moveBlend - 0.055 * idleWeight;
    arm.shoulder.rotation.z = -arm.side * (0.035 + data.moveBlend * 0.035);
    arm.elbow.rotation.x = -0.16 - Math.max(0, -swing) * 0.22 * data.moveBlend;
  }

  data.body.position.y = 0.88 + Math.abs(stride) * 0.028 * data.moveBlend
    + breath * 0.01 * idleWeight;
  data.body.position.z = 0;
  data.body.rotation.x = -0.055 * data.moveBlend + breath * 0.014 * idleWeight;
  data.body.rotation.y = stride * 0.065 * data.moveBlend;
  data.body.rotation.z = -stride * 0.035 * data.moveBlend;
  data.head.rotation.x = -0.025 + breath * 0.016;
  data.head.rotation.y = stride * 0.045 * data.moveBlend;
  data.head.rotation.z = stride * 0.009 * data.moveBlend;
  // Subtle eye focus and natural blink keep the face alive without a heavy rig.
  const blink = Math.pow(Math.max(0, Math.sin(data.animationTime * 0.73 + 1.4)), 48);
  for (const eye of data.faceDetails.eyes) eye.scale.y = 0.78 * (1 - blink * 0.92);
  for (const hand of data.faceDetails.hands) {
    hand.rotation.x = -0.04 + Math.sin(data.animationTime * 2.4 + hand.position.x) * 0.025;
  }

  data.cape.rotation.x = 0.04 + data.moveBlend * 0.13
    + Math.sin(data.animationTime * 4.1) * 0.025;
  data.cape.rotation.z = -stride * 0.075 * data.moveBlend;
  const capeAttribute = data.capeGeometry.attributes.position;
  for (let vertex = 0; vertex < capeAttribute.count; vertex += 1) {
    const offset = vertex * 3;
    const x = data.capeBasePositions[offset];
    const y = data.capeBasePositions[offset + 1];
    const freeEdge = THREE.MathUtils.clamp((0.675 - y) / 1.35, 0, 1);
    const wave = Math.sin(data.animationTime * 5.2 + x * 5.5 + y * 2.8);
    const flutter = freeEdge * (0.025 + data.moveBlend * 0.07);
    capeAttribute.setZ(vertex, data.capeBasePositions[offset + 2] + wave * flutter);
  }
  capeAttribute.needsUpdate = true;
  data.capeGeometry.computeVertexNormals();
  const crestSway = -0.08 + Math.sin(data.animationTime * 3.1) * 0.035
    - stride * 0.045 * data.moveBlend;
  data.crest.rotation.z = crestSway;
  if (data.gltfCrest) data.gltfCrest.rotation.z = crestSway * 0.7;

  spearRig.position.lerpVectors(oneHandSpearPosition, twoHandSpearPosition, twoHands);
  data.shieldRig.position.lerpVectors(shieldGuardPosition, shieldStowPosition, twoHands);
  data.shieldRig.rotation.y = Math.PI * twoHands;
  data.shieldRig.rotation.x = -0.04 * oneHand;
  data.shieldRig.rotation.z = 0.025 * oneHand;

  const leftArm = data.arms[0];
  const rightArm = data.arms[1];

  leftArm.shoulder.rotation.x += THREE.MathUtils.lerp(-0.28, -0.84, twoHands);
  leftArm.shoulder.rotation.z += THREE.MathUtils.lerp(0.4, 0.78, twoHands);
  leftArm.elbow.rotation.x -= THREE.MathUtils.lerp(0.3, 0.42, twoHands);
  rightArm.shoulder.rotation.x += THREE.MathUtils.lerp(-0.62, -0.92, twoHands);
  rightArm.shoulder.rotation.z -= THREE.MathUtils.lerp(0.12, 0.72, twoHands);
  rightArm.elbow.rotation.x -= THREE.MathUtils.lerp(0.28, 0.4, twoHands);

  data.attackTimer = Math.max(0, data.attackTimer - dt);
  const attacking = data.attackTimer > 0;
  if (!attacking && data.gltfAttackActive) {
    data.gltfAttackAction?.fadeOut(0.12);
    data.gltfAttackActive = false;
  }
  const progress = attacking ? 1 - data.attackTimer / data.attackDuration : 0;
  const anticipation = attacking
    ? 1 - THREE.MathUtils.smoothstep(progress, 0.08, 0.34)
    : 0;
  const strike = attacking
    ? THREE.MathUtils.smoothstep(progress, 0.27, 0.48)
      * (1 - THREE.MathUtils.smoothstep(progress, 0.63, 0.86))
    : 0;
  const recovery = attacking
    ? THREE.MathUtils.smoothstep(progress, 0.66, 1)
    : 0;

  if (attacking && data.attackMode === 'thrust') {
    spearRig.rotation.x = -0.22 * anticipation + 0.1 * strike + 0.06 * recovery;
    spearRig.position.z += -0.12 * anticipation + 0.48 * strike - 0.05 * recovery;
    rightArm.shoulder.rotation.x -= anticipation * 0.3 + strike * 0.7;
    rightArm.elbow.rotation.x -= strike * 0.35;
    data.body.position.z = -0.025 * anticipation + 0.11 * strike;
    data.body.position.y -= anticipation * 0.025 + strike * 0.045;
    data.body.rotation.x -= strike * 0.1;
    data.body.rotation.y += -anticipation * 0.035 + strike * 0.055;
    data.body.rotation.z += anticipation * 0.07 - strike * 0.035;
    // A committed thrust drives from the rear leg and bends the lead knee.
    for (const leg of data.legs) {
      const lead = leg.side > 0 ? 1 : -1;
      leg.hip.rotation.x += strike * (lead > 0 ? -0.3 : 0.16);
      leg.knee.rotation.x += strike * (lead > 0 ? 0.48 : 0.06);
      leg.foot.rotation.x -= strike * (lead > 0 ? 0.12 : 0.04);
    }
    data.shieldRig.rotation.x -= strike * 0.12 * oneHand;
  } else if (attacking) {
    spearRig.rotation.x = -1.05 * anticipation + 0.4 * strike + 0.1 * recovery;
    spearRig.position.z += -0.15 * anticipation + 0.16 * strike - 0.035 * recovery;
    rightArm.shoulder.rotation.x -= anticipation * 0.48 + strike * 0.24;
    rightArm.elbow.rotation.x -= anticipation * 0.18 + strike * 0.2;
    leftArm.shoulder.rotation.x -= anticipation * 0.16 * twoHands;
    data.body.position.z = -0.045 * anticipation + 0.05 * strike;
    data.body.position.y -= anticipation * 0.035 + strike * 0.02;
    data.body.rotation.x -= anticipation * 0.075 + strike * 0.04;
    data.body.rotation.y += anticipation * 0.045 - strike * 0.025;
    data.body.rotation.z += anticipation * 0.1 - strike * 0.045;
    for (const leg of data.legs) {
      leg.hip.rotation.x += anticipation * (leg.side > 0 ? -0.18 : 0.22)
        + strike * (leg.side > 0 ? 0.12 : -0.08);
      leg.knee.rotation.x += anticipation * (leg.side > 0 ? 0.22 : 0.04);
    }
    data.shieldRig.rotation.x -= anticipation * 0.1 * oneHand;
  } else {
    spearRig.rotation.set(0, 0, 0);
  }

  data.hitTimer = Math.max(0, data.hitTimer - dt);
  const hitWeight = THREE.MathUtils.clamp(data.hitTimer / 0.3, 0, 1);
  data.body.position.x = Math.sin(data.animationTime * 37) * 0.07 * hitWeight;
  data.body.rotation.z += hitWeight * 0.15;
  data.body.rotation.x -= hitWeight * 0.1;
  data.head.rotation.z += hitWeight * 0.1;

  player.updateMatrixWorld(true);
  for (const leg of data.legs) {
    leg.foot.getWorldPosition(footWorldPosition);
    if (footWorldPosition.y < 0) {
      leg.foot.position.y -= footWorldPosition.y;
    }
  }

  data.shadow.material.opacity = 0.42 + idleWeight * 0.025
    + Math.abs(stride) * data.moveBlend * 0.025;

  bronze.emissive.setHex(state.upgradeAuraTimer > 0 ? 0x2b190d : 0x000000);
  gold.emissiveIntensity = state.upgradeAuraTimer > 0 ? 0.18 : 0.035;
}
