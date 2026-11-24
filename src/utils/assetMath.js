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
  if (stock.currency === 'USD') return Math.round(cost * usdRate);
  return Math.round(cost);
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
