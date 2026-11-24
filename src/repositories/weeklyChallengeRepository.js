const { getState } = require('./store');
const db = require('./db');

function findAll() {
  return getState().weeklyChallenges || [];
}

async function insert(item) {
  const saved = await db.insert('weekly_challenges', item, getState().userId);
  findAll().push(saved);
  return saved;
}

module.exports = { findAll, insert };
