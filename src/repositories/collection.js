const { getState } = require('./store');

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
    insert(item) {
      items().push(item);
      return item;
    },
    remove(id) {
      const list = items();
      const index = list.findIndex((item) => item.id === id);
      if (index < 0) return false;
      list.splice(index, 1);
      return true;
    },
  };
}

module.exports = { collection };
