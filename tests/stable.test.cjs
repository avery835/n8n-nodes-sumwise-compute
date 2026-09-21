// Focused stable-release checks through the installed credential-test framework.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createCredentialRuntime } = require('./credential-runtime.cjs');
const { startMock, SYNTHETIC_KEY } = require('./mock-server.cjs');
const { SumWiseCompute } = require('../dist/nodes/SumWiseCompute/SumWiseCompute.node.js');
const { responseData } = require('../dist/nodes/SumWiseCompute/protocol.js');
const SENTINEL = 'synthetic-stable-credential-415364e0957244e282b9ae620ae6e08e';
const two = { ok: true, api_version: 'v1', operation: 'evaluate', engine_version: '0.1.0-mock.1', result: { type: 'integer', text: '2', exactness: 'exact', value: '2' } };
const runtimePromise = createCredentialRuntime();
const data = (origin, apiKey = SYNTHETIC_KEY, requestTimeout = 1000) => ({ apiKey, serviceOrigin: origin, requestTimeout });
function safe(output) { assert.equal(JSON.stringify(output).includes(SENTINEL), false, 'A synthetic sentinel entered credential output or host log projection'); }
async function mock(t, options = {}) { const server = await startMock(options); t.after(() => server.close()); return server; }

test('stable: installed CredentialsTester resolves credential-file request, not a custom testedBy method', async () => {
  const runtime = await runtimePromise;
  assert.equal(runtime.resolved.testRequest, runtime.credentialType.test);
  assert.equal(typeof runtime.credentialType.authenticate, 'function');
  const node = new SumWiseCompute();
  assert.equal(node.description.credentials[0].testedBy, undefined);
  assert.equal(node.methods?.credentialTest, undefined);
  const notices = runtime.credentialType.properties.filter(p => p.type === 'notice').map(p => p.displayName).join(' ');
  assert.match(notices, /Each accepted test counts toward your request limits/);
  assert.match(notices, /not the calculation result/);
  assert.match(notices, /uncertain/);
});

test('stable: actual credential tester sends one fixed 20-byte POST and preserves caller data', async t => {
  const server = await mock(t, { respond: ({ send }) => send(200, two) });
  const input = Object.freeze(data(server.origin));
  const output = await (await runtimePromise).test(input);
  assert.equal(output.result.status, 'OK');
  assert.deepEqual(input, data(server.origin));
  assert.deepEqual(server.requests, [{ method: 'POST', url: '/v1/evaluate', body: '{"expression":"1+1"}', authenticated: true, contentType: 'application/json', contentLength: '20', transferEncoding: undefined, authorizationCount: 1 }]);
});

for (const status of [401, 429, 500, 777]) {
  test('stable: HTTP ' + status + ' reflection stays out of actual credential result and host log projection', async t => {
    const server = await mock(t, { key: SENTINEL, respond: ({ res }) => {
      res.writeHead(status, SENTINEL, { 'Content-Type': 'application/problem+json', 'X-Request-Id': SENTINEL });
      res.end(JSON.stringify({ message: SENTINEL, request: { Authorization: SENTINEL } }));
    } });
    const output = await (await runtimePromise).test(data(server.origin, SENTINEL));
    assert.equal(output.result.status, 'Error');
    assert.equal(server.requests.length, 1, 'n8n reauthentication must not dispatch a second request');
    assert.match(output.result.message, /uncertain/);
    safe(output);
  });
}

test('stable: credential timeout remains 1000 ms after declarative routing sets its default', async t => {
  const server = await mock(t, { key: SENTINEL, respond: () => {} });
  const started = performance.now();
  const output = await (await runtimePromise).test(data(server.origin, SENTINEL, 1000));
  const elapsed = performance.now() - started;
  assert.equal(output.result.status, 'Error');
  assert.match(output.result.message, /ECONNABORTED|ETIMEDOUT|timeout|timed out/i);
  assert.ok(elapsed >= 900 && elapsed < 4000, 'credential timeout was replaced with the routing default');
  assert.equal(server.requests.length, 1);
  safe(output);
});

for (const origin of ['http://127.1', 'http://2130706433', 'http://[::ffff:127.0.0.1]', 'https://user:pass@example.invalid', 'https://example.invalid/?q=1', 'https://example.invalid/#x', 'https://example.invalid/path']) {
  test('stable: imported credential origin refuses unsafe form ' + origin, async () => {
    const output = await (await runtimePromise).test(data(origin, SENTINEL));
    assert.equal(output.result.status, 'Error');
    assert.match(output.result.message, /origin|configuration/i);
    safe(output);
  });
}

test('stable: malformed HTTP 200 passes only the documented status check, not semantic Evaluate validation', async t => {
  const server = await mock(t, { respond: ({ send }) => send(200, 'not-json') });
  const output = await (await runtimePromise).test(data(server.origin));
  assert.equal(output.result.status, 'OK');
  assert.equal(server.requests.length, 1);
  assert.throws(() => responseData({ statusCode: 200, headers: { 'content-type': 'application/json' }, body: 'not-json' }, SYNTHETIC_KEY), /Malformed/);
});

test('stable: supported auth hook rejects pre-authenticated options without mutating inputs or remembering a key', async () => {
  const authenticate = (await runtimePromise).credentialType.authenticate;
  const credentials = Object.freeze(data('http://127.0.0.1:1', 'v1'));
  const request = Object.freeze({ method: 'POST', url: '/v1/evaluate', body: '{"expression":"1+1"}', headers: Object.freeze({ Accept: 'application/json' }), timeout: 300000 });
  const first = await authenticate(credentials, request);
  assert.equal(first.timeout, 1000);
  assert.equal(first.url, 'http://127.0.0.1:1/v1/evaluate');
  assert.equal(first.headers.Authorization, 'Bearer v1');
  assert.equal(first.headers['Content-Length'], '20');
  assert.equal(first.disableFollowRedirect, true);
  assert.equal(first.skipSslCertificateValidation, false);
  assert.equal(first.sendCredentialsOnCrossOriginRedirect, false);
  assert.equal(request.headers.Authorization, undefined);
  for (const headers of [{ Authorization: 'Bearer v1' }, { authorization: 'Bearer v1' }, { AUTHORIZATION: 'Bearer v1' }]) {
    await assert.rejects(authenticate(credentials, { ...request, headers }), /already authenticated|retry/i);
  }
  await assert.rejects(authenticate(credentials, { ...request, auth: { username: 'synthetic', password: 'synthetic' } }), /already authenticated|retry/i);
  // A new explicit invocation is allowed; this guard has no cross-request key/cache state.
  assert.equal((await authenticate(credentials, request)).headers.Authorization, 'Bearer v1');
});

test('stable: packed smoke cannot disable copying in the owner/default state', async () => {
  const path = require('node:path');
  const { root, environment, resolveStateRoot } = require('../scripts/local-n8n.cjs');
  await assert.rejects(environment({copyBuiltPackage:false}), /explicit isolated test state/);
  await assert.rejects(environment({copyBuiltPackage:'false'}), /explicit isolated test state/);
  assert.equal(resolveStateRoot(),path.join(root,'.dev'));
  const selected=path.join(root,'.review','SW-COMPUTE-N8N-STABLE1','synthetic-run','profile');
  assert.equal(resolveStateRoot(selected),selected);
  for(const invalid of ['.dev','.review/SW-COMPUTE-N8N-STABLE1','.review/SW-COMPUTE-N8N-STABLE1/run/../profile','.review/SW-COMPUTE-N8N-STABLE1/run/profile:stream'])
    assert.throws(()=>resolveStateRoot(invalid));
});
