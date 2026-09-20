async function loadDashboard() {
  try {
    var k = await api('/api/reports/kpis');
    document.getElementById('kpi-scans').textContent     = k.scans_today;
    document.getElementById('kpi-incidents').textContent = k.incidents_today;
    document.getElementById('kpi-flagged').textContent   = k.flagged;
    document.getElementById('kpi-fleet').textContent     = k.fleet;
    document.getElementById('kpi-alerts').textContent    = k.open_alerts;
    document.getElementById('kpi-susp').textContent      = k.suspended;
  } catch (e) { toast(e.message, 'err'); }

  try {
    var rows = await api('/api/scan/recent?limit=30');
    var body = document.getElementById('feedBody');
    body.innerHTML = rows.map(function (r) {
      return '<tr>' +
        '<td>' + esc(fmtTime(r.scanned_at)) + '</td>' +
        '<td><strong>' + esc(r.plate_number) + '</strong></td>' +
        '<td>' + esc([r.make, r.model].filter(Boolean).join(' ')) + '</td>' +
        '<td>' + esc(r.checkpoint_name || '-') + '</td>' +
        '<td>' + esc(r.officer_name || '-') + '</td>' +
        '<td>' + resultBadge(r.result) + '</td>' +
      '</tr>';
    }).join('') || '<tr><td colspan="6" class="muted">No scans yet.</td></tr>';
  } catch (e) { toast(e.message, 'err'); }
}

loadDashboard();
setInterval(loadDashboard, 15000);
