const ARENA_RADIUS = 19;
const MAX_ENEMIES_CAP = 26;
const BASE_PLAYER_SPEED = 6.4;

const state = {
  started: false,
  paused: false,
  over: false,
  speed: BASE_PLAYER_SPEED,
  hp: 100,
  maxHp: 100,
  kills: 0,
  score: 0,
  wave: 1,
  elapsed: 0,
  spawnTimer: 0.05,
};

const player = {
  x: 0,
  z: 0,
  vx: 0,
  vz: 0,
  rotationY: 0,
};

const combat = {
  phase: 'idle',
  elapsed: 0,
  duration: 0.72,
  slow: false,
  hitIds: new Set(),
};

let keys = { forward: false, backward: false, left: false, right: false, shift: false };
let enemies = [];

function resetRun() {
  state.over = false;
  state.hp = 100;
  state.maxHp = 100;
  state.kills = 0;
  state.score = 0;
  state.wave = 1;
  state.elapsed = 0;
  state.spawnTimer = 0.05;

  player.x = 0;
  player.z = 0;
  player.vx = 0;
  player.vz = 0;
  player.rotationY = 0;

  combat.phase = 'idle';
  combat.elapsed = 0;
  combat.hitIds.clear();

  enemies = [];
}

function smoothstep(edge0, edge1, x) {
  const clamped = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return clamped * clamped * (3 - 2 * clamped);
}

function distSqPointToSegment(px, pz, ax, az, bx, bz) {
  const abx = bx - ax;
  const abz = bz - az;
  const apx = px - ax;
  const apz = pz - az;
  const abLenSq = abx * abx + abz * abz;
  const t = abLenSq > 1e-6 ? Math.max(0, Math.min(1, (apx * abx + apz * abz) / abLenSq)) : 0;
  const cx = ax + abx * t;
  const cz = az + abz * t;
  const dx = px - cx;
  const dz = pz - cz;
  return dx * dx + dz * dz;
}

function updatePlayerMovement(dt, camYaw, isShielded) {
  const rawX = Number(keys.right) - Number(keys.left);
  const rawZ = Number(keys.backward) - Number(keys.forward);
  const hasMoveInput = rawX !== 0 || rawZ !== 0;

  let targetVx = 0;
  let targetVz = 0;

  if (hasMoveInput) {
    const len = Math.hypot(rawX, rawZ);
    const normX = rawX / len;
    const normZ = rawZ / len;

    const cos = Math.cos(camYaw);
    const sin = Math.sin(camYaw);
    const worldX = normX * cos + normZ * sin;
    const worldZ = -normX * sin + normZ * cos;

    const moveSpeed = isShielded ? state.speed * 0.56 : state.speed;
    targetVx = worldX * moveSpeed;
    targetVz = worldZ * moveSpeed;

    if (combat.phase === 'idle') {
      player.rotationY = Math.atan2(worldX, worldZ);
    }
  }

  const accel = 1 - Math.exp(-16 * dt);
  player.vx += (targetVx - player.vx) * accel;
  player.vz += (targetVz - player.vz) * accel;
  player.x += player.vx * dt;
  player.z += player.vz * dt;

  const arenaDist = Math.hypot(player.x, player.z);
  if (arenaDist > ARENA_RADIUS) {
    player.x = (player.x / arenaDist) * ARENA_RADIUS;
    player.z = (player.z / arenaDist) * ARENA_RADIUS;
  }
}

function updateEnemySpawning(dt) {
  state.spawnTimer -= dt;
  const maxEnemies = Math.min(MAX_ENEMIES_CAP, 9 + state.wave * 2);

  if (state.spawnTimer <= 0 && enemies.length < maxEnemies) {
    state.spawnTimer = Math.max(0.40, 1.25 - state.wave * 0.08);
    const angle = Math.random() * Math.PI * 2;
    const spawnR = 7.0 + Math.random() * 2.8;

    enemies.push({
      id: Math.random(),
      x: Math.max(-18.5, Math.min(18.5, player.x + Math.cos(angle) * spawnR)),
      z: Math.max(-18.5, Math.min(18.5, player.z + Math.sin(angle) * spawnR)),
      vx: 0,
      vz: 0,
      rotY: 0,
      hp: 65 + (state.wave - 1) * 15,
      maxHp: 65 + (state.wave - 1) * 15,
      stun: 0,
      windup: 0,
      attackCd: 0.35,
      dying: false,
      deathTimer: 0,
      moving: false,
    });
  }
}

function findClosestTarget(isShielded) {
  let closest = null;
  let minTargetDist = isShielded ? 2.45 : 2.65;

  for (const en of enemies) {
    if (en.dying) continue;
    const d = Math.hypot(en.x - player.x, en.z - player.z);
    if (d < minTargetDist) {
      minTargetDist = d;
      closest = en;
    }
  }

  return closest;
}

function updateCombatCycle(dt, closest, isShielded, events) {
  if (combat.phase === 'idle') {
    if (closest) {
      combat.phase = 'thrusting';
      combat.elapsed = 0;
      combat.slow = isShielded;
      combat.duration = isShielded ? 1.24 : 0.72;
      combat.hitIds.clear();

      const dx = closest.x - player.x;
      const dz = closest.z - player.z;
      const d = Math.max(0.6, Math.hypot(dx, dz));
      const spearLateralOffset = isShielded ? -0.22 : -0.10;
      const parallax = Math.asin(Math.min(0.6, spearLateralOffset / d));
      player.rotationY = Math.atan2(dx, dz) - parallax;

      events.push({ type: 'startThrust', slow: isShielded, yaw: player.rotationY });
    }
  } else if (combat.phase === 'thrusting') {
    combat.elapsed += dt;
    const progress = Math.min(1.0, combat.elapsed / combat.duration);

    if (progress < 0.24 && closest) {
      const dx = closest.x - player.x;
      const dz = closest.z - player.z;
      const d = Math.max(0.6, Math.hypot(dx, dz));
      const spearLateralOffset = combat.slow ? -0.22 : -0.10;
      const parallax = Math.asin(Math.min(0.6, spearLateralOffset / d));
      player.rotationY = Math.atan2(dx, dz) - parallax;
    }

    const raise = smoothstep(0.00, 0.24, progress) * (1 - smoothstep(0.24, 0.34, progress));
    const strike = smoothstep(0.22, 0.38, progress) * (1 - smoothstep(0.62, 0.98, progress));

    if (progress >= 0.25 && progress <= 0.56) {
      const localX = combat.slow ? -0.20 : -0.08;
      const pelvisZ = -0.07 * raise + 0.25 * strike;
      const forwardReach = combat.slow ? (0.40 * strike) : (0.34 * strike);
      const bladeBaseDist = (pelvisZ + forwardReach + 1.05) * 1.06;
      const spearTipDist = (pelvisZ + forwardReach + 1.58) * 1.06;

      const sinY = Math.sin(player.rotationY);
      const cosY = Math.cos(player.rotationY);
      const rightX = cosY;
      const rightZ = -sinY;

      const baseWorldX = player.x + sinY * bladeBaseDist + rightX * localX;
      const baseWorldZ = player.z + cosY * bladeBaseDist + rightZ * localX;
      const tipWorldX = player.x + sinY * spearTipDist + rightX * localX;
      const tipWorldZ = player.z + cosY * spearTipDist + rightZ * localX;

      const damage = combat.slow ? 34 : 52;
      const knockbackForce = combat.slow ? 5.2 : 8.2;
      const hitRadiusSq = 0.25;

      for (const en of enemies) {
        if (en.dying || combat.hitIds.has(en.id)) continue;

        const dSq = distSqPointToSegment(en.x, en.z, baseWorldX, baseWorldZ, tipWorldX, tipWorldZ);
        if (dSq <= hitRadiusSq) {
          combat.hitIds.add(en.id);
          en.hp -= damage;
          en.stun = 0.26;
          en.windup = 0;
          en.vx += sinY * knockbackForce;
          en.vz += cosY * knockbackForce;

          const isLethal = en.hp <= 0;
          if (isLethal) {
            en.hp = 0;
            en.dying = true;
            en.deathTimer = 0.48;
            state.kills += 1;
            state.score += 100 * state.wave;
          }

          events.push({
            type: 'spearTipPierce',
            x: tipWorldX,
            z: tipWorldZ,
            yaw: player.rotationY,
            lethal: isLethal,
            isTwoHanded: !combat.slow,
          });
        }
      }
    }

    if (progress >= 1.0) {
      combat.phase = 'idle';
      combat.elapsed = 0;
    }
  }
}

function updateEnemySimulation(dt, isShielded, events) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const en = enemies[i];

    if (en.dying) {
      en.deathTimer -= dt;
      en.x += en.vx * dt;
      en.z += en.vz * dt;
      en.vx *= Math.exp(-10 * dt);
      en.vz *= Math.exp(-10 * dt);
      if (en.deathTimer <= 0) {
        enemies.splice(i, 1);
      }
      continue;
    }

    en.stun = Math.max(0, en.stun - dt);
    en.attackCd = Math.max(0, en.attackCd - dt);

    let sepX = 0;
    let sepZ = 0;
    for (let j = 0; j < enemies.length; j++) {
      if (i === j || enemies[j].dying) continue;
      const other = enemies[j];
      const sdx = en.x - other.x;
      const sdz = en.z - other.z;
      const sdist = Math.hypot(sdx, sdz);
      if (sdist > 0.001 && sdist < 1.10) {
        const push = (1.10 - sdist) * 4.5;
        sepX += (sdx / sdist) * push;
        sepZ += (sdz / sdist) * push;
      }
    }

    const toPlayerX = player.x - en.x;
    const toPlayerZ = player.z - en.z;
    const distToPlayer = Math.hypot(toPlayerX, toPlayerZ);

    if (distToPlayer > 0.01) {
      en.rotY = Math.atan2(toPlayerX, toPlayerZ);
    }

    if (en.stun > 0) {
      en.moving = false;
    } else if (en.windup > 0) {
      en.moving = false;
      en.windup -= dt;
      if (en.windup <= 0) {
        if (distToPlayer < 1.85 && !state.over) {
          const rawDmg = 16 + (state.wave - 1) * 2;
          const finalDmg = isShielded ? rawDmg * 0.25 : rawDmg;
          state.hp = Math.max(0, state.hp - finalDmg);
          events.push({
            type: isShielded ? 'shieldBlock' : 'playerHit',
            x: player.x,
            z: player.z,
          });
          if (state.hp <= 0) {
            state.hp = 0;
            state.over = true;
            events.push({ type: 'gameOver' });
          }
        }
        en.attackCd = 0.95;
      }
    } else if (distToPlayer > 1.25) {
      en.moving = true;
      const moveSpeed = 3.05 + Math.min(1.4, state.wave * 0.14);
      const desiredVx = (toPlayerX / distToPlayer) * moveSpeed + sepX;
      const desiredVz = (toPlayerZ / distToPlayer) * moveSpeed + sepZ;
      en.vx += (desiredVx - en.vx) * (1 - Math.exp(-10 * dt));
      en.vz += (desiredVz - en.vz) * (1 - Math.exp(-10 * dt));
    } else {
      en.moving = false;
      en.vx += sepX * dt * 4;
      en.vz += sepZ * dt * 4;
      if (en.attackCd <= 0) {
        en.windup = 0.38;
      }
    }

    en.x += en.vx * dt;
    en.z += en.vz * dt;
    en.vx *= Math.exp(-8 * dt);
    en.vz *= Math.exp(-8 * dt);
  }
}

self.onmessage = function (e) {
  const data = e.data;

  if (data.reset) resetRun();
  if (data.keys) keys = data.keys;
  if (data.start) {
    state.started = true;
    state.paused = false;
  }
  if (typeof data.started === 'boolean') state.started = data.started;
  if (typeof data.paused === 'boolean') state.paused = data.paused;

  if (!state.started || state.paused || state.over) return;

  const dt = data.dt || 0.016;
  const camYaw = data.camYaw || 0;
  const isShielded = Boolean(keys.shift);
  const events = [];

  state.elapsed += dt;
  state.wave = 1 + Math.floor(state.elapsed / 22);

  updatePlayerMovement(dt, camYaw, isShielded);
  updateEnemySpawning(dt);

  const closest = findClosestTarget(isShielded);
  updateCombatCycle(dt, closest, isShielded, events);
  updateEnemySimulation(dt, isShielded, events);

  self.postMessage({
    player,
    isMoving: Math.hypot(player.vx, player.vz) > 0.35,
    enemies,
    events,
    combatProgress: combat.phase === 'thrusting' ? combat.elapsed / combat.duration : 0,
    stats: {
      hp: state.hp,
      maxHp: state.maxHp,
      kills: state.kills,
      score: state.score,
      wave: state.wave,
      elapsed: state.elapsed,
      over: state.over,
    },
  });
};
