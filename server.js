const express = require('express');
const path = require('path');
const navItems = require('./src/config/nav');
const { loadState, runWithState } = require('./src/repositories/store');
const { ensureAccess } = require('./src/auth/session');
const { formatKoreanDate, safeJson } = require('./src/utils/format');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.locals.safeJson = safeJson;

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

const openPaths = new Set(['/login', '/signup', '/logout']);

app.use((req, res, next) => {
  if (openPaths.has(req.path)) {
    next();
    return;
  }
  ensureAccess(req, res)
    .then((token) => {
      if (!token) {
        res.redirect(303, '/login');
        return;
      }
      return loadState(token).then((state) => {
        runWithState(state, () => {
          res.locals.profile = state.profile;
          res.locals.asOfLabel = formatKoreanDate(state.asOf);
          res.locals.pageTitle = '자산관리';
          res.locals.navItems = navItems.map((item) => ({
            ...item,
            active: item.href === '/' ? req.path === '/' : req.path.startsWith(item.href),
          }));
          next();
        });
      });
    })
    .catch((err) => {
      if (err.code === 'UNAUTHORIZED') {
        res.redirect(303, '/login');
        return;
      }
      next(err);
    });
});

app.use(require('./src/routes'));

app.use((req, res) => {
  res.status(404);
  res.locals.pageTitle = '페이지를 찾을 수 없습니다';
  res.render('coming-soon', { message: '요청한 페이지가 없습니다.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) {
    next(err);
    return;
  }
  const message = err.code === 'CONFIG'
    ? 'Supabase 환경 변수가 없습니다.'
    : '화면을 불러오지 못했습니다.';
  res.status(500).type('text').send(message);
});

module.exports = app;

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`PFM app listening on http://localhost:${port}`);
  });
}
