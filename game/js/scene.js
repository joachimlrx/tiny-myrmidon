import * as THREE from 'three';

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1c1917);

export const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 120);

export const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xfffbeb, 0.75));
const dirLight = new THREE.DirectionalLight(0xfde68a, 1.1);
dirLight.position.set(15, 25, 12);
scene.add(dirLight);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(30, 48),
  new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.85 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const grid = new THREE.GridHelper(56, 28, 0x78716c, 0x292524);
grid.position.y = 0.01;
scene.add(grid);

const columnCount = 16;
const peristyleRadius = 28;
const colBaseGeo = new THREE.CylinderGeometry(0.7, 0.8, 0.4, 12);
const colShaftGeo = new THREE.CylinderGeometry(0.5, 0.55, 4.2, 12);
const colCapGeo = new THREE.BoxGeometry(1.2, 0.4, 1.2);
const colMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.7 });

for (let i = 0; i < columnCount; i++) {
  const angle = (i / columnCount) * Math.PI * 2;
  const col = new THREE.Group();
  const base = new THREE.Mesh(colBaseGeo, colMat);
  base.position.y = 0.2;
  const shaft = new THREE.Mesh(colShaftGeo, colMat);
  shaft.position.y = 2.5;
  const cap = new THREE.Mesh(colCapGeo, colMat);
  cap.position.y = 4.8;
  col.add(base, shaft, cap);
  col.position.set(Math.cos(angle) * peristyleRadius, 0, Math.sin(angle) * peristyleRadius);
  scene.add(col);
}
