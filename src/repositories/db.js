const { loadEnv } = require('../config/env');

loadEnv();

function fail(code) {
  const err = new Error(code);
  err.code = code;
  return err;
}

function num(value) {
  if (value == null || value === '') return null;
  return Number(value);
}

function todaySeoul() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

const tables = {
  accounts: {
    fromRow(row) {
      return {
        id: row.id,
        bankName: row.bank_name,
        name: row.name,
        kind: row.kind,
        balance: num(row.balance),
        currency: row.currency,
        accountNumber: row.account_number || '',
      };
    },
    toRow(item, userId) {
      return {
        user_id: userId,
        bank_name: item.bankName,
        name: item.name,
        kind: item.kind,
        balance: item.balance,
        currency: 'KRW',
        account_number: item.accountNumber || '',
      };
    },
  },
  deposits: {
    fromRow(row) {
      return {
        id: row.id,
        bankName: row.bank_name,
        productName: row.product_name,
        principal: num(row.principal),
        annualRate: num(row.annual_rate),
        openedAt: row.opened_on,
        maturityDate: row.maturity_on,
      };
    },
    toRow(item, userId) {
      return {
        user_id: userId,
        bank_name: item.bankName,
        product_name: item.productName,
        principal: item.principal,
        annual_rate: item.annualRate,
        opened_on: item.openedAt,
        maturity_on: item.maturityDate,
      };
    },
  },
  savings: {
    fromRow(row) {
      return {
        id: row.id,
        bankName: row.bank_name,
        productName: row.product_name,
        productKind: row.product_kind === 'housing' ? 'housing' : 'installment',
        accumulated: num(row.accumulated),
        monthlyAmount: num(row.monthly_amount),
        annualRate: num(row.annual_rate),
        autoTransferDay: num(row.auto_transfer_day),
        autoTransferAccountId: row.auto_transfer_account_id,
        openedAt: row.opened_on,
        maturityDate: row.maturity_on,
      };
    },
    toRow(item, userId) {
      return {
        user_id: userId,
        bank_name: item.bankName,
        product_name: item.productName,
        product_kind: item.productKind === 'housing' ? 'housing' : 'installment',
        accumulated: item.accumulated,
        monthly_amount: item.monthlyAmount,
        annual_rate: item.annualRate,
        auto_transfer_day: item.autoTransferDay,
        auto_transfer_account_id: item.autoTransferAccountId,
        opened_on: item.openedAt,
        maturity_on: item.maturityDate || null,
      };
    },
  },
  stocks: {
    fromRow(row) {
      return {
        id: row.id,
        name: row.name,
        ticker: row.ticker,
        market: row.market,
        quantity: num(row.quantity),
        averagePrice: num(row.average_price),
        currentPrice: num(row.current_price),
        currentValue: num(row.current_value),
        currency: row.currency,
        purchaseFx: num(row.purchase_fx),
        priceUpdatedAt: row.price_updated_on,
      };
    },
    toRow(item, userId) {
      return {
        user_id: userId,
        name: item.name,
        ticker: item.ticker,
        market: item.market,
        quantity: item.quantity,
        average_price: item.averagePrice,
        current_price: item.currentPrice,
        current_value: item.currentValue,
        currency: item.currency,
        purchase_fx: item.currency === 'USD' ? item.purchaseFx : null,
        price_updated_on: item.priceUpdatedAt,
      };
    },
  },
  cards: {
    fromRow(row) {
      return {
        id: row.id,
        issuer: row.issuer,
        name: row.name,
        type: row.type,
        lastFour: row.last_four,
        linkedAccountId: row.linked_account_id,
        unpaidAmount: num(row.unpaid_amount),
        performanceThreshold: num(row.performance_threshold),
        paymentDay: num(row.payment_day),
      };
    },
    toRow(item, userId) {
      return {
        user_id: userId,
        issuer: item.issuer,
        name: item.name,
        type: item.type,
        last_four: item.lastFour,
        linked_account_id: item.linkedAccountId || null,
        unpaid_amount: item.type === 'debit' ? 0 : item.unpaidAmount,
        performance_threshold: item.performanceThreshold,
        payment_day: item.paymentDay || null,
      };
    },
  },
  transactions: {
    fromRow(row) {
      const toAssetType = row.to_savings_id ? 'savings' : row.to_account_id ? 'account' : null;
      return {
        id: row.id,
        date: row.occurred_on,
        type: row.type,
        amount: num(row.amount),
        paymentMethod: row.payment_method,
        cardId: row.card_id,
        accountId: row.account_id,
        toAssetType,
        toAssetId: row.to_savings_id || row.to_account_id,
        categoryId: row.category_id,
        expenseClass: row.expense_class,
        memo: row.memo || '',
        balanceApplied: row.balance_applied,
        recurringId: row.recurring_id || null,
      };
    },
    toRow(item, userId) {
      const row = {
        user_id: userId,
        occurred_on: item.date,
        type: item.type,
        amount: item.amount,
        payment_method: item.paymentMethod,
        card_id: item.cardId || null,
        account_id: item.accountId || null,
        to_account_id: item.toAssetType === 'account' ? item.toAssetId : null,
        to_savings_id: item.toAssetType === 'savings' ? item.toAssetId : null,
        category_id: item.categoryId,
        expense_class: item.expenseClass || null,
        memo: item.memo || '',
        balance_applied: item.balanceApplied !== false,
      };
      if (item.recurringId) row.recurring_id = item.recurringId;
      return row;
    },
  },
  recurring_expenses: {
    fromRow(row) {
      return {
        id: row.id,
        amount: num(row.amount),
        chargeDay: num(row.charge_day),
        categoryId: row.category_id,
        paymentMethod: row.payment_method,
        cardId: row.card_id,
        accountId: row.account_id,
        memo: row.memo || '',
      };
    },
    toRow(item, userId) {
      return {
        user_id: userId,
        amount: item.amount,
        charge_day: item.chargeDay,
        category_id: item.categoryId,
        payment_method: item.paymentMethod,
        card_id: item.cardId || null,
        account_id: item.accountId || null,
        memo: item.memo || '',
      };
    },
  },
  net_worth_months: {
    fromRow(row) {
      return {
        month: row.month_on,
        cash: num(row.cash),
        safe: num(row.safe_amount),
        investment: num(row.investment),
        liabilities: num(row.liabilities),
        netWorth: num(row.net_worth),
      };
    },
    toRow(item, userId) {
      return {
        user_id: userId,
        month_on: item.month,
        cash: item.cash,
        safe_amount: item.safe,
        investment: item.investment,
        liabilities: item.liabilities,
        net_worth: item.netWorth,
      };
    },
  },
};

function configError() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY) return null;
  return fail('CONFIG');
}

function userIdFromToken(token) {
  try {
    const json = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return json.sub || '';
  } catch {
    return '';
  }
}

function requestToken(explicit) {
  if (explicit) return explicit;
  return require('./store').getState().accessToken;
}

async function rest(path, token, { method = 'GET', body, prefer } = {}) {
  const missing = configError();
  if (missing) throw missing;
  const access = requestToken(token);
  if (!access) throw fail('UNAUTHORIZED');
  const headers = {
    apikey: process.env.SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${access}`,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;
  else if (method === 'POST' || method === 'PATCH') headers.Prefer = 'return=representation';
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  });
  if (response.status === 401) throw fail('UNAUTHORIZED');
  if (!response.ok) {
    console.error(`supabase ${method} ${path.split('?')[0]} ${response.status}`);
    throw fail('WRITE');
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function rows(table, token, userId) {
  const query = userId ? `?select=*&user_id=eq.${userId}` : '?select=*';
  const list = await rest(`${table}${query}`, token);
  return (list || []).map((row) => tables[table].fromRow(row));
}

async function optionalRows(table, token, userId) {
  if (!userId) return [];
  try {
    return await rows(table, token, userId);
  } catch (err) {
    if (err.code !== 'WRITE') throw err;
    return [];
  }
}

async function loadProfiles(token) {
  const selects = [
    'id,display_name,as_of,usd_rate,monthly_card_limit,card_cycle_day',
    'id,display_name,as_of,usd_rate,monthly_card_limit',
    'id,display_name,as_of,usd_rate',
  ];
  let lastError;
  for (const select of selects) {
    try {
      return await rest(`profiles?select=${select}`, token);
    } catch (err) {
      if (err.code !== 'WRITE') throw err;
      lastError = err;
    }
  }
  throw lastError;
}

async function fetchState(token) {
  const missing = configError();
  if (missing) throw missing;
  const profiles = await loadProfiles(token);
  const profile = profiles && profiles[0];
  const userId = (profile && profile.id) || userIdFromToken(token);
  const [categories, accounts, deposits, savings, stocks, cards, transactions, recurring, netWorthMonths] = await Promise.all([
    rest('categories?select=id,name,group,color,sort_order&order=sort_order.asc', token),
    userId ? rows('accounts', token, userId) : [],
    userId ? rows('deposits', token, userId) : [],
    userId ? rows('savings', token, userId) : [],
    userId ? rows('stocks', token, userId) : [],
    userId ? rows('cards', token, userId) : [],
    userId ? rows('transactions', token, userId) : [],
    optionalRows('recurring_expenses', token, userId),
    optionalRows('net_worth_months', token, userId),
  ]);

  return {
    accessToken: token,
    userId,
    asOf: profile ? profile.as_of : todaySeoul(),
    profile: {
      name: profile ? profile.display_name : '나',
      monthlyCardLimit: profile ? num(profile.monthly_card_limit) : null,
      cardCycleDay: profile ? num(profile.card_cycle_day) : null,
    },
    fxRate: { base: 'KRW', USD: profile ? num(profile.usd_rate) : null },
    categories: (categories || []).map((row) => ({
      id: row.id,
      name: row.name,
      group: row.group,
      color: row.color,
    })),
    accounts,
    deposits,
    savings,
    stocks,
    cards,
    transactions,
    recurring,
    netWorthMonths,
    recurringNotice: '',
  };
}

async function insert(table, item, userId) {
  if (!userId) throw fail('NO_USER');
  const saved = await rest(table, null, { method: 'POST', body: tables[table].toRow(item, userId) });
  return tables[table].fromRow(saved[0]);
}

async function update(table, item) {
  const { user_id, ...fields } = tables[table].toRow(item, null);
  await rest(`${table}?id=eq.${encodeURIComponent(item.id)}`, null, { method: 'PATCH', body: fields });
}

async function updateProfileRate(userId, rate) {
  await rest(`profiles?id=eq.${encodeURIComponent(userId)}`, null, {
    method: 'PATCH',
    body: { usd_rate: rate },
  });
}

async function updateMonthlyCardLimit(userId, amount, cycleDay) {
  await rest(`profiles?id=eq.${encodeURIComponent(userId)}`, null, {
    method: 'PATCH',
    body: { monthly_card_limit: amount, card_cycle_day: cycleDay },
  });
}

async function upsertNetWorth(userId, item) {
  await rest('net_worth_months?on_conflict=user_id,month_on', null, {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: tables.net_worth_months.toRow(item, userId),
  });
}

async function remove(table, id) {
  await rest(`${table}?id=eq.${encodeURIComponent(id)}`, null, { method: 'DELETE' });
}

module.exports = { fetchState, insert, update, updateProfileRate, updateMonthlyCardLimit, upsertNetWorth, remove };
