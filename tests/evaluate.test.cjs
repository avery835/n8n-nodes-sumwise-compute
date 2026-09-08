const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const util = require('node:util');
const { SumWiseCompute } = require('../dist/nodes/SumWiseCompute/SumWiseCompute.node.js');
const { SumWiseComputeApi } = require('../dist/credentials/SumWiseComputeApi.credentials.js');
const { endpoint, requestBody, responseData } = require('../dist/nodes/SumWiseCompute/protocol.js');
const { getRequestHelperFunctions } = require(path.join(path.dirname(require.resolve('n8n-core')), 'execution-engine/node-execution-context/utils/request-helpers'));
const fixtures = require('./fixtures/successes.json');
const problems = require('../nodes/SumWiseCompute/problems.json');
const { startMock, SYNTHETIC_KEY } = require('./mock-server.cjs');

const node = { name: 'SumWise Compute', type: 'n8n-nodes-sumwise-compute.sumWiseCompute', typeVersion: 1, parameters: {}, position: [0, 0] };
function context(mock, expressions, overrides = {}) {
  const credentials = { apiKey: SYNTHETIC_KEY, serviceOrigin: mock.origin, requestTimeout: 1000, ...overrides.credentials };
  const items = expressions.map(expression => Object.freeze({ json: Object.freeze({ expression }) }));
  const calls = [];
  const ctx = {
    getInputData: () => items,
    getNode: () => node,
    getNodeParameter: (name, i) => name === 'operation' ? (overrides.operation || 'evaluate') : expressions[i],
    getCredentials: async () => credentials,
    continueOnFail: () => !!overrides.continueOnFail,
  };
  const helper = getRequestHelperFunctions({}, node, {
    credentialsHelper: {
      getParentTypes: () => [], preAuthentication: async () => undefined,
      // Fixed test credential resolver; the real n8n authenticated helper and HTTP transport run below.
      authenticate: async (creds, type, options) => {
        assert.equal(type, 'sumWiseComputeApi');
        assert.equal(new SumWiseComputeApi().authenticate.properties.headers.Authorization, '=Bearer {{$credentials.apiKey}}');
        return { ...options, headers: { ...options.headers, Authorization: `Bearer ${creds.apiKey}` } };
      },
    },
  });
  ctx.helpers = { ...helper, httpRequestWithAuthentication: async function(type, options) {
    calls.push({ type, ...options });
    if (overrides.transport) return overrides.transport(options);
    return helper.httpRequestWithAuthentication.call(this, type, options);
  } };
  return { ctx, calls, items, run: () => new SumWiseCompute().execute.call(ctx) };
}
async function withMock(t, options) { const mock = await startMock(options); t.after(() => mock.close()); return mock; }
function noSecret(value, secret = SYNTHETIC_KEY) {
  assert.equal(util.inspect(value, { depth: 12 }).includes(secret), false);
  assert.equal(JSON.stringify(value).includes(secret), false);
}

for (const expression of ['1/3 + 5/6', '9007199254740993', 'pi']) {
  test(`real authenticated helper preserves fixture: ${expression}`, async t => {
    const mock = await withMock(t);
    const run = context(mock, [expression]);
    const [[result]] = await run.run();
    assert.deepEqual(result.json.body, fixtures[expression]);
    assert.deepEqual(result.pairedItem, { item: 0 });
    assert.equal(result.json.headers['x-request-id'], 'mock-1');
    assert.equal(mock.requests.length, 1);
    assert.deepEqual(mock.requests[0], {method:'POST',url:'/v1/evaluate',body:JSON.stringify({expression}),authenticated:true,
      contentType:'application/json',contentLength:String(Buffer.byteLength(JSON.stringify({expression}))),transferEncoding:undefined,authorizationCount:1});
    assert.equal(run.calls[0].disableFollowRedirect, true);
    assert.equal(run.calls[0].skipSslCertificateValidation, false);
    assert.equal(run.calls[0].timeout, 1000);
    noSecret(result);
  });
}

test('multiple items are sequential, linked and never mutated', async t => {
  const mock = await withMock(t, { respond: async ({ expression, send }) => {
    await new Promise(resolve => setTimeout(resolve, 25)); send(200, fixtures[expression]);
  } });
  const expressions = ['pi', '1/3 + 5/6', '9007199254740993'];
  const run = context(mock, expressions);
  const [results] = await run.run();
  assert.deepEqual(results.map(r => r.json.body), expressions.map(e => fixtures[e]));
  assert.deepEqual(results.map(r => r.pairedItem.item), [0,1,2]);
  assert.equal(mock.maxActive, 1);
  assert.deepEqual(run.items.map(i => i.json.expression), expressions);
});

for (const [name, expression] of [['number',42],['object',{}],['null',null],['empty',''],['whitespace',' \t'],['non-ASCII','π'],['body limit','1'.repeat(4096)]]) {
  test(`malformed input rejected before request: ${name}`, async () => {
    const run = context({origin:'http://127.0.0.1:1'}, [expression]);
    await assert.rejects(run.run(), error => { noSecret(error); return error.name === 'NodeOperationError' && error.context.itemIndex === 0; });
    assert.equal(run.calls.length, 0);
  });
}
test('4096-byte inclusive body limit accounts for JSON escaping', () => {
  assert.equal(requestBody('1'.repeat(4079)).length,4096);
  assert.throws(() => requestBody('1'.repeat(4080)));
  assert.throws(() => requestBody('"'.repeat(2040)));
  assert.equal(requestBody('1\n+2'), '{"expression":"1\\n+2"}');
});

for (const [code, problem] of Object.entries(problems)) {
  test(`contract problem is an error without retry: ${code}`, async t => {
    const mock = await withMock(t,{respond:({send}) => send(problem.status,problem,
      ['rate_limit_exceeded','quota_exhausted'].includes(code) ? {'Retry-After':'17'} : {})});
    const [[result]] = await context(mock,['1/3 + 5/6'],{continueOnFail:true}).run();
    assert.equal(result.json.code,code);
    assert.equal(result.json.statusCode,problem.status);
    assert.deepEqual(result.json.problem,problem);
    assert.equal(result.json.body,undefined);
    assert.equal(result.error.name,'NodeOperationError');
    assert.equal(mock.requests.length,1);
    if (code === 'rate_limit_exceeded' || code === 'quota_exhausted') assert.equal(result.json.headers['retry-after'],'17');
    noSecret(result);
  });
}

test('wrong synthetic API key returns 401 once through real helper', async t => {
  const mock = await withMock(t);
  const [[result]] = await context(mock,['pi'],{credentials:{apiKey:'wrong-synthetic-key'},continueOnFail:true}).run();
  assert.equal(result.json.code,'authentication_required');
  assert.equal(mock.requests.length,1);
  assert.equal(mock.requests[0].authenticated,false);
});
test('continue-on-error proceeds with correct original item indices', async t => {
  const mock = await withMock(t);
  const [results] = await context(mock,['pi','1/0','1/3 + 5/6'],{continueOnFail:true}).run();
  assert.deepEqual(results.map(r => r.pairedItem.item),[0,1,2]);
  assert.equal(results[1].json.code,'domain_error');
  assert.equal(results[2].json.body.result.text,'7/6');
});
test('normal error mode stops at failing item', async t => {
  const mock = await withMock(t);
  await assert.rejects(context(mock,['pi','1/0','pi']).run(), e => e.context.itemIndex === 1 && e.message.includes('domain_error'));
  assert.equal(mock.requests.length,2);
});
test('real transport timeout has uncertain completion and no automatic retry', async t => {
  const mock = await withMock(t,{respond:() => { /* Never send a response. */ }});
  const [[result]] = await context(mock,['pi'],{continueOnFail:true}).run();
  assert.equal(result.json.code,'transport_timeout');
  assert.match(result.json.detail,/uncertain/);
  assert.equal(mock.requests.length,1);
  noSecret(result);
});
test('raw authenticated transport error never surfaces its cause, URL, headers or token', async () => {
  const error = Object.assign(new Error(`unsafe ${SYNTHETIC_KEY}`),{code:'ECONNRESET',request:{headers:{Authorization:SYNTHETIC_KEY}}});
  const [[result]] = await context({origin:'http://127.0.0.1:1'},['pi'],{continueOnFail:true,transport:() => { throw error; }}).run();
  assert.equal(result.json.code,'transport_error'); noSecret(result);
});

test('cross-origin redirect is refused and target receives no request or token', async t => {
  const target = await withMock(t);
  const source = await withMock(t,{respond:({send}) => send(307,'',{Location:`${target.origin}/v1/evaluate`})});
  const [[result]] = await context(source,['pi'],{continueOnFail:true}).run();
  assert.equal(result.json.code,'redirect_refused');
  assert.equal(source.requests.length,1); assert.equal(target.requests.length,0);
});

for (const origin of ['http://localhost:1234','http://example.com','http://192.168.1.2','http://127.1','http://2130706433','http://0x7f000001','http://127.0.0.1.example.com',
  'http://[::ffff:127.0.0.1]','https://user:pass@example.com','https://example.com/path','https://example.com?x=1','https://example.com#x','https://example.com\\x',' https://example.com','ftp://127.0.0.1']) {
  test(`endpoint rejects: ${origin}`, () => assert.throws(() => endpoint(origin)));
}
test('documented HTTPS default and explicit literal loopbacks are accepted without requests', () => {
  assert.equal(endpoint('https://api.sumwisecalc.com'), 'https://api.sumwisecalc.com/v1/evaluate');
  assert.equal(endpoint('http://127.0.0.1:1234/'), 'http://127.0.0.1:1234/v1/evaluate');
  assert.equal(endpoint('http://[::1]:1234'), 'http://[::1]:1234/v1/evaluate');
});

const good = fixtures['pi'];
const malformed = [null,{},'not json', { ...good, ok:false }, { ...good, extra:true }, { ...good, engine_version:'invalid' },
  {...good,result:{...good.result,value:3.14}}, {...good,result:{...good.result,exactness:'exact'}},
  {...good,result:{...good.result,value:'1e999',text:'1e999'}}, {...good,result:{...good.result,value:'NaN',text:'NaN'}},
  {...fixtures['9007199254740993'], result:{type:'integer',exactness:'exact',text:'9007199254740993',value:9007199254740993}},
  {...fixtures['1/3 + 5/6'],result:{type:'rational',exactness:'exact',text:'7/6',value:{numerator:'7',denominator:6}}}];
malformed.forEach((body,i) => test(`malformed success rejected: ${i+1}`, () => {
  assert.throws(() => responseData({statusCode:200,headers:{'content-type':'application/json'},body},SYNTHETIC_KEY), e => e.info.code === 'malformed_response');
}));
test('unexpected problem content and reflective headers are sanitized', async t => {
  const mock = await withMock(t,{respond:({send}) => send(401,{...problems.authentication_required,detail:SYNTHETIC_KEY},{'X-Request-Id':SYNTHETIC_KEY})});
  const [[result]] = await context(mock,['pi'],{continueOnFail:true}).run();
  assert.equal(result.json.code,'malformed_response');
  assert.equal(result.json.headers['x-request-id'],'[REDACTED]'); noSecret(result);
});
test('empty input performs no requests',async () => {
  const run = context({origin:'http://127.0.0.1:1'},[]);
  assert.deepEqual(await run.run(),[[]]); assert.equal(run.calls.length,0);
});

// R1: collision values are legitimate text, not a substring-leak oracle.
const REFLECTION_SENTINEL = 'r1-synthetic-8d70e495f32648b5aa7cd39f0261e8bc';
for (const key of ['v1', '7/6', 'engine_version']) {
  test('R1: collision key ' + key + ' preserves rational success', async t => {
    const mock = await withMock(t, { key });
    const run = context(mock, ['1/3 + 5/6'], { credentials: { apiKey: key } });
    const [[item]] = await run.run();
    assert.deepEqual(item.json.body, fixtures['1/3 + 5/6']);
    assert.deepEqual(item.pairedItem, { item: 0 });
    assert.equal(run.calls.length, 1); assert.equal(mock.requests.length, 1);
    assert.equal(mock.requests[0].authenticated, true);
    assert.equal(mock.requests[0].authorizationCount, 1);
    assert.deepEqual(run.items, [{ json: { expression: '1/3 + 5/6' } }]);
  });
}
test('R1: coincident substring preserves all families, sequencing and linkage', async t => {
  const expressions = ['(10501) - (10500)', '9007199254740993', 'pi', '1/3 + 5/6'];
  const mock = await withMock(t, { key: '1', respond: async ({ expression, send }) => {
    await new Promise(resolve => setTimeout(resolve, 15)); send(200, fixtures[expression]);
  } });
  const run = context(mock, expressions, { credentials: { apiKey: '1' } });
  const [items] = await run.run();
  assert.deepEqual(items.map(item => item.json.body), expressions.map(expression => fixtures[expression]));
  assert.deepEqual(items.map(item => item.pairedItem.item), [0, 1, 2, 3]);
  assert.deepEqual(run.items.map(item => item.json.expression), expressions);
  assert.equal(run.calls.length, 4); assert.equal(mock.requests.length, 4); assert.equal(mock.maxActive, 1);
  assert.equal(typeof items[1].json.body.result.value, 'string');
  assert.equal(items[2].json.body.result.exactness, 'approximate');
  assert.equal(items[0].json.headers['x-request-id'], '[REDACTED]');
});
for (const field of ['request', 'result']) {
  test('R1: unauthorized ' + field + ' data in success is rejected without reflection', async t => {
    const good = fixtures['1/3 + 5/6'];
    const reflected = { headers: { Authorization: 'Bearer ' + REFLECTION_SENTINEL } };
    const body = field === 'request' ? { ...good, request: reflected } : { ...good, result: { ...good.result, request: reflected } };
    const mock = await withMock(t, { key: REFLECTION_SENTINEL, respond: ({ send }) => send(200, body) });
    const [[item]] = await context(mock, ['1/3 + 5/6'], { credentials: { apiKey: REFLECTION_SENTINEL }, continueOnFail: true }).run();
    assert.equal(item.json.code, 'malformed_response'); assert.equal(item.json.body, undefined);
    assert.deepEqual(item.pairedItem, { item: 0 }); assert.equal(mock.requests.length, 1); noSecret(item, REFLECTION_SENTINEL);
  });
}
for (const continueOnFail of [false, true]) {
  test('R1: raw authenticated helper error is sanitized; continue=' + continueOnFail, async () => {
    const error = Object.assign(new Error('unsafe ' + REFLECTION_SENTINEL), {
      code: 'ECONNRESET', config: { headers: { Authorization: REFLECTION_SENTINEL } },
      request: { headers: { Authorization: REFLECTION_SENTINEL } }, headers: { Authorization: REFLECTION_SENTINEL },
      cause: new Error(REFLECTION_SENTINEL),
    });
    const run = context({ origin: 'http://127.0.0.1:1' }, ['pi'], {
      credentials: { apiKey: REFLECTION_SENTINEL }, continueOnFail, transport: () => { throw error; },
    });
    if (continueOnFail) {
      const [[item]] = await run.run();
      assert.equal(item.json.code, 'transport_error'); assert.match(item.json.detail, /uncertain/);
      const [guidance, diagnostics] = item.error.description.split('\n\nDetails: ');
      assert.match(guidance, /uncertain/);
      assert.deepEqual(JSON.parse(diagnostics), { code: item.json.code, detail: item.json.detail });
      assert.equal(item.json.body, undefined); assert.deepEqual(item.pairedItem, { item: 0 }); noSecret(item, REFLECTION_SENTINEL);
    } else {
      await assert.rejects(run.run(), surfaced => {
        noSecret(surfaced, REFLECTION_SENTINEL);
        return surfaced.name === 'NodeOperationError' && surfaced.context.itemIndex === 0;
      });
    }
    assert.equal(run.calls.length, 1); assert.deepEqual(run.items, [{ json: { expression: 'pi' } }]);
  });
}
test('R1: reflective optional metadata does not reject valid calculation', async t => {
  const mock = await withMock(t, { key: REFLECTION_SENTINEL, respond: ({ send }) => send(200, fixtures.pi, {
    'X-Request-Id': 'reflected-' + REFLECTION_SENTINEL, Authorization: REFLECTION_SENTINEL, 'X-Request-Config': REFLECTION_SENTINEL,
  }) });
  const [[item]] = await context(mock, ['pi'], { credentials: { apiKey: REFLECTION_SENTINEL } }).run();
  assert.deepEqual(item.json.body, fixtures.pi); assert.deepEqual(item.json.headers, { 'x-request-id': '[REDACTED]' });
  assert.equal(mock.requests.length, 1); noSecret(item, REFLECTION_SENTINEL);
});
for (const unexpectedDetail of [false, true]) {
  test('R1: public problem and reflective metadata; unexpectedDetail=' + unexpectedDetail, async t => {
    const body = unexpectedDetail ? { ...problems.rate_limit_exceeded, detail: REFLECTION_SENTINEL } : problems.rate_limit_exceeded;
    const mock = await withMock(t, { key: REFLECTION_SENTINEL, respond: ({ send }) => send(429, body, {
      'Retry-After': '17', 'X-Request-Id': REFLECTION_SENTINEL, Authorization: REFLECTION_SENTINEL,
    }) });
    const [[item]] = await context(mock, ['pi'], { credentials: { apiKey: REFLECTION_SENTINEL }, continueOnFail: true }).run();
    assert.equal(item.json.code, unexpectedDetail ? 'malformed_response' : 'rate_limit_exceeded');
    assert.deepEqual(item.json.headers, { 'retry-after': '17', 'x-request-id': '[REDACTED]' });
    if (!unexpectedDetail) assert.deepEqual(item.json.problem, problems.rate_limit_exceeded);
    assert.equal(item.json.body, undefined); assert.equal(mock.requests.length, 1); noSecret(item, REFLECTION_SENTINEL);
  });
}
for (const continueOnFail of [false, true]) {
  test('R1: collision success followed by domain error; continue=' + continueOnFail, async t => {
    const mock = await withMock(t, { key: 'v1' });
    const run = context(mock, ['1/3 + 5/6', '1/0', 'pi'], { credentials: { apiKey: 'v1' }, continueOnFail });
    if (continueOnFail) {
      const [items] = await run.run();
      assert.deepEqual(items.map(item => item.pairedItem.item), [0, 1, 2]);
      assert.deepEqual(items[0].json.body, fixtures['1/3 + 5/6']); assert.equal(items[1].json.code, 'domain_error');
      assert.deepEqual(items[2].json.body, fixtures.pi); assert.equal(mock.requests.length, 3);
    } else {
      await assert.rejects(run.run(), error => error.context.itemIndex === 1 && error.message.includes('domain_error'));
      assert.equal(mock.requests.length, 2);
    }
    assert.equal(run.calls.length, mock.requests.length);
  });
}


// The package gate checks actual pack output separately; these negative cases
// ensure its content/path rules keep catching the reported boundary regressions.
const fs = require('node:fs');
const { inspectPackage, expectedFiles } = require('../scripts/check-package-content.cjs');
const packageFixture = () => [{ name: 'n8n-nodes-sumwise-compute', files: expectedFiles.map(file => ({ path: file })) }];
const readPublicFile = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
test('R1: package gate rejects a local provenance file', () => {
  const manifest = packageFixture(); manifest[0].files.push({ path: 'docs/CONTRACT.md' });
  assert.throws(() => inspectPackage(manifest), /Distributable file list/);
});
test('R1: package gate requires the third-party notice', () => {
  const manifest = packageFixture();
  manifest[0].files = manifest[0].files.filter(file => file.path !== 'THIRD_PARTY_NOTICES.md');
  assert.throws(() => inspectPackage(manifest), /Distributable file list/);
});
for (const [name, content, expected] of [
  ['synthetic credential', SYNTHETIC_KEY, /Synthetic test credential/],
  ['local path', 'Synthetic local checkout: ' + 'Z:' + String.fromCharCode(92) + 'fixture', /Local Windows path/],
  ['broken relative link', '[More help](docs/missing.md)', /excluded file/],
]) {
  test('R1: automatically included README is checked for ' + name, () => {
    assert.throws(() => inspectPackage(packageFixture(), file => file === 'README.md' ? content : readPublicFile(file)), expected);
  });
}
const { root: projectRoot, resolveStateRoot } = require('../scripts/local-n8n.cjs');
test('R1: optional smoke state rejects owner, outside, root-only and traversal destinations', () => {
  for (const stateRoot of [path.dirname(projectRoot), path.join(projectRoot, '.dev'),
    path.join(projectRoot, '.review', 'SUMWISE-N8N-R1'), '.review/SUMWISE-N8N-R1/run/../child',
    '.review/SUMWISE-N8N-R1/run/child:stream', '']) {
    assert.throws(() => resolveStateRoot(stateRoot), /state|State/);
  }
});
test('R1: morning preview default is unchanged and isolated selection is explicit', () => {
  assert.equal(resolveStateRoot(), path.join(projectRoot, '.dev'));
  const selected = path.join(projectRoot, '.review', 'SUMWISE-N8N-R1', 'unit-probe', 'state');
  assert.equal(resolveStateRoot(selected), selected);
});
