import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function loadYamlDocs(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Simple multi-document yaml parser for standard Kubernetes manifests
  return content
    .split(/^---$/m)
    .map(doc => doc.trim())
    .filter(Boolean)
    .map(doc => {
      const lines = doc.split('\n');
      const apiVersionLine = lines.find(l => l.startsWith('apiVersion:'));
      const kindLine = lines.find(l => l.startsWith('kind:'));
      const nameLine = lines.find(l => /^\s*name:/.test(l));
      return {
        raw: doc,
        apiVersion: apiVersionLine ? apiVersionLine.split(':')[1].trim() : '',
        kind: kindLine ? kindLine.split(':')[1].trim() : '',
        name: nameLine ? nameLine.split(':')[1].trim() : '',
      };
    });
}

test('k8s manifests must define required core resources', () => {
  const k8sFile = path.resolve('k8s/app.yaml');
  assert.ok(fs.existsSync(k8sFile), 'k8s/app.yaml must exist');

  const docs = loadYamlDocs(k8sFile);
  const kinds = docs.map(d => d.kind);

  assert.ok(kinds.includes('Deployment'), 'Must contain Deployment');
  assert.ok(kinds.includes('Service'), 'Must contain Service');
  assert.ok(kinds.includes('Ingress'), 'Must contain Ingress');
  assert.ok(kinds.includes('PersistentVolumeClaim'), 'Must contain PersistentVolumeClaim');
  assert.ok(kinds.includes('NetworkPolicy'), 'Must contain NetworkPolicy');
});

test('k8s deployments must enforce strict non-root and capability dropping', () => {
  const content = fs.readFileSync('k8s/app.yaml', 'utf8');

  // Security Context assertions
  assert.ok(content.includes('runAsNonRoot: true'), 'All containers must run as non-root');
  assert.ok(content.includes('allowPrivilegeEscalation: false'), 'Must disallow privilege escalation');
  assert.ok(content.includes('drop:'), 'Must specify capabilities drop');
  assert.ok(content.includes('- ALL'), 'Must drop ALL capabilities');
  assert.ok(content.includes('readOnlyRootFilesystem: true'), 'API must have readOnlyRootFilesystem');
});

test('k8s deployments must define resource requests and limits', () => {
  const content = fs.readFileSync('k8s/app.yaml', 'utf8');

  assert.ok(content.includes('limits:'), 'Must specify resource limits');
  assert.ok(content.includes('requests:'), 'Must specify resource requests');
  assert.ok(content.includes('cpu:'), 'Must define CPU quotas');
  assert.ok(content.includes('memory:'), 'Must define Memory quotas');
});

test('k8s deployments must have health check probes configured', () => {
  const content = fs.readFileSync('k8s/app.yaml', 'utf8');

  assert.ok(content.includes('livenessProbe:'), 'Must specify livenessProbe');
  assert.ok(content.includes('readinessProbe:'), 'Must specify readinessProbe');
  assert.ok(content.includes('/api/health'), 'Must probe /api/health endpoint');
});

test('k8s network policies must restrict ingress to Traefik gateway', () => {
  const content = fs.readFileSync('k8s/app.yaml', 'utf8');

  assert.ok(content.includes('kind: NetworkPolicy'), 'Must define NetworkPolicies');
  assert.ok(content.includes('traefik'), 'Ingress must be isolated to Traefik ingress controller');
  assert.ok(content.includes('kube-system'), 'Must reference kube-system namespace');
});

test('k8s PVC must use ReadWriteOnce and bounded storage', () => {
  const content = fs.readFileSync('k8s/app.yaml', 'utf8');

  assert.ok(content.includes('ReadWriteOnce'), 'PVC must use ReadWriteOnce access mode');
  assert.ok(content.includes('tiny-myrmidon-leaderboard'), 'Must define leaderboard PVC');
});
