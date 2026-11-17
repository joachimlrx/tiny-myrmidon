import * as THREE from 'three';
import { scene } from './scene.js';

export const player = new THREE.Group();

const tunic = new THREE.Mesh(
  new THREE.CylinderGeometry(0.38, 0.45, 0.95, 12),
  new THREE.MeshStandardMaterial({ color: 0xb91c1c })
);
tunic.position.y = 0.48;

const helm = new THREE.Mesh(
  new THREE.SphereGeometry(0.36, 12, 12),
  new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.6, roughness: 0.3 })
);
helm.position.y = 1.15;

const crest = new THREE.Mesh(
  new THREE.BoxGeometry(0.12, 0.32, 0.55),
  new THREE.MeshStandardMaterial({ color: 0xdc2626 })
);
crest.position.y = 1.48;

const shield = new THREE.Mesh(
  new THREE.CylinderGeometry(0.45, 0.45, 0.1, 16),
  new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.5 })
);
shield.rotation.z = Math.PI / 2;
shield.position.set(-0.48, 0.65, 0.15);

player.add(tunic, helm, crest, shield);
scene.add(player);

export const orbitalGroup = new THREE.Group();
export const orbShieldMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(0.4, 0.4, 0.08, 16),
  new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, metalness: 0.7 })
);
orbShieldMesh.rotation.x = Math.PI / 2;
orbShieldMesh.position.set(1.6, 0.7, 0);
orbitalGroup.add(orbShieldMesh);
orbitalGroup.visible = false;
scene.add(orbitalGroup);
