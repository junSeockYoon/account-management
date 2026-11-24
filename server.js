const express = require('express');
const path = require('path');
const navItems = require('./src/config/nav');
const { getState } = require('./src/repositories/store');
const { formatKoreanDate, safeJson } = require('./src/utils/format');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));
app.locals.safeJson = safeJson;

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  const state = getState();
  res.locals.profile = state.profile;
  res.locals.asOfLabel = formatKoreanDate(state.asOf);
  res.locals.pageTitle = '자산관리';
  res.locals.navItems = navItems.map((item) => ({
    ...item,
    active: item.href === '/' ? req.path === '/' : req.path.startsWith(item.href),
  }));
  next();
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
  res.status(500).type('text').send('화면을 불러오지 못했습니다.');
});

module.exports = app;

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`PFM app listening on http://localhost:${port}`);
  });
}
