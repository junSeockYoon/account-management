const dashboardService = require('../services/dashboardService');
const cardLimit = require('../services/cardLimit');
const spendingReport = require('../services/spendingReport');
const weeklyChallenge = require('../services/weeklyChallenge');

async function home(req, res) {
  res.locals.pageTitle = '대시보드';
  const dashboard = dashboardService.getDashboard();
  const [report] = await Promise.all([
    spendingReport.present(),
    dashboardService.rememberNetWorth(dashboard.snapshot),
  ]);
  const cardFlash = cardLimit.flash(req.query);
  const targetFlash = spendingReport.flash(req.query);
  const challengeFlash = weeklyChallenge.flash(req.query);
  res.render('dashboard', {
    dashboard,
    spendingReport: report,
    challenge: weeklyChallenge.present(),
    flash: {
      notice: cardFlash.notice || targetFlash.notice || challengeFlash.notice,
      error: cardFlash.error || targetFlash.error || challengeFlash.error,
    },
  });
}

async function saveTarget(req, res) {
  const result = await spendingReport.save(req.body);
  const params = new URLSearchParams();
  params.set(result.ok ? 'notice' : 'error', result.ok ? result.notice : result.error);
  res.redirect(303, `/?${params}`);
}

async function saveChallenge(req, res) {
  const result = await weeklyChallenge.save(req.body);
  const params = new URLSearchParams();
  params.set(result.ok ? 'notice' : 'error', result.ok ? result.notice : result.error);
  res.redirect(303, `/?${params}`);
}

module.exports = { home, saveTarget, saveChallenge };
