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
  ctx.fillStyle = '#9e1422';
  ctx.fillRect(0, 0, size, size);

  for (let x = 0; x < size; x += 2) {
    const fold = Math.sin((x / size) * Math.PI * 8) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(18,2,4,${(1 - fold) * 0.28})`;
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
    color: 0x222026,
    metalness: 0.86,
    roughness: 0.28,
    bumpMap: metalMaps.bumpMap,
    bumpScale: 0.008,
  }),
  obsidianPlate: new THREE.MeshStandardMaterial({
    color: 0x151419,
    metalness: 0.90,
    roughness: 0.30,
  }),
  agedBronze: new THREE.MeshStandardMaterial({
    color: 0xc4943f,
    metalness: 0.88,
    roughness: 0.24,
    emissive: 0x301804,
    emissiveIntensity: 0.16,
  }),
  crimsonCloth: new THREE.MeshStandardMaterial({
    color: 0xaa1320,
    map: clothMap,
    roughness: 0.82,
    side: THREE.DoubleSide,
  }),
  leatherStrap: new THREE.MeshStandardMaterial({
    color: 0x321a11,
    metalness: 0.14,
    roughness: 0.78,
  }),
  ashShaft: new THREE.MeshStandardMaterial({
    color: 0x281912,
    metalness: 0.08,
    roughness: 0.72,
  }),
  visorGlow: new THREE.MeshBasicMaterial({
    color: 0xffb834,
  }),
  bladeSteel: new THREE.MeshStandardMaterial({
    color: 0xa4b0be,
    metalness: 0.94,
    roughness: 0.18,
  }),
  orbital: new THREE.MeshStandardMaterial({
    color: 0xaa1422,
    metalness: 0.52,
    roughness: 0.22,
    emissive: 0x6e0018,
    emissiveIntensity: 0.44,
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
