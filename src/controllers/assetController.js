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

async function createAccount(req, res) {
  redirectTo(res, 'accounts', await assetService.createAccount(req.body));
}

async function updateAccount(req, res) {
  redirectTo(res, 'accounts', await assetService.updateAccount(req.params.id, req.body));
}

async function deleteAccount(req, res) {
  redirectTo(res, 'accounts', await assetService.deleteAccount(req.params.id));
}

async function createDeposit(req, res) {
  redirectTo(res, 'deposits', await assetService.createDeposit(req.body));
}

async function updateDeposit(req, res) {
  redirectTo(res, 'deposits', await assetService.updateDeposit(req.params.id, req.body));
}

async function deleteDeposit(req, res) {
  redirectTo(res, 'deposits', await assetService.deleteDeposit(req.params.id));
}

async function createSavings(req, res) {
  redirectTo(res, 'savings', await assetService.createSavings(req.body));
}

async function updateSavings(req, res) {
  redirectTo(res, 'savings', await assetService.updateSavings(req.params.id, req.body));
}

async function deleteSavings(req, res) {
  redirectTo(res, 'savings', await assetService.deleteSavings(req.params.id));
}

async function createStock(req, res) {
  redirectTo(res, 'stocks', await assetService.createStock(req.body));
}

async function updateStock(req, res) {
  redirectTo(res, 'stocks', await assetService.updateStock(req.params.id, req.body));
}

async function deleteStock(req, res) {
  redirectTo(res, 'stocks', await assetService.deleteStock(req.params.id));
}

async function createCard(req, res) {
  redirectTo(res, 'cards', await assetService.createCard(req.body));
}

async function updateCard(req, res) {
  redirectTo(res, 'cards', await assetService.updateCard(req.params.id, req.body));
}

async function deleteCard(req, res) {
  redirectTo(res, 'cards', await assetService.deleteCard(req.params.id));
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
