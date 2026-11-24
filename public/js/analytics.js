(function () {
  const dataEl = document.getElementById('trend-data');
  const canvas = document.getElementById('trend-chart');
  if (!dataEl || !canvas || !window.Chart) return;

  const items = JSON.parse(dataEl.textContent);
  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: items.map((item) => item.label),
      datasets: [
        {
          data: items.map((item) => item.amount),
          backgroundColor: '#3182F6',
          borderRadius: 8,
          maxBarThickness: 48,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              return ` ${items[context.dataIndex].text}`;
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#8B95A1' } },
        y: {
          beginAtZero: true,
          grid: { color: '#F2F4F6' },
          ticks: {
            color: '#8B95A1',
            callback(value) {
              return `${Math.round(value / 10000)}만`;
            },
          },
        },
      },
    },
  });

  window.addEventListener('beforeunload', () => chart.destroy());
})();
