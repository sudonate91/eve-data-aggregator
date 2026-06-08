/**
 * Auth Web Server
 *
 * Serves a small HTTP UI on AUTH_PORT (default 3000) for doing the one-time
 * EVE SSO OAuth flow without needing an interactive terminal.
 *
 * Routes:
 *   GET /           — dashboard: shows auth status per corp, buttons to authenticate
 *   GET /auth/:job  — starts OAuth for a job, redirects browser to EVE login
 *   GET /callback   — EVE redirects here after login, exchanges code, stores token
 *
 * PKCE verifiers are kept in memory (pendingAuth map) between /auth and /callback.
 * The state param ties callback back to the right job.
 */

import http from 'http';
import crypto from 'crypto';
import { URLSearchParams, URL } from 'url';
import fetch from 'node-fetch';
import { validateEveJwt } from './eve-esi/validateJwt.mjs';
import { findByJobName, upsertAuthData } from './service/tokenService.mjs';
import chalk from 'chalk';

// In-memory store: state → { job, codeVerifier, sequelizeInstance }
const pendingAuth = new Map();

// Job registry — populated by startAuthServer
let jobRegistry = [];
let serverPort = 3000;

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
    const token = await findByJobName(job.jobKey, job.db).catch(() => null);
    if (!token) return false;
  }
  return true;
}

/**
 * Start the HTTP auth server. Returns the server instance.
 */
export function startAuthServer() {
  const server = http.createServer(async (req, res) => {
    const reqUrl = new URL(req.url, `http://localhost:${serverPort}`);

    try {
      if (reqUrl.pathname === '/') {
        await handleDashboard(req, res);
      } else if (reqUrl.pathname.startsWith('/auth/')) {
        const jobKey = decodeURIComponent(reqUrl.pathname.slice('/auth/'.length));
        await handleAuth(req, res, jobKey);
      } else if (reqUrl.pathname === '/callback') {
        await handleCallback(req, res, reqUrl);
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
    console.log(chalk.bold.cyan(`\n🌐 Auth server listening on http://0.0.0.0:${serverPort}`));
    console.log(chalk.cyan(`   Open http://<your-ip>:${serverPort} in a browser to authenticate corps.\n`));
  });

  return server;
}

// ── Handlers ────────────────────────────────────────────────────────────────

async function handleDashboard(req, res) {
  const rows = await Promise.all(
    jobRegistry.map(async (job) => {
      const token = await findByJobName(job.jobKey, job.db).catch(() => null);
      const authed = !!token;
      const charName = token?.name ?? '';
      return { job, authed, charName };
    })
  );

  const allDone = rows.every((r) => r.authed);

  const rowHtml = rows.map(({ job, authed, charName }) => `
    <tr>
      <td>${job.label}</td>
      <td>${authed
        ? `<span class="ok">✓ ${charName}</span>`
        : `<span class="need">✗ Not authenticated</span>`}
      </td>
      <td>${authed
        ? `<a href="/auth/${encodeURIComponent(job.jobKey)}" class="btn re-auth">Re-authenticate</a>`
        : `<a href="/auth/${encodeURIComponent(job.jobKey)}" class="btn auth">Authenticate</a>`}
      </td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>EVE Data Aggregator — Auth</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0d1117; color: #c9d1d9; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    h1 { color: #58a6ff; }
    .status { padding: 12px 16px; border-radius: 6px; margin-bottom: 24px; }
    .status.ok  { background: #0f2a1a; border: 1px solid #238636; color: #3fb950; }
    .status.pending { background: #2a1a0f; border: 1px solid #9e6a03; color: #d29922; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px 12px; border-bottom: 1px solid #30363d; text-align: left; }
    th { color: #8b949e; font-size: 0.85em; text-transform: uppercase; }
    .ok   { color: #3fb950; }
    .need { color: #d29922; }
    .btn { display: inline-block; padding: 6px 14px; border-radius: 6px; text-decoration: none; font-size: 0.9em; }
    .btn.auth    { background: #238636; color: #fff; }
    .btn.re-auth { background: #21262d; color: #8b949e; border: 1px solid #30363d; }
    .btn:hover { opacity: 0.85; }
    p.note { color: #8b949e; font-size: 0.85em; }
  </style>
  <meta http-equiv="refresh" content="15">
</head>
<body>
  <h1>EVE Data Aggregator — Corp Authentication</h1>
  ${allDone
    ? `<div class="status ok">✓ All corps authenticated — jobs are running on schedule.</div>`
    : `<div class="status pending">⚠ Some corps need authentication. Click Authenticate and log in with the director character for each corp.</div>`}
  <table>
    <thead><tr><th>Job</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>${rowHtml}</tbody>
  </table>
  <p class="note">Page auto-refreshes every 15 seconds.</p>
</body>
</html>`;

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
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
