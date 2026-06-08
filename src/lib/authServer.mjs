/**
 * Auth + Setup Web Server
 *
 * Serves a two-tab UI on AUTH_PORT (default 3000):
 *   Tab 1 — Corp Authentication: browser-based EVE SSO OAuth per corp
 *   Tab 2 — Data Migration: SQL file upload streamed into MySQL
 *
 * Routes:
 *   GET  /           — dashboard (both tabs)
 *   GET  /auth/:job  — initiate OAuth for a job
 *   GET  /callback   — EVE SSO callback, stores token, redirects to /
 *   POST /migrate    — accepts multipart SQL file, pipes into mysql CLI
 *   GET  /db-status  — JSON: row counts per database
 */

import https from 'https';
import crypto from 'crypto';
import { spawn } from 'child_process';
import { URLSearchParams, URL } from 'url';
import fetch from 'node-fetch';
import selfsigned from 'selfsigned';
import { validateEveJwt } from './eve-esi/validateJwt.mjs';
import { findByJobName, upsertAuthData } from './service/tokenService.mjs';
import chalk from 'chalk';

// In-memory store: state → { job, codeVerifier, sequelizeInstance }
const pendingAuth = new Map();

// Job registry — populated by configureAuthServer
let jobRegistry = [];
let serverPort = 3000;

// All known databases for status display
const ALL_DBS = ['S0b', 'S0b_Struct', 'Ven0m', 'KryTek', 'S0b_Mart'];

/**
 * Register the jobs the server should show auth buttons for.
 * Call this before startAuthServer.
 *
 * @param {Array<{ jobKey: string, label: string, db: object }>} jobs
 * @param {number} port
 */
export function configureAuthServer(jobs, port = 3000) {
  jobRegistry = jobs;
  serverPort = port;
}

/**
 * Returns true if every registered job has a token in its DB.
 */
export async function allTokensPresent() {
  for (const job of jobRegistry) {
    try {
      const { default: defineTokenModel } = await import('../models/tokens.mjs');
      const TokenModel = defineTokenModel(job.db);
      const token = await TokenModel.findOne({ where: { job: job.jobKey } });
      if (!token) return false;
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Start the HTTP auth server. Returns the server instance.
 */
export function startAuthServer() {
  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const pems = selfsigned.generate(attrs, { days: 3650, keySize: 2048 });

  const server = https.createServer(
    { key: pems.private, cert: pems.cert },
    async (req, res) => {
    const reqUrl = new URL(req.url, `https://localhost:${serverPort}`);

    try {
      if (req.method === 'GET' && reqUrl.pathname === '/') {
        await handleDashboard(req, res);
      } else if (req.method === 'GET' && reqUrl.pathname.startsWith('/auth/')) {
        const jobKey = decodeURIComponent(reqUrl.pathname.slice('/auth/'.length));
        await handleAuth(req, res, jobKey);
      } else if (req.method === 'GET' && reqUrl.pathname === '/callback') {
        await handleCallback(req, res, reqUrl);
      } else if (req.method === 'POST' && reqUrl.pathname === '/migrate') {
        await handleMigrate(req, res);
      } else if (req.method === 'GET' && reqUrl.pathname === '/db-status') {
        await handleDbStatus(req, res);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    } catch (err) {
      console.error(chalk.red('[authServer] Unhandled error:', err.message));
      res.writeHead(500);
      res.end('Internal server error');
    }
  });

  server.listen(serverPort, '0.0.0.0', () => {
    console.log(chalk.bold.cyan(`\n🌐 Auth server listening on https://0.0.0.0:${serverPort}`));
    console.log(chalk.cyan(`   Open https://localhost:${serverPort} in a browser (accept the self-signed cert warning).\n`));
  });

  return server;
}

// ── Handlers ────────────────────────────────────────────────────────────────

async function handleDashboard(req, res) {
  const rows = await Promise.all(
    jobRegistry.map(async (job) => {
      const token = await findByJobName(job.jobKey, job.db).catch(() => null);
      return { job, authed: !!token, charName: token?.name ?? '' };
    })
  );
  const allDone = rows.every((r) => r.authed);
  const serverHost = req.headers.host?.split(':')[0] ?? 'your-server-ip';

  const authRowHtml = rows.map(({ job, authed, charName }) => `
    <tr>
      <td>${job.label}</td>
      <td>${authed ? `<span class="ok">✓ ${charName}</span>` : '<span class="need">✗ Not authenticated</span>'}</td>
      <td>${authed
        ? `<a href="/auth/${encodeURIComponent(job.jobKey)}" class="btn secondary">Re-authenticate</a>`
        : `<a href="/auth/${encodeURIComponent(job.jobKey)}" class="btn primary">Authenticate</a>`}
      </td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>EVE Data Aggregator — Setup</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,-apple-system,sans-serif;background:#0d1117;color:#c9d1d9;padding:32px 20px}
    .wrap{max-width:860px;margin:0 auto}
    h1{color:#58a6ff;font-size:1.5rem;margin-bottom:4px}
    .subtitle{color:#8b949e;font-size:.9rem;margin-bottom:28px}
    .tabs{display:flex;gap:2px;border-bottom:1px solid #30363d;margin-bottom:24px}
    .tab{padding:10px 20px;cursor:pointer;border:1px solid transparent;border-bottom:none;border-radius:6px 6px 0 0;color:#8b949e;font-size:.95rem;background:none}
    .tab.active{background:#161b22;border-color:#30363d;color:#c9d1d9;margin-bottom:-1px}
    .tab-panel{display:none}.tab-panel.active{display:block}
    .banner{padding:12px 16px;border-radius:6px;margin-bottom:20px;font-size:.92rem}
    .banner.ok{background:#0f2a1a;border:1px solid #238636;color:#3fb950}
    .banner.warn{background:#2a1a0f;border:1px solid #9e6a03;color:#d29922}
    .banner.info{background:#0d1e36;border:1px solid #1f6feb;color:#58a6ff}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th,td{padding:10px 12px;border-bottom:1px solid #21262d;text-align:left;font-size:.9rem}
    th{color:#8b949e;font-size:.8rem;text-transform:uppercase;letter-spacing:.04em}
    .ok{color:#3fb950}.need{color:#d29922}.na{color:#484f58}
    .btn{display:inline-block;padding:7px 16px;border-radius:6px;text-decoration:none;font-size:.88rem;border:none;cursor:pointer}
    .btn.primary{background:#238636;color:#fff}
    .btn.secondary{background:#21262d;color:#8b949e;border:1px solid #30363d}
    .btn:hover{opacity:.85}
    .upload-area{border:2px dashed #30363d;border-radius:8px;padding:32px;text-align:center;margin-bottom:20px;transition:border-color .2s}
    .upload-area:hover{border-color:#58a6ff}
    .upload-area input[type=file]{display:none}
    .upload-area label{cursor:pointer;color:#58a6ff}
    .filename{color:#8b949e;font-size:.85rem;margin-top:8px}
    #progress-box{background:#010409;border:1px solid #21262d;border-radius:6px;padding:12px 16px;font-family:monospace;font-size:.82rem;color:#7ee787;max-height:300px;overflow-y:auto;white-space:pre-wrap;display:none}
    details{margin-top:20px}summary{cursor:pointer;color:#58a6ff;font-size:.9rem;padding:6px 0}
    .workbench-steps{background:#161b22;border:1px solid #21262d;border-radius:6px;padding:16px 20px;margin-top:12px;font-size:.88rem;line-height:1.7}
    .workbench-steps ol{padding-left:20px}
    code{background:#21262d;padding:1px 6px;border-radius:4px;font-family:monospace}
    .note{color:#8b949e;font-size:.82rem;margin-top:8px}
    h3{color:#c9d1d9;margin:20px 0 12px;font-size:1rem}
  </style>
</head>
<body>
<div class="wrap">
  <h1>🚀 EVE Data Aggregator</h1>
  <p class="subtitle">Setup &amp; Administration</p>

  <div class="tabs">
    <button class="tab active" onclick="showTab('auth',this)">1 — Corp Authentication</button>
    <button class="tab" onclick="showTab('migrate',this)">2 — Data Migration</button>
  </div>

  <div id="tab-auth" class="tab-panel active">
    ${allDone
      ? '<div class="banner ok">✓ All corps authenticated — data jobs are running on schedule.</div>'
      : '<div class="banner warn">⚠ Some corps need authentication. Click <strong>Authenticate</strong> and log in with the director character for each corp. Jobs start automatically once all are green.</div>'}
    <table>
      <thead><tr><th>Job</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>${authRowHtml}</tbody>
    </table>
    <p class="note">Page auto-refreshes every 30 seconds.</p>
  </div>

  <div id="tab-migrate" class="tab-panel">
    <div class="banner info">ℹ First install? Import your existing data here, or skip — schema was created automatically on first boot.</div>

    <h3>Database Status</h3>
    <table id="db-status-table">
      <thead><tr><th>Database</th><th>Journal / Contract rows</th><th>Tokens</th></tr></thead>
      <tbody id="db-status-body"><tr><td colspan="3" class="na">Loading...</td></tr></tbody>
    </table>

    <h3>Option A — Upload a SQL dump file</h3>
    <p style="font-size:.88rem;color:#8b949e;margin-bottom:16px">Export all databases from your existing MySQL (Workbench → Server → Data Export → all 5 schemas → single .sql file), then upload it here.</p>
    <div class="upload-area">
      <input type="file" id="sql-file" accept=".sql,.gz" onchange="fileSelected(this)"/>
      <label for="sql-file">📂 Click to select a .sql file</label>
      <div class="filename" id="file-label">No file selected</div>
    </div>
    <button class="btn primary" id="upload-btn" onclick="startMigration()" disabled>Import SQL file</button>
    <p class="note" style="margin-top:8px">Large files (100MB+) are fine — streamed directly into MySQL.</p>
    <div id="progress-box"></div>

    <details>
      <summary>Option B — Import via MySQL Workbench (alternative)</summary>
      <div class="workbench-steps">
        <ol>
          <li>In Workbench, connect to your <strong>existing</strong> MySQL (port 3306)</li>
          <li>Go to <strong>Server → Data Export</strong></li>
          <li>Select all 5 schemas: <code>S0b</code>, <code>S0b_Struct</code>, <code>Ven0m</code>, <code>KryTek</code>, <code>S0b_Mart</code></li>
          <li>Choose <em>Export to Self-Contained File</em> → save as <code>eve-migration.sql</code></li>
          <li>Add a new Workbench connection: host <code>${serverHost}</code>, port <code>3307</code>, user <code>root</code></li>
          <li>On the new connection: <strong>Server → Data Import</strong> → select .sql file → Start Import</li>
        </ol>
      </div>
    </details>
  </div>
</div>

<script>
function showTab(name,btn){
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  btn.classList.add('active');
  if(name==='migrate')loadDbStatus();
}
function fileSelected(input){
  const f=input.files[0];
  document.getElementById('file-label').textContent=f?f.name+' ('+(f.size/1024/1024).toFixed(1)+' MB)':'No file selected';
  document.getElementById('upload-btn').disabled=!f;
}
async function loadDbStatus(){
  try{
    const r=await fetch('/db-status');
    const data=await r.json();
    document.getElementById('db-status-body').innerHTML=data.map(d=>
      '<tr><td>'+d.db+'</td><td class="'+(d.journalRows>0?'ok':'need')+'">'+(d.journalRows>0?'✓ '+d.journalRows.toLocaleString()+' rows':'✗ Empty')+'</td><td class="'+(d.tokenRows>0?'ok':'na')+'">'+(d.tokenRows>0?'✓ '+d.tokenRows+' token(s)':'—')+'</td></tr>'
    ).join('');
  }catch(e){}
}
async function startMigration(){
  const file=document.getElementById('sql-file').files[0];
  if(!file)return;
  const btn=document.getElementById('upload-btn');
  btn.disabled=true;btn.textContent='Importing...';
  const box=document.getElementById('progress-box');
  box.style.display='block';box.textContent='Starting import...\n';
  try{
    const fd=new FormData();fd.append('file',file);
    const resp=await fetch('/migrate',{method:'POST',body:fd});
    const reader=resp.body.getReader();const dec=new TextDecoder();
    while(true){
      const{done,value}=await reader.read();
      if(done)break;
      box.textContent+=dec.decode(value);box.scrollTop=box.scrollHeight;
    }
    box.textContent+='\n✓ Import complete.';
    btn.textContent='Done ✓';
    loadDbStatus();
  }catch(e){
    box.textContent+='\nERROR: '+e.message;
    btn.disabled=false;btn.textContent='Retry';
  }
}
setTimeout(()=>location.reload(),30000);
<\/script>
</body></html>`;

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
}

async function handleDbStatus(req, res) {
  const rootPw = process.env.MYSQL_ROOT_PASSWORD || '';
  const host   = process.env.DB_HOST || '127.0.0.1';
  const port   = process.env.DB_PORT || '3306';

  const results = await Promise.all(ALL_DBS.map(async (db) => {
    try {
      const journalTable = db === 'S0b_Struct' ? 'contracts' : '1_journal_entries';
      const out = await runMysqlQuery(
        `SELECT (SELECT COUNT(*) FROM \`${db}\`.\`${journalTable}\`) AS jrows, (SELECT COUNT(*) FROM \`${db}\`.tokens) AS trows;`,
        host, port, rootPw
      );
      const lines = out.trim().split('\n').filter(l => l && !l.startsWith('jrows'));
      const [jrows, trows] = (lines[0] || '0\t0').split('\t').map(Number);
      return { db, journalRows: jrows, tokenRows: trows };
    } catch {
      return { db, journalRows: -1, tokenRows: -1 };
    }
  }));

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(results));
}

function runMysqlQuery(sql, host, port, password) {
  return new Promise((resolve, reject) => {
    const proc = spawn('mysql', [
      '-u', 'root', `-p${password}`, '-h', host, '-P', String(port),
      '--batch', '--skip-column-names', '-e', sql,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    proc.stdout.on('data', d => { out += d; });
    proc.stderr.on('data', d => { err += d; });
    proc.on('close', code => code === 0 ? resolve(out) : reject(new Error(err.trim() || `mysql exited ${code}`)));
  });
}

async function handleMigrate(req, res) {
  const rootPw = process.env.MYSQL_ROOT_PASSWORD || '';
  const host   = process.env.DB_HOST || '127.0.0.1';
  const port   = process.env.DB_PORT || '3306';

  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'X-Content-Type-Options': 'nosniff',
  });
  res.write('Receiving file...\n');

  const contentType = req.headers['content-type'] || '';
  const boundaryMatch = contentType.match(/boundary=([^;]+)/);
  if (!boundaryMatch) { res.write('ERROR: Missing multipart boundary.\n'); res.end(); return; }
  const boundary = '--' + boundaryMatch[1].trim();

  const chunks = [];
  await new Promise((resolve) => { req.on('data', c => chunks.push(c)); req.on('end', resolve); });
  const fileBuffer = Buffer.concat(chunks);

  const raw      = fileBuffer.toString('binary');
  const hdrsEnd  = raw.indexOf('\r\n\r\n');
  const fileStart = hdrsEnd + 4;
  const fileEnd   = raw.lastIndexOf('\r\n' + boundary);
  if (hdrsEnd === -1 || fileEnd === -1) { res.write('ERROR: Could not parse multipart body.\n'); res.end(); return; }

  const sqlBuffer = fileBuffer.slice(fileStart, fileEnd);
  res.write(`File received (${(sqlBuffer.length / 1024 / 1024).toFixed(1)} MB). Starting MySQL import...\n`);

  const mysql = spawn('mysql',
    ['-u', 'root', `-p${rootPw}`, '-h', host, '-P', String(port), '--verbose'],
    { stdio: ['pipe', 'pipe', 'pipe'] }
  );
  mysql.stdout.on('data', d => res.write(d.toString()));
  mysql.stderr.on('data', d => {
    const line = d.toString();
    if (!line.toLowerCase().includes('warning: using a password')) res.write(line);
  });
  mysql.stdin.write(sqlBuffer);
  mysql.stdin.end();
  mysql.on('close', (code) => {
    if (code === 0) {
      console.log(chalk.green('[authServer] Migration import completed.'));
      res.write('\n✓ Import finished successfully.\n');
    } else {
      res.write(`\nImport exited with code ${code}.\n`);
    }
    res.end();
  });
}

async function handleAuth(req, res, jobKey) {
  const job = jobRegistry.find((j) => j.jobKey === jobKey);
  if (!job) {
    res.writeHead(404);
    res.end(`Unknown job: ${jobKey}`);
    return;
  }

  const codeVerifier = crypto.randomBytes(32).toString('hex');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  // Use a unique state per request to tie callback back to this job
  const state = crypto.randomBytes(16).toString('hex');
  pendingAuth.set(state, { jobKey, codeVerifier, db: job.db });

  const callbackUrl = process.env.CALLBACK_URL || `http://localhost:${serverPort}/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    redirect_uri: callbackUrl,
    client_id: process.env.CLIENT_ID,
    scope: process.env.SCOPE,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  res.writeHead(302, {
    Location: `https://login.eveonline.com/v2/oauth/authorize/?${params.toString()}`,
  });
  res.end();
}

async function handleCallback(req, res, reqUrl) {
  const code  = reqUrl.searchParams.get('code');
  const state = reqUrl.searchParams.get('state');
  const error = reqUrl.searchParams.get('error');

  if (error) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(`<p>EVE SSO error: ${error}</p><a href="/">Back</a>`);
    return;
  }

  if (!code || !state || !pendingAuth.has(state)) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(`<p>Invalid callback — missing code or unknown state.</p><a href="/">Back</a>`);
    return;
  }

  const { jobKey, codeVerifier, db } = pendingAuth.get(state);
  pendingAuth.delete(state);

  const callbackUrl = process.env.CALLBACK_URL || `http://localhost:${serverPort}/callback`;

  const tokenRes = await fetch('https://login.eveonline.com/v2/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: process.env.CLIENT_ID,
      code_verifier: codeVerifier,
      redirect_uri: callbackUrl,
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error(chalk.red(`[authServer] Token exchange failed (${tokenRes.status}): ${body}`));
    res.writeHead(502, { 'Content-Type': 'text/html' });
    res.end(`<p>Token exchange failed: ${tokenRes.status}</p><pre>${body}</pre><a href="/">Back</a>`);
    return;
  }

  const data = await tokenRes.json();
  const jwt  = await validateEveJwt(data.access_token);

  const authData = {
    ...data,
    scp:   jwt.scp,
    sub:   jwt.sub,
    name:  jwt.name,
    owner: jwt.owner,
    exp:   jwt.exp,
    job:   jobKey,
  };

  await upsertAuthData(authData, jobKey, db);
  console.log(chalk.green(`[authServer] Token stored for job: ${jobKey} (character: ${jwt.name})`));

  res.writeHead(302, { Location: '/' });
  res.end();
}
