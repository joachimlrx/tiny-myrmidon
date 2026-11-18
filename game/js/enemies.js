import * as THREE from 'three';
import { SPAWN_DISTANCE, ENEMY_SPAWN_RADIUS, MAX_ENEMIES } from './config.js';
import { camera, arenaObstacles } from './scene.js';
import { triggerPlayerHit } from './player.js';
import { spawnImpactBurst } from './particles.js';

export const enemies = [];

const profiles = {
  trojan: {
    scale: 1,
    hp: level => 4 + Math.floor(level * 0.65),
    speed: level => 2.55 + Math.min(level * 0.04, 0.8),
    score: level => 95 + level * 4,
    xp: 2,
    radius: 0.62,
    damage: 9,
    shield: 2.2,
    barY: 2.45
  },
  harpy: {
    scale: 0.84,
    hp: level => 2 + Math.floor(level * 0.4),
    speed: level => 4.0 + Math.min(level * 0.05, 1),
    score: level => 130 + level * 5,
    xp: 2,
    radius: 0.48,
    damage: 7,
    shield: 0,
    barY: 2.6
  },
  cyclops: {
    scale: 1.58,
    hp: level => 20 + Math.floor(level * 3),
    speed: level => 1.58 + Math.min(level * 0.025, 0.4),
    score: level => 440 + level * 12,
    xp: 7,
    radius: 1.04,
    damage: 18,
    shield: 5.5,
    barY: 3.05
  }
};

const effects = [];
const footWorldPosition = new THREE.Vector3();
const metal = (color, roughness, metalness = 0.72) => new THREE.MeshPhysicalMaterial({
  color,
  roughness: Math.max(roughness, 0.38),
  metalness: Math.min(metalness, 0.76),
  clearcoat: 0.18,
  clearcoatRoughness: 0.48,
  envMapIntensity: 0.68
});

function part(parent, geometry, material, position, rotation) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  if (rotation) object.rotation.set(...rotation);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function disposeEnemyResources(enemy, scene) {
  scene.remove(enemy);

  const geometries = new Set();
  const materials = new Set();

  enemy.traverse((child) => {
    if (!child.isMesh) return;
    if (child.geometry) geometries.add(child.geometry);

    const childMaterials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    childMaterials.forEach((material) => {
      if (material) materials.add(material);
    });
  });

  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

function makeEnemy(type) {
  const profile = profiles[type];
  const isCyclops = type === 'cyclops';
  const isHarpy = type === 'harpy';
  const root = new THREE.Group();

  const armor = metal(isHarpy ? 0x566073 : isCyclops ? 0x51453d : 0x77513b, 0.28, 0.86);
  const trim = metal(isHarpy ? 0xb5c3d5 : 0xd4a45e, 0.2, 0.92);
  const dark = metal(0x242630, 0.62, 0.32);
  const cloth = new THREE.MeshStandardMaterial({
    color: isHarpy ? 0x303548 : isCyclops ? 0x3c2628 : 0x641f2c,
    roughness: 0.95,
    side: THREE.DoubleSide
  });
  const skin = new THREE.MeshPhysicalMaterial({
    color: isHarpy ? 0x788092 : isCyclops ? 0x9d775f : 0x98725d,
    roughness: 0.84,
    clearcoat: 0.025
  });
  const plumeMaterial = new THREE.MeshStandardMaterial({
    color: isHarpy ? 0x37445c : 0x942c3d,
    roughness: 0.88,
    side: THREE.DoubleSide
  });
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0xf4c36a,
    emissive: 0xc66a18,
    emissiveIntensity: 0.34
  });

  const body = new THREE.Group();
  body.position.y = isCyclops ? 1.16 : 0.91;
  root.add(body);

  const tunic = part(body, new THREE.CapsuleGeometry(isCyclops ? 0.49 : 0.33, isCyclops ? 0.78 : 0.52, 7, 16), cloth, [0, 0, 0]);
  tunic.scale.set(isCyclops ? 1.42 : 1.06, 1, isCyclops ? 0.9 : 0.82);

  const cuirass = part(
    body,
    new THREE.SphereGeometry(isCyclops ? 0.53 : 0.4, 28, 20),
    armor,
    [0, 0.12, 0.055]
  );
  cuirass.scale.set(isCyclops ? 1.48 : 1.08, 0.92, 0.76);

  for (const side of [-1, 1]) {
    const shoulder = part(body, new THREE.SphereGeometry(isCyclops ? 0.25 : 0.19, 20, 16), armor, [side * (isCyclops ? 0.68 : 0.43), 0.26, 0.02]);
    shoulder.scale.set(1.18, 0.82, 0.88);
    part(body, new THREE.TorusGeometry(isCyclops ? 0.22 : 0.17, 0.025, 8, 24), trim, [side * (isCyclops ? 0.68 : 0.43), 0.23, 0.03], [Math.PI / 2, 0, 0]);
  }

  for (let row = 0; row < 3; row += 1) {
    const abdominalPlate = part(
      body,
      new THREE.SphereGeometry(0.3, 20, 14),
      armor,
      [0, -0.17 - row * 0.13, 0.18]
    );
    abdominalPlate.scale.set(isCyclops ? 1.22 : 0.86, 0.2, 0.52);
  }

  part(body, new THREE.TorusGeometry(isCyclops ? 0.48 : 0.32, 0.035, 8, 28), trim, [0, -0.39, 0]);
  part(body, new THREE.CylinderGeometry(isCyclops ? 0.48 : 0.32, isCyclops ? 0.53 : 0.35, 0.14, 20), dark, [0, -0.42, 0]);

  const head = new THREE.Group();
  head.position.set(0, isCyclops ? 0.78 : 0.63, 0.02);
  body.add(head);

  part(head, new THREE.SphereGeometry(isCyclops ? 0.39 : 0.265, 24, 18), skin, [0, 0, 0]);
  const helmet = part(
    head,
    new THREE.SphereGeometry(isCyclops ? 0.45 : 0.31, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.62),
    armor,
    [0, 0.12, -0.02]
  );
  helmet.scale.set(1.04, 1.12, 1);

  if (isCyclops) {
    part(head, new THREE.SphereGeometry(0.12, 20, 16), eyeMaterial, [0, -0.005, 0.365]);
    part(head, new THREE.SphereGeometry(0.042, 12, 10), dark, [0, -0.005, 0.405]);
    part(head, new THREE.BoxGeometry(0.7, 0.1, 0.1), trim, [0, 0.11, 0.32]);
  } else if (isHarpy) {
    part(head, new THREE.ConeGeometry(0.13, 0.38, 8), trim, [0, -0.17, 0.22], [Math.PI / 2, 0, 0]);
    for (const side of [-1, 1]) {
      part(head, new THREE.SphereGeometry(0.035, 10, 8), eyeMaterial, [side * 0.13, 0.015, 0.235]);
    }
  } else {
    part(head, new THREE.BoxGeometry(0.46, 0.055, 0.09), trim, [0, 0.015, 0.25]);
    part(head, new THREE.BoxGeometry(0.07, 0.25, 0.085), trim, [0, -0.09, 0.255]);
    part(head, new THREE.BoxGeometry(0.13, 0.23, 0.13), armor, [-0.235, -0.12, 0.06], [0, 0, 0.18]);
    part(head, new THREE.BoxGeometry(0.13, 0.23, 0.13), armor, [0.235, -0.12, 0.06], [0, 0, -0.18]);
    part(head, new THREE.CapsuleGeometry(0.065, 0.34, 5, 10), plumeMaterial, [0, 0.38, -0.035], [0, 0, -0.12]);
  }

  const legs = [];
  const arms = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(side * (isCyclops ? 0.32 : 0.2), isCyclops ? 0.47 : 0.48, 0);
    root.add(hip);
    part(hip, new THREE.CapsuleGeometry(isCyclops ? 0.17 : 0.105, isCyclops ? 0.34 : 0.25, 5, 12), dark, [0, -0.12, 0]);

    const knee = new THREE.Group();
    knee.position.y = isCyclops ? -0.27 : -0.24;
    hip.add(knee);
    part(knee, new THREE.SphereGeometry(isCyclops ? 0.17 : 0.105, 14, 10), armor, [0, 0, 0.035]);
    part(knee, new THREE.CapsuleGeometry(isCyclops ? 0.14 : 0.09, isCyclops ? 0.24 : 0.15, 5, 12), dark, [0, -0.11, 0.02]);

    const foot = new THREE.Group();
    foot.position.set(0, isCyclops ? -0.25 : -0.21, 0.04);
    knee.add(foot);
    part(foot, new THREE.BoxGeometry(isCyclops ? 0.35 : 0.24, 0.14, 0.31), dark, [0, 0.01, 0.105]);
    legs.push({ hip, knee, foot, side, baseFootY: foot.position.y });

    const shoulder = new THREE.Group();
    shoulder.position.set(side * (isCyclops ? 0.67 : 0.42), 0.22, 0);
    body.add(shoulder);
    part(shoulder, new THREE.CapsuleGeometry(isCyclops ? 0.17 : 0.105, isCyclops ? 0.38 : 0.3, 5, 12), skin, [0, -0.14, 0]);
    part(shoulder, new THREE.SphereGeometry(isCyclops ? 0.2 : 0.15, 16, 12), armor, [0, 0.035, 0]);

    const elbow = new THREE.Group();
    elbow.position.y = isCyclops ? -0.31 : -0.27;
    shoulder.add(elbow);
    part(elbow, new THREE.CapsuleGeometry(isCyclops ? 0.15 : 0.09, isCyclops ? 0.3 : 0.22, 5, 12), skin, [0, -0.12, 0.025]);
    part(elbow, new THREE.CylinderGeometry(isCyclops ? 0.17 : 0.12, isCyclops ? 0.15 : 0.105, 0.2, 14), trim, [0, -0.12, 0.045], [0, 0, Math.PI / 2]);
    arms.push({ shoulder, elbow, side });
  }

  let shield = null;
  let shieldRig = null;
  let weapon = null;
  const wings = [];

  if (!isHarpy) {
    shieldRig = new THREE.Group();
    shieldRig.position.set(isCyclops ? -0.86 : -0.49, 0.66, 0.2);
    body.add(shieldRig);
    const radius = isCyclops ? 0.63 : 0.41;
    shield = part(shieldRig, new THREE.CylinderGeometry(radius, radius, 0.15, 28), dark, [0, 0, 0], [Math.PI / 2, 0, 0]);
    part(shieldRig, new THREE.TorusGeometry(radius, 0.045, 8, 28), trim, [0, 0, 0.04]);
    part(shieldRig, new THREE.SphereGeometry(isCyclops ? 0.15 : 0.11, 14, 10), trim, [0, 0, 0.12]).scale.z = 0.5;
    for (let index = 0; index < 6; index += 1) {
      const angle = index / 6 * Math.PI * 2;
      part(shieldRig, new THREE.SphereGeometry(0.03, 8, 8), trim, [Math.cos(angle) * radius * 0.82, Math.sin(angle) * radius * 0.82, 0.1]);
    }

    weapon = new THREE.Group();
    weapon.position.set(isCyclops ? 0.76 : 0.43, 0.57, 0.12);
    body.add(weapon);
    part(weapon, new THREE.CylinderGeometry(isCyclops ? 0.095 : 0.027, isCyclops ? 0.12 : 0.035, isCyclops ? 1.25 : 1.18, 9), dark, [0, 0, 0.46], [Math.PI / 2, 0, 0]);
    if (isCyclops) {
      part(weapon, new THREE.SphereGeometry(0.25, 16, 12), armor, [0, 0, 0.95]);
      part(weapon, new THREE.ConeGeometry(0.2, 0.32, 8), trim, [0, 0, 1.22], [Math.PI / 2, 0, 0]);
    } else {
      part(weapon, new THREE.CylinderGeometry(0.045, 0.04, 0.13, 8), trim, [0, 0, 1.03], [Math.PI / 2, 0, 0]);
      part(weapon, new THREE.ConeGeometry(0.075, 0.26, 8), trim, [0, 0, 1.21], [Math.PI / 2, 0, 0]);
    }
  } else {
    for (const side of [-1, 1]) {
      const wing = new THREE.Group();
      wing.position.set(side * 0.22, 0.2, -0.1);
      body.add(wing);
      part(wing, new THREE.BoxGeometry(0.9, 0.13, 0.1), dark, [side * 0.38, 0, 0], [0, 0, side * -0.18]);
      for (let feather = 0; feather < 6; feather += 1) {
        const featherMesh = part(
          wing,
          new THREE.ConeGeometry(0.095, 0.72 - feather * 0.045, 7),
          feather % 2 ? plumeMaterial : armor,
          [side * (0.35 + feather * 0.105), -0.19 + feather * 0.025, 0],
          [0, 0, side * -1.45]
        );
        featherMesh.scale.z = 0.45;
      }
      wings.push(wing);
    }
  }

  const bar = new THREE.Group();
  bar.position.y = profile.barY;
  bar.visible = false;
  part(bar, new THREE.PlaneGeometry(0.94, 0.105), new THREE.MeshBasicMaterial({ color: 0x12131a }), [0, 0, 0]);
  const fill = part(bar, new THREE.PlaneGeometry(0.88, 0.055), new THREE.MeshBasicMaterial({ color: 0xe95653 }), [0, 0, 0.008]);
  root.add(bar);

  root.scale.setScalar(profile.scale);
  root.userData = {
    archetype: type,
    colliderRadius: profile.radius * profile.scale,
    body,
    head,
    baseBodyHeight: isCyclops ? 1.16 : 0.91,
    legs,
    arms,
    wings,
    weapon,
    shield,
    shieldRig,
    bar,
    fill,
    knockback: new THREE.Vector3(),
    phase: Math.random() * Math.PI * 2,
    animationTime: 0,
    moveBlend: 0,
    attackTimer: 0,
    attackDuration: isCyclops ? 1.12 : isHarpy ? 0.76 : 0.92,
    attackCooldown: 0.25 + Math.random() * 0.55,
    attackHit: false,
    staggerTimer: 0,
    flash: 0,
    shieldHp: profile.shield,
    baseMaterials: [armor, trim, dark, cloth, skin, plumeMaterial],
    baseEmissive: [armor, trim, dark, cloth, skin, plumeMaterial].map(material => material.emissive.clone())
  };
  return root;
}

function showDamage(scene, position, label) {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  context.font = 'bold 42px system-ui';
  context.textAlign = 'center';
  context.strokeStyle = '#100b10';
  context.lineWidth = 7;
  context.strokeText(label, 96, 47);
  context.fillStyle = '#fff1d5';
  context.fillText(label, 96, 47);

  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false
  }));
  sprite.position.copy(position).add(new THREE.Vector3(0, 2.05, 0));
  sprite.scale.set(0.92, 0.31, 1);
  scene.add(sprite);
  effects.push({ object: sprite, texture, life: 0.72 });
}

function spawnSparks(scene, position) {
  for (let index = 0; index < 7; index += 1) {
    const material = new THREE.MeshBasicMaterial({
      color: index % 2 ? 0xffd28a : 0xe15a45,
      transparent: true
    });
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 6), material);
    spark.position.copy(position).add(new THREE.Vector3(0, 1.05, 0));
    const angle = index / 7 * Math.PI * 2;
    const velocity = new THREE.Vector3(
      Math.cos(angle) * (1.7 + Math.random()),
      1.3 + Math.random() * 2.1,
      Math.sin(angle) * (1.7 + Math.random())
    );
    scene.add(spark);
    effects.push({ object: spark, life: 0.4, velocity, material });
  }
}

export function spawnEnemy(state, scene, player) {
  if (enemies.length >= MAX_ENEMIES) return null;

  const angle = Math.random() * Math.PI * 2;
  const distance = SPAWN_DISTANCE + Math.random() * 3;
  const x = player.position.x + Math.cos(angle) * distance;
  const z = player.position.z + Math.sin(angle) * distance;
  const radius = Math.hypot(x, z);
  const clamp = radius > ENEMY_SPAWN_RADIUS ? ENEMY_SPAWN_RADIUS / radius : 1;

  const type = state.level % 5 === 0 && Math.random() < 0.28
    ? 'cyclops'
    : Math.random() < 0.3
      ? 'harpy'
      : 'trojan';

  const profile = profiles[type];
  const enemy = makeEnemy(type);
  enemy.position.set(x * clamp, type === 'harpy' ? 0.28 : 0, z * clamp);
  enemy.hp = enemy.maxHp = profile.hp(state.level);
  enemy.speed = profile.speed(state.level);
  enemy.scoreValue = profile.score(state.level);
  enemy.xpValue = profile.xp;
  enemy.contactDamage = profile.damage;
  enemy.archetype = type;
  enemy.dead = false;
  enemy.rotation.y = Math.atan2(player.position.x - enemy.position.x, player.position.z - enemy.position.z);
  scene.add(enemy);
  enemies.push(enemy);
  return enemy;
}

export function applyEnemyDamage(enemy, damage, state, scene, spawnGem, direction) {
  if (!enemy || enemy.dead || enemy.hp <= 0 || damage <= 0) return false;

  const data = enemy.userData;
  const hitDirection = (direction || new THREE.Vector3(0, 0, 1))
    .clone()
    .setY(0)
    .normalize();
  const facing = new THREE.Vector3(0, 0, 1)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), enemy.rotation.y);
  const frontal = facing.dot(hitDirection.clone().negate()) > 0.35;

  let remainingDamage = damage;
  if (frontal && data.shieldHp > 0) {
    const absorbed = Math.min(data.shieldHp, remainingDamage * 0.24);
    data.shieldHp -= absorbed;
    remainingDamage -= absorbed;
  }

  data.flash = 0.15;
  data.staggerTimer = Math.max(data.staggerTimer, enemy.archetype === 'cyclops' ? 0.18 : 0.24);
  data.attackTimer = Math.max(0, data.attackTimer - 0.14);
  data.baseMaterials.forEach(material => {
    material.emissive.setHex(0x68161d);
    material.emissiveIntensity = 0.95;
  });

  // Shielding is mitigation, never immunity: every valid spear hit removes HP.
  if (remainingDamage > 0) {
    enemy.hp -= remainingDamage;
    data.bar.visible = true;
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    data.fill.scale.x = ratio;
    data.fill.position.x = -0.44 * (1 - ratio);
    data.knockback.add(hitDirection.multiplyScalar(enemy.archetype === 'cyclops' ? 0.85 : 1.75));
    showDamage(scene, enemy.position, String(Math.max(1, Math.round(remainingDamage))));
    spawnImpactBurst(scene, enemy.position, hitDirection);
  }

  if (enemy.hp <= 0 && !enemy.dead) {
    enemy.dead = true;
    spawnGem(scene, enemy.position, enemy.xpValue);
    state.kills += 1;
    state.score += enemy.scoreValue || 50;
    disposeEnemyResources(enemy, scene);
    const index = enemies.indexOf(enemy);
    if (index !== -1) enemies.splice(index, 1);
  }
  return true;
}

export function updateEnemyEffects(dt, scene) {
  for (let index = effects.length - 1; index >= 0; index -= 1) {
    const effect = effects[index];
    effect.life -= dt;

    if (effect.velocity) {
      effect.object.position.addScaledVector(effect.velocity, dt);
      effect.velocity.y -= 5.2 * dt;
      effect.material.opacity = Math.max(0, effect.life / 0.4);
    } else {
      effect.object.position.y += dt * 0.78;
      effect.object.material.opacity = Math.max(0, effect.life / 0.72);
    }

    if (effect.life <= 0) {
      scene.remove(effect.object);
      effect.texture?.dispose();
      const effectMaterials = Array.isArray(effect.object.material)
        ? effect.object.material
        : [effect.object.material];
      effectMaterials.forEach((material) => material?.dispose());
      effect.material?.dispose();
      effect.object.geometry?.dispose();
      effects.splice(index, 1);
    }
  }
}

function pushOutOfObstacles(position, radius) {
  for (const obstacle of arenaObstacles) {
    const dx = position.x - obstacle.x;
    const dz = position.z - obstacle.z;
    const distanceSquared = dx * dx + dz * dz;
    const minimumDistance = radius + obstacle.radius;
    if (distanceSquared >= minimumDistance * minimumDistance) continue;

    const distance = Math.sqrt(Math.max(distanceSquared, 1e-8));
    const normalX = distance > 1e-4 ? dx / distance : 1;
    const normalZ = distance > 1e-4 ? dz / distance : 0;
    const penetration = minimumDistance - distance;
    position.x += normalX * penetration;
    position.z += normalZ * penetration;
  }
}

function damagePlayer(state, enemy, player, direction) {
  if (state.playerHitTimer > 0) return;

  state.hp = Math.max(0, state.hp - enemy.contactDamage);
  state.playerHitTimer = 0.78;
  triggerPlayerHit();
  player.position.addScaledVector(direction, -1.15);

  if (state.hp <= 0 && !state.over) {
    state.over = true;
    state.paused = true;
    document.getElementById('final-score').textContent =
      'Reached Wave ' + state.level + ' with ' + state.kills +
      ' enemies defeated. Final Score: ' + state.score.toLocaleString();
    document.getElementById('gameover-modal').classList.add('is-visible');
    import('./leaderboard.js').then(({ loadLeaderboard }) => loadLeaderboard());
  }
}

export function updateEnemies(dt, state, scene, player) {
  state.playerHitTimer = Math.max(0, state.playerHitTimer - dt);

  for (const enemy of enemies) {
    const data = enemy.userData;
    const toPlayer = new THREE.Vector3().subVectors(player.position, enemy.position).setY(0);
    let distance = Math.hypot(toPlayer.x, toPlayer.z);

    if (distance > 0.001) {
      toPlayer.normalize();
      const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
      const angleDelta = THREE.MathUtils.euclideanModulo(
        targetAngle - enemy.rotation.y + Math.PI,
        Math.PI * 2
      ) - Math.PI;
      enemy.rotation.y += angleDelta * (1 - Math.exp(-9 * dt));
    } else {
      toPlayer.set(Math.sin(enemy.rotation.y), 0, Math.cos(enemy.rotation.y));
    }

    if (distance > 0.001) {
      const stoppingDistance = data.colliderRadius + player.userData.colliderRadius + 0.68;
      if (distance > stoppingDistance) {
        enemy.position.addScaledVector(toPlayer, enemy.speed * dt);
      }
    }

    enemy.position.addScaledVector(data.knockback, dt);
    pushOutOfObstacles(enemy.position, data.colliderRadius * 0.82);

    let separationX = 0;
    let separationZ = 0;
    for (const other of enemies) {
      if (other === enemy) continue;
      const dx = enemy.position.x - other.position.x;
      const dz = enemy.position.z - other.position.z;
      const distanceSquared = dx * dx + dz * dz;
      const minimumGap = (data.colliderRadius + other.userData.colliderRadius) * 0.88;

      if (distanceSquared > 1e-6 && distanceSquared < minimumGap * minimumGap) {
        const separationDistance = Math.sqrt(distanceSquared);
        const push = (minimumGap - separationDistance) / minimumGap;
        separationX += dx / separationDistance * push;
        separationZ += dz / separationDistance * push;
      }
    }

    enemy.position.x += separationX * dt * 4.2;
    enemy.position.z += separationZ * dt * 4.2;
    data.knockback.multiplyScalar(Math.exp(-7.5 * dt));

    const playerCollisionDistance = data.colliderRadius + player.userData.colliderRadius * 0.82;
    if (distance < playerCollisionDistance && distance > 1e-4) {
      const overlap = playerCollisionDistance - distance;
      enemy.position.addScaledVector(toPlayer, -overlap * 0.72);
      player.position.addScaledVector(toPlayer, overlap * 0.28);
      toPlayer.subVectors(player.position, enemy.position).setY(0).normalize();
      distance = Math.hypot(
        player.position.x - enemy.position.x,
        player.position.z - enemy.position.z
      );
    }

    pushOutOfObstacles(enemy.position, data.colliderRadius * 0.82);
    toPlayer.subVectors(player.position, enemy.position).setY(0);
    distance = Math.hypot(toPlayer.x, toPlayer.z);
    if (distance > 1e-4) {
      toPlayer.normalize();
    } else {
      toPlayer.set(Math.sin(enemy.rotation.y), 0, Math.cos(enemy.rotation.y));
    }

    data.animationTime += dt;
    data.phase += dt * (3.2 + enemy.speed * 2.35);
    data.moveBlend = THREE.MathUtils.damp(
      data.moveBlend,
      distance > data.colliderRadius + player.userData.colliderRadius + 0.7 ? 1 : 0,
      7,
      dt
    );

    const gait = Math.sin(data.phase);
    const idleWeight = 1 - data.moveBlend;
    for (const leg of data.legs) {
      const swing = Math.sin(data.phase + (leg.side > 0 ? Math.PI : 0));
      leg.hip.rotation.x = swing * (0.55 * data.moveBlend + 0.012 * idleWeight);
      leg.knee.rotation.x = Math.max(0, swing) * 0.72 * data.moveBlend;
      leg.foot.rotation.x = -leg.hip.rotation.x * 0.32 - leg.knee.rotation.x * 0.38;
    }

    for (const arm of data.arms) {
      const swing = Math.sin(data.phase + (arm.side > 0 ? 0 : Math.PI));
      arm.shoulder.rotation.x = swing * 0.23 * data.moveBlend - 0.045 * idleWeight;
      arm.shoulder.rotation.z = -arm.side * (0.02 + data.moveBlend * 0.025);
      arm.elbow.rotation.x = -0.1 - Math.max(0, -swing) * 0.18 * data.moveBlend;
    }

    const breath = Math.sin(data.animationTime * 2.1);
    data.body.position.y = data.baseBodyHeight
      + Math.abs(gait) * 0.025 * data.moveBlend
      + breath * 0.009 * idleWeight;
    data.body.rotation.x = 0.045 * data.moveBlend + breath * 0.012 * idleWeight;
    data.body.rotation.y = gait * 0.035 * data.moveBlend;
    data.body.rotation.z = -gait * 0.028 * data.moveBlend;
    data.head.rotation.x = -0.025 - data.moveBlend * 0.02 + breath * 0.015;

    data.attackCooldown = Math.max(0, data.attackCooldown - dt);
    const attackRange = data.colliderRadius + player.userData.colliderRadius + 0.52;
    if (distance < attackRange && data.attackCooldown <= 0 && data.attackTimer <= 0) {
      data.attackTimer = data.attackDuration;
      data.attackCooldown = data.attackDuration + (
        enemy.archetype === 'cyclops' ? 0.72 : enemy.archetype === 'harpy' ? 0.42 : 0.58
      );
      data.attackHit = false;
    }

    data.attackTimer = Math.max(0, data.attackTimer - dt);
    const attacking = data.attackTimer > 0;
    const progress = attacking ? 1 - data.attackTimer / data.attackDuration : 0;
    const anticipation = attacking
      ? 1 - THREE.MathUtils.smoothstep(progress, 0.08, 0.34)
      : 0;
    const strike = attacking
      ? THREE.MathUtils.smoothstep(progress, 0.28, 0.48)
        * (1 - THREE.MathUtils.smoothstep(progress, 0.63, 0.84))
      : 0;
    const recovery = attacking
      ? THREE.MathUtils.smoothstep(progress, 0.65, 1)
      : 0;

    if (attacking) {
      data.body.rotation.x += anticipation * 0.07 - strike * 0.17 + recovery * 0.025;
      data.body.rotation.z += anticipation * 0.075 - strike * 0.03;
      data.arms[1].shoulder.rotation.x -= anticipation * 0.38 + strike * 0.76;
      data.arms[1].elbow.rotation.x -= anticipation * 0.18 + strike * 0.26;

      if (data.weapon) {
        data.weapon.rotation.x = -anticipation * 0.58 + strike * 0.34 + recovery * 0.08;
        data.weapon.rotation.z = -strike * 0.07;
      }
      if (data.shieldRig) {
        data.shieldRig.rotation.x = -0.12 - anticipation * 0.1 - strike * 0.1;
        data.shieldRig.rotation.z = -strike * 0.05;
      }

      if (strike > 0.58 && !data.attackHit) {
        data.attackHit = true;
        if (distance < attackRange + 0.18) {
          damagePlayer(state, enemy, player, toPlayer);
        }
      }
    } else {
      if (data.weapon) data.weapon.rotation.set(0, 0, 0);
      if (data.shieldRig) data.shieldRig.rotation.set(0, 0, 0);
    }

    data.staggerTimer = Math.max(0, data.staggerTimer - dt);
    const stagger = data.staggerTimer > 0 ? data.staggerTimer / 0.24 : 0;
    data.body.rotation.x -= stagger * 0.18;
    data.body.rotation.z += Math.sin(data.animationTime * 34) * stagger * 0.07;
    const impactSquash = stagger * 0.075;
    data.body.scale.set(1 + impactSquash, 1 - impactSquash * 0.65, 1 + impactSquash);
    data.head.rotation.z += stagger * 0.1;
    data.arms[0].shoulder.rotation.x -= stagger * 0.14;
    data.arms[1].shoulder.rotation.x += stagger * 0.18;

    data.wings.forEach((wing, index) => {
      const side = index ? 1 : -1;
      const flap = Math.sin(data.phase * (attacking ? 2.05 : 1.55));
      wing.rotation.z = side * (
        0.18 + flap * 0.42 + (attacking ? anticipation * 0.16 + strike * 0.34 : 0)
      );
      wing.rotation.x = -0.08 + Math.cos(data.phase * 1.2) * 0.055;
    });

    enemy.position.y = data.wings.length
      ? 0.28 + Math.sin(data.phase * 1.6) * 0.08
      : 0;

    if (!data.wings.length) {
      enemy.updateMatrixWorld(true);
      for (const leg of data.legs) {
        leg.foot.position.y = leg.baseFootY;
        leg.foot.getWorldPosition(footWorldPosition);
        if (footWorldPosition.y < 0) {
          leg.foot.position.y -= footWorldPosition.y;
        }
      }
    }

    if (data.weapon && enemy.archetype === 'cyclops' && !attacking) {
      data.weapon.rotation.x = Math.sin(data.phase * 0.55) * 0.045;
    }

    data.bar.quaternion.copy(enemy.quaternion).invert().multiply(camera.quaternion);

    if (data.flash > 0) {
      data.flash -= dt;
      if (data.flash <= 0) {
        data.baseMaterials.forEach((material, index) => {
          material.emissive.copy(data.baseEmissive[index]);
          material.emissiveIntensity = 1;
        });
      }
    }
  }
}
