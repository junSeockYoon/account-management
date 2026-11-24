const { getState } = require('../repositories/store');
const recurringRepository = require('../repositories/recurringRepository');
const transactionRepository = require('../repositories/transactionRepository');
const accountRepository = require('../repositories/accountRepository');
const cardRepository = require('../repositories/cardRepository');
const categoryRepository = require('../repositories/categoryRepository');
const metaRepository = require('../repositories/metaRepository');
const { commitNew } = require('./transactionService');
const form = require('../utils/form');

function dueDate(asOf, day) {
  const [year, month] = asOf.split('-').map(Number);
  const last = new Date(year, month, 0).getDate();
  const clamped = Math.min(day, last);
  return `${asOf.slice(0, 7)}-${String(clamped).padStart(2, '0')}`;
}

function parse(body) {
  const amount = form.integerAmount(body.amount);
  const chargeDay = form.dayOfMonth(body.chargeDay);
  const memo = form.optionalText(body.memo, 80);
  const paymentMethod = form.oneOf(body.paymentMethod, ['card', 'account', 'cash']);
  const category = categoryRepository.findAll().find((item) => item.id === body.categoryId && item.group === 'expense');
  if (!amount || amount < 1 || !chargeDay || memo == null || !paymentMethod || !category) return null;
  const rule = {
    amount,
    chargeDay,
    categoryId: category.id,
    paymentMethod,
    memo,
    cardId: null,
    accountId: null,
  };
  if (paymentMethod === 'card') {
    const card = cardRepository.findById(body.cardId);
    if (!card) return null;
    if (card.type === 'debit' && !accountRepository.findById(card.linkedAccountId)) return null;
    rule.cardId = card.id;
    return rule;
  }
  const account = accountRepository.findById(body.accountId);
  if (!account) return null;
  rule.accountId = account.id;
  return rule;
}

function alreadyPosted(ruleId, month) {
  return transactionRepository.findAll().some((tx) => tx.recurringId === ruleId && tx.date.startsWith(month));
}

async function materialize() {
  const state = getState();
  const asOf = metaRepository.getAsOf();
  const month = asOf.slice(0, 7);
  let created = 0;
  for (const rule of recurringRepository.findAll()) {
    const date = dueDate(asOf, rule.chargeDay);
    if (date > asOf || alreadyPosted(rule.id, month)) continue;
    try {
      const posted = await commitNew({
        type: 'expense',
        amount: rule.amount,
        date,
        memo: rule.memo,
        categoryId: rule.categoryId,
        expenseClass: 'fixed',
        paymentMethod: rule.paymentMethod,
        cardId: rule.cardId,
        accountId: rule.accountId,
        toAssetType: null,
        toAssetId: null,
        recurringId: rule.id,
      });
      if (posted) created += 1;
    } catch (err) {
      if (err.code !== 'WRITE') throw err;
    }
  }
  state.recurringNotice = created > 0
    ? `고정 지출 ${created}건을 이번 달에 반영했습니다.`
    : '';
}

async function create(body) {
  const parsed = parse(body);
  if (!parsed) return { ok: false, error: 'recur-invalid' };
  if (!getState().userId) return { ok: false, error: 'nouser' };
  try {
    await recurringRepository.insert(parsed);
  } catch (err) {
    if (err.code === 'NO_USER') return { ok: false, error: 'nouser' };
    if (err.code === 'WRITE') return { ok: false, error: 'recur-write' };
    throw err;
  }
  return { ok: true, notice: 'recurring' };
}

async function remove(id) {
  if (!recurringRepository.findById(id)) return { ok: false, error: 'notfound' };
  try {
    await recurringRepository.remove(id);
  } catch (err) {
    if (err.code === 'WRITE') return { ok: false, error: 'recur-write' };
    throw err;
  }
  return { ok: true, notice: 'recurring-deleted' };
}

module.exports = { dueDate, materialize, create, remove };
