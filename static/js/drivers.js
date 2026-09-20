var drvMinistries = [];

async function loadMinistriesDrv() {
  drvMinistries = await api('/api/ministries');
  document.getElementById('drvMinistry').innerHTML =
    '<option value="">-</option>' +
    drvMinistries.map(function (m) {
      return '<option value="' + m.id + '">' + esc(m.name) + '</option>';
    }).join('');
}

async function loadDrivers() {
  var rows = await api('/api/drivers');
  document.getElementById('drvBody').innerHTML = rows.map(function (d) {
    return '<tr>' +
      '<td><strong>' + esc(d.full_name) + '</strong></td>' +
      '<td>' + esc(d.license_number) + '</td>' +
      '<td>' + esc(d.license_expiry || '-') + '</td>' +
      '<td>' + esc(d.phone || '-') + '</td>' +
      '<td>' + esc(d.ministry_name || '-') + '</td>' +
      '<td>' + badge(d.status, d.status === 'ACTIVE' ? 'green' : 'red') + '</td>' +
      '<td class="table-actions">' +
        '<button class="btn btn-ghost" data-edit="' + d.id + '">Edit</button> ' +
        '<button class="btn btn-ghost" data-toggle="' + d.id + '" data-status="' + d.status + '">' +
          (d.status === 'ACTIVE' ? 'Suspend' : 'Reinstate') +
        '</button> ' +
        '<button class="btn btn-danger" data-del="' + d.id + '">Delete</button>' +
      '</td>' +
    '</tr>';
  }).join('') || '<tr><td colspan="7" class="muted">No drivers.</td></tr>';
}

document.getElementById('drvBody').addEventListener('click', async function (e) {
  var editId = e.target.getAttribute('data-edit');
  var delId  = e.target.getAttribute('data-del');
  var tglId  = e.target.getAttribute('data-toggle');
  if (editId) {
    var all = await api('/api/drivers');
    var d = all.find(function (x) { return String(x.id) === String(editId); });
    var f = document.getElementById('drvForm');
    Object.entries(d).forEach(function (pair) {
      if (f.elements[pair[0]]) f.elements[pair[0]].value = pair[1] == null ? '' : pair[1];
    });
    document.getElementById('drvDialogTitle').textContent = 'Edit driver';
    openDialog('drvDialog');
  }
  if (delId) {
    if (!confirm('Delete this driver?')) return;
    try {
      await api('/api/drivers/' + delId, { method: 'DELETE' });
      toast('Deleted'); loadDrivers();
    } catch (ex) { toast(ex.message, 'err'); }
  }
  if (tglId) {
    var current = e.target.getAttribute('data-status');
    var next = current === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api('/api/drivers/' + tglId + '/status', {
        method: 'POST', body: JSON.stringify({ status: next })
      });
      toast('Status: ' + next); loadDrivers();
    } catch (ex) { toast(ex.message, 'err'); }
  }
});

document.getElementById('drvAdd').addEventListener('click', function () {
  document.getElementById('drvForm').reset();
  document.getElementById('drvForm').elements.id.value = '';
  document.getElementById('drvDialogTitle').textContent = 'Add driver';
  openDialog('drvDialog');
});

document.getElementById('drvForm').addEventListener('submit', async function (e) {
  if (e.submitter && e.submitter.value === 'cancel') return;
  e.preventDefault();
  var data = Object.fromEntries(new FormData(e.target));
  data.ministry_id = data.ministry_id === '' ? null : Number(data.ministry_id);
  try {
    if (data.id) await api('/api/drivers/' + data.id, { method: 'PUT', body: JSON.stringify(data) });
    else         await api('/api/drivers',           { method: 'POST', body: JSON.stringify(data) });
    toast('Saved');
    closeDialog('drvDialog');
    loadDrivers();
  } catch (ex) { toast(ex.message, 'err'); }
});

(async function () { await loadMinistriesDrv(); await loadDrivers(); })();
