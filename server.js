const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 3030);
const ROOT = __dirname;
const OLLAMA_URL = (process.env.OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const sessions = new Map();
const oauthStates = new Map();

// Load environment values without requiring npm packages. Supports either .env or google.env.
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const rawLine of fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, '').trim();
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
}
loadEnvFile(path.join(ROOT, '.env'));
loadEnvFile(path.join(ROOT, 'google.env'));
const MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `http://${HOST}:${PORT}/auth/google/callback`;

function send(res, status, body, type = 'application/json; charset=utf-8', headers = {}) {
  res.writeHead(status, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', ...headers });
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
}
function json(res, status, body, headers = {}) { return send(res, status, body, 'application/json; charset=utf-8', headers); }
function readBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = '', size = 0;
    req.setEncoding('utf8');
    req.on('data', chunk => { size += Buffer.byteLength(chunk); if (size > maxBytes) { reject(Object.assign(new Error('Request body too large.'), { status: 413 })); req.destroy(); return; } raw += chunk; });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(Object.assign(new Error('Invalid JSON request.'), { status: 400 })); } });
    req.on('error', reject);
  });
}
function cookieMap(req) {
  const result = {};
  for (const part of (req.headers.cookie || '').split(';')) { const i = part.indexOf('='); if (i > 0) result[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); }
  return result;
}
function currentSession(req) {
  const id = cookieMap(req).cloudai_session;
  const session = id && sessions.get(id);
  if (!session) return null;
  if (session.expiresAt < Date.now()) { sessions.delete(id); return null; }
  return session;
}
function sessionCookie(id, maxAge = 60 * 60 * 24 * 7) { return `cloudai_session=${encodeURIComponent(id)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`; }
function htmlMessage(title, message, link = '/') {
  const safe = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safe(title)} · Cloud AI</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#07111f;color:#eaf6ff;font:16px system-ui"><main style="max-width:560px;margin:24px;padding:28px;border:1px solid #31516a;border-radius:18px;background:#0c1b2d"><h1>${safe(title)}</h1><p>${safe(message)}</p><p><a style="color:#67e8f9" href="${safe(link)}">Return to Cloud AI</a></p></main></body></html>`;
}
function redirect(res, location, headers = {}) { res.writeHead(302, { Location: location, 'Cache-Control': 'no-store', ...headers }); res.end(); }
function googleConfigured() { return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && !GOOGLE_CLIENT_ID.includes('PASTE_') && !GOOGLE_CLIENT_SECRET.includes('PASTE_')); }

const server = http.createServer(async (req, res) => {
  // Local-only app: never enable permissive CORS or bind to all network interfaces.
  const hostHeader = req.headers.host || `${HOST}:${PORT}`;
  let url;
  try { url = new URL(req.url, `http://${hostHeader}`); } catch { return json(res, 400, { error: 'Invalid URL.' }); }

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    return fs.readFile(path.join(ROOT, 'index.html'), (err, data) => err ? json(res, 500, { error: 'Could not read index.html.' }) : send(res, 200, data, 'text/html; charset=utf-8'));
  }
  if (req.method === 'GET' && url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }

  if (req.method === 'GET' && url.pathname === '/auth/google') {
    if (!googleConfigured()) return json(res, 503, { error: 'Google OAuth credentials are missing. Put GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env or google.env in the same folder as server.js, then restart the server.' });
    const state = crypto.randomBytes(32).toString('hex');
    oauthStates.set(state, Date.now() + 10 * 60 * 1000);
    const params = new URLSearchParams({ client_id: GOOGLE_CLIENT_ID, redirect_uri: GOOGLE_REDIRECT_URI, response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' });
    return redirect(res, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  }
  if (req.method === 'GET' && url.pathname === '/auth/google/callback') {
    const state = url.searchParams.get('state') || '';
    const expires = oauthStates.get(state);
    oauthStates.delete(state);
    if (!state || !expires || expires < Date.now()) return send(res, 400, htmlMessage('Sign-in expired', 'The Google sign-in request expired or its state did not match. Please try again.'), 'text/html; charset=utf-8');
    if (url.searchParams.has('error')) return send(res, 400, htmlMessage('Google sign-in cancelled', url.searchParams.get('error_description') || url.searchParams.get('error')), 'text/html; charset=utf-8');
    const code = url.searchParams.get('code');
    if (!code || !googleConfigured()) return send(res, 400, htmlMessage('Google sign-in is not configured', 'Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env or google.env, and make sure the redirect URI matches exactly.'), 'text/html; charset=utf-8');
    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, redirect_uri: GOOGLE_REDIRECT_URI, grant_type: 'authorization_code' }), signal: AbortSignal.timeout(15000) });
      const tokenData = await tokenResponse.json().catch(() => ({}));
      if (!tokenResponse.ok || !tokenData.access_token) throw new Error(tokenData.error_description || tokenData.error || 'Google did not return an access token.');
      const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${tokenData.access_token}` }, signal: AbortSignal.timeout(15000) });
      const profile = await profileResponse.json().catch(() => ({}));
      if (!profileResponse.ok || !profile.sub || !profile.email) throw new Error('Google did not return a valid account profile.');
      if (profile.email_verified === false) throw new Error('Google returned an email address that is not verified.');
      const sessionId = crypto.randomBytes(32).toString('hex');
      sessions.set(sessionId, { user: { sub: profile.sub, email: profile.email, name: profile.name || profile.email.split('@')[0], picture: profile.picture || '' }, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
      return redirect(res, '/?google=success', { 'Set-Cookie': sessionCookie(sessionId) });
    } catch (err) {
      console.error('[Google OAuth]', err.message);
      const message = /invalid_client|unauthorized_client/i.test(err.message) ? 'Google rejected the OAuth client. Check the Client ID and Client Secret.' : /redirect_uri_mismatch/i.test(err.message) ? 'The redirect URI does not match Google Cloud. It must be exactly the URI in your .env file.' : 'Google sign-in failed. Check your internet connection and OAuth settings, then try again.';
      return redirect(res, `/?google=error&message=${encodeURIComponent(message)}`);
    }
  }
  if (req.method === 'GET' && url.pathname === '/api/me') {
    const session = currentSession(req);
    return json(res, 200, session ? { authenticated: true, user: session.user } : { authenticated: false, user: null });
  }
  if (req.method === 'POST' && url.pathname === '/api/logout') {
    const id = cookieMap(req).cloudai_session;
    if (id) sessions.delete(id);
    return json(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie('', 0) });
  }
  if (req.method === 'GET' && url.pathname === '/api/health') {
    try {
      const response = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(4000) });
      const data = await response.json().catch(() => ({}));
      const models = Array.isArray(data.models) ? data.models.map(m => m.name) : [];
      const installed = models.some(name => name === MODEL || name.startsWith(`${MODEL}:`) || MODEL.startsWith(`${name}:`));
      return json(res, response.ok ? 200 : 503, { ok: response.ok && installed, ollama: response.ok, model: MODEL, installed, googleOAuthConfigured: googleConfigured(), error: !response.ok ? 'Ollama did not respond successfully.' : (!installed ? `Model ${MODEL} is not installed. Run install_model.bat.` : undefined) });
    } catch {
      return json(res, 503, { ok: false, ollama: false, model: MODEL, installed: false, googleOAuthConfigured: googleConfigured(), error: `Cannot reach Ollama at ${OLLAMA_URL}. Start Ollama and run install_model.bat.` });
    }
  }
  if (req.method === 'POST' && url.pathname === '/api/chat') {
    let body;
    try { body = await readBody(req); } catch (err) { return json(res, err.status || 400, { error: err.message || 'Invalid request.' }); }
    if (!Array.isArray(body.messages)) return json(res, 400, { error: 'Messages are required.' });
    const messages = body.messages.slice(-24).filter(m => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string').map(m => ({ role: m.role, content: m.content.slice(0, 50000) }));
    if (!messages.length || !messages.some(m => m.role === 'user')) return json(res, 400, { error: 'Please enter a message.' });
    if (messages.reduce((n, m) => n + m.content.length, 0) > 250000) return json(res, 413, { error: 'Conversation is too long. Start a new chat.' });
    if (!messages[0] || messages[0].role !== 'system') messages.unshift({ role: 'system', content: 'You are Cloud AI, a helpful general-purpose assistant. Be accurate, friendly, practical, and clear. If unsure, say so. Put code in fenced Markdown blocks with a language label.' });
    try {
      const ollama = await fetch(`${OLLAMA_URL}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: MODEL, messages, stream: false, options: { temperature: 0.7 } }), signal: AbortSignal.timeout(180000) });
      const data = await ollama.json().catch(() => ({}));
      if (!ollama.ok) return json(res, 502, { error: `Ollama error: ${data.error || `HTTP ${ollama.status}`}. Check that Ollama is running and ${MODEL} is installed.` });
      return json(res, 200, data);
    } catch (err) {
      const offline = err.cause?.code === 'ECONNREFUSED' || /fetch failed/i.test(err.message);
      return json(res, 502, { error: offline ? `Cannot connect to Ollama at ${OLLAMA_URL}. Start Ollama and run install_model.bat.` : (err.name === 'TimeoutError' ? 'The AI took too long to respond. Try again.' : `Local AI request failed: ${err.message}`) });
    }
  }
  return json(res, 404, { error: 'Not found.' });
});

server.on('clientError', (_err, socket) => { if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'); });
server.listen(PORT, HOST, () => {
  console.log(''); console.log('  CLOUD AI'); console.log('  --------------------------------');
  console.log(`  Website:  http://${HOST}:${PORT}`);
  console.log(`  Ollama:   ${OLLAMA_URL}`);
  console.log(`  Model:    ${MODEL}`);
  console.log(`  Google:   ${googleConfigured() ? 'OAuth credentials loaded' : 'not configured (local account login still works)'}`);
  console.log('  Keep this window open while using Cloud AI. Press Ctrl+C to stop.'); console.log('');
});
process.on('SIGINT', () => { console.log('\nCloud AI stopped.'); server.close(() => process.exit(0)); });
