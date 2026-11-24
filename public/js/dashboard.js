(function () {
  const dataEl = document.getElementById('portfolio-data');
  const canvas = document.getElementById('portfolio-chart');
  if (!dataEl || !canvas || !window.Chart) return;

  const items = JSON.parse(dataEl.textContent);
  const chart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: items.map((item) => item.name),
      datasets: [
        {
          data: items.map((item) => item.amount),
          backgroundColor: items.map((item) => item.color),
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              const item = items[context.dataIndex];
              return ` ${item.name}  ${item.text} (${item.shareText})`;
            },
          },
        },
      },
    },
  });

  window.addEventListener('beforeunload', () => chart.destroy());
})();
