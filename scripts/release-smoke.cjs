// Model-free, synthetic host smoke. Explicit fresh isolated state; optional exact local tarball.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{createHash}=require('node:crypto');
const {root,environment,runN8n,resolveStateRoot}=require('./local-n8n.cjs');
const {startMock,SYNTHETIC_KEY}=require('../tests/mock-server.cjs');
const {expectedFiles,inspectPackage}=require('./check-package-content.cjs');
const fixtures=require('../tests/fixtures/successes.json');
const exactTwo={ok:true,api_version:'v1',operation:'evaluate',engine_version:'0.1.0-mock.1',result:{type:'integer',text:'2',exactness:'exact',value:'2'}};
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
function inventory(folder){
 const files=[];
 function visit(directory,prefix=''){
  for(const item of fs.readdirSync(directory,{withFileTypes:true})){
   assert.ok(!item.isSymbolicLink(),'Package must not contain symlinks');const relative=prefix+item.name;
   if(item.isDirectory())visit(path.join(directory,item.name),relative+'/');else{assert.ok(item.isFile(),'Unexpected package entry');files.push(relative);}
  }
 }
 visit(folder);return files.sort();
}
function verifyInstalled(installed,record){
 assert.deepEqual(inventory(installed),record.bindings.map(row=>row.file).sort(),'Installed package file inventory changed');
 for(const row of record.bindings)assert.equal(sha256(fs.readFileSync(path.join(installed,row.file))),row.sha256,'Installed package bytes changed: '+row.file);
 return record.bindings;
}
async function archiveRecord(archive,stateRoot){
 const allowedRun=path.dirname(stateRoot),resolved=path.resolve(root,archive),relative=path.relative(allowedRun,resolved);
 assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative)&&path.extname(resolved)==='.tgz','Tarball must be a local .tgz in the same approved run');
 let cursor=root;
 for(const part of path.relative(root,resolved).split(path.sep)){cursor=path.join(cursor,part);assert.ok(!fs.lstatSync(cursor).isSymbolicLink(),'Tarball path must not use symlinks');}
 assert.ok(fs.statSync(resolved).isFile(),'Expected local tarball');
 const entries=[];const contents=new Map();
 await require('tar').t({file:resolved,strict:true,onReadEntry(entry){
  assert.equal(entry.type,'File','Archive must contain only regular reviewed files');
  assert.ok(entry.path.startsWith('package/'),'Unexpected archive root');const file=entry.path.slice(8);
  assert.ok(expectedFiles.includes(file)&&!contents.has(file),'Unexpected or duplicate archived file');
  const chunks=[];entry.on('data',chunk=>chunks.push(chunk));entry.on('end',()=>{const bytes=Buffer.concat(chunks);contents.set(file,bytes);entries.push({file,sha256:sha256(bytes)});});
 }});
 assert.deepEqual(entries.map(row=>row.file).sort(),expectedFiles,'Archive inventory differs from reviewed package selection');
 inspectPackage([{name:'n8n-nodes-sumwise-compute',files:entries.map(row=>({path:row.file}))}],file=>contents.get(file).toString('utf8'));
 for(const row of entries)assert.equal(sha256(fs.readFileSync(path.join(root,row.file))),row.sha256,'Archive differs from current qualified file: '+row.file);
 return {mode:'OFFLINE TARBALL INSTALL',archive:path.basename(resolved),archiveSha256:sha256(fs.readFileSync(resolved)),archivePath:resolved,bindings:entries.sort((a,b)=>a.file.localeCompare(b.file))};
}
async function worker(origin,bindingFile){
 const coreRoot=path.dirname(require.resolve('n8n-core')),n8nRoot=path.dirname(require.resolve('n8n/package.json'));
 const installed=path.join(process.env.N8N_USER_FOLDER,'.n8n/nodes/node_modules/n8n-nodes-sumwise-compute');
 const record=JSON.parse(fs.readFileSync(bindingFile,'utf8'));verifyInstalled(installed,record);
 const {createCredentialRuntime}=require('../tests/credential-runtime.cjs');
 const runtime=await createCredentialRuntime({packageRoot:installed});
 const type=runtime.loader.nodeTypes.sumWiseCompute.type,cred=runtime.credentialType;
 assert.equal(runtime.resolved.testRequest,cred.test);
 const credentials={apiKey:SYNTHETIC_KEY,serviceOrigin:origin,requestTimeout:1000};
 const tested=await runtime.test(credentials);assert.equal(tested.result.status,'OK');assert.ok(!JSON.stringify(tested).includes(SYNTHETIC_KEY));
 const {convertNodeToAiTool}=require(path.join(n8nRoot,'dist/tool-generation/ai-tools'));
 const {createNodeAsTool}=require(path.join(coreRoot,'execution-engine/node-execution-context/utils/create-node-as-tool'));
 const {getRequestHelperFunctions}=require(path.join(coreRoot,'execution-engine/node-execution-context/utils/request-helpers'));
 let calls=0;const items=Object.freeze([Object.freeze({json:Object.freeze({synthetic:true})})]);
 function context(node,expression){
  const ctx={getNode:()=>node,getInputData:()=>items,getNodeParameter:name=>name==='operation'?'evaluate':expression,getCredentials:async()=>credentials,continueOnFail:()=>false};
  const helper=getRequestHelperFunctions({},node,{credentialsHelper:{getParentTypes:()=>[],preAuthentication:async()=>undefined,authenticate:async(c,t,o)=>cred.authenticate(c,o)}});
  ctx.helpers={...helper,httpRequestWithAuthentication:async function(t,o){calls++;return helper.httpRequestWithAuthentication.call(this,t,o);}};return ctx;
 }
 const normalNode={name:'SumWise typed result smoke',type:'n8n-nodes-sumwise-compute.sumWiseCompute',typeVersion:1,position:[0,0],parameters:{operation:'evaluate',expression:'1+1'}};
 const [[two]]=await type.execute.call(context(normalNode,'1+1'));assert.deepEqual(two.json.body,exactTwo);assert.deepEqual(two.pairedItem,{item:0});assert.equal(calls,1);
 const toolType=convertNodeToAiTool({description:{...structuredClone(type.description),...type.description.usableAsTool.replacements},execute:type.execute});
 assert.deepEqual(toolType.description.outputs,['ai_tool']);
 const toolNode={name:'SumWise Release Tool',type:'n8n-nodes-sumwise-compute.sumWiseComputeTool',typeVersion:1,position:[0,0],parameters:{operation:'evaluate',expression:"={{ $fromAI('expression', 'ASCII expression', 'string') }}"}};
 const tool=createNodeAsTool({node:toolNode,nodeType:toolType,handleToolInvocation:async args=>{assert.deepEqual(Object.keys(args),['expression']);return toolType.execute.call(context(toolNode,args.expression));}}).response;
 const [[item]]=await tool.invoke({expression:'1/3 + 5/6',url:'http://192.0.2.1',operation:'delete'});
 assert.deepEqual(item.json.body,fixtures['1/3 + 5/6']);assert.deepEqual(item.pairedItem,{item:0});assert.equal(calls,2);assert.deepEqual(items,[{json:{synthetic:true}}]);
 console.log(JSON.stringify({packageLoaded:true,packageMode:record.mode,credentialFields:cred.properties.map(p=>p.name),credentialTestResolved:true,credentialTestStatus:tested.result.status,credentialTestScope:'HTTP acceptance only',semanticEvaluateTwo:two.json.body.result,toolMetadata:true,toolWrapperResult:item.json.body.result,toolHelperCalls:1,normalHelperCalls:1,bindings:verifyInstalled(installed,record),externalModelUsed:false,ownerSetup:false}));
}
async function main(destination,archive){
 assert.ok(destination,'Supply an explicit fresh isolated state child');const stateRoot=resolveStateRoot(destination);assert.notEqual(stateRoot,path.join(root,'.dev'));assert.ok(!fs.existsSync(stateRoot),'Existing state will not be overwritten');
 const record=archive?await archiveRecord(archive,stateRoot):{mode:'BUILT-ASSET COPY',bindings:['package.json',...expectedFiles.filter(file=>file.startsWith('dist/'))].sort().map(file=>({file,sha256:sha256(fs.readFileSync(path.join(root,file)))}))};
 const mock=await startMock({respond:({expression,send})=>{assert.ok(expression==='1+1'||Object.hasOwn(fixtures,expression),'Unknown smoke fixture');send(200,expression==='1+1'?exactTwo:fixtures[expression]);}});
 const children=new Set();let credentialFile;const commands=[];
 async function stop(child){if(child.exitCode!==null||child.signalCode)return;await new Promise(resolve=>{const timer=setTimeout(resolve,5000);child.once('close',()=>{clearTimeout(timer);resolve();});child.kill();});}
 function wait(child,label){children.add(child);return new Promise((resolve,reject)=>{let timedOut=false;const timer=setTimeout(()=>{timedOut=true;child.kill();},120000);const fallback=setTimeout(()=>reject(Error('Child did not close after smoke timeout: '+label)),125000);child.once('error',()=>{clearTimeout(timer);clearTimeout(fallback);children.delete(child);reject(Error('Smoke child failed to start'));});child.once('close',code=>{clearTimeout(timer);clearTimeout(fallback);children.delete(child);commands.push({label,exitCode:code,timedOut});code===0&&!timedOut?resolve():reject(Error('Smoke command failed: '+label));});});}
 try{
  const env=await environment({stateRoot,copyBuiltPackage:!archive});assert.equal(env.N8N_USER_FOLDER,path.join(stateRoot,'state'));
  const installed=path.join(env.N8N_USER_FOLDER,'.n8n/nodes/node_modules/n8n-nodes-sumwise-compute');
  if(archive){
   const nodesRoot=path.dirname(path.dirname(installed));
   fs.writeFileSync(path.join(nodesRoot,'package.json'),JSON.stringify({name:'sumwise-isolated-smoke',private:true,version:'0.0.0'}));
   const userConfig=path.join(stateRoot,'npm-userconfig'),globalConfig=path.join(stateRoot,'npm-globalconfig');
   for(const file of [userConfig,globalConfig,path.join(nodesRoot,'.npmrc')])fs.writeFileSync(file,'');
   const npmCli=process.env.npm_execpath||path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');assert.ok(fs.existsSync(npmCli),'Installed npm CLI missing; no download attempted');
   const installEnv={...env};for(const key of Object.keys(installEnv))if(/^npm_config_/i.test(key)||/^(?:NODE_AUTH_TOKEN|NPM_TOKEN)$/i.test(key))delete installEnv[key];
   Object.assign(installEnv,{npm_config_userconfig:userConfig,npm_config_globalconfig:globalConfig,npm_config_cache:path.join(stateRoot,'npm-cache'),npm_config_offline:'true',npm_config_ignore_scripts:'true',npm_config_audit:'false',npm_config_fund:'false',npm_config_update_notifier:'false'});
   const log=fs.openSync(path.join(stateRoot,'offline-install.log'),'w');
   const child=spawn(process.execPath,[npmCli,'install',record.archivePath,'--offline','--ignore-scripts','--legacy-peer-deps','--no-audit','--no-fund','--package-lock=false','--omit=dev'],{cwd:nodesRoot,env:installEnv,windowsHide:true,stdio:['ignore',log,log]});fs.closeSync(log);await wait(child,'offline exact tarball install');
  }
  verifyInstalled(installed,record);const bindingFile=path.join(stateRoot,'package-bindings.json');fs.writeFileSync(bindingFile,JSON.stringify(record,null,2));
  async function cli(args,log){await wait(runN8n(args,{...env,N8N_LOG_LEVEL:'info'},log),args[0]);return fs.readFileSync(path.join(stateRoot,log),'utf8');}
  credentialFile=path.join(stateRoot,'synthetic-credential.json');fs.writeFileSync(credentialFile,JSON.stringify([{id:'SumWiseReleaseMock',name:'SumWise release MOCK ONLY',type:'sumWiseComputeApi',data:{apiKey:SYNTHETIC_KEY,serviceOrigin:mock.origin,requestTimeout:30000}}]));
  await cli(['import:credentials','--input='+credentialFile],'import-credential.log');fs.unlinkSync(credentialFile);credentialFile=undefined;
  const workflowSource=archive?installed:root;
  const workflows=['01-exact-result.mock.json','02-reconciliation.mock.json'].map(file=>JSON.parse(fs.readFileSync(path.join(workflowSource,'examples',file),'utf8')));
  const zero=structuredClone(workflows[1]);zero.id='SumWiseReconZeroStableSmoke';zero.name='SumWise stable smoke — exact zero';zero.nodes.find(n=>n.id==='source-a').parameters.assignments.assignments.find(a=>a.name==='sourceTotalA').value='10500';workflows.push(zero);
  for(const wf of workflows)wf.nodes.find(n=>n.type==='n8n-nodes-sumwise-compute.sumWiseCompute').credentials={sumWiseComputeApi:{id:'SumWiseReleaseMock',name:'SumWise release MOCK ONLY'}};
  const wfFile=path.join(stateRoot,'mock-workflows.json');fs.writeFileSync(wfFile,JSON.stringify(workflows,null,2));await cli(['import:workflow','--input='+wfFile],'import-workflows.log');
  const runs=[];
  for(const [i,wf] of workflows.entries()){
   const log=await cli(['execute','--id='+wf.id,'--rawOutput'],'execute-'+i+'.log');assert.ok(!log.includes(SYNTHETIC_KEY));const marker=log.search(/\{\r?\n  "data":/);assert.ok(marker>=0);const execution=JSON.parse(log.slice(marker));assert.equal(execution.status,'success');
   const data=execution.data.resultData.runData,item=data['SumWise Evaluate (select MOCK credential)'][0].data.main[0][0];assert.equal(item.json.body.result.text,['7/6','1','0'][i]);assert.deepEqual(item.pairedItem,{item:0});
   let branch;if(i>0){branch=i===1?'exception':'matched';const chosen=i===1?'Exception — inspect synthetic difference':'Matched — exact zero',other=i===1?'Matched — exact zero':'Exception — inspect synthetic difference';assert.equal(data[chosen][0].data.main[0].length,1);assert.equal(data[other],undefined);}
   runs.push({workflow:wf.id,startedAt:execution.startedAt,result:item.json.body.result,pairedItem:item.pairedItem,...(branch?{branch}:{})});
  }
  const workerLog=path.join(stateRoot,'credential-tool.log'),handle=fs.openSync(workerLog,'w');const child=spawn(process.execPath,['--no-node-snapshot',__filename,'--worker',mock.origin,bindingFile],{cwd:root,env,windowsHide:true,stdio:['ignore',handle,handle]});fs.closeSync(handle);await wait(child,'credential/semantic Evaluate/tool host interfaces');
  const log=fs.readFileSync(workerLog,'utf8');assert.ok(!log.includes(SYNTHETIC_KEY));const line=log.split(/\r?\n/).find(l=>l.startsWith('{"packageLoaded":'));assert.ok(line,'Host result absent');const host=JSON.parse(line);
  assert.equal(mock.requests.length,6);assert.ok(mock.requests.every(r=>r.authenticated&&r.authorizationCount===1));verifyInstalled(installed,record);
  const result={mode:'SYNTHETIC MOCK ONLY',packageMode:record.mode,...(archive?{archiveSha256:record.archiveSha256}:{}),n8nVersion:require('n8n/package.json').version,nativeCommands:commands,runs,host,requests:mock.requests.length,ownerStateTouched:false,realService:false,externalModel:false};
  fs.writeFileSync(path.join(stateRoot,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({status:'PASS',packageMode:record.mode,cliWorkflows:3,credentialTest:true,semanticEvaluateTwo:true,generatedToolWrapper:true,requests:6,ownerStateTouched:false,realService:false,externalModel:false}));
 }finally{await Promise.all([...children].map(stop));if(credentialFile&&fs.existsSync(credentialFile))fs.unlinkSync(credentialFile);await mock.close();}
}
(process.argv[2]==='--worker'?worker(process.argv[3],process.argv[4]):main(process.argv[2],process.argv[3])).catch(error=>{console.error(String(error.message).replaceAll(SYNTHETIC_KEY,'[REDACTED]').split('\n')[0]);process.exitCode=1;});
