const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { root, environment } = require('./local-n8n.cjs');
const { importMockCredential, importExamples, execute } = require('./mock-demo.cjs');
const { startMock } = require('../tests/mock-server.cjs');

(async () => {
  const mock=await startMock();
  try {
    const env=await environment();
    await importMockCredential(mock.origin,env);
    const workflows=await importExamples(env);
    const exact=await execute(workflows[0].id,env,'execute-exact.log');
    const exactItem=exact['SumWise Evaluate (select MOCK credential)'][0].data.main[0][0];
    assert.equal(exactItem.json.body.result.text,'7/6');
    assert.deepEqual(exactItem.pairedItem,{item:0});
    const recon=await execute(workflows[1].id,env,'execute-reconciliation.log');
    const difference=recon['SumWise Evaluate (select MOCK credential)'][0].data.main[0][0];
    assert.equal(difference.json.body.result.text,'1');
    assert.equal(recon['Exception — inspect synthetic difference'][0].data.main[0].length,1);
    assert.equal(recon['Matched — exact zero'],undefined);
    assert.equal(mock.requests.length,2);
    assert.ok(mock.requests.every(r=>r.authenticated && r.authorizationCount===1));
    const result={mode:'SYNTHETIC MOCK ONLY',n8nVersion:require('n8n/package.json').version,
      workflowsImported:2,executionsPassed:2,requestCount:2,exactText:'7/6',differenceText:'1',exceptionBranch:true,
      ownerAccountCreated:false,liveComputeRequests:0};
    fs.writeFileSync(path.join(root,'.dev','n8n-smoke-result.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result,null,2));
  } finally { await mock.close(); }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
