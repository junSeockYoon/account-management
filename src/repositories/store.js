const { AsyncLocalStorage } = require('async_hooks');
const { fetchState } = require('./db');

const storage = new AsyncLocalStorage();

function getState() {
  const state = storage.getStore();
  if (!state) throw new Error('요청 밖에서 데이터를 읽었습니다.');
  return state;
}

function runWithState(state, fn) {
  return storage.run(state, fn);
}

module.exports = { getState, runWithState, loadState: fetchState };
