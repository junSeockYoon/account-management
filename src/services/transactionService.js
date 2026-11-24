const accountRepository = require('../repositories/accountRepository');
const savingsRepository = require('../repositories/savingsRepository');
const cardRepository = require('../repositories/cardRepository');
const transactionRepository = require('../repositories/transactionRepository');
const categoryRepository = require('../repositories/categoryRepository');
const metaRepository = require('../repositories/metaRepository');
const form = require('../utils/form');
const { formatKRW, formatSignedKRW, formatMonthDay } = require('../utils/format');

const NOTICES = {
  created: '저장했습니다.',
  updated: '수정했습니다.',
  deleted: '삭제했습니다.',
};

const ERRORS = {
  invalid: '입력값을 다시 확인해 주세요.',
  notfound: '거래를 찾지 못했습니다.',
  nouser: 'Supabase에 가입한 사용자가 없어 저장할 수 없습니다.',
};

const TYPE_LABELS = { income: '수입', expense: '지출', transfer: '이체' };
const CLASS_LABELS = { fixed: '고정비', variable: '변동비' };

function indexes() {
  return {
    categories: new Map(categoryRepository.findAll().map((item) => [item.id, item])),
    accounts: new Map(accountRepository.findAll().map((item) => [item.id, item])),
    cards: new Map(cardRepository.findAll().map((item) => [item.id, item])),
    savings: new Map(savingsRepository.findAll().map((item) => [item.id, item])),
  };
}

function accountLabel(account) {
  return `${account.bankName} ${account.name}`;
}

function targetLabel(tx, index) {
  if (tx.toAssetType === 'savings') {
    const item = index.savings.get(tx.toAssetId);
    return item ? `${item.bankName} ${item.productName}` : '적금 없음';
  }
  const account = index.accounts.get(tx.toAssetId);
  return account ? accountLabel(account) : '계좌 없음';
}

function methodText(tx, index) {
  if (tx.type === 'transfer') {
    const source = index.accounts.get(tx.accountId);
    return `${source ? accountLabel(source) : '계좌 없음'} → ${targetLabel(tx, index)}`;
  }
  if (tx.paymentMethod === 'card') {
    const card = index.cards.get(tx.cardId);
    return card ? `${card.issuer} ${card.name}` : '카드';
  }
  const account = index.accounts.get(tx.accountId);
  const name = account ? accountLabel(account) : '계좌 없음';
  return tx.paymentMethod === 'cash' ? `현금 · ${name}` : name;
}

function monthOptions(transactions, asOf) {
  const months = new Set(transactions.map((tx) => tx.date.slice(0, 7)));
  months.add(asOf.slice(0, 7));
  return [...months].sort((a, b) => b.localeCompare(a)).map((value) => {
    const [year, month] = value.split('-');
    return { value, label: `${year}년 ${Number(month)}월` };
  });
}

function shortAmount(amount) {
  const rounded = Math.round(Math.abs(Number(amount) || 0));
  if (rounded < 10000) return rounded.toLocaleString('ko-KR');
  const man = Math.round(rounded / 1000) / 10;
  const digits = Number.isInteger(man)
    ? man.toLocaleString('ko-KR')
    : man.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${digits}만`;
}

function pageHref(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const text = search.toString();
  return text ? `/transactions?${text}` : '/transactions';
}

function buildCalendar(transactions, monthKey, asOf, selectedDay, hrefParams) {
  const [year, month] = monthKey.split('-').map(Number);
  const startWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const totals = new Map();
  transactions.forEach((tx) => {
    if (!tx.date.startsWith(monthKey) || (tx.type !== 'expense' && tx.type !== 'income')) return;
    const current = totals.get(tx.date) || { expense: 0, income: 0 };
    current[tx.type] += tx.amount;
    totals.set(tx.date, current);
  });

  const cells = Array.from({ length: startWeekday }, () => ({ blank: true }));
  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${monthKey}-${String(day).padStart(2, '0')}`;
    const sum = totals.get(iso) || { expense: 0, income: 0 };
    const weekday = (startWeekday + day - 1) % 7;
    cells.push({
      blank: false,
      day,
      iso,
      href: pageHref({ ...hrefParams, month: monthKey, day: iso }),
      weekdayTone: weekday === 0 ? 'sun' : weekday === 6 ? 'sat' : 'day',
      future: iso > asOf,
      today: iso === asOf,
      selected: iso === selectedDay,
      expenseText: sum.expense ? shortAmount(sum.expense) : '',
      incomeText: sum.income ? shortAmount(sum.income) : '',
    });
  }
  while (cells.length % 7 !== 0) cells.push({ blank: true });

  return {
    label: `${year}년 ${month}월`,
    weekdays: ['일', '월', '화', '수', '목', '금', '토'],
    cells,
  };
}

function monthFrom(body) {
  const date = form.isoDate(body && body.date);
  if (date) return date.slice(0, 7);
  const month = String((body && body.month) || '');
  return /^\d{4}-\d{2}$/.test(month) ? month : metaRepository.getAsOf().slice(0, 7);
}

function fail(error, body) {
  return { ok: false, error, month: monthFrom(body) };
}

function ok(notice, month) {
  return { ok: true, notice, month };
}

function categoryOf(id, group) {
  const category = categoryRepository.findAll().find((item) => item.id === id);
  return category && category.group === group ? category.id : null;
}

function parseTarget(value) {
  const [type, id] = String(value || '').split(':');
  if (type === 'account' && accountRepository.findById(id)) return { type, id };
  if (type === 'savings' && savingsRepository.findById(id)) return { type, id };
  return null;
}

function parse(body) {
  const type = form.oneOf(body.type, ['income', 'expense', 'transfer']);
  const amount = form.integerAmount(body.amount);
  const date = form.isoDate(body.date);
  const memo = form.optionalText(body.memo, 80);
  if (!type || !amount || !date || memo == null) return null;

  const tx = {
    type,
    amount,
    date,
    memo,
    categoryId: null,
    expenseClass: null,
    paymentMethod: null,
    cardId: null,
    accountId: null,
    toAssetType: null,
    toAssetId: null,
  };

  if (type === 'expense') {
    const expenseClass = form.oneOf(body.expenseClass, ['fixed', 'variable']);
    const paymentMethod = form.oneOf(body.paymentMethod, ['card', 'account', 'cash']);
    const categoryId = categoryOf(body.categoryId, 'expense');
    if (!expenseClass || !paymentMethod || !categoryId) return null;
    tx.expenseClass = expenseClass;
    tx.paymentMethod = paymentMethod;
    tx.categoryId = categoryId;
    if (paymentMethod === 'card') {
      const card = cardRepository.findById(body.cardId);
      if (!card) return null;
      if (card.type === 'debit' && !accountRepository.findById(card.linkedAccountId)) return null;
      tx.cardId = card.id;
    } else {
      const account = accountRepository.findById(body.accountId);
      if (!account) return null;
      tx.accountId = account.id;
    }
    return tx;
  }

  if (type === 'income') {
    const paymentMethod = form.oneOf(body.paymentMethod, ['account', 'cash']);
    const categoryId = categoryOf(body.categoryId, 'income');
    const account = accountRepository.findById(body.accountId);
    if (!paymentMethod || !categoryId || !account) return null;
    tx.paymentMethod = paymentMethod;
    tx.categoryId = categoryId;
    tx.accountId = account.id;
    return tx;
  }

  const source = accountRepository.findById(body.accountId);
  const target = parseTarget(body.toAsset);
  if (!source || !target || (target.type === 'account' && target.id === source.id)) return null;
  tx.categoryId = 'transfer';
  tx.paymentMethod = 'account';
  tx.accountId = source.id;
  tx.toAssetType = target.type;
  tx.toAssetId = target.id;
  return tx;
}

// shortcut: 잔액이 부족해도 기록한다. 거절하려면 적용 전에 잔액을 보면 된다.
function apply(tx, sign) {
  const amount = tx.amount * sign;
  if (tx.type === 'expense') {
    if (tx.paymentMethod === 'card') {
      const card = cardRepository.findById(tx.cardId);
      if (!card) return false;
      if (card.type === 'credit') {
        card.unpaidAmount += amount;
        return true;
      }
      const account = accountRepository.findById(card.linkedAccountId);
      if (!account) return false;
      account.balance -= amount;
      return true;
    }
    const account = accountRepository.findById(tx.accountId);
    if (!account) return false;
    account.balance -= amount;
    return true;
  }
  if (tx.type === 'income') {
    const account = accountRepository.findById(tx.accountId);
    if (!account) return false;
    account.balance += amount;
    return true;
  }
  const source = accountRepository.findById(tx.accountId);
  if (!source || source.id === tx.toAssetId) return false;
  if (tx.toAssetType === 'savings') {
    const target = savingsRepository.findById(tx.toAssetId);
    if (!target) return false;
    source.balance -= amount;
    target.accumulated += amount;
    return true;
  }
  const target = tx.toAssetType === 'account' ? accountRepository.findById(tx.toAssetId) : null;
  if (!target) return false;
  source.balance -= amount;
  target.balance += amount;
  return true;
}

function getPage(query) {
  const asOf = metaRepository.getAsOf();
  const transactions = transactionRepository.findAll();
  const months = monthOptions(transactions, asOf);
  const known = new Set(months.map((item) => item.value));
  const month = query.month === 'all' || known.has(query.month) ? query.month : asOf.slice(0, 7);
  const type = TYPE_LABELS[query.type] ? query.type : 'all';
  const q = String(query.q || '').trim().slice(0, 40);
  const needle = q.toLowerCase();
  const calendarKey = month === 'all' ? asOf.slice(0, 7) : month;
  const day = month !== 'all' && form.isoDate(query.day) === query.day && query.day.startsWith(`${month}-`)
    ? query.day
    : '';
  const index = indexes();
  const hrefParams = { type: type === 'all' ? '' : type, q };
  const monthIndex = months.findIndex((item) => item.value === calendarKey);

  const rows = transactions
    .filter((tx) => month === 'all' || tx.date.startsWith(month))
    .filter((tx) => !day || tx.date === day)
    .map((tx) => decorate(tx, index))
    .filter((row) => !needle || row.search.includes(needle))
    .filter((row) => type === 'all' || row.type === type)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  const totals = { expense: 0, income: 0, transfer: 0 };
  rows.forEach((row) => {
    totals[row.type] += row.amount;
  });

  const records = {};
  rows.forEach((row) => {
    records[row.id] = row.form;
  });

  return {
    month,
    type,
    q,
    day,
    dayLabel: day ? formatMonthDay(day) : '',
    clearDayHref: day ? pageHref({ month, ...hrefParams }) : '',
    asOf,
    months,
    types: [
      { value: 'all', label: '전체' },
      { value: 'expense', label: '지출' },
      { value: 'income', label: '수입' },
      { value: 'transfer', label: '이체' },
    ],
    totals: {
      expenseText: formatKRW(totals.expense),
      incomeText: formatKRW(totals.income),
      transferText: formatKRW(totals.transfer),
      count: rows.length,
    },
    rows: rows.map(({ form, search, amount, ...row }) => row),
    records,
    categories: categoryRepository.findAll().map((item) => ({
      id: item.id,
      name: item.name,
      group: item.group,
    })),
    accounts: accountRepository.findAll().map((item) => ({ id: item.id, label: accountLabel(item) })),
    cards: cardRepository.findAll().map((item) => ({
      id: item.id,
      label: `${item.issuer} ${item.name}`,
    })),
    targets: [
      ...accountRepository.findAll().map((item) => ({
        value: `account:${item.id}`,
        label: accountLabel(item),
      })),
      ...savingsRepository.findAll().map((item) => ({
        value: `savings:${item.id}`,
        label: `${item.bankName} ${item.productName}`,
      })),
    ],
    calendar: {
      ...buildCalendar(transactions, calendarKey, asOf, day, hrefParams),
      prevHref: monthIndex >= 0 && months[monthIndex + 1]
        ? pageHref({ month: months[monthIndex + 1].value, ...hrefParams })
        : '',
      nextHref: monthIndex > 0 ? pageHref({ month: months[monthIndex - 1].value, ...hrefParams }) : '',
    },
    notice: NOTICES[query.notice] || '',
    error: ERRORS[query.error] || '',
  };
}

function decorate(tx, index) {
  const category = index.categories.get(tx.categoryId);
  const where = methodText(tx, index);
  const classLabel = CLASS_LABELS[tx.expenseClass] || '';
  const signed = tx.type === 'expense' ? -tx.amount : tx.amount;
  return {
    id: tx.id,
    date: tx.date,
    type: tx.type,
    amount: tx.amount,
    dateText: formatMonthDay(tx.date),
    typeLabel: TYPE_LABELS[tx.type],
    classLabel,
    categoryName: category ? category.name : '기타',
    where,
    memo: tx.memo,
    amountText: tx.type === 'transfer' ? formatKRW(tx.amount) : formatSignedKRW(signed),
    tone: tx.type === 'income' ? 'up' : tx.type === 'expense' ? 'down' : 'flat',
    confirmLabel: tx.memo || (category ? category.name : '이 거래'),
    search: [tx.memo, category ? category.name : '', where, TYPE_LABELS[tx.type], classLabel]
      .join(' ')
      .toLowerCase(),
    form: {
      type: tx.type,
      amount: tx.amount,
      date: tx.date,
      paymentMethod: tx.paymentMethod || 'account',
      cardId: tx.cardId || '',
      accountId: tx.accountId || '',
      toAsset: tx.toAssetType ? `${tx.toAssetType}:${tx.toAssetId}` : '',
      categoryId: tx.categoryId,
      expenseClass: tx.expenseClass || 'variable',
      memo: tx.memo || '',
    },
  };
}

function writeFailure(err) {
  if (err.code === 'NO_USER') return { ok: false, error: 'nouser' };
  if (err.code === 'WRITE') return { ok: false, error: 'invalid' };
  return null;
}

async function saveEffects(tx) {
  const jobs = [];
  const account = tx.accountId && accountRepository.findById(tx.accountId);
  if (account) jobs.push(accountRepository.save(account));
  if (tx.paymentMethod === 'card' && tx.cardId) {
    const card = cardRepository.findById(tx.cardId);
    if (card) {
      jobs.push(cardRepository.save(card));
      const linked = card.linkedAccountId && accountRepository.findById(card.linkedAccountId);
      if (linked) jobs.push(accountRepository.save(linked));
    }
  }
  if (tx.toAssetType === 'savings') {
    const target = savingsRepository.findById(tx.toAssetId);
    if (target) jobs.push(savingsRepository.save(target));
  }
  if (tx.toAssetType === 'account') {
    const target = accountRepository.findById(tx.toAssetId);
    if (target) jobs.push(accountRepository.save(target));
  }
  await Promise.all(jobs);
}

async function create(body) {
  const parsed = parse(body);
  if (!parsed) return fail('invalid', body);
  const tx = { ...parsed, balanceApplied: true };
  if (!apply(tx, 1)) return fail('invalid', body);
  try {
    await transactionRepository.insert(tx);
    await saveEffects(tx);
  } catch (err) {
    const failed = writeFailure(err);
    if (failed) return { ...failed, month: tx.date.slice(0, 7) };
    throw err;
  }
  return ok('created', tx.date.slice(0, 7));
}

async function update(id, body) {
  const parsed = parse(body);
  if (!parsed) return fail('invalid', body);
  const tx = transactionRepository.findById(id);
  if (!tx) return fail('notfound', body);
  const previous = { ...tx };
  if (tx.balanceApplied) {
    apply(tx, -1);
    if (!apply({ ...tx, ...parsed }, 1)) {
      apply(tx, 1);
      return fail('invalid', body);
    }
  }
  Object.assign(tx, parsed);
  try {
    await transactionRepository.save(tx);
    await saveEffects(previous);
    await saveEffects(tx);
  } catch (err) {
    const failed = writeFailure(err);
    if (failed) return { ...failed, month: tx.date.slice(0, 7) };
    throw err;
  }
  return ok('updated', tx.date.slice(0, 7));
}

async function remove(id, body) {
  const tx = transactionRepository.findById(id);
  if (!tx) return fail('notfound', body);
  const month = tx.date.slice(0, 7);
  if (tx.balanceApplied) apply(tx, -1);
  try {
    await transactionRepository.remove(id);
    await saveEffects(tx);
  } catch (err) {
    const failed = writeFailure(err);
    if (failed) return { ...failed, month };
    throw err;
  }
  return ok('deleted', month);
}

module.exports = { getPage, create, update, remove };
