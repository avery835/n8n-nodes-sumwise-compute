// Development-only pack gate. Never imported by the shipped node.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { SYNTHETIC_KEY } = require('../tests/mock-server.cjs');
const root = path.resolve(__dirname, '..');
const expectedFiles = Object.freeze([
  'README.md', 'THIRD_PARTY_NOTICES.md', 'LICENSE', 'package.json', 'docs/USAGE.md', 'docs/CREDENTIALS.md',
  'examples/01-exact-result.mock.json', 'examples/02-reconciliation.mock.json',
  'dist/credentials/SumWiseComputeApi.credentials.js',
  'dist/nodes/SumWiseCompute/SumWiseCompute.node.js',
  'dist/nodes/SumWiseCompute/SumWiseCompute.node.json',
  'dist/nodes/SumWiseCompute/transport.js', 'dist/nodes/SumWiseCompute/protocol.js', 'dist/nodes/SumWiseCompute/problems.json',
  'dist/nodes/SumWiseCompute/sumwise.svg', 'dist/nodes/SumWiseCompute/sumwise.dark.svg',
].sort());

function inspectPackage(manifest, readFile = file => fs.readFileSync(path.join(root, file), 'utf8')) {
  assert.ok(Array.isArray(manifest) && manifest.length === 1, 'Expected one npm pack result');
  const pack = manifest[0];
  assert.equal(pack.name, 'n8n-nodes-sumwise-compute', 'Unexpected package identity');
  assert.ok(Array.isArray(pack.files), 'Missing actual npm pack file list');
  const files = pack.files.map(file => file.path).sort();
  // Exact paths also prevent traversal and accidental inclusion of future local outputs.
  assert.deepEqual(files, expectedFiles, 'Distributable file list differs from the reviewed public selection');
  const contents = new Map(files.map(file => [file, readFile(file)]));
  for (const [file, content] of contents) {
    assert.equal(typeof content, 'string', 'Unreadable package content: ' + file);
    assert.ok(!content.includes(SYNTHETIC_KEY) && !/\b(?:r1|release)-synthetic-[a-f0-9]{32}\b/.test(content),
      'Synthetic test credential found in packaged file: ' + file);
    assert.ok(!/\b[A-Za-z]:[\\/]/.test(content), 'Local Windows path found in packaged file: ' + file);
    const localEvidenceText = content.replaceAll('https://github.com/avery835/n8n-nodes-sumwise-compute/blob/main/docs/DEVELOPMENT.md', '[approved public development guide]');
    assert.ok(!/(?:docs[\\/](?:CONTRACT|LOCAL_CANDIDATE_REPORT|U1_REPAIR_REPORT|DEVELOPMENT)\.md|\.review[\\/]|SumWise-compute-contract)/i.test(localEvidenceText),
      'Local provenance/development evidence found in packaged file: ' + file);
    if (file.endsWith('.md')) {
      for (const match of content.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
        const link = match[1];
        if (/^(?:https?:|mailto:|#)/i.test(link)) continue;
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), decodeURIComponent(link.split('#')[0])));
        assert.ok(files.includes(target), 'Packaged documentation links to an excluded file: ' + file);
      }
    }
    if (file.startsWith('examples/')) {
      const workflow = JSON.parse(content);
      for (const node of workflow.nodes) {
        assert.ok(!node.credentials || Object.keys(node.credentials).length === 0, 'Example contains credential references: ' + file);
        if (node.type === 'n8n-nodes-sumwise-compute.sumWiseCompute') {
          assert.equal(node.retryOnFail, false, 'Example must disable Retry On Fail: ' + file);
        }
      }
    }
  }
  const metadata = JSON.parse(contents.get('package.json'));
  assert.notEqual(metadata.private, true, 'Release candidate must allow approved public publication');
  assert.equal(metadata.license, 'MIT', 'Connector MIT license is required');
  for (const field of ['dependencies', 'optionalDependencies', 'bundledDependencies', 'bundleDependencies']) {
    assert.equal(Object.keys(metadata[field] || {}).length, 0, 'Unexpected runtime dependencies');
  }
  assert.deepEqual(metadata.peerDependencies, { 'n8n-workflow': '*' }, 'Expected host-provided peer only');
  return { status: 'PASS', fileCount: files.length, files };
}

function checkPackage() {
  const npmCli = process.env.npm_execpath || path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  assert.ok(fs.existsSync(npmCli), 'Installed npm CLI is missing; no download attempted');
  const result = spawnSync(process.execPath, [npmCli, 'pack', '--dry-run', '--json', '--ignore-scripts', '--offline'], {
    cwd: root, encoding: 'utf8', windowsHide: true, timeout: 120000, maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, npm_config_offline: 'true', npm_config_yes: 'false',
      npm_config_ignore_scripts: 'true', npm_config_audit: 'false', npm_config_fund: 'false',
      npm_config_update_notifier: 'false' },
  });
  assert.ok(!result.error && result.status === 0, 'Offline npm pack dry run failed; no package was published');
  const manifest = JSON.parse(result.stdout);
  return { ...inspectPackage(manifest), packExit: result.status,
    packedBytes: manifest[0].size, unpackedBytes: manifest[0].unpackedSize, pack: manifest[0] };
}
module.exports = { inspectPackage, expectedFiles, checkPackage };
if (require.main === module) {
  try { console.log(JSON.stringify(checkPackage(), null, 2)); }
  catch (error) {
    // Assertions describe only paths/rules; never print actual rejected file content.
    console.error(error.message.split('\n')[0]); process.exitCode = 1;
  }
}
