import * as THREE from 'three';

function makeMetalMaps() {
  const size = 128;
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d');

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 320; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 1 + Math.random() * 2.5;
    const shade = 115 + Math.floor(Math.random() * 30);
    bCtx.fillStyle = `rgba(${shade},${shade},${shade},0.16)`;
    bCtx.beginPath();
    bCtx.arc(x, y, r, 0, Math.PI * 2);
    bCtx.fill();
  }

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(2, 2);
  return { bumpMap };
}

function makeClothTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#8b101a';
  ctx.fillRect(0, 0, size, size);

  for (let x = 0; x < size; x += 2) {
    const fold = Math.sin((x / size) * Math.PI * 8) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(10,0,2,${(1 - fold) * 0.22})`;
    ctx.fillRect(x, 0, 2, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

const metalMaps = makeMetalMaps();
const clothMap = makeClothTexture();

export const materials = {
  darkSteel: new THREE.MeshStandardMaterial({
    color: 0x1e232d,
    metalness: 0.78,
    roughness: 0.36,

  }),
  obsidianPlate: new THREE.MeshStandardMaterial({
    color: 0x11151c,
    metalness: 0.82,
    roughness: 0.34,
  }),
  agedBronze: new THREE.MeshStandardMaterial({
    color: 0xb5873c,
    metalness: 0.84,
    roughness: 0.3,
    emissive: 0x221402,
    emissiveIntensity: 0.14,
  }),
  crimsonCloth: new THREE.MeshStandardMaterial({
    color: 0x9e121e,
    map: clothMap,
    roughness: 0.86,
    side: THREE.DoubleSide,
  }),
  leatherStrap: new THREE.MeshStandardMaterial({
    color: 0x2c170f,
    metalness: 0.12,
    roughness: 0.82,
  }),
  ashShaft: new THREE.MeshStandardMaterial({
    color: 0x261811,
    metalness: 0.08,
    roughness: 0.74,
  }),
  visorGlow: new THREE.MeshBasicMaterial({
    color: 0xffa822,
  }),
  bladeSteel: new THREE.MeshStandardMaterial({
    color: 0x455063,
    metalness: 0.9,
    roughness: 0.2,
  }),
  orbital: new THREE.MeshStandardMaterial({
    color: 0x9e141f,
    metalness: 0.48,
    roughness: 0.24,
    emissive: 0x650014,
    emissiveIntensity: 0.42,
  }),
};

export function addMesh(parent, geometry, material, position, rotation, castShadow = false) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  if (rotation) object.rotation.set(...rotation);
  object.castShadow = castShadow;
  object.receiveShadow = false;
  parent.add(object);
  return object;
}
