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

(function () {
  const dataEl = document.getElementById('net-worth-data');
  const canvas = document.getElementById('net-worth-chart');
  if (!dataEl || !canvas || !window.Chart) return;
  const items = JSON.parse(dataEl.textContent);
  if (!items.length) return;

  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: items.map((item) => item.label),
      datasets: [{
        data: items.map((item) => item.amount),
        borderColor: '#3182F6',
        backgroundColor: 'rgba(49, 130, 246, 0.12)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#3182F6',
      }],
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
        y: {
          ticks: {
            color: '#8B95A1',
            callback(value) {
              return `${Math.round(Number(value) / 10000).toLocaleString('ko-KR')}만`;
            },
          },
          grid: { color: '#F2F4F6' },
        },
        x: {
          ticks: { color: '#8B95A1' },
          grid: { display: false },
        },
      },
    },
  });

  window.addEventListener('beforeunload', () => chart.destroy());
})();
