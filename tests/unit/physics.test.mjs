import test from 'node:test';
import assert from 'node:assert/strict';

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

function clampToArena(x, z, radius = 19) {
  const dist = Math.hypot(x, z);
  if (dist > radius) {
    return {
      x: (x / dist) * radius,
      z: (z / dist) * radius,
      clamped: true,
    };
  }
  return { x, z, clamped: false };
}

function computeTargetVelocity(rawX, rawZ, camYaw, isShielded, baseSpeed = 6.4) {
  if (rawX === 0 && rawZ === 0) {
    return { targetVx: 0, targetVz: 0 };
  }
  const len = Math.hypot(rawX, rawZ);
  const normX = rawX / len;
  const normZ = rawZ / len;

  const cos = Math.cos(camYaw);
  const sin = Math.sin(camYaw);
  const worldX = normX * cos + normZ * sin;
  const worldZ = -normX * sin + normZ * cos;

  const moveSpeed = isShielded ? baseSpeed * 0.56 : baseSpeed;
  return {
    targetVx: worldX * moveSpeed,
    targetVz: worldZ * moveSpeed,
  };
}

test('smoothstep should produce correct clamping and hermite interpolation', () => {
  assert.equal(smoothstep(0, 10, -5), 0);
  assert.equal(smoothstep(0, 10, 15), 1);
  assert.equal(smoothstep(0, 10, 0), 0);
  assert.equal(smoothstep(0, 10, 10), 1);
  assert.equal(smoothstep(0, 10, 5), 0.5);
});

test('distSqPointToSegment should compute exact square distances to segment', () => {
  // Point directly on segment
  assert.equal(distSqPointToSegment(5, 0, 0, 0, 10, 0), 0);

  // Point perpendicular to segment midpoint
  assert.equal(distSqPointToSegment(5, 3, 0, 0, 10, 0), 9);

  // Point beyond segment start
  assert.equal(distSqPointToSegment(-4, 0, 0, 0, 10, 0), 16);

  // Point beyond segment end
  assert.equal(distSqPointToSegment(13, 0, 0, 0, 10, 0), 9);

  // Degenerate zero-length segment
  assert.equal(distSqPointToSegment(3, 4, 0, 0, 0, 0), 25);
});

test('arena boundary should clamp player strictly within circular radius', () => {
  const inside = clampToArena(10, 10, 19);
  assert.equal(inside.clamped, false);
  assert.equal(inside.x, 10);
  assert.equal(inside.z, 10);

  const outside = clampToArena(30, 0, 19);
  assert.equal(outside.clamped, true);
  assert.equal(outside.x, 19);
  assert.equal(outside.z, 0);

  const diagonalOutside = clampToArena(20, 20, 19);
  assert.equal(diagonalOutside.clamped, true);
  const finalDist = Math.hypot(diagonalOutside.x, diagonalOutside.z);
  assert.ok(Math.abs(finalDist - 19) < 1e-6);
});

test('movement calculation respects camera orientation and shield stance penalty', () => {
  const normal = computeTargetVelocity(0, -1, 0, false, 6.4);
  assert.ok(Math.abs(normal.targetVz - (-6.4)) < 1e-6);
  assert.equal(normal.targetVx, 0);

  const shielded = computeTargetVelocity(0, -1, 0, true, 6.4);
  const expectedSpeed = 6.4 * 0.56;
  assert.ok(Math.abs(shielded.targetVz - (-expectedSpeed)) < 1e-6);

  // Camera rotated by 90 degrees
  const rotated = computeTargetVelocity(0, -1, Math.PI / 2, false, 6.4);
  assert.ok(Math.abs(rotated.targetVx - (-6.4)) < 1e-6);
  assert.ok(Math.abs(rotated.targetVz) < 1e-6);
});
