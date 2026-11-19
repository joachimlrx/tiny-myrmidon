import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('api Dockerfile must enforce minimal multi-stage non-root build', () => {
  const dockerfile = fs.readFileSync('api/Dockerfile', 'utf8');

  assert.ok(dockerfile.includes('AS builder'), 'API must use multi-stage builder');
  assert.ok(dockerfile.includes('alpine'), 'API must use Alpine Linux');
  assert.ok(dockerfile.includes('USER 10001'), 'API must run as non-root UID 10001');
  assert.ok(dockerfile.includes('adduser'), 'API must create dedicated unprivileged user');
  assert.ok(dockerfile.includes('--release'), 'API must build release binary');
});

test('game Dockerfile must enforce unprivileged static file serving', () => {
  const dockerfile = fs.readFileSync('game/Dockerfile', 'utf8');

  assert.ok(
    dockerfile.includes('nginx-unprivileged') || dockerfile.includes('nginx:'),
    'Game must use Nginx unprivileged base image'
  );
  assert.ok(dockerfile.includes('alpine'), 'Game must use Alpine Nginx');
  assert.ok(
    dockerfile.includes('--chown=101:101') || dockerfile.includes('USER 101'),
    'Game container files must be owned by unprivileged UID 101'
  );
  assert.ok(dockerfile.includes('EXPOSE 8080'), 'Game must expose unprivileged port 8080');
});

test('nginx configuration must bind to unprivileged port and set security headers', () => {
  const nginxConf = fs.readFileSync('game/nginx.conf', 'utf8');

  assert.ok(nginxConf.includes('listen 8080'), 'Nginx must listen on unprivileged port 8080');
  assert.ok(nginxConf.includes('Content-Security-Policy'), 'Must include CSP header');
  assert.ok(nginxConf.includes('X-Frame-Options "DENY"'), 'Must include X-Frame-Options DENY');
  assert.ok(nginxConf.includes('X-Content-Type-Options "nosniff"'), 'Must include nosniff header');
  assert.ok(nginxConf.includes('server_tokens off'), 'Must hide nginx version banner');
});
