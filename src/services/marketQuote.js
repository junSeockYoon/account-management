const YAHOO = 'https://query1.finance.yahoo.com/v8/finance/chart';

function symbolsFor(stock) {
  const ticker = String(stock.ticker || '').trim().toUpperCase();
  if (stock.currency === 'KRW' && /^\d{6}$/.test(ticker)) return [`${ticker}.KS`, `${ticker}.KQ`];
  return [ticker];
}

function roundPrice(price, currency) {
  if (currency === 'KRW') return Math.round(price);
  return Math.round(price * 10000) / 10000;
}

function positionValue(quantity, price, currency) {
  if (currency === 'KRW') return Math.round(quantity * price);
  return Math.round(quantity * price * 10000) / 10000;
}

async function readJson(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'account-management' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  return response.json();
}

async function yahooPrice(symbol) {
  const body = await readJson(`${YAHOO}/${encodeURIComponent(symbol)}?interval=1d&range=5d`);
  const meta = body && body.chart && body.chart.result && body.chart.result[0] && body.chart.result[0].meta;
  const price = meta && Number(meta.regularMarketPrice);
  return price > 0 ? price : null;
}

async function lastPrice(stock) {
  for (const symbol of symbolsFor(stock)) {
    try {
      const price = await yahooPrice(symbol);
      if (price) return price;
    } catch (err) {
      console.error(`quote ${symbol} ${err.message}`);
    }
  }
  return null;
}

async function usdKrw() {
  try {
    const body = await readJson('https://api.frankfurter.app/latest?from=USD&to=KRW');
    const rate = body && body.rates && Number(body.rates.KRW);
    return rate > 0 ? Math.round(rate * 10000) / 10000 : null;
  } catch (err) {
    console.error(`fx ${err.message}`);
    return null;
  }
}

module.exports = { lastPrice, usdKrw, roundPrice, positionValue };
