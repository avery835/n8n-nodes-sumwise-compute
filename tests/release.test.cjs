// Synthetic release regressions. No service key, account, database or model is used.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const fs = require('node:fs');
const util = require('node:util');
require('../scripts/loopback-only.cjs');
const { CredentialTestContext } = require('n8n-core');
const { SumWiseCompute } = require('../dist/nodes/SumWiseCompute/SumWiseCompute.node.js');
const { SumWiseComputeApi } = require('../dist/credentials/SumWiseComputeApi.credentials.js');
const { startMock, SYNTHETIC_KEY } = require('./mock-server.cjs');
const fixtures = require('./fixtures/successes.json');
const problems = require('../nodes/SumWiseCompute/problems.json');
const coreRoot = path.dirname(require.resolve('n8n-core'));
const { getRequestHelperFunctions } = require(path.join(coreRoot, 'execution-engine/node-execution-context/utils/request-helpers'));
const { createNodeAsTool, getSchema } = require(path.join(coreRoot, 'execution-engine/node-execution-context/utils/create-node-as-tool'));
const { convertNodeToAiTool } = require(path.join(path.dirname(require.resolve('n8n/package.json')), 'dist/tool-generation/ai-tools'));
const exactTwo = { ok: true, api_version: 'v1', operation: 'evaluate', engine_version: '0.1.0-mock.1', result: { type: 'integer', text: '2', exactness: 'exact', value: '2' } };
const REFLECTION = 'release-synthetic-1f462ef3f005473095a68d69aeac847d';
const type = new SumWiseCompute();
async function mockFor(t, options = {}) {
  const mock = await startMock({ respond: ({ expression, send }) => send(200, expression === '1+1' ? exactTwo : fixtures[expression]), ...options });
  t.after(() => mock.close()); return mock;
}
async function credentialTest(mock, { key = SYNTHETIC_KEY, timeout = 1000, transport } = {}) {
  const ctx = new CredentialTestContext({});
  const original = ctx.helpers.request; let calls = 0;
  ctx.helpers.request = async options => { calls++; return transport ? transport(options) : original(options); };
  const result = await type.methods.credentialTest.sumWiseCredentialTest.call(ctx, { id:'synthetic', name:'Synthetic only', data:{apiKey:key,serviceOrigin:mock.origin,requestTimeout:timeout} });
  return { result, calls };
}
function noReflection(value) { assert.ok(!util.inspect(value,{depth:12}).includes(REFLECTION)); }
for (const key of [SYNTHETIC_KEY, 'v1', '7/6', 'engine_version', '2']) {
  test('release credential test accepts exact 2 with opaque key case ' + [SYNTHETIC_KEY,'v1','7/6','engine_version','2'].indexOf(key), async t => {
    const mock=await mockFor(t,{key}); const {result,calls}=await credentialTest(mock,{key});
    assert.equal(result.status,'OK'); assert.equal(calls,1);assert.equal(mock.requests.length,1);
    assert.deepEqual(mock.requests[0],{method:'POST',url:'/v1/evaluate',body:'{"expression":"1+1"}',authenticated:true,contentType:'application/json',contentLength:'20',transferEncoding:undefined,authorizationCount:1});
  });
}
for(const [name, body] of [['wrong integer',fixtures['9007199254740993']],['approximate',fixtures.pi],['rational',fixtures['1/3 + 5/6']],['extra field',{...exactTwo,request:{Authorization:REFLECTION}}],['malformed','bad-json']]){
  test('release credential test rejects '+name,async t=>{
    const mock=await mockFor(t,{key:REFLECTION,respond:({send})=>send(200,body)});
    const {result,calls}=await credentialTest(mock,{key:REFLECTION});assert.equal(result.status,'Error');assert.equal(calls,1);noReflection(result);
  });
}
for(const code of ['authentication_required','service_busy','service_unavailable','rate_limit_exceeded','quota_exhausted']){
  test('release credential test distinguishes '+code,async t=>{
    const mock=await mockFor(t,{respond:({send})=>send(problems[code].status,problems[code],{'Retry-After':'17'})});
    const {result,calls}=await credentialTest(mock);assert.equal(result.status,'Error');assert.match(result.message,new RegExp(code));assert.match(result.message,/allowance|quota/);assert.equal(calls,1);assert.equal(mock.requests.length,1);
  });
}
test('release credential test timeout is uncertain and sends once',async t=>{
  const mock=await mockFor(t,{respond:()=>{}});const {result,calls}=await credentialTest(mock);
  assert.equal(result.status,'Error');assert.match(result.message,/timed out/);assert.match(result.message,/uncertain/);assert.equal(calls,1);assert.equal(mock.requests.length,1);
});
test('release credential test never surfaces raw authenticated errors',async()=>{
  const {result,calls}=await credentialTest({origin:'http://127.0.0.1:1'},{key:REFLECTION,transport:()=>{throw Object.assign(new Error(REFLECTION),{config:{headers:{Authorization:REFLECTION}},request:{token:REFLECTION}});}});
  assert.equal(result.status,'Error');assert.match(result.message,/transport/);noReflection(result);assert.equal(calls,1);
});
test('release credential test refuses redirect without forwarding',async t=>{
  const target=await mockFor(t);const mock=await mockFor(t,{respond:({send})=>send(307,'redirect',{Location:target.origin+'/v1/evaluate'})});
  const {result,calls}=await credentialTest(mock);assert.equal(result.status,'Error');assert.match(result.message,/redirect refused/);assert.equal(calls,1);assert.equal(target.requests.length,0);
});
test('release credential test rejects invalid origin and timeout before transport',async()=>{
  for(const origin of ['http://localhost:9','https://example.invalid/path','https://user@example.invalid','http://192.0.2.1']){
    const {result,calls}=await credentialTest({origin});assert.equal(result.status,'Error');assert.equal(calls,0);
  }
  for(const timeout of [0,999,120001,Infinity,1.5]){const {result,calls}=await credentialTest({origin:'http://127.0.0.1:1'},{timeout});assert.equal(result.status,'Error');assert.equal(calls,0);}
});
test('release metadata warns before host save/retest and resolves the five former findings',()=>{
  const credential=new SumWiseComputeApi();const pkg=require('../package.json');
  assert.ok(credential.properties.some(p=>p.type==='notice'&&p.displayName==='Credential testing sends a calculation request. Each accepted test counts toward your request limits.'));
  assert.ok(credential.documentationUrl.endsWith('/docs/CREDENTIALS.md'));assert.equal(type.description.credentials[0].testedBy,'sumWiseCredentialTest');
  assert.ok(type.description.usableAsTool);assert.equal(pkg.license,'MIT');assert.ok(pkg.homepage);assert.equal(pkg.n8n.strict,true);
});
function toolInvocation(mock){
  const toolType=convertNodeToAiTool({description:{...structuredClone(type.description),...type.description.usableAsTool.replacements},execute:type.execute});
  const node={name:'SumWise Tool',type:'n8n-nodes-sumwise-compute.sumWiseComputeTool',typeVersion:1,position:[0,0],parameters:{operation:'evaluate',expression:"={{ $fromAI('expression', 'ASCII expression to evaluate', 'string') }}"}};
  const credentials={apiKey:'v1',serviceOrigin:mock.origin,requestTimeout:1000};
  let calls=0;const argsSeen=[];const items=Object.freeze([Object.freeze({json:Object.freeze({synthetic:true})})]);
  const tool=createNodeAsTool({node,nodeType:toolType,handleToolInvocation:async args=>{
    argsSeen.push(args);
    const ctx={getInputData:()=>items,getNode:()=>node,getNodeParameter:name=>name==='operation'?'evaluate':args.expression,getCredentials:async()=>credentials,continueOnFail:()=>false};
    const helper=getRequestHelperFunctions({},node,{credentialsHelper:{getParentTypes:()=>[],preAuthentication:async()=>undefined,authenticate:async(c,t,o)=>({...o,headers:{...o.headers,Authorization:'Bearer '+c.apiKey}})}});
    ctx.helpers={...helper,httpRequestWithAuthentication:async function(t,o){calls++;return helper.httpRequestWithAuthentication.call(this,t,o);}};
    return await toolType.execute.call(ctx);
  }}).response;
  return {tool,toolType,node,argsSeen,items,get calls(){return calls;}};
}
for(const expression of ['1/3 + 5/6','9007199254740993','pi']){
  test('release generated tool wrapper preserves '+expression,async t=>{
    const mock=await mockFor(t,{key:'v1'});const run=toolInvocation(mock);const [[item]]=await run.tool.invoke({expression});
    assert.deepEqual(item.json.body,fixtures[expression]);assert.deepEqual(item.pairedItem,{item:0});assert.equal(run.calls,1);assert.equal(mock.requests.length,1);assert.deepEqual(run.items,[{json:{synthetic:true}}]);
    assert.deepEqual(run.toolType.description.outputs,['ai_tool']);
  });
}
test('release tool arguments cannot override credential origin, headers or operation',async t=>{
  const mock=await mockFor(t,{key:'v1'});const run=toolInvocation(mock);
  await run.tool.invoke({expression:'1/3 + 5/6',serviceOrigin:'http://192.0.2.1',apiKey:REFLECTION,headers:{Authorization:REFLECTION},operation:'delete',url:'https://example.invalid'});
  assert.deepEqual(run.argsSeen,[{expression:'1/3 + 5/6'}]);assert.equal(run.calls,1);assert.equal(mock.requests[0].authenticated,true);assert.equal(mock.requests[0].method,'POST');assert.equal(mock.requests[0].url,'/v1/evaluate');
  assert.deepEqual(Object.keys(getSchema(run.node).shape),['expression']);
});
test('release tool schema rejects non-string expression without a call',async t=>{
  const mock=await mockFor(t,{key:'v1'});const run=toolInvocation(mock);await assert.rejects(run.tool.invoke({expression:3}));assert.equal(run.calls,0);assert.equal(mock.requests.length,0);
});
test('release isolated state is explicit and cannot select owner or outside destinations',()=>{
  const {root,resolveStateRoot}=require('../scripts/local-n8n.cjs');
  assert.equal(resolveStateRoot(),path.join(root,'.dev'));
  const good=path.join(root,'.review','SUMWISE-N8N-RELEASE-1','synthetic-run','smoke');assert.equal(resolveStateRoot(good),good);
  for(const bad of [path.join(root,'.dev'),path.dirname(root),'.review/SUMWISE-N8N-RELEASE-1','.review/SUMWISE-N8N-RELEASE-1/run/../smoke','.review/SUMWISE-N8N-RELEASE-1/run/smoke:stream'])assert.throws(()=>resolveStateRoot(bad));
});
test('release package check accepts approved public development URL but rejects local development link',()=>{
  const {inspectPackage,expectedFiles}=require('../scripts/check-package-content.cjs');
  const manifest=[{name:'n8n-nodes-sumwise-compute',files:expectedFiles.map(path=>({path}))}];
  const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  assert.equal(inspectPackage(manifest).status,'PASS');
  assert.throws(()=>inspectPackage(manifest,file=>file==='README.md'?'[Development](docs/DEVELOPMENT.md)':read(file)),/provenance|excluded/);
});
test('release package check includes MIT and credential guide while rejecting the release sentinel',()=>{
  const {inspectPackage,expectedFiles}=require('../scripts/check-package-content.cjs');
  assert.ok(expectedFiles.includes('LICENSE'));assert.ok(expectedFiles.includes('docs/CREDENTIALS.md'));
  const manifest=[{name:'n8n-nodes-sumwise-compute',files:expectedFiles.map(path=>({path}))}];
  assert.throws(()=>inspectPackage(manifest,file=>file==='README.md'?REFLECTION:fs.readFileSync(path.join(__dirname,'..',file),'utf8')),/Synthetic test credential/);
});
