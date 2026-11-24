const transactionService = require('../services/transactionService');

function redirectTo(res, result) {
  const params = new URLSearchParams();
  if (result.month) params.set('month', result.month);
  params.set(result.ok ? 'notice' : 'error', result.ok ? result.notice : result.error);
  res.redirect(303, `/transactions?${params}`);
}

function show(req, res) {
  res.locals.pageTitle = '거래 내역';
  res.render('transactions', { page: transactionService.getPage(req.query) });
}

async function create(req, res) {
  redirectTo(res, await transactionService.create(req.body));
}

async function update(req, res) {
  redirectTo(res, await transactionService.update(req.params.id, req.body));
}

async function remove(req, res) {
  redirectTo(res, await transactionService.remove(req.params.id, req.body));
}

async function setStatement(req, res) {
  redirectTo(res, await transactionService.setStatement(req.params.id, req.body));
}

module.exports = { show, create, update, remove, setStatement };
