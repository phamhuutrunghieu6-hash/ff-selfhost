/**
 * Phtrunghieu008 Control — Free Fire / FF MAX
 * Telegram: @hieuphamiosvietnam
 * Hard key only. Domain: proxypin.vippdph.store
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PROXY_DOMAIN = process.env.DOMAIN || 'proxypin.vippdph.store';
const PUBLIC = path.join(__dirname, '..', 'public');
const DATA_FILE = path.join(__dirname, 'data.json');

const HARD_KEY = 'phamtrunghieu-vuacrackmenu';
const HARD_KEY_32 = (HARD_KEY + '000000').slice(0, 32);

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

let store = { keys: {}, configs: {} };
try {
  if (fs.existsSync(DATA_FILE)) store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch (_) {}
function save() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2)); } catch (_) {}
}

function makeToken(secret) {
  return crypto.createHash('sha256').update('phtrunghieu:' + secret).digest('hex').slice(0, 48);
}
function makeKeyId(secret) {
  return 'k-' + crypto.createHash('md5').update(secret).digest('hex').slice(0, 12);
}
function auth(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return null;
  for (const [secret, meta] of Object.entries(store.keys)) {
    if (meta.token === token) return { secret, ...meta };
  }
  return null;
}
function normalizeSecret(s) {
  const t = String(s || '').trim();
  if (t === HARD_KEY || t === HARD_KEY_32) return HARD_KEY_32;
  return t;
}

app.get('/api/ff-menu/policy', (_req, res) => {
  res.sendFile(path.join(PUBLIC, 'api', 'ff-menu', 'policy.json'));
});

app.get('/api/ff-menu/proxypin/config', (_req, res) => {
  const raw = fs.readFileSync(path.join(PUBLIC, 'api', 'ff-menu', 'proxypin', 'config'), 'utf8');
  const patched = raw
    .replace(/https:\/\/YOURDOMAIN\.com\/ffproxy\/?/g, `https://${PROXY_DOMAIN}/ffproxy/`)
    .replace(/https:\/\/proxypin\.vippdph\.store\/ffproxy\/?/g, `https://${PROXY_DOMAIN}/ffproxy/`);
  res.type('application/json').send(patched);
});

app.get('/api/ff-menu/proxypin/tiktok-blacklist', (_req, res) => {
  res.sendFile(path.join(PUBLIC, 'api', 'ff-menu', 'proxypin', 'tiktok-blacklist'));
});

app.post('/api/ff-menu/auth', (req, res) => {
  const secret = normalizeSecret(req.body?.secret);
  if (secret !== HARD_KEY_32) {
    return res.status(403).json({ error: 'Key không hợp lệ. Telegram @hieuphamiosvietnam' });
  }
  const token = makeToken(secret);
  const keyId = makeKeyId(secret);
  const expiresAt = new Date(Date.now() + 365 * 86400e3).toISOString();
  store.keys[secret] = { token, keyId, expiresAt, createdAt: new Date().toISOString() };
  if (!store.configs[keyId]) {
    store.configs[keyId] = {
      keyId, state: 0, aux: 0,
      headRate: 50, fovRadius: 100, aimbotFovRadius: 100,
      fastFireLevel: 0, fastReloadPercent: 0, speedScale: 100,
      spoofName: false, spoofText: '', spoofColor: '00FF00',
      skin: { flags: 0, lookId: 0, titleId: 0, emoteId: 0, weaponId: 0, finalShotId: 0 },
      expiresAt
    };
  }
  store.configs[keyId].expiresAt = expiresAt;
  save();
  res.json({ token, keyId, expiresAt });
});

app.get('/api/ff-menu/config', (req, res) => {
  const u = auth(req);
  if (!u) return res.status(401).json({ error: 'unauthorized' });
  const keyId = req.query.keyId || u.keyId;
  res.json(store.configs[keyId] || { keyId, state: 0, aux: 0, expiresAt: u.expiresAt });
});

app.post('/api/ff-menu/config', (req, res) => {
  const u = auth(req);
  if (!u) return res.status(401).json({ error: 'unauthorized' });
  const body = req.body || {};
  const keyId = body.keyId || u.keyId;
  store.configs[keyId] = { ...store.configs[keyId], ...body, keyId, updatedAt: new Date().toISOString() };
  save();
  res.json({ ok: true, keyId });
});

app.get('/api/ff-menu/game-status', (req, res) => {
  const u = auth(req);
  if (!u) return res.status(401).json({ error: 'unauthorized' });
  res.json({ online: true, keyId: req.query.keyId || u.keyId, expiresAt: u.expiresAt, message: 'Phtrunghieu008' });
});

app.post('/api/ff-menu/logout', (_req, res) => res.status(204).end());
app.post('/api/ff-menu/report-player', (_req, res) => res.json({ ok: true }));
app.get('/api/ff-menu/hackers', (_req, res) => res.json({ list: [] }));
app.get('/api/ff-menu/report-player', (_req, res) => res.json({ ok: true }));

function sendPatch(res) {
  const gz = path.join(PUBLIC, 'ffproxy', 'assembly-csharp-patch.gz');
  if (fs.existsSync(gz)) {
    res.set({ 'Content-Type': 'application/octet-stream', 'Content-Encoding': 'gzip', 'Cache-Control': 'no-store' });
    return fs.createReadStream(gz).pipe(res);
  }
  const bin = path.join(PUBLIC, 'ffproxy', 'assembly-csharp-patch.bin');
  if (fs.existsSync(bin)) {
    res.set({ 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store' });
    return fs.createReadStream(bin).pipe(res);
  }
  res.status(404).json({ error: 'patch missing' });
}

app.get('/ffproxy', (req, res) => {
  const p = String(req.query.p || '');
  if (p.includes('assembly-csharp-patch') || p === '/' || p === '') return sendPatch(res);
  res.status(404).json({ error: 'not found', p });
});

app.get('/ffproxy/codepatch/assembly-csharp-patch', (_req, res) => sendPatch(res));
app.get('/ffproxy/codepatch/assembly-csharp-patch.gz', (_req, res) => sendPatch(res));
app.get('/ffproxy/*', (req, res) => {
  if (req.path.includes('assembly-csharp-patch')) return sendPatch(res);
  res.status(404).end();
});

app.use(express.static(PUBLIC, { index: 'index.html', extensions: ['html'] }));
app.get('/ff-menu', (_req, res) => res.sendFile(path.join(PUBLIC, 'ff-menu', 'index.html')));
app.get('/ff-menu/', (_req, res) => res.sendFile(path.join(PUBLIC, 'ff-menu', 'index.html')));

app.listen(PORT, () => {
  console.log(`[Phtrunghieu008] :${PORT} DOMAIN=${PROXY_DOMAIN}`);
  console.log(`[Phtrunghieu008] KEY=${HARD_KEY}`);
  console.log(`[Phtrunghieu008] Telegram @hieuphamiosvietnam`);
});
