const { getState } = require('./store');
const db = require('./db');

function collection(key) {
  function items() {
    return getState()[key];
  }

  return {
    findAll() {
      return items();
    },
    findById(id) {
      return items().find((item) => item.id === id) || null;
    },
    async insert(item) {
      const saved = await db.insert(key, item, getState().userId);
      items().push(saved);
      return saved;
    },
    async save(item) {
      await db.update(key, item);
      return item;
    },
    async remove(id) {
      const list = items();
      const index = list.findIndex((item) => item.id === id);
      if (index < 0) return false;
      await db.remove(key, id);
      list.splice(index, 1);
      return true;
    },
  };
}

module.exports = { collection };
