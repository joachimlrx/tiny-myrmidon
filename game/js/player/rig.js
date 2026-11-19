import * as THREE from 'three';
import { materials, addMesh } from './materials.js';
import { createShieldRig, createSpearRig } from './weapons.js';

function createSoftShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0.0, 'rgba(14, 11, 8, 0.50)');
  grad.addColorStop(0.55, 'rgba(14, 11, 8, 0.22)');
  grad.addColorStop(1.0, 'rgba(14, 11, 8, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const softShadowTex = createSoftShadowTexture();

function createBronzeMedallion(parent, radius, position, rotation) {
  const group = new THREE.Group();
  group.position.set(...position);
  if (rotation) group.rotation.set(...rotation);
  parent.add(group);

  addMesh(group, new THREE.CylinderGeometry(radius, radius, 0.022, 24), materials.agedBronze, [0, 0, 0], [Math.PI / 2, 0, 0]);
  addMesh(group, new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, 0.026, 20), materials.obsidianPlate, [0, 0, 0], [Math.PI / 2, 0, 0]);
  addMesh(group, new THREE.BoxGeometry(radius * 1.42, radius * 0.2, 0.03), materials.agedBronze, [0, 0, 0]);
  addMesh(group, new THREE.BoxGeometry(radius * 0.2, radius * 1.42, 0.03), materials.agedBronze, [0, 0, 0]);
  addMesh(group, new THREE.SphereGeometry(radius * 0.2, 12, 10), materials.agedBronze, [0, 0, 0.012]);
  return group;
}

function createCuirassGeometry() {
  const rings = [
    [-0.02, 0.235, 0.155],
    [0.09, 0.25, 0.168],
    [0.21, 0.28, 0.185],
    [0.33, 0.325, 0.205],
    [0.45, 0.375, 0.215],
    [0.56, 0.39, 0.195],
    [0.65, 0.32, 0.16],
    [0.71, 0.24, 0.135],
  ];
  const segments = 48;
  const positions = [];
  const indices = [];
  rings.forEach(([y, width, depth], row) => {
    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2;
      const front = Math.max(0, Math.sin(angle));
      const back = Math.max(0, -Math.sin(angle));
      const pecs = Math.exp(-Math.pow((y - 0.46) / 0.15, 2)) * Math.pow(front, 2.2);
      const lats = Math.exp(-Math.pow((y - 0.44) / 0.18, 2)) * Math.pow(back, 1.8);
      positions.push(
        Math.cos(angle) * width,
        y,
        Math.sin(angle) * (depth + pecs * 0.045 + lats * 0.02) + 0.012
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

function createCapeGeometry() {
  const widthTop = 0.58;
  const widthBottom = 1.28;
  const length = 1.34;
  const geo = new THREE.PlaneGeometry(widthTop, length, 12, 16);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // Évasement en trapèze vers le bas (proportions dorées)
    const factor = (length * 0.5 - y) / length;
    const flare = THREE.MathUtils.lerp(1.0, widthBottom / widthTop, factor);
    pos.setX(i, x * flare);

    // Découpes triangulaires héroïques sur l'ourlet inférieur (comme sur l'image)
    if (y < -length * 0.44) {
      const tooth = Math.sin(x * 18) * 0.045;
      pos.setY(i, y + tooth);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

function createShoulderMantle(torso) {
  const mantle = new THREE.Group();
  mantle.position.set(0, 0.62, 0);
  torso.add(mantle);

  // Col épais / Écharpe cramoisie cowl drapée autour du cou
  const collar = addMesh(
    mantle,
    new THREE.TorusGeometry(0.26, 0.068, 16, 44),
    materials.crimsonCloth,
    [0, 0.02, 0.015],
    [Math.PI * 0.48, 0, 0]
  );
  collar.scale.set(1.22, 0.94, 0.92);

  // Plis secondaires de l'étoffe drapée sur les clavicules
  const cowlFold = addMesh(
    mantle,
    new THREE.TorusGeometry(0.23, 0.045, 12, 36),
    materials.crimsonCloth,
    [0, -0.025, 0.048],
    [Math.PI * 0.52, 0, 0]
  );
  cowlFold.scale.set(1.15, 0.88, 0.95);

  // Grande cape dorsale héroïque découpée au bas (comme sur l'image)
  const capeGeo = createCapeGeometry();
  const capePivot = new THREE.Group();
  capePivot.position.set(0, 0.02, -0.16);
  capePivot.rotation.set(0.14, Math.PI, 0);
  mantle.add(capePivot);

  const backDrape = addMesh(capePivot, capeGeo, materials.crimsonCloth, [0, -0.62, 0], [0, 0, 0]);

  // Baudrier en cuir clouté de bronze
  const baldric = addMesh(
    torso,
    new THREE.TorusGeometry(0.268, 0.016, 8, 36),
    materials.leatherStrap,
    [0, 0.35, 0.012],
    [Math.PI * 0.48, -0.52, -0.1]
  );
  baldric.scale.set(1.12, 0.84, 1.0);
  addMesh(torso, new THREE.BoxGeometry(0.048, 0.054, 0.022), materials.agedBronze, [-0.05, 0.36, 0.232], [-0.08, -0.14, 0.52]);

  // Deux grands médaillons solaires en bronze aux épaules maintenant la cape (comme sur l'image)
  for (const side of [-1, 1]) {
    createBronzeMedallion(torso, 0.076, [side * 0.258, 0.59, 0.218], [-0.14, side * 0.36, 0]);
  }

  return { mantle, backDrape, capePivot, capeGeo };
}

export function buildPlayerRig(player) {
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.65, 1.65),
    new THREE.MeshBasicMaterial({
      map: softShadowTex,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.008;
  player.add(shadow);

  const pelvis = new THREE.Group();
  pelvis.position.y = 0.90;
  player.add(pelvis);

  const torso = new THREE.Group();
  torso.position.y = 0.06;
  pelvis.add(torso);

  const tunic = addMesh(torso, new THREE.CapsuleGeometry(0.255, 0.54, 8, 24), materials.obsidianPlate, [0, 0.24, -0.015]);
  tunic.scale.set(1.04, 1.05, 0.82);

  addMesh(torso, createCuirassGeometry(), materials.darkSteel, [0, -0.02, 0]);
  addMesh(torso, new THREE.BoxGeometry(0.022, 0.56, 0.026), materials.agedBronze, [0, 0.32, 0.235]);

  for (const side of [-1, 1]) {
    addMesh(torso, new THREE.BoxGeometry(0.24, 0.022, 0.022), materials.agedBronze, [side * 0.12, 0.44, 0.222], [0, 0, side * 0.34]);
    addMesh(torso, new THREE.BoxGeometry(0.20, 0.018, 0.02), materials.agedBronze, [side * 0.10, 0.22, 0.198], [0, 0, side * 0.28]);
    addMesh(torso, new THREE.BoxGeometry(0.21, 0.26, 0.028), materials.obsidianPlate, [side * 0.135, 0.42, -0.188], [-0.12, side * 0.2, side * -0.12]);
  }

  const { mantle, backDrape, capePivot, capeGeo } = createShoulderMantle(torso);

  // Ceinturon et tassettes articulées
  addMesh(pelvis, new THREE.CylinderGeometry(0.265, 0.285, 0.11, 32), materials.leatherStrap, [0, 0.02, 0.01]);
  addMesh(pelvis, new THREE.TorusGeometry(0.268, 0.016, 8, 32), materials.agedBronze, [0, 0.07, 0.01], [Math.PI / 2, 0, 0]);
  addMesh(pelvis, new THREE.TorusGeometry(0.282, 0.016, 8, 32), materials.agedBronze, [0, -0.03, 0.01], [Math.PI / 2, 0, 0]);
  createBronzeMedallion(pelvis, 0.086, [0, 0.02, 0.288], [0, 0, 0]);

  const frontTabard = addMesh(pelvis, new THREE.BoxGeometry(0.28, 0.44, 0.024), materials.crimsonCloth, [0, -0.24, 0.245], [-0.08, 0, 0]);
  addMesh(frontTabard, new THREE.BoxGeometry(0.29, 0.024, 0.03), materials.agedBronze, [0, -0.21, 0]);
  const backTabard = addMesh(pelvis, new THREE.BoxGeometry(0.3, 0.46, 0.024), materials.crimsonCloth, [0, -0.25, -0.235], [0.1, 0, 0]);
  addMesh(backTabard, new THREE.BoxGeometry(0.31, 0.024, 0.03), materials.agedBronze, [0, -0.22, 0]);

  const tassets = [];
  for (const side of [-1, 1]) {
    const tassetPivot = new THREE.Group();
    tassetPivot.position.set(side * 0.22, -0.02, 0.08);
    pelvis.add(tassetPivot);

    for (let tier = 0; tier < 2; tier += 1) {
      const plate = addMesh(
        tassetPivot,
        new THREE.BoxGeometry(0.21, 0.24, 0.042),
        materials.darkSteel,
        [side * (0.02 + tier * 0.025), -0.12 - tier * 0.14, 0.05 - tier * 0.03],
        [0.14, side * 0.36, side * (0.18 + tier * 0.08)]
      );
      addMesh(plate, new THREE.BoxGeometry(0.215, 0.022, 0.048), materials.agedBronze, [0, -0.11, 0]);
      addMesh(plate, new THREE.BoxGeometry(0.022, 0.24, 0.048), materials.agedBronze, [side * 0.095, 0, 0]);
    }
    tassets.push({ pivot: tassetPivot, side });
  }

  // Tête & Heaume Corinthien
  const head = new THREE.Group();
  head.position.set(0, 0.84, 0.018);
  torso.add(head);

  addMesh(head, new THREE.CylinderGeometry(0.145, 0.175, 0.14, 20), materials.obsidianPlate, [0, -0.12, -0.005]);
  addMesh(head, new THREE.SphereGeometry(0.205, 24, 18), materials.obsidianPlate, [0, 0.02, 0.015]);

  const helmDome = addMesh(
    head,
    new THREE.SphereGeometry(0.265, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.78),
    materials.darkSteel,
    [0, 0.09, -0.01]
  );
  helmDome.scale.set(0.96, 1.14, 1.05);

  addMesh(head, new THREE.BoxGeometry(0.042, 0.24, 0.075), materials.darkSteel, [0, -0.02, 0.248]);
  addMesh(head, new THREE.BoxGeometry(0.016, 0.25, 0.082), materials.agedBronze, [0, -0.01, 0.252]);

  for (const side of [-1, 1]) {
    addMesh(head, new THREE.BoxGeometry(0.16, 0.046, 0.075), materials.darkSteel, [side * 0.088, 0.06, 0.232], [0.08, side * 0.26, side * -0.25]);
    addMesh(head, new THREE.BoxGeometry(0.14, 0.014, 0.08), materials.agedBronze, [side * 0.088, 0.038, 0.236], [0.08, side * 0.26, side * -0.25]);
    addMesh(head, new THREE.BoxGeometry(0.118, 0.02, 0.028), materials.visorGlow, [side * 0.08, 0.018, 0.238], [0, side * 0.26, side * -0.25]);

    const cheek = addMesh(head, new THREE.BoxGeometry(0.13, 0.21, 0.135), materials.darkSteel, [side * 0.145, -0.09, 0.13], [0.08, side * 0.38, side * -0.12]);
    addMesh(cheek, new THREE.BoxGeometry(0.018, 0.21, 0.14), materials.agedBronze, [side * -0.06, 0, 0.005]);
  }

  const crest = new THREE.Group();
  crest.position.set(0, 0.35, -0.015);
  head.add(crest);
  addMesh(crest, new THREE.BoxGeometry(0.052, 0.11, 0.34), materials.agedBronze, [0, -0.035, 0], [-0.12, 0, 0]);
  for (let seg = 0; seg < 6; seg += 1) {
    const angle = -0.35 + seg * 0.14;
    const blade = addMesh(
      crest,
      new THREE.BoxGeometry(0.036, 0.175, 0.084),
      seg % 2 === 0 ? materials.darkSteel : materials.obsidianPlate,
      [0, 0.036 + Math.cos(angle) * 0.022, Math.sin(angle) * 0.20],
      [angle, 0, 0]
    );
    addMesh(blade, new THREE.BoxGeometry(0.04, 0.016, 0.086), materials.agedBronze, [0, 0.082, 0]);
  }

  // Bras articulés & Épaulières sur pivot scapulaire indépendant (ne vrillent jamais avec l'humérus)
  // side = -1 (-X) -> Bras DROIT (lance)
  // side = +1 (+X) -> Bras GAUCHE (bouclier / soutien avant)
  const arms = [];
  for (const side of [-1, 1]) {
    const baseShoulderPos = new THREE.Vector3(side * 0.40, 0.52, 0);

    // Pivot indépendant des épaulières lamellaires (attaché au torse, pas à la torsion de l'humérus)
    const pauldronPivot = new THREE.Group();
    pauldronPivot.position.set(side * 0.37, 0.55, 0);
    torso.add(pauldronPivot);

    for (let layer = 0; layer < 3; layer += 1) {
      const sc = 1 - layer * 0.13;
      const yOff = 0.02 - layer * 0.078;
      const xOff = side * (0.03 + layer * 0.032);
      const pauldron = addMesh(
        pauldronPivot,
        new THREE.SphereGeometry(0.22 * sc, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
        materials.darkSteel,
        [xOff, yOff, 0],
        [0, 0, side * (-0.28 - layer * 0.12)]
      );
      pauldron.scale.set(1.14, 0.84, 1.14);

      const rim = addMesh(
        pauldronPivot,
        new THREE.TorusGeometry(0.216 * sc, 0.014, 8, 24),
        materials.agedBronze,
        [xOff, yOff - 0.008, 0],
        [Math.PI / 2, side * (-0.28 - layer * 0.12), 0]
      );
      rim.scale.set(1.14, 1.14, 1);

      // Rivet et crête dorsale bronze discrète sur l'épaulière
      addMesh(
        pauldronPivot,
        new THREE.BoxGeometry(0.024, 0.028, 0.14 * sc),
        materials.agedBronze,
        [xOff + side * 0.06, yOff + 0.085, 0],
        [0, 0, side * -0.35]
      );
    }

    const shoulder = new THREE.Group();
    shoulder.position.copy(baseShoulderPos);
    torso.add(shoulder);

    // Deltoïde et haut de bras cuirassé
    addMesh(shoulder, new THREE.SphereGeometry(0.118, 16, 14), materials.obsidianPlate, [0, -0.02, 0]);
    addMesh(shoulder, new THREE.CapsuleGeometry(0.102, 0.25, 6, 12), materials.obsidianPlate, [0, -0.15, 0]);
    addMesh(shoulder, new THREE.CylinderGeometry(0.108, 0.098, 0.15, 14), materials.darkSteel, [0, -0.15, 0]);
    addMesh(shoulder, new THREE.TorusGeometry(0.102, 0.011, 8, 18), materials.agedBronze, [0, -0.22, 0], [Math.PI / 2, 0, 0]);

    const elbow = new THREE.Group();
    elbow.position.y = -0.31;
    shoulder.add(elbow);

    addMesh(elbow, new THREE.SphereGeometry(0.092, 14, 12), materials.darkSteel, [side * 0.015, 0, -0.015]);
    addMesh(elbow, new THREE.TorusGeometry(0.090, 0.011, 8, 18), materials.agedBronze, [side * 0.015, 0, -0.015], [0, Math.PI / 2, 0]);

    // Avant-bras cuirassé (brassard)
    addMesh(elbow, new THREE.CylinderGeometry(0.106, 0.088, 0.25, 14), materials.darkSteel, [0, -0.13, 0.01]);
    addMesh(elbow, new THREE.TorusGeometry(0.106, 0.013, 8, 20), materials.agedBronze, [0, -0.02, 0.01], [Math.PI / 2, 0, 0]);
    addMesh(elbow, new THREE.TorusGeometry(0.090, 0.013, 8, 20), materials.agedBronze, [0, -0.24, 0.01], [Math.PI / 2, 0, 0]);

    // GANTELET DE GUERRE ARTICULÉ :
    // Le creux du poing fermé (où passe l'axe Z de la hampe/poignée) est exactement à (0, -0.058, 0.004)
    const hand = new THREE.Group();
    hand.position.set(0, -0.28, 0.02);
    elbow.add(hand);

    // Manchette de poignet évasée en acier et bronze
    addMesh(hand, new THREE.CylinderGeometry(0.086, 0.104, 0.072, 16), materials.darkSteel, [0, 0.014, 0]);
    addMesh(hand, new THREE.TorusGeometry(0.102, 0.011, 8, 20), materials.agedBronze, [0, -0.02, 0], [Math.PI / 2, 0, 0]);

    // Paume en cuir entourant l'axe (0, -0.058, Z) + plaque dorsale blindée en bronze
    addMesh(hand, new THREE.BoxGeometry(0.076, 0.098, 0.116), materials.leatherStrap, [side * 0.026, -0.054, 0.004]);
    addMesh(hand, new THREE.BoxGeometry(0.032, 0.096, 0.120), materials.agedBronze, [side * 0.058, -0.050, 0.004]);
    addMesh(hand, new THREE.BoxGeometry(0.020, 0.082, 0.094), materials.darkSteel, [side * 0.068, -0.048, 0.004]);

    // Barre protège-phalanges en bronze
    addMesh(hand, new THREE.CylinderGeometry(0.016, 0.016, 0.122, 10), materials.agedBronze, [side * 0.052, -0.096, 0.004], [Math.PI / 2, 0, 0]);

    // 4 doigts articulés enserrant le cylindre de la hampe centré sur (0, -0.058, Z)
    for (let f = 0; f < 4; f += 1) {
      const zFinger = (1.5 - f) * 0.027;
      const fingerPivot = new THREE.Group();
      fingerPivot.position.set(side * 0.034, -0.098, zFinger);
      fingerPivot.rotation.z = -side * 1.15;
      hand.add(fingerPivot);

      addMesh(fingerPivot, new THREE.BoxGeometry(0.024, 0.044, 0.023), materials.darkSteel, [0, -0.021, 0]);
      addMesh(fingerPivot, new THREE.BoxGeometry(0.013, 0.042, 0.024), materials.agedBronze, [side * 0.009, -0.021, 0]);

      const tipPivot = new THREE.Group();
      tipPivot.position.set(0, -0.042, 0);
      tipPivot.rotation.z = -side * 1.15;
      fingerPivot.add(tipPivot);
      addMesh(tipPivot, new THREE.BoxGeometry(0.022, 0.040, 0.021), materials.agedBronze, [0, -0.019, 0]);
    }

    // Pouce opposé verrouillant la prise par-dessus la hampe à (0, -0.058, Z)
    const thumbPivot = new THREE.Group();
    thumbPivot.position.set(-side * 0.022, -0.028, 0.048);
    thumbPivot.rotation.set(0.24, 0, side * 0.45);
    hand.add(thumbPivot);
    addMesh(thumbPivot, new THREE.BoxGeometry(0.026, 0.044, 0.026), materials.darkSteel, [0, -0.020, 0]);
    addMesh(thumbPivot, new THREE.BoxGeometry(0.022, 0.038, 0.022), materials.agedBronze, [side * 0.010, -0.052, 0.006], [0.15, 0, -side * 0.55]);

    arms.push({ shoulder, elbow, hand, pauldronPivot, side, baseShoulderPos });
  }

  // Jambes articulées & bottes de guerre krepides (bas de semelle à y = -0.200)
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.185, -0.04, 0);
    pelvis.add(hip);

    addMesh(hip, new THREE.CapsuleGeometry(0.12, 0.26, 6, 14), materials.obsidianPlate, [0, -0.16, 0]);
    const cuisse = addMesh(hip, new THREE.BoxGeometry(0.175, 0.28, 0.19), materials.darkSteel, [side * 0.018, -0.15, 0.022], [0.04, 0, side * -0.06]);
    addMesh(cuisse, new THREE.BoxGeometry(0.18, 0.02, 0.195), materials.agedBronze, [0, -0.12, 0]);

    const knee = new THREE.Group();
    knee.position.y = -0.34;
    hip.add(knee);

    addMesh(knee, new THREE.ConeGeometry(0.115, 0.23, 5), materials.darkSteel, [0, 0.01, 0.088], [0.22, 0, 0]);
    addMesh(knee, new THREE.BoxGeometry(0.16, 0.028, 0.145), materials.agedBronze, [0, 0.04, 0.05]);
    addMesh(knee, new THREE.ConeGeometry(0.065, 0.14, 4), materials.darkSteel, [side * 0.1, 0.02, 0.02], [0, 0, side * -0.8]);

    addMesh(knee, new THREE.CylinderGeometry(0.104, 0.074, 0.35, 16), materials.darkSteel, [0, -0.175, 0.006]);
    addMesh(knee, new THREE.BoxGeometry(0.024, 0.33, 0.036), materials.agedBronze, [0, -0.175, 0.088]);
    addMesh(knee, new THREE.TorusGeometry(0.076, 0.012, 8, 22), materials.agedBronze, [0, -0.335, 0.006], [Math.PI / 2, 0, 0]);

    const foot = new THREE.Group();
    foot.position.set(0, -0.36, 0.01);
    knee.add(foot);

    addMesh(foot, new THREE.CylinderGeometry(0.073, 0.078, 0.12, 16), materials.obsidianPlate, [0, -0.05, -0.005]);
    addMesh(foot, new THREE.BoxGeometry(0.128, 0.115, 0.095), materials.darkSteel, [0, -0.115, -0.024]);
    addMesh(foot, new THREE.TorusGeometry(0.079, 0.011, 8, 20), materials.leatherStrap, [0, -0.045, 0.005], [Math.PI * 0.36, 0, 0]);
    addMesh(foot, new THREE.TorusGeometry(0.082, 0.011, 8, 20), materials.leatherStrap, [0, -0.095, 0.015], [Math.PI * 0.38, 0, 0]);

    addMesh(foot, new THREE.BoxGeometry(0.124, 0.072, 0.175), materials.obsidianPlate, [0, -0.132, 0.092], [0.26, 0, 0]);

    for (let p = 0; p < 3; p += 1) {
      const plateW = 0.128 - p * 0.006;
      const plateY = -0.098 - p * 0.018;
      const plateZ = 0.048 + p * 0.048;
      addMesh(foot, new THREE.BoxGeometry(plateW, 0.024, 0.056), materials.darkSteel, [0, plateY, plateZ], [0.32, 0, 0]);
      addMesh(foot, new THREE.BoxGeometry(plateW + 0.004, 0.009, 0.012), materials.agedBronze, [0, plateY + 0.006, plateZ + 0.024], [0.32, 0, 0]);
    }

    const toeBox = addMesh(foot, new THREE.SphereGeometry(0.064, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), materials.darkSteel, [0, -0.174, 0.195]);
    toeBox.scale.set(1.02, 0.72, 1.28);
    const toeRim = addMesh(foot, new THREE.TorusGeometry(0.063, 0.009, 8, 20, Math.PI), materials.agedBronze, [0, -0.172, 0.195], [Math.PI / 2, 0, 0]);
    toeRim.scale.set(1.03, 1.28, 1.0);

    addMesh(foot, new THREE.BoxGeometry(0.134, 0.022, 0.325), materials.leatherStrap, [0, -0.186, 0.105]);
    addMesh(foot, new THREE.BoxGeometry(0.138, 0.008, 0.328), materials.agedBronze, [0, -0.174, 0.105]);
    addMesh(foot, new THREE.BoxGeometry(0.132, 0.018, 0.095), materials.darkSteel, [0, -0.191, -0.01]);
    addMesh(foot, new THREE.BoxGeometry(0.132, 0.018, 0.155), materials.darkSteel, [0, -0.191, 0.188]);

    legs.push({ hip, knee, foot, side, baseFootY: foot.position.y });
  }

  const shieldRig = createShieldRig(torso);
  const { spearRig, spearTip } = createSpearRig(torso);

  return {
    pelvis,
    torso,
    head,
    crest,
    mantle,
    backDrape,
    capePivot,
    capeGeo,
    arms,
    legs,
    tassets,
    shieldRig,
    spearRig,
    spearTip,
    shadow,
    softShadowTex,
  };
}
