// Required public prebuilt dependency only; no compiler/global installation fallback.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const root=path.resolve(__dirname,'..');
try { require('sqlite3'); console.log('Project-local SQLite binding is ready.'); }
catch {
  const result=spawnSync(process.execPath,[path.join(root,'node_modules','prebuild-install','bin.js'),'--runtime=napi','--target=6'],{
    cwd:path.join(root,'node_modules','sqlite3'),windowsHide:true,stdio:'inherit',
    env:{...process.env,npm_config_cache:path.join(root,'.cache','npm')},
  });
  if(result.error) throw result.error;
  if(result.status!==0) throw new Error('SQLite prebuilt download failed; no native build was attempted');
  require('sqlite3');
  console.log('Project-local SQLite prebuilt is ready.');
}
