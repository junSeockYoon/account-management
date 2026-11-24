const recurringService = require('../services/recurringService');

function redirectTo(res, result) {
  const key = result.ok ? 'notice' : 'error';
  const value = result.ok ? result.notice : result.error;
  res.redirect(303, `/transactions/new?${key}=${encodeURIComponent(value)}`);
}

async function create(req, res) {
  redirectTo(res, await recurringService.create(req.body));
}

async function remove(req, res) {
  redirectTo(res, await recurringService.remove(req.params.id));
}

module.exports = { create, remove };
