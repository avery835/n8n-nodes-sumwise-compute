const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { root, command } = require('./local-n8n.cjs');
const { SYNTHETIC_KEY } = require('../tests/mock-server.cjs');
const credentialId = 'SumWiseLocalMock1';

async function importMockCredential(origin, env) {
  if (!/^http:\/\/127\.0\.0\.1:[1-9][0-9]*$/.test(origin)) throw new Error('Mock credential requires loopback');
  const file = path.join(root,'.dev','mock-credential.json');
  fs.writeFileSync(file,JSON.stringify([{id:credentialId,name:'SumWise MOCK ONLY — synthetic',type:'sumWiseComputeApi',
    data:{apiKey:SYNTHETIC_KEY,serviceOrigin:origin,requestTimeout:30000}}]));
  try { await command(['import:credentials',`--input=${file}`],env,'import-credential.log'); }
  finally { fs.unlinkSync(file); }
}
async function importExamples(env) {
  const workflows = ['01-exact-result.mock.json','02-reconciliation.mock.json'].map(file => {
    const workflow=JSON.parse(fs.readFileSync(path.join(root,'examples',file),'utf8'));
    workflow.nodes.find(n=>n.type==='n8n-nodes-sumwise-compute.sumWiseCompute').credentials = {
      sumWiseComputeApi:{id:credentialId,name:'SumWise MOCK ONLY — synthetic'},
    };
    return workflow;
  });
  const file=path.join(root,'.dev','mock-workflows.json');
  fs.writeFileSync(file,JSON.stringify(workflows,null,2));
  await command(['import:workflow',`--input=${file}`],env,'import-workflows.log');
  return workflows;
}
async function execute(id, env, logName) {
  await command(['execute',`--id=${id}`,'--rawOutput'],env,logName);
  const log=fs.readFileSync(path.join(root,'.dev',logName),'utf8');
  assert.equal(log.includes(SYNTHETIC_KEY),false,'Synthetic credential leaked into execution log');
  const start=log.indexOf('{\n  "data":');
  assert.ok(start>=0,`No execution JSON in .dev/${logName}`);
  const result=JSON.parse(log.slice(start));
  assert.equal(result.data.resultData.error,undefined);
  return result.data.resultData.runData;
}
module.exports={importMockCredential,importExamples,execute};
