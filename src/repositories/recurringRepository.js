const { getState } = require('./store');
const db = require('./db');

function findAll() {
  return getState().recurring || [];
}

function findById(id) {
  return findAll().find((item) => item.id === id) || null;
}

async function insert(item) {
  const saved = await db.insert('recurring_expenses', item, getState().userId);
  findAll().push(saved);
  return saved;
}

async function remove(id) {
  const list = findAll();
  const index = list.findIndex((item) => item.id === id);
  if (index < 0) return false;
  await db.remove('recurring_expenses', id);
  list.splice(index, 1);
  return true;
}

module.exports = { findAll, findById, insert, remove };
