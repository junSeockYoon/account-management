const { getState } = require('../repositories/store');
const { updateMonthlyCardLimit } = require('../repositories/db');
const { formatKRW, formatShare, formatMonthDay } = require('../utils/format');
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

function periodStart(asOf, cycleDay) {
  const day = cycleDay >= 1 && cycleDay <= 31 ? cycleDay : 1;
  const [year, month, date] = asOf.split('-').map(Number);
  const thisLast = daysInMonth(year, month);
  const thisDay = Math.min(day, thisLast);
  if (date >= thisDay) {
    return `${asOf.slice(0, 7)}-${String(thisDay).padStart(2, '0')}`;
  }
  const previous = new Date(year, month - 2, 1);
  const previousYear = previous.getFullYear();
  const previousMonth = previous.getMonth() + 1;
  const previousDay = Math.min(day, daysInMonth(previousYear, previousMonth));
  const monthText = String(previousMonth).padStart(2, '0');
  const dayText = String(previousDay).padStart(2, '0');
  return `${previousYear}-${monthText}-${dayText}`;
}

function spentOnCards(transactions, start, end) {
  return transactions.reduce((total, tx) => {
    if (tx.type !== 'expense' || tx.paymentMethod !== 'card') return total;
    if (tx.date < start || tx.date > end) return total;
    return total + tx.amount;
  }, 0);
}

function present(transactions, asOf, limit, cycleDay) {
  const start = periodStart(asOf, cycleDay);
  const spent = spentOnCards(transactions, start, asOf);
  const base = {
    spent,
    spentText: formatKRW(spent),
    rangeLabel: `${formatMonthDay(start)}–${formatMonthDay(asOf)}`,
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
