const { loadEnv } = require('../config/env');

loadEnv();

const ACCESS = 'sb_access';
const REFRESH = 'sb_refresh';

function fail(code) {
  const err = new Error(code);
  err.code = code;
  return err;
}

function parseCookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach((part) => {
    const index = part.indexOf('=');
    if (index < 1) return;
    const key = part.slice(0, index).trim();
    try {
      out[key] = decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      out[key] = '';
    }
  });
  return out;
}

function writeCookie(res, name, value, maxAge) {
  const bits = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (process.env.VERCEL) bits.push('Secure');
  const line = bits.join('; ');
  const prev = res.getHeader('Set-Cookie');
  if (!prev) res.setHeader('Set-Cookie', line);
  else res.setHeader('Set-Cookie', [].concat(prev, line));
}

function readTokens(req) {
  const cookies = parseCookies(req);
  return { access: cookies[ACCESS] || '', refresh: cookies[REFRESH] || '' };
}

function saveTokens(res, tokens) {
  const session = tokens.access_token ? tokens : tokens.session;
  if (!session || !session.access_token) return false;
  writeCookie(res, ACCESS, session.access_token, Number(session.expires_in) || 3600);
  if (session.refresh_token) writeCookie(res, REFRESH, session.refresh_token, 60 * 60 * 24 * 30);
  return true;
}

function clearSession(res) {
  writeCookie(res, ACCESS, '', 0);
  writeCookie(res, REFRESH, '', 0);
}

function jwtExp(token) {
  try {
    const json = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return Number(json.exp) || 0;
  } catch {
    return 0;
  }
}

function stale(token) {
  const exp = jwtExp(token);
  if (!exp) return false;
  return exp * 1000 < Date.now() + 30000;
}

async function authRequest(path, body) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) throw fail('CONFIG');
  const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const code = data.error_code || data.error || '';
    const msg = `${data.msg || ''} ${data.error_description || ''}`.toLowerCase();
    if (code === 'invalid_credentials' || msg.includes('invalid login')) throw fail('INVALID');
    if (code === 'email_not_confirmed' || msg.includes('not confirmed')) throw fail('CONFIRM');
    if (code === 'user_already_exists' || msg.includes('already registered')) throw fail('EXISTS');
    if (code === 'weak_password' || msg.includes('password')) throw fail('WEAK');
    console.error('supabase auth', response.status, code);
    throw fail('AUTH');
  }
  return data;
}

function signIn(email, password) {
  return authRequest('token?grant_type=password', { email, password });
}

function signUp(email, password, name) {
  return authRequest('signup', { email, password, data: { name: name || '나' } });
}

async function ensureAccess(req, res) {
  const tokens = readTokens(req);
  if (tokens.access && !stale(tokens.access)) return tokens.access;
  if (!tokens.refresh) return '';
  try {
    const next = await authRequest('token?grant_type=refresh_token', { refresh_token: tokens.refresh });
    if (!saveTokens(res, next)) return '';
    return (next.access_token ? next : next.session).access_token;
  } catch {
    clearSession(res);
    return '';
  }
}

module.exports = { signIn, signUp, saveTokens, clearSession, ensureAccess };
