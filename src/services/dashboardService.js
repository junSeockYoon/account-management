const accountRepository = require('../repositories/accountRepository');
const depositRepository = require('../repositories/depositRepository');
const savingsRepository = require('../repositories/savingsRepository');
const stockRepository = require('../repositories/stockRepository');
const cardRepository = require('../repositories/cardRepository');
const transactionRepository = require('../repositories/transactionRepository');
const categoryRepository = require('../repositories/categoryRepository');
const metaRepository = require('../repositories/metaRepository');
const {
  formatKRW,
  formatSignedKRW,
  formatMan,
  formatShare,
  diffDays,
  formatDday,
  formatMonthDay,
  monthStart,
  shiftMonth,
  toShares,
} = require('../utils/format');
const { getState } = require('../repositories/store');
const db = require('../repositories/db');
const { stockValueKRW, cardDebt } = require('../utils/assetMath');
const cardLimit = require('./cardLimit');

function sumBy(items, pick) {
  return items.reduce((total, item) => total + pick(item), 0);
}

function sumExpense(transactions, start, end) {
  return transactions.reduce((total, tx) => {
    if (tx.type !== 'expense' || tx.date < start || tx.date > end) return total;
    return total + tx.amount;
  }, 0);
}

function buildPortfolio(cash, safe, investment) {
  const shares = toShares([cash, safe, investment]);
  const items = [
    {
      key: 'cash',
      name: '현금성',
      description: '입출금·파킹·증권 예수금',
      amount: cash,
      color: '#3182F6',
    },
    {
      key: 'safe',
      name: '안전자산',
      description: '예금·적금·청약',
      amount: safe,
      color: '#12B886',
    },
    {
      key: 'investment',
      name: '투자자산',
      description: '주식',
      amount: investment,
      color: '#6D5EF9',
    },
  ];

  return items.map((item, index) => ({
    ...item,
    text: formatKRW(item.amount),
    share: shares[index],
    shareText: formatShare(shares[index]),
  }));
}

function buildTopCategories(transactions, categories, start, end, monthExpense) {
  const totals = new Map();
  transactions.forEach((tx) => {
    if (tx.type !== 'expense' || tx.date < start || tx.date > end) return;
    totals.set(tx.categoryId, (totals.get(tx.categoryId) || 0) + tx.amount);
  });

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const ranked = [...totals.entries()]
    .map(([id, amount]) => {
      const category = categoryById.get(id);
      const share = monthExpense > 0 ? Math.round((amount / monthExpense) * 1000) / 10 : 0;
      return {
        id,
        name: category ? category.name : id,
        color: category ? category.color : '#94A3B8',
        amount,
        text: formatKRW(amount),
        share,
        shareText: formatShare(share),
      };
    })
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'ko'))
    .slice(0, 3);

  const max = ranked.length > 0 ? ranked[0].amount : 0;
  return ranked.map((item) => ({
    ...item,
    bar: max > 0 ? Math.round((item.amount / max) * 1000) / 10 : 0,
  }));
}

function buildMaturities(deposits, savings, asOf) {
  const items = [
    ...deposits.map((item) => ({
      id: item.id,
      kind: '예금',
      bankName: item.bankName,
      name: item.productName,
      date: item.maturityDate,
      amount: item.principal,
    })),
    ...savings.filter((item) => item.maturityDate).map((item) => ({
      id: item.id,
      kind: item.productKind === 'housing' ? '청약' : '적금',
      bankName: item.bankName,
      name: item.productName,
      date: item.maturityDate,
      amount: item.accumulated,
    })),
  ];

  return items
    .map((item) => {
      const days = diffDays(asOf, item.date);
      return {
        ...item,
        dateLabel: item.date.replace(/-/g, '.'),
        dday: days,
        ddayLabel: formatDday(days),
        amountText: formatKRW(item.amount),
        urgent: days <= 30,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, 'ko'));
}

function historyLabel(month, asOf) {
  const [year, mon] = month.split('-');
  const label = `${Number(mon)}월`;
  return year === asOf.slice(0, 4) ? label : `${year.slice(2)}.${label}`;
}

function buildHistory(stored, live, asOf) {
  const byMonth = new Map((stored || []).map((item) => [item.month, item]));
  byMonth.set(live.month, live);
  return [...byMonth.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6)
    .map((item) => ({
      label: historyLabel(item.month, asOf),
      amount: item.netWorth,
      text: formatKRW(item.netWorth),
    }));
}

function getDashboard() {
  const asOf = metaRepository.getAsOf();
  const usdRate = metaRepository.getFxRate().USD;
  const accounts = accountRepository.findAll();
  const deposits = depositRepository.findAll();
  const savings = savingsRepository.findAll();
  const stocks = stockRepository.findAll();
  const cards = cardRepository.findAll();
  const transactions = transactionRepository.findAll();
  const categories = categoryRepository.findAll();

  const cash = sumBy(accounts, (account) => account.balance);
  const safe = sumBy(deposits, (deposit) => deposit.principal) + sumBy(savings, (item) => item.accumulated);
  const investment = sumBy(stocks, (stock) => stockValueKRW(stock, usdRate));
  const liabilities = sumBy(cards, (card) => cardDebt(card, transactions));
  const assets = cash + safe + investment;
  const netWorth = assets - liabilities;
  const snapshot = {
    month: `${asOf.slice(0, 7)}-01`,
    cash,
    safe,
    investment,
    liabilities,
    netWorth,
  };

  const periodEnd = asOf;
  const periodStart = monthStart(asOf);
  const previousEnd = shiftMonth(asOf, -1);
  const previousStart = monthStart(previousEnd);
  const monthExpense = sumExpense(transactions, periodStart, periodEnd);
  const previousExpense = sumExpense(transactions, previousStart, previousEnd);
  const delta = monthExpense - previousExpense;
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const caption = direction === 'up'
    ? '전월 같은 기간보다 늘었습니다'
    : direction === 'down'
      ? '전월 같은 기간보다 줄었습니다'
      : '전월 같은 기간과 같습니다';

  return {
    snapshot,
    history: buildHistory(getState().netWorthMonths, snapshot, asOf),
    netWorth: { amount: netWorth, text: formatKRW(netWorth) },
    assets: { amount: assets, text: formatKRW(assets), compact: formatMan(assets) },
    liabilities: { amount: liabilities, text: formatKRW(liabilities) },
    monthExpense: {
      amount: monthExpense,
      text: formatKRW(monthExpense),
      label: `${Number(periodStart.slice(5, 7))}월 지출`,
      rangeLabel: `${formatMonthDay(periodStart)}–${formatMonthDay(periodEnd)}`,
    },
    expenseDelta: {
      amount: delta,
      text: formatSignedKRW(delta),
      direction,
      caption,
      previousText: formatKRW(previousExpense),
      previousRangeLabel: `${formatMonthDay(previousStart)}–${formatMonthDay(previousEnd)}`,
    },
    portfolio: buildPortfolio(cash, safe, investment),
    topCategories: buildTopCategories(transactions, categories, periodStart, periodEnd, monthExpense),
    maturities: buildMaturities(deposits, savings, asOf),
    cardLimit: cardLimit.present(
      transactions,
      asOf,
      metaRepository.getProfile().monthlyCardLimit,
      metaRepository.getProfile().cardCycleDay,
    ),
    fxLabel: usdRate ? `달러 주식은 1달러 = ${usdRate.toLocaleString('ko-KR')}원으로 환산했습니다` : '',
  };
}

async function rememberNetWorth(snapshot) {
  const state = getState();
  if (!state.userId || !snapshot) return;
  const list = state.netWorthMonths || [];
  const index = list.findIndex((item) => item.month === snapshot.month);
  if (index >= 0) list[index] = snapshot;
  else list.push(snapshot);
  state.netWorthMonths = list;
  try {
    await db.upsertNetWorth(state.userId, snapshot);
  } catch (err) {
    if (err.code !== 'WRITE') throw err;
  }
}

module.exports = { getDashboard, rememberNetWorth, buildHistory };
