const crypto = require('crypto');
const { getState } = require('../repositories/store');
const db = require('../repositories/db');
const categoryRepository = require('../repositories/categoryRepository');
const metaRepository = require('../repositories/metaRepository');
const { formatKRW, monthStart, shiftMonth } = require('../utils/format');
const form = require('../utils/form');
const cardLimit = require('./cardLimit');

const MAX_TARGET = 100000000;
const PACE_GAP = 30000;
const HABIT_MIN = 3;
const MODEL = () => process.env.DEEPSEEK_MODEL || 'deepseek-flash';
const memoryCache = new Map();

const SYSTEM_PROMPT = [
  '개인 가계부의 경고 문장만 씁니다.',
  'JSON에 있는 사실만 사용합니다.',
  '금액, 건수, 카테고리 이름을 만들거나 바꾸지 않습니다.',
  '없는 원인, 다른 달, 다른 카테고리를 추측하지 않습니다.',
  '한국어 존댓말, 두 문장 이내.',
  '첫 문장은 reasons에 있는 경고만 말합니다.',
  '둘째 문장은 topHabit 또는 cutTarget 안에서 오늘 줄일 행동 하나만 말합니다.',
  'topHabit와 cutTarget이 없으면 한 문장만 씁니다.',
].join('\n');

const FLASH = {
  'target-saved': '이번 달 줄일 항목을 저장했습니다.',
  'target-cleared': '이번 달 줄일 항목을 지웠습니다.',
  'target-invalid': '목표는 1원 이상 1억 원 이하로, 지출 카테고리를 골라 주세요.',
  'target-write': '목표를 저장하지 못했습니다. Supabase에서 spending-report.sql을 먼저 실행해 주세요.',
};

function daysInMonth(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

function monthEnd(monthKey) {
  return `${monthKey}-${String(daysInMonth(monthKey)).padStart(2, '0')}`;
}

function variableExpenses(transactions, start, end) {
  return transactions.filter((tx) => (
    tx.type === 'expense'
    && tx.expenseClass !== 'fixed'
    && tx.date >= start
    && tx.date <= end
  ));
}

function sumAmount(list) {
  return list.reduce((total, tx) => total + tx.amount, 0);
}

function categorySpend(transactions, categoryId, start, end) {
  return transactions.reduce((total, tx) => {
    if (tx.type !== 'expense' || tx.categoryId !== categoryId) return total;
    if (tx.date < start || tx.date > end) return total;
    return total + tx.amount;
  }, 0);
}

function topHabit(transactions, categories, start, end) {
  const totals = new Map();
  variableExpenses(transactions, start, end).forEach((tx) => {
    const row = totals.get(tx.categoryId) || { count: 0, amount: 0 };
    row.count += 1;
    row.amount += tx.amount;
    totals.set(tx.categoryId, row);
  });
  const names = new Map(categories.map((item) => [item.id, item]));
  return [...totals.entries()]
    .map(([id, row]) => ({ id, ...row, category: names.get(id) }))
    .filter((row) => row.count >= HABIT_MIN && row.category)
    .sort((a, b) => b.count - a.count || b.amount - a.amount || a.category.name.localeCompare(b.category.name, 'ko'))[0] || null;
}

function paceCaution(projected, last) {
  if (!(last > 0)) return false;
  const delta = projected - last;
  return projected * 10 >= last * 11 && delta >= PACE_GAP;
}

function topic(name) {
  const code = name.charCodeAt(name.length - 1);
  const batchim = code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0;
  return `${name}${batchim ? '은' : '는'}`;
}

function templateComment(payload) {
  const both = payload.reasons.includes('pace') && payload.reasons.includes('card');
  const lead = both
    ? '변동비 속도가 지난달보다 높고 카드 한도도 넘겼습니다.'
    : payload.reasons.includes('card')
      ? '카드 한도를 넘겼습니다.'
      : '변동비 속도가 지난달보다 높습니다.';
  if (!payload.topHabit) return lead;
  return `${lead} ${payload.topHabit.name} 항목이 ${payload.topHabit.count}회로 가장 잦습니다.`;
}

function calmComment(projected, last) {
  if (!(last > 0)) return '지난달 변동비가 없어 속도 경고는 다음 달부터 나옵니다.';
  if (projected > last) return '지난달보다 조금 높지만 경고 기준 안쪽입니다.';
  return '지난달 변동비 속도 안쪽입니다.';
}

function compareText(projected, last) {
  if (!(last > 0)) return '지난달 변동비가 없어 지난달과는 비교하지 않습니다.';
  const delta = projected - last;
  if (delta > 0) return `지난달 변동비 ${formatKRW(last)}보다 ${formatKRW(delta)} 많습니다.`;
  if (delta < 0) return `지난달 변동비 ${formatKRW(last)}보다 ${formatKRW(-delta)} 적습니다.`;
  return `지난달 변동비 ${formatKRW(last)}과 같습니다.`;
}

function cutView(name, spent, limit) {
  const remaining = limit - spent;
  const percent = limit > 0 ? Math.round((spent / limit) * 1000) / 10 : 0;
  return {
    name,
    spentText: formatKRW(spent),
    limitText: formatKRW(limit),
    remainingText: formatKRW(Math.abs(remaining)),
    over: remaining < 0,
    met: remaining === 0,
    bar: Math.min(Math.max(percent, 0), 100),
  };
}

function buildFacts({ asOf, transactions, categories, cards, profile }) {
  const monthKey = asOf.slice(0, 7);
  const start = monthStart(asOf);
  const daysElapsed = Math.max(Number(asOf.slice(8, 10)) || 1, 1);
  const monthDays = daysInMonth(monthKey);
  const spent = sumAmount(variableExpenses(transactions, start, asOf));
  const projected = Math.round(spent / daysElapsed * monthDays);
  const previousKey = shiftMonth(asOf, -1).slice(0, 7);
  const last = sumAmount(variableExpenses(transactions, `${previousKey}-01`, monthEnd(previousKey)));
  const limitView = cardLimit.present(
    transactions,
    asOf,
    profile.monthlyCardLimit,
    profile.cardCycleDay,
    cards,
  );
  const reasons = [];
  if (paceCaution(projected, last)) reasons.push('pace');
  if (limitView.over) reasons.push('card');

  const expenseCategories = categories.filter((item) => item.group === 'expense');
  const byId = new Map(expenseCategories.map((item) => [item.id, item]));
  const habit = topHabit(transactions, expenseCategories, start, asOf);
  const currentCut = profile.cutMonth === monthKey && profile.cutAmount > 0
    ? byId.get(profile.cutCategoryId)
    : null;
  const previousCategory = profile.cutMonth === previousKey && profile.cutAmount > 0
    ? byId.get(profile.cutCategoryId)
    : null;

  const payload = {
    reasons,
    daysElapsed,
    daysInMonth: monthDays,
    variableProjected: projected,
    lastMonthVariable: last,
    delta: Math.max(projected - last, 0),
  };
  if (habit) {
    payload.topHabit = { name: habit.category.name, count: habit.count, amount: habit.amount };
  }
  let cut = null;
  if (currentCut) {
    const cutSpent = categorySpend(transactions, currentCut.id, start, asOf);
    payload.cutTarget = { name: currentCut.name, limit: profile.cutAmount, spent: cutSpent };
    cut = {
      ...cutView(currentCut.name, cutSpent, profile.cutAmount),
      categoryId: currentCut.id,
      input: String(profile.cutAmount),
    };
  }
  if (reasons.includes('card') && limitView.set) {
    payload.card = { spent: limitView.spent, limit: profile.monthlyCardLimit };
  }

  let previousCut = null;
  if (previousCategory) {
    const previousSpent = categorySpend(transactions, previousCategory.id, `${previousKey}-01`, monthEnd(previousKey));
    const result = cutView(previousCategory.name, previousSpent, profile.cutAmount);
    const name = topic(previousCategory.name);
    previousCut = {
      ...result,
      line: result.over
        ? `지난달 ${name} 목표보다 ${result.remainingText} 더 썼습니다.`
        : result.met
          ? `지난달 ${name} 목표와 같았습니다.`
          : `지난달 ${name} 목표보다 ${result.remainingText} 덜 썼습니다.`,
    };
  }

  const caution = reasons.length > 0;
  const hash = caution
    ? crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')
    : '';

  return {
    caution,
    payload,
    hash,
    categoryNames: expenseCategories.map((item) => item.name),
    cachedText: profile.reportHash === hash ? profile.reportText : '',
    view: {
      caution,
      status: caution ? 'caution' : last > 0 && projected > last ? 'steady' : 'room',
      statusLabel: caution ? '주의' : last > 0 && projected > last ? '비슷' : '여유',
      projectedText: formatKRW(projected),
      spentText: formatKRW(spent),
      daysElapsed,
      daysInMonth: monthDays,
      compareText: compareText(projected, last),
      habit: habit ? {
        name: habit.category.name,
        count: habit.count,
        amountText: formatKRW(habit.amount),
        color: habit.category.color,
      } : null,
      cut,
      categories: expenseCategories.map((item) => ({ id: item.id, name: item.name })),
      previousCut,
      comment: caution ? templateComment(payload) : calmComment(projected, last),
    },
  };
}

function allowedNumbers(payload) {
  const values = [];
  const walk = (value) => {
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0) values.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(payload);
  const allowed = new Set();
  values.forEach((value) => {
    allowed.add(String(value));
    allowed.add(value.toLocaleString('ko-KR'));
    if (value >= 10000 && value % 10000 === 0) allowed.add(String(value / 10000));
  });
  return allowed;
}

function acceptComment(text, { payload, categoryNames }) {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (cleaned.length < 8 || cleaned.length > 180) return '';
  if (/https?:|```/.test(cleaned)) return '';
  const allowedNames = [payload.topHabit && payload.topHabit.name, payload.cutTarget && payload.cutTarget.name]
    .filter(Boolean);
  const blocked = (categoryNames || []).filter((name) => name.length >= 2 && !allowedNames.includes(name));
  if (blocked.some((name) => cleaned.includes(name))) return '';
  const chunks = cleaned.match(/\d[\d,]*/g) || [];
  const allowed = allowedNumbers(payload);
  if (chunks.some((chunk) => !allowed.has(chunk) && !allowed.has(chunk.replace(/,/g, '')))) return '';
  return cleaned;
}

function rememberLocal(hash, text) {
  memoryCache.set(hash, text);
  if (memoryCache.size > 20) {
    const oldest = memoryCache.keys().next().value;
    memoryCache.delete(oldest);
  }
}

async function callModel(payload) {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) return '';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL(),
        temperature: 0.3,
        max_tokens: 120,
        thinking: { type: 'disabled' },
        reasoning_effort: 'none',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(payload) },
        ],
      }),
    });
    if (!response.ok) {
      console.error(`deepseek chat ${response.status}`);
      return '';
    }
    const data = await response.json();
    const content = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : '';
    if (typeof content === 'string') return content.trim();
    if (Array.isArray(content)) return content.map((part) => part.text || '').join('').trim();
    return '';
  } catch (err) {
    console.error(`deepseek chat ${err.name === 'AbortError' ? 'timeout' : 'failed'}`);
    return '';
  } finally {
    clearTimeout(timer);
  }
}

async function resolveComment(built, userId) {
  const { hash, payload, categoryNames } = built;
  if (memoryCache.has(hash)) return memoryCache.get(hash);
  const cached = acceptComment(built.cachedText, { payload, categoryNames });
  if (cached) {
    rememberLocal(hash, cached);
    return cached;
  }
  if (!process.env.DEEPSEEK_API_KEY) return '';
  const accepted = acceptComment(await callModel(payload), { payload, categoryNames });
  rememberLocal(hash, accepted);
  if (accepted && userId) {
    try {
      await db.updateReportCache(userId, hash, accepted);
    } catch (err) {
      if (err.code !== 'WRITE') throw err;
    }
  }
  return accepted;
}

async function present() {
  const state = getState();
  const built = buildFacts({
    asOf: state.asOf,
    transactions: state.transactions,
    categories: state.categories,
    cards: state.cards,
    profile: state.profile,
  });
  if (built.caution) {
    const comment = await resolveComment(built, state.userId);
    if (comment) built.view.comment = comment;
  }
  return built.view;
}

function flash(query) {
  return {
    notice: FLASH[query.notice] || '',
    error: FLASH[query.error] || '',
  };
}

async function save(body) {
  const state = getState();
  if (!state.userId) return { ok: false, error: 'target-write' };
  const raw = String(body.amount ?? '').replace(/,/g, '').trim();
  if (!raw) {
    try {
      await db.updateSpendingTarget(state.userId, { categoryId: null, amount: null, month: null });
      return { ok: true, notice: 'target-cleared' };
    } catch (err) {
      return { ok: false, error: 'target-write' };
    }
  }
  const amount = form.integerAmount(raw);
  const categoryId = String(body.categoryId ?? '').trim();
  const allowed = categoryRepository.findAll().some((item) => item.group === 'expense' && item.id === categoryId);
  if (amount == null || amount < 1 || amount > MAX_TARGET || !allowed) {
    return { ok: false, error: 'target-invalid' };
  }
  try {
    await db.updateSpendingTarget(state.userId, {
      categoryId,
      amount,
      month: metaRepository.getAsOf().slice(0, 7),
    });
    return { ok: true, notice: 'target-saved' };
  } catch (err) {
    return { ok: false, error: 'target-write' };
  }
}

module.exports = { present, save, flash, buildFacts, acceptComment, templateComment };
