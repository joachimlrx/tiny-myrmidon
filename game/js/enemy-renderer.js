import * as THREE from 'three';

const armorMat = new THREE.MeshStandardMaterial({ color: 0x242226, metalness: 0.82, roughness: 0.32 });
const cloakMat = new THREE.MeshStandardMaterial({ color: 0x78121a, roughness: 0.80 });
const bronzeTrimMat = new THREE.MeshStandardMaterial({ color: 0xba883b, metalness: 0.84, roughness: 0.28 });
const bladeMat = new THREE.MeshStandardMaterial({ color: 0x9fb0c2, metalness: 0.90, roughness: 0.20 });
const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff481e });
const hpBgMat = new THREE.MeshBasicMaterial({ color: 0x111115, transparent: true, opacity: 0.78 });
const hpFillMat = new THREE.MeshBasicMaterial({ color: 0xd9383a });

const torsoGeo = new THREE.BoxGeometry(0.46, 0.56, 0.28);
const headGeo = new THREE.SphereGeometry(0.17, 10, 10);
const helmCrestGeo = new THREE.BoxGeometry(0.06, 0.18, 0.34);
const limbGeo = new THREE.BoxGeometry(0.13, 0.46, 0.13);
const swordGeo = new THREE.BoxGeometry(0.05, 0.68, 0.11);
const eyeGeo = new THREE.BoxGeometry(0.18, 0.04, 0.04);
const hpBarBgGeo = new THREE.PlaneGeometry(0.84, 0.09);
const hpBarFillGeo = new THREE.PlaneGeometry(0.80, 0.055);

function createEnemyShadowTex() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  g.addColorStop(0.0, 'rgba(12, 10, 8, 0.48)');
  g.addColorStop(0.6, 'rgba(12, 10, 8, 0.20)');
  g.addColorStop(1.0, 'rgba(12, 10, 8, 0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const enemyShadowMat = new THREE.MeshBasicMaterial({
  map: createEnemyShadowTex(),
  transparent: true,
  depthWrite: false,
});
const enemyShadowGeo = new THREE.PlaneGeometry(1.25, 1.25);

function buildEnemySoldier() {
  const root = new THREE.Group();

  const contactShadow = new THREE.Mesh(enemyShadowGeo, enemyShadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.014;
  root.add(contactShadow);

  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const torso = new THREE.Mesh(torsoGeo, armorMat);
  torso.position.y = 0.82;
  torso.castShadow = true;
  bodyPivot.add(torso);

  const cape = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.06), cloakMat);
  cape.position.set(0, 0.78, -0.16);
  cape.rotation.x = 0.16;
  bodyPivot.add(cape);

  const head = new THREE.Mesh(headGeo, bronzeTrimMat);
  head.position.y = 1.24;
  head.castShadow = true;
  bodyPivot.add(head);

  const crest = new THREE.Mesh(helmCrestGeo, cloakMat);
  crest.position.set(0, 1.38, -0.02);
  bodyPivot.add(crest);

  const visor = new THREE.Mesh(eyeGeo, eyeMat);
  visor.position.set(0, 1.24, 0.15);
  bodyPivot.add(visor);

  const leftLeg = new THREE.Mesh(limbGeo, armorMat);
  leftLeg.position.set(-0.14, 0.32, 0);
  bodyPivot.add(leftLeg);

  const rightLeg = new THREE.Mesh(limbGeo, armorMat);
  rightLeg.position.set(0.14, 0.32, 0);
  bodyPivot.add(rightLeg);

  const weaponArm = new THREE.Group();
  weaponArm.position.set(0.32, 1.02, 0.05);
  bodyPivot.add(weaponArm);

  const armMesh = new THREE.Mesh(limbGeo, armorMat);
  armMesh.position.y = -0.18;
  weaponArm.add(armMesh);

  const blade = new THREE.Mesh(swordGeo, bladeMat);
  blade.position.set(0, -0.34, 0.28);
  blade.rotation.x = Math.PI * 0.45;
  weaponArm.add(blade);

  // Barre de vie diégétique (invisible tant que l'ennemi est à 100 % HP)
  const hpGroup = new THREE.Group();
  hpGroup.position.y = 1.66;
  hpGroup.visible = false;
  root.add(hpGroup);

  const hpBg = new THREE.Mesh(hpBarBgGeo, hpBgMat);
  hpGroup.add(hpBg);

  const hpFill = new THREE.Mesh(hpBarFillGeo, hpFillMat);
  hpFill.position.z = 0.005;
  hpGroup.add(hpFill);

  root.userData = {
    bodyPivot,
    leftLeg,
    rightLeg,
    weaponArm,
    hpGroup,
    hpFill,
    walkPhase: Math.random() * Math.PI * 2,
  };
  normalizeEnemyStature(root, 2.14);

  return root;
}

function normalizeEnemyStature(root, targetHeight = 2.14) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const height = box.max.y - box.min.y;
  if (height > 0.1) {
    const scaleFactor = targetHeight / height;
    for (const child of root.children) {
      if (child.geometry && child.geometry.type === 'PlaneGeometry') continue;
      child.scale.multiplyScalar(scaleFactor);
      child.position.y = (child.position.y - box.min.y) * scaleFactor;
    }
  }
}

export function createEnemyRenderer(scene) {
  const meshes = new Map();

  function sync(enemies, camera, dt) {
    const activeIds = new Set();

    for (const en of enemies) {
      activeIds.add(en.id);
      let mesh = meshes.get(en.id);
      if (!mesh) {
        mesh = buildEnemySoldier();
        mesh.position.set(en.x, 0, en.z);
        scene.add(mesh);
        meshes.set(en.id, mesh);
      }

      const rig = mesh.userData;

      // Interpolation fluide des positions reçues du Worker
      mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, en.x, 1 - Math.exp(-22 * dt));
      mesh.position.z = THREE.MathUtils.lerp(mesh.position.z, en.z, 1 - Math.exp(-22 * dt));

      const angleDiff = Math.atan2(
        Math.sin(en.rotY - mesh.rotation.y),
        Math.cos(en.rotY - mesh.rotation.y)
      );
      mesh.rotation.y += angleDiff * (1 - Math.exp(-16 * dt));

      if (en.dying) {
        // Animation de chute au sol
        rig.bodyPivot.rotation.x = THREE.MathUtils.lerp(rig.bodyPivot.rotation.x, -Math.PI * 0.48, 1 - Math.exp(-12 * dt));
        rig.bodyPivot.position.y = THREE.MathUtils.lerp(rig.bodyPivot.position.y, -0.35, 1 - Math.exp(-10 * dt));
        rig.hpGroup.visible = false;
        continue;
      }

      // Animation de course ou de télégraphie d'attaque
      if (en.windup > 0) {
        // L'ennemi lève son arme avant de frapper (télégraphie claire pour le joueur)
        rig.weaponArm.rotation.x = THREE.MathUtils.lerp(rig.weaponArm.rotation.x, -2.1, 1 - Math.exp(-18 * dt));
        rig.bodyPivot.rotation.x = -0.15;
      } else {
        rig.weaponArm.rotation.x = THREE.MathUtils.lerp(rig.weaponArm.rotation.x, -0.35, 1 - Math.exp(-12 * dt));
        rig.bodyPivot.rotation.x = en.stun > 0 ? -0.28 : 0.08;
      }

      if (en.moving && en.stun <= 0) {
        rig.walkPhase += dt * 11;
        const swing = Math.sin(rig.walkPhase) * 0.65;
        rig.leftLeg.rotation.x = swing;
        rig.rightLeg.rotation.x = -swing;
        rig.bodyPivot.position.y = Math.abs(Math.cos(rig.walkPhase)) * 0.05;
      } else {
        rig.leftLeg.rotation.x = THREE.MathUtils.lerp(rig.leftLeg.rotation.x, 0, 10 * dt);
        rig.rightLeg.rotation.x = THREE.MathUtils.lerp(rig.rightLeg.rotation.x, 0, 10 * dt);
        rig.bodyPivot.position.y = 0;
      }

      // Mise à jour de la barre de vie diégétique
      if (en.hp < en.maxHp) {
        rig.hpGroup.visible = true;
        rig.hpGroup.quaternion.copy(camera.quaternion);
        const ratio = Math.max(0.01, en.hp / en.maxHp);
        rig.hpFill.scale.x = ratio;
        rig.hpFill.position.x = -(1 - ratio) * 0.4;
      } else {
        rig.hpGroup.visible = false;
      }
    }

    for (const [id, mesh] of meshes.entries()) {
      if (!activeIds.has(id)) {
        scene.remove(mesh);
        meshes.delete(id);
      }
    }
  }

  return { sync };
}
