const session = require('../auth/session');

const errors = {
  missing: '이메일과 비밀번호를 입력해 주세요. 비밀번호는 6자 이상입니다.',
  invalid: '이메일 또는 비밀번호가 올바르지 않습니다.',
  confirm: '가입 메일함을 확인한 뒤 로그인해 주세요.',
  exists: '이미 가입한 이메일입니다. 로그인해 주세요.',
  weak: '비밀번호는 6자 이상으로 해 주세요.',
  auth: '로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
};

function show(mode) {
  return (req, res) => {
    res.render('login', { mode, error: errors[req.query.error] || '' });
  };
}

function emailOf(body) {
  return String(body.email || '').trim().toLowerCase();
}

function reject(res, path, code) {
  res.redirect(303, `${path}?error=${code}`);
}

async function login(req, res) {
  const email = emailOf(req.body);
  const password = String(req.body.password || '');
  if (!email.includes('@') || password.length < 6) return reject(res, '/login', 'missing');
  try {
    const tokens = await session.signIn(email, password);
    if (!session.saveTokens(res, tokens)) return reject(res, '/login', 'confirm');
    res.redirect(303, '/');
  } catch (err) {
    const code = { INVALID: 'invalid', CONFIRM: 'confirm', WEAK: 'weak' }[err.code] || 'auth';
    reject(res, '/login', code);
  }
}

async function signup(req, res) {
  const email = emailOf(req.body);
  const password = String(req.body.password || '');
  const name = String(req.body.name || '').trim().slice(0, 20);
  if (!email.includes('@') || password.length < 6) return reject(res, '/signup', 'missing');
  try {
    const tokens = await session.signUp(email, password, name);
    if (!session.saveTokens(res, tokens)) return reject(res, '/login', 'confirm');
    res.redirect(303, '/');
  } catch (err) {
    const code = { EXISTS: 'exists', WEAK: 'weak', CONFIRM: 'confirm' }[err.code] || 'auth';
    reject(res, code === 'exists' ? '/login' : '/signup', code);
  }
}

function logout(req, res) {
  session.clearSession(res);
  res.redirect(303, '/login');
}

module.exports = { show, login, signup, logout };
