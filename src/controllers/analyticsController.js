const analyticsService = require('../services/analyticsService');
const cardLimit = require('../services/cardLimit');

function show(req, res) {
  res.locals.pageTitle = '소비 리포트';
  res.render('analytics', {
    report: analyticsService.getReport(),
    flash: cardLimit.flash(req.query),
  });
}

async function saveCardLimit(req, res) {
  const next = req.body.next === 'analytics' ? '/analytics' : '/';
  const result = await cardLimit.save(req.body);
  const key = result.ok ? 'notice' : 'error';
  const value = result.ok ? result.notice : result.error;
  res.redirect(303, `${next}?${key}=${encodeURIComponent(value)}`);
}

module.exports = { show, saveCardLimit };
