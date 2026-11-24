const dashboardService = require('../services/dashboardService');
const cardLimit = require('../services/cardLimit');

function home(req, res) {
  res.locals.pageTitle = '대시보드';
  res.render('dashboard', {
    dashboard: dashboardService.getDashboard(),
    flash: cardLimit.flash(req.query),
  });
}

module.exports = { home };
