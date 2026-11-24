const navItems = require('../config/nav');

function comingSoon(req, res) {
  const item = navItems.find((entry) => entry.href === req.path);
  res.locals.pageTitle = item ? item.label : '준비 중';
  res.render('coming-soon');
}

module.exports = { comingSoon };
