const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const runtime = fs.readFileSync(require('node:path').join(__dirname, '../runtime-config.js'), 'utf8');
const deployment = JSON.parse(fs.readFileSync(require('node:path').join(__dirname, '../vercel.json'), 'utf8'));
function run(hostname, origin) {
  const window = {location: {hostname, origin}};
  vm.runInNewContext(runtime, {window});
  return window.AF_RUNTIME;
}

test('production storefront requests public bootstrap through its own origin', () => {
  const cfg = run('afterform-lovat.vercel.app', 'https://afterform-lovat.vercel.app');
  assert.equal(cfg.apiBaseUrl, 'https://afterform-lovat.vercel.app');
  assert.equal(cfg.defaultStore, 'afterform');
  assert.ok(cfg.timeoutMs >= 4000);
});

test('local and preview environments keep safe demo fallback', () => {
  assert.equal(run('localhost', 'http://localhost:8137').apiBaseUrl, '');
  assert.equal(run('afterform-git-feat-123.vercel.app', 'https://afterform-git-feat-123.vercel.app').apiBaseUrl, '');
});

test('Vercel proxies only public Catalog read paths and deploys main only', () => {
  assert.deepEqual(deployment.rewrites, [{
    source: '/api/v1/public/:path*',
    destination: 'https://afterform-be.vercel.app/api/v1/public/:path*'
  }]);
  assert.equal(deployment.git.deploymentEnabled.main, true);
  assert.equal(deployment.git.deploymentEnabled['**'], false);
  assert.equal(deployment.rewrites.some(rule => rule.source.includes('/admin')), false);
});
