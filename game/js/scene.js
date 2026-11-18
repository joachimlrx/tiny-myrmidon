import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa9d5ef);
scene.fog = new THREE.FogExp2(0xd6e8f1, 0.0042);

export const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 150);
camera.position.set(0, 10.8, 9.5);

export const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.physicallyCorrectLights = true;
document.body.appendChild(renderer.domElement);

// A neutral studio environment gives bronze, steel and obsidian something real to reflect.
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const roomEnvironment = new RoomEnvironment();
scene.environment = pmremGenerator.fromScene(roomEnvironment, 0.04).texture;
roomEnvironment.dispose();
pmremGenerator.dispose();

export const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight),
  0.42,
  0.34,
  0.86
));
composer.setSize(innerWidth, innerHeight);

scene.add(new THREE.HemisphereLight(0xe7f5ff, 0x9b7950, 1.75));

const sun = new THREE.DirectionalLight(0xffe2b5, 3.0);
sun.position.set(-18, 34, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -24;
sun.shadow.camera.right = 24;
sun.shadow.camera.top = 24;
sun.shadow.camera.bottom = -24;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 70;
sun.shadow.bias = -0.00018;
sun.shadow.normalBias = 0.028;
scene.add(sun);

const rim = new THREE.DirectionalLight(0xfff1d9, 1.15);
rim.position.set(13, 10, -16);
scene.add(rim);

const warmFill = new THREE.PointLight(0xffe3bd, 6, 32, 2);
warmFill.position.set(0, 5, 0);
scene.add(warmFill);

function createStoneTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');

  context.fillStyle = '#c7b99f';
  context.fillRect(0, 0, 512, 512);

  for (let index = 0; index < 22000; index += 1) {
    const light = Math.random() > 0.52;
    const alpha = 0.025 + Math.random() * 0.08;
    context.fillStyle = light
      ? 'rgba(245,232,202,' + alpha + ')'
      : 'rgba(91,70,45,' + alpha + ')';
    const size = 1 + Math.random() * 2.2;
    context.fillRect(Math.random() * 512, Math.random() * 512, size, size);
  }

  for (let index = 0; index < 18; index += 1) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (Math.random() - 0.5) * 52, y + 12 + Math.random() * 38);
    context.lineTo(x + (Math.random() - 0.5) * 84, y + 28 + Math.random() * 76);
    context.strokeStyle = 'rgba(121,94,61,0.13)';
    context.lineWidth = 1 + Math.random() * 1.5;
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  return texture;
}

const stoneTexture = createStoneTexture();
const bumpTexture = stoneTexture.clone();
bumpTexture.colorSpace = THREE.NoColorSpace;
bumpTexture.needsUpdate = true;

const gold = new THREE.MeshPhysicalMaterial({
  color: 0xc79b5e,
  metalness: 0.9,
  roughness: 0.22,
  clearcoat: 0.7,
  clearcoatRoughness: 0.2,
  envMapIntensity: 1.3,
  emissive: 0x211405,
  emissiveIntensity: 0.22
});
const paleGold = new THREE.MeshPhysicalMaterial({
  color: 0xe2c58d,
  metalness: 0.88,
  roughness: 0.19,
  clearcoat: 0.8,
  envMapIntensity: 1.45
});
const stone = new THREE.MeshPhysicalMaterial({
  color: 0xcbbd9f,
  map: stoneTexture,
  bumpMap: bumpTexture,
  bumpScale: 0.085,
  roughness: 0.78,
  metalness: 0.18
});
const darkStone = new THREE.MeshPhysicalMaterial({
  color: 0x9d8c70,
  map: stoneTexture,
  bumpMap: bumpTexture,
  bumpScale: 0.12,
  roughness: 0.84,
  metalness: 0.24
});

const floor = new THREE.Mesh(new THREE.CircleGeometry(28.5, 160), darkStone);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.12;
floor.receiveShadow = true;
scene.add(floor);

const arenaFloor = new THREE.Mesh(new THREE.CircleGeometry(24.8, 160), stone);
arenaFloor.rotation.x = -Math.PI / 2;
arenaFloor.position.y = -0.045;
arenaFloor.receiveShadow = true;
scene.add(arenaFloor);

function addRing(radius, tube, material, y) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 12, 192), material);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = y;
  ring.receiveShadow = true;
  ring.castShadow = true;
  scene.add(ring);
  return ring;
}

for (let ring = 0; ring < 6; ring += 1) {
  const radius = 4.4 + ring * 3.22;
  const count = Math.round(radius * 4.8);
  const segmentLength = Math.PI * 2 * radius / count;
  const material = new THREE.MeshPhysicalMaterial({
    color: ring % 2 ? 0xa89980 : 0xb9aa90,
    map: stoneTexture,
    roughness: 0.78,
    metalness: 0.14
  });
  const tiles = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.98, 0.075, segmentLength * 0.91),
    material,
    count
  );
  const transform = new THREE.Object3D();
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2;
    transform.position.set(Math.cos(angle) * radius, 0.012, Math.sin(angle) * radius);
    transform.rotation.set(0, -angle, 0);
    transform.updateMatrix();
    tiles.setMatrixAt(index, transform.matrix);
  }
  tiles.receiveShadow = true;
  scene.add(tiles);
}

addRing(3.05, 0.12, paleGold, 0.075);
addRing(3.55, 0.035, gold, 0.065);
addRing(7.15, 0.06, gold, 0.04);
addRing(13.4, 0.035, paleGold, 0.035);
addRing(19.85, 0.08, paleGold, 0.035);
addRing(24.25, 0.2, gold, 0.14);
addRing(24.72, 0.055, paleGold, 0.12);

const centerSigil = new THREE.Mesh(
  new THREE.CircleGeometry(2.66, 8),
  new THREE.MeshPhysicalMaterial({
    color: 0xa28b68,
    roughness: 0.68,
    metalness: 0.42,
    side: THREE.DoubleSide,
    map: stoneTexture,
    bumpMap: bumpTexture,
    bumpScale: 0.04
  })
);
centerSigil.rotation.x = -Math.PI / 2;
centerSigil.position.y = 0.018;
scene.add(centerSigil);

const sigilCore = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.72, 1),
  new THREE.MeshPhysicalMaterial({
    color: 0xc99a58,
    metalness: 0.9,
    roughness: 0.16,
    clearcoat: 0.9,
    emissive: 0x74400c,
    emissiveIntensity: 0.72
  })
);
sigilCore.position.y = 0.43;
sigilCore.scale.set(1, 0.18, 1);
sigilCore.castShadow = true;
scene.add(sigilCore);

for (let index = 0; index < 24; index += 1) {
  const angle = index / 24 * Math.PI * 2;
  const rune = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.05, index % 2 ? 0.48 : 0.68),
    paleGold
  );
  rune.position.set(Math.cos(angle) * 5.65, 0.055, Math.sin(angle) * 5.65);
  rune.rotation.y = -angle;
  scene.add(rune);
}

const columnCount = 14;
for (let index = 0; index < columnCount; index += 1) {
  const angle = index / columnCount * Math.PI * 2;
  const column = new THREE.Group();
  column.position.set(Math.cos(angle) * 26.15, 0, Math.sin(angle) * 26.15);
  column.rotation.y = -angle;

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.92, 0.34, 20), darkStone);
  base.position.y = 0.17;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.54, 5.1, 20), stone);
  shaft.position.y = 2.86;
  const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.69, 0.44, 0.34, 20), darkStone);
  capital.position.y = 5.58;
  const abacus = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.19, 1.2), gold);
  abacus.position.y = 5.83;
  const lowerBand = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.055, 8, 24), paleGold);
  lowerBand.rotation.x = Math.PI / 2;
  lowerBand.position.y = 0.7;
  const upperBand = lowerBand.clone();
  upperBand.position.y = 5.08;

  for (const object of [base, shaft, capital, abacus, lowerBand, upperBand]) {
    object.castShadow = false;
    object.receiveShadow = false;
    column.add(object);
  }
  scene.add(column);
}

const torches = [];
const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xffa35a });
const innerFlameMaterial = new THREE.MeshBasicMaterial({ color: 0xffe0ae });

for (let index = 0; index < 10; index += 1) {
  const angle = index / 10 * Math.PI * 2;
  const brazier = new THREE.Group();
  brazier.position.set(Math.cos(angle) * 20.4, 0, Math.sin(angle) * 20.4);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.15, 0.95, 12), gold);
  stem.position.y = 0.48;
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.34, 0.28, 16), gold);
  bowl.position.y = 1.05;
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.72, 10), flameMaterial);
  flame.position.y = 1.54;
  const innerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.43, 8), innerFlameMaterial);
  innerFlame.position.y = 1.5;
  const light = new THREE.PointLight(0xffa45e, 1.35, 10, 2);
  light.position.y = 1.68;

  brazier.add(stem, bowl, flame, innerFlame, light);
  scene.add(brazier);
  torches.push({ flame, innerFlame, light, phase: angle });
}

for (let index = 0; index < 2; index += 1) {
  const banner = new THREE.Group();
  banner.position.set(index ? -16.8 : 16.8, 0, -18.8);
  banner.rotation.y = index ? -0.28 : 0.28;

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 6.4, 10), gold);
  pole.position.y = 3.2;
  const clothMaterial = new THREE.MeshStandardMaterial({
    color: index ? 0x405f7a : 0x9e3c43,
    roughness: 0.95,
    side: THREE.DoubleSide,
    emissive: index ? 0x101d28 : 0x260b0e,
    emissiveIntensity: 0.28
  });
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.9, 8, 10), clothMaterial);
  cloth.position.set(0, 4.55, 0);
  cloth.rotation.y = Math.PI;
  banner.add(pole, cloth);
  scene.add(banner);
}

export function resizeScene(width, height) {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height);
  composer.setPixelRatio(pixelRatio);
  composer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

export function updateScene(dt, time) {
  for (const torch of torches) {
    const pulse = Math.sin(time * 8 + torch.phase);
    torch.flame.scale.set(0.9 + pulse * 0.08, 0.88 + pulse * 0.2, 0.9 + pulse * 0.08);
    torch.innerFlame.scale.y = 0.85 + Math.sin(time * 11 + torch.phase) * 0.12;
    torch.light.intensity = 1.15 + Math.sin(time * 10 + torch.phase) * 0.24;
  }
  sigilCore.rotation.y += dt * 0.2;
  sigilCore.position.y = 0.43 + Math.sin(time * 1.6) * 0.045;
}
