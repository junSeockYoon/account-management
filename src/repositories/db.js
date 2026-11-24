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
        accumulated: num(row.accumulated),
        monthlyAmount: num(row.monthly_amount),
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
        accumulated: item.accumulated,
        monthly_amount: item.monthlyAmount,
        auto_transfer_day: item.autoTransferDay,
        auto_transfer_account_id: item.autoTransferAccountId,
        opened_on: item.openedAt,
        maturity_on: item.maturityDate,
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
      };
    },
    toRow(item, userId) {
      return {
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
    },
  },
};

function configError() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY) return null;
  return fail('CONFIG');
}

async function rest(path, { method = 'GET', body } = {}) {
  const missing = configError();
  if (missing) throw missing;
  const headers = {
    apikey: process.env.SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };
  if (method === 'POST' || method === 'PATCH') headers.Prefer = 'return=representation';
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    console.error(`supabase ${method} ${path.split('?')[0]} ${response.status}`);
    throw fail('WRITE');
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function rows(table, userId) {
  const query = userId ? `?select=*&user_id=eq.${userId}` : '?select=*';
  const list = await rest(`${table}${query}`);
  return (list || []).map((row) => tables[table].fromRow(row));
}

async function fetchState() {
  const missing = configError();
  if (missing) throw missing;
  const profiles = await rest('profiles?select=id,display_name,as_of,usd_rate&limit=1');
  const profile = profiles && profiles[0];
  const userId = profile ? profile.id : null;
  const [categories, accounts, deposits, savings, stocks, cards, transactions] = await Promise.all([
    rest('categories?select=id,name,group,color,sort_order&order=sort_order.asc'),
    userId ? rows('accounts', userId) : [],
    userId ? rows('deposits', userId) : [],
    userId ? rows('savings', userId) : [],
    userId ? rows('stocks', userId) : [],
    userId ? rows('cards', userId) : [],
    userId ? rows('transactions', userId) : [],
  ]);

  return {
    userId,
    asOf: profile ? profile.as_of : todaySeoul(),
    profile: { name: profile ? profile.display_name : '나' },
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
  };
}

async function insert(table, item, userId) {
  if (!userId) throw fail('NO_USER');
  const saved = await rest(table, { method: 'POST', body: tables[table].toRow(item, userId) });
  return tables[table].fromRow(saved[0]);
}

async function update(table, item) {
  const { user_id, ...fields } = tables[table].toRow(item, null);
  await rest(`${table}?id=eq.${encodeURIComponent(item.id)}`, { method: 'PATCH', body: fields });
}

async function remove(table, id) {
  await rest(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
}

module.exports = { fetchState, insert, update, remove };
