var ministries = [], drivers = [];

async function loadRefs() {
  ministries = await api('/api/ministries');
  drivers    = await api('/api/drivers');
  document.getElementById('vehMinistry').innerHTML =
    '<option value="">-</option>' +
    ministries.map(function (m) {
      return '<option value="' + m.id + '">' + esc(m.name) + '</option>';
    }).join('');
  document.getElementById('vehDriver').innerHTML =
    '<option value="">-</option>' +
    drivers.map(function (d) {
      return '<option value="' + d.id + '">' + esc(d.full_name) + '</option>';
    }).join('');
}

async function loadVehicles(q) {
  q = q || '';
  var rows = await api('/api/vehicles' + (q ? '?q=' + encodeURIComponent(q) : ''));
  var body = document.getElementById('vehBody');
  body.innerHTML = rows.map(function (v) {
    var statusKind = v.status === 'ACTIVE' ? 'green' : (v.status === 'MAINTENANCE' ? 'amber' : 'grey');
    return '<tr>' +
      '<td><strong>' + esc(v.plate_number) + '</strong></td>' +
      '<td>' + esc([v.make, v.model, v.year].filter(Boolean).join(' ')) + '</td>' +
      '<td>' + esc(v.ministry_name || '-') + '</td>' +
      '<td>' + esc(v.driver_name || '-') + '</td>' +
      '<td>' + badge(v.status, statusKind) + '</td>' +
      '<td>' + esc(v.registration_expiry || '-') + '</td>' +
      '<td>' + esc(v.insurance_expiry || '-') + '</td>' +
      '<td class="table-actions">' +
        '<button class="btn btn-ghost" data-edit="' + v.id + '">Edit</button> ' +
        '<button class="btn btn-danger" data-del="' + v.id + '">Delete</button>' +
      '</td>' +
    '</tr>';
  }).join('') || '<tr><td colspan="8" class="muted">No vehicles.</td></tr>';
}

document.getElementById('vehBody').addEventListener('click', async function (e) {
  var editId = e.target.getAttribute('data-edit');
  var delId  = e.target.getAttribute('data-del');
  if (editId) {
    var v = await api('/api/vehicles/' + editId);
    var f = document.getElementById('vehForm');
    Object.entries(v).forEach(function (pair) {
      var el = f.elements[pair[0]];
      if (el) el.value = pair[1] == null ? '' : pair[1];
    });
    document.getElementById('vehDialogTitle').textContent = 'Edit vehicle';
    openDialog('vehDialog');
  }
  if (delId) {
    if (!confirm('Delete this vehicle?')) return;
    try {
      await api('/api/vehicles/' + delId, { method: 'DELETE' });
      toast('Deleted'); loadVehicles();
    } catch (ex) { toast(ex.message, 'err'); }
  }
});

document.getElementById('vehAdd').addEventListener('click', function () {
  document.getElementById('vehForm').reset();
  document.getElementById('vehForm').elements.id.value = '';
  document.getElementById('vehDialogTitle').textContent = 'Add vehicle';
  openDialog('vehDialog');
});

document.getElementById('vehForm').addEventListener('submit', async function (e) {
  if (e.submitter && e.submitter.value === 'cancel') return;
  e.preventDefault();
  var f = e.target;
  var data = Object.fromEntries(new FormData(f));
  ['ministry_id', 'assigned_driver_id', 'year'].forEach(function (k) {
    data[k] = data[k] === '' ? null : Number(data[k]);
  });
  try {
    if (data.id) await api('/api/vehicles/' + data.id, { method: 'PUT', body: JSON.stringify(data) });
    else         await api('/api/vehicles',           { method: 'POST', body: JSON.stringify(data) });
    toast('Saved');
    closeDialog('vehDialog');
    loadVehicles(document.getElementById('vehSearch').value);
  } catch (ex) { toast(ex.message, 'err'); }
});

document.getElementById('vehSearch').addEventListener('input', function (e) {
  loadVehicles(e.target.value);
});

(async function () { await loadRefs(); await loadVehicles(); })();
