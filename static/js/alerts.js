async function loadAlerts() {
  var onlyOpen = document.getElementById('onlyOpen').checked ? '1' : '0';
  var rows = await api('/api/alerts?open=' + onlyOpen);
  document.getElementById('alertBody').innerHTML = rows.map(function (a) {
    return '<tr>' +
      '<td>' + esc(fmtTime(a.created_at)) + '</td>' +
      '<td>' + severityBadge(a.severity) + '</td>' +
      '<td><strong>' + esc(a.title) + '</strong></td>' +
      '<td>' + esc(a.message || '') + '</td>' +
      '<td>' + esc(a.related_plate || '-') + '</td>' +
      '<td>' + (a.resolved ? badge('Resolved', 'green') : badge('Open', 'amber')) + '</td>' +
      '<td>' + (a.resolved
        ? '<span class="muted small">' + esc(a.resolved_by_name || '') + '</span>'
        : '<button class="btn btn-primary" data-resolve="' + a.id + '">Resolve</button>') +
      '</td>' +
    '</tr>';
  }).join('') || '<tr><td colspan="7" class="muted">No alerts.</td></tr>';
}

document.getElementById('alertBody').addEventListener('click', async function (e) {
  var id = e.target.getAttribute('data-resolve');
  if (!id) return;
  try {
    await api('/api/alerts/' + id + '/resolve', { method: 'POST' });
    toast('Resolved'); loadAlerts();
  } catch (ex) { toast(ex.message, 'err'); }
});

document.getElementById('onlyOpen').addEventListener('change', loadAlerts);
loadAlerts();
