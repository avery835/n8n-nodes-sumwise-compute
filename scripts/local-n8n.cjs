// Isolated local development wrapper, never shipped as node runtime code.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { randomBytes } = require('node:crypto');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const defaultDevRoot = path.join(root, '.dev');
function resolveStateRoot(stateRoot) {
  if (stateRoot === undefined) return defaultDevRoot;
  if (typeof stateRoot !== 'string' || !stateRoot || stateRoot.includes('\0') ||
      stateRoot.split(/[\\/]/).some(part => part === '..' || part === '.')) {
    throw new Error('Invalid isolated state root');
  }
  const destination = path.resolve(root, stateRoot);
  const reviewRoots = ['SUMWISE-N8N-R1', 'SUMWISE-N8N-RELEASE-1', 'SW-COMPUTE-N8N-STABLE1'].map(name => path.join(root, '.review', name));
  const allowed = reviewRoots.find(base => destination.startsWith(base + path.sep)) || reviewRoots[0];
  const relative = path.relative(allowed, destination);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || relative.split(path.sep).length < 2 || relative.includes(':')) {
    throw new Error('Isolated state must be beneath an approved .review task/<run>/<child>');
  }
  let cursor = root;
  for (const part of path.relative(root, destination).split(path.sep)) {
    cursor = path.join(cursor, part);
    try {
      const stat = fs.lstatSync(cursor);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('State root cannot use a symlink, junction or file');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return destination;
}
const bin = path.join(root, 'node_modules', 'n8n', 'bin', 'n8n');
const guard = path.join(__dirname, 'loopback-only.cjs');

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
async function environment({ stateRoot, copyBuiltPackage = true } = {}) {
  if (typeof copyBuiltPackage !== 'boolean' || (!copyBuiltPackage && stateRoot === undefined)) {
    throw new Error('Package copy may be disabled only for explicit isolated test state');
  }
  // Fixed development fixture for the newly supported credential test; no calculator.
  require('../tests/fixtures/successes.json')['1+1'] = { ok: true, api_version: 'v1', operation: 'evaluate', engine_version: '0.1.0-mock.1', result: { type: 'integer', text: '2', exactness: 'exact', value: '2' } };
  const devRoot = resolveStateRoot(stateRoot);
  const state = path.join(devRoot, 'state');
  fs.mkdirSync(path.join(devRoot,'tmp'),{recursive:true});
  const moduleDir = path.join(state,'.n8n','nodes','node_modules');
  fs.mkdirSync(moduleDir,{recursive:true});
  const candidate = path.join(moduleDir,'n8n-nodes-sumwise-compute');
  if (copyBuiltPackage) {
  fs.mkdirSync(candidate,{recursive:true});
  // Install only the candidate's built files for the package loader. Do not recursively
  // expose the project's n8n development dependencies to the custom-directory loader.
  fs.copyFileSync(path.join(root,'package.json'),path.join(candidate,'package.json'));
  fs.cpSync(path.join(root,'dist'),path.join(candidate,'dist'),{recursive:true});
  }
  const env = { ...process.env,
    N8N_USER_FOLDER: state, N8N_LISTEN_ADDRESS:'127.0.0.1', N8N_HOST:'127.0.0.1', N8N_PROTOCOL:'http',
    N8N_PORT:String(await freePort()), N8N_RUNNERS_BROKER_PORT:String(await freePort()),
    N8N_RUNNERS_BROKER_LISTEN_ADDRESS:'127.0.0.1', N8N_RUNNERS_MODE:'external',
    N8N_RUNNERS_AUTH_TOKEN:randomBytes(32).toString('hex'),
    N8N_DIAGNOSTICS_ENABLED:'false', N8N_VERSION_NOTIFICATIONS_ENABLED:'false',
    N8N_VERSION_NOTIFICATIONS_WHATS_NEW_ENABLED:'false', N8N_TEMPLATES_ENABLED:'false',
    N8N_PERSONALIZATION_ENABLED:'false', N8N_AI_ENABLED:'false', N8N_PUBLIC_API_DISABLED:'true',
    N8N_DISABLED_MODULES:'mcp-registry',
    N8N_MCP_ACCESS_ENABLED:'false', N8N_MCP_BUILDER_ENABLED:'false', N8N_MCP_APPS_ENABLED:'false',
    N8N_LICENSE_AUTO_RENEW_ENABLED:'false', N8N_LICENSE_ACTIVATION_KEY:'',
    N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE:'true', N8N_UNVERIFIED_PACKAGES_ENABLED:'false',
    N8N_SECURE_COOKIE:'false',
    N8N_LOG_LEVEL:'warn', N8N_LOG_OUTPUT:'console', N8N_DEFAULT_BINARY_DATA_MODE:'filesystem',
    N8N_SSRF_PROTECTION_ENABLED:'true', N8N_SSRF_ALLOWED_IP_RANGES:'127.0.0.1/32,::1/128',
    N8N_SSRF_BLOCKED_IP_RANGES:'0.0.0.0/0,::/0',
    NODES_INCLUDE: JSON.stringify(['n8n-nodes-base.manualTrigger','n8n-nodes-base.set','n8n-nodes-base.if','n8n-nodes-base.noOp','n8n-nodes-base.stickyNote','n8n-nodes-sumwise-compute.sumWiseCompute','n8n-nodes-sumwise-compute.sumWiseComputeTool']),
    npm_config_cache:path.join(root,'.cache','npm'), npm_config_update_notifier:'false',
    XDG_CACHE_HOME:path.join(root,'.cache'), TEMP:path.join(devRoot,'tmp'), TMP:path.join(devRoot,'tmp'),
    NODE_OPTIONS:`--no-node-snapshot --require="${guard.replaceAll('\\', '/')}"`,
  };
  for (const key of Object.keys(env)) if (/^(https?|all)_proxy$/i.test(key)) delete env[key];
  if (stateRoot !== undefined) {
    env.DB_TYPE = 'sqlite';
    env.DB_SQLITE_DATABASE = 'database.sqlite';
    // Fresh test state must not inherit an owner's key/config or custom loader.
    for (const key of ['N8N_ENCRYPTION_KEY', 'N8N_CONFIG_FILES', 'N8N_CUSTOM_EXTENSIONS']) delete env[key];
  }
  return env;
}
function runN8n(args, env, logName) {
  const selected = path.dirname(env.N8N_USER_FOLDER);
  const devRoot = selected === defaultDevRoot ? defaultDevRoot : resolveStateRoot(selected);
  if (path.basename(logName) !== logName || logName === '.' || logName === '..') throw new Error('Invalid local log name');
  const logPath = path.join(devRoot,logName);
  const log = fs.openSync(logPath,'w');
  const child = spawn(process.execPath,[bin,...args],{cwd:root,env,stdio:['ignore',log,log],windowsHide:true});
  fs.closeSync(log);
  return child;
}
async function command(args, env, logName) {
  const child = runN8n(args,{...env,N8N_LOG_LEVEL:'info'},logName);
  const code = await new Promise((resolve,reject) => { child.once('error',reject); child.once('exit',resolve); });
  if (code !== 0) throw new Error(`n8n ${args[0]} exited ${code}; see .dev/${logName}`);
}
module.exports = { root, environment, runN8n, command, resolveStateRoot };

if (require.main === module) {
  (async () => {
    const env = await environment();
    const args = process.argv.slice(2);
    if (!args.length) throw new Error('Supply an n8n local CLI command');
    await command(args,env,'cli.log');
    console.log(fs.readFileSync(path.join(root,'.dev','cli.log'),'utf8'));
  })().catch(e => { console.error(e.message); process.exitCode=1; });
}
