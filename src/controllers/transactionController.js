const transactionService = require('../services/transactionService');

function redirectTo(res, result) {
  const params = new URLSearchParams();
  if (result.month) params.set('month', result.month);
  params.set(result.ok ? 'notice' : 'error', result.ok ? result.notice : result.error);
  if (result.detail) params.set('detail', result.detail);
  res.redirect(303, `/transactions?${params}`);
}

function redirectEntry(res, result, editingId) {
  if (result.ok) {
    redirectTo(res, result);
    return;
  }
  const params = new URLSearchParams();
  params.set('error', result.error);
  if (editingId) params.set('id', editingId);
  res.redirect(303, `/transactions/new?${params}`);
}

function show(req, res) {
  res.locals.pageTitle = '거래 내역';
  res.render('transactions', { page: transactionService.getPage(req.query) });
}

function entry(req, res) {
  const page = transactionService.getEntry(req.query);
  res.locals.pageTitle = page.editingId ? '거래 수정' : '거래 입력';
  res.render('transaction-entry', { page });
}

async function create(req, res) {
  redirectEntry(res, await transactionService.create(req.body));
}

async function update(req, res) {
  redirectEntry(res, await transactionService.update(req.params.id, req.body), req.params.id);
}

async function remove(req, res) {
  redirectTo(res, await transactionService.remove(req.params.id, req.body));
}

async function setStatement(req, res) {
  redirectTo(res, await transactionService.setStatement(req.params.id, req.body));
}

module.exports = { show, entry, create, update, remove, setStatement };
