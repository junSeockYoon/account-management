const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const assetController = require('../controllers/assetController');
const transactionController = require('../controllers/transactionController');
const analyticsController = require('../controllers/analyticsController');

const router = express.Router();

router.get('/', dashboardController.home);
router.get('/transactions', transactionController.show);
router.post('/transactions', transactionController.create);
router.post('/transactions/:id/update', transactionController.update);
router.post('/transactions/:id/delete', transactionController.remove);
router.get('/assets', assetController.show);
router.post('/assets/accounts', assetController.createAccount);
router.post('/assets/accounts/:id/update', assetController.updateAccount);
router.post('/assets/accounts/:id/delete', assetController.deleteAccount);
router.post('/assets/deposits', assetController.createDeposit);
router.post('/assets/deposits/:id/update', assetController.updateDeposit);
router.post('/assets/deposits/:id/delete', assetController.deleteDeposit);
router.post('/assets/savings', assetController.createSavings);
router.post('/assets/savings/:id/update', assetController.updateSavings);
router.post('/assets/savings/:id/delete', assetController.deleteSavings);
router.post('/assets/stocks', assetController.createStock);
router.post('/assets/stocks/:id/update', assetController.updateStock);
router.post('/assets/stocks/:id/delete', assetController.deleteStock);
router.post('/assets/cards', assetController.createCard);
router.post('/assets/cards/:id/update', assetController.updateCard);
router.post('/assets/cards/:id/delete', assetController.deleteCard);
router.get('/analytics', analyticsController.show);

module.exports = router;
