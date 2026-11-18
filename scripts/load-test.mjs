const baseUrl = (process.env.LOAD_TEST_URL || 'http://localhost:8080').replace(/\/$/, '');
const requestCount = Number.parseInt(process.env.LOAD_TEST_REQUESTS || '200', 10);
const concurrency = Number.parseInt(process.env.LOAD_TEST_CONCURRENCY || '20', 10);

if (!Number.isInteger(requestCount) || requestCount < 1) {
  throw new Error('LOAD_TEST_REQUESTS must be a positive integer');
}
if (!Number.isInteger(concurrency) || concurrency < 1) {
  throw new Error('LOAD_TEST_CONCURRENCY must be a positive integer');
}

const durations = [];
let nextRequest = 0;
let failures = 0;

async function worker() {
  while (nextRequest < requestCount) {
    nextRequest += 1;
    const startedAt = performance.now();

    try {
      const response = await fetch(baseUrl + '/api/scores');
      if (!response.ok) failures += 1;
      await response.arrayBuffer();
    } catch {
      failures += 1;
    } finally {
      durations.push(performance.now() - startedAt);
    }
  }
}

const startedAt = performance.now();
await Promise.all(Array.from({ length: Math.min(concurrency, requestCount) }, () => worker()));
const elapsedMs = performance.now() - startedAt;
durations.sort((left, right) => left - right);

function percentile(value) {
  return durations[Math.min(Math.ceil(value * durations.length) - 1, durations.length - 1)];
}

console.log('Target: ' + baseUrl + '/api/scores');
console.log('Requests: ' + requestCount + '; concurrency: ' + concurrency);
console.log('Duration: ' + (elapsedMs / 1000).toFixed(2) + 's; throughput: ' + (requestCount / (elapsedMs / 1000)).toFixed(1) + ' req/s');
console.log('Latency: p50 ' + percentile(0.50).toFixed(1) + 'ms; p95 ' + percentile(0.95).toFixed(1) + 'ms; p99 ' + percentile(0.99).toFixed(1) + 'ms');
console.log('Failures: ' + failures);

if (failures > 0) process.exitCode = 1;
