const fs = require('node:fs');
const path = require('node:path');
const { root, environment, runN8n } = require('./local-n8n.cjs');
const { startMock } = require('../tests/mock-server.cjs');
const { importMockCredential } = require('./mock-demo.cjs');

(async () => {
  const mock = await startMock();
  const env = await environment();
  try { await importMockCredential(mock.origin,env); } catch (error) { await mock.close(); throw error; }
  const child = runN8n(['start'],env,'n8n-preview.log');
  const info = { url:`http://127.0.0.1:${env.N8N_PORT}`, mockOrigin:mock.origin, pid:child.pid,
    brokerPort:env.N8N_RUNNERS_BROKER_PORT, mode:'SYNTHETIC MOCK ONLY' };
  fs.writeFileSync(path.join(root,'.dev','preview.json'),JSON.stringify(info,null,2)+'\n');
  console.log(`Mock-only preview starting at ${info.url}\nMock origin: ${mock.origin}\nLog: .dev/n8n-preview.log\nPress Ctrl+C to stop these task-owned processes.`);
  let stopped = false;
  async function stop() { if (stopped) return; stopped=true; child.kill(); await mock.close(); }
  process.once('SIGINT',stop); process.once('SIGTERM',stop);
  child.once('exit',async code => { await stop(); process.exitCode=code || 0; });
  child.once('error',async () => { await stop(); process.exitCode=1; });
})().catch(e => { console.error(e.message); process.exitCode=1; });
