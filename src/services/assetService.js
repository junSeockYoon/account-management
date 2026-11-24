const accountRepository = require('../repositories/accountRepository');
const depositRepository = require('../repositories/depositRepository');
const savingsRepository = require('../repositories/savingsRepository');
const stockRepository = require('../repositories/stockRepository');
const cardRepository = require('../repositories/cardRepository');
const transactionRepository = require('../repositories/transactionRepository');
const metaRepository = require('../repositories/metaRepository');
const form = require('../utils/form');
const {
  formatKRW,
  formatSignedKRW,
  formatUSD,
  formatSignedUSD,
  formatSignedPercent,
  formatQuantity,
  formatAnnualRate,
  formatDday,
  diffDays,
} = require('../utils/format');
const {
  stockValueKRW,
  stockCost,
  stockProfit,
  stockReturnRate,
  stockCostKRW,
  directionOf,
} = require('../utils/assetMath');

const TABS = [
  { id: 'accounts', label: '입출금' },
  { id: 'deposits', label: '예금' },
  { id: 'savings', label: '적금·청약' },
  { id: 'stocks', label: '주식' },
  { id: 'cards', label: '부채/카드' },
];

const NOTICES = {
  created: '저장했습니다.',
  updated: '수정했습니다.',
  deleted: '삭제했습니다.',
};

const ERRORS = {
  invalid: '입력값을 다시 확인해 주세요.',
  'card-digits': '카드 끝 네 자리는 숫자 4개로 입력해 주세요.',
  'card-account': '체크카드는 연결할 입출금 계좌를 골라 주세요.',
  notfound: '항목을 찾지 못했습니다.',
  'account-in-use': '연결된 거래, 적금 자동이체, 체크카드가 있어 삭제할 수 없습니다.',
  'asset-in-use': '연결된 거래가 있어 삭제할 수 없습니다.',
  'card-in-use': '이 카드로 기록된 거래가 있어 삭제할 수 없습니다.',
  nouser: 'Supabase에 가입한 사용자가 없어 저장할 수 없습니다.',
};

const KIND_LABELS = {
  checking: '입출금',
  parking: '파킹',
  brokerage: '증권 예수금',
};

function sumBy(items, pick) {
  return items.reduce((total, item) => total + pick(item), 0);
}

function moneyText(amount, currency) {
  return currency === 'USD' ? formatUSD(amount) : formatKRW(amount);
}

function signedMoneyText(amount, currency) {
  return currency === 'USD' ? formatSignedUSD(amount) : formatSignedKRW(amount);
}

function accountOptions() {
  return accountRepository.findAll().map((account) => ({
    id: account.id,
    label: `${account.bankName} ${account.name}`,
  }));
}

function accountLabel(id) {
  const account = accountRepository.findById(id);
  return account ? `${account.bankName} ${account.name}` : '연결 계좌 없음';
}

function isAccountInUse(id) {
  if (savingsRepository.findAll().some((item) => item.autoTransferAccountId === id)) return true;
  if (cardRepository.findAll().some((item) => item.linkedAccountId === id)) return true;
  return transactionRepository.findAll().some((tx) => (
    tx.accountId === id || (tx.toAssetType === 'account' && tx.toAssetId === id)
  ));
}

function isTargetInUse(type, id) {
  return transactionRepository.findAll().some((tx) => tx.toAssetType === type && tx.toAssetId === id);
}

function isCardInUse(id) {
  return transactionRepository.findAll().some((tx) => tx.cardId === id);
}

function parseAccount(body) {
  const bankName = form.text(body.bankName, 30);
  const name = form.text(body.name, 30);
  const kind = form.oneOf(body.kind, ['checking', 'parking', 'brokerage']);
  const balance = form.integerAmount(body.balance);
  const accountNumber = form.optionalText(body.accountNumber, 30);
  if (!bankName || !name || !kind || balance == null || accountNumber == null) return null;
  return { bankName, name, kind, balance, accountNumber, currency: 'KRW' };
}

function parseDeposit(body, current) {
  const bankName = form.text(body.bankName, 30);
  const productName = form.text(body.productName, 40);
  const principal = form.integerAmount(body.principal);
  const annualRate = form.decimalAmount(body.annualRate, { min: 0, max: 30, scale: 2 });
  const maturityDate = form.isoDate(body.maturityDate);
  const openedAt = form.optionalIsoDate(body.openedAt);
  if (!bankName || !productName || principal == null || annualRate == null || !maturityDate || openedAt == null) {
    return null;
  }
  return {
    bankName,
    productName,
    principal,
    annualRate,
    maturityDate,
    openedAt: openedAt || current?.openedAt || metaRepository.getAsOf(),
  };
}

function parseSavings(body, current) {
  const bankName = form.text(body.bankName, 30);
  const productName = form.text(body.productName, 40);
  const productKind = form.oneOf(body.productKind, ['installment', 'housing']);
  const accumulated = form.integerAmount(body.accumulated);
  const monthlyAmount = form.integerAmount(body.monthlyAmount);
  const annualRate = form.decimalAmount(body.annualRate, { min: 0, max: 30, scale: 2 });
  const autoTransferDay = form.dayOfMonth(body.autoTransferDay);
  const maturityDate = form.optionalIsoDate(body.maturityDate);
  const openedAt = form.optionalIsoDate(body.openedAt);
  const autoTransferAccountId = String(body.autoTransferAccountId ?? '').trim();
  if (!bankName || !productName || !productKind || accumulated == null || monthlyAmount == null) return null;
  if (annualRate == null || autoTransferDay == null || maturityDate == null || openedAt == null) return null;
  if (productKind !== 'housing' && !maturityDate) return null;
  if (!accountRepository.findById(autoTransferAccountId)) return null;
  return {
    bankName,
    productName,
    productKind,
    accumulated,
    monthlyAmount,
    annualRate,
    autoTransferDay,
    autoTransferAccountId,
    maturityDate: maturityDate || null,
    openedAt: openedAt || current?.openedAt || metaRepository.getAsOf(),
  };
}

function parseStock(body, current) {
  const name = form.text(body.name, 40);
  const ticker = form.text(body.ticker, 12);
  const currency = form.oneOf(body.currency, ['KRW', 'USD']);
  const priceScale = currency === 'USD' ? 4 : 0;
  const quantity = form.decimalAmount(body.quantity, { min: 0.0001, max: 100000000, scale: 4 });
  const averagePrice = currency
    ? form.decimalAmount(body.averagePrice, { min: 0, max: 100000000000, scale: priceScale })
    : null;
  const currentPrice = currency
    ? form.decimalAmount(body.currentPrice, { min: 0, max: 100000000000, scale: priceScale })
    : null;
  if (!name || !ticker || !currency || quantity == null || averagePrice == null || currentPrice == null) return null;
  const storedAverage = priceScale === 0 ? Math.round(averagePrice) : averagePrice;
  const storedPrice = priceScale === 0 ? Math.round(currentPrice) : currentPrice;
  const currentValue = priceScale === 0
    ? Math.round(quantity * storedPrice)
    : Math.round(quantity * storedPrice * 10000) / 10000;
  const currencyChanged = current && current.currency !== currency;
  let market = current?.market;
  if (!market || currencyChanged) market = currency === 'USD' ? 'NASDAQ' : 'KRX';
  return {
    name,
    ticker: ticker.toUpperCase(),
    currency,
    quantity,
    averagePrice: storedAverage,
    currentValue,
    currentPrice: storedPrice,
    market,
    priceUpdatedAt: metaRepository.getAsOf(),
  };
}

function parseCard(body) {
  const issuer = form.text(body.issuer, 30);
  const name = form.text(body.name, 30);
  const type = form.oneOf(body.type, ['credit', 'debit']);
  const lastFour = form.optionalText(body.lastFour, 4);
  const performanceThreshold = form.integerAmount(body.performanceThreshold);
  const paymentDay = form.dayOfMonth(body.paymentDay, { required: false });
  if (!issuer || !name || !type || lastFour == null || performanceThreshold == null || paymentDay == null) return null;
  if (!/^\d{4}$/.test(lastFour || '')) return { error: 'card-digits' };

  if (type === 'debit') {
    const linkedAccountId = String(body.linkedAccountId ?? '').trim();
    if (!accountRepository.findById(linkedAccountId)) return { error: 'card-account' };
    return {
      issuer,
      name,
      type,
      lastFour,
      linkedAccountId,
      unpaidAmount: 0,
      performanceThreshold,
      paymentDay: paymentDay || null,
    };
  }

  const unpaidAmount = String(body.unpaidAmount ?? '').trim()
    ? form.integerAmount(body.unpaidAmount)
    : 0;
  if (unpaidAmount == null) return null;
  return {
    issuer,
    name,
    type,
    lastFour,
    linkedAccountId: null,
    unpaidAmount,
    performanceThreshold,
    paymentDay: paymentDay || null,
  };
}

function writeFailure(err) {
  if (err.code === 'NO_USER') return { ok: false, error: 'nouser' };
  if (err.code === 'WRITE') return { ok: false, error: 'invalid' };
  return null;
}

async function saveNew(repository, fields) {
  return repository.insert(fields);
}

async function updateExisting(repository, id, fields) {
  const current = repository.findById(id);
  if (!current) return null;
  Object.assign(current, fields);
  await repository.save(current);
  return current;
}

async function createAccount(body) {
  const parsed = parseAccount(body);
  if (!parsed) return { ok: false, error: 'invalid' };
  try {
    await saveNew(accountRepository, parsed);
  } catch (err) {
    const failed = writeFailure(err);
    if (failed) return failed;
    throw err;
  }
  return { ok: true, notice: 'created' };
}

async function persist(work) {
  try {
    return { ok: true, value: await work() };
  } catch (err) {
    const failed = writeFailure(err);
    if (failed) return failed;
    throw err;
  }
}

async function updateAccount(id, body) {
  const parsed = parseAccount(body);
  if (!parsed) return { ok: false, error: 'invalid' };
  const saved = await persist(() => updateExisting(accountRepository, id, parsed));
  if (!saved.ok) return saved;
  if (!saved.value) return { ok: false, error: 'notfound' };
  return { ok: true, notice: 'updated' };
}

async function deleteAccount(id) {
  if (!accountRepository.findById(id)) return { ok: false, error: 'notfound' };
  if (isAccountInUse(id)) return { ok: false, error: 'account-in-use' };
  const saved = await persist(() => accountRepository.remove(id));
  if (!saved.ok) return saved;
  return { ok: true, notice: 'deleted' };
}

async function createDeposit(body) {
  const parsed = parseDeposit(body);
  if (!parsed) return { ok: false, error: 'invalid' };
  const saved = await persist(() => saveNew(depositRepository, parsed));
  if (!saved.ok) return saved;
  return { ok: true, notice: 'created' };
}

async function updateDeposit(id, body) {
  const current = depositRepository.findById(id);
  if (!current) return { ok: false, error: 'notfound' };
  const parsed = parseDeposit(body, current);
  if (!parsed) return { ok: false, error: 'invalid' };
  const saved = await persist(() => updateExisting(depositRepository, id, parsed));
  if (!saved.ok) return saved;
  return { ok: true, notice: 'updated' };
}

async function deleteDeposit(id) {
  if (!depositRepository.findById(id)) return { ok: false, error: 'notfound' };
  if (isTargetInUse('deposit', id)) return { ok: false, error: 'asset-in-use' };
  const saved = await persist(() => depositRepository.remove(id));
  if (!saved.ok) return saved;
  return { ok: true, notice: 'deleted' };
}

async function createSavings(body) {
  const parsed = parseSavings(body);
  if (!parsed) return { ok: false, error: 'invalid' };
  const saved = await persist(() => saveNew(savingsRepository, parsed));
  if (!saved.ok) return saved;
  return { ok: true, notice: 'created' };
}

async function updateSavings(id, body) {
  const current = savingsRepository.findById(id);
  if (!current) return { ok: false, error: 'notfound' };
  const parsed = parseSavings(body, current);
  if (!parsed) return { ok: false, error: 'invalid' };
  const saved = await persist(() => updateExisting(savingsRepository, id, parsed));
  if (!saved.ok) return saved;
  return { ok: true, notice: 'updated' };
}

async function deleteSavings(id) {
  if (!savingsRepository.findById(id)) return { ok: false, error: 'notfound' };
  if (isTargetInUse('savings', id)) return { ok: false, error: 'asset-in-use' };
  const saved = await persist(() => savingsRepository.remove(id));
  if (!saved.ok) return saved;
  return { ok: true, notice: 'deleted' };
}

async function createStock(body) {
  const parsed = parseStock(body);
  if (!parsed) return { ok: false, error: 'invalid' };
  const saved = await persist(() => saveNew(stockRepository, parsed));
  if (!saved.ok) return saved;
  return { ok: true, notice: 'created' };
}

async function updateStock(id, body) {
  const current = stockRepository.findById(id);
  if (!current) return { ok: false, error: 'notfound' };
  const parsed = parseStock(body, current);
  if (!parsed) return { ok: false, error: 'invalid' };
  const saved = await persist(() => updateExisting(stockRepository, id, parsed));
  if (!saved.ok) return saved;
  return { ok: true, notice: 'updated' };
}

async function deleteStock(id) {
  if (!stockRepository.findById(id)) return { ok: false, error: 'notfound' };
  if (isTargetInUse('stock', id)) return { ok: false, error: 'asset-in-use' };
  const saved = await persist(() => stockRepository.remove(id));
  if (!saved.ok) return saved;
  return { ok: true, notice: 'deleted' };
}

async function createCard(body) {
  const parsed = parseCard(body);
  if (!parsed || parsed.error) return { ok: false, error: parsed && parsed.error ? parsed.error : 'invalid' };
  const saved = await persist(() => saveNew(cardRepository, parsed));
  if (!saved.ok) return saved;
  return { ok: true, notice: 'created' };
}

async function updateCard(id, body) {
  const parsed = parseCard(body);
  if (!parsed || parsed.error) return { ok: false, error: parsed && parsed.error ? parsed.error : 'invalid' };
  const saved = await persist(() => updateExisting(cardRepository, id, parsed));
  if (!saved.ok) return saved;
  if (!saved.value) return { ok: false, error: 'notfound' };
  return { ok: true, notice: 'updated' };
}

async function deleteCard(id) {
  if (!cardRepository.findById(id)) return { ok: false, error: 'notfound' };
  if (isCardInUse(id)) return { ok: false, error: 'card-in-use' };
  const saved = await persist(() => cardRepository.remove(id));
  if (!saved.ok) return saved;
  return { ok: true, notice: 'deleted' };
}

function maturityView(date, asOf) {
  if (!date) return { dateLabel: '만기 없음', ddayLabel: '', urgent: false };
  const days = diffDays(asOf, date);
  return {
    dateLabel: date.replace(/-/g, '.'),
    ddayLabel: formatDday(days),
    urgent: days <= 30,
  };
}

function presentAccounts(asOf) {
  return accountRepository.findAll().map((account) => ({
    id: account.id,
    bankName: account.bankName,
    name: account.name,
    kindLabel: KIND_LABELS[account.kind] || account.kind,
    balanceText: formatKRW(account.balance),
    accountNumber: account.accountNumber || '',
    label: `${account.bankName} ${account.name}`,
    form: {
      bankName: account.bankName,
      name: account.name,
      kind: account.kind,
      balance: account.balance,
      accountNumber: account.accountNumber || '',
    },
  }));
}

function presentDeposits(asOf) {
  return depositRepository.findAll().map((item) => ({
    id: item.id,
    bankName: item.bankName,
    name: item.productName,
    principalText: formatKRW(item.principal),
    rateText: formatAnnualRate(item.annualRate),
    label: `${item.bankName} ${item.productName}`,
    ...maturityView(item.maturityDate, asOf),
    form: {
      bankName: item.bankName,
      productName: item.productName,
      principal: item.principal,
      annualRate: item.annualRate,
      openedAt: item.openedAt || '',
      maturityDate: item.maturityDate,
    },
  }));
}

function presentSavings(asOf) {
  return savingsRepository.findAll().map((item) => ({
    id: item.id,
    bankName: item.bankName,
    name: item.productName,
    kindLabel: item.productKind === 'housing' ? '청약' : '적금',
    accumulatedText: formatKRW(item.accumulated),
    monthlyText: formatKRW(item.monthlyAmount),
    rateText: item.annualRate == null ? '' : formatAnnualRate(item.annualRate),
    transferText: `매월 ${item.autoTransferDay}일 · ${accountLabel(item.autoTransferAccountId)}`,
    label: `${item.bankName} ${item.productName}`,
    ...maturityView(item.maturityDate, asOf),
    form: {
      bankName: item.bankName,
      productName: item.productName,
      productKind: item.productKind === 'housing' ? 'housing' : 'installment',
      accumulated: item.accumulated,
      monthlyAmount: item.monthlyAmount,
      annualRate: item.annualRate ?? '',
      autoTransferDay: item.autoTransferDay,
      autoTransferAccountId: item.autoTransferAccountId,
      openedAt: item.openedAt || '',
      maturityDate: item.maturityDate || '',
    },
  }));
}

function presentStocks(usdRate) {
  return stockRepository.findAll().map((stock) => {
    const cost = stockCost(stock);
    const profit = stockProfit(stock);
    const rate = stockReturnRate(stock);
    const valueKrw = stockValueKRW(stock, usdRate);
    return {
      id: stock.id,
      name: stock.name,
      ticker: stock.ticker,
      currency: stock.currency,
      quantityText: formatQuantity(stock.quantity),
      averageText: moneyText(stock.averagePrice, stock.currency),
      currentText: moneyText(stock.currentPrice, stock.currency),
      valueText: moneyText(stock.currentValue, stock.currency),
      valueKrwText: stock.currency === 'USD' ? formatKRW(valueKrw) : '',
      profitText: signedMoneyText(profit, stock.currency),
      rateText: rate == null ? '—' : formatSignedPercent(rate),
      direction: directionOf(profit),
      label: `${stock.name} ${stock.ticker}`,
      form: {
        name: stock.name,
        ticker: stock.ticker,
        currency: stock.currency,
        quantity: stock.quantity,
        averagePrice: stock.averagePrice,
        currentPrice: stock.currentPrice,
      },
    };
  });
}

function presentCards() {
  const cards = cardRepository.findAll().map((card) => ({
    id: card.id,
    issuer: card.issuer,
    name: card.name,
    type: card.type,
    typeLabel: card.type === 'credit' ? '신용' : '체크',
    lastFourText: card.lastFour ? `•••• ${card.lastFour}` : '',
    unpaidText: formatKRW(card.unpaidAmount),
    thresholdText: formatKRW(card.performanceThreshold),
    paymentText: card.paymentDay ? `결제일 ${card.paymentDay}일` : '',
    linkedText: card.linkedAccountId ? accountLabel(card.linkedAccountId) : '',
    isDebt: card.type === 'credit',
    label: `${card.issuer} ${card.name}`,
    form: {
      issuer: card.issuer,
      name: card.name,
      type: card.type,
      lastFour: card.lastFour || '',
      unpaidAmount: card.unpaidAmount,
      performanceThreshold: card.performanceThreshold,
      paymentDay: card.paymentDay || '',
      linkedAccountId: card.linkedAccountId || '',
    },
  }));
  return cards.sort((a, b) => Number(b.isDebt) - Number(a.isDebt) || b.form.unpaidAmount - a.form.unpaidAmount);
}

function getAssetsPage({ tab, notice, error } = {}) {
  const activeTab = TABS.some((item) => item.id === tab) ? tab : 'accounts';
  const asOf = metaRepository.getAsOf();
  const usdRate = metaRepository.getFxRate().USD;
  const accounts = presentAccounts(asOf);
  const deposits = presentDeposits(asOf);
  const savings = presentSavings(asOf);
  const stocks = presentStocks(usdRate);
  const cards = presentCards();
  const cash = sumBy(accountRepository.findAll(), (item) => item.balance);
  const safe = sumBy(depositRepository.findAll(), (item) => item.principal)
    + sumBy(savingsRepository.findAll(), (item) => item.accumulated);
  const investment = sumBy(stockRepository.findAll(), (item) => stockValueKRW(item, usdRate));
  const investmentCost = sumBy(stockRepository.findAll(), (item) => stockCostKRW(item, usdRate));
  const liabilities = sumBy(cardRepository.findAll(), (item) => item.unpaidAmount);
  const assets = cash + safe + investment;

  return {
    activeTab,
    tabs: TABS.map((item) => ({
      ...item,
      href: `/assets?tab=${item.id}`,
      active: item.id === activeTab,
      count: { accounts, deposits, savings, stocks, cards }[item.id].length,
    })),
    summary: {
      assetsText: formatKRW(assets),
      liabilitiesText: formatKRW(liabilities),
      netWorthText: formatKRW(assets - liabilities),
    },
    totals: {
      cashText: formatKRW(cash),
      depositText: formatKRW(sumBy(depositRepository.findAll(), (item) => item.principal)),
      savingsText: formatKRW(sumBy(savingsRepository.findAll(), (item) => item.accumulated)),
      investmentText: formatKRW(investment),
      profitText: formatSignedKRW(investment - investmentCost),
      profitDirection: directionOf(investment - investmentCost),
      debtText: formatKRW(liabilities),
    },
    fxLabel: usdRate ? `달러 주식은 1달러 = ${usdRate.toLocaleString('ko-KR')}원으로 환산합니다` : '',
    accounts,
    deposits,
    savings,
    stocks,
    cards,
    accountOptions: accountOptions(),
    notice: NOTICES[notice] || '',
    error: ERRORS[error] || '',
    records: {
      account: Object.fromEntries(accounts.map((item) => [item.id, item.form])),
      deposit: Object.fromEntries(deposits.map((item) => [item.id, item.form])),
      savings: Object.fromEntries(savings.map((item) => [item.id, item.form])),
      stock: Object.fromEntries(stocks.map((item) => [item.id, item.form])),
      card: Object.fromEntries(cards.map((item) => [item.id, item.form])),
    },
  };
}

module.exports = {
  getAssetsPage,
  createAccount,
  updateAccount,
  deleteAccount,
  createDeposit,
  updateDeposit,
  deleteDeposit,
  createSavings,
  updateSavings,
  deleteSavings,
  createStock,
  updateStock,
  deleteStock,
  createCard,
  updateCard,
  deleteCard,
};
