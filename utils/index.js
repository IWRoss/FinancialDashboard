const percentDiff = (a, b) => {
  const diff = Math.abs(a - b);
  return (diff / ((a + b) / 2)) * 100;
};

const upOrDownEmoji = (a, b) => {
  if (a > b) {
    return ":chart_with_upwards_trend:";
  }

  return ":chart_with_downwards_trend:";
};

const calculateStockPrice = (revenue, profit) =>
  (revenue * 2 + profit * 6) / 2000000;

module.exports = {
  percentDiff,
  upOrDownEmoji,
  calculateStockPrice,
};
