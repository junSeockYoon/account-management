const dashboardService = require('../services/dashboardService');
const cardLimit = require('../services/cardLimit');

async function home(req, res) {
  res.locals.pageTitle = '대시보드';
  const dashboard = dashboardService.getDashboard();
  await dashboardService.rememberNetWorth(dashboard.snapshot);
  res.render('dashboard', {
    dashboard,
    flash: cardLimit.flash(req.query),
  });
}

module.exports = { home };
