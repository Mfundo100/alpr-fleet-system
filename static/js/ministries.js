async function loadMinistries() {
  var rows = await api('/api/ministries');
  document.getElementById('minBody').innerHTML = rows.map(function (m) {
    return '<tr>' +
      '<td><strong>' + esc(m.name) + '</strong></td>' +
      '<td>' + esc(m.code || '-') + '</td>' +
      '<td>' + esc(m.contact_email || '-') + '</td>' +
      '<td class="table-actions">' +
        '<button class="btn btn-ghost" data-edit="' + m.id + '">Edit</button> ' +
        '<button class="btn btn-danger" data-del="' + m.id + '">Delete</button>' +
      '</td>' +
    '</tr>';
  }).join('') || '<tr><td colspan="4" class="muted">No ministries.</td></tr>';
}

document.getElementById('minBody').addEventListener('click', async function (e) {
  var editId = e.target.getAttribute('data-edit');
  var delId  = e.target.getAttribute('data-del');
  if (editId) {
    var all = await api('/api/ministries');
    var m = all.find(function (x) { return String(x.id) === String(editId); });
    var f = document.getElementById('minForm');
    Object.entries(m).forEach(function (pair) {
      if (f.elements[pair[0]]) f.elements[pair[0]].value = pair[1] == null ? '' : pair[1];
    });
    document.getElementById('minDialogTitle').textContent = 'Edit ministry';
    openDialog('minDialog');
  }
  if (delId) {
    if (!confirm('Delete this ministry?')) return;
    try {
      await api('/api/ministries/' + delId, { method: 'DELETE' });
      toast('Deleted'); loadMinistries();
    } catch (ex) { toast(ex.message, 'err'); }
  }
});

document.getElementById('minAdd').addEventListener('click', function () {
  document.getElementById('minForm').reset();
  document.getElementById('minForm').elements.id.value = '';
  document.getElementById('minDialogTitle').textContent = 'Add ministry';
  openDialog('minDialog');
});

document.getElementById('minForm').addEventListener('submit', async function (e) {
  if (e.submitter && e.submitter.value === 'cancel') return;
  e.preventDefault();
  var data = Object.fromEntries(new FormData(e.target));
  try {
    if (data.id) await api('/api/ministries/' + data.id, { method: 'PUT', body: JSON.stringify(data) });
    else         await api('/api/ministries',           { method: 'POST', body: JSON.stringify(data) });
    toast('Saved');
    closeDialog('minDialog');
    loadMinistries();
  } catch (ex) { toast(ex.message, 'err'); }
});

loadMinistries();
