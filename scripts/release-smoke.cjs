// Model-free, synthetic host smoke. Requires a fresh, explicit isolated output child.
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');const {createHash}=require('node:crypto');
const {root,environment,runN8n,resolveStateRoot}=require('./local-n8n.cjs');
const {startMock,SYNTHETIC_KEY}=require('../tests/mock-server.cjs');
const fixtures=require('../tests/fixtures/successes.json');
const exactTwo={ok:true,api_version:'v1',operation:'evaluate',engine_version:'0.1.0-mock.1',result:{type:'integer',text:'2',exactness:'exact',value:'2'}};
async function worker(origin){
 const core=require('n8n-core');const coreRoot=path.dirname(require.resolve('n8n-core'));const n8nRoot=path.dirname(require.resolve('n8n/package.json'));
 const installed=path.join(process.env.N8N_USER_FOLDER,'.n8n/nodes/node_modules/n8n-nodes-sumwise-compute');
 const loader=new core.PackageDirectoryLoader(installed);await loader.loadAll();
 const type=loader.nodeTypes.sumWiseCompute.type;const cred=loader.credentialTypes.sumWiseComputeApi.type;
 const {CredentialsTester}=require(path.join(n8nRoot,'dist/services/credentials-tester.service'));
 const tester=new CredentialsTester({}, {}, {getByName:()=>cred,getSupportedNodes:()=>['sumWiseCompute'],getParentTypes:()=>[]},{getByName:()=>type},{});
 const testFn=tester.getCredentialTestFunction('sumWiseComputeApi');assert.equal(typeof testFn,'function');
 const tested=await testFn.call(new core.CredentialTestContext({}),{id:'synthetic',name:'MOCK ONLY',data:{apiKey:SYNTHETIC_KEY,serviceOrigin:origin,requestTimeout:1000}});
 assert.equal(tested.status,'OK');
 const {convertNodeToAiTool}=require(path.join(n8nRoot,'dist/tool-generation/ai-tools'));
 const {createNodeAsTool}=require(path.join(coreRoot,'execution-engine/node-execution-context/utils/create-node-as-tool'));
 const {getRequestHelperFunctions}=require(path.join(coreRoot,'execution-engine/node-execution-context/utils/request-helpers'));
 const toolType=convertNodeToAiTool({description:{...structuredClone(type.description),...type.description.usableAsTool.replacements},execute:type.execute});
 assert.deepEqual(toolType.description.outputs,['ai_tool']);
 const node={name:'SumWise Release Tool',type:'n8n-nodes-sumwise-compute.sumWiseComputeTool',typeVersion:1,position:[0,0],parameters:{operation:'evaluate',expression:"={{ $fromAI('expression', 'ASCII expression', 'string') }}"}};
 let calls=0;const items=Object.freeze([Object.freeze({json:Object.freeze({synthetic:true})})]);
 const tool=createNodeAsTool({node,nodeType:toolType,handleToolInvocation:async args=>{
  assert.deepEqual(Object.keys(args),['expression']);
  const ctx={getNode:()=>node,getInputData:()=>items,getNodeParameter:name=>name==='operation'?'evaluate':args.expression,getCredentials:async()=>({apiKey:SYNTHETIC_KEY,serviceOrigin:origin,requestTimeout:1000}),continueOnFail:()=>false};
  const helper=getRequestHelperFunctions({},node,{credentialsHelper:{getParentTypes:()=>[],preAuthentication:async()=>undefined,authenticate:async(c,t,o)=>({...o,headers:{...o.headers,Authorization:'Bearer '+c.apiKey}})}});
  ctx.helpers={...helper,httpRequestWithAuthentication:async function(t,o){calls++;return helper.httpRequestWithAuthentication.call(this,t,o);}};
  return await toolType.execute.call(ctx);
 }}).response;
 const [[item]]=await tool.invoke({expression:'1/3 + 5/6',url:'http://192.0.2.1',operation:'delete'});
 assert.deepEqual(item.json.body,fixtures['1/3 + 5/6']);assert.deepEqual(item.pairedItem,{item:0});assert.equal(calls,1);
 const files=['package.json',...fs.readdirSync(path.join(root,'dist/nodes/SumWiseCompute')).map(f=>'dist/nodes/SumWiseCompute/'+f),'dist/credentials/SumWiseComputeApi.credentials.js'];
 const bindings=files.map(file=>{const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');const sha256=hash(path.join(root,file));assert.equal(hash(path.join(installed,file)),sha256);return {file,sha256};});
 console.log(JSON.stringify({packageLoaded:true,credentialFields:cred.properties.map(p=>p.name),credentialTestResolved:true,credentialTestStatus:tested.status,toolMetadata:true,toolWrapperResult:item.json.body.result,toolHelperCalls:calls,bindings,externalModelUsed:false,ownerSetup:false}));
}
async function main(destination){
 assert.ok(destination,'Supply an explicit fresh isolated state child');const stateRoot=resolveStateRoot(destination);assert.notEqual(stateRoot,path.join(root,'.dev'));assert.ok(!fs.existsSync(stateRoot),'Existing state will not be overwritten');
 const mock=await startMock({respond:({expression,send})=>send(200,expression==='1+1'?exactTwo:fixtures[expression])});const children=new Set();let credentialFile;const commands=[];
 try{
  const env=await environment({stateRoot});assert.equal(env.N8N_USER_FOLDER,path.join(stateRoot,'state'));
  function wait(child,label){children.add(child);return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill();reject(Error('Finite smoke timeout: '+label));},120000);child.once('error',()=>{clearTimeout(timer);children.delete(child);reject(Error('Smoke child failed to start'));});child.once('close',code=>{clearTimeout(timer);children.delete(child);commands.push({label,exitCode:code});code===0?resolve():reject(Error('Smoke command failed: '+label));});});}
  async function cli(args,log){await wait(runN8n(args,{...env,N8N_LOG_LEVEL:'info'},log),args[0]);return fs.readFileSync(path.join(stateRoot,log),'utf8');}
  credentialFile=path.join(stateRoot,'synthetic-credential.json');fs.writeFileSync(credentialFile,JSON.stringify([{id:'SumWiseReleaseMock',name:'SumWise release MOCK ONLY',type:'sumWiseComputeApi',data:{apiKey:SYNTHETIC_KEY,serviceOrigin:mock.origin,requestTimeout:30000}}]));
  await cli(['import:credentials','--input='+credentialFile],'import-credential.log');fs.unlinkSync(credentialFile);credentialFile=undefined;
  const workflows=['01-exact-result.mock.json','02-reconciliation.mock.json'].map(file=>{const wf=JSON.parse(fs.readFileSync(path.join(root,'examples',file),'utf8'));wf.nodes.find(n=>n.type==='n8n-nodes-sumwise-compute.sumWiseCompute').credentials={sumWiseComputeApi:{id:'SumWiseReleaseMock',name:'SumWise release MOCK ONLY'}};return wf;});
  const wfFile=path.join(stateRoot,'mock-workflows.json');fs.writeFileSync(wfFile,JSON.stringify(workflows,null,2));await cli(['import:workflow','--input='+wfFile],'import-workflows.log');
  const runs=[];
  for(const [i,wf] of workflows.entries()){
   const log=await cli(['execute','--id='+wf.id,'--rawOutput'],'execute-'+i+'.log');assert.ok(!log.includes(SYNTHETIC_KEY));const marker=log.search(/\{\r?\n  "data":/);assert.ok(marker>=0);const execution=JSON.parse(log.slice(marker));assert.equal(execution.status,'success');
   const data=execution.data.resultData.runData;const item=data['SumWise Evaluate (select MOCK credential)'][0].data.main[0][0];assert.equal(item.json.body.result.text,i===0?'7/6':'1');assert.deepEqual(item.pairedItem,{item:0});if(i===1){assert.equal(data['Exception — inspect synthetic difference'][0].data.main[0].length,1);assert.equal(data['Matched — exact zero'],undefined);}runs.push({workflow:wf.id,startedAt:execution.startedAt,result:item.json.body.result,pairedItem:item.pairedItem});
  }
  const workerLog=path.join(stateRoot,'credential-tool.log');const handle=fs.openSync(workerLog,'w');const child=spawn(process.execPath,['--no-node-snapshot',__filename,'--worker',mock.origin],{cwd:root,env,windowsHide:true,stdio:['ignore',handle,handle]});fs.closeSync(handle);await wait(child,'credential/tool host interfaces');
  const log=fs.readFileSync(workerLog,'utf8');assert.ok(!log.includes(SYNTHETIC_KEY));const line=log.split(/\r?\n/).find(l=>l.startsWith('{"packageLoaded":'));assert.ok(line,'Host result absent');const host=JSON.parse(line);
  assert.equal(mock.requests.length,4);assert.ok(mock.requests.every(r=>r.authenticated&&r.authorizationCount===1));
  const result={mode:'SYNTHETIC MOCK ONLY',n8nVersion:require('n8n/package.json').version,nativeCommands:commands,runs,host,requests:mock.requests.length,ownerStateTouched:false,realService:false,externalModel:false};
  fs.writeFileSync(path.join(stateRoot,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({status:'PASS',cliWorkflows:2,credentialTest:true,generatedToolWrapper:true,requests:4,ownerStateTouched:false,realService:false,externalModel:false}));
 }finally{for(const child of children)child.kill();if(credentialFile&&fs.existsSync(credentialFile))fs.unlinkSync(credentialFile);await mock.close();}
}
(process.argv[2]==='--worker'?worker(process.argv[3]):main(process.argv[2])).catch(error=>{console.error(error.message.split('\n')[0]);process.exitCode=1;});
