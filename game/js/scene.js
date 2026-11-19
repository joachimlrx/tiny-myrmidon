import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa9d5ef);
scene.fog = new THREE.FogExp2(0xd6e8f1, 0.0042);

export const camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, 0.1, 150);
camera.position.set(0, 7.85, 7.8);

export const renderer = new THREE.WebGLRenderer({
  antialias: false,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = false;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.32;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.physicallyCorrectLights = true;
document.body.appendChild(renderer.domElement);

// A neutral studio environment gives bronze, steel and obsidian something real to reflect.
// Carte d'environnement métallique ultra-légère pour faire briller le bronze et l'acier à 60 FPS
const envData = new Uint8Array([
  225, 240, 255, 255,  255, 246, 226, 255,
  196, 174, 142, 255,  156, 134, 108, 255
]);
const envTex = new THREE.DataTexture(envData, 2, 2, THREE.RGBAFormat);
envTex.mapping = THREE.EquirectangularReflectionMapping;
envTex.colorSpace = THREE.SRGBColorSpace;
envTex.needsUpdate = true;
scene.environment = envTex;

export const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
// UnrealBloomPass desactive pour garder 60 FPS constants
composer.setSize(innerWidth, innerHeight);

scene.add(new THREE.HemisphereLight(0xf5f9ff, 0xc4aa84, 1.95));

const sun = new THREE.DirectionalLight(0xfff3de, 3.35);
sun.position.set(-18, 34, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -24;
sun.shadow.camera.right = 24;
sun.shadow.camera.top = 24;
sun.shadow.camera.bottom = -24;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 70;
sun.shadow.bias = -0.00018;
sun.shadow.normalBias = 0.028;
scene.add(sun);

const rim = new THREE.DirectionalLight(0xfff6e8, 1.35);
rim.position.set(13, 10, -16);
scene.add(rim);

const warmFill = new THREE.PointLight(0xffe6c4, 2.4, 44, 1.3);
warmFill.position.set(0, 5, 0);
scene.add(warmFill);

function createStoneTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');

  context.fillStyle = '#b7a98f';
  context.fillRect(0, 0, 512, 512);

  for (let index = 0; index < 4000; index += 1) {
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
const bumpTexture = null;


const gold = new THREE.MeshPhysicalMaterial({
  color: 0xb98a54,
  metalness: 0.78,
  roughness: 0.4,
  clearcoat: 0.24,
  clearcoatRoughness: 0.42,
  envMapIntensity: 0.72,
  emissive: 0x211405,
  emissiveIntensity: 0.06
});
const paleGold = new THREE.MeshPhysicalMaterial({
  color: 0xc9aa79,
  metalness: 0.72,
  roughness: 0.38,
  clearcoat: 0.28,
  envMapIntensity: 0.78
});
const stone = new THREE.MeshPhysicalMaterial({
  color: 0xb9aa90,
  map: stoneTexture,
  bumpMap: bumpTexture,
  bumpScale: 0.085,
  roughness: 0.78,
  metalness: 0.18
});
const darkStone = new THREE.MeshPhysicalMaterial({
  color: 0x88765e,
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
    emissiveIntensity: 0.18
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

export const arenaObstacles = [];

const columnCount = 14;
for (let index = 0; index < columnCount; index += 1) {
  const angle = index / columnCount * Math.PI * 2;
  const column = new THREE.Group();
  column.position.set(Math.cos(angle) * 26.15, 0, Math.sin(angle) * 26.15);
  arenaObstacles.push({
    x: column.position.x,
    z: column.position.z,
    radius: 0.82
  });
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
  arenaObstacles.push({
    x: brazier.position.x,
    z: brazier.position.z,
    radius: 0.48
  });

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.15, 0.95, 12), gold);
  stem.position.y = 0.48;
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.34, 0.28, 16), gold);
  bowl.position.y = 1.05;
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.72, 10), flameMaterial);
  flame.position.y = 1.54;
  const innerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.43, 8), innerFlameMaterial);
  innerFlame.position.y = 1.5;
  const light = new THREE.PointLight(0xffa45e, 0.48, 8, 2);
  light.position.y = 1.68;

  brazier.add(stem, bowl, flame, innerFlame, light);
  scene.add(brazier);
  torches.push({ flame, innerFlame, light, phase: angle });
}

const bannerCloths = [];

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
    emissiveIntensity: 0.06
  });
  const clothGeometry = new THREE.PlaneGeometry(1.9, 2.9, 12, 14);
  const cloth = new THREE.Mesh(clothGeometry, clothMaterial);
  cloth.position.set(0, 4.55, 0);
  cloth.rotation.y = Math.PI;
  bannerCloths.push({
    geometry: clothGeometry,
    basePositions: Float32Array.from(clothGeometry.attributes.position.array),
    phase: index * Math.PI,
  });
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
  // The free edge of each banner catches a gentle, continuous arena breeze.
  for (const banner of bannerCloths) {
    const positions = banner.geometry.attributes.position;
    for (let vertex = 0; vertex < positions.count; vertex += 1) {
      const offset = vertex * 3;
      const x = banner.basePositions[offset];
      const y = banner.basePositions[offset + 1];
      const baseZ = banner.basePositions[offset + 2];
      const freeEdge = THREE.MathUtils.clamp((x + 0.95) / 1.9, 0, 1);
      const lowerEdge = THREE.MathUtils.clamp((1.45 - y) / 2.9, 0, 1);
      const amplitude = freeEdge * (0.035 + lowerEdge * 0.12);
      const wave = Math.sin(time * 2.35 + y * 1.45 + banner.phase);
      positions.setZ(vertex, baseZ + wave * amplitude);
    }
    positions.needsUpdate = true;
    banner.geometry.computeVertexNormals();
  }

  for (const torch of torches) {
    const pulse = Math.sin(time * 8 + torch.phase);
    torch.flame.scale.set(0.9 + pulse * 0.08, 0.88 + pulse * 0.2, 0.9 + pulse * 0.08);
    torch.innerFlame.scale.y = 0.85 + Math.sin(time * 11 + torch.phase) * 0.12;
    torch.light.intensity = 0.42 + Math.sin(time * 10 + torch.phase) * 0.08;
  }
  sigilCore.rotation.y += dt * 0.2;
  sigilCore.position.y = 0.43 + Math.sin(time * 1.6) * 0.045;
}


// Forcer le focus permanent sur le renderer pour éviter que l'OS ne piège les touches maintenues
if (renderer && renderer.domElement) {
  renderer.domElement.tabIndex = 1;
  renderer.domElement.style.outline = 'none';
  window.addEventListener('click', () => {
    renderer.domElement.focus();
  });
}
