var charts = {};

function makeChart(id, type, data, options) {
  options = options || {};
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(document.getElementById(id), {
    type: type,
    data: data,
    options: Object.assign({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } }
    }, options)
  });
}

var PALETTE = ['#0f2540', '#c9a227', '#1b5fb0', '#137a4a', '#b3261e', '#7a4fbf', '#b26a00', '#5a6b7c'];

function buildDoughnut(labels, values) {
  return { labels: labels, datasets: [{ data: values, backgroundColor: PALETTE, borderWidth: 0 }] };
}

function buildBar(labels, values) {
  return {
    labels: labels,
    datasets: [{ data: values, backgroundColor: PALETTE[0], borderRadius: 6 }]
  };
}

async function loadReports() {
  var results = await Promise.all([
    api('/api/reports/scans-by-result'),
    api('/api/reports/fleet-status'),
    api('/api/reports/scans-by-ministry')
  ]);
  var byResult = results[0];
  var fleet    = results[1];
  var byMinistry = results[2];

  makeChart('chartToday', 'doughnut',
    buildDoughnut(byResult.today.map(function (r) { return r.result; }),
                  byResult.today.map(function (r) { return r.c; })));
  makeChart('chartAll', 'doughnut',
    buildDoughnut(byResult.all.map(function (r) { return r.result; }),
                  byResult.all.map(function (r) { return r.c; })));
  makeChart('chartFleet', 'doughnut',
    buildDoughnut(fleet.map(function (r) { return r.status; }),
                  fleet.map(function (r) { return r.c; })));
  makeChart('chartMinistry', 'bar',
    buildBar(byMinistry.map(function (r) { return r.ministry; }),
             byMinistry.map(function (r) { return r.c; })),
    { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } });
}

loadReports();
