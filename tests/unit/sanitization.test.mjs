import test from 'node:test';
import assert from 'node:assert/strict';

function validateClientPlayerName(rawName) {
  if (typeof rawName !== 'string') {
    return { valid: false, error: 'Name must be a string' };
  }
  const trimmed = rawName.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Name cannot be empty' };
  }
  if (Array.from(trimmed).length > 24) {
    return { valid: false, error: 'Name cannot exceed 24 characters' };
  }
  // Check for control characters
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return { valid: false, error: 'Name contains invalid control characters' };
  }
  return { valid: true, name: trimmed };
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

test('player name validation rejects empty and whitespace-only inputs', () => {
  assert.equal(validateClientPlayerName('').valid, false);
  assert.equal(validateClientPlayerName('   ').valid, false);
});

test('player name validation trims whitespace properly', () => {
  const result = validateClientPlayerName('  Achilles  ');
  assert.equal(result.valid, true);
  assert.equal(result.name, 'Achilles');
});

test('player name validation enforces 24 character limit accurately with unicode', () => {
  const validUnicode = 'Ἀχιλλεύς';
  assert.equal(validateClientPlayerName(validUnicode).valid, true);

  const tooLong = 'A'.repeat(25);
  assert.equal(validateClientPlayerName(tooLong).valid, false);
});

test('player name validation rejects ASCII control characters', () => {
  assert.equal(validateClientPlayerName('Hero\x00Name').valid, false);
  assert.equal(validateClientPlayerName('Hero\nName').valid, false);
  assert.equal(validateClientPlayerName('Hero\rName').valid, false);
});

test('HTML escape function converts dangerous characters', () => {
  const dangerous = '<script>alert("XSS & danger")</script>';
  const escaped = escapeHtml(dangerous);
  assert.ok(!escaped.includes('<script>'));
  assert.ok(escaped.includes('&lt;script&gt;'));
  assert.ok(escaped.includes('&quot;'));
  assert.ok(escaped.includes('&amp;'));
});
