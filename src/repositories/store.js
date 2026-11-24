const { createInitialState } = require('../data/mockData');

let state = createInitialState();

function getState() {
  return state;
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

module.exports = { getState, createId };
