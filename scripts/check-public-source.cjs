// Public source is an explicit snapshot, never a copy of local Git history.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..');
const publicFiles=Object.freeze([
 '.gitignore','.npmrc','LICENSE','THIRD_PARTY_NOTICES.md','README.md','package.json','package-lock.json','tsconfig.json','eslint.config.mjs',
 '.github/workflows/ci.yml','.github/workflows/publish.yml',
 'credentials/SumWiseComputeApi.credentials.ts',
 'nodes/SumWiseCompute/SumWiseCompute.node.ts','nodes/SumWiseCompute/SumWiseCompute.node.json','nodes/SumWiseCompute/protocol.ts','nodes/SumWiseCompute/transport.ts','nodes/SumWiseCompute/problems.json','nodes/SumWiseCompute/sumwise.svg','nodes/SumWiseCompute/sumwise.dark.svg',
 'docs/USAGE.md','docs/CREDENTIALS.md','docs/DEVELOPMENT.md','docs/PUBLISHING.md','docs/RELEASE_CHECKLIST.md',
 'examples/01-exact-result.mock.json','examples/02-reconciliation.mock.json',
 'tests/evaluate.test.cjs','tests/release.test.cjs','tests/credential-runtime.cjs','tests/stable.test.cjs','tests/mock-server.cjs','tests/fixtures/successes.json',
 'scripts/check-package-content.cjs','scripts/check-public-source.cjs','scripts/local-n8n.cjs','scripts/release-smoke.cjs',
 'scripts/preview.cjs','scripts/mock-demo.cjs','scripts/loopback-only.cjs','scripts/setup-preview.cjs','scripts/smoke-n8n.cjs',
].sort());
const sourceForDist=file=>file.startsWith('dist/') ? file.slice(5).replace(/\.js$/,'.ts') : file;
function inspectSource(base=root){
 const records=[];const links=[];const contents=new Map();
 const synthetic=fs.readFileSync(path.join(base,'tests/mock-server.cjs'),'utf8').match(/const SYNTHETIC_KEY = '([^']+)'/)[1];
 for(const file of publicFiles){
  const full=path.join(base,file);assert.ok(fs.lstatSync(full).isFile()&&!fs.lstatSync(full).isSymbolicLink(),'Missing or linked public file: '+file);
  const bytes=fs.readFileSync(full);const content=bytes.toString('utf8');contents.set(file,content);
  assert.ok(!/\b[A-Za-z]:[\\/]+(?:Dev|Users)[\\/]/i.test(content),'User-local path in '+file);
  assert.ok(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bnpm_[A-Za-z0-9]{30,}|\bgh[pousr]_[A-Za-z0-9]{30,}/.test(content),'Credential material in '+file);
  if(!file.startsWith('tests/')) assert.ok(!content.includes(synthetic) && !/\b(?:(?:r1|release)-synthetic-|synthetic-stable-credential-)[a-f0-9]{32}\b/.test(content),'Synthetic token outside public tests: '+file);
  records.push({path:file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
 }
 function requireSelected(from,relative){
  const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(from),relative));
  const candidate=sourceForDist(resolved);
  assert.ok([candidate,candidate+'.ts',candidate+'.cjs',candidate+'.json',candidate+'/index.cjs'].some(f=>publicFiles.includes(f)),'Public checkout needs excluded local file: '+from+' -> '+relative);
 }
 for(const [file,content] of contents){
  if(/\.(?:ts|cjs|mjs)$/.test(file))for(const m of content.matchAll(/(?:require\(\s*|from\s*)['"](\.[^'"]+)['"]/g))requireSelected(file,m[1]);
  if(file.endsWith('.md'))for(const m of content.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)){
   const link=m[1];if(/^https?:|^mailto:|^#/.test(link)){
    const own=link.match(/^https:\/\/github\.com\/avery835\/n8n-nodes-sumwise-compute\/blob\/main\/(.+)$/);
    if(own)assert.ok(publicFiles.includes(own[1]),'Missing own public documentation target');
   }else requireSelected(file,decodeURIComponent(link.split('#')[0]));
   links.push({from:file,target:link});
  }
 }
 const pkg=JSON.parse(contents.get('package.json'));const lock=JSON.parse(contents.get('package-lock.json'));
 assert.equal(lock.packages[''].license,pkg.license);assert.equal(lock.packages[''].version,pkg.version);
 for(const script of Object.values(pkg.scripts))for(const m of script.matchAll(/(?:node(?: --no-node-snapshot)? )((?:scripts|tests)\/[^\s]+\.cjs)/g))assert.ok(publicFiles.includes(m[1]),'Package script target excluded');
 for(const file of [...pkg.n8n.nodes,...pkg.n8n.credentials])assert.ok(publicFiles.includes(sourceForDist(file)));
 for(const name of ['build','lint','test','check:package','check:source'])assert.ok(pkg.scripts[name]);
 return {status:'PASS',fileCount:records.length,files:records,documentLinks:links};
}
function exportSource(destination){
 const allowed=path.join(root,'.review','SUMWISE-N8N-RELEASE-1');
 const target=path.resolve(root,destination);const relative=path.relative(allowed,target);
 assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative)&&relative.split(path.sep).length>=2&&!relative.includes(':'),'Export must be a fresh release review child');
 assert.ok(!fs.existsSync(target),'Never overwrite an existing snapshot');
 let cursor=root;for(const part of path.relative(root,path.dirname(target)).split(path.sep)){cursor=path.join(cursor,part);if(fs.existsSync(cursor))assert.ok(fs.lstatSync(cursor).isDirectory()&&!fs.lstatSync(cursor).isSymbolicLink(),'Unsafe export parent');}
 const reviewed=inspectSource();fs.mkdirSync(target,{recursive:true});
 for(const file of publicFiles){const dest=path.join(target,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,file),dest);}
 const snapshot=inspectSource(target);assert.deepEqual(snapshot.files,reviewed.files);
 return {...snapshot,snapshot:target,historyIncluded:false,dependenciesCopied:false};
}
module.exports={publicFiles,inspectSource,exportSource};
if(require.main===module){try{console.log(JSON.stringify(process.argv[2]?exportSource(process.argv[2]):inspectSource(),null,2));}catch(error){console.error(error.message.split('\n')[0]);process.exitCode=1;}}
