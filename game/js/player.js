import * as THREE from 'three';
import { scene } from './scene.js';

export const player = new THREE.Group();

function makeClothTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#8b111b';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 3) {
    ctx.fillStyle = y % 6 === 0 ? 'rgba(255,140,120,0.09)' : 'rgba(20,0,4,0.14)';
    ctx.fillRect(0, y, 256, 1);
  }
  for (let i = 0; i < 1200; i += 1) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,180,150,0.06)' : 'rgba(10,0,2,0.12)';
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

function makeTatteredAlphaMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 256);

  // Carve ragged tears along the bottom hem (v near 0 in PlaneGeometry UVs)
  ctx.fillStyle = '#000000';
  for (let x = 0; x < 256; x += 2) {
    const wave = Math.sin(x * 0.14) * 14 + Math.cos(x * 0.37) * 9 + Math.sin(x * 0.85) * 6;
    const tearHeight = Math.max(4, 24 + wave);
    ctx.fillRect(x, 256 - tearHeight, 2, tearHeight);
  }
  // Small battle holes near the hem
  for (let i = 0; i < 18; i += 1) {
    const hx = 12 + ((i * 37) % 232);
    const hy = 212 + ((i * 19) % 28);
    ctx.beginPath();
    ctx.arc(hx, hy, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// Materials matching the Shadow Knight concept art
const darkSteel = new THREE.MeshPhysicalMaterial({
  color: 0x161920,
  metalness: 0.78,
  roughness: 0.36,
  clearcoat: 0.18,
  clearcoatRoughness: 0.45,
});
const obsidianPlate = new THREE.MeshPhysicalMaterial({
  color: 0x0d1016,
  metalness: 0.84,
  roughness: 0.3,
});
const agedBronze = new THREE.MeshPhysicalMaterial({
  color: 0xa67c37,
  metalness: 0.86,
  roughness: 0.34,
  clearcoat: 0.25,
  emissive: 0x1f1302,
  emissiveIntensity: 0.15,
});
const crimsonCloth = new THREE.MeshStandardMaterial({
  color: 0x9e141f,
  map: makeClothTexture(),
  roughness: 0.86,
  side: THREE.DoubleSide,
});
const tatteredCapeMat = new THREE.MeshStandardMaterial({
  color: 0x99111c,
  map: makeClothTexture(),
  alphaMap: makeTatteredAlphaMap(),
  alphaTest: 0.45,
  roughness: 0.88,
  side: THREE.DoubleSide,
});
const leatherStrap = new THREE.MeshStandardMaterial({
  color: 0x2b1710,
  metalness: 0.15,
  roughness: 0.82,
});
const visorGlow = new THREE.MeshStandardMaterial({
  color: 0xffb32c,
  emissive: 0xff7b00,
  emissiveIntensity: 2.1,
  roughness: 0.2,
});
const bladeSteel = new THREE.MeshPhysicalMaterial({
  color: 0x2a303b,
  metalness: 0.92,
  roughness: 0.22,
  clearcoat: 0.3,
});

function mesh(parent, geometry, material, position, rotation) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  if (rotation) object.rotation.set(...rotation);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function createBronzeMedallion(parent, radius, position, rotation) {
  const group = new THREE.Group();
  group.position.set(...position);
  if (rotation) group.rotation.set(...rotation);
  parent.add(group);

  mesh(group, new THREE.CylinderGeometry(radius, radius, 0.024, 24), agedBronze, [0, 0, 0], [Math.PI / 2, 0, 0]);
  mesh(group, new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, 0.028, 20), obsidianPlate, [0, 0, 0], [Math.PI / 2, 0, 0]);
  mesh(group, new THREE.BoxGeometry(radius * 1.4, radius * 0.22, 0.032), agedBronze, [0, 0, 0]);
  mesh(group, new THREE.BoxGeometry(radius * 0.22, radius * 1.4, 0.032), agedBronze, [0, 0, 0]);
  mesh(group, new THREE.SphereGeometry(radius * 0.22, 12, 10), agedBronze, [0, 0, 0.012]);
  return group;
}

// Ground shadow
const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(0.72, 40),
  new THREE.MeshBasicMaterial({
    color: 0x03050b,
    transparent: true,
    opacity: 0.54,
    depthWrite: false,
  })
);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.025;
player.add(shadow);

const body = new THREE.Group();
body.position.y = 0.88;
player.add(body);

// Under-tunic & sculpted dark steel cuirass with bronze trim
const tunic = mesh(body, new THREE.CapsuleGeometry(0.28, 0.56, 8, 24), obsidianPlate, [0, 0.01, -0.02]);
tunic.scale.set(1.02, 1.06, 0.85);

function createCuirassGeometry() {
  const rings = [
    [-0.45, 0.25, 0.165], [-0.34, 0.265, 0.18],
    [-0.18, 0.29, 0.19], [-0.02, 0.325, 0.21],
    [0.14, 0.37, 0.225], [0.28, 0.395, 0.21],
    [0.39, 0.34, 0.17], [0.45, 0.27, 0.145],
  ];
  const segments = 48;
  const positions = [];
  const indices = [];
  rings.forEach(([y, width, depth], row) => {
    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2;
      const front = Math.max(0, Math.sin(angle));
      const chestRidge = Math.exp(-Math.pow((y - 0.16) / 0.18, 2)) * Math.pow(front, 2.5);
      positions.push(
        Math.cos(angle) * width,
        y,
        Math.sin(angle) * (depth + chestRidge * 0.04) + 0.015
      );
      if (row < rings.length - 1 && segment < segments) {
        const a = row * (segments + 1) + segment;
        const b = a + segments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
mesh(body, createCuirassGeometry(), darkSteel, [0, 0.02, 0]);

// V-shaped bronze chest trim and center ridge
mesh(body, new THREE.BoxGeometry(0.022, 0.44, 0.025), agedBronze, [0, 0.12, 0.245]);
for (const side of [-1, 1]) {
  mesh(body, new THREE.BoxGeometry(0.24, 0.024, 0.024), agedBronze, [side * 0.12, 0.22, 0.235], [0, 0, side * 0.32]);
  mesh(body, new THREE.BoxGeometry(0.22, 0.02, 0.022), agedBronze, [side * 0.11, -0.02, 0.215], [0, 0, side * 0.28]);
}

// Draped crimson scarf / cowl across the collar with twin bronze medallions
const scarfMain = mesh(body, new THREE.TorusGeometry(0.28, 0.085, 14, 36), crimsonCloth, [0, 0.37, 0.02], [Math.PI * 0.46, 0, 0]);
scarfMain.scale.set(1.22, 1.05, 0.92);
const scarfFold = mesh(body, new THREE.TorusGeometry(0.25, 0.06, 12, 32, Math.PI * 1.15), crimsonCloth, [0, 0.31, 0.09], [Math.PI * 0.38, 0, -Math.PI * 0.08]);
scarfFold.scale.set(1.18, 0.95, 0.95);
for (const side of [-1, 1]) {
  createBronzeMedallion(body, 0.072, [side * 0.25, 0.33, 0.22], [-0.15, side * 0.35, 0]);
}

// Leather belt with large engraved bronze buckle
mesh(body, new THREE.CylinderGeometry(0.285, 0.3, 0.11, 32), leatherStrap, [0, -0.41, 0.01]);
mesh(body, new THREE.TorusGeometry(0.285, 0.016, 8, 32), agedBronze, [0, -0.36, 0.01], [Math.PI / 2, 0, 0]);
mesh(body, new THREE.TorusGeometry(0.295, 0.016, 8, 32), agedBronze, [0, -0.46, 0.01], [Math.PI / 2, 0, 0]);
createBronzeMedallion(body, 0.088, [0, -0.41, 0.305], [0, 0, 0]);

// Tattered crimson loincloth / tabard hanging under the belt
const frontTabard = mesh(body, new THREE.PlaneGeometry(0.32, 0.56, 6, 8), tatteredCapeMat, [0, -0.71, 0.265]);
frontTabard.rotation.x = -0.08;
const backTabard = mesh(body, new THREE.PlaneGeometry(0.34, 0.58, 6, 8), tatteredCapeMat, [0, -0.72, -0.26]);
backTabard.rotation.x = 0.1;

// Layered dark steel & bronze-trimmed tassets flanking the tabard
for (const side of [-1, 1]) {
  for (let tier = 0; tier < 2; tier += 1) {
    const tasset = mesh(
      body,
      new THREE.BoxGeometry(0.22, 0.24, 0.045),
      darkSteel,
      [side * (0.23 + tier * 0.03), -0.54 - tier * 0.14, 0.14 - tier * 0.03],
      [0.14, side * 0.35, side * (0.18 + tier * 0.08)]
    );
    mesh(tasset, new THREE.BoxGeometry(0.225, 0.022, 0.052), agedBronze, [0, -0.11, 0]);
    mesh(tasset, new THREE.BoxGeometry(0.022, 0.24, 0.052), agedBronze, [side * 0.1, 0, 0]);
  }
}

// Corinthian Shadow-Knight Helm with segmented fan crest & glowing V-visor (no horns)
const head = new THREE.Group();
head.position.set(0, 0.62, 0.02);
body.add(head);

// Inner shadow hood
mesh(head, new THREE.SphereGeometry(0.22, 24, 18), obsidianPlate, [0, -0.02, 0.02]);

// Domed black steel helmet
const helmDome = mesh(
  head,
  new THREE.SphereGeometry(0.285, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.78),
  darkSteel,
  [0, 0.07, -0.01]
);
helmDome.scale.set(0.98, 1.12, 1.04);

// Center brow ridge & nose guard
mesh(head, new THREE.BoxGeometry(0.045, 0.25, 0.08), darkSteel, [0, -0.04, 0.265]);
mesh(head, new THREE.BoxGeometry(0.018, 0.26, 0.088), agedBronze, [0, -0.03, 0.27]);

// Angled brow plates & glowing amber V-eyes
for (const side of [-1, 1]) {
  mesh(head, new THREE.BoxGeometry(0.17, 0.048, 0.08), darkSteel, [side * 0.095, 0.045, 0.25], [0.08, side * 0.25, side * -0.24]);
  mesh(head, new THREE.BoxGeometry(0.15, 0.014, 0.085), agedBronze, [side * 0.095, 0.022, 0.254], [0.08, side * 0.25, side * -0.24]);

  // Glowing V-shaped eye slit
  mesh(head, new THREE.BoxGeometry(0.125, 0.022, 0.03), visorGlow, [side * 0.085, 0.002, 0.255], [0, side * 0.26, side * -0.24]);

  // Sharp cheek guards
  const cheek = mesh(head, new THREE.BoxGeometry(0.14, 0.22, 0.14), darkSteel, [side * 0.155, -0.11, 0.14], [0.08, side * 0.38, side * -0.12]);
  mesh(cheek, new THREE.BoxGeometry(0.02, 0.22, 0.145), agedBronze, [side * -0.065, 0, 0.005]);
}

// Segmented fan-shaped metal crest (mohawk plume)
const crestGroup = new THREE.Group();
crestGroup.position.set(0, 0.34, -0.02);
head.add(crestGroup);
mesh(crestGroup, new THREE.BoxGeometry(0.055, 0.12, 0.34), agedBronze, [0, -0.04, 0], [-0.12, 0, 0]);
for (let seg = 0; seg < 6; seg += 1) {
  const angle = -0.35 + seg * 0.14;
  const blade = mesh(
    crestGroup,
    new THREE.BoxGeometry(0.038, 0.19, 0.075),
    seg % 2 === 0 ? darkSteel : obsidianPlate,
    [0, 0.07 + Math.cos(angle) * 0.03, Math.sin(angle) * 0.22],
    [angle, 0, 0]
  );
  mesh(blade, new THREE.BoxGeometry(0.042, 0.018, 0.078), agedBronze, [0, 0.09, 0]);
}
const crest = crestGroup;

// Layered 3-tier spiked pauldrons with bronze rims
for (const side of [-1, 1]) {
  for (let layer = 0; layer < 3; layer += 1) {
    const scale = 1 - layer * 0.14;
    const yOff = 0.24 - layer * 0.085;
    const xOff = side * (0.41 + layer * 0.035);
    const pauldron = mesh(
      body,
      new THREE.SphereGeometry(0.24 * scale, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.58),
      darkSteel,
      [xOff, yOff, 0],
      [0, 0, side * (-0.32 - layer * 0.14)]
    );
    pauldron.scale.set(1.15, 0.85, 1.15);

    const rim = mesh(
      body,
      new THREE.TorusGeometry(0.235 * scale, 0.016, 8, 24),
      agedBronze,
      [xOff, yOff - 0.01, 0],
      [Math.PI / 2, side * (-0.32 - layer * 0.14), 0]
    );
    rim.scale.set(1.15, 1.15, 1);

    // Shoulder wing flare
    mesh(
      body,
      new THREE.ConeGeometry(0.055 * scale, 0.18 * scale, 4),
      agedBronze,
      [xOff + side * 0.14, yOff + 0.09, 0],
      [0, 0, side * -0.65]
    );
  }
}

// Articulated Legs with layered knee guards and bronze-trimmed greaves
const footWorldPosition = new THREE.Vector3();
const legs = [];
const arms = [];
for (const side of [-1, 1]) {
  const hip = new THREE.Group();
  hip.position.set(side * 0.19, -0.47, 0);
  body.add(hip);
  mesh(hip, new THREE.CapsuleGeometry(0.115, 0.2, 6, 14), obsidianPlate, [0, -0.12, 0]);
  mesh(hip, new THREE.BoxGeometry(0.16, 0.22, 0.18), darkSteel, [side * 0.02, -0.12, 0.02], [0, 0, side * -0.08]);

  const knee = new THREE.Group();
  knee.position.y = -0.275;
  hip.add(knee);
  // Angular winged knee guard
  mesh(knee, new THREE.ConeGeometry(0.11, 0.22, 5), darkSteel, [0, 0.02, 0.085], [0.2, 0, 0]);
  mesh(knee, new THREE.BoxGeometry(0.15, 0.03, 0.14), agedBronze, [0, 0.05, 0.05]);
  // Greave
  mesh(knee, new THREE.CapsuleGeometry(0.095, 0.18, 6, 14), darkSteel, [0, -0.12, 0.01]);
  mesh(knee, new THREE.BoxGeometry(0.03, 0.24, 0.04), agedBronze, [0, -0.12, 0.105]);

  const foot = new THREE.Group();
  foot.position.set(0, -0.255, 0.04);
  knee.add(foot);
  mesh(foot, new THREE.BoxGeometry(0.21, 0.1, 0.31), darkSteel, [0, 0.01, 0.1]);
  mesh(foot, new THREE.BoxGeometry(0.215, 0.03, 0.32), agedBronze, [0, -0.02, 0.1]);
  mesh(foot, new THREE.BoxGeometry(0.18, 0.11, 0.08), agedBronze, [0, 0.02, 0.23]);
  legs.push({ hip, knee, foot, side, baseFootY: foot.position.y });

  // Arms with vambraces and bronze trim
  const shoulder = new THREE.Group();
  shoulder.position.set(side * 0.41, 0.18, 0);
  body.add(shoulder);
  mesh(shoulder, new THREE.CapsuleGeometry(0.11, 0.28, 6, 12), obsidianPlate, [0, -0.13, 0]);

  const elbow = new THREE.Group();
  elbow.position.y = -0.28;
  shoulder.add(elbow);
  mesh(elbow, new THREE.CapsuleGeometry(0.095, 0.22, 6, 12), darkSteel, [0, -0.11, 0.02]);
  mesh(elbow, new THREE.CylinderGeometry(0.115, 0.105, 0.2, 12), darkSteel, [0, -0.11, 0.02]);
  mesh(elbow, new THREE.TorusGeometry(0.112, 0.014, 8, 20), agedBronze, [0, -0.02, 0.02], [Math.PI / 2, 0, 0]);
  mesh(elbow, new THREE.TorusGeometry(0.105, 0.014, 8, 20), agedBronze, [0, -0.2, 0.02], [Math.PI / 2, 0, 0]);
  mesh(elbow, new THREE.SphereGeometry(0.09, 14, 10), obsidianPlate, [0, -0.24, 0.03]);
  arms.push({ shoulder, elbow, side });
}

// Wide, billowing tattered crimson cape
const capeGeometry = new THREE.PlaneGeometry(1.38, 1.52, 10, 12);
const capeBasePositions = Float32Array.from(capeGeometry.attributes.position.array);
const capePositions = capeGeometry.attributes.position;
for (let index = 0; index < capePositions.count; index += 1) {
  const x = capePositions.getX(index);
  const y = capePositions.getY(index);
  const flare = 1 + Math.max(0, (0.76 - y) / 1.52) * 0.35;
  capePositions.setX(index, x * flare);
  capePositions.setZ(index, Math.sin(x * 4.5 + y * 2.2) * 0.07 - Math.abs(x) * 0.08);
}
capeGeometry.computeVertexNormals();
const cape = mesh(body, capeGeometry, tatteredCapeMat, [0, -0.22, -0.34]);
cape.rotation.x = 0.14;

// Large curved Kite Shield with thick bronze rim and 4-pointed bronze star emblem
export const shieldRig = new THREE.Group();
shieldRig.position.set(-0.28, 0.04, -0.38);
shieldRig.rotation.y = Math.PI;
body.add(shieldRig);

function createKiteShieldGeometry(width, height, depth) {
  const shape = new THREE.Shape();
  shape.moveTo(0, height * 0.52);
  shape.bezierCurveTo(width * 0.45, height * 0.5, width * 0.56, height * 0.18, width * 0.48, -height * 0.12);
  shape.bezierCurveTo(width * 0.38, -height * 0.38, width * 0.14, -height * 0.52, 0, -height * 0.58);
  shape.bezierCurveTo(-width * 0.14, -height * 0.52, -width * 0.38, -height * 0.38, -width * 0.48, -height * 0.12);
  shape.bezierCurveTo(-width * 0.56, height * 0.18, -width * 0.45, height * 0.5, 0, height * 0.52);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.025,
    bevelThickness: 0.025,
  });
  // Curve the shield horizontally around the arm
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const bend = -Math.pow(x / (width * 0.55), 2) * 0.16;
    pos.setZ(i, pos.getZ(i) + bend);
  }
  geo.computeVertexNormals();
  return geo;
}

mesh(shieldRig, createKiteShieldGeometry(1.06, 1.38, 0.04), agedBronze, [0, -0.02, -0.01]);
mesh(shieldRig, createKiteShieldGeometry(0.92, 1.22, 0.048), obsidianPlate, [0, -0.02, 0.008]);

// 4-pointed bronze star emblem in the center of the shield
const starGroup = new THREE.Group();
starGroup.position.set(0, 0.02, 0.065);
shieldRig.add(starGroup);
mesh(starGroup, new THREE.ConeGeometry(0.085, 0.46, 4), agedBronze, [0, 0.2, 0]);
mesh(starGroup, new THREE.ConeGeometry(0.085, 0.46, 4), agedBronze, [0, -0.2, 0], [Math.PI, 0, 0]);
mesh(starGroup, new THREE.ConeGeometry(0.075, 0.36, 4), agedBronze, [0.16, 0, 0], [0, 0, -Math.PI / 2]);
mesh(starGroup, new THREE.ConeGeometry(0.075, 0.36, 4), agedBronze, [-0.16, 0, 0], [0, 0, Math.PI / 2]);
mesh(starGroup, new THREE.OctahedronGeometry(0.09, 0), obsidianPlate, [0, 0, 0.015]);

// Broad Shadow Greatsword (exported as spearRig/spearTip for seamless combat compatibility)
export const spearRig = new THREE.Group();
spearRig.position.set(0.42, 0.12, 0.15);
body.add(spearRig);

// Pommel & leather-wrapped grip
mesh(spearRig, new THREE.OctahedronGeometry(0.055, 0), agedBronze, [0, 0, -0.22]);
mesh(spearRig, new THREE.CylinderGeometry(0.032, 0.036, 0.34, 10), leatherStrap, [0, 0, -0.04], [Math.PI / 2, 0, 0]);
// Curved bronze crossguard
const guard = mesh(spearRig, new THREE.BoxGeometry(0.36, 0.055, 0.075), agedBronze, [0, 0, 0.14]);
guard.scale.set(1, 1, 1.15);
mesh(spearRig, new THREE.OctahedronGeometry(0.055, 0), agedBronze, [0, 0, 0.14]);
// Broad dark-steel double-edged blade with bronze fuller
mesh(spearRig, new THREE.BoxGeometry(0.14, 0.024, 1.15), bladeSteel, [0, 0, 0.74]);
mesh(spearRig, new THREE.BoxGeometry(0.036, 0.032, 1.02), agedBronze, [0, 0, 0.68]);
const tip = mesh(spearRig, new THREE.ConeGeometry(0.098, 0.28, 4), bladeSteel, [0, 0, 1.44], [Math.PI / 2, Math.PI / 4, 0]);
tip.scale.set(1, 1, 0.22);

export const spearTip = new THREE.Object3D();
spearTip.position.set(0, 0, 1.56);
spearRig.add(spearTip);

player.userData = {
  body,
  crest,
  capeGeometry,
  capeBasePositions,
  head,
  legs,
  arms,
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
  colliderRadius: 0.54,
};
player.scale.setScalar(1.1);
scene.add(player);

export const orbitalGroup = new THREE.Group();
const orbitalMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x9e141f,
  metalness: 0.48,
  roughness: 0.22,
  clearcoat: 0.8,
  emissive: 0x650014,
  emissiveIntensity: 0.42,
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
  agedBronze,
  [1.55, 0.9, 0]
);
orbitalRing.rotation.x = Math.PI / 2;
orbitalGroup.visible = false;
scene.add(orbitalGroup);

const oneHandSpearPosition = new THREE.Vector3(0.44, 0.08, 0.18);
const twoHandSpearPosition = new THREE.Vector3(0.16, 0.04, 0.26);
const shieldGuardPosition = new THREE.Vector3(-0.56, 0.06, 0.24);
const shieldStowPosition = new THREE.Vector3(-0.28, 0.04, -0.38);

export function triggerPlayerAttack(mode = 'throw') {
  const data = player.userData;
  data.attackMode = mode;
  data.attackDuration = mode === 'thrust' ? 0.68 : 0.88;
  data.attackTimer = data.attackDuration;
}

export function triggerPlayerHit() {
  player.userData.hitTimer = 0.3;
}

export function updatePlayerAnimation(dt, moving, state, oneHanded = false) {
  const data = player.userData;
  data.animationTime += dt;
  data.moveBlend = THREE.MathUtils.damp(data.moveBlend, moving ? 1 : 0, 9, dt);
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

  data.body.position.y = 0.88 + Math.abs(stride) * 0.028 * data.moveBlend + breath * 0.01 * idleWeight;
  data.body.position.z = 0;
  data.body.rotation.x = -0.055 * data.moveBlend + breath * 0.014 * idleWeight;
  data.body.rotation.y = stride * 0.065 * data.moveBlend;
  data.body.rotation.z = -stride * 0.035 * data.moveBlend;
  data.head.rotation.x = -0.025 + breath * 0.016;
  data.head.rotation.y = stride * 0.045 * data.moveBlend;
  data.head.rotation.z = stride * 0.009 * data.moveBlend;

  data.cape.rotation.x = 0.14 + data.moveBlend * 0.22 + Math.sin(data.animationTime * 4.1) * 0.03;
  data.cape.rotation.z = -stride * 0.085 * data.moveBlend;
  const capeAttribute = data.capeGeometry.attributes.position;
  for (let vertex = 0; vertex < capeAttribute.count; vertex += 1) {
    const offset = vertex * 3;
    const x = data.capeBasePositions[offset];
    const y = data.capeBasePositions[offset + 1];
    const freeEdge = THREE.MathUtils.clamp((0.76 - y) / 1.52, 0, 1);
    const wave = Math.sin(data.animationTime * 5.2 + x * 4.8 + y * 2.5);
    const flutter = freeEdge * (0.035 + data.moveBlend * 0.09);
    capeAttribute.setZ(vertex, data.capeBasePositions[offset + 2] + wave * flutter);
  }
  capeAttribute.needsUpdate = true;

  data.crest.rotation.z = Math.sin(data.animationTime * 3.1) * 0.03 - stride * 0.04 * data.moveBlend;

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
  const progress = attacking ? 1 - data.attackTimer / data.attackDuration : 0;
  const anticipation = attacking ? 1 - THREE.MathUtils.smoothstep(progress, 0.08, 0.34) : 0;
  const strike = attacking
    ? THREE.MathUtils.smoothstep(progress, 0.27, 0.48) - (1 - THREE.MathUtils.smoothstep(progress, 0.63, 0.86))
    : 0;
  const recovery = attacking ? THREE.MathUtils.smoothstep(progress, 0.66, 1) : 0;

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
      leg.hip.rotation.x += anticipation * (leg.side > 0 ? -0.18 : 0.22) + strike * (leg.side > 0 ? 0.12 : -0.08);
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

  data.shadow.material.opacity = 0.42 + idleWeight * 0.025 + Math.abs(stride) * data.moveBlend * 0.025;

  darkSteel.emissive.setHex(state.upgradeAuraTimer > 0 ? 0x30000a : 0x000000);
  agedBronze.emissiveIntensity = state.upgradeAuraTimer > 0 ? 0.42 : 0.15;
  crimsonCloth.emissive.setHex(state.upgradeAuraTimer > 0 ? 0x3a0008 : 0x000000);
}

window.__myrmidonModelLoaded = true;
