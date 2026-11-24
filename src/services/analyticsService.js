const cardRepository = require('../repositories/cardRepository');
const transactionRepository = require('../repositories/transactionRepository');
const categoryRepository = require('../repositories/categoryRepository');
const metaRepository = require('../repositories/metaRepository');
const { formatKRW, formatShare, formatMonthDay, shiftMonth, toShares } = require('../utils/format');

function monthKey(iso, offset) {
  return shiftMonth(iso, offset).slice(0, 7);
}

function monthLabel(key, asOfYear) {
  const [year, month] = key.split('-');
  const label = `${Number(month)}월`;
  return year === asOfYear ? label : `${year.slice(2)}.${label}`;
}

function nextMonth(key) {
  return shiftMonth(`${key}-01`, 1);
}

function getReport() {
  const asOf = metaRepository.getAsOf();
  const asOfYear = asOf.slice(0, 4);
  const transactions = transactionRepository.findAll();
  const categories = categoryRepository.findAll();
  const cards = cardRepository.findAll();
  const currentKey = asOf.slice(0, 7);
  const currentStart = `${currentKey}-01`;

  const trend = [];
  for (let offset = -5; offset <= 0; offset += 1) {
    const key = monthKey(asOf, offset);
    const start = `${key}-01`;
    const end = key === currentKey ? asOf : nextMonth(key);
    const amount = transactions.reduce((total, tx) => {
      if (tx.type !== 'expense' || tx.date < start) return total;
      const inside = key === currentKey ? tx.date <= end : tx.date < end;
      return inside ? total + tx.amount : total;
    }, 0);
    trend.push({ label: monthLabel(key, asOfYear), amount, text: formatKRW(amount) });
  }

  const monthExpenses = transactions.filter((tx) => (
    tx.type === 'expense' && tx.date >= currentStart && tx.date <= asOf
  ));
  const monthTotal = monthExpenses.reduce((total, tx) => total + tx.amount, 0);
  const fixed = monthExpenses.reduce((total, tx) => total + (tx.expenseClass === 'fixed' ? tx.amount : 0), 0);
  const variable = monthTotal - fixed;
  const [fixedShare, variableShare] = toShares([fixed, variable]);

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const grouped = new Map();
  monthExpenses.forEach((tx) => {
    const current = grouped.get(tx.categoryId) || { count: 0, amount: 0 };
    current.count += 1;
    current.amount += tx.amount;
    grouped.set(tx.categoryId, current);
  });
  const categoryRows = [...grouped.entries()]
    .map(([id, row]) => {
      const category = categoryById.get(id);
      const average = row.count > 0 ? Math.round(row.amount / row.count) : 0;
      return {
        name: category ? category.name : id,
        color: category ? category.color : '#94A3B8',
        count: row.count,
        amount: row.amount,
        amountText: formatKRW(row.amount),
        averageText: formatKRW(average),
        shareText: formatShare(monthTotal > 0 ? Math.round((row.amount / monthTotal) * 1000) / 10 : 0),
      };
    })
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'ko'));

  const cardRows = cards.map((card) => {
    const amount = monthExpenses.reduce((total, tx) => total + (tx.cardId === card.id ? tx.amount : 0), 0);
    const threshold = card.performanceThreshold || 0;
    const percent = threshold > 0 ? Math.round((amount / threshold) * 1000) / 10 : 0;
    return {
      id: card.id,
      name: `${card.issuer} ${card.name}`,
      kind: card.type === 'credit' ? '신용' : '체크',
      amount,
      amountText: formatKRW(amount),
      thresholdText: threshold > 0 ? formatKRW(threshold) : '기준 없음',
      percent,
      percentText: threshold > 0 ? formatShare(percent) : '',
      bar: Math.min(percent, 100),
      met: threshold > 0 && amount >= threshold,
    };
  }).sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'ko'));

  return {
    rangeLabel: `${formatMonthDay(currentStart)}–${formatMonthDay(asOf)}`,
    monthExpense: { amount: monthTotal, text: formatKRW(monthTotal) },
    fixed: { amount: fixed, text: formatKRW(fixed), share: fixedShare, shareText: formatShare(fixedShare) },
    variable: { amount: variable, text: formatKRW(variable), share: variableShare, shareText: formatShare(variableShare) },
    trend,
    cards: cardRows,
    categories: categoryRows,
  };
}

module.exports = { getReport };
