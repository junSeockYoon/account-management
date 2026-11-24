const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const assetController = require('../controllers/assetController');
const transactionController = require('../controllers/transactionController');
const analyticsController = require('../controllers/analyticsController');
const authController = require('../controllers/authController');

function guard(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

const router = express.Router();

router.get('/login', authController.show('login'));
router.post('/login', guard(authController.login));
router.get('/signup', authController.show('signup'));
router.post('/signup', guard(authController.signup));
router.post('/logout', authController.logout);

router.get('/', guard(dashboardController.home));
router.get('/transactions', guard(transactionController.show));
router.post('/transactions', guard(transactionController.create));
router.post('/transactions/:id/update', guard(transactionController.update));
router.post('/transactions/:id/delete', guard(transactionController.remove));
router.get('/assets', guard(assetController.show));
router.post('/assets/accounts', guard(assetController.createAccount));
router.post('/assets/accounts/:id/update', guard(assetController.updateAccount));
router.post('/assets/accounts/:id/delete', guard(assetController.deleteAccount));
router.post('/assets/deposits', guard(assetController.createDeposit));
router.post('/assets/deposits/:id/update', guard(assetController.updateDeposit));
router.post('/assets/deposits/:id/delete', guard(assetController.deleteDeposit));
router.post('/assets/savings', guard(assetController.createSavings));
router.post('/assets/savings/:id/update', guard(assetController.updateSavings));
router.post('/assets/savings/:id/delete', guard(assetController.deleteSavings));
router.post('/assets/stocks', guard(assetController.createStock));
router.post('/assets/stocks/:id/update', guard(assetController.updateStock));
router.post('/assets/stocks/:id/delete', guard(assetController.deleteStock));
router.post('/assets/cards', guard(assetController.createCard));
router.post('/assets/cards/:id/update', guard(assetController.updateCard));
router.post('/assets/cards/:id/delete', guard(assetController.deleteCard));
router.get('/analytics', guard(analyticsController.show));

module.exports = router;
