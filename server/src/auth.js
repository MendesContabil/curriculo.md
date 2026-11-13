import crypto from 'node:crypto';

const SECRET = process.env.AUTH_SECRET || 'base44-dev-secret-change-me';
export const COOKIE_NAME = 'psi_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('base64url');
}

export function createSessionToken(user) {
  const payload = {
    uid: user.id,
    role: user.role,
    name: user.name,
    pid: user.patient_id || null,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function readSessionToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, signature] = token.split('.');
  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS * 1000,
    secure: process.env.NODE_ENV === 'production',
  };
}

export function attachUser(req, res, next) {
  const payload = readSessionToken(req.cookies?.[COOKIE_NAME]);
  req.user = payload || null;
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Sessão expirada. Entre novamente.' });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Sessão expirada. Entre novamente.' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso restrito à psicóloga.' });
  next();
}

export function requirePatient(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Sessão expirada. Entre novamente.' });
  if (req.user.role !== 'patient' || !req.user.pid) {
    return res.status(403).json({ error: 'Área exclusiva do paciente.' });
  }
  next();
}
