import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';

export const scene = new THREE.Scene();

// Palette d'or et clair-obscur de Léonard de Vinci : Coucher de soleil héroïque et lumière rasante
const SKY_HORIZON = new THREE.Color(0xdca158);
const SKY_ZENITH = new THREE.Color(0x28384a);
scene.background = SKY_HORIZON;
scene.fog = new THREE.FogExp2(0x8c6c4c, 0.0058);

export const camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, 0.1, 150);
camera.position.set(0, 7.85, 7.8);

export const renderer = new THREE.WebGLRenderer({
  antialias: false,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(1);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = false;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.38;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.physicallyCorrectLights = true;
document.body.appendChild(renderer.domElement);

// Cube / Sky dome dynamique dégradé (Atmosphère d'or et ciel crépusculaire chaud)
function createGoldenHourSkyDome() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, '#1c2838'); // Sommet azur profond
  grad.addColorStop(0.45, '#4a5b6f'); // Médian crépusculaire
  grad.addColorStop(0.70, '#ab683b'); // Ambre chaud
  grad.addColorStop(0.88, '#e59d47'); // Or incandescent horizon
  grad.addColorStop(1.0, '#eeb768'); // Brume d'or rasante
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const skyGeo = new THREE.SphereGeometry(72, 24, 16);
  const skyMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.rotation.y = -Math.PI * 0.35;
  scene.add(sky);
  return sky;
}
createGoldenHourSkyDome();

// Carte d'environnement dorée pour faire étinceler l'acier noirci et le bronze antique
const envData = new Uint8Array([
  255, 214, 150, 255,   255, 178, 92, 255,
  140, 110, 78, 255,    65, 82, 104, 255,
]);
const envTex = new THREE.DataTexture(envData, 2, 2, THREE.RGBAFormat);
envTex.mapping = THREE.EquirectangularReflectionMapping;
envTex.colorSpace = THREE.SRGBColorSpace;
envTex.needsUpdate = true;
scene.environment = envTex;

export const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.setSize(innerWidth, innerHeight);

// Éclairage chiaroscuro inspiré de Léonard :
// Soleil d'or rasant + Rim light dramatique pour détacher l'armure sombre du fond
scene.add(new THREE.HemisphereLight(0xffdfb0, 0x422d1c, 2.1));

const sun = new THREE.DirectionalLight(0xffe4b5, 3.8);
sun.position.set(-19, 26, -14);
scene.add(sun);

// Contre-jour (Rim-light) intense soulignant les contours des épaules, du casque et du bouclier
const rimLight = new THREE.DirectionalLight(0xffb862, 2.6);
rimLight.position.set(16, 14, 18);
scene.add(rimLight);

const warmFill = new THREE.PointLight(0xffa84f, 1.8, 38, 1.4);
warmFill.position.set(0, 4.5, 0);
scene.add(warmFill);

// Textures procédurales de travertin et de marbre antique
function createStoneTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');

  context.fillStyle = '#bda98c';
  context.fillRect(0, 0, 512, 512);

  for (let index = 0; index < 3500; index += 1) {
    const light = Math.random() > 0.48;
    const alpha = 0.03 + Math.random() * 0.08;
    context.fillStyle = light
      ? `rgba(255,242,214,${alpha})`
      : `rgba(88,66,42,${alpha})`;
    const size = 1 + Math.random() * 2.4;
    context.fillRect(Math.random() * 512, Math.random() * 512, size, size);
  }

  for (let index = 0; index < 22; index += 1) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (Math.random() - 0.5) * 56, y + 14 + Math.random() * 40);
    context.lineTo(x + (Math.random() - 0.5) * 92, y + 30 + Math.random() * 80);
    context.strokeStyle = 'rgba(112,84,52,0.14)';
    context.lineWidth = 1 + Math.random() * 1.6;
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  return texture;
}

function createBannerEmblemTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Fond cramoisi profond avec texture de tissage
  ctx.fillStyle = '#8f121d';
  ctx.fillRect(0, 0, 256, 512);

  ctx.strokeStyle = '#620a12';
  ctx.lineWidth = 1;
  for (let y = 0; y < 512; y += 4) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  // Bordure dorée d'apparat
  ctx.strokeStyle = '#d49b38';
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, 236, 492);

  ctx.strokeStyle = '#f3ca6d';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, 224, 480);

  // Emblème antique : trident et étoile sparte dorée (comme sur l'image)
  ctx.fillStyle = '#f6cb65';
  ctx.shadowColor = '#3a0c0f';
  ctx.shadowBlur = 12;

  // Corps central du trident
  ctx.beginPath();
  ctx.moveTo(128, 80);
  ctx.lineTo(136, 280);
  ctx.lineTo(120, 280);
  ctx.closePath();
  ctx.fill();

  // Ailes recourbées du trident spartiate
  ctx.beginPath();
  ctx.moveTo(128, 200);
  ctx.bezierCurveTo(70, 200, 48, 140, 54, 96);
  ctx.lineTo(66, 104);
  ctx.bezierCurveTo(64, 150, 92, 178, 128, 182);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(128, 200);
  ctx.bezierCurveTo(186, 200, 208, 140, 202, 96);
  ctx.lineTo(190, 104);
  ctx.bezierCurveTo(192, 150, 164, 178, 128, 182);
  ctx.closePath();
  ctx.fill();

  // Étoile à 4 branches d'or inférieure
  const cx = 128;
  const cy = 340;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 44);
  ctx.quadraticCurveTo(cx + 8, cy - 8, cx + 44, cy);
  ctx.quadraticCurveTo(cx + 8, cy + 8, cx, cy + 44);
  ctx.quadraticCurveTo(cx - 8, cy + 8, cx - 44, cy);
  ctx.quadraticCurveTo(cx - 8, cy - 8, cx, cy - 44);
  ctx.closePath();
  ctx.fill();

  // Pointe inférieure frangée en pointe de lance
  ctx.fillStyle = '#e8b84e';
  ctx.beginPath();
  ctx.moveTo(128, 492);
  ctx.lineTo(142, 470);
  ctx.lineTo(114, 470);
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const stoneTexture = createStoneTexture();
const bannerTexture = createBannerEmblemTexture();

const gold = new THREE.MeshPhysicalMaterial({
  color: 0xc6964a,
  metalness: 0.85,
  roughness: 0.28,
  clearcoat: 0.35,
  clearcoatRoughness: 0.32,
  envMapIntensity: 0.95,
  emissive: 0x321804,
  emissiveIntensity: 0.14,
});

const paleGold = new THREE.MeshPhysicalMaterial({
  color: 0xd4b277,
  metalness: 0.80,
  roughness: 0.30,
  clearcoat: 0.30,
  envMapIntensity: 0.90,
});

const stone = new THREE.MeshPhysicalMaterial({
  color: 0xc1af94,
  map: stoneTexture,
  roughness: 0.76,
  metalness: 0.12,
});

const darkStone = new THREE.MeshPhysicalMaterial({
  color: 0x8b775c,
  map: stoneTexture,
  roughness: 0.82,
  metalness: 0.18,
});

// Sol de l'arène : Harmonique dorée (Suite de Fibonacci & Nombre d'or phi = 1.618)
const floor = new THREE.Mesh(new THREE.CircleGeometry(28.5, 96), darkStone);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.12;
floor.receiveShadow = true;
scene.add(floor);

const arenaFloor = new THREE.Mesh(new THREE.CircleGeometry(24.8, 96), stone);
arenaFloor.rotation.x = -Math.PI / 2;
arenaFloor.position.y = -0.045;
arenaFloor.receiveShadow = true;
scene.add(arenaFloor);

function addRing(radius, tube, material, y) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 10, 128), material);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = y;
  ring.receiveShadow = true;
  scene.add(ring);
  return ring;
}

// Anneaux concentriques proportionnés selon le Nombre d'Or phi = 1.618
const PHI = 1.61803398875;
const goldenRadii = [
  3.05,
  3.05 * 1.618 / 1.25, // ~3.94
  3.05 * 1.618,        // ~4.93
  4.93 * 1.618,        // ~7.98
  7.98 * 1.618,        // ~12.91
  12.91 * 1.618,       // ~20.89
  24.6,
];

for (let i = 0; i < 5; i += 1) {
  const radius = 4.2 + i * 3.8;
  const count = Math.round(radius * 4.2);
  const segmentLength = (Math.PI * 2 * radius) / count;
  const material = new THREE.MeshPhysicalMaterial({
    color: i % 2 ? 0xb09f84 : 0xc2b196,
    map: stoneTexture,
    roughness: 0.75,
    metalness: 0.12,
  });
  const tiles = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.96, 0.07, segmentLength * 0.90),
    material,
    count
  );
  const transform = new THREE.Object3D();
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    transform.position.set(Math.cos(angle) * radius, 0.012, Math.sin(angle) * radius);
    transform.rotation.set(0, -angle, 0);
    transform.updateMatrix();
    tiles.setMatrixAt(index, transform.matrix);
  }
  tiles.receiveShadow = true;
  scene.add(tiles);
}

addRing(3.05, 0.10, paleGold, 0.075);
addRing(3.95, 0.035, gold, 0.065);
addRing(7.98, 0.05, gold, 0.040);
addRing(12.91, 0.035, paleGold, 0.035);
addRing(20.89, 0.065, paleGold, 0.035);
addRing(24.4, 0.18, gold, 0.12);

// Sceau géométrique sacré de l'Omphalos (Étoile à 8 pointes dorée)
const centerSigil = new THREE.Mesh(
  new THREE.CircleGeometry(2.8, 8),
  new THREE.MeshPhysicalMaterial({
    color: 0xab9470,
    roughness: 0.65,
    metalness: 0.45,
    side: THREE.DoubleSide,
    map: stoneTexture,
  })
);
centerSigil.rotation.x = -Math.PI / 2;
centerSigil.position.y = 0.018;
scene.add(centerSigil);

const sigilCore = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.76, 1),
  new THREE.MeshPhysicalMaterial({
    color: 0xd4a358,
    metalness: 0.92,
    roughness: 0.14,
    clearcoat: 0.95,
    emissive: 0x884c0c,
    emissiveIntensity: 0.22,
  })
);
sigilCore.position.y = 0.44;
sigilCore.scale.set(1, 0.18, 1);
scene.add(sigilCore);

export const arenaObstacles = [];

// Péristyle des Colonnes Antiques & Bannières Royales Cramoisies
const columnCount = 14;
const bannerCloths = [];
const bannerMaterial = new THREE.MeshStandardMaterial({
  map: bannerTexture,
  roughness: 0.82,
  side: THREE.DoubleSide,
  emissive: 0x22060a,
  emissiveIntensity: 0.12,
});

for (let index = 0; index < columnCount; index += 1) {
  const angle = (index / columnCount) * Math.PI * 2;
  const colRadius = 26.15;
  const colX = Math.cos(angle) * colRadius;
  const colZ = Math.sin(angle) * colRadius;

  const column = new THREE.Group();
  column.position.set(colX, 0, colZ);
  arenaObstacles.push({ x: colX, z: colZ, radius: 0.82 });
  column.rotation.y = -angle;

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.94, 0.36, 16), darkStone);
  base.position.y = 0.18;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.56, 5.2, 16), stone);
  shaft.position.y = 2.90;
  const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.70, 0.46, 0.36, 16), darkStone);
  capital.position.y = 5.64;
  const abacus = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.20, 1.24), gold);
  abacus.position.y = 5.90;

  const lowerBand = new THREE.Mesh(new THREE.TorusGeometry(0.50, 0.05, 8, 20), paleGold);
  lowerBand.rotation.x = Math.PI / 2;
  lowerBand.position.y = 0.72;
  const upperBand = lowerBand.clone();
  upperBand.position.y = 5.12;

  column.add(base, shaft, capital, abacus, lowerBand, upperBand);
  scene.add(column);

  // Bannière rouge cramoisie majestueuse avec emblème doré sur chaque colonne paire (comme sur l'image)
  if (index % 2 === 0) {
    const bannerGroup = new THREE.Group();
    bannerGroup.position.set(colX * 0.95, 0, colZ * 0.95);
    bannerGroup.rotation.y = Math.atan2(-colX, -colZ);

    const crossbeam = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 8), gold);
    crossbeam.rotation.z = Math.PI / 2;
    crossbeam.position.y = 5.35;
    bannerGroup.add(crossbeam);

    const clothGeo = new THREE.PlaneGeometry(1.95, 3.85, 8, 12);
    const clothMesh = new THREE.Mesh(clothGeo, bannerMaterial);
    clothMesh.position.set(0, 3.32, 0.06);

    bannerCloths.push({
      geometry: clothGeo,
      basePositions: Float32Array.from(clothGeo.attributes.position.array),
      phase: index * 0.65,
    });

    bannerGroup.add(clothMesh);
    scene.add(bannerGroup);
  }
}

// Braseros et Flammes Ardentes
const torches = [];
const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xff8c32 });
const innerFlameMaterial = new THREE.MeshBasicMaterial({ color: 0xffe28a });

for (let index = 0; index < 10; index += 1) {
  const angle = (index / 10) * Math.PI * 2;
  const brazier = new THREE.Group();
  brazier.position.set(Math.cos(angle) * 20.4, 0, Math.sin(angle) * 20.4);
  arenaObstacles.push({
    x: brazier.position.x,
    z: brazier.position.z,
    radius: 0.48,
  });

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.16, 1.05, 10), gold);
  stem.position.y = 0.52;
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.38, 0.32, 14), gold);
  bowl.position.y = 1.15;
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.82, 8), flameMaterial);
  flame.position.y = 1.70;
  const innerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.50, 6), innerFlameMaterial);
  innerFlame.position.y = 1.65;
  const light = new THREE.PointLight(0xffa244, 0.65, 9, 2);
  light.position.y = 1.80;

  brazier.add(stem, bowl, flame, innerFlame, light);
  scene.add(brazier);
  torches.push({ flame, innerFlame, light, phase: angle });
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
  // Ondulation gracieuse des bannières royales dans la brise d'arène
  for (const banner of bannerCloths) {
    const positions = banner.geometry.attributes.position;
    for (let vertex = 0; vertex < positions.count; vertex += 1) {
      const offset = vertex * 3;
      const x = banner.basePositions[offset];
      const y = banner.basePositions[offset + 1];
      const baseZ = banner.basePositions[offset + 2];
      const freeEdge = THREE.MathUtils.clamp((x + 0.98) / 1.95, 0, 1);
      const lowerEdge = THREE.MathUtils.clamp((1.92 - y) / 3.85, 0, 1);
      const amplitude = freeEdge * (0.04 + lowerEdge * 0.16);
      const wave = Math.sin(time * 2.4 + y * 1.35 + banner.phase);
      positions.setZ(vertex, baseZ + wave * amplitude);
    }
    positions.needsUpdate = true;
    banner.geometry.computeVertexNormals();
  }

  // Flammes vives et pulsation ardente des vasques
  for (const torch of torches) {
    const pulse = Math.sin(time * 8.5 + torch.phase);
    torch.flame.scale.set(0.92 + pulse * 0.09, 0.88 + pulse * 0.22, 0.92 + pulse * 0.09);
    torch.innerFlame.scale.y = 0.85 + Math.sin(time * 11.5 + torch.phase) * 0.14;
    torch.light.intensity = 0.58 + Math.sin(time * 10.5 + torch.phase) * 0.10;
  }

  sigilCore.rotation.y += dt * 0.22;
  sigilCore.position.y = 0.44 + Math.sin(time * 1.6) * 0.045;
}

if (renderer && renderer.domElement) {
  renderer.domElement.tabIndex = 1;
  renderer.domElement.style.outline = 'none';
  window.addEventListener('click', () => {
    renderer.domElement.focus();
  });
}
