const assetService = require('../services/assetService');

function redirectTo(res, tab, result) {
  const key = result.ok ? 'notice' : 'error';
  const value = result.ok ? result.notice : result.error;
  res.redirect(303, `/assets?tab=${tab}&${key}=${encodeURIComponent(value)}`);
}

function show(req, res) {
  res.locals.pageTitle = '자산 현황';
  res.render('assets', {
    assets: assetService.getAssetsPage({
      tab: req.query.tab,
      notice: req.query.notice,
      error: req.query.error,
    }),
  });
}

function createAccount(req, res) {
  redirectTo(res, 'accounts', assetService.createAccount(req.body));
}

function updateAccount(req, res) {
  redirectTo(res, 'accounts', assetService.updateAccount(req.params.id, req.body));
}

function deleteAccount(req, res) {
  redirectTo(res, 'accounts', assetService.deleteAccount(req.params.id));
}

function createDeposit(req, res) {
  redirectTo(res, 'deposits', assetService.createDeposit(req.body));
}

function updateDeposit(req, res) {
  redirectTo(res, 'deposits', assetService.updateDeposit(req.params.id, req.body));
}

function deleteDeposit(req, res) {
  redirectTo(res, 'deposits', assetService.deleteDeposit(req.params.id));
}

function createSavings(req, res) {
  redirectTo(res, 'savings', assetService.createSavings(req.body));
}

function updateSavings(req, res) {
  redirectTo(res, 'savings', assetService.updateSavings(req.params.id, req.body));
}

function deleteSavings(req, res) {
  redirectTo(res, 'savings', assetService.deleteSavings(req.params.id));
}

function createStock(req, res) {
  redirectTo(res, 'stocks', assetService.createStock(req.body));
}

function updateStock(req, res) {
  redirectTo(res, 'stocks', assetService.updateStock(req.params.id, req.body));
}

function deleteStock(req, res) {
  redirectTo(res, 'stocks', assetService.deleteStock(req.params.id));
}

function createCard(req, res) {
  redirectTo(res, 'cards', assetService.createCard(req.body));
}

function updateCard(req, res) {
  redirectTo(res, 'cards', assetService.updateCard(req.params.id, req.body));
}

function deleteCard(req, res) {
  redirectTo(res, 'cards', assetService.deleteCard(req.params.id));
}

module.exports = {
  show,
  createAccount,
  updateAccount,
  deleteAccount,
  createDeposit,
  updateDeposit,
  deleteDeposit,
  createSavings,
  updateSavings,
  deleteSavings,
  createStock,
  updateStock,
  deleteStock,
  createCard,
  updateCard,
  deleteCard,
};
