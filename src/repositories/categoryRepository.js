const { getState } = require('./store');

function findAll() {
  return getState().categories;
}

module.exports = { findAll };
