/**
 * Mutable values for one run.
 *
 * Fixed tuning values belong in config.js. This object only stores values
 * that can change while the current game is running.
 */
export const state = {
  // Player resources.
  hp: 100,
  maxHp: 100,
  speed: 7.5,

  // Progression.
  xp: 0,
  nextXp: 5,
  level: 1,
  kills: 0,
  score: 0,
  pendingUpgrades: 0,

  // Spear combat.
  fireRate: 0.72,
  fireTimer: 0,
  dmg: 2.4,
  multiShot: 1,

  // Optional ability.
  hasOrbital: false,
  orbitalAngle: 0,

  // Run lifecycle and timers.
  started: false,
  paused: true,
  over: false,
  spawnTimer: 0,
  playerHitTimer: 0,
  upgradeAuraTimer: 0,
};
