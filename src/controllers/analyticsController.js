const analyticsService = require('../services/analyticsService');

function show(req, res) {
  res.locals.pageTitle = '소비 리포트';
  res.render('analytics', { report: analyticsService.getReport() });
}

module.exports = { show };
