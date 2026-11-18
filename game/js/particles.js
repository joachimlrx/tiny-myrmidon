import * as THREE from 'three';

const POOL_SIZE = 72;
const pools = new WeakMap();
const dummy = new THREE.Object3D();
const scratchColor = new THREE.Color();

function getPool(scene) {
  let pool = pools.get(scene);
  if (pool) return pool;

  const geometry = new THREE.SphereGeometry(0.07, 6, 5);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.86,
    depthWrite: false
  });
  const mesh = new THREE.InstancedMesh(geometry, material, POOL_SIZE);
  mesh.name = 'PooledCombatParticles';
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(
    new Float32Array(POOL_SIZE * 3),
    3
  );
  mesh.count = POOL_SIZE;
  scene.add(mesh);

  pool = {
    mesh,
    particles: Array.from({ length: POOL_SIZE }, () => ({
      life: 0,
      maxLife: 1,
      velocity: new THREE.Vector3(),
      color: new THREE.Color(),
      size: 0.1,
      gravity: 3
    }))
  };
  pools.set(scene, pool);

  for (let index = 0; index < POOL_SIZE; index += 1) {
    dummy.position.set(0, -1000, 0);
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    mesh.setColorAt(index, new THREE.Color(0, 0, 0));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return pool;
}

function emit(scene, position, color, count, options = {}) {
  const pool = getPool(scene);
  let emitted = 0;

  for (let index = 0; index < POOL_SIZE && emitted < count; index += 1) {
    const particle = pool.particles[index];
    if (particle.life > 0) continue;

    const angle = Math.random() * Math.PI * 2;
    const speed = options.speedMin + Math.random() * (options.speedMax - options.speedMin);
    particle.life = particle.maxLife = options.lifeMin + Math.random() * (options.lifeMax - options.lifeMin);
    particle.velocity.set(
      Math.cos(angle) * speed + (options.direction?.x || 0) * (options.bias || 0),
      options.upMin + Math.random() * (options.upMax - options.upMin),
      Math.sin(angle) * speed + (options.direction?.z || 0) * (options.bias || 0)
    );
    particle.color.set(color);
    particle.size = options.sizeMin + Math.random() * (options.sizeMax - options.sizeMin);
    particle.gravity = options.gravity;
    particle.position = particle.position || new THREE.Vector3();
    particle.position.copy(position);
    particle.position.x += (Math.random() - 0.5) * (options.spread || 0.18);
    particle.position.z += (Math.random() - 0.5) * (options.spread || 0.18);
    emitted += 1;
  }
}

export function spawnFootstepDust(scene, position) {
  emit(scene, position, 0xb9a58a, 5, {
    speedMin: 0.12,
    speedMax: 0.8,
    upMin: 0.35,
    upMax: 1.05,
    lifeMin: 0.24,
    lifeMax: 0.48,
    sizeMin: 0.55,
    sizeMax: 1.15,
    gravity: 1.2,
    spread: 0.22
  });
}

export function spawnImpactBurst(scene, position, direction) {
  emit(scene, position.clone().add(new THREE.Vector3(0, 1.05, 0)), 0xf2b86e, 12, {
    speedMin: 1.1,
    speedMax: 3.1,
    upMin: 0.8,
    upMax: 3.2,
    lifeMin: 0.18,
    lifeMax: 0.42,
    sizeMin: 0.55,
    sizeMax: 1.05,
    gravity: 5.8,
    spread: 0.12,
    direction,
    bias: 0.85
  });
}

export function updateParticleEffects(scene, dt) {
  const pool = pools.get(scene);
  if (!pool) return;

  for (let index = 0; index < POOL_SIZE; index += 1) {
    const particle = pool.particles[index];
    if (particle.life <= 0) {
      dummy.position.set(0, -1000, 0);
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      pool.mesh.setMatrixAt(index, dummy.matrix);
      continue;
    }

    particle.life = Math.max(0, particle.life - dt);
    particle.velocity.y -= particle.gravity * dt;
    particle.velocity.multiplyScalar(Math.exp(-1.8 * dt));
    particle.position.addScaledVector(particle.velocity, dt);

    const fade = particle.life / particle.maxLife;
    const scale = particle.size * (0.45 + fade * 0.55);
    dummy.position.copy(particle.position);
    dummy.scale.set(scale, scale * 0.72, scale);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    pool.mesh.setMatrixAt(index, dummy.matrix);

    scratchColor.copy(particle.color).multiplyScalar(0.35 + fade * 0.65);
    pool.mesh.setColorAt(index, scratchColor);
  }

  pool.mesh.instanceMatrix.needsUpdate = true;
  if (pool.mesh.instanceColor) pool.mesh.instanceColor.needsUpdate = true;
}