import * as THREE from 'three';
import { materials, addMesh } from './materials.js';

function createCurvedAspisGeometry(width, height, thickness, curveRadius) {
  const shape = new THREE.Shape();
  shape.moveTo(0, height * 0.5);
  shape.bezierCurveTo(width * 0.45, height * 0.48, width * 0.54, height * 0.16, width * 0.46, -height * 0.14);
  shape.bezierCurveTo(width * 0.36, -height * 0.38, width * 0.13, -height * 0.51, 0, -height * 0.55);
  shape.bezierCurveTo(-width * 0.13, -height * 0.51, -width * 0.36, -height * 0.38, -width * 0.46, -height * 0.14);
  shape.bezierCurveTo(-width * 0.54, height * 0.16, -width * 0.45, height * 0.48, 0, height * 0.5);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 24,
  });

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r2 = (x * x) / (curveRadius * curveRadius) + (y * y) / (curveRadius * curveRadius * 1.45);
    const domeZ = -r2 * 0.22;
    pos.setZ(i, z + domeZ);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createShieldRig(parent) {
  const shieldRig = new THREE.Group();
  shieldRig.position.set(0.04, 0.34, -0.30);
  shieldRig.rotation.set(0.14, Math.PI, 0.18);
  parent.add(shieldRig);

  addMesh(shieldRig, createCurvedAspisGeometry(0.80, 1.02, 0.028, 0.62), materials.agedBronze, [0, 0, 0]);
  addMesh(shieldRig, createCurvedAspisGeometry(0.70, 0.90, 0.032, 0.62), materials.obsidianPlate, [0, 0, 0.005]);

  // Omphalos et étoile de bronze en bas-relief sur la face extérieure (+Z)
  const starGroup = new THREE.Group();
  starGroup.position.set(0, 0.02, 0.038);
  shieldRig.add(starGroup);

  const boss = addMesh(
    starGroup,
    new THREE.SphereGeometry(0.082, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
    materials.agedBronze,
    [0, 0, 0],
    [Math.PI / 2, 0, 0]
  );
  boss.scale.set(1.0, 0.42, 1.0);
  addMesh(starGroup, new THREE.TorusGeometry(0.084, 0.009, 8, 24), materials.agedBronze, [0, 0, 0.002]);
  addMesh(starGroup, new THREE.BoxGeometry(0.038, 0.36, 0.014), materials.agedBronze, [0, 0, -0.006], [0, 0, 0]);
  addMesh(starGroup, new THREE.BoxGeometry(0.30, 0.034, 0.014), materials.agedBronze, [0, 0, -0.010], [0, 0, 0]);

  // Face intérieure (-Z) pour bras GAUCHE (+X) :
  // 1. Porpax (brassard bronze au niveau du coude gauche à x = +0.14)
  const porpax = addMesh(
    shieldRig,
    new THREE.TorusGeometry(0.072, 0.013, 8, 20, Math.PI * 1.15),
    materials.agedBronze,
    [0.14, -0.01, -0.016],
    [0, Math.PI, -0.12]
  );
  porpax.scale.set(1.15, 0.85, 1.2);

  // 2. Antilabe (poignée verticale en cuir côté médial à x = -0.16, fixée directement sur la coque interne)
  addMesh(
    shieldRig,
    new THREE.CylinderGeometry(0.014, 0.014, 0.16, 10),
    materials.leatherStrap,
    [-0.16, -0.02, -0.036]
  );
  addMesh(
    shieldRig,
    new THREE.BoxGeometry(0.024, 0.022, 0.034),
    materials.agedBronze,
    [-0.16, 0.055, -0.022]
  );
  addMesh(
    shieldRig,
    new THREE.BoxGeometry(0.024, 0.022, 0.034),
    materials.agedBronze,
    [-0.16, -0.095, -0.022]
  );

  return shieldRig;
}

export function createSpearRig(parent) {
  const spearRig = new THREE.Group();
  spearRig.position.set(-0.28, 0.14, 0.02);
  parent.add(spearRig);

  addMesh(spearRig, new THREE.ConeGeometry(0.036, 0.2, 6), materials.agedBronze, [0, 0, -1.02], [-Math.PI / 2, 0, 0]);
  addMesh(spearRig, new THREE.CylinderGeometry(0.031, 0.031, 0.045, 12), materials.agedBronze, [0, 0, -0.91], [Math.PI / 2, 0, 0]);
  addMesh(spearRig, new THREE.CylinderGeometry(0.024, 0.028, 2.04, 14), materials.ashShaft, [0, 0, 0.08], [Math.PI / 2, 0, 0]);

  // Poignée arrière (z = 0.00, main droite)
  addMesh(spearRig, new THREE.CylinderGeometry(0.031, 0.031, 0.30, 14), materials.leatherStrap, [0, 0, 0.0], [Math.PI / 2, 0, 0]);
  addMesh(spearRig, new THREE.TorusGeometry(0.032, 0.007, 8, 18), materials.agedBronze, [0, 0, -0.15]);
  addMesh(spearRig, new THREE.TorusGeometry(0.032, 0.007, 8, 18), materials.agedBronze, [0, 0, 0.15]);

  // Poignée avant de guide (z = 0.60, main gauche)
  addMesh(spearRig, new THREE.CylinderGeometry(0.03, 0.03, 0.28, 14), materials.leatherStrap, [0, 0, 0.60], [Math.PI / 2, 0, 0]);

  // Douille et fer de lance
  addMesh(spearRig, new THREE.CylinderGeometry(0.024, 0.035, 0.16, 12), materials.agedBronze, [0, 0, 1.14], [Math.PI / 2, 0, 0]);
  const spearHead = addMesh(
    spearRig,
    new THREE.ConeGeometry(0.082, 0.44, 4),
    materials.bladeSteel,
    [0, 0, 1.44],
    [Math.PI / 2, Math.PI / 4, 0]
  );
  spearHead.scale.set(1, 1, 0.34);
  addMesh(spearRig, new THREE.BoxGeometry(0.018, 0.022, 0.34), materials.agedBronze, [0, 0, 1.37]);

  const spearTip = new THREE.Object3D();
  spearTip.position.set(0, 0, 1.66);
  spearRig.add(spearTip);

  return { spearRig, spearTip };
}

export function createOrbitalShield(scene) {
  const orbitalGroup = new THREE.Group();
  const orbShieldMesh = addMesh(
    orbitalGroup,
    new THREE.IcosahedronGeometry(0.27, 1),
    materials.orbital,
    [1.55, 0.9, 0]
  );
  const orbitalRing = addMesh(
    orbitalGroup,
    new THREE.TorusGeometry(0.38, 0.025, 8, 32),
    materials.agedBronze,
    [1.55, 0.9, 0]
  );
  orbitalRing.rotation.x = Math.PI / 2;
  orbitalGroup.visible = false;
  scene.add(orbitalGroup);

  return { orbitalGroup, orbShieldMesh };
}
