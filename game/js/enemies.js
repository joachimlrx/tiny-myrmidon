import * as THREE from 'three';
import { SPAWN_DISTANCE } from './config.js';

export const enemies = [];

export const trojanGeo = new THREE.DodecahedronGeometry(0.48);
export const trojanMat = new THREE.MeshStandardMaterial({ color: 0x10b981 });

export const harpyGeo = new THREE.OctahedronGeometry(0.36);
export const harpyMat = new THREE.MeshStandardMaterial({ color: 0xa855f7 });

export const cyclopsGeo = new THREE.DodecahedronGeometry(1.2);
export const cyclopsMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.6 });

export function spawnEnemy(state, scene, player) {
  const angle = Math.random() * Math.PI * 2;
  const posX = player.position.x + Math.cos(angle) * SPAWN_DISTANCE;
  const posZ = player.position.z + Math.sin(angle) * SPAWN_DISTANCE;

  const isCyclopsWave = state.level % 5 === 0 && Math.random() < 0.25;
  const isHarpy = !isCyclopsWave && Math.random() < 0.35;

  let m;
  if (isCyclopsWave) {
    m = new THREE.Mesh(cyclopsGeo, cyclopsMat);
    m.hp = 12 + state.level * 3;
    m.speed = 2.0;
    m.archetype = 'cyclops';
    m.xpValue = 5;
    m.scoreValue = 350;
  } else if (isHarpy) {
    m = new THREE.Mesh(harpyGeo, harpyMat);
    m.hp = 1 + Math.floor(state.level / 3);
    m.speed = 4.2;
    m.archetype = 'harpy';
    m.xpValue = 1;
    m.scoreValue = 75;
  } else {
    m = new THREE.Mesh(trojanGeo, trojanMat);
    m.hp = 2 + Math.floor(state.level / 2);
    m.speed = 2.7 + state.level * 0.1;
    m.archetype = 'trojan';
    m.xpValue = 2;
    m.scoreValue = 100;
  }

  m.position.set(posX, isCyclopsWave ? 1.0 : 0.5, posZ);
  scene.add(m);
  enemies.push(m);
}

export function updateEnemies(dt, state, scene, player, resetTouch, updateHud, spawnGem) {
  for (const e of enemies) {
    e.rotation.y += 2 * dt;
    const dir = new THREE.Vector3().subVectors(player.position, e.position).setY(0).normalize();
    e.position.addScaledVector(dir, e.speed * dt);

    const contactRadius = e.archetype === 'cyclops' ? 1.4 : 0.85;
    if (e.position.distanceTo(player.position) < contactRadius) {
      const damageRate = e.archetype === 'cyclops' ? 45 : 22;
      state.hp -= damageRate * dt;
      updateHud(state);
      if (state.hp <= 0) {
        resetTouch();
        state.over = true;
        document.getElementById('final-score').textContent =
          `Reached Wave ${state.level} with ${state.kills} enemies slain! Final Score: ${state.score}`;
        document.getElementById('gameover-modal').style.display = 'flex';
        import('./leaderboard.js').then(({ loadLeaderboard }) => loadLeaderboard());
      }
    }
  }
}
