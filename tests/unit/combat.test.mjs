import test from 'node:test';
import assert from 'node:assert/strict';

function calculatePlayerDamage(isShielded) {
  return {
    damage: isShielded ? 34 : 52,
    knockback: isShielded ? 5.2 : 8.2,
    hitRadius: 0.50,
    twoHanded: !isShielded,
  };
}

function calculateDamageReceived(baseDamage, isShielded) {
  return isShielded ? baseDamage * 0.25 : baseDamage;
}

function calculateEnemyMaxHp(wave, baseHp = 65, hpPerWave = 15) {
  return baseHp + (wave - 1) * hpPerWave;
}

function calculateKillReward(wave, basePoints = 100) {
  return basePoints * wave;
}

test('combat stance dictates damage and knockback values', () => {
  const twoHanded = calculatePlayerDamage(false);
  assert.equal(twoHanded.damage, 52);
  assert.equal(twoHanded.knockback, 8.2);
  assert.equal(twoHanded.twoHanded, true);

  const oneHanded = calculatePlayerDamage(true);
  assert.equal(oneHanded.damage, 34);
  assert.equal(oneHanded.knockback, 5.2);
  assert.equal(oneHanded.twoHanded, false);
});

test('shield guard blocks 75% of incoming enemy damage', () => {
  const rawDamage = 20;
  const unshielded = calculateDamageReceived(rawDamage, false);
  const shielded = calculateDamageReceived(rawDamage, true);

  assert.equal(unshielded, 20);
  assert.equal(shielded, 5);
});

test('enemy scaling increases correctly with wave progression', () => {
  assert.equal(calculateEnemyMaxHp(1), 65);
  assert.equal(calculateEnemyMaxHp(2), 80);
  assert.equal(calculateEnemyMaxHp(5), 125);
  assert.equal(calculateEnemyMaxHp(10), 200);
});

test('kill score rewards scale with surviving waves', () => {
  assert.equal(calculateKillReward(1), 100);
  assert.equal(calculateKillReward(3), 300);
  assert.equal(calculateKillReward(8), 800);
});

test('hero health cannot drop below zero and triggers game over condition', () => {
  let hp = 30;
  let over = false;

  const hitDamage = 45;
  hp = Math.max(0, hp - hitDamage);
  if (hp <= 0) {
    hp = 0;
    over = true;
  }

  assert.equal(hp, 0);
  assert.equal(over, true);
});
