const { getState } = require('../repositories/store');
const categoryRepository = require('../repositories/categoryRepository');
const metaRepository = require('../repositories/metaRepository');
const weeklyChallengeRepository = require('../repositories/weeklyChallengeRepository');
const { formatKRW, formatMonthDay } = require('../utils/format');
const form = require('../utils/form');

const MAX_AMOUNT = 100000000;
const MIN_PROPOSAL = 5000;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const FLASH = {
  'challenge-started': '이번 주 챌린지를 시작했습니다.',
  'challenge-skipped': '이번 주는 챌린지 없이 둡니다.',
  'challenge-invalid': '카테고리와 1원 이상 1억 원 이하 금액을 확인해 주세요.',
  'challenge-write': '챌린지를 저장하지 못했습니다. Supabase에서 weekly-challenge.sql을 먼저 실행해 주세요.',
  'challenge-exists': '이번 주 챌린지는 이미 정해져 있습니다.',
};

function addDays(iso, days) {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function weekdayIndex(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
}

function weekStart(iso) {
  const index = weekdayIndex(iso);
  const back = index === 0 ? 6 : index - 1;
  return addDays(iso, -back);
}

function weekEnd(start) {
  return addDays(start, 6);
}

function topic(name) {
  const code = name.charCodeAt(name.length - 1);
  const batchim = code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
  return `${name}${batchim ? '은' : '는'}`;
}

function floorWon(amount) {
  return Math.floor(amount / 1000) * 1000;
}

function stepDown(amount) {
  const next = floorWon(Math.floor(amount * 4 / 5));
  if (next < MIN_PROPOSAL || next >= amount) return null;
  return next;
}

function spentIn(transactions, categoryId, start, end) {
  return transactions.reduce((total, tx) => {
    if (tx.type !== 'expense' || tx.categoryId !== categoryId) return total;
    if (tx.date < start || tx.date > end) return total;
    return total + tx.amount;
  }, 0);
}

function progress(name, spent, limit) {
  const remaining = limit - spent;
  const percent = limit > 0 ? Math.round((spent / limit) * 1000) / 10 : 0;
  return {
    name,
    spent,
    limit,
    spentText: formatKRW(spent),
    limitText: formatKRW(limit),
    remainingText: formatKRW(Math.abs(remaining)),
    over: remaining < 0,
    met: remaining === 0,
    bar: Math.min(Math.max(percent, 0), 100),
  };
}

function categoryStats(transactions, categories, start, end) {
  const totals = new Map();
  transactions.forEach((tx) => {
    if (tx.type !== 'expense' || tx.date < start || tx.date > end) return;
    const row = totals.get(tx.categoryId) || { variable: 0, fixed: 0, count: 0 };
    if (tx.expenseClass === 'fixed') row.fixed += tx.amount;
    else {
      row.variable += tx.amount;
      row.count += 1;
    }
    totals.set(tx.categoryId, row);
  });
  const names = new Map(categories.filter((item) => item.group === 'expense').map((item) => [item.id, item]));
  return [...totals.entries()]
    .map(([id, row]) => ({ id, ...row, category: names.get(id), total: row.variable + row.fixed }))
    .filter((row) => row.category && row.count > 0 && row.fixed <= row.variable)
    .sort((a, b) => b.count - a.count || b.total - a.total || a.category.name.localeCompare(b.category.name, 'ko'));
}

function streakBefore(challenges, transactions, start) {
  let count = 0;
  let cursor = addDays(start, -7);
  let categoryId = '';
  let limit = null;
  while (count < 12) {
    const row = challenges.find((item) => item.weekStart === cursor && item.status === 'active');
    if (!row) break;
    const spent = spentIn(transactions, row.categoryId, cursor, weekEnd(cursor));
    if (spent > row.limitAmount) break;
    if (limit == null) {
      categoryId = row.categoryId;
      limit = row.limitAmount;
    } else if (row.categoryId !== categoryId || row.limitAmount !== limit) break;
    count += 1;
    cursor = addDays(cursor, -7);
  }
  return { count, categoryId, limit };
}

function resultLine(name, spent, limit, streak) {
  const view = progress(name, spent, limit);
  const base = view.over
    ? `${name} ${view.limitText} 중 ${view.spentText}. ${view.remainingText} 넘겼습니다.`
    : view.met
      ? `${name} ${view.limitText} 한도만큼 썼습니다.`
      : `${name} ${view.limitText} 중 ${view.spentText}. ${view.remainingText} 남겼습니다.`;
  if (!view.over && streak >= 2) return `${base} ${streak}주 연속입니다.`;
  return base;
}

function suggest(transactions, categories, challenges, start) {
  const previousStart = addDays(start, -7);
  const previous = challenges.find((item) => item.weekStart === previousStart && item.status === 'active');
  const names = new Map(categories.filter((item) => item.group === 'expense').map((item) => [item.id, item]));
  const run = streakBefore(challenges, transactions, start);
  if (previous && names.has(previous.categoryId)) {
    const category = names.get(previous.categoryId);
    const lower = run.count >= 3 && run.categoryId === previous.categoryId && run.limit === previous.limitAmount
      ? stepDown(previous.limitAmount)
      : null;
    return {
      categoryId: category.id,
      name: category.name,
      amount: previous.limitAmount,
      lower,
      reason: lower
        ? `${run.count}주 연속 지켰습니다. 이번 주도 ${formatKRW(previous.limitAmount)}으로 두거나, ${formatKRW(lower)}으로 낮출 수 있습니다.`
        : `지난주와 같은 ${category.name} ${formatKRW(previous.limitAmount)}입니다.`,
    };
  }
  const ranked = categoryStats(transactions, categories, addDays(start, -28), addDays(start, -1));
  const best = ranked.find((row) => {
    const average = floorWon(Math.floor(row.total / 4));
    return floorWon(Math.floor(average * 4 / 5)) >= MIN_PROPOSAL;
  });
  if (!best) return null;
  const average = floorWon(Math.floor(best.total / 4));
  const amount = floorWon(Math.floor(average * 4 / 5));
  return {
    categoryId: best.id,
    name: best.category.name,
    amount,
    lower: null,
    reason: `지난 4주 ${topic(best.category.name)} 한 주에 평균 ${formatKRW(average)}이었습니다. 이번 주는 ${formatKRW(amount)}까지입니다.`,
  };
}

function buildChallenge({ asOf, transactions, categories, challenges }) {
  const start = weekStart(asOf);
  const end = weekEnd(start);
  const current = challenges.find((item) => item.weekStart === start) || null;
  const expenseCategories = categories
    .filter((item) => item.group === 'expense')
    .map((item) => ({ id: item.id, name: item.name }));
  const names = new Map(expenseCategories.map((item) => [item.id, item.name]));
  let active = null;
  if (current && current.status === 'active' && names.has(current.categoryId)) {
    const spent = spentIn(transactions, current.categoryId, start, asOf > end ? end : asOf);
    active = {
      ...progress(names.get(current.categoryId), spent, current.limitAmount),
      rangeLabel: `${formatMonthDay(start)}–${formatMonthDay(end)}`,
    };
  }

  const previousStart = addDays(start, -7);
  const previous = challenges.find((item) => item.weekStart === previousStart && item.status === 'active');
  let lastResult = null;
  if (previous && names.has(previous.categoryId)) {
    const spent = spentIn(transactions, previous.categoryId, previousStart, weekEnd(previousStart));
    const run = streakBefore(challenges, transactions, start);
    lastResult = {
      success: spent <= previous.limitAmount,
      line: resultLine(names.get(previous.categoryId), spent, previous.limitAmount, run.count),
    };
  }

  let prompt = null;
  if (!current) {
    const weekday = weekdayIndex(asOf);
    const suggestion = suggest(transactions, categories, challenges, start);
    const already = suggestion
      ? spentIn(transactions, suggestion.categoryId, start, asOf)
      : 0;
    prompt = {
      headline: weekday === 1 ? '이번 주가 시작됐습니다' : `이번 주는 이미 ${WEEKDAYS[weekday]}요일입니다`,
      rangeLabel: `${formatMonthDay(start)}–${formatMonthDay(end)}`,
      suggestion,
      alreadyText: suggestion && already > 0
        ? `월요일부터 오늘까지 ${suggestion.name} ${formatKRW(already)}을 이미 썼습니다.`
        : '',
      lastResult,
      categories: expenseCategories,
      emptyText: suggestion ? '' : '최근 4주 동안 반복된 변동비가 부족해 이번 주는 제안이 없습니다.',
    };
  }

  return { weekStart: start, active, prompt, lastResult };
}

function present() {
  const state = getState();
  return buildChallenge({
    asOf: state.asOf || metaRepository.getAsOf(),
    transactions: state.transactions || [],
    categories: state.categories || categoryRepository.findAll(),
    challenges: weeklyChallengeRepository.findAll(),
  });
}

function savedText(tx) {
  if (!tx || tx.type !== 'expense') return '';
  const state = getState();
  const categories = state.categories || [];
  const category = categories.find((item) => item.id === tx.categoryId && item.group === 'expense');
  if (!category) return '';
  const start = weekStart(tx.date);
  const challenge = weeklyChallengeRepository.findAll()
    .find((item) => item.weekStart === start && item.status === 'active' && item.categoryId === tx.categoryId);
  if (!challenge) return '';
  const spent = spentIn(state.transactions || [], tx.categoryId, start, weekEnd(start));
  const view = progress(category.name, spent, challenge.limitAmount);
  if (view.over) return `이번 주 ${category.name} 한도를 ${view.remainingText} 넘겼습니다.`;
  if (view.met) return `이번 주 ${category.name} 한도만큼 썼습니다.`;
  return `이번 주 ${category.name} 남음 ${view.remainingText}`;
}

function flash(query) {
  return {
    notice: FLASH[query.notice] || '',
    error: FLASH[query.error] || '',
  };
}

async function save(body) {
  const state = getState();
  if (!state.userId) return { ok: false, error: 'challenge-write' };
  const view = present();
  if (!view.prompt) return { ok: false, error: 'challenge-exists' };
  const intent = body.intent === 'skip' || body.intent === 'lower' ? body.intent : 'start';
  try {
    if (intent === 'skip') {
      await weeklyChallengeRepository.insert({
        weekStart: view.weekStart,
        categoryId: '',
        limitAmount: null,
        status: 'skipped',
      });
      return { ok: true, notice: 'challenge-skipped' };
    }
    const suggestion = view.prompt.suggestion;
    const categoryId = intent === 'lower' && suggestion
      ? suggestion.categoryId
      : String(body.categoryId || '').trim();
    const amount = intent === 'lower'
      ? (suggestion && suggestion.lower)
      : form.integerAmount(String(body.amount ?? '').replace(/,/g, ''));
    const allowed = (state.categories || []).some((item) => item.group === 'expense' && item.id === categoryId);
    if (!allowed || amount == null || amount < 1 || amount > MAX_AMOUNT) {
      return { ok: false, error: 'challenge-invalid' };
    }
    await weeklyChallengeRepository.insert({
      weekStart: view.weekStart,
      categoryId,
      limitAmount: amount,
      status: 'active',
    });
    return { ok: true, notice: 'challenge-started' };
  } catch (err) {
    if (err.code === 'WRITE' || err.code === 'NO_USER') return { ok: false, error: 'challenge-write' };
    throw err;
  }
}

module.exports = {
  present,
  save,
  flash,
  savedText,
  buildChallenge,
  weekStart,
  addDays,
};
