function buildQuery() {
  var p = new URLSearchParams();
  var from = document.getElementById('fFrom').value;
  var to   = document.getElementById('fTo').value;
  var plate= document.getElementById('fPlate').value.trim();
  var res  = document.getElementById('fResult').value;
  var flag = document.getElementById('fFlagged').checked;
  if (from)  p.set('from', from);
  if (to)    p.set('to', to);
  if (plate) p.set('plate', plate);
  if (res)   p.set('result', res);
  if (flag)  p.set('flagged', '1');
  return p.toString();
}

async function loadAudit() {
  var q = buildQuery();
  var rows = await api('/api/audit' + (q ? '?' + q : ''));
  document.getElementById('auditBody').innerHTML = rows.map(function (r) {
    return '<tr>' +
      '<td>' + esc(fmtTime(r.scanned_at)) + '</td>' +
      '<td><strong>' + esc(r.plate_number) + '</strong></td>' +
      '<td>' + esc([r.make, r.model].filter(Boolean).join(' ')) + '</td>' +
      '<td>' + esc(r.driver_id || '-') + '</td>' +
      '<td>' + esc(r.checkpoint_name || '-') + '</td>' +
      '<td>' + esc(r.officer_name || '-') + '</td>' +
      '<td>' + esc(r.direction) + '</td>' +
      '<td>' + resultBadge(r.result) + '</td>' +
      '<td>' + esc(r.notes || '') + '</td>' +
      '<td><button class="btn btn-ghost" data-flag="' + r.id + '" data-v="' + r.flagged + '">' +
        (r.flagged ? 'Unflag' : 'Flag') +
      '</button></td>' +
    '</tr>';
  }).join('') || '<tr><td colspan="10" class="muted">No matching scans.</td></tr>';
}

document.getElementById('auditBody').addEventListener('click', async function (e) {
  var id = e.target.getAttribute('data-flag');
  if (!id) return;
  var cur = e.target.getAttribute('data-v') === '1';
  try {
    await api('/api/audit/' + id + '/flag', {
      method: 'POST', body: JSON.stringify({ flagged: !cur })
    });
    loadAudit();
  } catch (ex) { toast(ex.message, 'err'); }
});

document.getElementById('applyBtn').addEventListener('click', loadAudit);
document.getElementById('clearBtn').addEventListener('click', function () {
  ['fFrom','fTo','fPlate','fResult'].forEach(function (id) {
    document.getElementById(id).value = '';
  });
  document.getElementById('fFlagged').checked = false;
  loadAudit();
});
document.getElementById('exportBtn').addEventListener('click', function () {
  var q = buildQuery();
  window.location.href = '/api/audit/export.csv' + (q ? '?' + q : '');
});

loadAudit();
