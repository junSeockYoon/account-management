const dashboardService = require('../services/dashboardService');

function home(req, res) {
  res.locals.pageTitle = '대시보드';
  res.render('dashboard', { dashboard: dashboardService.getDashboard() });
}

module.exports = { home };
