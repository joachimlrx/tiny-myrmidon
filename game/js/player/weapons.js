import * as THREE from 'three';
import { materials, addMesh } from './materials.js';

function createCurvedAspisGeometry(width, height, thickness, curveRadius) {
  const shape = new THREE.Shape();
  shape.moveTo(0, height * 0.5);
  shape.bezierCurveTo(width * 0.46, height * 0.48, width * 0.54, height * 0.16, width * 0.46, -height * 0.14);
  shape.bezierCurveTo(width * 0.36, -height * 0.38, width * 0.13, -height * 0.51, 0, -height * 0.55);
  shape.bezierCurveTo(-width * 0.13, -height * 0.51, -width * 0.36, -height * 0.38, -width * 0.46, -height * 0.14);
  shape.bezierCurveTo(-width * 0.54, height * 0.16, -width * 0.46, height * 0.48, 0, height * 0.5);

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

  // Bordure biseautée en bronze antique étincelant (comme sur l'image)
  addMesh(shieldRig, createCurvedAspisGeometry(0.82, 1.06, 0.032, 0.62), materials.agedBronze, [0, 0, 0]);
  // Cœur de l'écu en obsidienne noire profonde
  addMesh(shieldRig, createCurvedAspisGeometry(0.72, 0.94, 0.036, 0.62), materials.obsidianPlate, [0, 0, 0.006]);

  // Emblème héroïque : étoile spartiate à 4 pointes incurvées en relief doré (identique à l'image)
  const starGroup = new THREE.Group();
  starGroup.position.set(0, 0.02, 0.044);
  shieldRig.add(starGroup);

  // Omphalos / Dôme central
  const boss = addMesh(
    starGroup,
    new THREE.SphereGeometry(0.088, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
    materials.agedBronze,
    [0, 0, 0],
    [Math.PI / 2, 0, 0]
  );
  boss.scale.set(1.0, 0.44, 1.0);
  addMesh(starGroup, new THREE.TorusGeometry(0.090, 0.010, 8, 24), materials.agedBronze, [0, 0, 0.002]);

  // Branches courbées de l'étoile spartiate
  addMesh(starGroup, new THREE.BoxGeometry(0.042, 0.48, 0.016), materials.agedBronze, [0, 0, -0.004]);
  addMesh(starGroup, new THREE.BoxGeometry(0.40, 0.040, 0.016), materials.agedBronze, [0, 0, -0.008]);

  // Pointes effilées biseautées
  for (let rot = 0; rot < 4; rot += 1) {
    const tip = addMesh(
      starGroup,
      new THREE.ConeGeometry(0.044, 0.18, 4),
      materials.agedBronze,
      [0, 0.28, -0.006],
      [0, 0, 0]
    );
    tip.rotation.z = (rot * Math.PI) / 2;
    tip.position.set(Math.cos(rot * Math.PI / 2) * 0.20, Math.sin(rot * Math.PI / 2) * 0.20, -0.006);
  }

  // Porpax (brassard) et Antilabe (poignée) sur la face intérieure
  const porpax = addMesh(
    shieldRig,
    new THREE.TorusGeometry(0.074, 0.013, 8, 20, Math.PI * 1.15),
    materials.agedBronze,
    [0.14, -0.01, -0.016],
    [0, Math.PI, -0.12]
  );
  porpax.scale.set(1.15, 0.85, 1.2);

  addMesh(shieldRig, new THREE.CylinderGeometry(0.014, 0.014, 0.16, 10), materials.leatherStrap, [-0.16, -0.02, -0.036]);
  addMesh(shieldRig, new THREE.BoxGeometry(0.024, 0.022, 0.034), materials.agedBronze, [-0.16, 0.055, -0.022]);
  addMesh(shieldRig, new THREE.BoxGeometry(0.024, 0.022, 0.034), materials.agedBronze, [-0.16, -0.095, -0.022]);

  return shieldRig;
}

export function createSpearRig(parent) {
  const spearRig = new THREE.Group();
  spearRig.position.set(-0.28, 0.14, 0.02);
  parent.add(spearRig);

  // Talon de lance et contre-poids en bronze (sauroter)
  addMesh(spearRig, new THREE.ConeGeometry(0.038, 0.22, 6), materials.agedBronze, [0, 0, -1.05], [-Math.PI / 2, 0, 0]);
  addMesh(spearRig, new THREE.CylinderGeometry(0.032, 0.032, 0.05, 12), materials.agedBronze, [0, 0, -0.92], [Math.PI / 2, 0, 0]);

  // Fût de frêne sombre cerclé de cuir et de bronze
  addMesh(spearRig, new THREE.CylinderGeometry(0.024, 0.028, 2.06, 14), materials.ashShaft, [0, 0, 0.08], [Math.PI / 2, 0, 0]);

  // Poignée principale en cuir tressé (z = 0.00, main droite)
  addMesh(spearRig, new THREE.CylinderGeometry(0.032, 0.032, 0.32, 14), materials.leatherStrap, [0, 0, 0.0], [Math.PI / 2, 0, 0]);
  addMesh(spearRig, new THREE.TorusGeometry(0.033, 0.007, 8, 18), materials.agedBronze, [0, 0, -0.16]);
  addMesh(spearRig, new THREE.TorusGeometry(0.033, 0.007, 8, 18), materials.agedBronze, [0, 0, 0.16]);

  // Poignée avant de guidage (z = 0.60, main gauche)
  addMesh(spearRig, new THREE.CylinderGeometry(0.031, 0.031, 0.28, 14), materials.leatherStrap, [0, 0, 0.60], [Math.PI / 2, 0, 0]);

  // Grande lame d'estoc et de taille (Xiphos Spearhead) à double tranchant
  addMesh(spearRig, new THREE.CylinderGeometry(0.025, 0.036, 0.18, 12), materials.agedBronze, [0, 0, 1.15], [Math.PI / 2, 0, 0]);

  // Garde transversale en bronze sculpté
  addMesh(spearRig, new THREE.BoxGeometry(0.18, 0.032, 0.042), materials.agedBronze, [0, 0, 1.20]);
  addMesh(spearRig, new THREE.SphereGeometry(0.022, 10, 8), materials.agedBronze, [-0.09, 0, 1.20]);
  addMesh(spearRig, new THREE.SphereGeometry(0.022, 10, 8), materials.agedBronze, [0.09, 0, 1.20]);

  // Lame en acier trempé biseauté à deux tranchants étincelante
  const blade = addMesh(
    spearRig,
    new THREE.ConeGeometry(0.096, 0.54, 4),
    materials.bladeSteel,
    [0, 0, 1.50],
    [Math.PI / 2, Math.PI / 4, 0]
  );
  blade.scale.set(1.0, 1.0, 0.32);

  // Nervure centrale dorée
  addMesh(spearRig, new THREE.BoxGeometry(0.016, 0.024, 0.42), materials.agedBronze, [0, 0, 1.42]);

  const spearTip = new THREE.Object3D();
  spearTip.position.set(0, 0, 1.76);
  spearRig.add(spearTip);

  return { spearRig, spearTip };
}

export function createOrbitalShield(scene) {
  const orbitalGroup = new THREE.Group();
  const orbShieldMesh = addMesh(
    orbitalGroup,
    new THREE.IcosahedronGeometry(0.28, 1),
    materials.orbital,
    [1.55, 0.9, 0]
  );
  const orbitalRing = addMesh(
    orbitalGroup,
    new THREE.TorusGeometry(0.40, 0.026, 8, 32),
    materials.agedBronze,
    [1.55, 0.9, 0]
  );
  orbitalRing.rotation.x = Math.PI / 2;
  orbitalGroup.visible = false;
  scene.add(orbitalGroup);

  return { orbitalGroup, orbShieldMesh };
}
