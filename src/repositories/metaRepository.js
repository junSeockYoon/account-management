const { getState } = require('./store');

function getAsOf() {
  return getState().asOf;
}

function getProfile() {
  return getState().profile;
}

function getFxRate() {
  return getState().fxRate;
}

module.exports = { getAsOf, getProfile, getFxRate };
