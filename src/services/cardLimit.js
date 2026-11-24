const { getState } = require('../repositories/store');
const { updateMonthlyCardLimit } = require('../repositories/db');
const { formatKRW, formatShare, formatMonthDay, monthStart } = require('../utils/format');
const form = require('../utils/form');

const MAX_LIMIT = 100000000;

const FLASH = {
  saved: '카드 한도와 기준일을 저장했습니다.',
  cleared: '카드 한도를 지웠습니다.',
  invalid: '한도는 1원 이상 1억 원 이하, 기준일은 1일부터 31일까지 입력해 주세요.',
  write: '한도를 저장하지 못했습니다. Supabase에서 card-limit.sql을 먼저 실행해 주세요.',
};

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function shiftMonth(year, month, delta) {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function period(asOf, cycleDay) {
  if (!(cycleDay >= 1 && cycleDay <= 31)) {
    return { start: monthStart(asOf), end: asOf };
  }
  const [year, month, date] = asOf.split('-').map(Number);
  let startYear = year;
  let startMonth = month;
  if (date < Math.min(cycleDay, daysInMonth(year, month))) {
    const previous = shiftMonth(year, month, -1);
    startYear = previous.year;
    startMonth = previous.month;
  }
  const next = shiftMonth(startYear, startMonth, 1);
  return {
    start: isoDate(startYear, startMonth, Math.min(cycleDay, daysInMonth(startYear, startMonth))),
    end: isoDate(next.year, next.month, Math.min(cycleDay, daysInMonth(next.year, next.month))),
  };
}

function rangeLabel(start, end) {
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  if (sameYear) return `${formatMonthDay(start)}–${formatMonthDay(end)}`;
  return `${start.slice(0, 4)}년 ${formatMonthDay(start)}–${end.slice(0, 4)}년 ${formatMonthDay(end)}`;
}

function spentOnCards(transactions, start, end, { openOnly = false } = {}) {
  return transactions.reduce((total, tx) => {
    if (tx.type !== 'expense' || tx.paymentMethod !== 'card') return total;
    if (tx.date < start || tx.date > end) return total;
    if (openOnly && tx.includedInUnpaid !== false) return total;
    return total + tx.amount;
  }, 0);
}

function present(transactions, asOf, limit, cycleDay, cards) {
  const { start, end } = period(asOf, cycleDay);
  const usage = spentOnCards(transactions, start, asOf);
  const later = spentOnCards(transactions, start, asOf, { openOnly: true });
  const unpaid = (cards || []).reduce((sum, card) => (
    card.type === 'credit' ? sum + (Number(card.unpaidAmount) || 0) : sum
  ), 0);
  const spent = unpaid + later;
  const base = {
    spent,
    spentText: formatKRW(spent),
    usageText: formatKRW(usage),
    laterText: formatKRW(later),
    unpaidText: formatKRW(unpaid),
    rangeLabel: rangeLabel(start, end),
    input: limit > 0 ? String(limit) : '',
    cycleInput: cycleDay >= 1 && cycleDay <= 31 ? String(cycleDay) : '',
  };
  if (!(limit > 0)) {
    return { ...base, set: false, over: false, bar: 0 };
  }
  const remaining = limit - spent;
  const percent = Math.round((spent / limit) * 1000) / 10;
  return {
    ...base,
    set: true,
    limitText: formatKRW(limit),
    remainingText: formatKRW(Math.abs(remaining)),
    over: remaining < 0,
    met: remaining === 0,
    percentText: formatShare(percent),
    bar: Math.min(Math.max(percent, 0), 100),
  };
}

function flash(query) {
  return {
    notice: FLASH[query.notice] || '',
    error: FLASH[query.error] || '',
  };
}

async function save(body) {
  const userId = getState().userId;
  if (!userId) return { ok: false, error: 'write' };
  const raw = String(body.amount ?? '').replace(/,/g, '').trim();
  const amount = raw ? form.integerAmount(raw) : null;
  const cycleRaw = String(body.cycleDay ?? '').trim();
  const cycleDay = cycleRaw ? form.dayOfMonth(cycleRaw, { required: false }) : '';
  if (raw && (amount == null || amount < 1 || amount > MAX_LIMIT)) {
    return { ok: false, error: 'invalid' };
  }
  if (cycleRaw && (cycleDay == null || cycleDay === '')) {
    return { ok: false, error: 'invalid' };
  }
  try {
    await updateMonthlyCardLimit(userId, raw ? amount : null, cycleDay || null);
    return { ok: true, notice: raw ? 'saved' : 'cleared' };
  } catch (err) {
    return { ok: false, error: 'write' };
  }
}

module.exports = { present, flash, save };
