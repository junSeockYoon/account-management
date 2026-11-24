function stockValueKRW(stock, usdRate) {
  if (stock.currency === 'KRW') return Math.round(stock.currentValue);
  if (stock.currency === 'USD') return Math.round(stock.currentValue * usdRate);
  throw new Error(`지원하지 않는 통화입니다: ${stock.currency}`);
}

function stockCost(stock) {
  return stock.quantity * stock.averagePrice;
}

function stockProfit(stock) {
  return stock.currentValue - stockCost(stock);
}

function stockReturnRate(stock) {
  const cost = stockCost(stock);
  if (!cost) return null;
  return (stockProfit(stock) / cost) * 100;
}

function stockCostKRW(stock, usdRate) {
  const cost = stockCost(stock);
  if (stock.currency !== 'USD') return Math.round(cost);
  const rate = Number(stock.purchaseFx) > 0 ? Number(stock.purchaseFx) : Number(usdRate);
  if (!(rate > 0)) return 0;
  return Math.round(cost * rate);
}

function directionOf(amount) {
  if (amount > 0) return 'up';
  if (amount < 0) return 'down';
  return 'flat';
}

module.exports = {
  stockValueKRW,
  stockCost,
  stockProfit,
  stockReturnRate,
  stockCostKRW,
  directionOf,
};
