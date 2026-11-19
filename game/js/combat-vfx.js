import * as THREE from 'three';

const activeEffects = [];

const thrustConeGeo = new THREE.ConeGeometry(0.32, 1.65, 12, 1, true);
thrustConeGeo.rotateX(Math.PI / 2);

const sparkGeo = new THREE.BoxGeometry(0.06, 0.06, 0.16);

export function spawnSpearThrustArc(scene, origin, yaw, isTwoHanded = true) {
  const mat = new THREE.MeshBasicMaterial({
    color: isTwoHanded ? 0xffd27d : 0x9ad8ff,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(thrustConeGeo, mat);
  mesh.position.copy(origin);
  mesh.rotation.y = yaw;
  mesh.position.x += Math.sin(yaw) * 0.65;
  mesh.position.z += Math.cos(yaw) * 0.65;
  scene.add(mesh);

  activeEffects.push({
    type: 'arc',
    mesh,
    life: 0.18,
    maxLife: 0.18,
    yaw,
  });
}

export function spawnImpactSparks(scene, position, hexColor = 0xffb84d, count = 10) {
  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: hexColor,
      transparent: true,
      opacity: 1,
    });
    const spark = new THREE.Mesh(sparkGeo, mat);
    spark.position.copy(position);

    const angle = Math.random() * Math.PI * 2;
    const speed = 2.5 + Math.random() * 5.5;
    const vy = 2.0 + Math.random() * 4.5;

    scene.add(spark);
    activeEffects.push({
      type: 'spark',
      mesh: spark,
      vx: Math.cos(angle) * speed,
      vy,
      vz: Math.sin(angle) * speed,
      life: 0.24 + Math.random() * 0.14,
      maxLife: 0.38,
    });
  }
}

export function updateCombatVFX(scene, dt) {
  for (let i = activeEffects.length - 1; i >= 0; i--) {
    const fx = activeEffects[i];
    fx.life -= dt;

    if (fx.life <= 0) {
      scene.remove(fx.mesh);
      fx.mesh.material.dispose();
      activeEffects.splice(i, 1);
      continue;
    }

    const t = 1 - fx.life / fx.maxLife;

    if (fx.type === 'arc') {
      fx.mesh.material.opacity = (1 - t) * 0.55;
      fx.mesh.scale.set(1 - t * 0.35, 1 - t * 0.35, 1 + t * 0.45);
      fx.mesh.position.x += Math.sin(fx.yaw) * 3.5 * dt;
      fx.mesh.position.z += Math.cos(fx.yaw) * 3.5 * dt;
    } else if (fx.type === 'spark') {
      fx.vy -= 16 * dt;
      fx.mesh.position.x += fx.vx * dt;
      fx.mesh.position.y += fx.vy * dt;
      fx.mesh.position.z += fx.vz * dt;
      fx.mesh.lookAt(
        fx.mesh.position.x + fx.vx,
        fx.mesh.position.y + fx.vy,
        fx.mesh.position.z + fx.vz
      );
      fx.mesh.material.opacity = 1 - t;
    }
  }
}
